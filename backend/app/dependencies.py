from fastapi import Depends, HTTPException, Header, WebSocket
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import User
from app.firebase_auth import verify_firebase_token
from typing import Optional

async def get_token_from_websocket(websocket: WebSocket) -> str:
    token = websocket.query_params.get("token")
    if token:
        return token

    authorization = websocket.headers.get("Authorization") or websocket.headers.get("authorization")
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing WebSocket authorization token")

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid WebSocket authorization header format. Use: Bearer <token>")

    return parts[1]

async def get_current_user_websocket(websocket: WebSocket, db: Session):
    token = await get_token_from_websocket(websocket)

    if token.startswith("otp_"):
        email_din_token = token[4:]
        user = db.query(User).filter_by(email=email_din_token).first()
        if not user:
            raise HTTPException(status_code=404, detail="User nu a fost găsit în baza de date")
        return user

    firebase_user = verify_firebase_token(token)
    if not firebase_user:
        raise HTTPException(status_code=401, detail="Token invalid or expired")

    user = db.query(User).filter_by(firebase_uid=firebase_user['uid']).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_token_from_header(authorization: Optional[str] = Header(None)) -> str:
    """Extrage token din Authorization header (Bearer token)"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid Authorization header format. Use: Bearer <token>")
    
    return parts[1]

def get_current_user(token: str = Depends(get_token_from_header), db: Session = Depends(get_db)):
    """Verifică token-ul și returnează user-ul curent"""
    
    # 1. SCURTĂTURA PENTRU TOKEN-URILE OTP (Email)
    if token.startswith("otp_"):
        # Token-ul nostru arată așa: "otp_ionela@gmail.com", deci tăiem primele 4 caractere ca să aflăm email-ul
        email_din_token = token[4:] 
        user = db.query(User).filter_by(email=email_din_token).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="User nu a fost găsit în baza de date")
        return user

    # 2. FLUXUL NORMAL PENTRU GOOGLE FIREBASE
    firebase_user = verify_firebase_token(token)
    if not firebase_user:
        raise HTTPException(status_code=401, detail="Token invalid or expired")
    
    user = db.query(User).filter_by(firebase_uid=firebase_user['uid']).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user