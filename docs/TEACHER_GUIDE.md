# Teacher guide

AirQuiz runs on your computer and students join from their phones over the classroom network. No internet is needed after you have the program.

## Before class

1. **Start AirQuiz** (double-click `AirQuiz.exe`, or `start.bat` / `start.sh` if you run from source). A window opens showing the student address, a QR code and your teacher password.
2. **Network**: your computer and the students' phones must be on the same network — a Wi-Fi router, a campus network that allows device-to-device traffic, or a phone/laptop hotspot. If students cannot reach the address, try another network or a dedicated router (client isolation on guest Wi-Fi is the usual cause).
3. **Windows Firewall** may ask whether to allow AirQuiz on private networks. Choose **Allow**.

## Running an exam

1. Open the teacher page (it opens automatically, or go to `http://localhost:8000/admin`) and sign in with the password from the AirQuiz window.
2. **Create or open a room**. A room is one class sitting one exam.
3. Click **Join code** and project it. Students scan the QR code or open the address and type the code.
4. **Pick an exam** from the library (or upload a JSON file / build one with *Create New*). Choose duration, how many questions each student gets, and the maximum number of students.
5. **Start Exam**. Every student gets their own random question order and answer order, so neighbours cannot copy.
6. Watch progress live. You can add time, or end the exam early.
7. **Distribute results** to show each student their score and the correct answers, and **Download Report (CSV)** for a spreadsheet.

Good to know:
- If a phone dies or the browser closes, the student joins again with the same name and group and continues where they left off.
- The server ends the exam when the timer runs out; answers arriving later than a few seconds after that are rejected.
- *Reopen for 5 more minutes* re-opens an ended exam without clearing anyone's answers.
- *Reset Room* deletes the students and answers of that room. Exams stay in the library.

## Your data

Everything lives in the `AirQuizData` folder next to the program (or `data/` when run from source):

| File | What it is |
|---|---|
| `airquiz.db` | students, answers, rooms |
| `exams/` | your exam files (JSON) |
| `admin_password.txt` | teacher password — edit it to change it, or set the `ADMIN_PASSWORD` environment variable |
| `secret.key` | signs login sessions; delete it to sign everyone out |

Copy the folder to back up or to move to another computer.

## Exam file format

```json
{
  "title": "Networks — Midterm",
  "questions": [
    {
      "id": 1,
      "text": "Which layer routes packets between networks?",
      "options": ["Physical", "Network", "Transport", "Application"],
      "correct": "Network",
      "time": 30,
      "image": null
    }
  ]
}
```

- `id` must be unique within the exam.
- `options`: 2–10 entries, all different.
- `correct` must be exactly one of the options. (`"correct_index": 1` is also accepted.)
- Arabic text works in questions and options and is displayed right-to-left automatically.
- `time` is kept for compatibility; the exam timer is set when you start the exam.

## Troubleshooting

| Problem | Fix |
|---|---|
| Phones can't open the address | Same network? Disable guest-network isolation; try the other address in the *Join code* dialog |
| "Port 8000 is busy" | AirQuiz picks the next free port automatically; use the address it prints |
| Forgot the password | Open `AirQuizData/admin_password.txt` |
| Windows SmartScreen warning | The program is unsigned: *More info → Run anyway* |
