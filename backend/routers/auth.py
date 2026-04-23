"""Authentication and user management router."""
import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from jose import jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from backend.database import get_db
from backend.models import User

router = APIRouter(prefix="/api/auth", tags=["auth"])

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-please-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def _user_to_dict(u: User) -> dict:
    return {
        "id": u.id,
        "username": u.username,
        "name": u.name,
        "email": u.email,
        "division": u.division,
        "team": u.team,
        "role": u.role,
    }


def _require_admin(request: Request) -> dict:
    """request.state.user가 admin인지 확인."""
    user = getattr(request.state, "user", None)
    if not user or user.get("role") != "admin":
        raise HTTPException(403, "관리자 권한이 필요합니다.")
    return user


# ── Pydantic 스키마 ─────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class UserCreate(BaseModel):
    username: str
    password: str
    name: str
    email: Optional[str] = None
    division: Optional[str] = None
    team: Optional[str] = None
    role: str = "user"


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    division: Optional[str] = None
    team: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None


# ── 엔드포인트 ──────────────────────────────────────────────────

@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """로그인: 아이디/비밀번호 검증 후 JWT 토큰 반환."""
    user = db.query(User).filter(User.username == data.username.strip()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "아이디 또는 비밀번호가 올바르지 않습니다.")
    token = create_token({
        "sub": user.username,
        "name": user.name,
        "role": user.role,
        "id": user.id,
    })
    return {"token": token, "user": _user_to_dict(user)}


@router.get("/users")
def list_users(request: Request, db: Session = Depends(get_db)):
    """사용자 목록 조회 (admin 전용)."""
    _require_admin(request)
    return [_user_to_dict(u) for u in db.query(User).order_by(User.id).all()]


@router.post("/users", status_code=201)
def create_user(data: UserCreate, request: Request, db: Session = Depends(get_db)):
    """사용자 추가 (admin 전용)."""
    _require_admin(request)
    if db.query(User).filter(User.username == data.username.strip()).first():
        raise HTTPException(409, f"'{data.username}' 아이디가 이미 존재합니다.")
    user = User(
        username=data.username.strip(),
        password_hash=hash_password(data.password),
        name=data.name.strip(),
        email=data.email or None,
        division=data.division or None,
        team=data.team or None,
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_to_dict(user)


@router.put("/users/{user_id}")
def update_user(user_id: int, data: UserUpdate, request: Request, db: Session = Depends(get_db)):
    """사용자 수정. 관리자는 모든 필드, 일반 사용자는 자신의 비밀번호만 변경 가능."""
    current = getattr(request.state, "user", None)
    if not current:
        raise HTTPException(401, "인증이 필요합니다.")
    is_admin = current.get("role") == "admin"
    is_self  = current.get("id") == user_id
    if not is_admin and not is_self:
        raise HTTPException(403, "권한이 없습니다.")

    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(404, "사용자를 찾을 수 없습니다.")

    if is_admin:
        if data.name is not None:
            user.name = data.name.strip()
        if data.email is not None:
            user.email = data.email or None
        if data.division is not None:
            user.division = data.division or None
        if data.team is not None:
            user.team = data.team or None
        if data.role is not None:
            user.role = data.role

    # 관리자/본인 모두 비밀번호 변경 가능
    if data.password:
        user.password_hash = hash_password(data.password)

    db.commit()
    return _user_to_dict(user)


@router.delete("/users/{user_id}")
def delete_user(user_id: int, request: Request, db: Session = Depends(get_db)):
    """사용자 삭제 (admin 전용, 자기 자신 삭제 불가)."""
    current = _require_admin(request)
    if current.get("id") == user_id:
        raise HTTPException(400, "자기 자신은 삭제할 수 없습니다.")
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(404, "사용자를 찾을 수 없습니다.")
    db.delete(user)
    db.commit()
    return {"ok": True}
