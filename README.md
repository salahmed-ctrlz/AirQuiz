# AirQuiz

> Live classroom quizzes on a local network. Each student gets their own shuffled exam; nothing needs the internet.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue)](https://www.python.org/)
[![React 18](https://img.shields.io/badge/react-18-61dafb)](https://react.dev/)
[![CI](https://github.com/salahmed-ctrlz/AirQuiz/actions/workflows/ci.yml/badge.svg)](https://github.com/salahmed-ctrlz/AirQuiz/actions/workflows/ci.yml)

AirQuiz turns a single laptop into a high-performance quiz server. Teachers run live exams over a local Wi-Fi network, students join from their phones by scanning a QR code, and results appear in real time. **No cloud services, no accounts, no internet needed.**

Built to solve a universal teaching nightmare: grading paper exams for hundreds of students by hand. Deployed weekly across multiple university labs as part of Algeria's "Zero Paper" initiative.

## Features

- **Absolute Anti-Cheat (Per-Student Unicast)**: Unlike broadcast systems, AirQuiz generates a unique exam for *every* student. Even if they sit side-by-side, their question order and option order (A, B, C, D) are independently randomized.
- **Runs fully offline**: any local network works — a $20 router, campus Wi-Fi, or a laptop hotspot. Fonts and assets are bundled; the app shell is cached by a service worker so it reloads without a connection.
- **Never loses an answer**: answers are confirmed by the server one by one and retried until acknowledged, so a flickering Wi-Fi signal can't drop them.
- **Server-enforced rules**: the timer, the question set and the answer options are checked on the server; answers after time are rejected, and students cannot call teacher actions.
- **One click for teachers**: a single downloadable program (Windows / macOS / Linux) with a join QR code to project in class. See the [teacher guide](docs/TEACHER_GUIDE.md).
- **Real-time Synchronization**: Live updates via Socket.IO. Teachers see student progress as it happens.
- **Session Recovery**: If a student's phone dies or they close the browser, they can rejoin and find their exact randomized exam waiting for them, exactly where they left off.
- **Dynamic Progress Tracking**: Admin dashboard tracks progress based on each student's specific assigned question count.
- **Bilingual UI (EN/AR)**: Full support for English and Arabic with native RTL (Right-to-Left) layouts and local font optimization.
- **CSV Export**: Single-click export of all results, fully compatible with Excel/Google Sheets (UTF-8 support).

## Quick start

### For teachers: download and double-click
1. Open the [latest release](https://github.com/salahmed-ctrlz/AirQuiz/releases/latest) and download **AirQuiz-Setup.exe** (Windows; also available as a portable zip, plus macOS and Linux downloads).
2. Run it. No Python, no Node. The installer also opens the Windows Firewall for AirQuiz.
3. Start AirQuiz: a window shows the **address and QR code for students**, and the teacher page opens in your browser already signed in.
4. Everything (database, exams, password) is saved in an `AirQuizData` folder (Documents for the installed version). Copy it to back up or move to another computer.

> Windows may show a SmartScreen warning for unsigned programs: choose *More info → Run anyway*.

### From source (developers)
```bash
python start.py          # builds the web app on first run, then starts everything on port 8000
python start.py --dev    # hot-reload: Vite on 5173 + backend on 8000
python scripts/build_exe.py   # build a one-file executable for your OS
```
Requires Python 3.9+ and Node 18+. `start.bat` / `start.sh` are shortcuts for `start.py`.

### Manual setup
```bash
pip install -r backend/requirements.txt
npm install && npm run build
cd backend && python run.py
```

**URLs:**

| Address | Role |
|---|---|
| `http://<teacher-ip>` (or `http://airquiz.local`) | Student join page |
| `http://localhost/admin` | Teacher dashboard (port 80 when free, else 8000+) |

## How it works

```
Student (Phone A) ───┐   (Unique Exam V1)
                     │
Student (Phone B) ───┼───► Local Server ───► SQLite DB
                     │   (FastAPI/SocketIO)
Admin (Laptop) ──────┘   (Live Tracking)
```

1. **The Factory**: When an exam starts, the backend "factory" generates randomized versions of the question pool.
2. **Unicast Delivery**: Each student receives their specific payload via a dedicated socket event.
3. **Persisted State**: The unique assignment is saved to the database to prevent "exam shopping" via refreshes.
4. **Auto-Grading**: Answers are compared against the source-of-truth text, maintaining scoring integrity despite shuffled options.

## Field use

AirQuiz is not just a prototype; it's a field-tested production tool.
- **289+ Real Students** processed in live university assessments.
- **Targeting 500+** by June 2026.
- **Zero Crashes** recorded during full-week continuous operations.
- **Minimal Infra**: Replaces stacks of paper with a simple $20 router.

## Tech stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui primitives.
- **Backend**: Python 3.12, FastAPI, Socket.IO, SQLAlchemy.
- **Persistence**: SQLite (Single-file, zero configuration required).
- **Packaging**: PyInstaller one-file builds produced by GitHub Actions; the backend serves the built web app on a single port.
- **PWA**: service worker via `vite-plugin-pwa` for offline app-shell reloads.

## Networking and scale

Works on a dumb router, a hotspot or a campus network with no internet. Students join by QR, address, or `airquiz.local`; a second QR can connect their phone to the Wi-Fi first. A simulated 300-student exam runs with all 6000 answers acknowledged (p95 17 ms) on a 4-core laptop. See [docs/NETWORKING.md](docs/NETWORKING.md) for numbers, router limits and why phones are not used as hosts.

## Security notes

- Teacher actions need the teacher password (generated on first run, stored in `AirQuizData/admin_password.txt`); the host computer itself is signed in automatically, loopback only. Exam files, which contain answers, are never served to students.
- AirQuiz is built for a trusted classroom network and does not use HTTPS. Do not expose it to the internet.
- Students are identified by name + group; a student who knows a classmate's details could rejoin as them. Use it for classroom assessment, not high-stakes identity verification.

## Contributing

Contributions are welcome! Whether it's fixing CSS, adding translation keys, or optimizing the Python backend, please see [CONTRIBUTING.md](CONTRIBUTING.md).

---

Built by [Salah Eddine Medkour](https://salahmed-ctrlz.github.io/salaheddine-medkour-portfolio/) · [GitHub](https://github.com/salahmed-ctrlz) · [LinkedIn](https://linkedin.com/in/salah-eddine-medkour)
