"""Assignment CRUD API router."""
from datetime import date as date_type
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload, selectinload
from backend.database import get_db
from backend.models import Assignment, AssignmentPeriod, MonthlyAllocation, Project, Member
from backend.schemas import AssignmentCreate, AssignmentUpdate

router = APIRouter(tags=["assignments"])


# ── 기간 스키마 ────────────────────────────────────────────────
class PeriodCreate(BaseModel):
    start_date: date_type
    end_date: date_type
    man_month: Optional[float] = None


# ── 헬퍼 ─────────────────────────────────────────────────────

def _auto_create_allocations(db: Session, assignment: Assignment):
    """기간 목록(AssignmentPeriod)을 기준으로 월별 할당 레코드를 재생성한다.
    기간이 없으면 assignment.start_date / end_date를 fallback으로 사용."""
    db.query(MonthlyAllocation).filter(MonthlyAllocation.assignment_id == assignment.id).delete()

    periods = sorted(assignment.periods, key=lambda p: p.start_date)
    if not periods:
        if assignment.start_date and assignment.end_date:
            periods_ranges = [(assignment.start_date, assignment.end_date)]
        else:
            return
    else:
        periods_ranges = [(p.start_date, p.end_date) for p in periods]

    # 모든 기간의 합집합 월을 수집
    covered: set[tuple[int, int]] = set()
    for start, end in periods_ranges:
        y, m = start.year, start.month
        while (y, m) <= (end.year, end.month):
            covered.add((y, m))
            m += 1
            if m > 12:
                m = 1
                y += 1

    for y, m in sorted(covered):
        db.add(MonthlyAllocation(assignment_id=assignment.id, year=y, month=m, allocation=1.0))
    db.flush()


def _sync_assignment_dates(db: Session, assignment: Assignment):
    """periods 변경 후 assignment의 start/end/man_month를 동기화한다."""
    periods = db.query(AssignmentPeriod).filter_by(assignment_id=assignment.id).all()
    if periods:
        assignment.start_date = min(p.start_date for p in periods)
        assignment.end_date   = max(p.end_date   for p in periods)
        total_mm = sum(p.man_month or 0 for p in periods)
        assignment.man_month = total_mm if total_mm > 0 else None


def _period_dict(p: AssignmentPeriod) -> dict:
    return {
        "id": p.id,
        "start_date": str(p.start_date) if p.start_date else None,
        "end_date": str(p.end_date) if p.end_date else None,
        "man_month": p.man_month,
    }


def _assignment_to_response(a: Assignment) -> dict:
    return {
        "id": a.id,
        "project_id": a.project_id,
        "member_id": a.member_id,
        "member_name": a.member.name if a.member else None,
        "project_name": a.project.name if a.project else None,
        "customer_name": a.project.customer.name if a.project and a.project.customer else None,
        "start_date": a.start_date,
        "end_date": a.end_date,
        "man_month": a.man_month,
        "role_description": a.role_description,
        "tech_stack": a.tech_stack,
        "grade_required": a.grade_required,
        "notes": a.notes,
        "created_at": a.created_at,
        "periods": [_period_dict(p) for p in sorted(a.periods, key=lambda p: p.start_date)],
        "monthly_allocations": [
            {"id": ma.id, "year": ma.year, "month": ma.month, "allocation": ma.allocation}
            for ma in a.monthly_allocations
        ] if a.monthly_allocations else [],
    }


def _load_assignment(db: Session, assignment_id: int) -> Assignment:
    return db.query(Assignment).options(
        joinedload(Assignment.member),
        joinedload(Assignment.project).joinedload(Project.customer),
        selectinload(Assignment.monthly_allocations),
        selectinload(Assignment.periods),
    ).get(assignment_id)


# ── Assignment CRUD ───────────────────────────────────────────

@router.get("/api/projects/{project_id}/assignments")
def list_project_assignments(project_id: int, db: Session = Depends(get_db)):
    assignments = (
        db.query(Assignment)
        .filter(Assignment.project_id == project_id)
        .options(
            joinedload(Assignment.member),
            joinedload(Assignment.project).joinedload(Project.customer),
            selectinload(Assignment.monthly_allocations),
            selectinload(Assignment.periods),
        )
        .all()
    )
    return [_assignment_to_response(a) for a in assignments]


