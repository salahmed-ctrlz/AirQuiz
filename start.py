#!/usr/bin/env python3
"""
AirQuiz - One-Click Launcher
Starts both backend and frontend servers automatically.
Works on Windows, macOS, and Linux.
"""

import subprocess
import sys
import os
import time
import webbrowser
import platform

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_banner():
    print(f"""
{Colors.BLUE}{Colors.BOLD}
    ╔═══════════════════════════════════════════╗
    ║           AirQuiz Launcher v1.0           ║
    ║      Classroom Assessment Platform        ║
    ╚═══════════════════════════════════════════╝
{Colors.END}""")

def check_python():
    """Check Python version"""
    print(f"{Colors.YELLOW}[1/4] Checking Python...{Colors.END}")
    if sys.version_info < (3, 9):
        print(f"{Colors.RED}✗ Python 3.9+ required (found {sys.version}){Colors.END}")
        return False
    print(f"{Colors.GREEN}✓ Python {sys.version.split()[0]}{Colors.END}")
    return True

def check_node():
    """Check Node.js installation"""
    print(f"{Colors.YELLOW}[2/4] Checking Node.js...{Colors.END}")
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        version = result.stdout.strip()
        print(f"{Colors.GREEN}✓ Node.js {version}{Colors.END}")
        return True
    except FileNotFoundError:
        print(f"{Colors.RED}✗ Node.js not found. Please install Node.js 18+{Colors.END}")
        return False

def install_dependencies():
    """Install Python and Node dependencies"""
    print(f"{Colors.YELLOW}[3/4] Installing dependencies...{Colors.END}")
    
    # Get script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(script_dir, 'backend')
    
    # Install Python deps
    print(f"  Installing Python packages...")
    subprocess.run(
        [sys.executable, '-m', 'pip', 'install', '-q', '-r', 'requirements.txt'],
        cwd=backend_dir,
        capture_output=True
    )
    
    # Install Node deps
    print(f"  Installing Node packages...")
    npm_cmd = 'npm.cmd' if platform.system() == 'Windows' else 'npm'
    subprocess.run(
        [npm_cmd, 'install', '--silent'],
        cwd=script_dir,
        capture_output=True
    )
    
    print(f"{Colors.GREEN}✓ Dependencies installed{Colors.END}")
    return True

def start_servers():
    """Start both backend and frontend servers"""
    print(f"{Colors.YELLOW}[4/4] Starting servers...{Colors.END}")
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(script_dir, 'backend')
    
    # Determine commands based on OS
    is_windows = platform.system() == 'Windows'
    npm_cmd = 'npm.cmd' if is_windows else 'npm'
    
    # Start backend
    print(f"  Starting backend on port 8000...")
    backend_process = subprocess.Popen(
        [sys.executable, '-m', 'uvicorn', 'main:sio_app', '--host', '0.0.0.0', '--port', '8000'],
        cwd=backend_dir,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    # Start frontend
    print(f"  Starting frontend on port 5173...")
    frontend_process = subprocess.Popen(
        [npm_cmd, 'run', 'dev', '--', '--host'],
        cwd=script_dir,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    # Wait for servers to start
    time.sleep(3)
    
    print(f"{Colors.GREEN}✓ Servers started{Colors.END}")
    
    return backend_process, frontend_process

def get_local_ip():
    """Get the local IP address for LAN access"""
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "localhost"

def main():
    print_banner()
    
    # Run checks
    if not check_python():
        input("\nPress Enter to exit...")
        sys.exit(1)
    
    if not check_node():
        input("\nPress Enter to exit...")
        sys.exit(1)
    
    install_dependencies()
    backend_proc, frontend_proc = start_servers()
    
    local_ip = get_local_ip()
    
    print(f"""
{Colors.GREEN}{Colors.BOLD}
╔════════════════════════════════════════════════════════════════╗
║                     AirQuiz is Running!                        ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  👨‍🏫 Admin Dashboard:  http://{local_ip}:5173/admin             ║
║  👨‍🎓 Student Access:   http://{local_ip}:5173/                  ║
║                                                                ║
║  🔌 Backend API:      http://{local_ip}:8000                   ║
║                                                                ║
║  Press Ctrl+C to stop the servers                              ║
╚════════════════════════════════════════════════════════════════╝
{Colors.END}""")
    
    # Open browser
    webbrowser.open(f'http://{local_ip}:5173/admin')
    
    # Wait for interrupt
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Shutting down servers...{Colors.END}")
        backend_proc.terminate()
        frontend_proc.terminate()
        print(f"{Colors.GREEN}✓ Servers stopped. Goodbye!{Colors.END}")

if __name__ == '__main__':
    main()
