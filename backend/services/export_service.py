"""CSV export of student results (UTF-8 BOM so Excel opens Arabic correctly)."""

import csv
import io
from datetime import datetime

from models import Metadata, Student
from sqlalchemy.orm import Session


def _safe(value) -> str:
    """Neutralise spreadsheet formula injection (=, +, -, @ prefixes)."""
    text = "" if value is None else str(value)
    return "'" + text if text[:1] in ("=", "+", "-", "@", "\t", "\r") else text


def _meta(db: Session, key: str) -> str:
    row = db.query(Metadata).filter(Metadata.key == key).first()
    return row.value if row else "N/A"


def build_csv(db: Session, room_id: str | None) -> tuple[str, str]:
    query = db.query(Student)
    if room_id:
        query = query.filter(Student.room_id == room_id)
    students = query.order_by(Student.group, Student.last_name).all()

    out = io.StringIO()
    out.write("﻿")
    w = csv.writer(out)
    w.writerow(["Institution", "Subject", "Year", "Room ID"])
    w.writerow([_safe(_meta(db, "institution_name")), _safe(_meta(db, "subject_name")),
                _safe(_meta(db, "year")), _safe(room_id or "All")])
    w.writerow([])
    w.writerow(["Group", "Last Name", "First Name", "Email", "Score", "Out Of", "Percent", "Answered", "Last Active"])
    for s in students:
        total = len(s.assigned_questions or [])
        answered = len(s.responses)
        pct = f"{round(100 * s.score / total)}%" if total else "N/A"
        w.writerow([
            s.group.value if hasattr(s.group, "value") else str(s.group),
            _safe(s.last_name), _safe(s.first_name), _safe(s.email or ""),
            s.score, total or "N/A", pct, answered,
            s.last_active.strftime("%Y-%m-%d %H:%M:%S") if s.last_active else "N/A",
        ])

    ts = datetime.now().strftime("%Y%m%d_%H%M")
    name = f"Results_{room_id}_{ts}.csv" if room_id else f"All_Results_{ts}.csv"
    return out.getvalue(), name
