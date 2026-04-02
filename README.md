# 프로젝트 인력 일정 관리 시스템

프로젝트 구축 및 유지보수 팀의 인력 투입 일정을 통합 관리하는 웹 애플리케이션입니다.

## 기술 스택
- **Backend**: Python 3.10+ / FastAPI / SQLAlchemy / SQLite
- **Frontend**: Vanilla JS SPA (빌드 도구 불필요)

## 주요 기능
- 프로젝트 현황 대시보드 (월별 간트 차트)
- 인력현황 타임라인 뷰
- 프로젝트 CRUD (고객사, 기간, 구축항목, 인력 배정)
- 인력 CRUD (등급, 스킬, 배정 이력)
- 고객사 관리 / 마스터 데이터 설정

---

## Windows 로컬 실행 방법

```bash
# 1. 가상환경 생성 및 활성화
python -m venv venv
venv\Scripts\activate

# 2. 패키지 설치
pip install fastapi uvicorn sqlalchemy pydantic python-dateutil

# 3. 초기 데이터 시딩
python scripts/seed_data.py

# 4. 서버 실행
python run.py
```

브라우저에서 `http://localhost:8000` 접속

---

## Ubuntu Linux 환경 이관 가이드

### 1단계: 서버 준비

```bash
# Ubuntu 패키지 업데이트
sudo apt update && sudo apt upgrade -y

# Python 3.10+ 설치 확인
python3 --version

# pip, venv 설치
sudo apt install -y python3-pip python3-venv
```

### 2단계: 프로젝트 배포

```bash
# 프로젝트 디렉토리 생성
sudo mkdir -p /opt/project-scheduler
sudo chown $USER:$USER /opt/project-scheduler

# 프로젝트 파일 복사 (Windows에서 scp 또는 rsync 사용)
# scp -r project-scheduler/* user@server:/opt/project-scheduler/

# 가상환경 생성 및 활성화
cd /opt/project-scheduler
python3 -m venv venv
source venv/bin/activate

# 패키지 설치
pip install fastapi uvicorn[standard] sqlalchemy pydantic python-dateutil

# 데이터 디렉토리 생성 및 시딩
mkdir -p data
python scripts/seed_data.py
```

### 3단계: systemd 서비스 등록

```bash
sudo tee /etc/systemd/system/project-scheduler.service << 'EOF'
[Unit]
Description=Project Scheduler Web Application
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/project-scheduler
ExecStart=/opt/project-scheduler/venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5
Environment=PATH=/opt/project-scheduler/venv/bin:/usr/bin
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
```

```bash
# 파일 소유권 설정
sudo chown -R www-data:www-data /opt/project-scheduler

# 서비스 활성화 및 시작
sudo systemctl daemon-reload
sudo systemctl enable project-scheduler
sudo systemctl start project-scheduler

# 상태 확인
sudo systemctl status project-scheduler
```

### 4단계: Nginx 리버스 프록시 설정 (선택사항)

```bash
sudo apt install -y nginx

sudo tee /etc/nginx/sites-available/project-scheduler << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # 또는 서버 IP

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/project-scheduler /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5단계: 방화벽 설정

```bash
# UFW 사용 시
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 직접 접속 시 (Nginx 미사용)
sudo ufw allow 8000/tcp
```

### 6단계: 유지보수 명령어

```bash
# 로그 확인
sudo journalctl -u project-scheduler -f

# 서비스 재시작
sudo systemctl restart project-scheduler

# DB 백업
cp /opt/project-scheduler/data/scheduler.db /backup/scheduler_$(date +%Y%m%d).db

# 코드 업데이트 후 재시작
cd /opt/project-scheduler
git pull  # 또는 파일 복사
sudo systemctl restart project-scheduler
```

### HTTPS 설정 (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 프로젝트 구조

```
project-scheduler/
├── backend/
│   ├── main.py              # FastAPI 엔트리포인트
│   ├── database.py          # SQLite 연결 (WAL 모드)
│   ├── models.py            # SQLAlchemy 모델
│   ├── schemas.py           # Pydantic 스키마
│   ├── routers/
│   │   ├── projects.py      # 프로젝트 CRUD
│   │   ├── members.py       # 인력 CRUD
│   │   ├── customers.py     # 고객사 CRUD
│   │   ├── assignments.py   # 배정 CRUD
│   │   ├── dashboard.py     # 대시보드 API
│   │   └── master.py        # 마스터 데이터
│   └── requirements.txt
├── frontend/
│   ├── index.html           # SPA 메인 페이지
│   ├── css/style.css
│   └── js/
│       ├── api.js           # API 클라이언트
│       ├── app.js           # 메인 앱 컨트롤러
│       ├── views/           # 각 화면 뷰
│       └── components/      # 공통 컴포넌트
├── data/                    # SQLite DB 파일
├── scripts/seed_data.py     # 초기 데이터 시딩
└── run.py                   # 서버 실행 스크립트
```

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/projects | 프로젝트 목록 (필터 지원) |
| POST | /api/projects | 프로젝트 생성 |
| GET | /api/members | 인력 목록 |
| POST | /api/members | 인력 등록 |
| GET | /api/customers | 고객사 목록 |
| GET | /api/dashboard/project-overview | 프로젝트 현황 (간트 데이터) |
| GET | /api/dashboard/member-overview | 인력현황 (타임라인 데이터) |
| GET | /api/master/tech-stacks | 구축항목 목록 |
