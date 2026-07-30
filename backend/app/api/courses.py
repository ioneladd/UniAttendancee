from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
import math
from app.database import SessionLocal
from app.models import Course, User, Enrollment, Attendance, AttendanceSession
from app.schemas import CourseCreate, CourseResponse, CourseUpdate, JoinCourseRequest
from app.dependencies import get_db, get_current_user, get_current_user_websocket
from sqlalchemy.orm import joinedload
from app.ws_manager import GroupConnectionManager

router = APIRouter(prefix="/api/courses", tags=["Courses"])

course_manager = GroupConnectionManager()

@router.websocket("/ws/{course_id}")
async def websocket_course_endpoint(websocket: WebSocket, course_id: int, db: Session = Depends(get_db)):
    try:
        current_user = await get_current_user_websocket(websocket, db)
    except HTTPException as exc:
        await websocket.close(code=1008, reason=exc.detail)
        return

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        await websocket.close(code=1008, reason='Course not found')
        return

    if current_user.role != 'admin':
        if current_user.role == 'professor' and course.professor_id == current_user.id:
            pass
        elif current_user.role == 'student':
            enrollment = db.query(Enrollment).filter_by(course_id=course.id, student_id=current_user.id).first()
            if not enrollment:
                await websocket.close(code=1008, reason='Unauthorized')
                return
        else:
            await websocket.close(code=1008, reason='Unauthorized')
            return

    await course_manager.connect(websocket, course_id)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        course_manager.disconnect(websocket, course_id)

