from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import models
import schemas
from utils.security import hash_password

def get_members(db: Session, department_id: Optional[int] = None) -> List[models.TeamMember]:
    query = db.query(models.TeamMember)
    if department_id:
        query = query.filter(
            (models.TeamMember.department_id == department_id) |
            (models.TeamMember.departments.any(models.Department.id == department_id))
        )
    return query.distinct().all()

def get_member_by_id(db: Session, member_id: int) -> models.TeamMember:
    member = db.get(models.TeamMember, member_id)
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="المستخدم غير موجود")
    return member

def create_member(db: Session, member_in: schemas.TeamMemberCreate, current_user: Optional[models.TeamMember] = None) -> models.TeamMember:
    # Manager restriction: cannot create admin or manager accounts
    if current_user and current_user.role_type == "manager":
        target_role = (member_in.role_type or "employee").strip().lower()
        if target_role in ("admin", "manager", "super_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="مدير المشاريع لا يملك صلاحية إنشاء حسابات مدراء أو مسؤولين."
            )

    uname = member_in.username.strip()
    uemail = member_in.email.strip()

    existing = db.query(models.TeamMember).filter(
        (models.TeamMember.username == uname) | (models.TeamMember.email == uemail)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="اسم المستخدم أو البريد الإلكتروني مسجل بالفعل"
        )

    dept_ids = list(member_in.department_ids or [])
    primary_dept = member_in.department_id
    if not primary_dept and dept_ids:
        primary_dept = dept_ids[0]
    elif primary_dept and primary_dept not in dept_ids:
        dept_ids.insert(0, primary_dept)

    member = models.TeamMember(
        username=uname,
        password=hash_password(member_in.password.strip()),
        name=member_in.name.strip(),
        role=member_in.role.strip(),
        email=uemail,
        phone=member_in.phone.strip() if member_in.phone else None,
        avatar=member_in.avatar if member_in.avatar else None,
        department_id=primary_dept,
        role_type=member_in.role_type,
        is_active=member_in.is_active
    )
    if dept_ids:
        depts = db.query(models.Department).filter(models.Department.id.in_(dept_ids)).all()
        member.departments = depts

    db.add(member)
    db.commit()
    db.refresh(member)
    return member

def update_member(db: Session, member_id: int, member_in: schemas.TeamMemberUpdate, current_user: Optional[models.TeamMember] = None) -> models.TeamMember:
    member = db.query(models.TeamMember).filter(models.TeamMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="المستخدم غير موجود")

    # Manager restriction: cannot edit admin or manager accounts (except own profile)
    if current_user and current_user.role_type == "manager":
        if member.role_type in ("admin", "manager", "super_admin") and member.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="مدير المشاريع لا يملك صلاحية تعديل بيانات المدراء أو المسؤولين الآخرين."
            )
        if member_in.role_type and member_in.role_type in ("admin", "manager", "super_admin") and member_in.role_type != member.role_type:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="مدير المشاريع لا يملك صلاحية ترقية الأعضاء إلى رتبة مدير أو مسؤول."
            )

    update_data = member_in.dict(exclude_unset=True) if hasattr(member_in, "dict") else member_in.model_dump(exclude_unset=True)

    # Handle multi-department assignment
    if "department_ids" in update_data:
        dept_ids = update_data.pop("department_ids")
        if dept_ids is not None:
            depts = db.query(models.Department).filter(models.Department.id.in_(dept_ids)).all() if dept_ids else []
            member.departments = depts
            if "department_id" not in update_data:
                member.department_id = dept_ids[0] if dept_ids else None

    for key, value in update_data.items():
        setattr(member, key, value)

    db.commit()
    db.refresh(member)
    return member

def delete_member(db: Session, member_id: int, current_user: Optional[models.TeamMember] = None, force: bool = False):
    member = db.query(models.TeamMember).filter(models.TeamMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="الموظف غير موجود")

    # Manager restriction: cannot delete admin or manager accounts
    if current_user and current_user.role_type == "manager":
        if member.role_type in ("admin", "manager", "super_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="مدير المشاريع لا يملك صلاحية حذف حسابات المدراء أو المسؤولين."
            )

    tasks_count = db.query(models.TaskStage).filter(models.TaskStage.assigned_member_id == member_id).count()
    if tasks_count > 0 and not force:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"لا يمكن حذف الموظف لوجود {tasks_count} مهام مسندة إليه. يرجى إعادة تعيينها أو تفعيل خيار فك الارتباط والحذف."
        )

    # Safely decouple any references in TaskStage so deletion never fails with FK constraint
    db.query(models.TaskStage).filter(models.TaskStage.assigned_member_id == member_id).update({"assigned_member_id": None})
    db.query(models.TaskStage).filter(models.TaskStage.reviewer_id == member_id).update({"reviewer_id": None})
    db.query(models.TaskStage).filter(models.TaskStage.assigned_by_id == member_id).update({"assigned_by_id": None})

    db.delete(member)
    db.commit()
    return {"message": "تم حذف الموظف بنجاح"}
