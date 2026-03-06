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
            join_data = StudentJoin(**data)
            input_room = data.get('room_id', '').strip().lower().replace(' ', '-')

            # resolve room by code first, then by ID
            target_room = manager.get_room_by_code(input_room)
            if not target_room and input_room in manager.rooms:
                target_room = manager.rooms[input_room]

            if not target_room:
                await sio.emit('error', {'message': 'Invalid Room Code or ID'}, room=sid)
                return

            room_id = target_room.room_id

            # check for existing student (reconnect case)
            existing = db.query(Student).filter(
                Student.first_name == join_data.first_name,
                Student.last_name == join_data.last_name,
                Student.group == join_data.group,
                Student.room_id == room_id
            ).first()

            if existing:
                await _restore_student(sio, manager, db, sid, existing, target_room)
            else:
                await _new_student(sio, manager, db, sid, join_data, target_room)

            await manager.broadcast_dashboard_update(db, room_id)

        except Exception as e:
            print(f"Join error: {e}")
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


# -- internal helpers --

async def _restore_student(sio, manager, db, sid, student, room):
    """Reconnect an existing student and send their previous state."""
    student.is_online = True
    student.last_active = datetime.utcnow()
    db.commit()

    manager.active_connections[sid] = str(student.id)
    manager.active_rooms[sid] = room.room_id
    sio.enter_room(sid, room.room_id)

    responses = db.query(Response).filter(Response.student_id == student.id).all()
    previous = {r.question_id: r.selected_option for r in responses}

    remaining = 0
    if room.exam_active and room.exam_end_time:
        remaining = max(0, (room.exam_end_time - datetime.utcnow()).total_seconds())

    await sio.emit('restore_session', {
        'student_id': student.id,
        'score': student.score,
        'previous_answers': previous,
        'exam_active': room.exam_active,
        'remaining_seconds': remaining
    }, room=sid)

    # if exam is running, also send questions
    if room.exam_active:
        questions = _get_exam_questions(db, room)
        await sio.emit('exam_questions', [q.model_dump() for q in questions], room=sid)


async def _new_student(sio, manager, db, sid, join_data, room):
    """Register a brand new student."""
    student = Student(
        first_name=join_data.first_name,
        last_name=join_data.last_name,
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
    sio.enter_room(sid, room.room_id)

    await sio.emit('join_success', {'student_id': student.id}, room=sid)

    # if exam already running, catch student up
    if room.exam_active and room.exam_end_time:
        remaining = max(0, (room.exam_end_time - datetime.utcnow()).total_seconds())
        questions = _get_exam_questions(db, room)
        await sio.emit('start_exam', StartExamEvent(
            duration_seconds=int(remaining),
            end_time=room.exam_end_time.isoformat() + 'Z',
            questions=questions
        ).model_dump(), room=sid)


def _get_exam_questions(db, room):
    """Fetch questions for the room's current exam."""
    query = db.query(Question)
    if room.current_exam_title:
        query = query.filter(Question.exam_title == room.current_exam_title)
    return [
        QuestionUpdate(
            question_id=q.question_id,
            text=q.text,
            options=q.options,
            image_url=q.image_url
        ) for q in query.all()
    ]
