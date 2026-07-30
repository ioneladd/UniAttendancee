from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks # <--- AM ADĂUGAT BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.firebase_auth import verify_firebase_token
from app.models import User
from app.dependencies import get_db, get_current_user
from datetime import datetime, timedelta
from app.email_utils import generate_otp, send_otp_email
from app.ws_manager import manager

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    token: str

class LoginResponse(BaseModel):
    message: str
    user: dict

def determine_role(email: str) -> str:
    if email.lower() == 'uniattendancee@gmail.com':
        return 'admin'
    domain = email.split('@')[-1].lower()
    if domain == 'student.usv.ro':
        return 'student'
    elif domain in ['usm.ro', 'usv.ro', 'eed.usv.ro']:
        return 'professor'
    else:
        return 'pending'

# --- RUTA 1: Logarea cu Google (Firebase) ---
@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)): # <--- ADĂUGAT background_tasks
    firebase_user = verify_firebase_token(request.token)
    
    if not firebase_user:
        raise HTTPException(status_code=401, detail="Token invalid sau expirat")
    
    user = db.query(User).filter_by(firebase_uid=firebase_user['uid']).first()
    
    if user and user.role == 'rejected':
        raise HTTPException(status_code=403, detail="Acces interzis. Acest cont a fost respins de administrator.")
    
    if not user:
        new_role = determine_role(firebase_user['email'])
        user = User(
            firebase_uid=firebase_user['uid'],
            email=firebase_user['email'],
            name=firebase_user['name'],
            role=new_role 
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"✅ User nou creat via Google: {user.email} cu rolul: {new_role}")

        # --- REPARAT AICI: Trimitem pe WebSocket prin BackgroundTasks ---
        user_info = {"id": user.id, "name": user.name, "email": user.email, "role": user.role}
        background_tasks.add_task(manager.broadcast_new_user, user_info)
        
    else:
        print(f"✅ User existent găsit via Google: {user.email} (Rol: {user.role})")
    
    return {
        "message": "Login successful",
        "user": {
            "id": user.id,
            "uid": user.firebase_uid,
            "email": user.email,
            "name": user.name,
            "role": user.role
        }
    }


class OTPRequest(BaseModel):
    email: str

class OTPVerify(BaseModel):
    email: str
    otp_code: str

# --- RUTA 2: Cererea codului (OTP) ---
@router.post("/request-otp")
def request_otp(data: OTPRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)): # <--- ADĂUGAT background_tasks
    email = data.email.lower()
    user = db.query(User).filter(User.email == email).first()
    
    if user and user.role == 'rejected':
        raise HTTPException(status_code=403, detail="Acces interzis. Acest cont a fost respins de administrator.")
    
    if not user:
        new_role = determine_role(email)
        user = User(
            email=email, 
            firebase_uid=f"otp_{email}", 
            role=new_role 
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"✅ User nou creat via OTP: {email} cu rolul: {new_role}")

        # --- REPARAT AICI: Trimitem pe WebSocket prin BackgroundTasks ---
        user_info = {"id": user.id, "name": user.name, "email": user.email, "role": user.role}
        background_tasks.add_task(manager.broadcast_new_user, user_info)

    otp = generate_otp()
    user.otp_code = otp
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    success = send_otp_email(email, otp)
    if not success:
        raise HTTPException(status_code=500, detail="Eroare la trimiterea email-ului.")
        
    return {"message": "Codul a fost trimis cu succes!"}


# --- RUTA 3: Verificarea codului (OTP) ---
@router.post("/verify-otp")
def verify_otp(data: OTPVerify, db: Session = Depends(get_db)):
    email = data.email.lower()
    user = db.query(User).filter(User.email == email).first()
    
    if user and user.role == 'rejected':
        raise HTTPException(status_code=403, detail="Acces interzis. Acest cont a fost respins de administrator.")
        
    if not user or user.otp_code != data.otp_code:
        raise HTTPException(status_code=400, detail="Cod invalid sau email incorect.")
        
    if user.otp_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Codul a expirat. Solicită altul.")
        
    user.otp_code = None
    user.otp_expires_at = None
    db.commit()
    
    return {
        "access_token": f"otp_{user.email}",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "name": user.name
        }
    }

# --- RUTA 4: Verificare Tăcută a Rolului (Silent Check) ---
@router.get("/check-status")
def check_status(email: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilizatorul nu există")

    if current_user.role != 'admin' and current_user.email.lower() != email.lower():
        raise HTTPException(status_code=403, detail="Nu aveți permisiunea să verificați acest utilizator")

    return {"role": user.role}