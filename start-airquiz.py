#!/usr/bin/env python3
"""
AirQuiz - Complete Startup Script (Python)
Starts both backend and frontend servers automatically
"""

import os
import sys
import subprocess
import time
import signal
from pathlib import Path

# Colors for terminal output
class Colors:
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    WHITE = '\033[97m'
    RESET = '\033[0m'

def print_header(text):
    print(f"{Colors.CYAN}{'=' * 50}")
    print(f"  {text}")
    print(f"{'=' * 50}{Colors.RESET}\n")

def print_success(text):
    print(f"{Colors.GREEN}   ✓ {text}{Colors.RESET}")

def print_error(text):
    print(f"{Colors.RED}   ✗ {text}{Colors.RESET}")

def print_info(text):
    print(f"{Colors.YELLOW}   {text}{Colors.RESET}")

# Get directories
ROOT_DIR = Path(__file__).parent.absolute()
BACKEND_DIR = ROOT_DIR / "backend"
LOG_DIR = ROOT_DIR / "logs"

# Create logs directory
LOG_DIR.mkdir(exist_ok=True)

BACKEND_LOG = LOG_DIR / "backend.log"
FRONTEND_LOG = LOG_DIR / "frontend.log"

print_header("🚀 AirQuiz - Automated Startup")

print(f"{Colors.YELLOW}📂 Project Directory: {ROOT_DIR}")
print(f"📝 Backend Log: {BACKEND_LOG}")
print(f"📝 Frontend Log: {FRONTEND_LOG}{Colors.RESET}\n")

# ========================================
# Step 1: Check Python
# ========================================
print(f"{Colors.GREEN}🐍 Checking Python...{Colors.RESET}")
try:
    result = subprocess.run(["python", "--version"], capture_output=True, text=True)
    print_success(f"Python {result.stdout.strip()}")
except Exception as e:
    print_error("Python not found! Please install Python 3.9+")
    sys.exit(1)

# ========================================
# Step 2: Check Node.js
# ========================================
print(f"\n{Colors.GREEN}🟢 Checking Node.js...{Colors.RESET}")
try:
    result = subprocess.run(["node", "--version"], capture_output=True, text=True)
    print_success(f"Node {result.stdout.strip()}")
except Exception as e:
    print_error("Node.js not found! Please install Node.js 18+")
    sys.exit(1)

# ========================================
# Step 3: Install Backend Dependencies
# ========================================
print(f"\n{Colors.GREEN}📦 Installing Backend Dependencies...{Colors.RESET}")
os.chdir(BACKEND_DIR)

venv_path = BACKEND_DIR / "venv"
if not venv_path.exists():
    print_info("Creating virtual environment...")
    subprocess.run([sys.executable, "-m", "venv", "venv"], check=True)

print_info("Installing Python packages...")
if os.name == 'nt':  # Windows
    pip_path = venv_path / "Scripts" / "pip"
    python_path = venv_path / "Scripts" / "python"
else:  # Linux/Mac
    pip_path = venv_path / "bin" / "pip"
    python_path = venv_path / "bin" / "python"

subprocess.run([str(pip_path), "install", "-r", "requirements.txt", "--quiet"], check=True)
print_success("Backend dependencies installed")

os.chdir(ROOT_DIR)

# ========================================
# Step 4: Install Frontend Dependencies
# ========================================
print(f"\n{Colors.GREEN}📦 Installing Frontend Dependencies...{Colors.RESET}")
if not (ROOT_DIR / "node_modules").exists():
    print_info("Installing npm packages...")
    subprocess.run(["npm", "install", "--silent"], check=True)
    print_success("Frontend dependencies installed")
else:
    print_success("Dependencies already installed")

# ========================================
# Step 5: Check Environment File
# ========================================
print(f"\n{Colors.GREEN}🔧 Checking Configuration...{Colors.RESET}")
env_file = ROOT_DIR / ".env"
if not env_file.exists():
    print_info("Creating .env file...")
    subprocess.run(["cp", ".env.example", ".env"], check=True)
    print_success(".env file created")
else:
    print_success(".env file exists")

# ========================================
# Step 6: Start Backend Server
# ========================================
print(f"\n{Colors.GREEN}🚀 Starting Backend Server...{Colors.RESET}")

backend_log_file = open(BACKEND_LOG, 'w')
os.chdir(BACKEND_DIR)

if os.name == 'nt':  # Windows
    uvicorn_path = venv_path / "Scripts" / "uvicorn"
else:  # Linux/Mac
    uvicorn_path = venv_path / "bin" / "uvicorn"

backend_process = subprocess.Popen(
    [str(uvicorn_path), "main:sio_app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
    stdout=backend_log_file,
    stderr=subprocess.STDOUT
)

print_info("Waiting for backend to start...")
time.sleep(5)

# Test backend
try:
    import urllib.request
    urllib.request.urlopen("http://localhost:8000", timeout=5)
    print_success("Backend running at http://localhost:8000")
except:
    print_info("Backend may still be starting...")

os.chdir(ROOT_DIR)

# ========================================
# Step 7: Start Frontend Server
# ========================================
print(f"\n{Colors.GREEN}🚀 Starting Frontend Server...{Colors.RESET}")

frontend_log_file = open(FRONTEND_LOG, 'w')
frontend_process = subprocess.Popen(
    ["npm", "run", "dev"],
    stdout=frontend_log_file,
    stderr=subprocess.STDOUT
)

print_info("Waiting for frontend to start...")
time.sleep(5)
print_success("Frontend running at http://localhost:5173")

# ========================================
# Success Summary
# ========================================
print_header("✅ AirQuiz is Running!")

print(f"{Colors.YELLOW}🌐 Access URLs:{Colors.RESET}")
print(f"{Colors.WHITE}   • Frontend:  http://localhost:5173")
print(f"   • Backend:   http://localhost:8000")
print(f"   • Admin:     http://localhost:5173/admin")
print(f"   • Password:  airquiz2024{Colors.RESET}\n")

print(f"{Colors.YELLOW}📊 Server Status:{Colors.RESET}")
print(f"{Colors.WHITE}   • Backend PID:  {backend_process.pid}")
print(f"   • Frontend PID: {frontend_process.pid}{Colors.RESET}\n")

print(f"{Colors.YELLOW}📝 Logs:{Colors.RESET}")
print(f"{Colors.WHITE}   • Backend:  {BACKEND_LOG}")
print(f"   • Frontend: {FRONTEND_LOG}{Colors.RESET}\n")

print(f"{Colors.YELLOW}Press Ctrl+C to stop both servers{Colors.RESET}\n")

# Cleanup handler
def cleanup(signum=None, frame=None):
    print(f"\n{Colors.YELLOW}🛑 Stopping servers...{Colors.RESET}")
    backend_process.terminate()
    frontend_process.terminate()
    backend_process.wait()
    frontend_process.wait()
    backend_log_file.close()
    frontend_log_file.close()
    print_success("All servers stopped!")
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

# Keep running
try:
    backend_process.wait()
    frontend_process.wait()
except KeyboardInterrupt:
    cleanup()
