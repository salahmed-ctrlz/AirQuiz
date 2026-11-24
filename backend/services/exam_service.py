"""Exam file I/O — list, read, save and delete exam JSON files."""

import json
import os
import re
import tempfile

from config import EXAMS_DIR


def safe_filename(title: str) -> str:
    """Filesystem-safe name that keeps Arabic/Unicode letters."""
    cleaned = "".join(c for c in title if c.isalnum() or c in " _-").strip()
    cleaned = re.sub(r"\s+", "_", cleaned)[:80] or "exam"
    return f"{cleaned}.json"


def resolve(filename: str) -> str | None:
    """Return the absolute path for an exam file, or None if it escapes EXAMS_DIR."""
    name = os.path.basename(filename)
    path = os.path.abspath(os.path.join(EXAMS_DIR, name))
    root = os.path.abspath(EXAMS_DIR)
    if os.path.commonpath([path, root]) != root or not name.endswith(".json"):
        return None
    return path


def list_exams() -> list:
    os.makedirs(EXAMS_DIR, exist_ok=True)
    exams = []
    for filename in sorted(os.listdir(EXAMS_DIR)):
        if not filename.endswith(".json") or filename.upper() == "TEMPLATE.JSON":
            continue
        try:
            with open(os.path.join(EXAMS_DIR, filename), "r", encoding="utf-8") as f:
                data = json.load(f)
            exams.append({
                "filename": filename,
                "title": data.get("title", filename[:-5].replace("_", " ")),
                "questionCount": len(data.get("questions", [])),
            })
        except (json.JSONDecodeError, OSError) as e:
            print(f"Skipping malformed exam file {filename}: {e}")
    return exams


def read_exam(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_exam(title: str, questions: list) -> str:
    """Atomically write the exam file; returns its filename."""
    os.makedirs(EXAMS_DIR, exist_ok=True)
    filename = safe_filename(title)
    fd, tmp = tempfile.mkstemp(dir=EXAMS_DIR, suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump({"title": title, "questions": questions}, f, indent=2, ensure_ascii=False)
    os.replace(tmp, os.path.join(EXAMS_DIR, filename))
    return filename
