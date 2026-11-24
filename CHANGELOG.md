# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-11-24

### Added
- One-click packaging: single-port server serving the built web app, `scripts/build_exe.py` (PyInstaller) and a tag-driven release workflow for Windows/macOS/Linux
- Join QR (encodes the room code) and address picker for projecting in class; `/api/qr.svg`, `/api/server-info`
- Offline app shell: bundled fonts, route splitting (precache 3.4 MB → 0.9 MB), proper PWA icons
- Reopen an ended exam without clearing answers (`admin_resume_exam`)
- Backend test suite (pytest) and CI for tests + production build
- Teacher guide and exam format docs

### Changed
- Students land directly on the join form; redesigned UI (warm neutral palette, semantic status colours, flat components)
- Data (database, exams, password) lives in `data/` / `AirQuizData/`
- Default room capacity 300; only new students count against it
- Starting an exam clears that room's previous answers; starting while running is refused

### Fixed
- Answers could be lost on flaky Wi-Fi (shared debounce, marked synced while offline)
- Late joiners received the whole question pool instead of the configured count
- Max-students slider was never sent to the server
- CSV formula injection; exam loading wiped other rooms' questions

### Security
- Admin password no longer ships in the JS bundle; HMAC tokens, login throttling
- All admin REST routes and socket events require authentication (students could previously start/reset exams and reveal answers; `/api/exams/*` served answers publicly)
- Dashboard roster and live scores are sent to admins only
- Server enforces the timer, assigned questions and options; `TEST/TEST` bypass is opt-in
- Removed a committed Windows virtualenv, bytecode and database from the repository

## [1.0.0] - 2024-12-01

### Added
- FastAPI backend with Socket.IO real-time communication
- React + TypeScript frontend with Tailwind CSS and shadcn/ui
- Multi-room quiz support with unique room codes
- Student join, answer submission, and score tracking
- Admin dashboard with live student monitoring
- Exam builder and JSON exam file management
- CSV export with UTF-8-BOM for Excel compatibility
- Session recovery on reconnect
- Dark/light mode toggle
- Split landing page (Student / Teacher)
- Cross-platform one-click launcher (`start.py`)
- QR code display for mobile student access
- Sample exam files (19 subjects)

### Security
- Path traversal protection on exam file endpoints
- Environment-based configuration (no secrets in source)
