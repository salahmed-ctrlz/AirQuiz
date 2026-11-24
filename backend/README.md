# AirQuiz backend

FastAPI + python-socketio + SQLAlchemy (SQLite). It also serves the built web app from `../dist`, so one process on one port is the whole product.

```bash
pip install -r requirements.txt
python run.py          # prints the student URL, QR code and teacher password
pytest                 # needs requirements-dev.txt
```

## Configuration (environment variables)

| Variable | Default | |
|---|---|---|
| `ADMIN_PASSWORD` | generated | otherwise stored in `<data>/admin_password.txt` |
| `AIRQUIZ_DATA_DIR` | `./data` (`AirQuizData/` next to the exe) | database, exams, password, signing key |
| `BACKEND_PORT` | `8000` | next free port is used if busy |
| `DEFAULT_ROOM_CAPACITY` | `300` | per room, adjustable by the teacher |
| `ANSWER_GRACE_SECONDS` | `3` | latency allowance after the timer ends |
| `CORS_ORIGINS` | `*` | |
| `AIRQUIZ_ALLOW_TEST_USER` | off | dev only: `TEST`/`TEST` joins any room |

## REST (admin routes need `Authorization: Bearer <token>` from `POST /api/admin/login`)

| | |
|---|---|
| `POST /api/admin/login` | `{password}` → `{token}` (throttled) |
| `GET /api/health`, `GET /api/qr.svg?data=` | public |
| `GET /api/server-info` | LAN addresses students can use |
| `GET/POST /api/metadata` | institution / subject / year (POST is admin) |
| `POST /api/exam/load` | validate + save + load an exam |
| `GET/DELETE /api/exams[/{file}]` | exam library |
| `GET /admin/export_csv?room_id=&token=` | results CSV |
| `DELETE /api/room/reset` | wipe all sessions |

## Socket.IO

Student → server: `join`, `submit_answer`.
Admin → server (after `admin_auth {token}`): `join_room_admin`, `admin_start_exam`, `admin_end_exam`, `admin_extend_exam`, `admin_resume_exam`, `admin_reveal_results`, `admin_reset_room`.
Server → student: `JOINED`, `START_EXAM`, `answer_acknowledged`, `answer_rejected`, `exam_ended`, `exam_extended`, `FULL_RESULTS`, `ROOM_RESET`, `error`.
Server → admin: `admin_ok`, `room_info`, `dashboard_update` (sent only to the room's admin channel).

## Layout

`main.py` HTTP + static files · `manager.py` rooms, broadcasts, timer loop · `handlers/` socket events · `services/` exam files, per-student exam factory, CSV · `auth.py` · `run.py` entry point.
