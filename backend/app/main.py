from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException # <--- CORECTAT AICI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
from app.database import engine, Base
from app import models
from app.api import auth, courses, sessions, users
from app.dependencies import get_current_user_websocket, get_db
from app.ws_manager import manager, user_manager
from app.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)
    print("✅ Database connected successfully!")
    yield
    # Shutdown

app = FastAPI(title="Attendance System", lifespan=lifespan)

cors_origins = [origin.strip() for origin in settings.cors_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Backend is running"}

@app.websocket("/ws/admin")
async def admin_websocket(websocket: WebSocket, db: Session = Depends(get_db)):
    try:
        current_user = await get_current_user_websocket(websocket, db)
    except HTTPException as exc:
        await websocket.close(code=1008, reason=exc.detail)
        return

    if current_user.role != 'admin':
        await websocket.close(code=1008, reason='Unauthorized')
        return

    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.websocket("/ws/user/{user_id}")
async def user_websocket(websocket: WebSocket, user_id: int, db: Session = Depends(get_db)):
    try:
        current_user = await get_current_user_websocket(websocket, db)
    except HTTPException as exc:
        await websocket.close(code=1008, reason=exc.detail)
        return

    if current_user.id != user_id and current_user.role != 'admin':
        await websocket.close(code=1008, reason='Unauthorized')
        return

    await user_manager.connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        user_manager.disconnect(websocket, user_id)

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# Import și înregistrare router auth
from app.api.auth import router as auth_router
app.include_router(auth_router)

# Import și înregistrare router courses
from app.api.courses import router as courses_router
app.include_router(courses_router)

from app.api.sessions import router as sessions_router 
app.include_router(sessions_router)

app.include_router(users.router)