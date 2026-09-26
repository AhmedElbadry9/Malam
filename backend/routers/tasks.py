from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.session import get_db
import schemas
import models
from services import task_service
from utils.auth_deps import get_current_user

router = APIRouter(prefix="/api/tasks", tags=["Tasks & Review Workflow"])

@router.post("/submit-review", response_model=schemas.TaskStageOut)
def submit_task_for_review(req: schemas.StageCompleteRequest, db: Session = Depends(get_db)):
    """
    تسليم الموظف للمهمة وإحالتها للمراجعة والاعتماد الإداري.
    """
    return task_service.submit_stage_for_review(db, req)

@router.post("/review", response_model=schemas.TaskStageOut)
def review_task_stage(req: schemas.TaskReviewRequest, db: Session = Depends(get_db)):
    """
    اعتماد المهمة من قبل الإدارة (Approve) أو طلب تعديلات عليها (Request Revision).
    """
    return task_service.review_task_stage(db, req)

@router.get("/pending-reviews", response_model=List[schemas.PendingReviewItemOut])
def get_pending_review_stages(db: Session = Depends(get_db)):
    """
    استرجاع قائمة المهام المعلقة التي تنتظر مراجعة واعتماد الإدارة.
    """
    return task_service.get_pending_review_stages(db)

@router.post("/complete", response_model=schemas.TaskStageOut)
def complete_task_stage(req: schemas.StageCompleteRequest, db: Session = Depends(get_db)):
    """
    إنهاء المهمة مباشرة وتحديث تقدم العميل.
    """
    return task_service.complete_task_stage(db, req)

@router.get("/{stage_id}/history", response_model=List[schemas.AuditLogOut])
def get_task_stage_history(stage_id: int, db: Session = Depends(get_db)):
    """
    استرجاع السجل الزمني الكامل لدورة حياة المهمة وتتبع جميع الإسنادات والتحويلات والتسليمات والاعتمادات.
    """
    return task_service.get_task_stage_history(db, stage_id)

