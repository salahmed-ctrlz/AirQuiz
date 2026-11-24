from datetime import datetime
from typing import Dict, List, Optional

from models import GroupEnum
from pydantic import BaseModel, Field, field_validator, model_validator


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
    first_name: str = Field(min_length=1, max_length=60)
    last_name: str = Field(min_length=1, max_length=60)
    email: Optional[str] = None
    group: GroupEnum

class StudentResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    group: str
    score: int
    is_online: bool
    last_active: datetime
    
    model_config = {"from_attributes": True}

# Question Schemas
class QuestionData(BaseModel):
    id: int
    text: str = Field(min_length=1)
    options: List[str] = Field(min_length=2, max_length=10)
    correct: str = ""
    correct_index: Optional[int] = None  # legacy: index into options
    time: int = 30
    image: Optional[str] = None

    @field_validator("options")
    @classmethod
    def _options_clean(cls, v: List[str]) -> List[str]:
        v = [o.strip() for o in v]
        if any(not o for o in v):
            raise ValueError("options must not be empty")
        if len(set(v)) != len(v):
            raise ValueError("options must be unique")
        return v

    @model_validator(mode="after")
    def _resolve_correct(self):
        if not self.correct and self.correct_index is not None and 0 <= self.correct_index < len(self.options):
            self.correct = self.options[self.correct_index]
        self.correct = self.correct.strip()
        if self.correct not in self.options:
            raise ValueError(f"question {self.id}: the correct answer must be one of the options")
        return self

class ExamData(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    questions: List[QuestionData] = Field(min_length=1)

    @model_validator(mode="after")
    def _unique_ids(self):
        ids = [q.id for q in self.questions]
        if len(set(ids)) != len(ids):
            raise ValueError("question ids must be unique")
        return self

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
    email: Optional[str] = None
    group: str
    score: int
    is_online: bool
    has_answered: bool = False
    answers_count: int = 0       # Number of questions answered
    assigned_count: int = 0      # Questions assigned to this specific student

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
