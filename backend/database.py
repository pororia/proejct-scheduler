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
        RecurringSchedule, MasterData, User, SalesRep, ReleaseNote
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
        if "email" not in members_cols:
            conn.execute(__import__('sqlalchemy').text("ALTER TABLE members ADD COLUMN email TEXT"))
            conn.commit()

        users_cols = [row[1] for row in conn.execute(
            __import__('sqlalchemy').text("PRAGMA table_info(users)")
        )]
        if "email" not in users_cols:
            conn.execute(__import__('sqlalchemy').text("ALTER TABLE users ADD COLUMN email TEXT"))
            conn.commit()

        sales_reps_cols = [row[1] for row in conn.execute(
            __import__('sqlalchemy').text("PRAGMA table_info(sales_reps)")
        )]
        if "email" not in sales_reps_cols:
            conn.execute(__import__('sqlalchemy').text("ALTER TABLE sales_reps ADD COLUMN email TEXT"))
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
        if "sales_rep_id" not in projects_cols:
            conn.execute(__import__('sqlalchemy').text("ALTER TABLE projects ADD COLUMN sales_rep_id INTEGER REFERENCES sales_reps(id) ON DELETE SET NULL"))
            conn.commit()

    db = SessionLocal()
    try:
        # 마스터 데이터 시딩
        if db.query(MasterData).count() == 0:
            for category, values in MASTER_DATA_DEFAULTS.items():
                for value in values:
                    db.add(MasterData(category=category, value=value))
            db.commit()

        # v0.5 릴리즈 노트 시딩
        if db.query(ReleaseNote).filter(ReleaseNote.version == "v0.5").first() is None:
            db.add(ReleaseNote(
                version="v0.5",
                title="기능 개선 및 버그 수정",
                released_at="2026-04-22",
                content="""<h3>버그 수정</h3>
<p><strong>프로젝트 현황 M/D 합계 오류 수정</strong></p>
<ul>
<li>monthly_allocations 레코드가 누락된 월도 투입 기간이 해당 월을 포함하면 자동으로 1.0 할당률을 적용하도록 수정</li>
<li>수정 대상: 행별 M/D 합계, 열 합계(colSumsMM), KPI 카드 M/D 세 곳 모두 동일한 폴백 로직 적용</li>
</ul>
<h3>기능 개선</h3>
<p><strong>프로젝트 현황 M/M 계산 방식 변경</strong></p>
<ul>
<li>담당자별 M/M 합계 계산 시 월별 M/D가 20일 이상인 달은 1.0 M/M으로 캡 처리</li>
<li>기존: 전체 M/D ÷ 20 단순 합산 → 변경: 월별 min(1.0, M/D ÷ 20) 합산</li>
</ul>
<p><strong>검색창 추가 (전체 5개 화면)</strong></p>
<p>각 화면에 검색 항목 셀렉트박스 + 검색어 입력 방식의 검색창 추가</p>
<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%">
<thead><tr><th>화면</th><th>검색 항목</th></tr></thead>
<tbody>
<tr><td>프로젝트 현황</td><td>프로젝트명 / 고객사 / 담당 영업 / 담당자명</td></tr>
<tr><td>인력 현황</td><td>담당자명 / 프로젝트명 / 고객사</td></tr>
<tr><td>프로젝트 관리</td><td>프로젝트명 / 고객사 / 담당 영업</td></tr>
<tr><td>인력 관리</td><td>이름 / 사업부 / 팀명 / 업무영역</td></tr>
<tr><td>영업 담당자 관리</td><td>담당자명 / 사업부/팀 / 고객사</td></tr>
</tbody>
</table>
<p><strong>인력 배정 추가·수정 — 담당자 검색형 드롭다운</strong></p>
<ul>
<li>기존 select → 검색 입력 + 드롭다운 방식으로 교체</li>
<li>포커스 시 전체 목록 표시, 입력 시 실시간 필터링</li>
<li>표시 형식: 이름(등급) / 사업부 - 팀명</li>
</ul>
<p><strong>프로젝트 추가·수정 — 담당 영업 검색형 드롭다운</strong></p>
<ul>
<li>기존 select → 검색 입력 + 드롭다운 방식으로 교체</li>
<li>포커스 시 전체 목록 표시("선택 안 함" 포함), 입력 시 실시간 필터링</li>
<li>표시 형식: 이름 / 사업부 - 팀명</li>
</ul>
<p><strong>인력 관리 — 담당 사업부 필터 위치 및 디자인 개선</strong></p>
<ul>
<li>사업부 칩 버튼을 필터 바와 인력 목록 테이블 사이로 위치 이동</li>
<li>다른 화면과 동일하게 "담당 사업부" 타이틀 + 테두리 컨테이너 스타일 적용</li>
</ul>"""
            ))
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
