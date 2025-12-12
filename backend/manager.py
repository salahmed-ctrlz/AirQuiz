"""
AirQuiz - Classroom Assessment Platform
WebSocket Manager - Handles real-time quiz events

Author: Salah Eddine Medkour
Copyright: 2024 Salah Eddine Medkour. All rights reserved.
License: MIT
GitHub: https://github.com/salahmed-ctrlz
"""

import socketio
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json
import asyncio
import random
import string

from models import Student, Question, Response
from schemas import (
    StudentStatus, DashboardUpdate, StartExamEvent, ExamEndedEvent,
    StudentJoin, AnswerSubmit, QuestionUpdate, FullExamResults, ShowResult
)

class Room:
    """Manages state for a single quiz room (subject)"""
    def __init__(self, room_id: str):
        self.room_id = room_id
        # Simple Room Code Logic: 
        # If room_id is 'math-101', code is auto-generated or use room_id if explicit.
        # For simplicity, we store the code here.
        self.code = ''.join(random.choices(string.digits, k=6))
        
        self.exam_active: bool = False
        self.exam_start_time: Optional[datetime] = None
        self.exam_end_time: Optional[datetime] = None
        self.exam_duration_seconds: int = 0
        self.start_locked: bool = False # Prevent new joins if strict
        self.current_exam_title: Optional[str] = None # Which exam is loaded

    def reset(self):
        """Hard reset room state"""
        self.exam_active = False
        self.exam_start_time = None
        self.exam_end_time = None
        self.exam_duration_seconds = 0
        self.current_exam_title = None
        # Keep the code stable? Or rotate? Let's keep it stable for the session.

