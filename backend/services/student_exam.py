"""Per-student exam factory and result building (shared by admin + student handlers)."""

import random
from collections import defaultdict
from typing import Optional

from models import Question, Response, Student
from schemas import QuestionUpdate, ShowResult
from sqlalchemy.orm import Session


def build_student_exam(all_questions: list, questions_count: int) -> list:
    """Independently pick + shuffle questions AND options for one student.
    The correct answer is never included."""
    pool = list(all_questions)
    random.shuffle(pool)
    if questions_count > 0:
        pool = pool[:questions_count]
    result = []
    for q in pool:
        opts = list(q.options)
        random.shuffle(opts)
        result.append({
            "question_id": q.question_id,
            "text": q.text,
            "options": opts,
            "image_url": q.image_url,
        })
    return result


def assigned_to_payload(assigned: Optional[list]) -> list[QuestionUpdate]:
    return [
        QuestionUpdate(
            question_id=i["question_id"], text=i["text"],
            options=i["options"], image_url=i.get("image_url"),
        )
        for i in (assigned or [])
    ]


def exam_questions(db: Session, title: Optional[str]) -> list:
    q = db.query(Question)
    if title:
        q = q.filter(Question.exam_title == title)
    return q.all()


def assign_exam(db: Session, student: Student, room) -> list:
    """Generate and persist this student's unique exam for the room's running exam."""
    assigned = build_student_exam(exam_questions(db, room.current_exam_title), room.questions_to_serve)
    student.assigned_questions = assigned
    db.commit()
    return assigned


def build_results_payload(db: Session, room, student: Student) -> dict:
    """Individual results restricted to the questions this student was assigned."""
    questions = {q.question_id: q for q in exam_questions(db, room.current_exam_title)}
    pk_to_json = {q.id: q.question_id for q in questions.values()}

    responses = db.query(Response).filter(Response.student_id == student.id).all()
    by_json_id = {pk_to_json[r.question_id]: r for r in responses if r.question_id in pk_to_json}

    # answer distribution per question across the room
    dist = defaultdict(lambda: defaultdict(int))
    for qpk, sel in (
        db.query(Response.question_id, Response.selected_option)
        .join(Student, Student.id == Response.student_id)
        .filter(Student.room_id == room.room_id)
    ):
        dist[qpk][sel] += 1

    results = {}
    correct_total = 0
    for item in student.assigned_questions or []:
        q = questions.get(item["question_id"])
        if not q:
            continue
        resp = by_json_id.get(q.question_id)
        if resp and resp.is_correct:
            correct_total += 1
        results[str(q.question_id)] = ShowResult(
            question_id=q.question_id,
            correct_answer=q.correct_answer,
            user_answer=resp.selected_option if resp else None,
            is_correct=bool(resp and resp.is_correct),
            statistics={opt: dist[q.id].get(opt, 0) for opt in item["options"]},
        ).model_dump()

    student.score = correct_total
    db.commit()
    return {"results": results, "final_score": correct_total}
