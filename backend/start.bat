@echo off
REM AirQuiz Backend Startup Script for Windows

echo Starting AirQuiz Backend...

REM Check if virtual environment exists
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Run the server
echo Starting FastAPI server...
echo Backend will be available at: http://0.0.0.0:8000
uvicorn main:sio_app --host 0.0.0.0 --port 8000 --reload
