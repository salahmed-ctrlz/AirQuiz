#!/bin/bash

# AirQuiz Backend Startup Script
echo "🚀 Starting AirQuiz Backend..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Run the server
echo "✅ Starting FastAPI server..."
echo "Backend will be available at: http://0.0.0.0:8000"
uvicorn main:sio_app --host 0.0.0.0 --port 8000 --reload
