"""
AirQuiz - Classroom Assessment Platform
WebSocket Manager

Author:    Salah Eddine Medkour <medkoursalaheddine@gmail.com>
GitHub:    https://github.com/salahmed-ctrlz
LinkedIn:  https://linkedin.com/in/salah-eddine-medkour
Portfolio: https://salahmed-ctrlz.github.io/salaheddine-medkour-portfolio/
License:   MIT
"""

import socketio
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
import random
import string

from config import LOG_LEVEL
from models import Student, Response
from schemas import StudentStatus, DashboardUpdate
from handlers import student as student_handlers
from handlers import admin as admin_handlers
from handlers import rooms as room_handlers


class Room:
    """State for a single quiz room."""

    def __init__(self, room_id: str):
        self.room_id = room_id
        self.code = ''.join(random.choices(string.digits, k=6))
        self.exam_active: bool = False
        self.exam_start_time: Optional[datetime] = None
        self.exam_end_time: Optional[datetime] = None
        self.exam_duration_seconds: int = 0
        self.start_locked: bool = False
        self.current_exam_title: Optional[str] = None

    def reset(self):
        self.exam_active = False
        self.exam_start_time = None
        self.exam_end_time = None
        self.exam_duration_seconds = 0
        self.current_exam_title = None


class ConnectionManager:
    """Core connection manager — delegates events to handler modules."""

    def __init__(self):
        verbose = LOG_LEVEL.lower() == "debug"
        self.sio = socketio.AsyncServer(
            async_mode='asgi',
            cors_allowed_origins='*',
            logger=verbose,
            engineio_logger=verbose
        )
        self.active_connections: Dict[str, str] = {}  # {sid: student_id}
        self.active_rooms: Dict[str, str] = {}        # {sid: room_id}
        self.rooms: Dict[str, Room] = {}               # {room_id: Room}

    def get_room(self, room_id: str) -> Room:
        if room_id not in self.rooms:
            self.rooms[room_id] = Room(room_id)
        return self.rooms[room_id]

    def get_room_by_code(self, code: str) -> Optional[Room]:
        for room in self.rooms.values():
            if room.code == code:
                return room
        return None

    def get_active_rooms(self) -> List[Dict[str, str]]:
        return [
            {"id": r.room_id, "code": r.code, "name": r.room_id.replace('-', ' ').title()}
            for r in self.rooms.values()
        ]

    async def broadcast_room_list(self):
        await self.sio.emit('rooms_list', self.get_active_rooms())

    def setup_handlers(self, db_session_factory):
        """Register all event handlers from submodules."""
        student_handlers.register(self, db_session_factory)
        admin_handlers.register(self, db_session_factory)
        room_handlers.register(self, db_session_factory)

    async def broadcast_dashboard_update(self, db: Session, room_id: str):
        """Push live dashboard stats for a room to all connected admins."""
        if not room_id:
            return
        try:
            students = db.query(Student).filter(Student.room_id == room_id).all()

            statuses = []
            for s in students:
                resp_count = db.query(Response).filter(Response.student_id == s.id).count()
                statuses.append(StudentStatus(
                    id=s.id,
                    first_name=s.first_name,
                    last_name=s.last_name,
                    group=s.group.value,
                    score=s.score,
                    is_online=s.is_online,
                    has_answered=(resp_count > 0),
                    answers_count=resp_count
                ))

            room = self.get_room(room_id)
            remaining = 0
            if room.exam_active and room.exam_end_time:
                remaining = max(0, (room.exam_end_time - datetime.utcnow()).total_seconds())

            update = DashboardUpdate(
                connected_count=sum(1 for s in students if s.is_online),
                total_count=len(students),
                answered_count=db.query(Response).join(Student).filter(Student.room_id == room_id).count(),
                students=[s.model_dump() for s in statuses],
                exam_active=room.exam_active,
                time_remaining=int(remaining)
            )
            await self.sio.emit('dashboard_update', update.model_dump(), room=room_id)
        except Exception as e:
            print(f"Broadcast error: {e}")


manager = ConnectionManager()
