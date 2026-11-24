"""Room management WebSocket handlers: admin auth, room list, admin joins a room."""

import auth


def register(manager, db_session_factory):
    sio = manager.sio

    @sio.event
    async def admin_auth(sid, data):
        """Promote this socket to admin if it presents a valid token."""
        if auth.verify_token((data or {}).get("token")):
            manager.admin_sids.add(sid)
            await sio.emit("admin_ok", room=sid)
        else:
            manager.admin_sids.discard(sid)
            await sio.emit("admin_denied", {"message": "Admin session expired. Please log in again."}, room=sid)

    @sio.event
    async def get_rooms(sid):
        await sio.emit("rooms_list", manager.get_active_rooms(), room=sid)

    @sio.event
    async def join_room_admin(sid, data):
        if not manager.is_admin(sid):
            return
        input_room = (data or {}).get("room_id", "").strip()
        if not input_room:
            return

        room_id = input_room.lower().replace(" ", "-")
        room = manager.get_room(room_id)

        await sio.enter_room(sid, manager.admin_channel(room_id))
        await sio.emit("room_info", {
            "room_id": room_id, "code": room.code,
            "exam_active": room.exam_active, "time_remaining": room.seconds_remaining(),
            "exam_title": room.current_exam_title,
        }, room=sid)

        db = db_session_factory()
        try:
            await manager.broadcast_dashboard_update(db, room_id)
        finally:
            db.close()
        await manager.broadcast_room_list()
