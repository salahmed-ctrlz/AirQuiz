"""
AirQuiz - Classroom Assessment Platform
FastAPI Backend Server

Author:    Salah Eddine Medkour <medkoursalaheddine@gmail.com>
GitHub:    https://github.com/salahmed-ctrlz
LinkedIn:  https://linkedin.com/in/salah-eddine-medkour
Portfolio: https://salahmed-ctrlz.github.io/salaheddine-medkour-portfolio/
License:   MIT
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy.orm import Session
import socketio
import json
import io
import csv
import os
from datetime import datetime
from typing import Optional

from config import CORS_ORIGINS, EXAMS_DIR, LOG_LEVEL
from database import get_db, init_db, SessionLocal
from models import Metadata, Student, Question, Response
from schemas import MetadataCreate, MetadataResponse, ExamData, StudentResponse
from manager import manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    init_db()
    manager.setup_handlers(SessionLocal)
    os.makedirs(EXAMS_DIR, exist_ok=True)
    print(f"✅ AirQuiz backend ready — exams dir: {EXAMS_DIR}")
    yield


app = FastAPI(title="AirQuiz API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ASGI app wrapping Socket.IO + FastAPI
sio_app = socketio.ASGIApp(
    manager.sio,
    other_asgi_app=app,
    socketio_path='socket.io'
)


# -- helpers --

def _safe_exam_path(filename: str) -> str:
    """Resolve exam path and reject directory traversal attempts."""
    safe = os.path.basename(filename)
    path = os.path.join(EXAMS_DIR, safe)
    if not os.path.abspath(path).startswith(os.path.abspath(EXAMS_DIR)):
        raise HTTPException(status_code=400, detail="Invalid filename")
    return path


# ============= API Endpoints =============

@app.get("/")
async def root():
    return {"status": "ok", "message": "AirQuiz API is running"}


@app.post("/api/metadata", response_model=MetadataResponse)
async def create_metadata(metadata: MetadataCreate, db: Session = Depends(get_db)):
    """Create or update room metadata."""
    try:
        for key, value in metadata.model_dump().items():
            existing = db.query(Metadata).filter(Metadata.key == key).first()
            if existing:
                existing.value = value
            else:
                db.add(Metadata(key=key, value=value))
        db.commit()
        return metadata
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/metadata", response_model=MetadataResponse)
async def get_metadata(db: Session = Depends(get_db)):
    try:
        institution = db.query(Metadata).filter(Metadata.key == "institution_name").first()
        subject = db.query(Metadata).filter(Metadata.key == "subject_name").first()
        year = db.query(Metadata).filter(Metadata.key == "year").first()
        return MetadataResponse(
            institution_name=institution.value if institution else "",
            subject_name=subject.value if subject else "",
            year=year.value if year else ""
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/exam/load")
async def load_exam(exam: ExamData, db: Session = Depends(get_db)):
    """Load exam into DB and persist JSON to disk.
    
    Accepts two question formats:
    - { correct: "option text" } — used by ExamBuilder and all current exam files
    - { correct_index: 0 }       — index into options array (legacy support)
    Both are normalised to store the full correct-answer text in the DB.
    """
    try:
        # ── 1. Persist JSON to disk ──────────────────────────────────────────
        safe_title = exam.title.replace('/', '_').replace('\\', '_').replace(':', '_').strip()
        filename = f"{safe_title.replace(' ', '_')}.json"
        file_path = os.path.join(EXAMS_DIR, filename)

        exam_dict = {
            "title": exam.title,
            "questions": [q.model_dump() for q in exam.questions]
        }
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(exam_dict, f, indent=2, ensure_ascii=False)

        # ── 2. Wipe DB questions + their responses ────────────────────────────
        # Must delete responses FIRST or the FK constraint will raise an error.
        # Questions are global (one active exam at a time), so wiping all is correct.
        question_ids = [q.id for q in db.query(Question.id).all()]
        if question_ids:
            db.query(Response).filter(
                Response.question_id.in_(question_ids)
            ).delete(synchronize_session=False)
        db.query(Question).delete(synchronize_session=False)
        db.commit()

        # ── 3. Insert new questions ───────────────────────────────────────────
        for q_data in exam.questions:
            # Resolve correct answer from 'correct' (text) or 'correct_index' (int)
            correct_text = q_data.correct or ''
            if not correct_text:
                ci = getattr(q_data, 'correct_index', None)
                if ci is not None:
                    idx = int(ci)
                    if 0 <= idx < len(q_data.options):
                        correct_text = q_data.options[idx]

            db.add(Question(
                question_id=q_data.id,
                text=q_data.text,
                options=q_data.options,
                correct_answer=correct_text,
                time_limit=q_data.time,
                image_url=q_data.image,
                exam_title=exam.title
            ))
        db.commit()

        return {
            "status": "success",
            "message": f"Loaded {len(exam.questions)} questions from '{exam.title}'."
        }
    except Exception as e:
        db.rollback()
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))



@app.get("/api/students", response_model=list[StudentResponse])
async def get_students(db: Session = Depends(get_db)):
    return db.query(Student).all()


@app.delete("/api/room/reset")
async def reset_room(db: Session = Depends(get_db)):
    """Wipe all session data except metadata."""
    try:
        db.query(Response).delete()
        db.query(Student).delete()
        db.query(Question).delete()
        db.commit()

        manager.current_question_id = None
        manager.answers_for_current_question = {}
        manager.active_connections = {}

        return {"status": "success", "message": "Room reset successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/admin/export_csv")
async def export_csv(room_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Export results as CSV with UTF-8-BOM for Excel compatibility."""
    try:
        institution = db.query(Metadata).filter(Metadata.key == "institution_name").first()
        subject = db.query(Metadata).filter(Metadata.key == "subject_name").first()
        year = db.query(Metadata).filter(Metadata.key == "year").first()

        query = db.query(Student)
        if room_id:
            query = query.filter(Student.room_id == room_id)
        students = query.order_by(Student.group, Student.last_name).all()

        output = io.StringIO()
        output.write('\ufeff')  # BOM for Excel
        writer = csv.writer(output)

        writer.writerow(['Institution', 'Subject', 'Year', 'Room ID'])
        writer.writerow([
            institution.value if institution else "N/A",
            subject.value if subject else "N/A",
            year.value if year else "N/A",
            room_id or "All"
        ])
        writer.writerow([])
        writer.writerow(['Group', 'Last Name', 'First Name', 'Email', 'Score', 'Status', 'Last Active'])

        for student in students:
            writer.writerow([
                student.group.value if hasattr(student.group, 'value') else str(student.group),
                student.last_name,
                student.first_name,
                student.email or "N/A",
                student.score,
                "Online" if student.is_online else "Offline",
                student.last_active.strftime('%Y-%m-%d %H:%M:%S') if student.last_active else 'N/A'
            ])

        output.seek(0)
        ts = datetime.now().strftime('%H%M')
        filename = f"Results_{room_id}_{ts}.csv" if room_id else f"All_Results_{ts}.csv"

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/exams")
async def list_exams():
    """List available exam JSON files."""
    if not os.path.exists(EXAMS_DIR):
        return []

    exams = []
    for filename in sorted(os.listdir(EXAMS_DIR)):
        if not filename.endswith(".json"):
            continue
        try:
            with open(os.path.join(EXAMS_DIR, filename), 'r', encoding='utf-8') as f:
                data = json.load(f)
                exams.append({
                    "filename": filename,
                    "title": data.get("title", filename.replace("_", " ").replace(".json", "")),
                    "questionCount": len(data.get("questions", []))
                })
        except (json.JSONDecodeError, OSError) as e:
            print(f"Skipping malformed exam file {filename}: {e}")
            continue
    return exams


@app.get("/api/exams/{filename}")
async def get_exam_content(filename: str):
    """Get a specific exam file. Filename is sanitized to prevent path traversal.
    Returns with no-cache headers so the browser always gets the latest version.
    """
    from fastapi.responses import JSONResponse
    file_path = _safe_exam_path(filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Exam file not found")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return JSONResponse(
            content=data,
            headers={
                "Cache-Control": "no-store, no-cache, must-revalidate",
                "Pragma": "no-cache",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/exams/{filename}")
async def delete_exam(filename: str):
    """Delete an exam file from the library. Path-traversal safe."""
    file_path = _safe_exam_path(filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Exam file not found")
    try:
        os.remove(file_path)
        return {"status": "deleted", "filename": filename}
    except OSError as e:
        raise HTTPException(status_code=500, detail=str(e))

