#!/bin/bash

echo ""
echo "============================================="
echo "       AirQuiz - Classroom Assessment"
echo "============================================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python3 not found. Please install Python 3.9+"
    exit 1
fi

# Run the Python launcher
python3 start.py