class ConnectionManager:
    """The Brain - Manages WebSocket connections and rooms"""
    
    def __init__(self):
        self.sio = socketio.AsyncServer(
            async_mode='asgi',
            cors_allowed_origins='*',
            logger=True,
            engineio_logger=True
        )
        self.active_connections: Dict[str, str] = {}  # {sid: student_id}
        self.active_rooms: Dict[str, str] = {} # {sid: room_id}
        self.rooms: Dict[str, Room] = {} # {room_id: Room}
        
    def get_room(self, room_id: str) -> Room:
        if room_id not in self.rooms:
            self.rooms[room_id] = Room(room_id)
        return self.rooms[room_id]

    def get_room_by_code(self, code: str) -> Optional[Room]:
        for room in self.rooms.values():
            if room.code == code:
                return room
        return None

    def get_active_rooms(self) -> List[Dict[str, str]]:
        """Get list of active rooms for clients"""
        return [
            {"id": room.room_id, "code": room.code, "name": room.room_id.replace('-', ' ').title()}
            for room in self.rooms.values()
        ]

    async def broadcast_room_list(self):
        """Broadcast updated room list to all clients"""
        rooms = self.get_active_rooms()
        # Broadcast to everyone
        await self.sio.emit('rooms_list', rooms)

    def setup_handlers(self, db_session_factory):
        """Setup Socket.IO event handlers"""
        
        @self.sio.event
        async def connect(sid, environ):
            print(f"Client connected: {sid}")
            await self.sio.emit('connected', {'status': 'ok'}, room=sid)
            # Send initial room list
            await self.sio.emit('rooms_list', self.get_active_rooms(), room=sid)
        
        @self.sio.event
        async def disconnect(sid):
            print(f"Client disconnected: {sid}")
            
            # Identify student and room
            student_id = self.active_connections.get(sid)
            room_id = self.active_rooms.get(sid)
            
            if student_id and room_id:
                db = db_session_factory()
                try:
                    student = db.query(Student).get(student_id)
                    if student:
                        student.is_online = False
                        student.last_active = datetime.utcnow()
                        db.commit()
                        
                        await self.broadcast_dashboard_update(db, room_id)
                finally:
                    db.close()
                
            if sid in self.active_connections: del self.active_connections[sid]
            if sid in self.active_rooms: del self.active_rooms[sid]
        
        @self.sio.event
        async def get_rooms(sid):
             """Client explicitly requests room list"""
             await self.sio.emit('rooms_list', self.get_active_rooms(), room=sid)

        @self.sio.event
        async def join_room_admin(sid, data):
            """Admin joins a dashboard room to monitor"""
            """Admin joins a dashboard room to monitor"""
            input_room = data.get('room_id', '').strip()
            if not input_room: return
            
            room_id = input_room.lower().replace(' ', '-')
            
            # Create room if not exists immediately
            room = self.get_room(room_id)
            
            await self.sio.enter_room(sid, room_id)
            print(f"Admin {sid} monitoring room {room_id} (Code: {room.code})")
            
            # Verify admin is connected by sending immediate ping with code
            await self.sio.emit('room_info', {'room_id': room_id, 'code': room.code}, room=sid)
            
            # Send immediate update
            db = db_session_factory()
            try:
                await self.broadcast_dashboard_update(db, room_id)
            finally:
                db.close()
            
            # Broadcast new room to everyone
            await self.broadcast_room_list()

        @self.sio.event
        async def join(sid, data):
            """Student joins the quiz"""
            print(f"Join from {sid}: {data}")
            
            db = db_session_factory()
            try:
                # Validate
                join_data = StudentJoin(**data)
                
                # Check if input is a code or an ID
                # We expect student to send 'room_id' field which might contain the code
                # Normalize input to lower case and hyphenated
                input_room = data.get('room_id', '').strip()
                if input_room:
                     input_room = input_room.lower().replace(' ', '-')
                
                target_room = None
                
                # 1. Try to find by code
                found_by_code = self.get_room_by_code(input_room)
                if found_by_code:
                    target_room = found_by_code
                else:
                     # 2. Fallback for ID (e.g. from dropdown if we send ID)
                     if input_room in self.rooms:
                         target_room = self.rooms[input_room]
                
                if not target_room:
                     await self.sio.emit('error', {'message': 'Invalid Room Code or ID'}, room=sid)
                     return

                room_id = target_room.room_id
                
                # Check for existing student in THIS room
                existing_student = db.query(Student).filter(
                    Student.first_name == join_data.first_name,
                    Student.last_name == join_data.last_name,
                    Student.group == join_data.group,
                    Student.room_id == room_id
                ).first()
                
                student_id = None
                
                if existing_student:
                    # Restore
                    existing_student.is_online = True
                    existing_student.last_active = datetime.utcnow()
                    db.commit()
                    student_id = existing_student.id
                    
                    self.active_connections[sid] = str(student_id)
                    self.active_rooms[sid] = room_id
                    self.sio.enter_room(sid, room_id) 
                    
                    # Fetch answers
                    responses = db.query(Response).filter(Response.student_id == student_id).all()
                    previous_answers = {r.question_id: r.selected_option for r in responses}
                    
                    remaining = 0
                    if target_room.exam_active and target_room.exam_end_time:
                         remaining = max(0, (target_room.exam_end_time - datetime.utcnow()).total_seconds())

                    await self.sio.emit('restore_session', {
                        'student_id': student_id,
                        'score': existing_student.score,
                        'previous_answers': previous_answers,
                        'exam_active': target_room.exam_active,
                        'remaining_seconds': remaining
                    }, room=sid)
                    
                    if target_room.exam_active:
                         # Filter questions by active exam title
                         query = db.query(Question)
                         if target_room.current_exam_title:
                             query = query.filter(Question.exam_title == target_room.current_exam_title)
                         questions = query.all()

                         q_updates = [
                             QuestionUpdate(
                                 question_id=q.question_id,
                                 text=q.text,
                                 options=q.options,
                                 image_url=q.image_url
                             ) for q in questions
                         ]
                         await self.sio.emit('exam_questions', [q.model_dump() for q in q_updates], room=sid)

                else:
                    # New Student
                    new_student = Student(
                        first_name=join_data.first_name,
                        last_name=join_data.last_name,
                        group=join_data.group,
                        is_online=True,
                        score=0,
                        room_id=room_id
                    )
                    db.add(new_student)
                    db.commit()
                    db.refresh(new_student)
                    
                    student_id = new_student.id
                    self.active_connections[sid] = str(student_id)
                    self.active_rooms[sid] = room_id
                    self.sio.enter_room(sid, room_id)
                    
                    await self.sio.emit('join_success', {'student_id': new_student.id}, room=sid)
                    
                    if target_room.exam_active and target_room.exam_end_time:
                          remaining = max(0, (target_room.exam_end_time - datetime.utcnow()).total_seconds())
                          # Filter questions by active exam title
                          query = db.query(Question)
                          if target_room.current_exam_title:
                              query = query.filter(Question.exam_title == target_room.current_exam_title)
                          questions = query.all()

                          q_updates = [
                              QuestionUpdate(
                                  question_id=q.question_id,
                                  text=q.text,
                                  options=q.options,
                                  image_url=q.image_url
                              ) for q in questions
                          ]
                          await self.sio.emit('start_exam', StartExamEvent(
                              duration_seconds=int(remaining),
                              end_time=target_room.exam_end_time.isoformat() + 'Z',
                              questions=q_updates
                          ).model_dump(), room=sid)

                # Broadcast update to this room only
                await self.broadcast_dashboard_update(db, room_id)
                
            except Exception as e:
                print(f"Join error: {e}")
                await self.sio.emit('error', {'message': str(e)}, room=sid)
            finally:
                db.close()
        
        @self.sio.event
        async def submit_answer(sid, data):
            student_id = self.active_connections.get(sid)
            room_id = self.active_rooms.get(sid)
            if not student_id or not room_id: 
                 if 'student_id' in data: 
                     student_id = str(data['student_id']) 
                 else:
                     return
            
            room = self.get_room(room_id) if room_id else None

            db = db_session_factory()
            try:
                question_id = data.get('question_id')
                selected_option = data.get('option')
                
                question = db.query(Question).filter(Question.question_id == question_id).first()
                if not question: return

                is_correct = (selected_option == question.correct_answer)
                
                existing = db.query(Response).filter(
                    Response.student_id == student_id, 
                    Response.question_id == question.id
                ).first()
                
                if existing:
                    existing.selected_option = selected_option
                    existing.is_correct = is_correct
                    existing.answered_at = datetime.utcnow()
                else:
                    new_resp = Response(
                        student_id=student_id,
                        question_id=question.id,
                        selected_option=selected_option,
                        is_correct=is_correct
                    )
                    db.add(new_resp)
                
                db.commit()
                
                await self.broadcast_dashboard_update(db, room_id)

            finally:
                db.close()

        @self.sio.event
        async def admin_start_exam(sid, data):
            room_id = data.get('room_id')
            if not room_id: return
            
            room = self.get_room(room_id)
            
            db = db_session_factory()
            try:
                duration_minutes = int(data.get('duration_minutes', 15))
                exam_title = data.get('exam_title')  # New: Get title
                
                room.exam_duration_seconds = duration_minutes * 60
                room.exam_start_time = datetime.utcnow()
                room.exam_end_time = room.exam_start_time + timedelta(seconds=room.exam_duration_seconds)
                room.exam_active = True
                room.current_exam_title = exam_title # Store active title
                
                # Filter questions by title
                query = db.query(Question)
                if exam_title:
                    query = query.filter(Question.exam_title == exam_title)
                
                questions = query.all()
                
                q_updates = [
                     QuestionUpdate(
                         question_id=q.question_id,
                         text=q.text,
                         options=q.options,
                         image_url=q.image_url
                     ) for q in questions
                 ]
                
                event_data = StartExamEvent(
                    duration_seconds=room.exam_duration_seconds,
                    end_time=room.exam_end_time.isoformat() + 'Z',
                    questions=q_updates
                )
                
                await self.sio.emit('start_exam', event_data.model_dump(), room=room_id)
                await self.broadcast_dashboard_update(db, room_id)
                await self.broadcast_room_list() # Verify state? No change to list usually, but safe.
            finally:
                db.close()

        @self.sio.event
        async def admin_end_exam(sid, data):
            room_id = data.get('room_id')
            if not room_id: return
            
            room = self.get_room(room_id)
            room.exam_active = False
            room.exam_end_time = datetime.utcnow()
            
            await self.sio.emit('exam_ended', room=room_id)
            await self.broadcast_dashboard_update(db_session_factory(), room_id)

        @self.sio.event
        async def admin_reveal_results(sid, data):
            room_id = data.get('room_id')
            if not room_id: return
            
            db = db_session_factory()
            try:
                questions = db.query(Question).all()
                
                students = db.query(Student).filter(Student.room_id == room_id).all()
                for student in students:
                    score = 0
                    responses = db.query(Response).filter(Response.student_id == student.id).all()
                    for r in responses:
                        if r.is_correct: score += 1
                    student.score = score
                db.commit()

                target_sids = [s for s, r in self.active_rooms.items() if r == room_id]
                
                for conn_sid in target_sids:
                    st_id = self.active_connections.get(conn_sid)
                    if not st_id: continue
                    
                    student_results = {}
                    responses = db.query(Response).filter(Response.student_id == st_id).all()
                    response_map = {r.question_id: r for r in responses}
                    
                    for q in questions:
                        resp = response_map.get(q.id)
                        # In-room stats
                        all_room_resp = db.query(Response).join(Student).filter(
                            Student.room_id == room_id,
                            Response.question_id == q.id
                        ).all()
                        
                        stats = {}
                        for opt in q.options:
                            count = sum(1 for ar in all_room_resp if ar.selected_option == opt)
                            stats[opt] = count
                            
                        result = ShowResult(
                            question_id=q.question_id,
                            correct_answer=q.correct_answer,
                            user_answer=resp.selected_option if resp else None,
                            is_correct=resp.is_correct if resp else False,
                            statistics=stats
                        )
                        student_results[q.question_id] = result
                    
                    final_score = next((s.score for s in students if str(s.id) == str(st_id)), 0)
                    await self.sio.emit('full_results', {
                        'results': {k: v.model_dump() for k, v in student_results.items()},
                        'final_score': final_score
                    }, room=conn_sid)
                
                await self.broadcast_dashboard_update(db, room_id)
            finally:
                db.close()

        @self.sio.event
        async def admin_reset_room(sid, data):
            room_id = data.get('room_id')
            if not room_id: return
            
            print(f"RESETTING ROOM: {room_id}")
            
            db = db_session_factory()
            try:
                students_in_room = db.query(Student.id).filter(Student.room_id == room_id).all()
                student_ids = [s[0] for s in students_in_room]
                
                if student_ids:
                    db.query(Response).filter(Response.student_id.in_(student_ids)).delete(synchronize_session=False)
                    db.query(Student).filter(Student.room_id == room_id).delete(synchronize_session=False)
                
                db.commit()
                
                if room_id in self.rooms:
                    self.rooms[room_id].reset()
                
                await self.sio.emit('error', {'message': 'Session ended by admin. Please refresh to join again.'}, room=room_id)
                await self.broadcast_dashboard_update(db, room_id)
                # Maybe remove from list? No, room persists in memory.
                
            except Exception as e:
                print(f"Reset error: {e}")
            finally:
                db.close()
                
        @self.sio.event
        async def admin_export_csv(sid, data):
             pass

        @self.sio.event
        async def admin_extend_exam(sid, data):
            """Extend the exam by X minutes"""
            room_id = data.get('room_id')
            if not room_id: return
            
            room = self.get_room(room_id)
            if not room.exam_active or not room.exam_end_time:
                 return

            # Add 5 minutes (or requested amount)
            minutes = int(data.get('minutes', 5))
            room.exam_end_time += timedelta(minutes=minutes)
            
            # Recalculate duration/remaining
            new_remaining = max(0, (room.exam_end_time - datetime.utcnow()).total_seconds())
            
            db = db_session_factory()
            try:
                # Notify all clients in the room of the new end time
                event_data = {
                    'duration_seconds': int(new_remaining),
                    'end_time': room.exam_end_time.isoformat() + 'Z'
                }
                await self.sio.emit('exam_extended', event_data, room=room_id)
                
                # Also trigger standard status update to keep timers in sync
                await self.broadcast_dashboard_update(db, room_id)
            finally:
                db.close()

    async def broadcast_dashboard_update(self, db: Session, room_id: str):
        """Send dashboard stats for a specific room"""
        if not room_id: return
        
        try:
            students = db.query(Student).filter(Student.room_id == room_id).all()
            
            student_statuses = []
            for student in students:
                responses_count = db.query(Response).filter(Response.student_id == student.id).count()
                status = StudentStatus(
                    id=student.id,
                    first_name=student.first_name,
                    last_name=student.last_name,
                    group=student.group.value,
                    score=student.score,
                    is_online=student.is_online,
                    has_answered=(responses_count > 0),
                    answers_count=responses_count
                )
                student_statuses.append(status)
            
            room = self.get_room(room_id) # Ensure simple creation if checking update
            remaining = 0
            if room.exam_active and room.exam_end_time:
                remaining = max(0, (room.exam_end_time - datetime.utcnow()).total_seconds())
                
            update = DashboardUpdate(
                connected_count=sum(1 for s in students if s.is_online),
                total_count=len(students),
                answered_count=db.query(Response).join(Student).filter(Student.room_id == room_id).count(),
                students=[s.model_dump() for s in student_statuses],
                exam_active=room.exam_active,
                time_remaining=int(remaining)
            )
            
            # Use room specific broadcast
            await self.sio.emit('dashboard_update', update.model_dump(), room=room_id)
            
        except Exception as e:
            print(f"Broadcast error: {e}")

manager = ConnectionManager()
