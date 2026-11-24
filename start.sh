#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1
command -v python3 >/dev/null || { echo "Python 3.9+ is required."; exit 1; }
exec python3 start.py "$@"
