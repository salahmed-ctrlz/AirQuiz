from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
from models import GroupEnum

# Metadata Schemas
class MetadataCreate(BaseModel):
    institution_name: str
    subject_name: str
    year: str

class MetadataResponse(BaseModel):
    institution_name: str
    subject_name: str
    year: str

# Student Schemas
class StudentJoin(BaseModel):
    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)
    group: GroupEnum

class StudentResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    group: str
    score: int
    is_online: bool
    last_active: datetime
    
    class Config:
        from_attributes = True

# Question Schemas
class QuestionData(BaseModel):
    id: int
    text: str
    options: List[str]
    correct: str
    time: int = 30
    image: Optional[str] = None

class ExamData(BaseModel):
    title: str
    questions: List[QuestionData]

# Response Schemas
class AnswerSubmit(BaseModel):
    student_id: int
    question_id: int
    selected_option: str

class AnswerResult(BaseModel):
    is_correct: bool
    correct_answer: str
    selected_option: str

# WebSocket Event Schemas
class WSJoinEvent(BaseModel):
    event: str = "JOIN"
    first_name: str
    last_name: str
    group: GroupEnum

class WSAnswerEvent(BaseModel):
    event: str = "SUBMIT_ANSWER"
    student_id: int
    question_id: int
    option: str

# Broadcast Schemas
class StudentStatus(BaseModel):
    id: int
    first_name: str
    last_name: str
    group: str
    score: int
    is_online: bool
    has_answered: bool = False
    answers_count: int = 0  # Number of questions answered

class DashboardUpdate(BaseModel):
    event: str = "UPDATE_ADMIN_DASHBOARD"
    connected_count: int
    total_count: int
    answered_count: int
    students: List[StudentStatus]
    exam_active: bool = False
    time_remaining: int = 0

class QuestionUpdate(BaseModel):
    question_id: int
    text: str
    options: List[str]
    image_url: Optional[str] = None

class StartExamEvent(BaseModel):
    event: str = "START_EXAM"
    duration_seconds: int
    end_time: str
    questions: List[QuestionUpdate]

class ExamEndedEvent(BaseModel):
    event: str = "EXAM_ENDED"

class ShowResult(BaseModel):
    event: str = "SHOW_RESULT"
    question_id: int
    correct_answer: str
    user_answer: Optional[str] = None
    is_correct: Optional[bool] = None
    statistics: dict  # {option: count}

class FullExamResults(BaseModel):
    event: str = "FULL_RESULTS"
    results: Dict[int, ShowResult] # Map question_id to result
