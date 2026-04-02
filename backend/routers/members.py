"""Member CRUD API router."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from backend.database import get_db
from backend.models import Member, MemberSkill, Assignment
from backend.schemas import MemberCreate, MemberUpdate

router = APIRouter(prefix="/api/members", tags=["members"])


def _member_to_response(m: Member) -> dict:
    return {
        "id": m.id,
        "name": m.name,
        "division": m.division,
        "team": m.team,
        "years_of_experience": m.years_of_experience,
        "grade": m.grade,
        "skills": [{"id": s.id, "tech_stack": s.tech_stack} for s in m.skills],
        "created_at": m.created_at,
    }


@router.get("")
def list_members(db: Session = Depends(get_db)):
    members = db.query(Member).options(joinedload(Member.skills)).order_by(Member.name).all()
    return [_member_to_response(m) for m in members]


@router.get("/{member_id}")
def get_member(member_id: int, db: Session = Depends(get_db)):
    m = db.query(Member).options(
        joinedload(Member.skills),
        joinedload(Member.assignments),
    ).get(member_id)
    if not m:
        raise HTTPException(404, "Member not found")
    resp = _member_to_response(m)
    resp["assignments"] = [
        {
            "id": a.id,
            "project_id": a.project_id,
            "member_id": a.member_id,
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
        }
        for a in m.assignments
    ]
    return resp


@router.get("/{member_id}/schedule")
def get_member_schedule(member_id: int, year: Optional[int] = None, db: Session = Depends(get_db)):
    """Get monthly schedule for a member."""
    m = db.query(Member).get(member_id)
    if not m:
        raise HTTPException(404, "Member not found")
    q = db.query(Assignment).filter(Assignment.member_id == member_id)
    if year:
        q = q.filter(Assignment.start_date <= f"{year}-12-31", Assignment.end_date >= f"{year}-01-01")
    assignments = q.options(joinedload(Assignment.project)).all()
    schedule = []
    for a in assignments:
        for alloc in a.monthly_allocations:
            schedule.append({
                "assignment_id": a.id,
                "project_name": a.project.name if a.project else None,
                "customer_name": a.project.customer.name if a.project and a.project.customer else None,
                "year": alloc.year,
                "month": alloc.month,
                "allocation": alloc.allocation,
            })
    return schedule


@router.post("", status_code=201)
def create_member(data: MemberCreate, db: Session = Depends(get_db)):
    member = Member(name=data.name, division=data.division, team=data.team, years_of_experience=data.years_of_experience, grade=data.grade)
    db.add(member)
    db.flush()
    for skill in data.skills:
        db.add(MemberSkill(member_id=member.id, tech_stack=skill))
    db.commit()
    db.refresh(member)
    return _member_to_response(
        db.query(Member).options(joinedload(Member.skills)).get(member.id)
    )


@router.put("/{member_id}")
def update_member(member_id: int, data: MemberUpdate, db: Session = Depends(get_db)):
    member = db.query(Member).get(member_id)
    if not member:
        raise HTTPException(404, "Member not found")
    update_data = data.model_dump(exclude_unset=True)
    skills = update_data.pop("skills", None)
    for key, val in update_data.items():
        setattr(member, key, val)
    if skills is not None:
        db.query(MemberSkill).filter(MemberSkill.member_id == member_id).delete()
        for skill in skills:
            db.add(MemberSkill(member_id=member_id, tech_stack=skill))
    db.commit()
    return _member_to_response(
        db.query(Member).options(joinedload(Member.skills)).get(member_id)
    )


@router.delete("/{member_id}")
def delete_member(member_id: int, db: Session = Depends(get_db)):
    member = db.query(Member).get(member_id)
    if not member:
        raise HTTPException(404, "Member not found")
    db.delete(member)
    db.commit()
    return {"ok": True}
