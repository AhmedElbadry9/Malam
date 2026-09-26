from routers.auth import router as auth_router
from routers.members import router as members_router
from routers.departments import router as departments_router
from routers.clients import router as clients_router
from routers.tasks import router as tasks_router
from routers.stats import router as stats_router

__all__ = [
    "auth_router",
    "members_router",
    "departments_router",
    "clients_router",
    "tasks_router",
    "stats_router"
]
