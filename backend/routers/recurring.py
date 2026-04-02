"""Recurring schedule CRUD API router."""
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import RecurringSchedule, Project

router = APIRouter(tags=["recurring"])


class RecurringScheduleCreate(BaseModel):
    recurrence_type: str   # "monthly" | "quarterly"
    day_of_month: int      # 1-31
    start_date: date
    end_date: Optional[date] = None
    description: Optional[str] = None


def _to_dict(r: RecurringSchedule) -> dict:
    return {
        "id": r.id,
        "project_id": r.project_id,
        "recurrence_type": r.recurrence_type,
        "day_of_month": r.day_of_month,
        "start_date": r.start_date,
        "end_date": r.end_date,
        "description": r.description,
        "created_at": r.created_at,
    }


@router.get("/api/projects/{project_id}/recurring-schedules")
def list_recurring(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).get(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    rows = db.query(RecurringSchedule).filter_by(project_id=project_id).order_by(RecurringSchedule.start_date).all()
    return [_to_dict(r) for r in rows]


@router.post("/api/projects/{project_id}/recurring-schedules", status_code=201)
def create_recurring(project_id: int, data: RecurringScheduleCreate, db: Session = Depends(get_db)):
    project = db.query(Project).get(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    if data.recurrence_type not in ("monthly", "quarterly"):
        raise HTTPException(400, "recurrence_type은 'monthly' 또는 'quarterly'여야 합니다.")
    if not (1 <= data.day_of_month <= 31):
        raise HTTPException(400, "day_of_month는 1~31 사이여야 합니다.")
    r = RecurringSchedule(
        project_id=project_id,
        recurrence_type=data.recurrence_type,
        day_of_month=data.day_of_month,
        start_date=data.start_date,
        end_date=data.end_date,
        description=data.description,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return _to_dict(r)


@router.delete("/api/recurring-schedules/{schedule_id}", status_code=204)
def delete_recurring(schedule_id: int, db: Session = Depends(get_db)):
    r = db.query(RecurringSchedule).get(schedule_id)
    if not r:
        raise HTTPException(404, "Recurring schedule not found")
    db.delete(r)
    db.commit()
    return None
