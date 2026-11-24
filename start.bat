@echo off
title AirQuiz
cd /d "%~dp0"
where py >nul 2>&1 && (py -3 start.py %* & goto :end)
where python >nul 2>&1 && (python start.py %* & goto :end)
echo Python was not found. Install it from https://www.python.org/downloads/ (tick "Add to PATH"),
echo or download the ready-made AirQuiz.exe from the Releases page.
pause
:end
