"""Student-facing WebSocket handlers: join, submit_answer, disconnect."""

from datetime import datetime
from models import Student, Question, Response
from schemas import StudentJoin, QuestionUpdate, StartExamEvent


def register(manager, db_session_factory):
    sio = manager.sio

    @sio.event
    async def connect(sid, environ):
        print(f"Client connected: {sid}")
        await sio.emit('connected', {'status': 'ok'}, room=sid)
        await sio.emit('rooms_list', manager.get_active_rooms(), room=sid)

    @sio.event
    async def disconnect(sid):
        print(f"Client disconnected: {sid}")
        student_id = manager.active_connections.get(sid)
        room_id = manager.active_rooms.get(sid)

        if student_id and room_id:
            db = db_session_factory()
            try:
                student = db.get(Student, student_id)
                if student:
                    student.is_online = False
                    student.last_active = datetime.utcnow()
                    db.commit()
                    await manager.broadcast_dashboard_update(db, room_id)
            finally:
                db.close()

        manager.active_connections.pop(sid, None)
        manager.active_rooms.pop(sid, None)

    @sio.event
    async def join(sid, data):
        """Student joins a quiz room — handles both new joins and session restores."""
        print(f"Join from {sid}: {data}")
        db = db_session_factory()
        try:
            # Joker detection BEFORE validation so TEST/TEST works with minimal fields
            raw_first = str(data.get('first_name', '')).strip()
            raw_last  = str(data.get('last_name', '')).strip()
            is_joker  = raw_first.upper() == 'TEST' and raw_last.upper() == 'TEST'

            if is_joker:
                data.setdefault('group', 'G1')

            join_data = StudentJoin(**data)
            input_room = data.get('room_id', '').strip().lower().replace(' ', '-')

            # Resolve room by code first, then by ID
            target_room = manager.get_room_by_code(input_room)
            if not target_room and input_room in manager.rooms:
                target_room = manager.rooms[input_room]

            if not target_room:
                if is_joker and input_room:
                    target_room = manager.get_room(input_room)
                else:
                    await sio.emit('error', {'message': 'Invalid Room Code or ID'}, room=sid)
                    return

            room_id = target_room.room_id

            # Capacity check (Joker bypasses)
            if not is_joker:
                online_count = sum(1 for rsid, rid in manager.active_rooms.items() if rid == room_id)
                if online_count >= target_room.capacity_limit:
                    await sio.emit('error', {'message': f'Room capacity reached ({target_room.capacity_limit}). Please wait for next batch.'}, room=sid)
                    return

            fname = join_data.first_name.strip()
            lname = join_data.last_name.strip()

            existing = db.query(Student).filter(
                Student.first_name.ilike(fname),
                Student.last_name.ilike(lname),
                Student.group == join_data.group,
                Student.room_id == room_id
            ).first()

            if existing:
                if join_data.email:
                    existing.email = join_data.email
                await _restore_student(sio, manager, db, sid, existing, target_room)
            else:
                await _new_student(sio, manager, db, sid, join_data, target_room)

            await manager.broadcast_dashboard_update(db, room_id)

        except Exception as e:
            print(f"Join error: {e}")
            import traceback; traceback.print_exc()
            await sio.emit('error', {'message': str(e)}, room=sid)
        finally:
            db.close()

    @sio.event
    async def submit_answer(sid, data):
        student_id = manager.active_connections.get(sid)
        room_id = manager.active_rooms.get(sid)
        if not student_id:
            student_id = str(data.get('student_id', ''))
        if not student_id:
            return

        db = db_session_factory()
        try:
            question = db.query(Question).filter(
                Question.question_id == data.get('question_id')
            ).first()
            if not question:
                return

            is_correct = data.get('option') == question.correct_answer

            existing = db.query(Response).filter(
                Response.student_id == student_id,
                Response.question_id == question.id
            ).first()

            if existing:
                existing.selected_option = data.get('option')
                existing.is_correct = is_correct
                existing.answered_at = datetime.utcnow()
            else:
                db.add(Response(
                    student_id=student_id,
                    question_id=question.id,
                    selected_option=data.get('option'),
                    is_correct=is_correct
                ))
            db.commit()

            if room_id:
                await manager.broadcast_dashboard_update(db, room_id)
        finally:
            db.close()


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _restore_student(sio, manager, db, sid, student, room):
    """Reconnect an existing student and send their exact previously-assigned exam."""
    student.is_online = True
    student.last_active = datetime.utcnow()
    db.commit()

    manager.active_connections[sid] = str(student.id)
    manager.active_rooms[sid] = room.room_id
    await sio.enter_room(sid, room.room_id)

    # Gather previous answers (keyed by JSON question_id for the frontend)
    responses = db.query(Response).filter(Response.student_id == student.id).all()
    q_pk_to_json_id = {}
    for r in responses:
        q = db.query(Question).filter(Question.id == r.question_id).first()
        if q:
            q_pk_to_json_id[r.question_id] = q.question_id
    previous_answers = {
        str(q_pk_to_json_id.get(r.question_id, r.question_id)): r.selected_option
        for r in responses
    }

    remaining = 0
    if room.exam_active and room.exam_end_time:
        remaining = max(0, (room.exam_end_time - datetime.utcnow()).total_seconds())

    # Build question payload from this student's stored assigned_questions
    questions_payload = []
    if room.exam_active:
        questions_payload = _assigned_to_payload(student.assigned_questions or [])

    await sio.emit('JOINED', {
        'studentId': str(student.id),
        'roomState': {
            'roomId': room.room_id,
            'isActive': room.exam_active,
            'exam': None,
            'currentQuestionIndex': 0,
            'students': [],
            'totalQuestions': len(questions_payload)
        },
        'previous_answers': previous_answers
    }, room=sid)

    if room.exam_active:
        await sio.emit('START_EXAM', {
            'duration_seconds': int(remaining),
            'end_time': room.exam_end_time.isoformat() + 'Z',
            'questions': [q.model_dump() for q in questions_payload]
        }, room=sid)

    return room.room_id


