# AirQuiz 🎓

> Real-time, offline-first classroom quiz platform. No internet required.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue)](https://www.python.org/)
[![React 18](https://img.shields.io/badge/react-18-61dafb)](https://react.dev/)

AirQuiz turns a single laptop into a quiz server. Teachers run live exams over a local Wi-Fi network, students join from their phones by scanning a QR code, and results appear in real time. No cloud services, no accounts, no internet needed.

Built to solve a real problem: grading paper exams for 180+ students by hand. Now deployed weekly across multiple university labs as part of Algeria's "Zero Paper" initiative.

## What it does

- **Runs fully offline** on any local network (dedicated router, campus Wi-Fi, hotspot)
- **Real-time quiz delivery** via WebSocket (Socket.IO)
- **QR code join** so students can connect in seconds from any phone
- **Multi-room support** for running several quizzes at once
- **Live dashboard** showing who's connected, who's answered, scores as they come in
- **Auto-reconnect** with session recovery if a student loses connection mid-exam
- **CSV export** with full Arabic/UTF-8 support
- **Bilingual UI** (English / Arabic) with proper RTL layout
- **Dark/Light mode** toggle

## Quick start

### One command

```bash
# Windows
start.bat

# macOS / Linux
./start.sh
```

The launcher finds Python, sets up a venv, installs dependencies, starts both servers, and prints a QR code for students to scan.

### Manual setup

```bash
# Backend (Terminal 1)
cd backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:sio_app --host 0.0.0.0 --port 8000

# Frontend (Terminal 2)
npm install
npm run dev -- --host
```

**URLs:**

| Address | What |
|---|---|
| `http://localhost:5173` | Landing page |
| `http://localhost:5173/admin` | Teacher login |
| `http://localhost:5173/student` | Student join |
| `http://localhost:8000` | Backend API |

## How it works

```
Student Phone ──────┐
                     │  Socket.IO (WebSocket)
Student Phone ──────├──────────────────────► FastAPI + Socket.IO
                     │                            │
Teacher Browser ────┘                             ▼
                                            SQLite Database
```

1. Teacher creates a room and gets a 6-digit code
2. Students scan the QR or type in the code
3. Teacher hits "Start" and questions go out to everyone instantly
4. Answers stream back in real time, auto-graded on the server
5. Teacher reveals results, each student sees their own score + per-question analytics
6. Export everything to CSV for the gradebook

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Python, FastAPI, Socket.IO, SQLAlchemy |
| Database | SQLite (zero config, single file) |
| Real-time | Socket.IO (WebSocket with polling fallback) |

## Project layout

```
airquiz-classroom/
├── backend/
│   ├── handlers/          # WebSocket event handlers
│   │   ├── student.py     # join, submit_answer, disconnect
│   │   ├── admin.py       # start/end/reveal exam, reset room
│   │   └── rooms.py       # room management
│   ├── services/          # business logic (exam I/O, CSV export)
│   ├── config.py          # env-based configuration
│   ├── database.py        # SQLAlchemy setup
│   ├── main.py            # FastAPI app + REST endpoints
│   ├── manager.py         # core connection manager
│   ├── models.py          # DB models
│   └── schemas.py         # Pydantic schemas
├── src/                   # React frontend
│   ├── components/        # reusable UI (StudentCard, Footer, etc.)
│   ├── hooks/             # custom hooks (useSocket)
│   ├── i18n/              # translations (EN/AR) + language context
│   ├── lib/               # config, types, utilities
│   └── pages/             # route pages (Landing, Quiz, Dashboard...)
├── exams/                 # exam JSON files (drop yours here)
├── start.py               # cross-platform launcher
├── start.bat              # Windows shortcut
└── start.sh               # Unix shortcut
```

## Configuration

Copy `.env.example` to `.env` and set your values:

```env
VITE_ADMIN_PASSWORD=your-password-here
VITE_API_URL=http://localhost:8000
VITE_SOCKET_URL=http://localhost:8000
```

See [.env.example](.env.example) for the full list.

## Creating exams

Drop a JSON file in `exams/`:

```json
{
  "title": "My Quiz",
  "questions": [
    {
      "id": 1,
      "text": "What is 2 + 2?",
      "options": ["3", "4", "5", "6"],
      "correct": "4",
      "time": 30
    }
  ]
}
```

Or use the built-in Exam Builder from the admin dashboard.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and guidelines.

## License

MIT. See [LICENSE](LICENSE).

---

Built by [Salah Eddine Medkour](https://salahmed-ctrlz.github.io/salaheddine-medkour-portfolio/) · [GitHub](https://github.com/salahmed-ctrlz) · [LinkedIn](https://linkedin.com/in/salah-eddine-medkour)
