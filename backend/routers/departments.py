from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from database.session import get_db
import schemas
from services import department_service

router = APIRouter(prefix="/api/departments", tags=["Departments"])

@router.get("", response_model=List[schemas.DepartmentOut])
def get_departments(db: Session = Depends(get_db)):
    """
    استرجاع قائمة كافة الأقسام مع خدماتها المخصصة.
    """
    return department_service.get_all_departments(db)

@router.post("", response_model=schemas.DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(dept_in: schemas.DepartmentCreate, db: Session = Depends(get_db)):
    """
    إنشاء قسم جديد والتحقق من عدم تكرار كود القسم.
    """
    return department_service.create_department(db, dept_in)

@router.put("/{department_id}", response_model=schemas.DepartmentOut)
def update_department(department_id: int, dept_in: schemas.DepartmentUpdate, db: Session = Depends(get_db)):
    """
    تحديث بيانات قسم موجود مع التحقق من عدم تكرار الرمز.
    """
    return department_service.update_department(db, department_id, dept_in)

@router.delete("/{department_id}")
def delete_department(department_id: int, db: Session = Depends(get_db)):
    """
    حذف قسم بعد التحقق من عدم وجود موظفين أو مهام مرتبطة به.
    """
    return department_service.delete_department(db, department_id)
