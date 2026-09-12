import json
import logging
from typing import Dict, List, Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # department_id -> list of active websockets
        self.department_connections: Dict[int, List[WebSocket]] = {}
        # admin websockets
        self.admin_connections: List[WebSocket] = []
        # citizen websockets: user_id -> list of websockets
        self.citizen_connections: Dict[int, List[WebSocket]] = {}

    async def connect_officer(self, websocket: WebSocket, department_id: int):
        await websocket.accept()
        if department_id not in self.department_connections:
            self.department_connections[department_id] = []
        self.department_connections[department_id].append(websocket)

    def disconnect_officer(self, websocket: WebSocket, department_id: int):
        if department_id in self.department_connections:
            if websocket in self.department_connections[department_id]:
                self.department_connections[department_id].remove(websocket)

    async def connect_admin(self, websocket: WebSocket):
        await websocket.accept()
        self.admin_connections.append(websocket)

    def disconnect_admin(self, websocket: WebSocket):
        if websocket in self.admin_connections:
            self.admin_connections.remove(websocket)

    async def connect_citizen(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.citizen_connections:
            self.citizen_connections[user_id] = []
        self.citizen_connections[user_id].append(websocket)

    def disconnect_citizen(self, websocket: WebSocket, user_id: int):
        if user_id in self.citizen_connections:
            if websocket in self.citizen_connections[user_id]:
                self.citizen_connections[user_id].remove(websocket)

    async def broadcast_to_department(self, department_id: int, message: Dict[str, Any]):
        payload = json.dumps(message)
        if department_id in self.department_connections:
            for connection in list(self.department_connections[department_id]):
                try:
                    await connection.send_text(payload)
                except Exception:
                    self.disconnect_officer(connection, department_id)

    async def broadcast_to_admin(self, message: Dict[str, Any]):
        payload = json.dumps(message)
        for connection in list(self.admin_connections):
            try:
                await connection.send_text(payload)
            except Exception:
                self.disconnect_admin(connection)

    async def broadcast_to_citizen(self, user_id: int, message: Dict[str, Any]):
        payload = json.dumps(message)
        if user_id in self.citizen_connections:
            for connection in list(self.citizen_connections[user_id]):
                try:
                    await connection.send_text(payload)
                except Exception:
                    self.disconnect_citizen(connection, user_id)

    async def broadcast_new_complaint(self, department_id: int, complaint_data: Dict[str, Any]):
        event = {
            "type": "NEW_COMPLAINT",
            "complaint": complaint_data
        }
        await self.broadcast_to_department(department_id, event)
        await self.broadcast_to_admin(event)

    async def broadcast_status_update(self, department_id: int, user_id: int, complaint_data: Dict[str, Any]):
        event = {
            "type": "STATUS_UPDATE",
            "complaint": complaint_data
        }
        await self.broadcast_to_department(department_id, event)
        await self.broadcast_to_admin(event)
        await self.broadcast_to_citizen(user_id, event)


ws_manager = ConnectionManager()
