"""CSV export service — generates UTF-8-BOM CSV for Excel compatibility."""

import csv
import io
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from models import Student, Metadata


def generate_csv(db: Session, room_id: Optional[str] = None) -> tuple[str, str]:
    """Build CSV content and filename. Returns (csv_text, filename)."""
    institution = db.query(Metadata).filter(Metadata.key == "institution_name").first()
    subject = db.query(Metadata).filter(Metadata.key == "subject_name").first()
    year = db.query(Metadata).filter(Metadata.key == "year").first()

    query = db.query(Student)
    if room_id:
        query = query.filter(Student.room_id == room_id)
    students = query.order_by(Student.group, Student.last_name).all()

    output = io.StringIO()
    output.write('\ufeff')  # BOM for Excel
    writer = csv.writer(output)

    writer.writerow(['Institution', 'Subject', 'Year', 'Room ID'])
    writer.writerow([
        institution.value if institution else "N/A",
        subject.value if subject else "N/A",
        year.value if year else "N/A",
        room_id or "All"
    ])
    writer.writerow([])
    writer.writerow(['Group', 'Last Name', 'First Name', 'Score', 'Status', 'Last Active'])

    for s in students:
        writer.writerow([
            s.group.value if hasattr(s.group, 'value') else str(s.group),
            s.last_name,
            s.first_name,
            s.score,
            "Online" if s.is_online else "Offline",
            s.last_active.strftime('%Y-%m-%d %H:%M:%S') if s.last_active else 'N/A'
        ])

    ts = datetime.now().strftime('%H%M')
    filename = f"Results_{room_id}_{ts}.csv" if room_id else f"All_Results_{ts}.csv"
    return output.getvalue(), filename
