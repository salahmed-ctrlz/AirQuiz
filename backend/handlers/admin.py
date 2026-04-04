"""Admin-facing WebSocket handlers: start, end, reveal, reset, extend exam."""

import random
from collections import defaultdict
from datetime import datetime, timedelta

from models import Student, Question, Response
from schemas import (
    StartExamEvent, QuestionUpdate, ShowResult, DashboardUpdate
)


# ---------------------------------------------------------------------------
# Per-student exam factory
# ---------------------------------------------------------------------------

def _build_student_exam(all_questions: list, questions_count: int) -> list:
    """
    Independently select and shuffle questions AND their options for one student.

    Returns a list of dicts:
        [{"question_id": int, "text": str, "options": [str], "image_url": str|None}, ...]

    The options list is already shuffled; the correct_answer value is NOT
    included here (it lives in the DB). The order of this list defines the
    display order for that specific student.
    """
    pool = list(all_questions)  # copy so we don't mutate the caller's list
    random.shuffle(pool)

    if questions_count > 0:
        pool = pool[:questions_count]

    result = []
    for q in pool:
        shuffled_opts = list(q.options)
        random.shuffle(shuffled_opts)
        result.append({
            "question_id": q.question_id,
            "text": q.text,
            "options": shuffled_opts,
            "image_url": q.image_url,
        })

    return result


def _assigned_to_payload(assigned: list) -> list[QuestionUpdate]:
    """Convert stored assigned_questions dicts to QuestionUpdate objects."""
    return [
        QuestionUpdate(
            question_id=item["question_id"],
            text=item["text"],
            options=item["options"],
            image_url=item.get("image_url"),
        )
        for item in assigned
    ]


# ---------------------------------------------------------------------------
# Handler registration
# ---------------------------------------------------------------------------

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
            # Accept camelCase and snake_case
            duration_minutes = int(data.get('durationMinutes') or data.get('duration_minutes') or 15)
            exam_title = data.get('exam_title') or data.get('examTitle')
            raw_count = data.get('questions_count') or data.get('questionsCount') or data.get('questionsPool') or 0
            questions_count = int(raw_count)

            room.exam_duration_seconds = duration_minutes * 60
            room.exam_start_time = datetime.utcnow()
            room.exam_end_time = room.exam_start_time + timedelta(seconds=room.exam_duration_seconds)
            room.exam_active = True
            room.current_exam_title = exam_title

            if data.get('capacity'):
                room.capacity_limit = int(data.get('capacity', room.capacity_limit))

            # Fetch the master question pool once
            query = db.query(Question)
            if exam_title:
                query = query.filter(Question.exam_title == exam_title)
            all_questions = query.all()

            # Keep served_question_ids as the master pool IDs so late-joiners
            # know there IS an active exam. Per-student selection happens below.
            room.served_question_ids = [q.question_id for q in all_questions]

            end_time_iso = room.exam_end_time.isoformat() + 'Z'

            # ----------------------------------------------------------------
            # Unicast: emit individualised START_EXAM to each connected student
            # ----------------------------------------------------------------
            connected_sids = [s for s, r in manager.active_rooms.items() if r == room_id]

            for student_sid in connected_sids:
                student_id = manager.active_connections.get(student_sid)
                if not student_id:
                    continue

                student = db.get(Student, student_id)
                if not student:
                    continue

                # Build this student's unique, shuffled exam
                assigned = _build_student_exam(all_questions, questions_count)
                student.assigned_questions = assigned
                db.commit()

                q_updates = _assigned_to_payload(assigned)

                event_data = StartExamEvent(
                    duration_seconds=room.exam_duration_seconds,
                    end_time=end_time_iso,
                    questions=q_updates,
                )
                await sio.emit('START_EXAM', event_data.model_dump(), room=student_sid)

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
        """Calculate scores per student and send individualised results
        filtered to *that student's assigned questions only*."""
        room_id = data.get('room_id')
        if not room_id:
            return

        db = db_session_factory()
        try:
            room = manager.get_room(room_id)

            # Build a fast lookup for all questions in this exam title
            q_query = db.query(Question)
            if room.current_exam_title:
                q_query = q_query.filter(Question.exam_title == room.current_exam_title)
            all_questions = q_query.all()
            q_by_qid = {q.question_id: q for q in all_questions}  # JSON id -> Question

            students = db.query(Student).filter(Student.room_id == room_id).all()
            students_by_id = {str(s.id): s for s in students}

            # Recalculate scores (based on assigned questions only)
            for student in students:
                correct = db.query(Response).filter(
                    Response.student_id == student.id,
                    Response.is_correct == True
                ).count()
                student.score = correct
            db.commit()

            # Pre-compute per-question answer distributions
            room_responses = db.query(Response).join(Student).filter(
                Student.room_id == room_id
            ).all()
            dist_by_qpk = defaultdict(list)
            for ar in room_responses:
                dist_by_qpk[ar.question_id].append(ar.selected_option)

            target_sids = [s for s, r in manager.active_rooms.items() if r == room_id]
            for conn_sid in target_sids:
                st_id = manager.active_connections.get(conn_sid)
                if not st_id:
                    continue

                student = students_by_id.get(str(st_id))
                if not student:
                    continue

                # Use only this student's assigned questions
                assigned = student.assigned_questions or []
                assigned_qids = [item["question_id"] for item in assigned]

                responses = db.query(Response).filter(Response.student_id == st_id).all()
                resp_map = {}
                for r in responses:
                    q = db.get(Question, r.question_id)
                    if q:
                        resp_map[q.question_id] = r  # keyed by JSON id

                student_results = {}
                for qid in assigned_qids:
                    q = q_by_qid.get(qid)
                    if not q:
                        continue
                    resp = resp_map.get(q.question_id)
                    q_dist = dist_by_qpk.get(q.id, [])
                    # Stats over the options *this student* saw (preserves shuffled order)
                    assigned_opts = next(
                        (item["options"] for item in assigned if item["question_id"] == qid),
                        q.options
                    )
                    stats = {opt: sum(1 for sel in q_dist if sel == opt) for opt in assigned_opts}

                    student_results[q.question_id] = ShowResult(
                        question_id=q.question_id,
                        correct_answer=q.correct_answer,
                        user_answer=resp.selected_option if resp else None,
                        is_correct=resp.is_correct if resp else False,
                        statistics=stats,
                    )

                final_score = student.score
                result_payload = {
                    'results': {str(k): v.model_dump() for k, v in student_results.items()},
                    'final_score': final_score,
                }
                await sio.emit('FULL_RESULTS', result_payload, room=conn_sid)
                await sio.emit('full_results', result_payload, room=conn_sid)

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

            await sio.emit('ROOM_RESET', {'message': 'Session has been reset by the administrator.'}, room=room_id)
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
