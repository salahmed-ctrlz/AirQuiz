"""Room management WebSocket handlers: get_rooms, join_room_admin."""


def register(manager, db_session_factory):
    sio = manager.sio

    @sio.event
    async def get_rooms(sid):
        await sio.emit('rooms_list', manager.get_active_rooms(), room=sid)

    @sio.event
    async def join_room_admin(sid, data):
        """Admin joins a room to monitor its dashboard."""
        input_room = data.get('room_id', '').strip()
        if not input_room:
            return

        room_id = input_room.lower().replace(' ', '-')
        room = manager.get_room(room_id)

        await sio.enter_room(sid, room_id)
        print(f"Admin {sid} monitoring room {room_id} (Code: {room.code})")

        await sio.emit('room_info', {'room_id': room_id, 'code': room.code}, room=sid)

        db = db_session_factory()
        try:
            await manager.broadcast_dashboard_update(db, room_id)
        finally:
            db.close()

        await manager.broadcast_room_list()
