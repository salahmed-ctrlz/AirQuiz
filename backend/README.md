# AirQuiz Backend - Quickstart Guide

## Installation

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Run the Backend

#### On Windows:
```bash
start.bat
```

#### On Linux/Mac:
```bash
chmod +x start.sh
./start.sh
```

#### Or manually:
```bash
uvicorn main:sio_app --host 0.0.0.0 --port 8000 --reload
```

The backend will be available at:
- **API**: http://localhost:8000
- **Socket.IO**: ws://localhost:8000/socket.io

## API Endpoints

### Metadata
- `POST /api/metadata` - Create room metadata
- `GET /api/metadata` - Get room metadata

### Exam Management
- `POST /api/exam/load` - Load exam from JSON

### Students
- `GET /api/students` - Get all students

### Admin
- `GET /admin/export_csv` - Export results as CSV
- `DELETE /api/room/reset` - Reset entire room

## WebSocket Events

### Client → Server
- `join` - Student joins quiz
- `submit_answer` - Student submits answer

### Server → Client  
- `connected` - Connection established
- `join_success` - Join successful
- `restore_session` - Session restored
- `new_question` - New question broadcast
- `show_result` - Results revealed
- `dashboard_update` - Admin dashboard update

## Database

SQLite database (`airquiz.db`) is created automatically on first run.

### Tables:
- `metadata` - Room configuration
- `students` - Student information
- `questions` - Loaded quiz questions
- `responses` - Student answers

## Testing

Test the API:
```bash
curl http://localhost:8000
```

Should return: `{"status":"ok","message":"AirQuiz API is running"}`
