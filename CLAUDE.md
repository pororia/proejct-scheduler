# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About This Project

프로젝트 구축/유지보수 팀의 인력 투입 일정을 관리하는 웹 어플리케이션.
Excel로 관리 중인 프로젝트 현황표와 인력현황을 웹 기반으로 전환하는 것이 목표.

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3 — 프레임워크 없음
- **Backend**: Python 3.x + FastAPI
- **Database**: SQLite (WAL 모드 + foreign_keys ON)
- **ORM**: SQLAlchemy 2.x
- **Validation**: Pydantic 2.x
- **Dev OS**: Windows (로컬) / **Prod OS**: Ubuntu Linux

## Common Commands

```bash
# 가상환경 생성 및 활성화
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # Linux

# 의존성 설치
pip install -r backend/requirements.txt

# 개발 서버 실행 (프론트엔드는 FastAPI StaticFiles로 서빙)
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# DB 초기 데이터 시딩
python scripts/seed_data.py

# 테스트 실행
pytest tests/ -v
```

## Database Schema

현재 10개 테이블:

| 테이블 | 역할 |
|--------|------|
| `customers` | 고객사 |
| `projects` | 프로젝트 (customer_id FK, confirmed/status/budget 등) |
| `project_tech_stacks` | 프로젝트별 구축항목 (N:1 project) |
| `members` | 인력 (division, team, grade, years_of_experience) |
| `member_skills` | 인력별 기술 스택 (N:1 member) |
| `assignments` | 인력 배정 (project ↔ member 연결, start/end/man_month) |
| `assignment_periods` | 배정 내 복수 투입 기간 (N:1 assignment) |
| `monthly_allocations` | 배정별 월별 투입률 (assignment_id, year, month, allocation) |
| `recurring_schedules` | 반복 일정 (monthly/quarterly) |
| `master_data` | 마스터 데이터 (category + value 쌍) |

**핵심 관계:**
- `customers` 1:N `projects` (프로젝트가 있으면 고객사 삭제 RESTRICT)
- `projects` N:M `members` through `assignments`
- 한 담당자가 한 프로젝트에 **여러 기간** 투입 가능 → `assignment_periods`
- `monthly_allocations`는 `assignment_periods` 기반으로 자동 재생성 (`_auto_create_allocations`)
- `assignment.start_date/end_date/man_month`는 periods의 합산으로 자동 동기화 (`_sync_assignment_dates`)

**master_data 카테고리:** `tech-stacks`, `project-types`, `business-types`, `statuses`, `grades`, `teams`, `divisions`

**팀 계층 구조:** teams는 `"사업부명>팀명"` 형식의 단일 문자열로 저장. `GET /api/master/teams`가 파싱해서 `{id, value, division, team}` 반환.

## Architecture: Data Flow for M/D Calculation

투입 M/D(Man-Day)는 프론트엔드에서 계산:
1. `assignment_periods` 기반으로 각 period의 실제 평일(월~금) 수 계산
2. `monthly_allocations`의 allocation 비율 곱함
3. 월 경계에서 period를 clip해서 해당 월 분만 집계
4. `countWeekdaysInRange(start, end)` → `calcMDForMonth(year, month, alloc, assignStart, assignEnd)` 패턴

## Architecture: Frontend SPA

`app.js`의 `App.navigate(view)` 가 뷰 전환을 담당. switch-case로 뷰 모듈의 `render()` 호출.

**현재 뷰 목록:**
- `dashboard` → `DashboardView` — 프로젝트 현황 (Gantt 테이블)
- `calendar` → `CalendarView` — 프로젝트 현황 (월별 달력)
- `timeline` → `TimelineView` — 인력현황 (인력별 월별 배정)
- `projects` → `ProjectView` — 프로젝트 관리 (CRUD + 배정 관리)
- `members` → `MemberView` — 인력 관리 (CRUD)
- `settings` → `SettingsView` — 마스터 데이터/고객사/조직 관리

**컴포넌트:**
- `Modal.show(html)` / `Modal.close()` — 모달 표시/닫기
- `Toast.success(msg)` / `Toast.error(msg)` — 토스트 메시지

**API 모듈:** `api.js`의 `API` 객체가 모든 백엔드 호출을 담당 (`API.getProjects()`, `API.createAssignment()` 등).

**캐시 버스팅:** `index.html`의 `<script src="...?v=YYYYMMDD">` 버전 쿼리스트링으로 관리. JS 수정 시 해당 파일의 버전 파라미터 업데이트 필요.

**프론트엔드 서빙:** FastAPI `StaticFiles`가 `frontend/` 디렉토리를 `/static/` 경로로 서빙. `index.html`은 root `/`에서 직접 응답. JS에서 API 호출 시 상대경로 `/api/...` 사용.

## Architecture: Backend

**라우터 구조:**
- `routers/customers.py` — `/api/customers`
- `routers/projects.py` — `/api/projects`
- `routers/members.py` — `/api/members`
- `routers/assignments.py` — `/api/projects/{id}/assignments`, `/api/assignments/{id}`, `/api/assignment-periods/{id}`
- `routers/dashboard.py` — `/api/dashboard/project-overview`, `/api/dashboard/member-overview`, `/api/dashboard/monthly-summary`
- `routers/master.py` — `/api/master/{category}` (CRUD)
- `routers/recurring.py` — `/api/projects/{id}/recurring-schedules`

**스키마 마이그레이션:** `database.py`의 `init_db()`가 앱 시작 시 `PRAGMA table_info` + `ALTER TABLE`로 누락 컬럼을 추가. 새 컬럼 추가 시 이 패턴을 따름.

## Critical SQLAlchemy Rule

**두 개 이상의 one-to-many 컬렉션에 `joinedload` 금지.**
같은 부모 엔티티에서 `monthly_allocations`와 `periods` 같은 두 컬렉션을 동시에 `joinedload`하면 Cartesian product가 발생해 한쪽 컬렉션이 비어 보이는 버그 발생.
→ 컬렉션 로딩은 항상 **`selectinload`** 사용, 단일 FK 관계(member, project, customer)만 `joinedload`.

```python
# 올바른 패턴
.options(
    joinedload(Assignment.member),               # 단일 FK → joinedload OK
    selectinload(Assignment.monthly_allocations), # 컬렉션 → selectinload
    selectinload(Assignment.periods),             # 컬렉션 → selectinload
)
```

## API Convention

- 모든 라우터는 `/api` 프리픽스 사용
- 응답 JSON, 날짜는 ISO 8601 (`YYYY-MM-DD`)
- 에러 응답: `{"detail": "에러 메시지"}` + 적절한 HTTP 상태코드
- 리스트 API는 쿼리 파라미터로 필터링

## Coding Standards

- Python: PEP 8, type hint 필수, 영문 변수명 + 한글 주석
- JavaScript: ES6+, `const`/`let` (`var` 금지), 2칸 들여쓰기
- Python 들여쓰기: 4칸

## Do NOT

- `data/scheduler.db` 커밋하지 않기
- raw SQL 직접 작성하지 않기 (SQLAlchemy ORM 사용)
- 외부 프론트엔드 프레임워크 도입하지 않기
- one-to-many 컬렉션에 `joinedload` 사용하지 않기
- 인증/권한 기능은 현재 스코프 밖
- 화면 해상도 1920×1080 기준 최적화 유지
