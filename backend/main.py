"""FastAPI application entry point."""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware
from jose import JWTError, jwt

from backend.database import init_db
from backend.routers import customers, projects, members, assignments, dashboard, master, recurring
from backend.routers.sales_reps import router as sales_reps_router
from backend.routers.auth import router as auth_router, SECRET_KEY, ALGORITHM
from backend.routers.versions import router as versions_router

app = FastAPI(title="Project Scheduler", version="1.0.0")

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")


class NoCacheMiddleware(BaseHTTPMiddleware):
    """정적 JS/CSS 파일에 캐시 방지 헤더 추가."""
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/static/") and request.url.path.endswith((".js", ".css")):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"
        return response


class AuthMiddleware(BaseHTTPMiddleware):
    """JWT 토큰 인증 미들웨어. /api/auth/login 및 정적 파일은 제외."""
    _PUBLIC = {"/", "/login", "/api/auth/login"}

    async def dispatch(self, request, call_next):
        path = request.url.path
        # 인증 불필요 경로
        if path in self._PUBLIC or path.startswith("/static/"):
            return await call_next(request)

        # API 경로 → 토큰 검증
        if path.startswith("/api/"):
            auth_header = request.headers.get("Authorization", "")
            token = auth_header[7:] if auth_header.startswith("Bearer ") else ""
            if not token:
                return Response(
                    content='{"detail":"인증이 필요합니다. 다시 로그인해 주세요."}',
                    status_code=401,
                    media_type="application/json",
                )
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                request.state.user = payload
            except JWTError:
                return Response(
                    content='{"detail":"유효하지 않은 토큰입니다. 다시 로그인해 주세요."}',
                    status_code=401,
                    media_type="application/json",
                )

        return await call_next(request)


app.add_middleware(NoCacheMiddleware)
app.add_middleware(AuthMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router)
app.include_router(customers.router)
app.include_router(projects.router)
app.include_router(members.router)
app.include_router(assignments.router)
app.include_router(dashboard.router)
app.include_router(master.router)
app.include_router(recurring.router)
app.include_router(sales_reps_router)
app.include_router(versions_router)

# Static files
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/")
def index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


@app.get("/login")
def login_page():
    return FileResponse(os.path.join(FRONTEND_DIR, "login.html"))


@app.on_event("startup")
def startup():
    init_db()
