"""
AirQuiz - Configuration
Centralizes all environment variables with sensible defaults.

Author: Salah Eddine Medkour <medkoursalaheddine@gmail.com>
"""

import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).parent
PROJECT_ROOT = BASE_DIR.parent
EXAMS_DIR = os.getenv("EXAMS_DIR", str(PROJECT_ROOT / "exams"))

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./airquiz.db")

# Server
BACKEND_HOST = os.getenv("BACKEND_HOST", "0.0.0.0")
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))

# CORS — comma-separated origins, or "*" for any
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

# Logging — set to "debug" to enable Socket.IO verbose output
LOG_LEVEL = os.getenv("LOG_LEVEL", "info")
