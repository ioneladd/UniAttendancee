import uuid
import unicodedata
import re
from datetime import datetime
from sqlalchemy import func 
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models import Enrollment 
from app.database import SessionLocal
from app.models import Course, User, AttendanceSession, Attendance
from app.schemas import SessionCreateRequest, SessionResponse, ManualAttendee, NoteUpdate, ScanRequest, GuestConfirmRequest, GuestReserveRequest
from app.dependencies import get_db, get_current_user, get_current_user_websocket
from fastapi import WebSocket, WebSocketDisconnect
from app.ws_manager import GroupConnectionManager

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])

def normalize_name_list(name: str):
    """
    Curăță numele și returnează o listă SORTATĂ cu cuvintele din el.
    'Ionela Dică' și 'Dica Ionela' devin ambele ['dica', 'ionela'].
    """
    if not name:
        return []
    n = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode('utf-8')
    n = re.sub(r'[^a-zA-Z0-9\s]', ' ', n)
    cuvinte = n.lower().split()
    return sorted(cuvinte)

# --- MANAGER WEBSOCKETS ---
manager = GroupConnectionManager()

# --- RUTA PENTRU TUNELUL LIVE ---
@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: int, db: Session = Depends(get_db)):
    try:
        current_user = await get_current_user_websocket(websocket, db)
    except HTTPException as exc:
        await websocket.close(code=1008, reason=exc.detail)
        return

    session_db = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session_db:
        await websocket.close(code=1008, reason='Session not found')
        return

    if current_user.role != 'admin':
        if current_user.role == 'professor' and session_db.course.professor_id == current_user.id:
            pass
        elif current_user.role == 'student':
            enrollment = db.query(Enrollment).filter_by(course_id=session_db.course_id, student_id=current_user.id).first()
            if not enrollment:
                await websocket.close(code=1008, reason='Unauthorized')
                return
        else:
            await websocket.close(code=1008, reason='Unauthorized')
            return

    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)

