from sqlalchemy import Float,Column, Integer, String, DateTime, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
import secrets
import uuid
import string
class User(Base):
    """
    Tabelul Users - Studenți și Profesori
    """
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    firebase_uid = Column(String(128), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(255))
    role = Column(String(20), default="student")  # "student" sau "professor"
    created_at = Column(DateTime, default=datetime.utcnow)
    otp_code = Column(String(6), nullable=True) # Aici salvăm codul de 6 cifre
    otp_expires_at = Column(DateTime, nullable=True) # Aici salvăm ora la care expiră codul
    # Relații
    courses_taught = relationship("Course", back_populates="professor")
    enrollments = relationship("Enrollment", back_populates="student")
    attendance_records = relationship("Attendance", back_populates="student")
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"


class Course(Base):
    """
    Tabelul Courses - Cursuri și Evenimente
    """
    __tablename__ = "courses"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50))  # Ex: "INFO301"
    
    # Tipul cursului
    course_type = Column(String(20), default="recurring")  # "recurring" sau "event"
    
    # Cod de înscriere (doar pentru recurring)
    enrollment_code = Column(String(20), unique=True, nullable=True, index=True)
    
    # Setare: permite non-enrolled să scaneze? (doar pentru recurring)
    allow_non_enrolled = Column(Boolean, default=True)
    
    professor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    year = Column(Integer, nullable=False)  # NULL pentru events
    semester = Column(Integer, nullable=False)  # NULL pentru events
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relații
    professor = relationship("User", back_populates="courses_taught")
    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")
    attendance_records = relationship("Attendance", back_populates="course", cascade="all, delete-orphan")
    sessions = relationship("AttendanceSession", back_populates="course", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Course(id={self.id}, name={self.name}, type={self.course_type})>"
    
    @staticmethod
    def generate_enrollment_code():
        """Generează cod unic de înscriere de 5 caractere (ex: 8F3K9)"""
        # Definim ce caractere avem voie să folosim (A-Z și 0-9)
        alphabet = string.ascii_uppercase + string.digits
        
        # Alegem 5 caractere la întâmplare
        return ''.join(secrets.choice(alphabet) for _ in range(5))

class Enrollment(Base):
    """
    Tabelul Enrollments - Studenți înscriși la cursuri
    """
    __tablename__ = "enrollments"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    enrolled_at = Column(DateTime, default=datetime.utcnow)
    
    # Relații
    student = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")
    
    # Constraint: Un student nu se poate înscrie de 2 ori la același curs
    __table_args__ = (
        UniqueConstraint('student_id', 'course_id', name='unique_enrollment'),
    )
    
    def __repr__(self):
        return f"<Enrollment(student_id={self.student_id}, course_id={self.course_id})>"


class Attendance(Base):
    """
    Tabelul Attendance - Prezențe (Scanări QR)
    """
    __tablename__ = "attendance"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # MODIFICAT: Acum este nullable=True, deci putem avea prezențe FĂRĂ cont de utilizator
    student_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # NOU: Coloană pentru a salva numele introdus manual de vizitator
    guest_name = Column(String(255), nullable=True)
    
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    
    # Legătura cu sesiunea specifică
    session_id = Column(Integer, ForeignKey("attendance_sessions.id"), nullable=False)
    
    timestamp = Column(DateTime, default=datetime.utcnow)
    is_enrolled = Column(Boolean, default=False)
    fingerprint_hash = Column(String(255))
    browser_uuid = Column(String(255))
    is_flagged = Column(Boolean, default=False)
    flag_reason = Column(String(500))
    notes = Column(String(500), nullable=True)
    bonus_points = Column(Float, default=0.0)
    
    # Relații
    student = relationship("User", back_populates="attendance_records")
    course = relationship("Course", back_populates="attendance_records")
    session = relationship("AttendanceSession", back_populates="attendances")
class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id = Column(Integer, primary_key=True, index=True)
    # MODIFICARE 2: Adaugă ondelete="CASCADE"
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    # Token-ul unic care va fi criptat în codul QR (ex: un UUID)
    session_token = Column(String(255), unique=True, nullable=False, index=True)
    
    # Când a fost deschisă sesiunea (data din UI)
    scheduled_for = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Dacă sesiunea mai este activă (profesorul a lăsat QR-ul pe ecran) sau a fost închisă
    is_active = Column(Boolean, default=True)
    
    # Relații
    course = relationship("Course", back_populates="sessions")
    
    # Legăm prezențele individuale de această sesiune
    attendances = relationship("Attendance", back_populates="session", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<AttendanceSession(id={self.id}, course_id={self.course_id}, active={self.is_active})>"

    @staticmethod
    def generate_token():
        """Generează un UUID unic pentru a fi transformat în QR."""
        return str(uuid.uuid4())