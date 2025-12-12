# 🚀 AirQuiz - Quick Start Guide

## ✅ What's Done

- ✅ **Backend**: Complete FastAPI + WebSocket + SQLite implementation
- ✅ **Database**: 4 tables with relationships
- ✅ **WebSocket**: Full event-driven architecture with state recovery
- ✅ **API**: 7 RESTful endpoints
- ✅ **CSV Export**: UTF-8-BOM encoding for Arabic names
- ✅ **Cleanup**: All Loveable references removed
- ✅ **Attribution**: Salah Eddine Medkour credited everywhere

## 🎯 Quick Start (5 Minutes)

### 1. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Start Backend

**Windows:**
```bash
start.bat
```

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

Backend runs at: `http://localhost:8000`

### 3. Test Backend

```bash
curl http://localhost:8000
```

Should return: `{"status":"ok","message":"AirQuiz API is running"}`

### 4. Install Frontend Dependencies

```bash
# From project root
npm install
npm install socket.io-client
```

### 5. Create Environment File

```bash
cp .env.example .env
```

### 6. Start Frontend

```bash
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## 📝 Testing the API

### Create Room Metadata

```bash
curl -X POST http://localhost:8000/api/metadata \
  -H "Content-Type: application/json" \
  -d '{
    "institution_name": "My School",
    "subject_name": "Computer Science",
    "year": "2024"
  }'
```

### Load ExamJSON

```bash
curl -X POST http://localhost:8000/api/exam/load \
  -H "Content-Type: application/json" \
  -d @exams/network-basics.json
```

### Get All Students

```bash
curl http://localhost:8000/api/students
```

### Export CSV

```bash
curl http://localhost:8000/admin/export_csv -o results.csv
```

---

## 🔌 WebSocket Events

### Student Side

**Connect:**
```javascript
import { io } from 'socket.io-client';
const socket = io('http://localhost:8000');
```

**Join Quiz:**
```javascript
socket.emit('join', {
  first_name: 'John',
  last_name: 'Doe',
  group: 'G1'
});
```

**Submit Answer:**
```javascript
socket.emit('submit_answer', {
  student_id: 1,
  question_id: 1,
  option: 'ICMP'
});
```

**Listen for Events:**
```javascript
socket.on('join_success', (data) => console.log(data));
socket.on('restore_session', (data) => console.log('Session restored:', data));
socket.on('new_question', (question) => console.log('New question:', question));
socket.on('show_result', (result) => console.log('Result:', result));
socket.on('answer_acknowledged', (ack) => console.log('Answer saved'));
```

### Admin Side

**Start Question:**
```javascript
socket.emit('admin_next_question', { question_id: 1 });
```

**Reveal Results:**
```javascript
socket.emit('admin_reveal', { question_id: 1 });
```

**Listen for Updates:**
```javascript
socket.on('dashboard_update', (update) => {
  console.log('Connected:', update.connected_count);
  console.log('Answered:', update.answered_count);
  console.log('Students:', update.students);
});
```

---

## 📂 Project Structure

```
airquiz-classroom/
├── backend/              ✅ Complete
│   ├── main.py
│   ├── models.py
│   ├── database.py
│   ├── manager.py
│   ├── schemas.py
│   └── requirements.txt
├── exams/                ✅ Complete
│   └── network-basics.json
├── src/
│   ├── components/
│   │   └── Footer.tsx    ✅ Updated
│   └── hooks/
│       └── useSocket.ts  ⚠️ Needs integration
├── README.md             ✅ Updated
├── index.html            ✅ Updated
├── package.json          ✅ Cleaned
└── vite.config.ts        ✅ Updated
```

---

## ⚠️ Important Notes

1. **The backend is 100% complete and tested**
2. **All Loveable references removed**
3. **Logo path**: `src/assets/AirQuizLogoBLACKndBlueMain.svg`
4. **CSV encoding**: UTF-8-BOM (works with Arabic)
5. **Local network**: Both servers accessible on LAN

---

## 🎨 Frontend ToDo

The frontend needs these components built:

- [ ] Student Login page (fetch metadata, join)
- [ ] Student Waiting Room (listen for new_question)
- [ ] Student Quiz View (show question, 2x2 grid)  
- [ ] Student Result View (flip card, green/red)
- [ ] Admin Setup Screen (metadata form)
- [ ] Admin Dashboard (live grid, controls)
- [ ] Admin Exam Loader (upload JSON)

All backend support for these is ready!

---

## 🆘 Troubleshooting

**Port 8000 in use:**
```bash
# Change port in backend startup
uvicorn main:sio_app --host 0.0.0.0 --port 8001 --reload
```

**CORS errors:**
- Backend already has `allow_origins=["*"]`
- Check firewall settings

**Database locked:**
```bash
# Delete and restart
rm backend/airquiz.db
```

**Socket.io not connecting:**
- Verify backend is running
- Check browser console for errors
- Try `http://` (not `https://`)

---

## 📧 Support

Built by **Salah Eddine Medkour**

- 🌐 [Portfolio](https://salahmed-ctrlz.github.io/salaheddine-medkour-portfolio/)
- 💻 [GitHub](https://github.com/salahmed-ctrlz)
- 💼 [LinkedIn](https://www.linkedin.com/in/salah-eddine-medkour/)

---

**Ready to quiz! 🎓**
