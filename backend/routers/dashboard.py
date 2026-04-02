"""Dashboard / integrated view API router."""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func
from backend.database import get_db
from backend.models import (
    Project, Customer, Assignment, Member,
    MonthlyAllocation, ProjectTechStack, AssignmentPeriod
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/project-overview")
def project_overview(
    year: Optional[int] = None,
    confirmed: Optional[str] = None,
    tech_stack: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Project overview with monthly allocations for Gantt chart display."""
    q = (
        db.query(Project)
        .options(
            joinedload(Project.customer),
            joinedload(Project.tech_stacks),
            selectinload(Project.assignments).joinedload(Assignment.member),
            selectinload(Project.assignments).joinedload(Assignment.monthly_allocations),
            selectinload(Project.assignments).selectinload(Assignment.periods),
        )
    )
    if confirmed:
        q = q.filter(Project.confirmed == confirmed)
    if status:
        q = q.filter(Project.status == status)
    if year:
        q = q.filter(
            Project.start_date <= f"{year}-12-31",
            Project.end_date >= f"{year}-01-01",
        )

    projects = q.order_by(Project.customer_id, Project.id).all()

    if tech_stack:
        projects = [
            p for p in projects
            if any(ts.tech_stack == tech_stack for ts in p.tech_stacks)
        ]

    result = []
    for p in projects:
        assignments_data = []
        for a in p.assignments:
            allocations = {
                f"{ma.year}-{ma.month:02d}": ma.allocation
                for ma in a.monthly_allocations
            }
            assignments_data.append({
                "id": a.id,
                "member_id": a.member_id,
                "member_name": a.member.name if a.member else None,
                "start_date": str(a.start_date) if a.start_date else None,
                "end_date": str(a.end_date) if a.end_date else None,
                "man_month": a.man_month,
                "role_description": a.role_description,
                "tech_stack": a.tech_stack,
                "grade_required": a.grade_required,
                "monthly_allocations": allocations,
                "periods": [
                    {"start_date": str(p.start_date), "end_date": str(p.end_date)}
                    for p in sorted(a.periods, key=lambda p: p.start_date)
                ],
            })
        result.append({
            "id": p.id,
            "customer_name": p.customer.name if p.customer else None,
            "name": p.name,
            "budget": p.budget,
            "project_type": p.project_type,
            "business_type": p.business_type,
            "status": p.status,
            "confirmed": p.confirmed,
            "start_date": str(p.start_date) if p.start_date else None,
            "end_date": str(p.end_date) if p.end_date else None,
            "tech_stacks": [ts.tech_stack for ts in p.tech_stacks],
            "notes": p.notes,
            "assignments": assignments_data,
        })
    return result


@router.get("/member-overview")
def member_overview(
    year: Optional[int] = None,
    grade: Optional[str] = None,
    tech_stack: Optional[str] = None,
    team: Optional[str] = None,
    division: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Member overview with monthly project assignments for timeline view."""
    q = db.query(Member).options(
        joinedload(Member.skills),
        selectinload(Member.assignments).joinedload(Assignment.project).joinedload(Project.customer),
        selectinload(Member.assignments).joinedload(Assignment.monthly_allocations),
        selectinload(Member.assignments).selectinload(Assignment.periods),
    )
    if grade:
        q = q.filter(Member.grade == grade)
    if team:
        q = q.filter(Member.team == team)
    if division:
        q = q.filter(Member.division == division)
    members = q.order_by(Member.name).all()

    if tech_stack:
        members = [
            m for m in members
            if any(s.tech_stack == tech_stack for s in m.skills)
        ]

    result = []
    for m in members:
        monthly_data = {}  # "YYYY-MM" -> [{project, allocation}]
        for a in m.assignments:
            for ma in a.monthly_allocations:
                if year and ma.year != year:
                    continue
                key = f"{ma.year}-{ma.month:02d}"
                if key not in monthly_data:
                    monthly_data[key] = []
                monthly_data[key].append({
                    "assignment_id": a.id,
                    "project_id": a.project_id,
                    "project_name": a.project.name if a.project else None,
                    "customer_name": a.project.customer.name if a.project and a.project.customer else None,
                    "allocation": ma.allocation,
                    "tech_stack": a.tech_stack,
                    "start_date": str(a.start_date) if a.start_date else None,
                    "end_date": str(a.end_date) if a.end_date else None,
                    "periods": [
                        {"start_date": str(p.start_date), "end_date": str(p.end_date)}
                        for p in sorted(a.periods, key=lambda p: p.start_date)
                    ],
                })
        result.append({
            "id": m.id,
            "name": m.name,
            "division": m.division,
            "team": m.team,
            "grade": m.grade,
            "years_of_experience": m.years_of_experience,
            "skills": [s.tech_stack for s in m.skills],
            "monthly_data": monthly_data,
        })
    return result


@router.get("/monthly-summary")
def monthly_summary(year: int, db: Session = Depends(get_db)):
    """Monthly total allocation summary."""
    rows = (
        db.query(
            MonthlyAllocation.month,
            func.sum(MonthlyAllocation.allocation).label("total"),
            func.count(func.distinct(MonthlyAllocation.assignment_id)).label("assignment_count"),
        )
        .filter(MonthlyAllocation.year == year)
        .group_by(MonthlyAllocation.month)
        .order_by(MonthlyAllocation.month)
        .all()
    )
    return [{"month": r.month, "total_allocation": r.total, "assignment_count": r.assignment_count} for r in rows]


@router.get("/member-utilization")
def member_utilization(year: int, month: int, db: Session = Depends(get_db)):
    """Per-member utilization for a specific month."""
    members = db.query(Member).options(joinedload(Member.assignments)).all()
    result = []
    for m in members:
        total = 0.0
        for a in m.assignments:
            for ma in a.monthly_allocations:
                if ma.year == year and ma.month == month:
                    total += ma.allocation
        result.append({
            "member_id": m.id,
            "member_name": m.name,
            "total_allocation": round(total, 2),
            "is_overloaded": total > 1.0,
            "available": round(max(0, 1.0 - total), 2),
        })
    return result
