"""Student-facing WebSocket handlers: join, submit_answer, disconnect."""

from datetime import datetime, timedelta

from config import ALLOW_TEST_USER, ANSWER_GRACE_SECONDS
from models import Question, Response, Student
from schemas import StartExamEvent, StudentJoin
from services.student_exam import assign_exam, assigned_to_payload, build_results_payload


def register(manager, db_session_factory):
    sio = manager.sio

    @sio.event
    async def connect(sid, environ):
        await sio.emit("connected", {"status": "ok"}, room=sid)
        await sio.emit("rooms_list", manager.get_active_rooms(), room=sid)

    @sio.event
    async def disconnect(sid):
        manager.admin_sids.discard(sid)
        student_id = manager.active_connections.pop(sid, None)
        room_id = manager.active_rooms.pop(sid, None)
        if not (student_id and room_id):
            return
        # A newer connection for the same student may already exist (reconnect race)
        if student_id in manager.active_connections.values():
            return
        db = db_session_factory()
        try:
            student = db.get(Student, int(student_id))
            if student:
                student.is_online = False
                student.last_active = datetime.utcnow()
                db.commit()
        finally:
            db.close()
        manager.schedule_dashboard_update(room_id)

    @sio.event
    async def join(sid, data):
        """New join or session restore."""
        db = db_session_factory()
        try:
            data = dict(data or {})
            is_test = ALLOW_TEST_USER and str(data.get("first_name", "")).strip().upper() == "TEST" \
                and str(data.get("last_name", "")).strip().upper() == "TEST"
            if is_test:
                data.setdefault("group", "G1")

            join_data = StudentJoin(**data)
            input_room = str(data.get("room_id", "")).strip().lower().replace(" ", "-")

            room = manager.get_room_by_code(input_room) or manager.rooms.get(input_room)
            if not room:
                if is_test and input_room:
                    room = manager.get_room(input_room)
                else:
                    await sio.emit("error", {"message": "Invalid room code"}, room=sid)
                    return

            fname, lname = join_data.first_name.strip(), join_data.last_name.strip()
            existing = db.query(Student).filter(
                Student.first_name.ilike(fname), Student.last_name.ilike(lname),
                Student.group == join_data.group, Student.room_id == room.room_id,
            ).first()

            # Capacity only counts brand-new students; returning ones always get back in
            if not existing and not is_test:
                joined = db.query(Student).filter(Student.room_id == room.room_id).count()
                if joined >= room.capacity_limit:
                    await sio.emit("error", {
                        "message": f"Room is full ({room.capacity_limit}). Ask your teacher to raise the limit."
                    }, room=sid)
                    return

            if existing:
                if join_data.email:
                    existing.email = join_data.email
                student = existing
                student.is_online = True
                student.last_active = datetime.utcnow()
                db.commit()
            else:
                student = Student(
                    first_name=fname, last_name=lname, email=join_data.email,
                    group=join_data.group, is_online=True, score=0, room_id=room.room_id,
                )
                db.add(student)
                db.commit()
                db.refresh(student)

            # Same student on a second device: the newest connection wins
            for old_sid, sid_student in list(manager.active_connections.items()):
                if sid_student == str(student.id) and old_sid != sid:
                    manager.active_connections.pop(old_sid, None)
                    manager.active_rooms.pop(old_sid, None)
                    await sio.emit("error", {"message": "You signed in on another device."}, room=old_sid)

            manager.active_connections[sid] = str(student.id)
            manager.active_rooms[sid] = room.room_id
            await sio.enter_room(sid, room.room_id)

            # Late joiner during a running exam: build their exam now
            if room.exam_active and not student.assigned_questions:
                assign_exam(db, student, room)

            responses = db.query(Response).filter(Response.student_id == student.id).all()
            pk_to_json = {q.id: q.question_id for q in db.query(Question).filter(
                Question.id.in_([r.question_id for r in responses]))} if responses else {}
            previous = {str(pk_to_json.get(r.question_id, r.question_id)): r.selected_option for r in responses}
            questions = assigned_to_payload(student.assigned_questions) if room.exam_active else []

            await sio.emit("JOINED", {
                "studentId": str(student.id),
                "roomState": {
                    "roomId": room.room_id, "isActive": room.exam_active, "exam": None,
                    "currentQuestionIndex": 0, "students": [], "totalQuestions": len(questions),
                    "resultsRevealed": room.results_revealed,
                },
                "previous_answers": previous,
            }, room=sid)

            if room.exam_active:
                await sio.emit("START_EXAM", StartExamEvent(
                    duration_seconds=room.seconds_remaining(),
                    end_time=room.end_time_iso(),
                    questions=questions,
                ).model_dump(), room=sid)
            elif room.results_revealed and student.assigned_questions:
                await sio.emit("FULL_RESULTS", build_results_payload(db, room, student), room=sid)

            manager.schedule_dashboard_update(room.room_id)
        except ValueError as e:  # pydantic validation
            await sio.emit("error", {"message": "Please enter a valid first name, last name and group."}, room=sid)
            print(f"Join rejected: {e}")
        except Exception:
            import traceback
            traceback.print_exc()
            await sio.emit("error", {"message": "Could not join. Please try again."}, room=sid)
        finally:
            db.close()

    @sio.event
    async def submit_answer(sid, data):
        # identity comes from the server-side session only, never from the payload
        student_id = manager.active_connections.get(sid)
        room_id = manager.active_rooms.get(sid)
        data = data or {}
        qid = data.get("question_id")
        if not student_id or not room_id:
            return
        room = manager.get_room(room_id)

        async def reject(reason):
            await sio.emit("answer_rejected", {"question_id": qid, "reason": reason}, room=sid)

        if not room.exam_active or not room.exam_end_time or \
                datetime.utcnow() > room.exam_end_time + timedelta(seconds=ANSWER_GRACE_SECONDS):
            return await reject("closed")

        db = db_session_factory()
        try:
            student = db.get(Student, int(student_id))
            if not student:
                return await reject("unknown_student")
            option = data.get("option")
            assigned = next((i for i in (student.assigned_questions or []) if i["question_id"] == qid), None)
            if not assigned or option not in assigned["options"]:
                return await reject("invalid")

            question = db.query(Question).filter(
                Question.question_id == qid, Question.exam_title == room.current_exam_title
            ).first() if room.current_exam_title else db.query(Question).filter(Question.question_id == qid).first()
            if not question:
                return await reject("invalid")

            is_correct = option == question.correct_answer
            resp = db.query(Response).filter(
                Response.student_id == student.id, Response.question_id == question.id).first()
            if resp:
                resp.selected_option, resp.is_correct, resp.answered_at = option, is_correct, datetime.utcnow()
            else:
                db.add(Response(student_id=student.id, question_id=question.id,
                                selected_option=option, is_correct=is_correct))
            db.flush()
            student.score = db.query(Response).filter(
                Response.student_id == student.id, Response.is_correct.is_(True)).count()
            student.last_active = datetime.utcnow()
            db.commit()

            await sio.emit("answer_acknowledged", {"question_id": qid}, room=sid)
            manager.schedule_dashboard_update(room_id)
        finally:
            db.close()
