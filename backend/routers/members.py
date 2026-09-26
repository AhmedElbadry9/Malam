from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from database.session import get_db
import schemas
import models
from services import member_service, auth_service
from utils.auth_deps import get_current_user

router = APIRouter(prefix="/api/members", tags=["Team Members & Staff"])

@router.get("", response_model=List[schemas.TeamMemberOut])
def get_members(department_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    استرجاع قائمة الموظفين مع إمكانية التصفية بحسب القسم.
    """
    return member_service.get_members(db, department_id)

@router.post("", response_model=schemas.TeamMemberOut, status_code=status.HTTP_201_CREATED)
def create_team_member(
    member_in: schemas.TeamMemberCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.TeamMember] = Depends(get_current_user)
):
    """
    إضافة موظف جديد أو مدير جديد مع دعم ربطه بأكثر من قسم وتقييد صلاحيات مدير المشاريع.
    """
    return member_service.create_member(db, member_in, current_user=current_user)

@router.put("/{member_id}/password")
def change_password(member_id: int, req: schemas.ChangePasswordRequest, db: Session = Depends(get_db)):
    """
    تغيير كلمة المرور للمستخدم.
    """
    return auth_service.change_user_password(db, member_id, req.new_password)

@router.delete("/{member_id}")
def delete_team_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.TeamMember] = Depends(get_current_user)
):
    """
    حذف حساب موظف بشرط عدم وجود مهام مسندة إليه وتقييد صلاحيات مدير المشاريع.
    """
    return member_service.delete_member(db, member_id, current_user=current_user)

@router.put("/{member_id}/toggle-active")
def toggle_user_active_status(member_id: int, db: Session = Depends(get_db)):
    """
    تعطيل أو تفعيل حساب موظف أو مدير.
    """
    return auth_service.toggle_user_active(db, member_id)

@router.put("/{member_id}", response_model=schemas.TeamMemberOut)
def update_team_member(
    member_id: int,
    member_in: schemas.TeamMemberUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[models.TeamMember] = Depends(get_current_user)
):
    """
    تحديث بيانات الموظف والوظيفة والأقسام المسند إليها مع تقييد صلاحيات مدير المشاريع.
    """
    return member_service.update_member(db, member_id, member_in, current_user=current_user)

