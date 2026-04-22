"""Release notes / version history CRUD router."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from backend.database import get_db
from backend.models import ReleaseNote

router = APIRouter(prefix="/api/versions", tags=["versions"])


class ReleaseNoteCreate(BaseModel):
    version: str
    title: Optional[str] = None
    content: Optional[str] = None
    released_at: Optional[str] = None


class ReleaseNoteUpdate(BaseModel):
    version: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    released_at: Optional[str] = None


def _to_dict(r: ReleaseNote) -> dict:
    return {
        "id": r.id,
        "version": r.version,
        "title": r.title,
        "content": r.content,
        "released_at": r.released_at,
        "created_at": r.created_at,
    }


@router.get("")
def list_versions(db: Session = Depends(get_db)):
    rows = db.query(ReleaseNote).order_by(ReleaseNote.id.desc()).all()
    return [_to_dict(r) for r in rows]


@router.get("/{version_id}")
def get_version(version_id: int, db: Session = Depends(get_db)):
    r = db.query(ReleaseNote).get(version_id)
    if not r:
        raise HTTPException(404, "Not found")
    return _to_dict(r)


@router.post("", status_code=201)
def create_version(data: ReleaseNoteCreate, db: Session = Depends(get_db)):
    r = ReleaseNote(**data.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    return _to_dict(r)


@router.put("/{version_id}")
def update_version(version_id: int, data: ReleaseNoteUpdate, db: Session = Depends(get_db)):
    r = db.query(ReleaseNote).get(version_id)
    if not r:
        raise HTTPException(404, "Not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    db.commit()
    db.refresh(r)
    return _to_dict(r)


@router.delete("/{version_id}", status_code=204)
def delete_version(version_id: int, db: Session = Depends(get_db)):
    r = db.query(ReleaseNote).get(version_id)
    if not r:
        raise HTTPException(404, "Not found")
    db.delete(r)
    db.commit()
