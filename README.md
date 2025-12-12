# AirQuiz - Classroom Assessment Platform

<div align="center">

**An offline-first, real-time quiz platform for classrooms**

[![Made with React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-WebSocket-010101?logo=socket.io)](https://socket.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Author:** [Salah Eddine Medkour](https://linkedin.com/in/salah-eddine-medkour) • [GitHub](https://github.com/salahmed-ctrlz) • [Portfolio](https://salahmed-ctrlz.github.io/salaheddine-medkour-portfolio/)

</div>

---

## ✨ Features

- 🔌 **100% Offline** — Works on local network with no internet required
- ⚡ **Real-Time** — Live updates as students answer via WebSocket
- 📱 **Mobile-Ready** — Students join from any device
- 🔄 **Auto-Recovery** — Reconnects and restores progress on disconnect
- 📊 **Live Dashboard** — Monitor student progress in real-time
- ✏️ **Exam Builder** — Create exams directly in the app
- 📥 **CSV Export** — Download results with UTF-8 support

---

## 🚀 Quick Start

### Prerequisites

> ⚠️ **IMPORTANT: Python 3.9 - 3.12 required!**  
> Python 3.13+ is NOT supported yet (packages require Rust to build).

- **Python 3.9, 3.10, 3.11, or 3.12** — [Download Python 3.12](https://www.python.org/downloads/release/python-3120/)
- **Node.js 18+** — [Download Node.js](https://nodejs.org/)

#### Multiple Python Versions?
If you have multiple Python versions installed, use the specific version:

```bash
# Windows - use py launcher
py -3.12 -m pip install -r backend/requirements.txt
py -3.12 -m uvicorn main:sio_app --host 0.0.0.0 --port 8000

# Mac/Linux - use explicit version
python3.12 -m pip install -r backend/requirements.txt
python3.12 -m uvicorn main:sio_app --host 0.0.0.0 --port 8000
```

### One-Click Launch

**Windows:** Double-click `start.bat`

**Mac/Linux:**
```bash
chmod +x start.sh && ./start.sh
```

**Or with Python:**
```bash
python start.py
```

This automatically installs dependencies, starts both servers, and opens the admin dashboard.

### Windows Firewall
To allow other devices to connect, run as Administrator:
```powershell
netsh advfirewall firewall add rule name="AirQuiz Backend" dir=in action=allow protocol=TCP localport=8000
netsh advfirewall firewall add rule name="AirQuiz Frontend" dir=in action=allow protocol=TCP localport=5173
```

---

## � Usage

### For Teachers

1. Go to `http://localhost:5173/admin`
2. Login (default password: `sala7`)
3. Create or join a room
4. Upload an exam JSON or use the **Create New** button
5. Share the room code with students
6. Click **Start Exam**
7. Monitor progress → **Distribute Results** → **Export CSV**

### For Students

1. Go to `http://<teacher-ip>:5173`
2. Enter the room code from teacher
3. Fill in name and group
4. Wait for exam to start
5. Answer questions before time runs out
6. View results when revealed

---

## 📝 Creating Exams

### Method 1: In-App Builder
Click **"Create New"** in the dashboard sidebar.

### Method 2: JSON Files
Create `.json` files in `/exams`. See `TEMPLATE.json`:

```json
{
  "title": "My Quiz",
  "questions": [
    {
      "id": 1,
      "text": "What is 2+2?",
      "options": ["3", "4", "5", "6"],
      "correct": "4",
      "time": 30
    }
  ]
}
```

---

## 🏗️ Project Structure

```
airquiz-classroom/
├── start.py/.bat/.sh    # One-click launchers
├── exams/               # Exam JSON files
│   └── TEMPLATE.json    # Example exam format
├── backend/
│   ├── main.py          # FastAPI + Socket.IO server
│   ├── manager.py       # WebSocket event handlers
│   ├── models.py        # SQLite database models
│   └── schemas.py       # Pydantic schemas
└── src/
    ├── pages/
    │   ├── admin/       # Dashboard, Login
    │   └── student/     # Login, Waiting, Quiz, Results
    ├── components/      # Reusable UI components
    └── hooks/           # useSocket hook
```

---

## ⚙️ Manual Setup

```bash
# Install frontend
npm install

# Install backend
cd backend && pip install -r requirements.txt

# Start backend (Terminal 1)
cd backend && uvicorn main:sio_app --host 0.0.0.0 --port 8000 --reload

# Start frontend (Terminal 2)
npm run dev -- --host
```

---

## 🔧 Configuration

Edit `.env`:
```env
VITE_SOCKET_URL=http://localhost:8000
VITE_API_URL=http://localhost:8000
VITE_ADMIN_PASSWORD=airquiz2024
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind, shadcn/ui |
| Backend | Python, FastAPI, Socket.IO, SQLAlchemy |
| Database | SQLite |
| Real-time | Socket.IO (WebSocket) |

---

## � License

MIT License — See [LICENSE](LICENSE) file

---

<div align="center">

**Made by [Salah Eddine Medkour](https://linkedin.com/in/salah-eddine-medkour)**

</div>
