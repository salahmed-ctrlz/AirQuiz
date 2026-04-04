# AirQuiz 🎓

> **Real-time, offline-first classroom assessment platform.** Absolute anti-cheat, zero internet required.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue)](https://www.python.org/)
[![React 18](https://img.shields.io/badge/react-18-61dafb)](https://react.dev/)
[![PWA Ready](https://img.shields.io/badge/pwa-installable-emerald)](https://vite-pwa-org.netlify.app/)

AirQuiz turns a single laptop into a high-performance quiz server. Teachers run live exams over a local Wi-Fi network, students join from their phones by scanning a QR code, and results appear in real time. **No cloud services, no accounts, no internet needed.**

Built to solve a universal teaching nightmare: grading paper exams for hundreds of students by hand. Deployed weekly across multiple university labs as part of Algeria's "Zero Paper" initiative.

## 🔥 Key Features

- **Absolute Anti-Cheat (Per-Student Unicast)**: Unlike broadcast systems, AirQuiz generates a unique exam for *every* student. Even if they sit side-by-side, their question order and option order (A, B, C, D) are independently randomized.
- **Runs Fully Offline**: Operates on any local network (dedicated router, campus Wi-Fi, or even a laptop hotspot).
- **Resilient & PWA Ready**: Installable as an app on phone/desktop. Aggressive caching ensures the UI never breaks even if the Wi-Fi signal flickers.
- **Real-time Synchronization**: Live updates via Socket.IO. Teachers see student progress as it happens.
- **Session Recovery**: If a student's phone dies or they close the browser, they can rejoin and find their exact randomized exam waiting for them, exactly where they left off.
- **Dynamic Progress Tracking**: Admin dashboard tracks progress based on each student's specific assigned question count.
- **Bilingual UI (EN/AR)**: Full support for English and Arabic with native RTL (Right-to-Left) layouts and local font optimization.
- **CSV Export**: Single-click export of all results, fully compatible with Excel/Google Sheets (UTF-8 support).

## 🚀 Quick Start

### One-Click Launcher (Recommended)
AirQuiz comes with a robust cross-platform launcher that detects Python, sets up a virtual environment, and starts all services automatically.

```bash
# Windows
start.bat

# macOS / Linux
chmod +x start.sh && ./start.sh
```

### Manual Setup

If you prefer building from source:

```bash
# 1. Backend
cd backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py

# 2. Frontend
npm install
npm run dev -- --host
```

**URLs:**

| Address | Role |
|---|---|
| `http://localhost:5173` | Landing & Student Entry |
| `http://localhost:5173/admin` | Teacher Dashboard |
| `http://localhost:5173/about` | Story & Field Test Stats |
| `http://localhost:8000` | Backend API |

## 🛠️ How it Works

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

## 📊 Battle Tested

AirQuiz is not just a prototype; it's a field-tested production tool.
- **289+ Real Students** processed in live university assessments.
- **Targeting 500+** by June 2026.
- **Zero Crashes** recorded during full-week continuous operations.
- **Minimal Infra**: Replaces stacks of paper with a simple $20 router.

## 🏗️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui.
- **Backend**: Python 3.12, FastAPI, Socket.IO, SQLAlchemy.
- **Persistence**: SQLite (Single-file, zero configuration required).
- **PWA**: Service Workers with `vite-plugin-pwa` for offline UI reliability.

## 🤝 Contributing

Contributions are welcome! Whether it's fixing CSS, adding translation keys, or optimizing the Python backend, please see [CONTRIBUTING.md](CONTRIBUTING.md).

---

Built with ❤️ by [Salah Eddine Medkour](https://salahmed-ctrlz.github.io/salaheddine-medkour-portfolio/) · [GitHub](https://github.com/salahmed-ctrlz) · [LinkedIn](https://linkedin.com/in/salah-eddine-medkour)
