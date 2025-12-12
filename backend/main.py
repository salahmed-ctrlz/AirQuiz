"""
AirQuiz - Classroom Assessment Platform
FastAPI Backend Server

Author: Salah Eddine Medkour
Copyright: 2024 Salah Eddine Medkour. All rights reserved.
License: MIT
GitHub: https://github.com/salahmed-ctrlz
LinkedIn: https://linkedin.com/in/salah-eddine-medkour
"""

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import socketio
import json
import io
import csv
import os
import shutil
from datetime import datetime
from typing import Optional

from database import get_db, init_db, SessionLocal
from models import Metadata, Student, Question, Response
from schemas import MetadataCreate, MetadataResponse, ExamData, StudentResponse
from manager import manager

# Initialize FastAPI app
app = FastAPI(title="AirQuiz API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()
    # Setup Socket.IO handlers
    manager.setup_handlers(SessionLocal)
    
    # Ensure exams directory exists
    exams_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "exams")
    os.makedirs(exams_dir, exist_ok=True)
    
    print("✅ Database initialized")
    print("✅ WebSocket manager configured")
    print(f"✅ Exams directory ready: {exams_dir}")

# Create Socket.IO ASGI app
sio_app = socketio.ASGIApp(
    manager.sio,
    other_asgi_app=app,
    socketio_path='socket.io'
)

# ============= API Endpoints =============

@app.get("/")
async def root():
    """Health check"""
    return {"status": "ok", "message": "AirQuiz API is running"}

# Metadata endpoints
@app.post("/api/metadata", response_model=MetadataResponse)
async def create_metadata(metadata: MetadataCreate, db: Session = Depends(get_db)):
    """Create or update room metadata"""
    try:
        # Update or create metadata entries
        for key, value in metadata.model_dump().items():
            existing = db.query(Metadata).filter(Metadata.key == key).first()
            if existing:
                existing.value = value
            else:
                new_meta = Metadata(key=key, value=value)
                db.add(new_meta)
        
        db.commit()
        return metadata
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/metadata", response_model=MetadataResponse)
async def get_metadata(db: Session = Depends(get_db)):
    """Get room metadata"""
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

# Exam endpoints
@app.post("/api/exam/load")
async def load_exam(exam: ExamData, db: Session = Depends(get_db)):
    """Load exam from JSON data AND save it to disk for persistence"""
    try:
        # 1. Save to Disk (Persistence)
        exams_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "exams")
        os.makedirs(exams_dir, exist_ok=True)
        
        # Create a safe filename
        safe_title = "".join([c for c in exam.title if c.isalpha() or c.isdigit() or c==' ']).rstrip()
        filename = f"{safe_title.replace(' ', '_')}.json"
        file_path = os.path.join(exams_dir, filename)
        
        # Prepare exam dict for saving
        exam_dict = {
            "title": exam.title,
            "questions": [q.model_dump() for q in exam.questions]
        }
        
        # Only save if not already exists or overwrite? Let's overwrite to ensure latest version
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(exam_dict, f, indent=2)
            
        print(f"Saved exam to {file_path}")

        # 2. Load into DB (InMemory state essentially as questions table is refreshed)
        # Clear existing questions
        db.query(Question).delete()
        db.commit()
        
        # Add new questions
        for q_data in exam.questions:
            question = Question(
                question_id=q_data.id,
                text=q_data.text,
                options=q_data.options,
                correct_answer=q_data.correct,
                time_limit=q_data.time,
                image_url=q_data.image,
                exam_title=exam.title
            )
            db.add(question)
        
        db.commit()
        
        return {
            "status": "success",
            "message": f"Loaded {len(exam.questions)} questions from '{exam.title}' and saved to disk."
        }
    except Exception as e:
        db.rollback()
        print(f"Error loading exam: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Student endpoints
@app.get("/api/students", response_model=list[StudentResponse])
async def get_students(db: Session = Depends(get_db)):
    """Get all students"""
    students = db.query(Student).all()
    return students

@app.delete("/api/room/reset")
async def reset_room(db: Session = Depends(get_db)):
    """Reset the entire room (clear all data except metadata)"""
    try:
        db.query(Response).delete()
        db.query(Student).delete()
        db.query(Question).delete()
        db.commit()
        
        # Reset manager state
        manager.current_question_id = None
        manager.answers_for_current_question = {}
        manager.active_connections = {}
        
        return {"status": "success", "message": "Room reset successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# CSV Export endpoint
@app.get("/admin/export_csv")
async def export_csv(room_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Export results as CSV with UTF-8-BOM encoding for Excel"""
    try:
        # Get metadata
        institution = db.query(Metadata).filter(Metadata.key == "institution_name").first()
        subject = db.query(Metadata).filter(Metadata.key == "subject_name").first()
        year = db.query(Metadata).filter(Metadata.key == "year").first()
        
        institution_name = institution.value if institution else "N/A"
        subject_name = subject.value if subject else "N/A"
        year_value = year.value if year else "N/A"
        
        # Filter students by room if provided
        query = db.query(Student)
        if room_id:
             query = query.filter(Student.room_id == room_id)
        
        students = query.order_by(Student.group, Student.last_name).all()
        
        # Create CSV in memory with UTF-8-BOM encoding
        output = io.StringIO()
        output.write('\ufeff')
        
        writer = csv.writer(output)
        
        # Header row
        writer.writerow(['Institution', 'Subject', 'Year', 'Room ID'])
        writer.writerow([institution_name, subject_name, year_value, room_id or "All"])
        writer.writerow([])
        
        # Data headers - Enhanced based on user request "Student - Grade"
        writer.writerow(['Group', 'Last Name', 'First Name', 'Score', 'Status', 'Last Active'])
        
        # Student data
        for student in students:
            status = "Online" if student.is_online else "Offline"
            writer.writerow([
                student.group.value if hasattr(student.group, 'value') else str(student.group),
                student.last_name,
                student.first_name,
                student.score,
                status,
                student.last_active.strftime('%Y-%m-%d %H:%M:%S') if student.last_active else 'N/A'
            ])
        
        # Prepare response
        output.seek(0)
        
        filename = f"Results_{room_id}_{datetime.now().strftime('%H%M')}.csv" if room_id else f"All_Results_{datetime.now().strftime('%H%M')}.csv"
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except Exception as e:
        print(f"Export error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Expose available exams
@app.get("/api/exams")
async def list_exams():
    """List all available exam JSON files"""
    exams_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "exams")
    if not os.path.exists(exams_dir):
        return []
    
    exams = []
    try:
        files = sorted(os.listdir(exams_dir))
        for filename in files:
            if filename.endswith(".json"):
                try:
                    with open(os.path.join(exams_dir, filename), 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        exams.append({
                            "filename": filename,
                            "title": data.get("title", filename.replace("_", " ").replace(".json", "")),
                            "questionCount": len(data.get("questions", []))
                        })
                except:
                    continue
    except Exception as e:
        print(f"Error listing exams: {e}")
        return []
        
    return exams

@app.get("/api/exams/{filename}")
async def get_exam_content(filename: str):
    """Get content of a specific exam file"""
    import os
    exams_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "exams")
    file_path = os.path.join(exams_dir, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Exam file not found")
        
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
