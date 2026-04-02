"""Master data API router."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import MasterData

router = APIRouter(prefix="/api/master", tags=["master"])

VALID_CATEGORIES = {"tech-stacks", "project-types", "business-types", "statuses", "grades", "teams", "divisions"}


class MasterItemCreate(BaseModel):
    value: str


def _get_category_or_404(category: str):
    if category not in VALID_CATEGORIES:
        raise HTTPException(status_code=404, detail=f"Unknown category: {category}")
    return category


@router.get("/tech-stacks")
def get_tech_stacks(db: Session = Depends(get_db)):
    return [r.value for r in db.query(MasterData).filter_by(category="tech-stacks").all()]


@router.get("/project-types")
def get_project_types(db: Session = Depends(get_db)):
    return [r.value for r in db.query(MasterData).filter_by(category="project-types").all()]


@router.get("/business-types")
def get_business_types(db: Session = Depends(get_db)):
    return [r.value for r in db.query(MasterData).filter_by(category="business-types").all()]


@router.get("/statuses")
def get_statuses(db: Session = Depends(get_db)):
    return [r.value for r in db.query(MasterData).filter_by(category="statuses").all()]


@router.get("/grades")
def get_grades(db: Session = Depends(get_db)):
    return [r.value for r in db.query(MasterData).filter_by(category="grades").all()]


@router.get("/divisions")
def get_divisions(db: Session = Depends(get_db)):
    return [r.value for r in db.query(MasterData).filter_by(category="divisions").order_by(MasterData.value).all()]


@router.get("/teams")
def get_teams(db: Session = Depends(get_db)):
    """Return teams as structured list with division parsed from 'division>team' format."""
    rows = db.query(MasterData).filter_by(category="teams").all()
    result = []
    for r in rows:
        if ">" in r.value:
            div, team = r.value.split(">", 1)
        else:
            div, team = "", r.value
        result.append({"id": r.id, "value": r.value, "division": div, "team": team})
    return result


@router.get("/confirmed-options")
def get_confirmed_options():
    return ["O", "X", "?", "미정"]


@router.get("/{category}/items")
def get_category_items(category: str, db: Session = Depends(get_db)):
    _get_category_or_404(category)
    rows = db.query(MasterData).filter_by(category=category).all()
    return [{"id": r.id, "value": r.value} for r in rows]


@router.post("/{category}")
def create_master_item(category: str, body: MasterItemCreate, db: Session = Depends(get_db)):
    _get_category_or_404(category)
    value = body.value.strip()
    if not value:
        raise HTTPException(status_code=400, detail="값을 입력하세요.")
    existing = db.query(MasterData).filter_by(category=category, value=value).first()
    if existing:
        raise HTTPException(status_code=400, detail="이미 존재하는 항목입니다.")
    item = MasterData(category=category, value=value)
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id, "value": item.value}


@router.put("/{category}/{item_id}")
def update_master_item(category: str, item_id: int, body: MasterItemCreate, db: Session = Depends(get_db)):
    _get_category_or_404(category)
    item = db.query(MasterData).filter_by(id=item_id, category=category).first()
    if not item:
        raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다.")
    value = body.value.strip()
    if not value:
        raise HTTPException(status_code=400, detail="값을 입력하세요.")
    dup = db.query(MasterData).filter_by(category=category, value=value).first()
    if dup and dup.id != item_id:
        raise HTTPException(status_code=400, detail="이미 존재하는 항목입니다.")
    item.value = value
    db.commit()
    return {"id": item.id, "value": item.value}


@router.delete("/{category}/{item_id}")
def delete_master_item(category: str, item_id: int, db: Session = Depends(get_db)):
    _get_category_or_404(category)
    item = db.query(MasterData).filter_by(id=item_id, category=category).first()
    if not item:
        raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다.")
    db.delete(item)
    db.commit()
    return None
