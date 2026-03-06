"""Exam file I/O — load, list, and read exam JSON files."""

import json
import os
from config import EXAMS_DIR


def list_exams() -> list:
    """Scan exams directory and return metadata for each."""
    if not os.path.exists(EXAMS_DIR):
        return []

    exams = []
    for filename in sorted(os.listdir(EXAMS_DIR)):
        if not filename.endswith(".json"):
            continue
        try:
            with open(os.path.join(EXAMS_DIR, filename), 'r', encoding='utf-8') as f:
                data = json.load(f)
                exams.append({
                    "filename": filename,
                    "title": data.get("title", filename.replace("_", " ").replace(".json", "")),
                    "questionCount": len(data.get("questions", []))
                })
        except (json.JSONDecodeError, OSError) as e:
            print(f"Skipping malformed exam file {filename}: {e}")
    return exams


def read_exam(filename: str) -> dict:
    """Read and return a single exam's JSON content.
    Filename is already sanitized by the caller."""
    path = os.path.join(EXAMS_DIR, os.path.basename(filename))
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_exam(title: str, questions: list) -> str:
    """Persist exam JSON to disk. Returns the filename."""
    safe_title = "".join(c for c in title if c.isalpha() or c.isdigit() or c == ' ').rstrip()
    filename = f"{safe_title.replace(' ', '_')}.json"
    path = os.path.join(EXAMS_DIR, filename)

    with open(path, 'w', encoding='utf-8') as f:
        json.dump({"title": title, "questions": questions}, f, indent=2)
    return filename
