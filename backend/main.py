import os
import uuid
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from database.session import engine, Base
from database.migrations import run_migrations
from seed import seed_database, sync_member_departments, sync_clean_team_members, sync_default_departments

from routers import (
    auth_router,
    members_router,
    departments_router,
    clients_router,
    tasks_router,
    stats_router
)

# ---------------------------------------------------------------------------
# Logging Configuration
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("malam")

# ---------------------------------------------------------------------------
# Environment-aware CORS origins
# ---------------------------------------------------------------------------
_ENV = os.environ.get("APP_ENV", "development").lower()
_FRONTEND_URL = os.environ.get("FRONTEND_URL", "")

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

if _FRONTEND_URL:
    for url in _FRONTEND_URL.split(","):
        clean = url.strip()
        if clean and clean not in ALLOWED_ORIGINS:
            ALLOWED_ORIGINS.append(clean)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager:
    Initializes schemas, runs safe migrations, and ensures database seeding on initial setup.
    """
    Base.metadata.create_all(bind=engine)
    run_migrations()
    from database.session import SessionLocal
    import models
    with SessionLocal() as db:
        sync_default_departments(target_session=db)
        # Only seed default team members on initial fresh setup when table is completely empty
        has_any_members = db.query(models.TeamMember).first() is not None
        if not has_any_members:
            sync_clean_team_members(target_session=db)
        sync_member_departments(target_session=db)
    logger.info("Malam OS backend started successfully (env=%s)", _ENV)
    yield


app = FastAPI(
    title="Agency Operations & Client Lifecycle Management API",
    description="نظام إدارة وتشغيل عملاء الوكالة مع دعم Super Admin و Admin وإدارة الموظفين",
    version="2.0.0",
    lifespan=lifespan
)

# ---------------------------------------------------------------------------
# CORS — supports configured frontend URLs and all Vercel deployments
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request-ID Middleware — adds X-Request-ID for tracing
# ---------------------------------------------------------------------------
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:12])
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


# ---------------------------------------------------------------------------
# Standardized Error Handlers
# ---------------------------------------------------------------------------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    first_error = exc.errors()[0] if exc.errors() else {}
    loc = " -> ".join([str(x) for x in first_error.get("loc", []) if str(x) != "body"])
    msg = first_error.get("msg", "بيانات الإدخال غير صحيحة")
    detail_str = f"خطأ في الحقل ({loc}): {msg}" if loc else msg
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": detail_str, "errors": exc.errors()}
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all handler — never expose internal details to clients."""
    request_id = getattr(request.state, "request_id", "unknown")
    logger.exception("Unhandled error [request_id=%s]: %s", request_id, exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "حدث خطأ داخلي في الخادم. يرجى المحاولة لاحقاً.",
            "request_id": request_id
        }
    )


# ---------------------------------------------------------------------------
# Include Modular Sub-Routers
# ---------------------------------------------------------------------------
app.include_router(auth_router)
app.include_router(members_router)
app.include_router(departments_router)
app.include_router(clients_router)
app.include_router(tasks_router)
app.include_router(stats_router)


@app.get("/")
def root():
    return {
        "status": "online",
        "system": "Agency Operations Platform API v2.0",
        "docs_url": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
