# Contributing to AirQuiz

Thanks for considering contributing! Here's how to get started.

## Development setup

```bash
git clone https://github.com/salahmed-ctrlz/AirQuiz.git
cd AirQuiz

python start.py --dev     # Vite on :5173 + backend with reload on :8000
python start.py           # production-style: build once, serve everything on :8000
```

Checks that CI runs (please run them before opening a PR):

```bash
npm run lint && npx tsc --noEmit -p tsconfig.app.json && npm run build
pip install -r backend/requirements-dev.txt
ruff check backend && (cd backend && pytest)
```

Project layout: `src/` React app, `backend/` FastAPI + Socket.IO (`handlers/` events, `services/` logic, `tests/`), `scripts/build_exe.py` packaging, `docs/` guides.

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