@router.post("/api/projects/{project_id}/assignments", status_code=201)
def create_assignment(project_id: int, data: AssignmentCreate, db: Session = Depends(get_db)):
    if not db.query(Project).get(project_id):
        raise HTTPException(404, "Project not found")
    if not db.query(Member).get(data.member_id):
        raise HTTPException(404, "Member not found")

    assignment = Assignment(
        project_id=project_id,
        member_id=data.member_id,
        start_date=data.start_date,
        end_date=data.end_date,
        man_month=data.man_month,
        role_description=data.role_description,
        tech_stack=data.tech_stack,
        grade_required=data.grade_required,
        notes=data.notes,
    )
    db.add(assignment)
    db.flush()

    # 최초 기간 자동 생성
    if data.start_date and data.end_date:
        db.add(AssignmentPeriod(
            assignment_id=assignment.id,
            start_date=data.start_date,
            end_date=data.end_date,
            man_month=data.man_month,
        ))
        db.flush()

    _auto_create_allocations(db, _load_assignment(db, assignment.id))
    db.commit()
    return _assignment_to_response(_load_assignment(db, assignment.id))


@router.put("/api/assignments/{assignment_id}")
def update_assignment(assignment_id: int, data: AssignmentUpdate, db: Session = Depends(get_db)):
    assignment = db.query(Assignment).get(assignment_id)
    if not assignment:
        raise HTTPException(404, "Assignment not found")
    update_data = data.model_dump(exclude_unset=True)
    # start/end/man_month는 periods에서 관리하므로 메타데이터만 업데이트
    for key in ("member_id", "role_description", "tech_stack", "grade_required", "notes"):
        if key in update_data:
            setattr(assignment, key, update_data[key])
    db.commit()
    return _assignment_to_response(_load_assignment(db, assignment_id))


@router.delete("/api/assignments/{assignment_id}")
def delete_assignment(assignment_id: int, db: Session = Depends(get_db)):
    assignment = db.query(Assignment).get(assignment_id)
    if not assignment:
        raise HTTPException(404, "Assignment not found")
    db.delete(assignment)
    db.commit()
    return {"ok": True}


# ── AssignmentPeriod CRUD ─────────────────────────────────────

@router.post("/api/assignments/{assignment_id}/periods", status_code=201)
def create_period(assignment_id: int, data: PeriodCreate, db: Session = Depends(get_db)):
    assignment = db.query(Assignment).options(joinedload(Assignment.periods)).get(assignment_id)
    if not assignment:
        raise HTTPException(404, "Assignment not found")

    period = AssignmentPeriod(
        assignment_id=assignment_id,
        start_date=data.start_date,
        end_date=data.end_date,
        man_month=data.man_month,
    )
    db.add(period)
    db.flush()

    a = _load_assignment(db, assignment_id)
    _sync_assignment_dates(db, a)
    _auto_create_allocations(db, a)
    db.commit()
    return _period_dict(db.query(AssignmentPeriod).get(period.id))


@router.put("/api/assignment-periods/{period_id}")
def update_period(period_id: int, data: PeriodCreate, db: Session = Depends(get_db)):
    period = db.query(AssignmentPeriod).get(period_id)
    if not period:
        raise HTTPException(404, "Period not found")
    assignment_id = period.assignment_id
    period.start_date = data.start_date
    period.end_date = data.end_date
    period.man_month = data.man_month
    db.flush()

    a = _load_assignment(db, assignment_id)
    _sync_assignment_dates(db, a)
    _auto_create_allocations(db, a)
    db.commit()
    return _period_dict(db.query(AssignmentPeriod).get(period_id))


@router.post("/api/assignments/{assignment_id}/rebuild-allocations")
def rebuild_allocations(assignment_id: int, db: Session = Depends(get_db)):
    """periods 기준으로 monthly_allocations를 재생성한다."""
    a = _load_assignment(db, assignment_id)
    if not a:
        raise HTTPException(404, "Assignment not found")
    _auto_create_allocations(db, a)
    db.commit()
    return {"ok": True, "allocations": [
        {"year": ma.year, "month": ma.month, "allocation": ma.allocation}
        for ma in sorted(a.monthly_allocations, key=lambda x: (x.year, x.month))
    ]}


@router.delete("/api/assignment-periods/{period_id}", status_code=204)
def delete_period(period_id: int, db: Session = Depends(get_db)):
    period = db.query(AssignmentPeriod).get(period_id)
    if not period:
        raise HTTPException(404, "Period not found")
    assignment_id = period.assignment_id
    db.delete(period)
    db.flush()

    a = _load_assignment(db, assignment_id)
    _sync_assignment_dates(db, a)
    _auto_create_allocations(db, a)
    db.commit()
    return None


# ── Monthly Allocation ────────────────────────────────────────

@router.put("/api/allocations/{allocation_id}")
def update_allocation(allocation_id: int, allocation: float, db: Session = Depends(get_db)):
    alloc = db.query(MonthlyAllocation).get(allocation_id)
    if not alloc:
        raise HTTPException(404, "Allocation not found")
    alloc.allocation = allocation
    db.commit()
    return {"id": alloc.id, "year": alloc.year, "month": alloc.month, "allocation": alloc.allocation}
