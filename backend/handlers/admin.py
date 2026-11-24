"""Admin-facing WebSocket handlers. Every handler requires an authenticated admin socket."""

import functools
from datetime import datetime, timedelta

from models import Question, Response, Student
from schemas import StartExamEvent
from services.student_exam import (
    assign_exam,
    assigned_to_payload,
    build_results_payload,
)


def register(manager, db_session_factory):
    sio = manager.sio

    def admin_only(fn):
        @functools.wraps(fn)
        async def wrapper(sid, data=None):
            if not manager.is_admin(sid):
                await sio.emit("error", {"message": "Not authorised"}, room=sid)
                return
            if not isinstance(data, dict) or not data.get("room_id"):
                return
            return await fn(sid, data)
        return wrapper

    @sio.event
    @admin_only
    async def admin_start_exam(sid, data):
        room = manager.get_room(data["room_id"])
        if room.exam_active:
            await sio.emit("error", {"message": "An exam is already running in this room."}, room=sid)
            return
        db = db_session_factory()
        try:
            minutes = max(1, min(int(data.get("durationMinutes") or data.get("duration_minutes") or 15), 600))
            title = data.get("exam_title") or data.get("examTitle")
            count = int(data.get("questions_count") or data.get("questionsCount") or 0)

            pool = db.query(Question)
            if title:
                pool = pool.filter(Question.exam_title == title)
            if pool.count() == 0:
                await sio.emit("error", {"message": "No questions loaded. Load an exam first."}, room=sid)
                return

            room.exam_duration_seconds = minutes * 60
            room.exam_start_time = datetime.utcnow()
            room.exam_end_time = room.exam_start_time + timedelta(seconds=room.exam_duration_seconds)
            room.exam_active = True
            room.results_revealed = False
            room.current_exam_title = title
            room.questions_to_serve = max(0, count)
            if data.get("capacity"):
                room.capacity_limit = int(data["capacity"])

            # fresh start: forget answers from any previous run in this room
            ids = [s.id for s in db.query(Student.id).filter(Student.room_id == room.room_id)]
            if ids:
                db.query(Response).filter(Response.student_id.in_(ids)).delete(synchronize_session=False)
                db.query(Student).filter(Student.id.in_(ids)).update(
                    {Student.score: 0, Student.assigned_questions: None}, synchronize_session=False)
                db.commit()
            manager.persist_room(room)

            # Unicast an individual exam to every connected student
            for student_sid, rid in list(manager.active_rooms.items()):
                if rid != room.room_id:
                    continue
                student = db.get(Student, int(manager.active_connections.get(student_sid, 0) or 0))
                if not student:
                    continue
                assigned = assign_exam(db, student, room)
                await sio.emit("START_EXAM", StartExamEvent(
                    duration_seconds=room.exam_duration_seconds,
                    end_time=room.end_time_iso(),
                    questions=assigned_to_payload(assigned),
                ).model_dump(), room=student_sid)

            await manager.broadcast_dashboard_update(db, room.room_id)
        finally:
            db.close()

    @sio.event
    @admin_only
    async def admin_end_exam(sid, data):
        room = manager.get_room(data["room_id"])
        room.exam_active = False
        room.exam_end_time = datetime.utcnow()
        manager.persist_room(room)
        await sio.emit("exam_ended", room=room.room_id)
        manager.schedule_dashboard_update(room.room_id)

    @sio.event
    @admin_only
    async def admin_resume_exam(sid, data):
        """Re-open an ended exam for a few more minutes WITHOUT clearing answers."""
        room = manager.get_room(data["room_id"])
        if room.exam_active or not room.exam_start_time:
            return
        minutes = max(1, min(int(data.get("minutes", 5)), 120))
        room.exam_end_time = datetime.utcnow() + timedelta(minutes=minutes)
        room.exam_active = True
        room.results_revealed = False
        manager.persist_room(room)
        db = db_session_factory()
        try:
            for student_sid, rid in list(manager.active_rooms.items()):
                if rid != room.room_id:
                    continue
                student = db.get(Student, int(manager.active_connections.get(student_sid, 0) or 0))
                if not student:
                    continue
                if not student.assigned_questions:
                    assign_exam(db, student, room)
                await sio.emit("START_EXAM", StartExamEvent(
                    duration_seconds=room.seconds_remaining(),
                    end_time=room.end_time_iso(),
                    questions=assigned_to_payload(student.assigned_questions),
                ).model_dump(), room=student_sid)
            await manager.broadcast_dashboard_update(db, room.room_id)
        finally:
            db.close()

    @sio.event
    @admin_only
    async def admin_reveal_results(sid, data):
        room = manager.get_room(data["room_id"])
        room.results_revealed = True
        manager.persist_room(room)
        db = db_session_factory()
        try:
            for conn_sid, rid in list(manager.active_rooms.items()):
                if rid != room.room_id:
                    continue
                student = db.get(Student, int(manager.active_connections.get(conn_sid, 0) or 0))
                if not student:
                    continue
                payload = build_results_payload(db, room, student)
                await sio.emit("FULL_RESULTS", payload, room=conn_sid)
            await manager.broadcast_dashboard_update(db, room.room_id)
        finally:
            db.close()

    @sio.event
    @admin_only
    async def admin_reset_room(sid, data):
        room_id = data["room_id"]
        db = db_session_factory()
        try:
            ids = [s[0] for s in db.query(Student.id).filter(Student.room_id == room_id)]
            if ids:
                db.query(Response).filter(Response.student_id.in_(ids)).delete(synchronize_session=False)
                db.query(Student).filter(Student.room_id == room_id).delete(synchronize_session=False)
            db.commit()
            if room_id in manager.rooms:
                manager.rooms[room_id].reset()
                manager.persist_room(manager.rooms[room_id])
            await sio.emit("ROOM_RESET", {"message": "Session has been reset by the administrator."}, room=room_id)
            await manager.broadcast_dashboard_update(db, room_id)
        finally:
            db.close()

    @sio.event
    @admin_only
    async def admin_extend_exam(sid, data):
        room = manager.get_room(data["room_id"])
        if not room.exam_active or not room.exam_end_time:
            return
        room.exam_end_time += timedelta(minutes=max(1, min(int(data.get("minutes", 5)), 120)))
        manager.persist_room(room)
        await sio.emit("exam_extended", {
            "duration_seconds": room.seconds_remaining(),
            "end_time": room.end_time_iso(),
        }, room=room.room_id)
        manager.schedule_dashboard_update(room.room_id)
