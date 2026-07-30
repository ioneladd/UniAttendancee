from fastapi import WebSocket
from typing import Dict, List

class GroupConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, group_id: int):
        await websocket.accept()
        if group_id not in self.active_connections:
            self.active_connections[group_id] = []
        self.active_connections[group_id].append(websocket)

    def disconnect(self, websocket: WebSocket, group_id: int):
        if group_id in self.active_connections:
            self.active_connections[group_id].remove(websocket)
            if not self.active_connections[group_id]:
                del self.active_connections[group_id]

    async def broadcast(self, group_id: int, message: dict):
        for connection in list(self.active_connections.get(group_id, [])):
            try:
                await connection.send_json(message)
            except Exception:
                pass

class AdminConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_new_user(self, user_data: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json({"type": "NEW_USER", "user": user_data})
            except Exception:
                pass

manager = AdminConnectionManager()
user_manager = GroupConnectionManager()
