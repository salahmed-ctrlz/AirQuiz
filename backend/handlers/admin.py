"""Admin-facing WebSocket handlers: start, end, reveal, reset, extend exam."""

from datetime import datetime, timedelta
from models import Student, Question, Response
from schemas import (
    StartExamEvent, QuestionUpdate, ShowResult, DashboardUpdate
)


def register(manager, db_session_factory):
    sio = manager.sio

    @sio.event
    async def admin_start_exam(sid, data):
        room_id = data.get('room_id')
        if not room_id:
            return

        room = manager.get_room(room_id)
        db = db_session_factory()
        try:
            duration_minutes = int(data.get('duration_minutes', 15))
            exam_title = data.get('exam_title')

            room.exam_duration_seconds = duration_minutes * 60
            room.exam_start_time = datetime.utcnow()
            room.exam_end_time = room.exam_start_time + timedelta(seconds=room.exam_duration_seconds)
            room.exam_active = True
            room.current_exam_title = exam_title

            query = db.query(Question)
            if exam_title:
                query = query.filter(Question.exam_title == exam_title)

            q_updates = [
                QuestionUpdate(
                    question_id=q.question_id, text=q.text,
                    options=q.options, image_url=q.image_url
                ) for q in query.all()
            ]

            event_data = StartExamEvent(
                duration_seconds=room.exam_duration_seconds,
                end_time=room.exam_end_time.isoformat() + 'Z',
                questions=q_updates
            )

            await sio.emit('start_exam', event_data.model_dump(), room=room_id)
            await manager.broadcast_dashboard_update(db, room_id)
        finally:
            db.close()

    @sio.event
    async def admin_end_exam(sid, data):
        room_id = data.get('room_id')
        if not room_id:
            return

        room = manager.get_room(room_id)
        room.exam_active = False
        room.exam_end_time = datetime.utcnow()

        await sio.emit('exam_ended', room=room_id)
        db = db_session_factory()
        try:
            await manager.broadcast_dashboard_update(db, room_id)
        finally:
            db.close()

    @sio.event
    async def admin_reveal_results(sid, data):
        """Calculate scores for each student and send individualized results."""
        room_id = data.get('room_id')
        if not room_id:
            return

        db = db_session_factory()
        try:
            questions = db.query(Question).all()
            students = db.query(Student).filter(Student.room_id == room_id).all()

            # recalculate scores
            for student in students:
                correct = db.query(Response).filter(
                    Response.student_id == student.id,
                    Response.is_correct == True
                ).count()
                student.score = correct
            db.commit()

            # send per-student results with answer distribution stats
            target_sids = [s for s, r in manager.active_rooms.items() if r == room_id]
            for conn_sid in target_sids:
                st_id = manager.active_connections.get(conn_sid)
                if not st_id:
                    continue

                responses = db.query(Response).filter(Response.student_id == st_id).all()
                resp_map = {r.question_id: r for r in responses}

                student_results = {}
                for q in questions:
                    resp = resp_map.get(q.id)
                    # option distribution for this question across the room
                    all_resp = db.query(Response).join(Student).filter(
                        Student.room_id == room_id,
                        Response.question_id == q.id
                    ).all()
                    stats = {opt: sum(1 for ar in all_resp if ar.selected_option == opt) for opt in q.options}

                    student_results[q.question_id] = ShowResult(
                        question_id=q.question_id,
                        correct_answer=q.correct_answer,
                        user_answer=resp.selected_option if resp else None,
                        is_correct=resp.is_correct if resp else False,
                        statistics=stats
                    )

                final_score = next((s.score for s in students if str(s.id) == str(st_id)), 0)
                await sio.emit('full_results', {
                    'results': {k: v.model_dump() for k, v in student_results.items()},
                    'final_score': final_score
                }, room=conn_sid)

            await manager.broadcast_dashboard_update(db, room_id)
        finally:
            db.close()

    @sio.event
    async def admin_reset_room(sid, data):
        room_id = data.get('room_id')
        if not room_id:
            return

        print(f"RESETTING ROOM: {room_id}")
        db = db_session_factory()
        try:
            student_ids = [s[0] for s in db.query(Student.id).filter(Student.room_id == room_id).all()]
            if student_ids:
                db.query(Response).filter(Response.student_id.in_(student_ids)).delete(synchronize_session=False)
                db.query(Student).filter(Student.room_id == room_id).delete(synchronize_session=False)
            db.commit()

            if room_id in manager.rooms:
                manager.rooms[room_id].reset()

            await sio.emit('error', {'message': 'Session ended by admin. Please refresh to join again.'}, room=room_id)
            await manager.broadcast_dashboard_update(db, room_id)
        except Exception as e:
            print(f"Reset error: {e}")
        finally:
            db.close()

    @sio.event
    async def admin_extend_exam(sid, data):
        """Add extra time to a running exam."""
        room_id = data.get('room_id')
        if not room_id:
            return

        room = manager.get_room(room_id)
        if not room.exam_active or not room.exam_end_time:
            return

        minutes = int(data.get('minutes', 5))
        room.exam_end_time += timedelta(minutes=minutes)
        new_remaining = max(0, (room.exam_end_time - datetime.utcnow()).total_seconds())

        db = db_session_factory()
        try:
            await sio.emit('exam_extended', {
                'duration_seconds': int(new_remaining),
                'end_time': room.exam_end_time.isoformat() + 'Z'
            }, room=room_id)
            await manager.broadcast_dashboard_update(db, room_id)
        finally:
            db.close()

    @sio.event
    async def admin_export_csv(sid, data):
        pass  # CSV export handled via REST endpoint
