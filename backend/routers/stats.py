import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.session import get_db
import schemas
from services import stats_service

router = APIRouter(prefix="/api", tags=["Statistics & System Control"])

@router.get("/stats/kpis", response_model=schemas.SystemKPIs)
def get_kpis(db: Session = Depends(get_db)):
    """
    استرجاع مؤشرات الأداء ومعدلات إنجاز المهام وضغط العمل على الأقسام.
    """
    return stats_service.get_system_kpis(db)

# NOTE: Seed/reset endpoint removed from production.
# It was previously available at POST /api/seed/reset and would DROP ALL TABLES
# without authentication — a critical P0 security vulnerability.
# For development reseeding, use: python seed.py
