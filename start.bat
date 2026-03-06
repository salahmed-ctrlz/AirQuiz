@echo off
title AirQuiz Launcher
echo.
echo =============================================
echo         AirQuiz - Classroom Assessment
echo =============================================
echo.

:: Try py launcher first (most reliable on Windows with multiple Python versions)
py -3.12 --version >nul 2>&1
if not errorlevel 1 (
    py -3.12 start.py
    goto :done
)

py -3 --version >nul 2>&1
if not errorlevel 1 (
    py -3 start.py
    goto :done
)

python --version >nul 2>&1
if not errorlevel 1 (
    python start.py
    goto :done
)

echo [ERROR] Python not found. Please install Python 3.9-3.12
echo https://www.python.org/downloads/release/python-3120/

:done
pause
