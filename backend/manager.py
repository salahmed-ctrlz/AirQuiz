"""
AirQuiz - WebSocket manager.
Holds in-memory room state (mirrored to the DB), connection maps and the
throttled dashboard broadcaster.
"""

import asyncio
import random
import string
from datetime import datetime
from typing import Dict, List, Optional

import socketio
from config import DEFAULT_ROOM_CAPACITY, LOG_LEVEL
from handlers import admin as admin_handlers
from handlers import rooms as room_handlers
from handlers import student as student_handlers
from models import Question, Response, RoomState, Student
from schemas import DashboardUpdate, StudentStatus
from sqlalchemy import func
from sqlalchemy.orm import Session


class Room:
    """State for a single quiz room."""

    def __init__(self, room_id: str, code: Optional[str] = None):
        self.room_id = room_id
        self.code = code or "".join(random.choices(string.digits, k=6))
        self.capacity_limit: int = DEFAULT_ROOM_CAPACITY
        self.questions_to_serve: int = 0  # 0 = all
        self.exam_active: bool = False
        self.exam_start_time: Optional[datetime] = None
        self.exam_end_time: Optional[datetime] = None
        self.exam_duration_seconds: int = 0
        self.current_exam_title: Optional[str] = None
        self.results_revealed: bool = False

    def reset(self):
        self.exam_active = False
        self.exam_start_time = None
        self.exam_end_time = None
        self.exam_duration_seconds = 0
        self.current_exam_title = None
        self.results_revealed = False

    def seconds_remaining(self) -> int:
        if self.exam_active and self.exam_end_time:
            return max(0, int((self.exam_end_time - datetime.utcnow()).total_seconds()))
        return 0

    def end_time_iso(self) -> str:
        return self.exam_end_time.isoformat() + "Z" if self.exam_end_time else ""


