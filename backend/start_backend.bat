@echo off
title AirQuiz - Backend
cd /d "%~dp0"

echo =============================================
echo         AirQuiz Backend Launcher
echo =============================================
echo.

:: 1. Ensure venv exists
if not exist "venv" (
    echo [INFO] Virtual environment missing. Searching for Python...
    
    py -3.12 --version >nul 2>&1
    if not errorlevel 1 (
        echo [OK] Python 3.12 found. Creating venv...
        py -3.12 -m venv venv
    ) else (
        python --version >nul 2>&1
        if not errorlevel 1 (
            echo [OK] System Python found. Creating venv...
            python -m venv venv
        ) else (
            echo [ERROR] Python not found. Please install Python 3.12.
            pause
            exit /b 1
        )
    )
)

:: 2. Install deps
echo [INFO] Activating environment and updating dependencies...
call venv\Scripts\activate.bat
pip install -q -r requirements.txt

:: 3. Run
echo.
echo [OK] Backend starting at http://localhost:8000
echo Close this window to stop the backend.
echo.

:: Use sio_app for Socket.IO support
uvicorn main:sio_app --host 0.0.0.0 --port 8000 --reload
pause
