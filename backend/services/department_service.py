from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import models
import schemas

import re
import uuid

def get_all_departments(db: Session) -> List[models.Department]:
    return db.query(models.Department).all()

def get_department_by_id(db: Session, department_id: int) -> models.Department:
    dept = db.get(models.Department, department_id)
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="القسم غير موجود")
    return dept

def create_department(db: Session, dept_in: schemas.DepartmentCreate) -> models.Department:
    code = (dept_in.code or "").strip().lower()
    name_ar = dept_in.name_ar.strip()
    name_en = (dept_in.name_en or "").strip() or name_ar

    if not code:
        # Auto-generate clean unique code from name_en or name_ar
        base_slug = re.sub(r'[^a-zA-Z0-9]+', '_', name_en.lower()).strip('_')
        if not base_slug:
            base_slug = "dept"
        code = base_slug
        counter = 1
        while db.query(models.Department).filter(models.Department.code == code).first():
            code = f"{base_slug}_{counter}"
            counter += 1
    else:
        existing = db.query(models.Department).filter(models.Department.code == code).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="رمز القسم (Code) مسجل بالفعل، يرجى اختيار رمز آخر"
            )

    dept = models.Department(
        name_ar=name_ar,
        name_en=name_en,
        code=code,
        icon=dept_in.icon or "Briefcase",
        color=dept_in.color or "#6366f1",
        description=dept_in.description
    )
    if dept_in.services is not None:
        dept.services = dept_in.services
    if dept_in.roles is not None:
        dept.roles = dept_in.roles

    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept

def update_department(db: Session, department_id: int, dept_in: schemas.DepartmentUpdate) -> models.Department:
    dept = db.get(models.Department, department_id)
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="القسم غير موجود")

    if dept_in.code is not None:
        code = dept_in.code.strip()
        if code != dept.code:
            existing = db.query(models.Department).filter(
                models.Department.code == code,
                models.Department.id != department_id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="رمز القسم (Code) مسجل بالفعل لقسم آخر"
                )

    update_data = dept_in.model_dump(exclude_unset=True) if hasattr(dept_in, "model_dump") else dept_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(dept, key, value)

    db.commit()
    db.refresh(dept)
    return dept

def delete_department(db: Session, department_id: int):
    dept = db.get(models.Department, department_id)
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="القسم غير موجود")

    # Check if members are attached to this department
    members_count = db.query(models.TeamMember).filter(
        (models.TeamMember.department_id == department_id) |
        (models.TeamMember.departments.any(models.Department.id == department_id))
    ).distinct().count()
    if members_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"لا يمكن حذف القسم لأنه مرتبط بـ {members_count} من الموظفين. يرجى نقلهم أو حذفهم أولاً."
        )

    # Check if task stages are attached to this department
    stages_count = db.query(models.TaskStage).filter(models.TaskStage.department_id == department_id).count()
    if stages_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"لا يمكن حذف القسم لأنه مرتبط بـ {stages_count} من المهام أو المراحل التنفيذية."
        )

    name_ar = dept.name_ar
    db.delete(dept)
    db.commit()
    return {"message": f"تم حذف القسم ({name_ar}) بنجاح."}
