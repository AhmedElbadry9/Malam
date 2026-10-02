from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from database.session import get_db
import schemas
import models
from services import client_service, task_service
import drive_service
from utils.auth_deps import get_current_user

router = APIRouter(prefix="/api/clients", tags=["Clients & Intake"])

@router.get("/check-drive-folder")
def check_drive_folder(name: str = ""):
    """
    التحقق مما إذا كان يوجد مجلد باسم المتجر مسجل مسبقاً على Google Drive.
    """
    if not name or not name.strip():
        return {"exists": False}
    return drive_service.check_folder_exists_on_drive(name)

@router.get("/hierarchy", response_model=List[schemas.ClientGroupHierarchy])
def get_clients_hierarchy(search: Optional[str] = None, db: Session = Depends(get_db)):
    """
    العرض الشجري الهرمي للعملاء والشركات والمهام التابعة لهم مع إمكانية البحث باسم العميل أو الشركة.
    """
    return client_service.get_clients_hierarchy(db, search)

@router.get("", response_model=List[schemas.ClientOut])
def get_clients(db: Session = Depends(get_db)):
    """
    استرجاع قائمة العملاء مرتبة زمنياً من الأحدث للأقدم.
    """
    return client_service.get_all_clients(db)

@router.get("/{client_id}", response_model=schemas.ClientOut)
def get_client_by_id(client_id: int, db: Session = Depends(get_db)):
    """
    استرجاع تفاصيل عميل محدد.
    """
    return client_service.get_client_by_id(db, client_id)

@router.post("/intake", response_model=schemas.ClientOut, status_code=status.HTTP_201_CREATED)
def client_intake_auto_provision(
    client_in: schemas.ClientCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.TeamMember] = Depends(get_current_user)
):
    """
    تسجيل عميل جديد وتوزيع مهامه تلقائياً مع إنشاء مجلد Google Drive.
    """
    return client_service.create_client_intake(db, client_in, current_user=current_user)

@router.put("/{client_id}", response_model=schemas.ClientOut)
def update_client_details(client_id: int, client_in: schemas.ClientUpdate, db: Session = Depends(get_db)):
    """
    تحديث بيانات العميل وأولويته أو رابط Google Drive.
    """
    return client_service.update_client(db, client_id, client_in)

@router.post("/{client_id}/assignments", response_model=schemas.TaskStageOut)
def add_assignment(
    client_id: int,
    stage_in: schemas.TaskStageCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.TeamMember] = Depends(get_current_user)
):
    """
    إضافة مرحلة/مهمة جديدة للعميل وتعيين موظف وقسم لها.
    """
    return task_service.add_task_stage(db, client_id, stage_in, current_user=current_user)

@router.put("/{client_id}/assignments/{stage_id}", response_model=schemas.TaskStageOut)
def update_assignment(
    client_id: int,
    stage_id: int,
    stage_in: schemas.TaskStageUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[models.TeamMember] = Depends(get_current_user)
):
    """
    تحديث مرحلة أو إعادة تعيين الموظف أو الحالة.
    """
    return task_service.update_task_stage(db, client_id, stage_id, stage_in, current_user=current_user)

@router.delete("/{client_id}/assignments/{stage_id}")
def delete_assignment(
    client_id: int, 
    stage_id: int, 
    db: Session = Depends(get_db),
    current_user: Optional[models.TeamMember] = Depends(get_current_user)
):
    """
    حذف مرحلة من مراحل العميل.
    """
    return task_service.delete_task_stage(db, client_id, stage_id, current_user=current_user)

@router.get("/{client_id}/brief-sheet")
def get_client_brief_sheet(client_id: int, db: Session = Depends(get_db)):
    """
    استرجاع شيت بيانات واستراتيجية العميل (الـ 11 عمود المعتمدة).
    """
    return client_service.get_client_brief_sheet(db, client_id)

@router.put("/{client_id}/brief-sheet")
def update_client_brief_sheet(client_id: int, payload: dict, db: Session = Depends(get_db)):
    """
    تحديث بيانات شيت العميل (الـ 11 عمود).
    """
    return client_service.update_client_brief_sheet(db, client_id, payload)

@router.get("/{client_id}/drive", response_model=List[schemas.DriveItemOut])
def get_client_drive_items(client_id: int, db: Session = Depends(get_db)):
    """
    استرجاع الملفات والمجلدات الخاصة بالعميل.
    """
    return client_service.get_client_drive_items(db, client_id)

from fastapi import APIRouter, Depends, status, Query, HTTPException

@router.post("/{client_id}/share-drive")
def share_client_drive(
    client_id: int, 
    req: schemas.ShareDriveRequest, 
    current_user: Optional[models.TeamMember] = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    مشاركة مجلد Google Drive مع بريد إلكتروني وتحديد الصلاحية (Viewer / Editor).
    """
    if current_user and current_user.role_type not in ["admin", "manager", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="منح وإدارة صلاحيات Google Drive تقتصر على إدارة الوكالة والمدراء فقط."
        )
    return client_service.share_client_drive(db, client_id, req)

@router.get("/{client_id}/drive-permissions")
def get_client_drive_permissions(
    client_id: int,
    folder_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    عرض قائمة الأذونات الحالية لمجلد Google Drive الخاص بالعميل (أو مجلد فرعي محدد).
    متاحة لجميع الأدوار للاطلاع والشفافية.
    """
    return client_service.get_client_drive_permissions(db, client_id, folder_id=folder_id)

@router.put("/{client_id}/drive-permissions/{permission_id}")
def update_client_drive_permission(
    client_id: int,
    permission_id: str,
    req: schemas.UpdateDrivePermissionRequest,
    current_user: Optional[models.TeamMember] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    تعديل دور أو صلاحية مستخدم على مجلد Google Drive.
    """
    if current_user and current_user.role_type not in ["admin", "manager", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="تعديل صلاحيات Google Drive تقتصر على إدارة الوكالة والمدراء فقط."
        )
    return client_service.update_client_drive_permission(db, client_id, permission_id, req)

@router.delete("/{client_id}/drive-permissions/{permission_id}")
def delete_client_drive_permission(
    client_id: int,
    permission_id: str,
    folder_id: Optional[str] = Query(None),
    current_user: Optional[models.TeamMember] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    إلغاء وحذف صلاحية وصول مستخدم إلى مجلد Google Drive.
    """
    if current_user and current_user.role_type not in ["admin", "manager", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="حذف صلاحيات Google Drive تقتصر على إدارة الوكالة والمدراء فقط."
        )
    return client_service.delete_client_drive_permission(db, client_id, permission_id, folder_id=folder_id)

@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(client_id: int, db: Session = Depends(get_db)):
    """
    حذف عميل/مشروع نهائياً مع كافة مراحله وسجلاته.
    """
    client_service.delete_client(db, client_id)
    return None