@router.post("/create", response_model=SessionResponse)
def create_session(
    request: SessionCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user.role != "professor":
        raise HTTPException(status_code=403, detail="Doar profesorii pot iniția sesiuni")

    course = db.query(Course).get(request.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Cursul nu există")
    
    if course.professor_id != user.id:
        raise HTTPException(status_code=403, detail="Acest curs nu îți aparține")

    active_sessions = db.query(AttendanceSession).filter_by(
        course_id=course.id, 
        is_active=True
    ).all()
    for s in active_sessions:
        s.is_active = False
    
    new_token = AttendanceSession.generate_token()
    
    new_session = AttendanceSession(
        course_id=course.id,
        session_token=new_token,
        scheduled_for=request.scheduled_for,
        is_active=True
    )
    
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return {
        "session_id": new_session.id,
        "session_token": new_session.session_token,
        "course_name": course.name,
        "created_at": new_session.created_at
    }

@router.post("/{session_id}/rotate")
async def rotate_session_token(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session_db = db.query(AttendanceSession).get(session_id)
    if not session_db:
        raise HTTPException(status_code=404, detail="Sesiunea nu există")
        
    if session_db.course.professor_id != user.id:
        raise HTTPException(status_code=403, detail="Nu ai permisiunea să modifici această sesiune")
        
    if not session_db.is_active:
        await manager.broadcast(session_id, {"type": "SESSION_CLOSED"})
        raise HTTPException(status_code=400, detail="Sesiunea a fost închisă")

    new_token = AttendanceSession.generate_token()
    session_db.session_token = new_token
    db.commit()
    
    return {"new_token": new_token}


@router.get("/course/{course_id}")
def get_course_sessions(
    course_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id, Course.professor_id == user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Cursul nu a fost găsit sau nu ai acces.")

    sessions = db.query(
        AttendanceSession,
        func.count(Attendance.id).label('attendees_count')
    ).outerjoin(
        Attendance, Attendance.session_id == AttendanceSession.id
    ).filter(
        AttendanceSession.course_id == course_id
    ).group_by(
        AttendanceSession.id
    ).order_by(desc(AttendanceSession.scheduled_for)).all()

    result = []
    for s, count in sessions:
        result.append({
            "id": s.id,
            "scheduled_for": s.scheduled_for,
            "is_active": s.is_active,
            "attendees_count": count
        })
        
    return result

@router.post("/{session_id}/close")
async def close_session(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sesiunea nu a fost găsită")

    if session.course.professor_id != user.id:
        raise HTTPException(status_code=403, detail="Nu ai permisiunea să închizi această sesiune")
        
    session.is_active = False
    db.commit()
    await manager.broadcast(session_id, {"type": "SESSION_CLOSED"})
    
    return {"message": "Sesiunea a fost închisă cu succes"}

@router.post("/{session_id}/reopen")
def reopen_session(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session_db = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session_db:
        raise HTTPException(status_code=404, detail="Sesiunea nu a fost găsită")
        
    if session_db.course.professor_id != user.id:
        raise HTTPException(status_code=403, detail="Nu poți modifica o sesiune care nu îți aparține")
        
    if session_db.is_active:
        raise HTTPException(status_code=400, detail="Sesiunea este deja deschisă!")

    session_db.is_active = True
    session_db.session_token = AttendanceSession.generate_token()
    #session_db.created_at = datetime.utcnow()
    #session_db.scheduled_for = datetime.utcnow()
    db.commit()
    
    return {"message": "Sesiunea a fost redeschisă cu succes!"}

@router.get("/{session_id}")
async def get_session_details(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sesiunea nu a fost găsită")

    if session.course.professor_id != user.id:
        raise HTTPException(status_code=403, detail="Nu ai permisiunea să vezi detaliile acestei sesiuni")
        
    course = db.query(Course).filter(Course.id == session.course_id).first()
    
    return {
        "id": session.id,
        "course_id": session.course_id,
        "course_name": course.name if course else "Curs",
        "course_type": course.course_type if course else "recurring",
        "scheduled_for": session.scheduled_for,
        "is_active": session.is_active,
        "session_token": session.session_token
    }

@router.get("/{session_id}/attendees")
def get_session_attendees(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session_obj = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Sesiunea nu a fost găsită")

    if session_obj.course.professor_id != user.id:
        raise HTTPException(status_code=403, detail="Nu ai permisiunea să vezi participanții acestei sesiuni")

    prezente = db.query(Attendance).filter(Attendance.session_id == session_id).all()
    
    rezultat = []
    for p in prezente:
        student = None
        if p.student_id:
            student = db.query(User).filter(User.id == p.student_id).first()
        
        nume_afisat = student.name if student else p.guest_name
        
        rezultat.append({
            "attendance_id": p.id,
            "name": nume_afisat,
            "scanned_at": p.timestamp.isoformat(),
            "notes": p.notes,
            "bonus_points": p.bonus_points,
            "is_guest": p.student_id is None 
        })
            
    rezultat.sort(key=lambda x: x["scanned_at"], reverse=True)
    return rezultat

@router.post("/{session_id}/attendees/manual")
async def add_manual_attendee(
    session_id: int, 
    attendee: ManualAttendee,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        session_obj = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
        if not session_obj:
            raise HTTPException(status_code=404, detail="Sesiunea nu a fost găsită")

        if session_obj.course.professor_id != user.id:
            raise HTTPException(status_code=403, detail="Nu ai permisiunea să adaugi o prezență manuală")
            
        nume_tastat = attendee.name.strip()
        cuvinte_tastate = normalize_name_list(nume_tastat) 
        
        prezente_existente = db.query(Attendance).filter(Attendance.session_id == session_id).all()
        
        for p in prezente_existente:
            if p.student_id and p.student:
                nume_in_db = p.student.name
            else:
                nume_in_db = p.guest_name
            
            if nume_in_db and normalize_name_list(nume_in_db) == cuvinte_tastate:
                raise HTTPException(status_code=400, detail=f"'{nume_tastat}' (sau o variantă similară) este deja marcat ca prezent!")

        toti_utilizatorii = db.query(User).filter(User.role != 'guest').all()
        student_gasit = None
        
        for u in toti_utilizatorii:
            if u.name and normalize_name_list(u.name) == cuvinte_tastate:
                student_gasit = u
                break
        
        noua_prezenta = Attendance(
            session_id=session_obj.id,
            course_id=session_obj.course_id,
            timestamp=datetime.utcnow(),
            is_flagged=False,
            notes="Adăugat manual de profesor"
        )

        if student_gasit:
            noua_prezenta.student_id = student_gasit.id
            noua_prezenta.is_enrolled = True 
        else:
            noua_prezenta.student_id = None
            noua_prezenta.guest_name = nume_tastat
            noua_prezenta.is_enrolled = False
        
        db.add(noua_prezenta)
        db.commit()
        await manager.broadcast(session_id, {"type": "UPDATE"})
        
        return {
            "message": "Student adăugat cu succes", 
            "name": nume_tastat,
            "attendance_id": noua_prezenta.id,
            "scanned_at": noua_prezenta.timestamp.isoformat()
        }
        
    except HTTPException as http_e:
        raise http_e
    except Exception as e_general:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Eroare Server: {str(e_general)}")

@router.delete("/{session_id}")
def delete_session(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sesiunea nu a fost găsită")

    if session.course.professor_id != user.id:
        raise HTTPException(status_code=403, detail="Nu ai permisiunea să ștergi această sesiune")
        
    db.delete(session)
    db.commit()
    return {"message": "Sesiunea a fost ștearsă cu succes"}

@router.delete("/{session_id}/attendees/{student_name}")
async def delete_attendee(
    session_id: int,
    student_name: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cuvinte_cautate = normalize_name_list(student_name)
    
    prezente = db.query(Attendance).filter(Attendance.session_id == session_id).all()
    prezenta_de_sters = None
    
    for p in prezente:
        if p.student_id and p.student:
            nume_db = p.student.name
        else:
            nume_db = p.guest_name
            
        if nume_db and normalize_name_list(nume_db) == cuvinte_cautate:
            prezenta_de_sters = p
            break

    if not prezenta_de_sters:
        raise HTTPException(status_code=404, detail="Prezența nu a fost găsită pentru această sesiune.")

    if prezenta_de_sters.session.course.professor_id != user.id:
        raise HTTPException(status_code=403, detail="Nu ai permisiunea să ștergi această prezență")

    try:
        db.delete(prezenta_de_sters)
        db.commit()
        await manager.broadcast(session_id, {"type": "UPDATE"})
        return {"message": "Prezența a fost ștearsă cu succes."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Eroare la ștergerea din DB: {str(e)}")

@router.patch("/{session_id}/attendees/{student_name}/notes")
def update_attendee_notes(
    session_id: int,
    student_name: str,
    note_data: NoteUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cuvinte_cautate = normalize_name_list(student_name)
    
    prezente = db.query(Attendance).filter(Attendance.session_id == session_id).all()
    prezenta_de_editat = None
    
    for p in prezente:
        if p.student_id and p.student:
            nume_db = p.student.name
        else:
            nume_db = p.guest_name
            
        if nume_db and normalize_name_list(nume_db) == cuvinte_cautate:
            prezenta_de_editat = p
            break

    if not prezenta_de_editat:
        raise HTTPException(status_code=404, detail="Prezența nu a fost găsită pentru acest nume.")

    if prezenta_de_editat.session.course.professor_id != user.id:
        raise HTTPException(status_code=403, detail="Nu ai permisiunea să editezi observațiile acestei prezențe")

    prezenta_de_editat.notes = note_data.notes
    db.commit()

    return {"message": "Observații salvate", "notes": prezenta_de_editat.notes}

@router.post("/scan")
async def scan_qr_code(
    request: ScanRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Studentul trimite token-ul citit din QR pentru a-și marca prezența."""
    
    session_db = db.query(AttendanceSession).filter(AttendanceSession.session_token == request.session_token).first()
    
    if not session_db:
        raise HTTPException(status_code=404, detail="Cod QR invalid sau expirat. Roagă profesorul să afișeze codul curent.")

    if not session_db.is_active:
        raise HTTPException(status_code=400, detail="Această sesiune a fost deja închisă de profesor.")

    # Verificăm dacă studentul a marcat deja prezența azi
    prezenta_existenta = db.query(Attendance).filter(
        Attendance.session_id == session_db.id,
        Attendance.student_id == user.id
    ).first()
    
    if prezenta_existenta:
        raise HTTPException(status_code=400, detail="Prezența ta este deja înregistrată pentru această sesiune!")

    curs_curent = session_db.course
    is_enrolled = False
    
    enrollment = db.query(Enrollment).filter(
        Enrollment.course_id == curs_curent.id,
        Enrollment.student_id == user.id
    ).first()
    
    if enrollment:
        is_enrolled = True

    if curs_curent.course_type == "recurring" and not is_enrolled and not curs_curent.allow_non_enrolled:
        raise HTTPException(
            status_code=403, 
            detail="Nu poți scana prezența. Nu ești înscris la acest curs și profesorul nu a permis scanarea liberă."
        )

    noua_prezenta = Attendance(
        student_id=user.id,
        course_id=curs_curent.id,
        session_id=session_db.id,
        timestamp=datetime.utcnow(),
        is_enrolled=is_enrolled,
        is_flagged=False
    )
    
    db.add(noua_prezenta)
    db.commit()
    await manager.broadcast(session_db.id, {"type": "UPDATE"})
    return {
        "message": "Prezență înregistrată cu succes!",
        "course_name": curs_curent.name
    }

@router.get("/course/{course_id}/my-attendance")
def get_my_attendance(
    course_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returnează istoricul de prezențe al unui student pentru un anumit curs."""
    
    sessions = db.query(AttendanceSession).filter(
        AttendanceSession.course_id == course_id
    ).order_by(desc(AttendanceSession.scheduled_for)).all()
    
    my_attendances = db.query(Attendance).filter(
        Attendance.course_id == course_id, 
        Attendance.student_id == user.id
    ).all()
    
    attended_session_ids = {a.session_id: a.timestamp for a in my_attendances}
    
    result = []
    for s in sessions:
        is_present = s.id in attended_session_ids
        result.append({
            "session_id": s.id,
            "scheduled_for": s.scheduled_for,
            "status": "Prezent" if is_present else "Absent",
            "scanned_at": attended_session_ids.get(s.id) 
        })
        
    return result

@router.patch("/attendance/{attendance_id}/bonus")
def update_bonus_points(
    attendance_id: int,
    points: float,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user.role != "professor":
        raise HTTPException(status_code=403, detail="Acces interzis")

    record = db.query(Attendance).get(attendance_id)
    if not record:
        raise HTTPException(status_code=404, detail="Înregistrarea nu există")

    if record.session.course.professor_id != user.id:
        raise HTTPException(status_code=403, detail="Nu ai permisiunea să actualizezi această bonificație")
    
    record.bonus_points = points
    db.commit()
    return {"message": "Bonificație actualizată", "new_points": points}

@router.post("/guest-reserve")
def reserve_guest_attendance(data: GuestReserveRequest, db: Session = Depends(get_db)):
    session = db.query(AttendanceSession).filter(
        AttendanceSession.session_token == data.session_token,
        AttendanceSession.is_active == True
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Cod QR invalid sau deja expirat. Rescanează!")

    course = db.query(Course).filter(Course.id == session.course_id).first()

    if not course.allow_non_enrolled:
        raise HTTPException(
            status_code=403,
            detail="Profesorul nu a permis vizitatorilor să își înregistreze prezența la acest curs."
        )
    
    new_attendance = Attendance(
        session_id=session.id,
        course_id=course.id,
        guest_name="[În completare...]", 
        student_id=None,
        timestamp=datetime.utcnow(),
        is_enrolled=False
    )

    db.add(new_attendance)
    db.commit()
    db.refresh(new_attendance) 

    return {"attendance_id": new_attendance.id, "message": "Loc rezervat."}

@router.put("/guest-confirm/{attendance_id}")
async def confirm_guest_attendance(attendance_id: int, data: GuestConfirmRequest, db: Session = Depends(get_db)):
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    
    if not attendance:
        raise HTTPException(status_code=404, detail="Rezervarea a fost pierdută. Te rugăm să rescanezi codul.")

    nume_curat = data.guest_name.strip()

    duplicat = db.query(Attendance).filter(
        Attendance.session_id == attendance.session_id,
        func.lower(Attendance.guest_name) == nume_curat.lower(),
        Attendance.id != attendance_id 
    ).first()

    if duplicat:
        raise HTTPException(
            status_code=400, 
            detail="Acest nume este deja pe listă! Dacă sunteți persoane diferite, adaugă și inițiala tatălui."
        )

    attendance.guest_name = nume_curat
    db.commit()
    await manager.broadcast(attendance.session_id, {"type": "UPDATE"})

    return {"message": "Prezență salvată cu succes!"}