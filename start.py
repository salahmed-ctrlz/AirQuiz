#!/usr/bin/env python3
"""
Run AirQuiz from source (for developers; teachers should download the release).

    python start.py          build the web app if needed, then start the server
    python start.py --dev    Vite dev server with hot reload + backend auto-reload
"""

import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.resolve()
BACKEND = ROOT / "backend"
VENV = ROOT / ".venv"
IS_WIN = platform.system() == "Windows"
NPM = "npm.cmd" if IS_WIN else "npm"


def step(msg):
    print(f"\n==> {msg}")


def pause_and_exit(msg):
    print(f"\n[!] {msg}")
    if IS_WIN:
        input("Press Enter to close...")
    sys.exit(1)


def venv_python() -> str:
    py = VENV / ("Scripts/python.exe" if IS_WIN else "bin/python")
    if not py.exists():
        step("Creating Python environment (first run only)")
        subprocess.run([sys.executable, "-m", "venv", str(VENV)], check=True)
    return str(py)


def main():
    if sys.version_info < (3, 9):
        pause_and_exit("Python 3.9 or newer is required: https://www.python.org/downloads/")
    dev = "--dev" in sys.argv
    py = venv_python()

    stamp = VENV / ".requirements-stamp"
    req = BACKEND / "requirements.txt"
    if not stamp.exists() or stamp.read_text() != req.read_text():
        step("Installing Python packages")
        subprocess.run([py, "-m", "pip", "install", "-q", "-r", str(req)], check=True)
        stamp.write_text(req.read_text())

    if dev:
        if not shutil.which(NPM):
            pause_and_exit("Node.js 18+ is required for --dev: https://nodejs.org/")
        if not (ROOT / "node_modules").exists():
            step("Installing web packages")
            subprocess.run([NPM, "install"], cwd=ROOT, check=True)
        step("Starting Vite (http://localhost:5173) and the backend (:8000)")
        vite = subprocess.Popen([NPM, "run", "dev", "--", "--host"], cwd=ROOT)
        try:
            subprocess.run([py, "-m", "uvicorn", "main:sio_app", "--host", "0.0.0.0", "--port", "8000", "--reload"], cwd=BACKEND)
        finally:
            vite.terminate()
        return

    if not (ROOT / "dist" / "index.html").exists():
        if not shutil.which(NPM):
            pause_and_exit("The web app is not built and Node.js is not installed.\n"
                           "    Easiest: download a ready-made AirQuiz from the Releases page.\n"
                           "    Or install Node.js 18+ (https://nodejs.org/) and run this again.")
        step("Building the web app (first run only, takes a minute)")
        if not (ROOT / "node_modules").exists():
            subprocess.run([NPM, "ci"], cwd=ROOT, check=True)
        subprocess.run([NPM, "run", "build"], cwd=ROOT, check=True)

    subprocess.run([py, str(BACKEND / "run.py"), *[a for a in sys.argv[1:] if a != "--dev"]], cwd=BACKEND)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
    except subprocess.CalledProcessError as e:
        pause_and_exit(f"A setup step failed: {' '.join(map(str, e.cmd))}")