async def _new_student(sio, manager, db, sid, join_data, room):
    """Register a brand-new student.

    If the exam is already running this student is a late-joiner — we run the
    randomisation engine on the spot, save their unique exam to the DB, then
    send it to them.
    """
    student = Student(
        first_name=join_data.first_name,
        last_name=join_data.last_name,
        email=join_data.email,
        group=join_data.group,
        is_online=True,
        score=0,
        room_id=room.room_id
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    manager.active_connections[sid] = str(student.id)
    manager.active_rooms[sid] = room.room_id
    await sio.enter_room(sid, room.room_id)

    total_q = 0

    # Late-joiner: generate their unique exam on the spot
    if room.exam_active and room.exam_end_time:
        from handlers.admin import _build_student_exam, _assigned_to_payload

        # Fetch the master question pool
        from models import Question as Q
        q_query = db.query(Q)
        if room.current_exam_title:
            q_query = q_query.filter(Q.exam_title == room.current_exam_title)
        all_questions = q_query.all()

        # Determine how many questions the room was configured to serve
        # (use served_question_ids length as the target, capped by pool size)
        served_count = len(room.served_question_ids)
        questions_count = served_count if served_count else 0

        assigned = _build_student_exam(all_questions, questions_count)
        student.assigned_questions = assigned
        db.commit()

        total_q = len(assigned)
        q_updates = _assigned_to_payload(assigned)
        remaining = max(0, (room.exam_end_time - datetime.utcnow()).total_seconds())

        await sio.emit('JOINED', {
            'studentId': str(student.id),
            'roomState': {
                'roomId': room.room_id,
                'isActive': room.exam_active,
                'exam': None,
                'currentQuestionIndex': 0,
                'students': [],
                'totalQuestions': total_q
            }
        }, room=sid)

        await sio.emit('START_EXAM', {
            'duration_seconds': int(remaining),
            'end_time': room.exam_end_time.isoformat() + 'Z',
            'questions': [q.model_dump() for q in q_updates]
        }, room=sid)
    else:
        await sio.emit('JOINED', {
            'studentId': str(student.id),
            'roomState': {
                'roomId': room.room_id,
                'isActive': room.exam_active,
                'exam': None,
                'currentQuestionIndex': 0,
                'students': [],
                'totalQuestions': total_q
            }
        }, room=sid)

    return room.room_id


def _assigned_to_payload(assigned: list) -> list:
    """Convert stored assigned_questions dicts to QuestionUpdate objects."""
    return [
        QuestionUpdate(
            question_id=item["question_id"],
            text=item["text"],
            options=item["options"],
            image_url=item.get("image_url"),
        )
        for item in (assigned or [])
    ]
