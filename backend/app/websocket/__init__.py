
from socketio import AsyncServer, ASGIApp
from socketio.exceptions import ConnectionRefusedError
import json
from datetime import datetime
import logging

from app.schemas import WebSocketMessage

logger = logging.getLogger(__name__)

# Create Socket.IO server with CORS
sio = AsyncServer(
    async_mode='asgi', 
    cors_allowed_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000", 
        "http://127.0.0.1:8000"
    ]
)
socket_app = ASGIApp(sio)

# Store connected clients
connected_clients = {}

@sio.event
async def connect(sid, environ):
    """Handle client connection - Allow all connections for now"""
    try:
        connected_clients[sid] = {
            'connected_at': datetime.utcnow(),
            'user_agent': environ.get('HTTP_USER_AGENT', 'Unknown'),
            'remote_addr': environ.get('REMOTE_ADDR', 'Unknown')
        }
        logger.info(f"✅ WebSocket client connected: {sid}")
        await sio.emit('connected', {'message': 'Connected to server', 'sid': sid}, room=sid)
    except Exception as e:
        logger.error(f"Connection failed: {e}")
        # Don't raise ConnectionRefusedError for now to allow connections

@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    if sid in connected_clients:
        del connected_clients[sid]
    logger.info(f"WebSocket client disconnected: {sid}")

@sio.event
async def join_room(sid, data):
    """Join a specific room (e.g., for chemical updates)"""
    room = data.get('room')
    if room:
        sio.enter_room(sid, room)
        await sio.emit('room_joined', {'room': room}, room=sid)
        logger.info(f"Client {sid} joined room: {room}")

@sio.event
async def leave_room(sid, data):
    """Leave a specific room"""
    room = data.get('room')
    if room:
        sio.leave_room(sid, room)
        await sio.emit('room_left', {'room': room}, room=sid)
        logger.info(f"Client {sid} left room: {room}")

@sio.event
async def subscribe_to_updates(sid, data):
    """Subscribe to specific update types"""
    update_types = data.get('types', [])
    for update_type in update_types:
        sio.enter_room(sid, f"updates_{update_type}")
    await sio.emit('subscribed', {'types': update_types}, room=sid)

# Utility functions to broadcast messages
async def broadcast_chemical_update(chemical_data: dict):
    """Broadcast chemical update to all clients"""
    try:
        message = WebSocketMessage(
            type='chemical_updated',
            data=chemical_data,
            timestamp=datetime.utcnow()
        )
        await sio.emit('chemical_update', message.dict(), room='updates_chemicals')
        logger.info(f"Broadcast chemical update: {chemical_data.get('id', 'unknown')}")
    except Exception as e:
        logger.error(f"Error broadcasting chemical update: {e}")

async def broadcast_stock_adjustment(adjustment_data: dict):
    """Broadcast stock adjustment to all clients"""
    try:
        message = WebSocketMessage(
            type='stock_adjusted',
            data=adjustment_data,
            timestamp=datetime.utcnow()
        )
        await sio.emit('stock_adjustment', message.dict(), room='updates_stock')
        logger.info(f"Broadcast stock adjustment: {adjustment_data.get('chemical_id', 'unknown')}")
    except Exception as e:
        logger.error(f"Error broadcasting stock adjustment: {e}")

async def broadcast_new_chemical(chemical_data: dict):
    """Broadcast new chemical to all clients"""
    try:
        message = WebSocketMessage(
            type='chemical_created',
            data=chemical_data,
            timestamp=datetime.utcnow()
        )
        await sio.emit('chemical_created', message.dict(), room='updates_chemicals')
        logger.info(f"Broadcast new chemical: {chemical_data.get('name', 'unknown')}")
    except Exception as e:
        logger.error(f"Error broadcasting new chemical: {e}")

async def broadcast_location_update(location_data: dict):
    """Broadcast location update to all clients"""
    try:
        message = WebSocketMessage(
            type='location_updated',
            data=location_data,
            timestamp=datetime.utcnow()
        )
        await sio.emit('location_update', message.dict(), room='updates_locations')
        logger.info(f"Broadcast location update: {location_data.get('id', 'unknown')}")
    except Exception as e:
        logger.error(f"Error broadcasting location update: {e}")

async def broadcast_low_stock_alert(alert_data: dict):
    """Broadcast low stock alert to all clients"""
    try:
        message = WebSocketMessage(
            type='low_stock_alert',
            data=alert_data,
            timestamp=datetime.utcnow()
        )
        await sio.emit('low_stock_alert', message.dict(), room='updates_alerts')
        logger.info(f"Broadcast low stock alert: {alert_data.get('chemical_name', 'unknown')}")
    except Exception as e:
        logger.error(f"Error broadcasting low stock alert: {e}")

# Health check endpoint for WebSocket
@sio.event
async def ping(sid, data):
    """Handle ping from client"""
    await sio.emit('pong', {'timestamp': datetime.utcnow().isoformat()}, room=sid)

# Export
__all__ = ['sio', 'socket_app', 'broadcast_chemical_update', 'broadcast_stock_adjustment', 
           'broadcast_new_chemical', 'broadcast_location_update', 'broadcast_low_stock_alert']