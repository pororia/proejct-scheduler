"""SQLite database connection and initialization."""
import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "data", "scheduler.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)

# Enable WAL mode and foreign keys
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency for FastAPI endpoints."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


MASTER_DATA_DEFAULTS = {
    "tech-stacks": [
        "OpenStack", "Kubernetes", "DevOps", "Containerize", "NKP",
        "Linux OS", "CI/CD", "Ceph", "Harvester", "인프라", "외주개발",
    ],
    "project-types": ["프로젝트", "PoC", "BMT", "유지보수"],
    "business-types": [
        "신규구축", "고도화", "업그레이드", "컨설팅", "유지보수",
        "상주 유지보수", "구축", "마이그레이션", "컨설팅 및 구축", "상주 지원",
    ],
    "statuses": ["시작전", "미정", "진행중", "완료"],
    "grades": ["초급", "중급", "고급", "특급"],
}


def init_db():
    """Create all tables and seed default master data."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    from backend.models import (
        Customer, Project, ProjectTechStack,
        Member, MemberSkill, Assignment, AssignmentPeriod, MonthlyAllocation,
        RecurringSchedule, MasterData, User
    )
    Base.metadata.create_all(bind=engine)

    # 기존 DB에 새 컬럼이 없으면 추가 (마이그레이션)
    with engine.connect() as conn:
        members_cols = [row[1] for row in conn.execute(
            __import__('sqlalchemy').text("PRAGMA table_info(members)")
        )]
        if "team" not in members_cols:
            conn.execute(__import__('sqlalchemy').text("ALTER TABLE members ADD COLUMN team TEXT"))
            conn.commit()
        if "division" not in members_cols:
            conn.execute(__import__('sqlalchemy').text("ALTER TABLE members ADD COLUMN division TEXT"))
            conn.commit()

        projects_cols = [row[1] for row in conn.execute(
            __import__('sqlalchemy').text("PRAGMA table_info(projects)")
        )]
        if "description" not in projects_cols:
            conn.execute(__import__('sqlalchemy').text("ALTER TABLE projects ADD COLUMN description TEXT"))
            conn.commit()
        if "project_url" not in projects_cols:
            conn.execute(__import__('sqlalchemy').text("ALTER TABLE projects ADD COLUMN project_url TEXT"))
            conn.commit()
        if "document_url" not in projects_cols:
            conn.execute(__import__('sqlalchemy').text("ALTER TABLE projects ADD COLUMN document_url TEXT"))
            conn.commit()
        if "sales_rep" not in projects_cols:
            conn.execute(__import__('sqlalchemy').text("ALTER TABLE projects ADD COLUMN sales_rep TEXT"))
            conn.commit()

    db = SessionLocal()
    try:
        # 마스터 데이터 시딩
        if db.query(MasterData).count() == 0:
            for category, values in MASTER_DATA_DEFAULTS.items():
                for value in values:
                    db.add(MasterData(category=category, value=value))
            db.commit()

        # admin 계정 시딩 (없을 경우에만)
        if db.query(User).filter(User.username == "admin").first() is None:
            from passlib.context import CryptContext
            _pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
            db.add(User(
                username="admin",
                password_hash=_pwd.hash("admin1234"),
                name="관리자",
                division=None,
                team=None,
                role="admin",
            ))
            db.commit()
    finally:
        db.close()
