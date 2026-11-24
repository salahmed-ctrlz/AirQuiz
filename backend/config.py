"""
AirQuiz - Configuration
All settings come from environment variables with sensible defaults.
"""

import os
import sys
from pathlib import Path

FROZEN = bool(getattr(sys, "frozen", False))

# Where the app's code lives (PyInstaller unpacks to sys._MEIPASS)
BASE_DIR = Path(getattr(sys, "_MEIPASS", Path(__file__).parent))
PROJECT_ROOT = BASE_DIR if FROZEN else Path(__file__).parent.parent

# Where user data lives. Packaged builds keep it next to the executable so a
# teacher can copy / back up one folder; dev checkouts use ./data.
if os.getenv("AIRQUIZ_DATA_DIR"):
    DATA_DIR = Path(os.environ["AIRQUIZ_DATA_DIR"])
elif FROZEN:
    DATA_DIR = Path(sys.executable).parent / "AirQuizData"
else:
    DATA_DIR = PROJECT_ROOT / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

EXAMS_DIR = os.getenv("EXAMS_DIR", str(DATA_DIR / "exams"))

# Built frontend (served by the backend so only one process/port is needed)
STATIC_DIR = Path(os.getenv("AIRQUIZ_STATIC_DIR", str(PROJECT_ROOT / "dist")))

# Database
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{(DATA_DIR / 'airquiz.db').as_posix()}")

# Server
BACKEND_HOST = os.getenv("BACKEND_HOST", "0.0.0.0")
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))

# CORS — comma-separated origins, or "*" for any
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

LOG_LEVEL = os.getenv("LOG_LEVEL", "info")

# Room settings
DEFAULT_ROOM_CAPACITY = int(os.getenv("DEFAULT_ROOM_CAPACITY", "300"))

# Seconds an answer may arrive after the timer hits zero (network latency)
ANSWER_GRACE_SECONDS = int(os.getenv("ANSWER_GRACE_SECONDS", "3"))

# Admin auth. If ADMIN_PASSWORD is unset a random one is generated on first run
# and stored in DATA_DIR/admin_password.txt.
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
ADMIN_TOKEN_TTL_SECONDS = int(os.getenv("ADMIN_TOKEN_TTL_SECONDS", str(12 * 3600)))

# Development helper: lets TEST/TEST join any room without a code. Never enable
# in a real exam — it bypasses room codes and capacity.
ALLOW_TEST_USER = os.getenv("AIRQUIZ_ALLOW_TEST_USER", "").lower() in ("1", "true", "yes")
