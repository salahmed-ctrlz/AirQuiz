# Teacher guide

AirQuiz runs on your computer and students join from their phones over the classroom network. No internet is needed after you have the program.

## Before class

1. **Install** (Windows): run `AirQuiz-Setup.exe` from the [Releases page](https://github.com/salahmed-ctrlz/AirQuiz/releases/latest). It adds a shortcut and opens the Windows Firewall for AirQuiz so phones can connect. No Python or Node needed. Prefer no installer? Unzip `AirQuiz-windows-portable.zip` anywhere and run `AirQuiz.exe`. (macOS: unzip and run `AirQuiz`; Linux: extract the tar.gz and run `./AirQuiz`.)
2. **Start AirQuiz**. A window shows the student address and a QR code, and your browser opens the teacher page already signed in. Keep the window open during the exam (or use the power button in the dashboard to stop it).
3. **Network**: your computer and the students' phones must be on the same network — see [Networking and scale](NETWORKING.md). If students can't reach the address, client isolation on school/guest Wi-Fi is the usual cause; use a router or hotspot, and the *Join Wi-Fi first* QR in the join dialog.
4. **Windows Firewall**: the installer already allowed AirQuiz. With the portable zip, choose **Allow** on the first-run prompt.

## Running an exam

1. The teacher page opens automatically on the computer running AirQuiz (no password needed there). From another device, open `http://<address>/admin` and sign in with the password from the AirQuiz window.
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

Everything lives in an `AirQuizData` folder: next to the program for the portable version, in `Documents\AirQuizData` for the installed one, `data/` when run from source:

| File | What it is |
|---|---|
| `airquiz.db` | students, answers, rooms |
| `exams/` | your exam files (JSON) |
| `admin_password.txt` | password for signing in from *other* devices — edit it to change it, or set the `ADMIN_PASSWORD` environment variable |
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
| Address has `:8001` or similar | Port 80 was busy; AirQuiz picked the next free port. Use the address it prints |
| Forgot the password | Open `AirQuizData/admin_password.txt` |
| Windows SmartScreen warning | The program is unsigned: *More info → Run anyway* |
