"""
AirQuiz - Classroom Assessment Platform
FastAPI backend: REST API, Socket.IO and the built frontend on a single port.
License: MIT
"""

import asyncio
import os
from contextlib import asynccontextmanager
from typing import Optional

import auth
import socketio
from auth import require_admin
from config import CORS_ORIGINS, STATIC_DIR
from database import SessionLocal, get_db, init_db
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.responses import Response as HttpResponse
from fastapi.staticfiles import StaticFiles
from manager import manager
from models import Metadata, Question, Response, Student
from network import lan_addresses
from pydantic import BaseModel
from schemas import ExamData, MetadataCreate, MetadataResponse
from services import exam_service
from services.export_service import build_csv
from sqlalchemy.orm import Session

VERSION = "1.1.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    manager.setup_handlers(SessionLocal)
    exam_service.seed_samples()
    auth.get_admin_password()  # make sure it exists before anyone asks
    task = asyncio.create_task(manager.expire_loop())
    yield
    task.cancel()


app = FastAPI(title="AirQuiz API", version=VERSION, lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Socket.IO wraps the FastAPI app
sio_app = socketio.ASGIApp(manager.sio, other_asgi_app=app, socketio_path="socket.io")


class LoginBody(BaseModel):
    password: str


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": VERSION}


@app.post("/api/admin/login")
async def admin_login(body: LoginBody, request: Request):
    client = request.client.host if request.client else "?"
    if not auth.login_allowed(client):
        raise HTTPException(status_code=429, detail="Too many attempts. Wait a few minutes.")
    if not auth.check_password(body.password.strip()):
        auth.record_failure(client)
        raise HTTPException(status_code=401, detail="Incorrect password")
    return {"token": auth.make_token()}


@app.get("/api/server-info", dependencies=[Depends(require_admin)])
async def server_info(request: Request):
    port = request.url.port or 80
    return {"version": VERSION, "port": port, "student_urls": [f"http://{ip}:{port}" for ip in lan_addresses()]}


@app.get("/api/qr.svg")
async def qr_svg(data: str):
    """QR code as SVG so the teacher can project it for students (no image libs needed)."""
    import io

    import qrcode
    import qrcode.image.svg
    if len(data) > 300:
        raise HTTPException(status_code=400, detail="Too long")
    img = qrcode.make(data, image_factory=qrcode.image.svg.SvgPathImage, border=2)
    buf = io.BytesIO()
    img.save(buf)
    return HttpResponse(buf.getvalue(), media_type="image/svg+xml", headers={"Cache-Control": "max-age=86400"})


@app.get("/api/admin/session", dependencies=[Depends(require_admin)])
async def admin_session():
    return {"ok": True}


@app.post("/api/metadata", response_model=MetadataResponse, dependencies=[Depends(require_admin)])
async def create_metadata(metadata: MetadataCreate, db: Session = Depends(get_db)):
    for key, value in metadata.model_dump().items():
        row = db.query(Metadata).filter(Metadata.key == key).first()
        if row:
            row.value = value
        else:
            db.add(Metadata(key=key, value=value))
    db.commit()
    return metadata


@app.get("/api/metadata", response_model=MetadataResponse)
async def get_metadata(db: Session = Depends(get_db)):
    def val(key):
        row = db.query(Metadata).filter(Metadata.key == key).first()
        return row.value if row else ""
    return MetadataResponse(institution_name=val("institution_name"),
                            subject_name=val("subject_name"), year=val("year"))


@app.post("/api/exam/load", dependencies=[Depends(require_admin)])
async def load_exam(exam: ExamData, db: Session = Depends(get_db)):
    """Validate, save to the library and load into the DB. Only this exam's
    questions are replaced, so other rooms keep running."""
    if any(r.exam_active and r.current_exam_title == exam.title for r in manager.rooms.values()):
        raise HTTPException(status_code=409, detail="This exam is running right now and cannot be reloaded.")

    exam_service.save_exam(exam.title, [q.model_dump(exclude={"correct_index"}) for q in exam.questions])

    old = [q.id for q in db.query(Question.id).filter(Question.exam_title == exam.title)]
    if old:
        db.query(Response).filter(Response.question_id.in_(old)).delete(synchronize_session=False)
        db.query(Question).filter(Question.id.in_(old)).delete(synchronize_session=False)
    for q in exam.questions:
        db.add(Question(question_id=q.id, text=q.text, options=q.options, correct_answer=q.correct,
                        time_limit=q.time, image_url=q.image, exam_title=exam.title))
    db.commit()
    return {"status": "success", "message": f"Loaded {len(exam.questions)} questions from '{exam.title}'."}


@app.get("/api/students", dependencies=[Depends(require_admin)])
async def get_students(db: Session = Depends(get_db)):
    return [{"id": s.id, "first_name": s.first_name, "last_name": s.last_name,
             "group": s.group.value, "score": s.score, "is_online": s.is_online} for s in db.query(Student).all()]


@app.delete("/api/room/reset", dependencies=[Depends(require_admin)])
async def reset_room(db: Session = Depends(get_db)):
    """Wipe all session data except metadata."""
    db.query(Response).delete()
    db.query(Student).delete()
    db.commit()
    for room in manager.rooms.values():
        room.reset()
        manager.persist_room(room)
    manager.active_connections.clear()
    manager.active_rooms.clear()
    return {"status": "success"}


@app.get("/admin/export_csv", dependencies=[Depends(require_admin)])
async def export_csv(room_id: Optional[str] = None, db: Session = Depends(get_db)):
    content, filename = build_csv(db, room_id)
    return HttpResponse(content, media_type="text/csv; charset=utf-8",
                        headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@app.get("/api/exams", dependencies=[Depends(require_admin)])
async def list_exams():
    return exam_service.list_exams()


@app.get("/api/exams/{filename}", dependencies=[Depends(require_admin)])
async def get_exam_content(filename: str):
    path = exam_service.resolve(filename)
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Exam file not found")
    try:
        return JSONResponse(exam_service.read_exam(path), headers={"Cache-Control": "no-store"})
    except (OSError, ValueError):
        raise HTTPException(status_code=500, detail="Exam file is unreadable")


@app.delete("/api/exams/{filename}", dependencies=[Depends(require_admin)])
async def delete_exam(filename: str):
    path = exam_service.resolve(filename)
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Exam file not found")
    os.remove(path)
    return {"status": "deleted", "filename": filename}


# -- Frontend (built with `npm run build`) -------------------------------------
if (STATIC_DIR / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def spa(path: str):
        if path.startswith(("api/", "socket.io")):
            raise HTTPException(status_code=404)
        target = (STATIC_DIR / path).resolve()
        if path and target.is_file() and STATIC_DIR.resolve() in target.parents:
            headers = {"Cache-Control": "no-cache"} if path in ("sw.js", "registerSW.js", "manifest.webmanifest") else {}
            return FileResponse(target, headers=headers)
        return FileResponse(STATIC_DIR / "index.html", headers={"Cache-Control": "no-cache"})
else:
    @app.get("/")
    async def root():
        return {"status": "ok", "message": "AirQuiz API is running (frontend not built)"}
