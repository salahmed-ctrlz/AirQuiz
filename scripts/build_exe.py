#!/usr/bin/env python3
"""
Build a single-file AirQuiz executable for the current OS.

    python scripts/build_exe.py            # builds the web app, then the exe
    python scripts/build_exe.py --skip-web # reuse an existing dist/

Output: release/AirQuiz(.exe)  — PyInstaller cannot cross-compile, so run this
on Windows for a .exe, on macOS for a Mac app binary, on Linux for a Linux binary.
(The GitHub "Release" workflow does all three.)
"""

import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
SEP = ";" if platform.system() == "Windows" else ":"


def run(cmd, **kw):
    print("+", " ".join(map(str, cmd)))
    subprocess.run(cmd, check=True, **kw)


def main():
    npm = "npm.cmd" if platform.system() == "Windows" else "npm"
    if "--skip-web" not in sys.argv:
        if not (ROOT / "node_modules").exists():
            run([npm, "ci"], cwd=ROOT)
        run([npm, "run", "build"], cwd=ROOT)
    if not (ROOT / "dist" / "index.html").exists():
        sys.exit("dist/ is missing — run `npm run build` first.")

    run([sys.executable, "-m", "pip", "install", "-q", "-r", str(BACKEND / "requirements.txt"), "pyinstaller>=6"])

    out = ROOT / "release"
    shutil.rmtree(out, ignore_errors=True)
    run([
        sys.executable, "-m", "PyInstaller", str(BACKEND / "run.py"),
        "--name", "AirQuiz", "--onefile", "--console", "--noconfirm", "--clean",
        "--distpath", str(out), "--workpath", str(ROOT / "build"), "--specpath", str(ROOT / "build"),
        "--paths", str(BACKEND),
        "--add-data", f"{ROOT / 'dist'}{SEP}dist",
        "--add-data", f"{BACKEND / 'samples'}{SEP}samples",
        "--collect-submodules", "engineio", "--collect-submodules", "socketio",
        "--collect-submodules", "uvicorn", "--collect-submodules", "sqlalchemy.dialects.sqlite",
        "--hidden-import", "handlers.admin", "--hidden-import", "handlers.student",
        "--hidden-import", "handlers.rooms", "--hidden-import", "services.exam_service",
        "--hidden-import", "services.export_service", "--hidden-import", "services.student_exam",
        "--hidden-import", "main",
    ])
    exe = next(out.glob("AirQuiz*"))
    print(f"\nBuilt {exe} ({exe.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    os.chdir(ROOT)
    main()
