from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# --- COURSES ---
class CourseCreate(BaseModel):
    name: str
    code: Optional[str] = None
    course_type: str = "recurring"
    allow_non_enrolled: bool = True
    year: int
    semester: int

class CourseUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    year: Optional[int] = None
    semester: Optional[int] = None
    allow_non_enrolled: bool

class CourseResponse(BaseModel):
    id: int
    name: str
    code: Optional[str]
    course_type: str
    enrollment_code: Optional[str]
    allow_non_enrolled: bool
    professor_id: int
    professor_name: str
    year: Optional[int]
    semester: Optional[int]
    created_at: datetime
    
    class Config:
        from_attributes = True

class JoinCourseRequest(BaseModel):
    enrollment_code: str

# --- SESSIONS ---
class SessionCreateRequest(BaseModel):
    course_id: int
    scheduled_for: datetime

class SessionResponse(BaseModel):
    session_id: int
    session_token: str
    course_name: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class ManualAttendee(BaseModel):
    name: str

class NoteUpdate(BaseModel):
    notes: str
class ScanRequest(BaseModel):
    session_token: str
class GuestReserveRequest(BaseModel):
    session_token: str

class GuestConfirmRequest(BaseModel):
    guest_name: str 