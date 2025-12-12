@echo off
title AirQuiz Launcher
echo.
echo =============================================
echo         AirQuiz - Classroom Assessment
echo =============================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.9+
    pause
    exit /b 1
)

:: Run the Python launcher
python start.py

pause
