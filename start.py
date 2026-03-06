#!/usr/bin/env python3
"""
AirQuiz — One-click cross-platform launcher.
Auto-detects Python, creates venv, installs deps, starts backend + frontend.

Author: Salah Eddine Medkour <medkoursalaheddine@gmail.com>
"""

import subprocess, sys, os, time, signal, platform, shutil
from pathlib import Path

ROOT_DIR = Path(__file__).parent.absolute()
BACKEND_DIR = ROOT_DIR / "backend"
LOG_DIR = ROOT_DIR / "logs"

# -- terminal colors --
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def info(msg):  print(f"{YELLOW}  {msg}{RESET}")
def ok(msg):    print(f"{GREEN}  ✓ {msg}{RESET}")
def fail(msg):  print(f"{RED}  ✗ {msg}{RESET}")


def find_python() -> str:
    """Try multiple Python commands to find a working 3.9–3.12 interpreter."""
    # ordered by preference: explicit 3.12 first, then generic
    candidates = []

    if platform.system() == "Windows":
        # py launcher is the most reliable on Windows
        candidates = ["py -3.12", "py -3.11", "py -3.10", "py -3.9", "py -3", "python", "python3"]
    else:
        candidates = ["python3.12", "python3.11", "python3.10", "python3.9", "python3", "python"]

    for cmd in candidates:
        try:
            parts = cmd.split()
            result = subprocess.run(
                parts + ["--version"],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                version_str = result.stdout.strip().split()[-1]  # "Python 3.12.1" -> "3.12.1"
                major, minor = map(int, version_str.split(".")[:2])
                if major == 3 and 9 <= minor <= 12:
                    ok(f"Found {result.stdout.strip()} via '{cmd}'")
                    return cmd
                else:
                    info(f"'{cmd}' is Python {version_str} — need 3.9–3.12, skipping")
        except (FileNotFoundError, subprocess.TimeoutExpired, Exception):
            continue

    fail("No compatible Python 3.9–3.12 found!")
    print(f"\n  Please install Python 3.12: https://www.python.org/downloads/release/python-3120/")
    input("\n  Press Enter to exit...")
    sys.exit(1)


def check_node():
    try:
        r = subprocess.run(["node", "--version"], capture_output=True, text=True)
        ok(f"Node.js {r.stdout.strip()}")
    except FileNotFoundError:
        fail("Node.js not found — install Node 18+: https://nodejs.org/")
        input("\n  Press Enter to exit...")
        sys.exit(1)


def setup_backend_venv(python_cmd: str):
    """Create venv if missing and install requirements."""
    venv_path = BACKEND_DIR / "venv"
    is_windows = platform.system() == "Windows"

    if not venv_path.exists():
        info("Creating Python virtual environment...")
        cmd_parts = python_cmd.split() + ["-m", "venv", str(venv_path)]
        subprocess.run(cmd_parts, check=True)
        ok("Virtual environment created")

    # resolve pip/uvicorn inside venv
    if is_windows:
        pip = str(venv_path / "Scripts" / "pip")
        uvicorn = str(venv_path / "Scripts" / "uvicorn")
        python_venv = str(venv_path / "Scripts" / "python")
    else:
        pip = str(venv_path / "bin" / "pip")
        uvicorn = str(venv_path / "bin" / "uvicorn")
        python_venv = str(venv_path / "bin" / "python")

    info("Installing Python packages...")
    subprocess.run([pip, "install", "-q", "-r", str(BACKEND_DIR / "requirements.txt")], check=True)
    ok("Backend dependencies ready")

    return uvicorn, python_venv


def setup_frontend():
    """Install npm packages if node_modules is missing."""
    if not (ROOT_DIR / "node_modules").exists():
        info("Installing npm packages (first run)...")
        npm = "npm.cmd" if platform.system() == "Windows" else "npm"
        subprocess.run([npm, "install"], cwd=str(ROOT_DIR), check=True)
        ok("Frontend dependencies ready")
    else:
        ok("Frontend dependencies already installed")


def get_local_ip() -> str:
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "localhost"


def print_qr(url: str):
    """Print a QR code to terminal if the library is available."""
    try:
        import qrcode
        qr = qrcode.QRCode(border=1)
        qr.add_data(url)
        qr.make(fit=True)
        qr.print_ascii(invert=True)
    except ImportError:
        pass  # qrcode not installed in launcher's env — skip silently


def main():
    LOG_DIR.mkdir(exist_ok=True)
    os.environ["PYTHONIOENCODING"] = "utf-8"

    print(f"\n{CYAN}{BOLD}  ╔═══════════════════════════════════════╗")
    print(f"  ║        AirQuiz Launcher v1.0.0        ║")
    print(f"  ╚═══════════════════════════════════════╝{RESET}\n")

    # Step 1: find compatible Python
    print(f"{CYAN}[1/4] Checking Python...{RESET}")
    python_cmd = find_python()

    # Step 2: check Node
    print(f"\n{CYAN}[2/4] Checking Node.js...{RESET}")
    check_node()

    # Step 3: install deps
    print(f"\n{CYAN}[3/4] Setting up dependencies...{RESET}")
    uvicorn_bin, python_venv = setup_backend_venv(python_cmd)
    setup_frontend()

    # Step 4: launch
    print(f"\n{CYAN}[4/4] Starting servers...{RESET}")

    # backend
    backend_log = open(LOG_DIR / "backend.log", "w")
    backend_proc = subprocess.Popen(
        [uvicorn_bin, "main:sio_app", "--host", "0.0.0.0", "--port", "8000"],
        cwd=str(BACKEND_DIR),
        stdout=backend_log, stderr=subprocess.STDOUT,
        env={**os.environ, "PYTHONIOENCODING": "utf-8"}
    )
    info("Backend starting...")

    # frontend
    npm = "npm.cmd" if platform.system() == "Windows" else "npm"
    frontend_log = open(LOG_DIR / "frontend.log", "w")
    frontend_proc = subprocess.Popen(
        [npm, "run", "dev", "--", "--host"],
        cwd=str(ROOT_DIR),
        stdout=frontend_log, stderr=subprocess.STDOUT
    )
    info("Frontend starting...")
    time.sleep(4)

    local_ip = get_local_ip()
    student_url = f"http://{local_ip}:5173"

    print(f"""
{GREEN}{BOLD}  ╔═══════════════════════════════════════════════╗
  ║           AirQuiz is Running! 🎓              ║
  ╠═══════════════════════════════════════════════╣
  ║                                               ║
  ║  👨‍🏫 Teacher:  {student_url}/admin{' ' * max(0, 16 - len(local_ip))}║
  ║  👨‍🎓 Student:  {student_url}/{' ' * max(0, 21 - len(local_ip))}║
  ║  🔌 Backend:  http://{local_ip}:8000{' ' * max(0, 16 - len(local_ip))}║
  ║                                               ║
  ╚═══════════════════════════════════════════════╝{RESET}
""")

    # QR code so students can scan from phones
    print(f"  {YELLOW}📱 Scan to join:{RESET}")
    print_qr(student_url)

    print(f"\n  {YELLOW}Press Ctrl+C to stop both servers{RESET}\n")

    def cleanup(signum=None, frame=None):
        print(f"\n{YELLOW}Shutting down...{RESET}")
        backend_proc.terminate()
        frontend_proc.terminate()
        backend_proc.wait()
        frontend_proc.wait()
        backend_log.close()
        frontend_log.close()
        ok("Servers stopped. Goodbye!")
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        cleanup()


if __name__ == "__main__":
    main()
