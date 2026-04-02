"""Project CRUD API router."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload, selectinload
from backend.database import get_db
from backend.models import Project, ProjectTechStack, Customer, RecurringSchedule, Assignment, AssignmentPeriod
from backend.schemas import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectDetailResponse
)

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _project_to_response(p: Project) -> dict:
    """Convert project ORM object to response dict."""
    return {
        "id": p.id,
        "customer_id": p.customer_id,
        "customer_name": p.customer.name if p.customer else None,
        "name": p.name,
        "start_date": p.start_date,
        "end_date": p.end_date,
        "project_type": p.project_type,
        "business_type": p.business_type,
        "status": p.status,
        "budget": p.budget,
        "confirmed": p.confirmed,
        "notes": p.notes,
        "project_url": p.project_url,
        "document_url": p.document_url,
        "description": p.description,
        "tech_stacks": [{"id": ts.id, "tech_stack": ts.tech_stack} for ts in p.tech_stacks],
        "created_at": p.created_at,
        "updated_at": p.updated_at,
    }


@router.get("")
def list_projects(
    customer_id: Optional[int] = None,
    project_type: Optional[str] = None,
    status: Optional[str] = None,
    tech_stack: Optional[str] = None,
    year: Optional[int] = None,
    confirmed: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Project).options(
        joinedload(Project.customer),
        joinedload(Project.tech_stacks),
    )
    if customer_id:
        q = q.filter(Project.customer_id == customer_id)
    if project_type:
        q = q.filter(Project.project_type == project_type)
    if status:
        q = q.filter(Project.status == status)
    if confirmed:
        q = q.filter(Project.confirmed == confirmed)
    if year:
        q = q.filter(
            ((Project.start_date != None) & (Project.start_date <= f"{year}-12-31")) &
            ((Project.end_date != None) & (Project.end_date >= f"{year}-01-01"))
        )
    projects = q.order_by(Project.id).all()

    if tech_stack:
        projects = [
            p for p in projects
            if any(ts.tech_stack == tech_stack for ts in p.tech_stacks)
        ]

    return [_project_to_response(p) for p in projects]


@router.get("/{project_id}")
def get_project(project_id: int, db: Session = Depends(get_db)):
    p = db.query(Project).options(
        joinedload(Project.customer),
        joinedload(Project.tech_stacks),
        selectinload(Project.assignments).joinedload(Assignment.member),
        selectinload(Project.assignments).selectinload(Assignment.periods),
        selectinload(Project.recurring_schedules),
    ).get(project_id)
    if not p:
        raise HTTPException(404, "Project not found")
    resp = _project_to_response(p)
    resp["assignments"] = [
        {
            "id": a.id,
            "project_id": a.project_id,
            "member_id": a.member_id,
            "member_name": a.member.name if a.member else None,
            "start_date": a.start_date,
            "end_date": a.end_date,
            "man_month": a.man_month,
            "role_description": a.role_description,
            "tech_stack": a.tech_stack,
            "grade_required": a.grade_required,
            "notes": a.notes,
            "created_at": a.created_at,
            "periods": [
                {"id": prd.id, "start_date": prd.start_date, "end_date": prd.end_date, "man_month": prd.man_month}
                for prd in sorted(a.periods, key=lambda x: x.start_date)
            ],
        }
        for a in p.assignments
    ]
    resp["recurring_schedules"] = [
        {
            "id": r.id,
            "recurrence_type": r.recurrence_type,
            "day_of_month": r.day_of_month,
            "start_date": r.start_date,
            "end_date": r.end_date,
            "description": r.description,
        }
        for r in sorted(p.recurring_schedules, key=lambda r: r.start_date)
    ]
    return resp


@router.post("", status_code=201)
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(
        customer_id=data.customer_id,
        name=data.name,
        start_date=data.start_date,
        end_date=data.end_date,
        project_type=data.project_type,
        business_type=data.business_type,
        status=data.status,
        budget=data.budget,
        confirmed=data.confirmed,
        notes=data.notes,
        project_url=data.project_url,
        document_url=data.document_url,
        description=data.description,
    )
    db.add(project)
    db.flush()
    for ts in data.tech_stacks:
        db.add(ProjectTechStack(project_id=project.id, tech_stack=ts))
    db.commit()
    db.refresh(project)
    return _project_to_response(
        db.query(Project).options(
            joinedload(Project.customer),
            joinedload(Project.tech_stacks),
        ).get(project.id)
    )


@router.put("/{project_id}")
def update_project(project_id: int, data: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(Project).get(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    update_data = data.model_dump(exclude_unset=True)
    tech_stacks = update_data.pop("tech_stacks", None)
    for key, val in update_data.items():
        setattr(project, key, val)
    if tech_stacks is not None:
        db.query(ProjectTechStack).filter(ProjectTechStack.project_id == project_id).delete()
        for ts in tech_stacks:
            db.add(ProjectTechStack(project_id=project_id, tech_stack=ts))
    db.commit()
    return _project_to_response(
        db.query(Project).options(
            joinedload(Project.customer),
            joinedload(Project.tech_stacks),
        ).get(project_id)
    )


@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).get(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    db.delete(project)
    db.commit()
    return {"ok": True}
