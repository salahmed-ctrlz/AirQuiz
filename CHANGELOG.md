# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
