from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base

class GroupEnum(str, enum.Enum):
    G1 = "G1"
    G2 = "G2"
    G3 = "G3"
    G4 = "G4"
    G5 = "G5"

class Metadata(Base):
    """Key-value store for room metadata"""
    __tablename__ = "metadata"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(String, nullable=False)

class Student(Base):
    """Student information and connection status"""
    __tablename__ = "students"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    group = Column(SQLEnum(GroupEnum), nullable=False)
    score = Column(Integer, default=0)
    is_online = Column(Boolean, default=False)
    last_active = Column(DateTime, default=datetime.utcnow)
    room_id = Column(String, default="default", index=True) # New: Room isolation
    
    # Relationship to responses
    responses = relationship("Response", back_populates="student")

class Question(Base):
    """Quiz questions loaded from JSON"""
    __tablename__ = "questions"
    
    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, nullable=False)  # ID from JSON
    text = Column(String, nullable=False)
    options = Column(JSON, nullable=False)  # Array of options
    correct_answer = Column(String, nullable=False)
    time_limit = Column(Integer, default=30)
    image_url = Column(String, nullable=True)
    exam_title = Column(String, nullable=True)  # Which exam this belongs to
    
    # Relationship to responses
    responses = relationship("Response", back_populates="question")

class Response(Base):
    """Student answers to questions"""
    __tablename__ = "responses"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    selected_option = Column(String, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    answered_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    student = relationship("Student", back_populates="responses")
    question = relationship("Question", back_populates="responses")
