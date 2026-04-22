"""Sales representative CRUD API router."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from backend.database import get_db
from backend.models import SalesRep, Project
from backend.schemas import SalesRepCreate, SalesRepUpdate

router = APIRouter(prefix="/api/sales-reps", tags=["sales-reps"])


def _rep_to_response(rep: SalesRep, db: Session) -> dict:
    """영업 담당자 → 응답 dict (담당 고객사 목록 포함)."""
    projects = (
        db.query(Project)
        .options(joinedload(Project.customer))
        .filter(Project.sales_rep_id == rep.id)
        .all()
    )
    customers = sorted({p.customer.name for p in projects if p.customer})
    return {
        "id": rep.id,
        "name": rep.name,
        "division_team": rep.division_team,
        "created_at": rep.created_at,
        "assigned_customers": customers,
    }


@router.get("")
def list_sales_reps(db: Session = Depends(get_db)):
    reps = db.query(SalesRep).order_by(SalesRep.name).all()
    return [_rep_to_response(r, db) for r in reps]


@router.get("/{rep_id}")
def get_sales_rep(rep_id: int, db: Session = Depends(get_db)):
    rep = db.query(SalesRep).get(rep_id)
    if not rep:
        raise HTTPException(404, "영업 담당자를 찾을 수 없습니다.")
    projects = (
        db.query(Project)
        .options(joinedload(Project.customer))
        .filter(Project.sales_rep_id == rep.id)
        .order_by(Project.start_date.desc())
        .all()
    )
    result = _rep_to_response(rep, db)
    result["projects"] = [
        {
            "id": p.id,
            "customer_name": p.customer.name if p.customer else "",
            "name": p.name,
            "start_date": str(p.start_date) if p.start_date else "",
            "end_date": str(p.end_date) if p.end_date else "",
            "project_type": p.project_type or "",
            "business_type": p.business_type or "",
            "budget": p.budget,
            "status": p.status or "",
        }
        for p in projects
    ]
    return result


@router.post("", status_code=201)
def create_sales_rep(data: SalesRepCreate, db: Session = Depends(get_db)):
    rep = SalesRep(name=data.name, division_team=data.division_team)
    db.add(rep)
    db.commit()
    db.refresh(rep)
    return _rep_to_response(rep, db)


@router.put("/{rep_id}")
def update_sales_rep(rep_id: int, data: SalesRepUpdate, db: Session = Depends(get_db)):
    rep = db.query(SalesRep).get(rep_id)
    if not rep:
        raise HTTPException(404, "영업 담당자를 찾을 수 없습니다.")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(rep, key, val)
    db.commit()
    return _rep_to_response(rep, db)


@router.delete("/{rep_id}", status_code=204)
def delete_sales_rep(rep_id: int, db: Session = Depends(get_db)):
    rep = db.query(SalesRep).get(rep_id)
    if not rep:
        raise HTTPException(404, "영업 담당자를 찾을 수 없습니다.")
    db.delete(rep)
    db.commit()