class ConnectionManager:
    def __init__(self):
        verbose = LOG_LEVEL.lower() == "debug"
        self.sio = socketio.AsyncServer(
            async_mode="asgi",
            cors_allowed_origins="*",
            logger=verbose,
            engineio_logger=verbose,
            ping_interval=10,
            ping_timeout=25,
        )
        self.active_connections: Dict[str, str] = {}  # sid -> student_id
        self.active_rooms: Dict[str, str] = {}        # sid -> room_id
        self.admin_sids: set[str] = set()
        self.rooms: Dict[str, Room] = {}
        self._session_factory = None
        self._pending_updates: set[str] = set()
        self._room_sizes: dict[str, int] = {}
        # hot-path caches so an answer costs one indexed write, not five queries
        self._question_cache: dict[tuple, tuple] = {}   # (exam_title, qid) -> (pk, correct_answer)
        self._assigned_cache: dict[int, dict] = {}      # student_id -> {qid: set(options)}

    # -- rooms ---------------------------------------------------------------
    def get_room(self, room_id: str) -> Room:
        if room_id not in self.rooms:
            self.rooms[room_id] = Room(room_id)
            self.persist_room(self.rooms[room_id])
        return self.rooms[room_id]

    def get_room_by_code(self, code: str) -> Optional[Room]:
        for room in self.rooms.values():
            if room.code == code:
                return room
        return None

    def get_active_rooms(self) -> List[Dict[str, str]]:
        return [
            {"id": r.room_id, "code": r.code, "name": r.room_id.replace("-", " ").title()}
            for r in self.rooms.values()
        ]

    async def broadcast_room_list(self):
        await self.sio.emit("rooms_list", self.get_active_rooms())

    def is_admin(self, sid: str) -> bool:
        return sid in self.admin_sids

    @staticmethod
    def admin_channel(room_id: str) -> str:
        return f"admin:{room_id}"

    def active_connections_in_room(self, room_id: str):
        return [(sid, rid) for sid, rid in self.active_rooms.items() if rid == room_id]

    # -- caches ----------------------------------------------------------------
    def invalidate_questions(self):
        self._question_cache.clear()

    def question_lookup(self, db, title, qid):
        key = (title, qid)
        hit = self._question_cache.get(key)
        if hit is None:
            q = db.query(Question).filter(Question.question_id == qid)
            if title:
                q = q.filter(Question.exam_title == title)
            row = q.first()
            if not row:
                return None
            hit = self._question_cache[key] = (row.id, row.correct_answer)
        return hit

    def assigned_lookup(self, student):
        cached = self._assigned_cache.get(student.id)
        if cached is None:
            cached = {i["question_id"]: set(i["options"]) for i in (student.assigned_questions or [])}
            self._assigned_cache[student.id] = cached
        return cached

    def forget_assignment(self, student_id=None):
        if student_id is None:
            self._assigned_cache.clear()
        else:
            self._assigned_cache.pop(student_id, None)

    # -- persistence -----------------------------------------------------------
    def persist_room(self, room: Room):
        if not self._session_factory:
            return
        db = self._session_factory()
        try:
            row = db.get(RoomState, room.room_id) or RoomState(room_id=room.room_id)
            row.code = room.code
            row.capacity_limit = room.capacity_limit
            row.questions_to_serve = room.questions_to_serve
            row.exam_active = room.exam_active
            row.exam_start_time = room.exam_start_time
            row.exam_end_time = room.exam_end_time
            row.exam_duration_seconds = room.exam_duration_seconds
            row.current_exam_title = room.current_exam_title
            row.results_revealed = room.results_revealed
            db.merge(row)
            db.commit()
        finally:
            db.close()

    def delete_room_state(self, room_id: str):
        if not self._session_factory:
            return
        db = self._session_factory()
        try:
            db.query(RoomState).filter(RoomState.room_id == room_id).delete()
            db.commit()
        finally:
            db.close()

    def _load_rooms(self):
        db = self._session_factory()
        try:
            for row in db.query(RoomState).all():
                room = Room(row.room_id, row.code)
                room.capacity_limit = row.capacity_limit or DEFAULT_ROOM_CAPACITY
                room.questions_to_serve = row.questions_to_serve or 0
                room.exam_active = bool(row.exam_active)
                room.exam_start_time = row.exam_start_time
                room.exam_end_time = row.exam_end_time
                room.exam_duration_seconds = row.exam_duration_seconds or 0
                room.current_exam_title = row.current_exam_title
                room.results_revealed = bool(row.results_revealed)
                self.rooms[row.room_id] = room
            # Nobody is connected after a restart
            db.query(Student).update({Student.is_online: False})
            db.commit()
        finally:
            db.close()

    def setup_handlers(self, db_session_factory):
        self._session_factory = db_session_factory
        self._load_rooms()
        student_handlers.register(self, db_session_factory)
        admin_handlers.register(self, db_session_factory)
        room_handlers.register(self, db_session_factory)

    # -- timer enforcement -------------------------------------------------------
    async def expire_loop(self):
        """End exams server-side the moment their timer runs out."""
        while True:
            await asyncio.sleep(1)
            now = datetime.utcnow()
            for room in list(self.rooms.values()):
                if room.exam_active and room.exam_end_time and now >= room.exam_end_time:
                    room.exam_active = False
                    self.persist_room(room)
                    await self.sio.emit("exam_ended", room=room.room_id)
                    self.schedule_dashboard_update(room.room_id)

    # -- dashboard ---------------------------------------------------------------
    def schedule_dashboard_update(self, room_id: str):
        """Coalesce bursts of answers into at most one broadcast per ~0.4s."""
        if not room_id or room_id in self._pending_updates:
            return
        self._pending_updates.add(room_id)

        async def _run():
            # bigger rooms -> fewer, larger updates (teacher link stays ~50 KB/s at 300 students)
            await asyncio.sleep(0.4 + 0.004 * self._room_sizes.get(room_id, 0))
            self._pending_updates.discard(room_id)
            db = self._session_factory()
            try:
                await self.broadcast_dashboard_update(db, room_id)
            finally:
                db.close()

        asyncio.create_task(_run())

    async def broadcast_dashboard_update(self, db: Session, room_id: str):
        """Push live stats for a room to the admins watching it (never students)."""
        if not room_id:
            return
        try:
            students = db.query(Student).filter(Student.room_id == room_id).all()
            counts = dict(
                db.query(Response.student_id, func.count(Response.id))
                .join(Student, Student.id == Response.student_id)
                .filter(Student.room_id == room_id)
                .group_by(Response.student_id)
                .all()
            )

            statuses = []
            for s in students:
                n = counts.get(s.id, 0)
                statuses.append(StudentStatus(
                    id=s.id,
                    first_name=s.first_name,
                    last_name=s.last_name,
                    email=s.email,
                    group=s.group.value,
                    score=s.score,
                    is_online=s.is_online,
                    has_answered=n > 0,
                    answers_count=n,
                    assigned_count=len(s.assigned_questions) if s.assigned_questions else 0,
                ))

            self._room_sizes[room_id] = len(students)
            room = self.get_room(room_id)
            update = DashboardUpdate(
                connected_count=sum(1 for s in students if s.is_online),
                total_count=len(students),
                answered_count=sum(counts.values()),
                students=[s.model_dump() for s in statuses],
                exam_active=room.exam_active,
                time_remaining=room.seconds_remaining(),
            )
            await self.sio.emit("dashboard_update", update.model_dump(), room=self.admin_channel(room_id))
        except Exception as e:  # never let a broadcast kill a handler
            print(f"Broadcast error: {e}")


manager = ConnectionManager()
