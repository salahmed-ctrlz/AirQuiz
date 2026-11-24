#!/usr/bin/env python3
"""
Simulate a classroom: N phones join one room, take a 30-question exam and answer
at human speed. Reports latency and what the host and the network have to carry.

    python scripts/loadtest.py --students 300 --questions 30

Starts its own throw-away server (temp data dir) unless --url is given.
Requires: pip install -r backend/requirements-dev.txt psutil
"""

import argparse
import asyncio
import json
import os
import random
import statistics
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import httpx
import psutil
import socketio

ROOT = Path(__file__).resolve().parent.parent


def pct(values, p):
    if not values:
        return 0.0
    values = sorted(values)
    return values[min(len(values) - 1, int(len(values) * p))]


class Phone:
    def __init__(self, url, idx, code, stats):
        self.url, self.idx, self.code, self.stats = url, idx, code, stats
        self.sio = socketio.AsyncClient(reconnection=False)
        self.questions = []
        self.start_evt = asyncio.Event()
        self.pending = {}
        self.sio.on("START_EXAM", self._start)
        self.sio.on("answer_acknowledged", self._ack)
        self.sio.on("JOINED", self._joined)
        self.sio.on("error", self._error)
        self.joined = asyncio.Event()
        self.rx = 0

    async def _error(self, data):
        print(f"phone {self.idx} error: {data}")

    async def _joined(self, data):
        self.joined.set()

    async def _start(self, data):
        self.rx += len(json.dumps(data))
        self.questions = data["questions"]
        self.start_evt.set()

    async def _ack(self, data):
        t0 = self.pending.pop(data["question_id"], None)
        if t0:
            self.stats["ack"].append(time.perf_counter() - t0)

    async def join(self):
        t0 = time.perf_counter()
        await self.sio.connect(self.url, transports=["websocket"])
        await self.sio.emit("join", {"first_name": f"S{self.idx}", "last_name": "Load", "group": "G1", "room_id": self.code})
        await asyncio.wait_for(self.joined.wait(), 60)
        self.stats["join"].append(time.perf_counter() - t0)

    async def take_exam(self, think):
        await asyncio.wait_for(self.start_evt.wait(), 120)
        for q in self.questions:
            await asyncio.sleep(random.uniform(*think))
            self.pending[q["question_id"]] = time.perf_counter()
            await self.sio.emit("submit_answer", {"question_id": q["question_id"], "option": random.choice(q["options"])})
        await asyncio.sleep(2)
        await self.sio.disconnect()


async def main(args):
    proc = None
    url = args.url
    if not url:
        tmp = tempfile.mkdtemp(prefix="airquiz-load-")
        import socket
        with socket.socket() as sk:
            sk.bind(("127.0.0.1", 0))
            port = sk.getsockname()[1]
        env = {**os.environ, "AIRQUIZ_DATA_DIR": tmp, "ADMIN_PASSWORD": "load", "BACKEND_PORT": str(port),
               "NO_PROXY": "127.0.0.1,localhost"}
        proc = subprocess.Popen([sys.executable, str(ROOT / "backend" / "run.py"), "--no-browser"],
                                env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        url = f"http://127.0.0.1:{port}"
        for _ in range(100):
            try:
                if httpx.get(url + "/api/health", timeout=2).status_code == 200:
                    break
            except httpx.HTTPError:
                time.sleep(0.2)
    ps = psutil.Process(proc.pid) if proc else None

    tok = httpx.post(f"{url}/api/admin/login", json={"password": args.password}).json()["token"]
    hdr = {"Authorization": f"Bearer {tok}"}
    exam = {"title": "Load", "questions": [
        {"id": i, "text": f"Question {i}: " + "lorem ipsum " * 8, "options": [f"Option {c} " + "x" * 20 for c in "ABCD"],
         "correct": f"Option A {'x' * 20}"} for i in range(1, args.questions + 1)]}
    httpx.post(f"{url}/api/exam/load", json=exam, headers=hdr).raise_for_status()

    admin = socketio.AsyncClient()
    dash = {"n": 0, "bytes": 0, "max": 0}
    info = asyncio.get_event_loop().create_future()

    async def on_dash(d):
        size = len(json.dumps(d))
        dash["n"] += 1
        dash["bytes"] += size
        dash["max"] = max(dash["max"], size)

    async def on_info(d):
        if not info.done():
            info.set_result(d)

    admin.on("dashboard_update", on_dash)
    admin.on("room_info", on_info)
    await admin.connect(url, transports=["websocket"])
    await admin.emit("admin_auth", {"token": tok})
    await asyncio.sleep(0.3)
    await admin.emit("join_room_admin", {"room_id": "load"})
    code = (await info)["code"]

    stats = {"join": [], "ack": []}
    phones = [Phone(url, i, code, stats) for i in range(args.students)]
    cpu_samples, rss = [], 0

    async def sampler():
        nonlocal rss
        while True:
            if ps:
                cpu_samples.append(ps.cpu_percent(interval=None))
                rss = max(rss, ps.memory_info().rss)
            await asyncio.sleep(1)

    samp = asyncio.create_task(sampler())

    t0 = time.perf_counter()
    sem = asyncio.Semaphore(args.join_rate)

    async def joiner(p):
        async with sem:
            await p.join()

    await asyncio.gather(*(joiner(p) for p in phones))
    print(f"{args.students} students joined in {time.perf_counter() - t0:.1f}s")

    await admin.emit("admin_start_exam", {"room_id": "load", "exam_title": "Load", "durationMinutes": 30})
    exam_t0 = time.perf_counter()
    await asyncio.gather(*(p.take_exam((args.think_min, args.think_max)) for p in phones))
    wall = time.perf_counter() - exam_t0
    samp.cancel()

    rx = statistics.mean(p.rx for p in phones)
    print(f"\n=== {args.students} students x {args.questions} questions, think {args.think_min}-{args.think_max}s ===")
    print(f"join latency   p50 {pct(stats['join'], .5)*1000:.0f} ms   p95 {pct(stats['join'], .95)*1000:.0f} ms   max {max(stats['join'])*1000:.0f} ms")
    print(f"answer ack     p50 {pct(stats['ack'], .5)*1000:.0f} ms   p95 {pct(stats['ack'], .95)*1000:.0f} ms   max {max(stats['ack'])*1000:.0f} ms   "
          f"({len(stats['ack'])}/{args.students * args.questions} acked)")
    print(f"START_EXAM payload per phone: {rx/1024:.1f} KB  (one-off, x{args.students} = {rx*args.students/1e6:.1f} MB burst)")
    print(f"dashboard updates to teacher: {dash['n']} in {wall:.0f}s ({dash['n']/wall:.1f}/s), "
          f"avg {dash['bytes']/max(1,dash['n'])/1024:.1f} KB, max {dash['max']/1024:.1f} KB, total {dash['bytes']/1e6:.1f} MB")
    if ps:
        print(f"server CPU     avg {statistics.mean(cpu_samples):.0f}%  peak {max(cpu_samples):.0f}%   RSS peak {rss/1e6:.0f} MB")
        proc.terminate()
    await admin.disconnect()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--students", type=int, default=300)
    ap.add_argument("--questions", type=int, default=30)
    ap.add_argument("--think-min", type=float, default=1.0)
    ap.add_argument("--think-max", type=float, default=6.0)
    ap.add_argument("--join-rate", type=int, default=50, help="max simultaneous joins")
    ap.add_argument("--url")
    ap.add_argument("--password", default="load")
    asyncio.run(main(ap.parse_args()))