@router.post("/create", response_model=CourseResponse)
def create_course(
    course_data: CourseCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user.role != "professor":
        raise HTTPException(status_code=403, detail="Doar profesorii pot crea cursuri")
    
    new_course = Course(
        name=course_data.name,
        code=course_data.code,
        course_type=course_data.course_type,
        allow_non_enrolled=course_data.allow_non_enrolled,
        professor_id=user.id,
        year=course_data.year,
        semester=course_data.semester
    )
    
    if course_data.course_type == "recurring":
        new_course.enrollment_code = Course.generate_enrollment_code()
    
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    
    return {
        "id": new_course.id,
        "name": new_course.name,
        "code": new_course.code,
        "course_type": new_course.course_type,
        "enrollment_code": new_course.enrollment_code,
        "allow_non_enrolled": new_course.allow_non_enrolled,
        "professor_id": new_course.professor_id,
        "professor_name": user.name,
        "year": new_course.year,
        "semester": new_course.semester,
        "created_at": new_course.created_at
    }

    # Creăm o funcție mică separată care va rula pe fundal
async def notify_course_update(course_id: int):
    await course_manager.broadcast(course_id, {"type": "ENROLLMENT_UPDATE"})

@router.post("/join")
def join_course( # <-- Observă că AM SCOS async de aici. Acum e o funcție normală
    request: JoinCourseRequest,
    background_tasks: BackgroundTasks, # <-- Injectăm managerul de fundal
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter_by(enrollment_code=request.enrollment_code).first()
    if not course:
        raise HTTPException(status_code=404, detail="Cod invalid. Cursul nu există.")
    
    if course.course_type != "recurring":
        raise HTTPException(status_code=400, detail="Acest curs nu necesită înscriere")
    
    existing_enrollment = db.query(Enrollment).filter_by(
        student_id=user.id,
        course_id=course.id
    ).first()
    
    if existing_enrollment:
        raise HTTPException(status_code=400, detail="Ești deja înscris la acest curs")
    
    enrollment = Enrollment(student_id=user.id, course_id=course.id)
    db.add(enrollment)
    db.commit()
    
    # Adăugăm notificarea pe fundal! 
    # FastAPI o va executa asincron după ce răspunde studentului
    background_tasks.add_task(notify_course_update, course.id)
    
    return {
        "message": "Te-ai înscris cu succes!",
        "course": {
            "id": course.id,
            "name": course.name,
            "professor_name": course.professor.name
        }
    }

@router.get("/my-courses", response_model=List[CourseResponse])
def get_my_courses(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user.role == "professor":
        courses = db.query(Course).filter_by(professor_id=user.id).all()
    else:
        enrollments = db.query(Enrollment).filter_by(student_id=user.id).all()
        courses = [enrollment.course for enrollment in enrollments]
    
    result = []
    for course in courses:
        result.append({
            "id": course.id,
            "name": course.name,
            "code": course.code,
            "course_type": course.course_type,
            "enrollment_code": course.enrollment_code,
            "allow_non_enrolled": course.allow_non_enrolled,
            "professor_id": course.professor_id,
            "professor_name": course.professor.name,
            "year": course.year,
            "semester": course.semester,
            "created_at": course.created_at
        })
    
    return result

@router.get("/{course_id}/attendance")
def get_course_attendance(
    course_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Cursul nu există")
    
    if course.professor_id != user.id:
        raise HTTPException(status_code=403, detail="Nu ai permisiunea să vezi prezențele")
    
    attendances = db.query(Attendance).filter_by(course_id=course_id).all()
    
    enrolled_students = []
    auditors = []
    
    for att in attendances:
        student_data = {
            "id": att.student.id,
            "name": att.student.name,
            "email": att.student.email,
            "timestamp": att.timestamp,
            "is_flagged": att.is_flagged,
            "flag_reason": att.flag_reason
        }
        
        if att.is_enrolled:
            enrolled_students.append(student_data)
        else:
            auditors.append(student_data)
    
    total_enrolled = 0
    absent_students = []
    
    if course.course_type == "recurring":
        enrollments = db.query(Enrollment).filter_by(course_id=course_id).all()
        total_enrolled = len(enrollments)
        
        present_ids = {att.student_id for att in attendances if att.is_enrolled}
        for enrollment in enrollments:
            if enrollment.student_id not in present_ids:
                absent_students.append({
                    "id": enrollment.student.id,
                    "name": enrollment.student.name,
                    "email": enrollment.student.email
                })
    
    return {
        "course": {"id": course.id, "name": course.name, "type": course.course_type},
        "stats": {
            "total_enrolled": total_enrolled,
            "present_enrolled": len(enrolled_students),
            "auditors": len(auditors)
        },
        "enrolled_present": enrolled_students,
        "absent": absent_students,
        "auditors": auditors
    }

@router.get("/{course_id}/students")
def get_enrolled_students(
    course_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Cursul nu a fost găsit.")

    if course.professor_id != user.id:
        raise HTTPException(status_code=403, detail="Nu ai acces la acest curs.")

    students = (
        db.query(User)
        .join(Enrollment, User.id == Enrollment.student_id)
        .filter(Enrollment.course_id == course_id)
        .all()
    )

    return [{"id": student.id, "name": student.name, "email": student.email} for student in students]

@router.put("/{course_id}")
def update_course(
    course_id: int, 
    course_data: CourseUpdate, 
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id, Course.professor_id == user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Cursul nu a fost găsit sau nu ai permisiunea să îl editezi.")
    
    if course_data.name is not None: course.name = course_data.name
    if course_data.code is not None: course.code = course_data.code
    if course_data.year is not None: course.year = course_data.year
    if course_data.semester is not None: course.semester = course_data.semester
    course.allow_non_enrolled = course_data.allow_non_enrolled
    db.commit()
    return {"message": "Curs actualizat cu succes"}

@router.delete("/{course_id}")
@router.delete("/{course_id}")
def delete_course(course_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id, Course.professor_id == user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Cursul nu a fost găsit.")
    
    # SQLAlchemy va șterge AUTOMAT toate Enrollments, Sessions și Attendances
    # legate de acest curs, datorită acelui cascade="all, delete-orphan" din models.py!
    db.delete(course)
    db.commit()
    
    return {"message": "Cursul a fost șters definitiv"}
@router.delete("/{course_id}/students/{student_id}")
def remove_student_from_course(
    course_id: int, 
    student_id: int, 
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course or course.professor_id != user.id:
        raise HTTPException(status_code=403, detail="Acțiune nepermisă.")

    enrollment = db.query(Enrollment).filter(
        Enrollment.course_id == course_id, 
        Enrollment.student_id == student_id
    ).first()

    if not enrollment:
        raise HTTPException(status_code=404, detail="Studentul nu este înrolat la acest curs.")

    db.delete(enrollment)
    db.commit()

    return {"message": "Studentul a fost eliminat cu succes din curs."}

@router.get("/stats/my-summary")
def get_my_statistics(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # ==========================================
    # LOGICA PENTRU PROFESOR
    # ==========================================
    if user.role == "professor":
        courses = db.query(Course).options(
            joinedload(Course.enrollments),
            joinedload(Course.attendance_records),
            joinedload(Course.sessions)
        ).filter(Course.professor_id == user.id).all()
        
        # Metricile noastre clare
        total_enrolled_students = set()
        students_who_attended = set()
        total_guests = set()
        
        course_stats_list = []
        global_present = 0
        global_expected = 0
        
        for course in courses:
            for enrollment in course.enrollments: 
                total_enrolled_students.add(enrollment.student_id)
                
            for att in course.attendance_records:
                if att.student_id: 
                    students_who_attended.add(att.student_id)
                elif att.guest_name: 
                    total_guests.add(f"{course.id}_{att.guest_name.lower()}")
            
            # ─────────────────────────────────────────────────────────────────
# ÎNLOCUIEȘTE blocul `if course.course_type == "recurring":` din
# funcția get_my_statistics (view profesor) cu codul de mai jos.
# ─────────────────────────────────────────────────────────────────

            if course.course_type == "recurring":
                sessions_count = len(course.sessions)
                enrolled_count = len(course.enrollments)
                enrolled_student_ids = {e.student_id for e in course.enrollments}
                present_enrolled_count = len([
                    a for a in course.attendance_records 
                    if a.student_id in enrolled_student_ids
                ])
                total_attendances = len(course.attendance_records)  # înscriși + guests

                if course.allow_non_enrolled:
                    # Curs deschis → bara plină, afișăm media participanților pe sesiune
                    avg_per_session = round(total_attendances / sessions_count, 1) if sessions_count > 0 else 0

                    # Contribuim la media globală doar cu prezenții înscriși
                    global_expected += sessions_count * enrolled_count if enrolled_count > 0 else sessions_count
                    global_present += present_enrolled_count

                    course_stats_list.append({
                        "name": course.name,
                        "attendance": 100,              # bara plină vizual
                        "allow_non_enrolled": True,
                        "type": "recurring",
                        "avg_per_session": avg_per_session,
                        "total_sessions": sessions_count,
                        "total_attendances": total_attendances,
                    })

                else:
                    expected_for_course = enrolled_count * sessions_count

                    if expected_for_course > 0:
                        perc = min(round((present_enrolled_count / expected_for_course) * 100), 100)
                        global_expected += expected_for_course
                        global_present += present_enrolled_count
                    else:
                        perc = 0
                        # Nu contribuie la media globală

                    course_stats_list.append({
                        "name": course.name,
                        "attendance": perc,
                        "allow_non_enrolled": False,
                        "type": "recurring",
                        "avg_per_session": None,
                        "total_sessions": sessions_count,
                        "total_attendances": present_enrolled_count,
                    })
        # Procentul global (doar din cursurile recurente valide)
        global_perc = min(round((global_present / global_expected) * 100), 100) if global_expected > 0 else 0
            
        return {
            "role": "professor",
            "summary": {
                "totalCourses": len(courses), 
                "totalEnrolled": len(total_enrolled_students),
                "activeStudents": len(students_who_attended),
                "totalGuests": len(total_guests),
                "averageAttendance": global_perc
            },
            "courseStats": course_stats_list
        }

    # ==========================================
    # LOGICA PENTRU STUDENT
    # ==========================================
    elif user.role == "student":
        enrollments = db.query(Enrollment).filter(Enrollment.student_id == user.id).all()
        attendances = db.query(Attendance).filter(Attendance.student_id == user.id).all()
        
        all_course_ids = set([e.course_id for e in enrollments] + [a.course_id for a in attendances])
        
        courses = db.query(Course).options(
            joinedload(Course.sessions),
            joinedload(Course.attendance_records)
        ).filter(Course.id.in_(all_course_ids)).all()
        
        course_stats_list = []
        global_present = global_expected = 0
        
        for course in courses:
            sessions_count = len(course.sessions)
            present_count = len([a for a in course.attendance_records if a.student_id == user.id])
            
            if sessions_count > 0:
                perc = min(round((present_count / sessions_count) * 100), 100)
            else:
                perc = 100 if present_count > 0 else 0
                
            needed_for_50 = max(0, sessions_count - 2 * present_count)
            global_expected += sessions_count
            global_present += present_count
            
            course_stats_list.append({
                "id": course.id,
                "name": course.name,
                "type": course.course_type,
                "attendance": perc,
                "present": present_count,
                "total": sessions_count,
                "neededFor50": needed_for_50
            })
            
        if global_expected > 0:
            global_perc = min(round((global_present / global_expected) * 100), 100)
        else:
            global_perc = 100 if global_present > 0 else 0
        
        return {
            "role": "student",
            "summary": {
                "totalCourses": len(courses), 
                "totalPresent": global_present, 
                "averageAttendance": global_perc
            },
            "courseStats": course_stats_list
        }
@router.get("/my-guest-courses")
def get_my_guest_courses(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returnează cursurile/evenimentele la care studentul a scanat codul QR, 
    dar NU este înrolat oficial.
    """
    if user.role != "student":
        return []

    # 1. Găsim cursurile la care are prezențe
    attendances = db.query(Attendance).filter(Attendance.student_id == user.id).all()
    attended_course_ids = {a.course_id for a in attendances}

    # 2. Găsim cursurile la care este înrolat oficial
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == user.id).all()
    enrolled_course_ids = {e.course_id for e in enrollments}

    # 3. Diferența dintre ele (A fost prezent, dar nu e înrolat)
    guest_course_ids = attended_course_ids - enrolled_course_ids

    if not guest_course_ids:
        return []

    # 4. Extragem datele cursurilor
    guest_courses = db.query(Course).filter(Course.id.in_(guest_course_ids)).all()

    # Le formatăm la fel ca pe cursurile normale pentru a le afișa pe aceleași carduri
    result = []
    for course in guest_courses:
        result.append({
            "id": course.id,
            "name": course.name,
            "code": course.code,
            "course_type": course.course_type,
            "professor_name": course.professor.name if course.professor else "Necunoscut",
            "year": course.year,
            "semester": course.semester,
        })
        
    return result