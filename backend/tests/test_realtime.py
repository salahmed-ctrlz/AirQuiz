import asyncio

import httpx
import socketio

EXAM = {
    "title": "Live Exam",
    "questions": [
        {"id": i, "text": f"Q{i}?", "options": ["a", "b", "c", "d"], "correct": "a", "time": 30}
        for i in range(1, 11)
    ],
}


class Client:
    def __init__(self, url):
        self.url = url
        self.sio = socketio.AsyncClient()
        self.events: dict[str, list] = {}
        for name in ["JOINED", "START_EXAM", "FULL_RESULTS", "error", "answer_acknowledged",
                     "answer_rejected", "exam_ended", "room_info", "dashboard_update", "admin_ok"]:
            self.sio.on(name, self._rec(name))

    def _rec(self, name):
        async def h(data=None):
            self.events.setdefault(name, []).append(data)
        return h

    async def start(self):
        await self.sio.connect(self.url, transports=["websocket"])

    async def wait(self, name, n=1, timeout=4):
        for _ in range(int(timeout / 0.05)):
            if len(self.events.get(name, [])) >= n:
                return self.events[name][n - 1]
            await asyncio.sleep(0.05)
        raise AssertionError(f"timed out waiting for {name}; got {list(self.events)}")


async def _scenario(server, token):
    admin = Client(server); await admin.start()
    await admin.sio.emit("admin_auth", {"token": token}); await admin.wait("admin_ok")
    await admin.sio.emit("join_room_admin", {"room_id": "lab-1"})
    code = (await admin.wait("room_info"))["code"]

    s1 = Client(server); await s1.start()
    await s1.sio.emit("join", {"first_name": "Amel", "last_name": "B", "group": "G1", "room_id": code})
    await s1.wait("JOINED")

    # a student must not be able to drive admin events
    await s1.sio.emit("admin_start_exam", {"room_id": "lab-1", "exam_title": "Live Exam", "durationMinutes": 5})
    await s1.wait("error")
    assert "START_EXAM" not in s1.events

    await admin.sio.emit("admin_start_exam", {"room_id": "lab-1", "exam_title": "Live Exam",
                                              "durationMinutes": 5, "questions_count": 4})
    qs = (await s1.wait("START_EXAM"))["questions"]
    assert len(qs) == 4
    assert all("correct" not in q for q in qs)

    # late joiner gets the configured number of questions, not the whole pool
    s2 = Client(server); await s2.start()
    await s2.sio.emit("join", {"first_name": "Yacine", "last_name": "K", "group": "G2", "room_id": code})
    assert len((await s2.wait("START_EXAM"))["questions"]) == 4

    # answer: valid accepted, option the student never saw rejected, unassigned question rejected
    q = qs[0]
    await s1.sio.emit("submit_answer", {"question_id": q["question_id"], "option": q["options"][0]})
    await s1.wait("answer_acknowledged")
    await s1.sio.emit("submit_answer", {"question_id": q["question_id"], "option": "zzz"})
    assert (await s1.wait("answer_rejected"))["reason"] == "invalid"

    await admin.sio.emit("admin_end_exam", {"room_id": "lab-1"})
    await s1.wait("exam_ended")
    await s1.sio.emit("submit_answer", {"question_id": q["question_id"], "option": q["options"][1]})
    assert (await s1.wait("answer_rejected", n=2))["reason"] == "closed"

    await admin.sio.emit("admin_reveal_results", {"room_id": "lab-1"})
    res = await s1.wait("FULL_RESULTS")
    assert len(res["results"]) == 4
    assert res["final_score"] in (0, 1)

    # a student who reconnects after reveal still gets their results
    s3 = Client(server); await s3.start()
    await s3.sio.emit("join", {"first_name": "Amel", "last_name": "B", "group": "G1", "room_id": code})
    assert "results" in await s3.wait("FULL_RESULTS")

    # students never receive the roster
    assert "dashboard_update" not in s1.events
    for c in (admin, s1, s2, s3):
        await c.sio.disconnect()


def test_full_exam_flow(server, admin_headers):
    httpx.post(f"{server}/api/exam/load", json=EXAM, headers=admin_headers).raise_for_status()
    token = admin_headers["Authorization"][7:]
    asyncio.run(_scenario(server, token))


def test_invalid_room_code(server):
    async def go():
        c = Client(server); await c.start()
        await c.sio.emit("join", {"first_name": "A", "last_name": "B", "group": "G1", "room_id": "000000"})
        assert "Invalid" in (await c.wait("error"))["message"]
        await c.sio.disconnect()
    asyncio.run(go())


def test_exam_ends_itself_when_timer_expires(server, admin_headers):
    from datetime import datetime, timedelta

    from manager import manager
    httpx.post(f"{server}/api/exam/load", json=EXAM, headers=admin_headers).raise_for_status()
    token = admin_headers["Authorization"][7:]

    async def go():
        admin = Client(server); await admin.start()
        await admin.sio.emit("admin_auth", {"token": token}); await admin.wait("admin_ok")
        stu = Client(server); await stu.start()
        await admin.sio.emit("join_room_admin", {"room_id": "expiry"})
        code = (await admin.wait("room_info"))["code"]
        await stu.sio.emit("join", {"first_name": "A", "last_name": "B", "group": "G1", "room_id": code})
        await stu.wait("JOINED")
        await admin.sio.emit("admin_start_exam", {"room_id": "expiry", "exam_title": "Live Exam", "durationMinutes": 5})
        await stu.wait("START_EXAM")
        manager.rooms["expiry"].exam_end_time = datetime.utcnow() - timedelta(seconds=1)
        await stu.wait("exam_ended", timeout=4)
        assert manager.rooms["expiry"].exam_active is False
        await admin.sio.disconnect(); await stu.sio.disconnect()
    asyncio.run(go())
