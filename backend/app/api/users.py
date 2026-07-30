from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.models import User
from app.dependencies import get_db, get_current_user
from app.ws_manager import manager, user_manager
# Definim router-ul (atenție, prefixul este deja /api/users)
router = APIRouter(prefix="/api/users", tags=["Users Management"])

class RoleUpdateRequest(BaseModel):
    role: str

# 1. Ruta pentru a aduce toți utilizatorii în tabel
@router.get("/")
def get_all_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Numai adminii pot vedea lista de utilizatori")

    users = db.query(User).all()
    # Returnăm doar datele necesare pentru tabel, fără tokenuri sau parole
    return [{"id": u.id, "name": u.name, "email": u.email, "role": u.role} for u in users]

# 2. Ruta prin care adminul schimbă rolul
@router.put("/{user_id}/role")
async def update_user_role(user_id: int, request: RoleUpdateRequest, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Numai adminii pot schimba rolurile")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilizatorul nu a fost găsit")

    # Adminul nu poate modifica rolul unui alt admin sau al unui cont instituțional
    if user.role == 'admin':
        raise HTTPException(status_code=403, detail="Rolurile adminilor nu pot fi modificate")

    domain = user.email.split('@')[-1].lower()
    if domain not in ['gmail.com', 'yahoo.com'] and user.email != 'uniattendancee@gmail.com':
        raise HTTPException(status_code=403, detail="Conturile oficiale nu pot fi modificate.")

    user.role = request.role
    db.commit()

    background_tasks.add_task(user_manager.broadcast, user_id, {"type": "ROLE_UPDATED", "role": request.role})
    return {"message": "Rol actualizat cu succes"}

class NameUpdateRequest(BaseModel):
    name: str

# Ruta prin care utilizatorul își setează numele la prima conectare
@router.put("/{user_id}/name")
def update_user_name(user_id: int, request: NameUpdateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.id != user_id and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Nu aveți permisiunea să modificați acest nume")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilizatorul nu a fost găsit")

    user.name = request.name
    db.commit()
    return {"message": "Nume actualizat cu succes", "name": user.name}
