# Contributing to AirQuiz

Thanks for considering contributing! Here's how to get started.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/salahmed-ctrlz/airquiz-classroom.git
cd airquiz-classroom

# Option A: One-click start
python start.py          # or: start.bat (Windows) / ./start.sh (Unix)

# Option B: Manual start
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:sio_app --host 0.0.0.0 --port 8000

# Frontend (new terminal)
npm install
npm run dev
```

## Making Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-thing`
3. Make your changes, keeping commits focused
4. Run type checks: `npx tsc --noEmit`
5. Push and open a Pull Request

## Code Style

- **Python**: Follow PEP 8. Use type hints where practical.
- **TypeScript**: Strict mode. No `any` types unless absolutely necessary.
- **Comments**: Explain *why*, not *what*. Keep them concise.
- **Commit messages**: Use conventional format: `feat:`, `fix:`, `docs:`, `refactor:`

## Project Structure

```
backend/           Python FastAPI + Socket.IO
├── handlers/      WebSocket event handlers
├── services/      Business logic (exams, export)
├── config.py      Environment config
├── manager.py     Core connection manager
└── main.py        App factory + REST endpoints

src/               React + TypeScript frontend
├── components/    Reusable UI components
├── hooks/         Custom React hooks
├── lib/           Config, types, utilities
└── pages/         Route-level page components
```

## Reporting Issues

Use the GitHub issue templates for [bugs](.github/ISSUE_TEMPLATE/bug_report.md) and [feature requests](.github/ISSUE_TEMPLATE/feature_request.md).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
