import logging
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import models
import schemas
from models import validate_task_transition

import drive_service

logger = logging.getLogger(__name__)


def _sync_member_drive_access(db: Session, client: models.Client, member_id: Optional[int], action: str, exclude_stage_id: Optional[int] = None):
    """
    Syncs member Drive access for a client:
    - action='grant':
        * Subfolder '01 - مرفقات ومواد العميل (Client Uploads)': role='reader' (Viewer / عرض فقط)
        * Subfolder '02 - مخرجات وشغل الفريق (Team Deliverables)': role='writer' (Editor / تعديل ورفع)
        * Main client folder: role='reader' (Viewer / عرض فقط)
    - action='revoke': checks if member has any other active/pending stages for this client.
                      If none exist, revokes Drive permissions from all folders.
    """
    if not member_id or not client:
        return
    member = db.query(models.TeamMember).filter(models.TeamMember.id == member_id).first()
    if not member or not member.email:
        return

    folder_role_map = {}
    all_folder_ids = []

    if getattr(client, "drive_folder_id", None):
        main_fid = client.drive_folder_id
        folder_role_map[main_fid] = "reader"
        all_folder_ids.append(main_fid)

    if hasattr(client, "drive_items") and client.drive_items:
        for item in client.drive_items:
            if getattr(item, "is_folder", False) and getattr(item, "drive_url", None):
                fid = item.drive_url.split("/")[-1].split("?")[0] if "/" in item.drive_url else item.drive_url
                if fid:
                    item_name = getattr(item, "name", "").lower()
                    if "02" in item_name or "تسليم" in item_name or "مخرج" in item_name or "deliverables" in item_name or "team" in item_name:
                        folder_role_map[fid] = "writer"
                    else:
                        folder_role_map[fid] = "reader"
                    if fid not in all_folder_ids:
                        all_folder_ids.append(fid)

    if not all_folder_ids:
        return

    if action == "grant":
        for fid, role in folder_role_map.items():
            try:
                drive_service.share_folder(fid, member.email, role=role, send_notification=False)
            except Exception as e:
                logger.warning(f"Error granting Drive access ({role}) to {member.email} for folder {fid}: {e}")

    elif action == "revoke":
        # 1. Admins, Super Admins, and Agency Managers NEVER lose Drive access
        if member.role_type in ["admin", "super_admin", "manager"]:
            return

        # 2. Department Heads NEVER lose access as long as the client has ANY tasks in their department(s)
        is_head = member.role_type == "head" or (member.role and ("head" in member.role.lower() or "رئيس" in member.role))
        if is_head:
            member_dept_ids = []
            if member.department_id:
                member_dept_ids.append(member.department_id)
            if member.departments:
                for d in member.departments:
                    if d.id not in member_dept_ids:
                        member_dept_ids.append(d.id)

            # Check if this client has ANY tasks in the Head's departments
            if member_dept_ids:
                dept_stages_count = db.query(models.TaskStage).filter(
                    models.TaskStage.client_id == client.id,
                    models.TaskStage.department_id.in_(member_dept_ids)
                ).count()
                if dept_stages_count > 0:
                    # Head is supervising the department's tasks for this client -> KEEP ACCESS!
                    return

        # 3. Regular Employees: Check if they have other active tasks on this client
        query = db.query(models.TaskStage).filter(
            models.TaskStage.client_id == client.id,
            models.TaskStage.assigned_member_id == member_id,
            models.TaskStage.status.in_(["pending", "in_progress", "under_review", "revision_requested"])
        )
        if exclude_stage_id:
            query = query.filter(models.TaskStage.id != exclude_stage_id)

        other_active_stages = query.count()

        if other_active_stages == 0:
            for fid in all_folder_ids:
                try:
                    drive_service.remove_folder_permission_by_email(fid, member.email, recursive=True)
                except Exception as e:
                    logger.warning(f"Error revoking Drive access from {member.email} for folder {fid}: {e}")


def _ensure_department_heads_drive_access(db: Session, client: models.Client, department_id: Optional[int]):
    """Guarantees that the Head of the department always has Google Drive access to the client folder."""
    if not department_id or not client:
        return
    heads = db.query(models.TeamMember).filter(
        models.TeamMember.role_type == "head",
        models.TeamMember.is_active == True
    ).all()
    for head in heads:
        head_depts = [head.department_id] if head.department_id else []
        if head.departments:
            head_depts.extend([d.id for d in head.departments if d.id not in head_depts])
        if department_id in head_depts:
            try:
                _sync_member_drive_access(db, client, head.id, action="grant")
            except Exception as e:
                logger.warning(f"Error ensuring Drive access for department head {head.name}: {e}")


def add_task_stage(db: Session, client_id: int, stage_in: schemas.TaskStageCreate, current_user: Optional[models.TeamMember] = None) -> models.TaskStage:
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="العميل غير موجود")

    order_index = stage_in.order_index
    if order_index is None:
        current_max = db.query(models.TaskStage).filter(models.TaskStage.client_id == client_id).count()
        order_index = current_max

    assigned_by_id = stage_in.assigned_by_id or (current_user.id if current_user else None)
    stage = models.TaskStage(
        client_id=client_id,
        department_id=stage_in.department_id,
        assigned_member_id=stage_in.assigned_member_id,
        assigned_by_id=assigned_by_id,
        stage_name=stage_in.stage_name.strip(),
        description=stage_in.description.strip() if stage_in.description else None,
        status="pending",
        order_index=order_index
    )
    db.add(stage)
    db.flush()

    performer = current_user.name if current_user else "System Admin"
    assigned_name = "غير مسند"
    if stage_in.assigned_member_id:
        _sync_member_drive_access(db, client, stage_in.assigned_member_id, action="grant")
        assigned_m = db.query(models.TeamMember).filter(models.TeamMember.id == stage_in.assigned_member_id).first()
        if assigned_m:
            assigned_name = assigned_m.name

    # Ensure the Department Head also has access to supervise and review
    _ensure_department_heads_drive_access(db, client, stage_in.department_id)

    audit = models.AuditLog(
        client_id=client_id,
        stage_id=stage.id,
        action="STAGE_ADDED",
        performed_by=performer,
        timestamp=datetime.now(),
        details=f"تم إنشاء وإسناد مرحلة جديدة ({stage_in.stage_name}) إلى [{assigned_name}]."
    )
    db.add(audit)

    db.commit()
    db.refresh(stage)
    return stage


def update_task_stage(db: Session, client_id: int, stage_id: int, stage_in: schemas.TaskStageUpdate, current_user: Optional[models.TeamMember] = None) -> models.TaskStage:
    stage = db.query(models.TaskStage).filter(
        models.TaskStage.id == stage_id,
        models.TaskStage.client_id == client_id
    ).first()
    if not stage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="المرحلة غير موجودة أو العميل غير صحيح")

    update_data = stage_in.model_dump(exclude_unset=True)

    old_member_id = stage.assigned_member_id
    reassigned = False
    new_member_id = None
    if "assigned_member_id" in update_data and update_data["assigned_member_id"] != old_member_id:
        reassigned = True
        new_member_id = update_data["assigned_member_id"]

    # Validate status transition if status is being changed
    if "status" in update_data and update_data["status"] is not None:
        new_status = update_data["status"]
        if not validate_task_transition(stage.status, new_status):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"لا يمكن تغيير حالة المرحلة من ({stage.status}) إلى ({new_status})"
            )
        if new_status == "completed":
            stage.completion_timestamp = datetime.now()
        elif stage.status == "completed" and new_status != "completed":
            stage.completion_timestamp = None

    for key, value in update_data.items():
        setattr(stage, key, value)

    if "assigned_by_id" in update_data and update_data["assigned_by_id"] is not None:
        stage.assigned_by_id = update_data["assigned_by_id"]
    elif reassigned and current_user:
        stage.assigned_by_id = current_user.id

    # Recalculate client overall progress if status was updated
    _recalculate_client_progress(db, client_id)

    # If stage status changed to completed, revoke Drive access if no other active stages
    if update_data.get("status") == "completed" and stage.assigned_member_id:
        db.flush()
        _sync_member_drive_access(db, stage.client, stage.assigned_member_id, action="revoke", exclude_stage_id=stage.id)

    performer = current_user.name if current_user else "System Admin"

    # Always ensure Department Head has access to the client
    _ensure_department_heads_drive_access(db, stage.client, stage.department_id)

    # Handle reassignment
    if reassigned:
        old_m = db.query(models.TeamMember).filter(models.TeamMember.id == old_member_id).first() if old_member_id else None
        new_m = db.query(models.TeamMember).filter(models.TeamMember.id == new_member_id).first() if new_member_id else None
        old_name = old_m.name if old_m else (f"موظف #{old_member_id}" if old_member_id else "غير مسند")
        new_name = new_m.name if new_m else (f"موظف #{new_member_id}" if new_member_id else "إلغاء الإسناد")

        db.flush()
        if old_member_id:
            _sync_member_drive_access(db, stage.client, old_member_id, action="revoke", exclude_stage_id=stage.id)
        if new_member_id:
            _sync_member_drive_access(db, stage.client, new_member_id, action="grant")

        audit_reassign = models.AuditLog(
            client_id=client_id,
            stage_id=stage.id,
            action="STAGE_REASSIGNED",
            performed_by=performer,
            timestamp=datetime.now(),
            details=f"تم تحويل وإعادة إسناد المهمة ({stage.stage_name}) من [{old_name}] إلى [{new_name}]."
        )
        db.add(audit_reassign)
    else:
        audit = models.AuditLog(
            client_id=client_id,
            stage_id=stage.id,
            action="STAGE_UPDATED",
            performed_by=performer,
            timestamp=datetime.now(),
            details=f"تم تعديل بيانات مرحلة ({stage.stage_name})."
        )
        db.add(audit)

    db.commit()
    db.refresh(stage)
    return stage


def delete_task_stage(db: Session, client_id: int, stage_id: int):
    stage = db.query(models.TaskStage).filter(
        models.TaskStage.id == stage_id,
        models.TaskStage.client_id == client_id
    ).first()
    if not stage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="المرحلة غير موجودة أو العميل غير صحيح")

    stage_name = stage.stage_name
    stage_id_val = stage.id
    db.delete(stage)

    # Recalculate client progress after stage deletion
    _recalculate_client_progress(db, client_id)

    audit = models.AuditLog(
        client_id=client_id,
        stage_id=stage_id_val,
        action="STAGE_DELETED",
        performed_by="System Admin",
        timestamp=datetime.now(),
        details=f"تم حذف مرحلة ({stage_name})."
    )
    db.add(audit)

    db.commit()
    return {"message": "تم حذف المرحلة بنجاح."}


def submit_stage_for_review(db: Session, req: schemas.StageCompleteRequest) -> models.TaskStage:
    stage = db.query(models.TaskStage).filter(models.TaskStage.id == req.stage_id).first()
    if not stage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="المرحلة غير موجودة")

    # Validate state transition: pending, in_progress, or revision_requested -> under_review
    if stage.status not in ("pending", "in_progress", "revision_requested"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"لا يمكن تسليم المرحلة وهي في حالة ({stage.status}). يجب أن تكون معلقة، قيد التنفيذ، أو طُلب تعديلها."
        )

    now = datetime.now()
    stage.status = "under_review"
    stage.deliverable_note = req.deliverable_note.strip() if req.deliverable_note else None
    stage.deliverable_url = req.deliverable_url.strip() if req.deliverable_url else None

    client = stage.client
    member = db.query(models.TeamMember).filter(models.TeamMember.id == req.member_id).first()
    member_name = member.name if member else f"Member #{req.member_id}"

    audit = models.AuditLog(
        client_id=client.id,
        stage_id=stage.id,
        action="STAGE_SUBMITTED_FOR_REVIEW",
        performed_by=member_name,
        timestamp=now,
        details=f"قام الموظف {member_name} بتسليم مرحلة ({stage.stage_name}) للمراجعة والاعتماد. ملاحظات: '{req.deliverable_note or 'بدون ملاحظات'}' | الرابط: {req.deliverable_url or 'لا يوجد'}"
    )
    db.add(audit)
    db.commit()
    db.refresh(stage)
    return stage


def review_task_stage(db: Session, req: schemas.TaskReviewRequest) -> models.TaskStage:
    stage = db.query(models.TaskStage).filter(models.TaskStage.id == req.stage_id).first()
    if not stage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="المرحلة غير موجودة")

    # Validate: review only allowed when stage is under_review
    if stage.status != "under_review":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"لا يمكن مراجعة المرحلة وهي في حالة ({stage.status}). يجب أن تكون قيد المراجعة."
        )

    # Validate action value
    if req.action not in ("approve", "request_revision"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="الإجراء يجب أن يكون 'approve' أو 'request_revision'"
        )

    now = datetime.now()
    client = stage.client
    reviewer = db.query(models.TeamMember).filter(models.TeamMember.id == req.reviewer_id).first()
    reviewer_name = reviewer.name if reviewer else f"المسؤول #{req.reviewer_id}"

    stage.reviewer_id = req.reviewer_id
    stage.reviewed_at = now

    if req.action == "approve":
        stage.status = "completed"
        stage.completion_timestamp = now

        # Update client progress and activate next pending stage
        _recalculate_client_progress(db, client.id)

        # Activate next pending stage
        _activate_next_stage(db, client.id, stage.id)

        # Revoke Drive permissions if member has no other active tasks for this client
        if stage.assigned_member_id:
            db.flush()
            _sync_member_drive_access(db, client, stage.assigned_member_id, action="revoke", exclude_stage_id=stage.id)

        audit = models.AuditLog(
            client_id=client.id,
            stage_id=stage.id,
            action="STAGE_APPROVED",
            performed_by=reviewer_name,
            timestamp=now,
            details=f"قام {reviewer_name} باعتماد وإنهاء مرحلة ({stage.stage_name}) رسمياً وإغلاق دورة العمل."
        )
        db.add(audit)

    elif req.action == "request_revision":
        stage.status = "revision_requested"
        feedback = req.notes or "يرجى مراجعة العمل وإجراء التعديلات المطلوبة."
        stage.revision_notes = feedback

        assigned_m = stage.assigned_member
        assigned_name = assigned_m.name if assigned_m else "الموظف"

        audit = models.AuditLog(
            client_id=client.id,
            stage_id=stage.id,
            action="STAGE_REVISION_REQUESTED",
            performed_by=reviewer_name,
            timestamp=now,
            details=f"طلب {reviewer_name} تعديلات على مرحلة ({stage.stage_name}) وأعادها إلى [{assigned_name}]. الملاحظات: '{feedback}'"
        )
        db.add(audit)

    db.commit()
    db.refresh(stage)
    return stage


def get_pending_review_stages(db: Session) -> List[schemas.PendingReviewItemOut]:
    stages = db.query(models.TaskStage).filter(models.TaskStage.status == "under_review").all()
    items = []
    for s in stages:
        items.append(schemas.PendingReviewItemOut(
            stage=s,
            client_name=s.client.name,
            company_name=s.client.company_name,
            client_id=s.client.id
        ))
    return items


def complete_task_stage(db: Session, req: schemas.StageCompleteRequest) -> models.TaskStage:
    """Direct completion — used by admin/manager to bypass review workflow."""
    stage = db.query(models.TaskStage).filter(models.TaskStage.id == req.stage_id).first()
    if not stage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="المرحلة غير موجودة")

    # Only allow direct completion from specific statuses
    if stage.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="المرحلة مكتملة بالفعل."
        )

    now = datetime.now()
    stage.status = "completed"
    stage.completion_timestamp = now
    stage.deliverable_note = req.deliverable_note
    stage.deliverable_url = req.deliverable_url

    client = stage.client
    member = db.query(models.TeamMember).filter(models.TeamMember.id == req.member_id).first()
    member_name = member.name if member else f"Member #{req.member_id}"

    _recalculate_client_progress(db, client.id)
    _activate_next_stage(db, client.id, stage.id)

    # Revoke Drive permissions if member has no other active tasks for this client
    if stage.assigned_member_id:
        db.flush()
        _sync_member_drive_access(db, client, stage.assigned_member_id, action="revoke", exclude_stage_id=stage.id)

    audit = models.AuditLog(
        client_id=client.id,
        stage_id=stage.id,
        action="STAGE_COMPLETED",
        performed_by=member_name,
        timestamp=now,
        details=f"قام {member_name} بإتمام وإنهاء مرحلة ({stage.stage_name}) مباشرة."
    )
    db.add(audit)

    db.commit()
    db.refresh(stage)
    return stage


def get_task_stage_history(db: Session, stage_id: int) -> List[models.AuditLog]:
    """Retrieves full chronological lifecycle & audit history for a task stage."""
    stage = db.query(models.TaskStage).filter(models.TaskStage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="المرحلة غير موجودة")

    logs = db.query(models.AuditLog).filter(
        (models.AuditLog.stage_id == stage_id) |
        ((models.AuditLog.client_id == stage.client_id) & (models.AuditLog.details.like(f"%{stage.stage_name}%")))
    ).order_by(models.AuditLog.timestamp.asc()).all()

    return logs


# ---------------------------------------------------------------------------
# Private Helper Functions
# ---------------------------------------------------------------------------

def _recalculate_client_progress(db: Session, client_id: int):
    """Recalculates client progress_percentage from actual task stage statuses."""
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        return

    client_stages = db.query(models.TaskStage).filter(
        models.TaskStage.client_id == client_id
    ).all()

    total_count = len(client_stages)
    if total_count == 0:
        client.progress_percentage = 0
        return

    completed_count = sum(1 for s in client_stages if s.status == "completed")
    client.progress_percentage = int((completed_count / total_count) * 100)

    if completed_count == total_count:
        client.status = "completed"
        client.completion_timestamp = datetime.now()
    elif completed_count > 0:
        client.status = "in_progress"


def _activate_next_stage(db: Session, client_id: int, completed_stage_id: int):
    """Activates the next pending stage after a stage is completed."""
    pending_stages = db.query(models.TaskStage).filter(
        models.TaskStage.client_id == client_id,
        models.TaskStage.status == "pending",
        models.TaskStage.id != completed_stage_id
    ).order_by(models.TaskStage.order_index.asc()).all()

    if pending_stages:
        pending_stages[0].status = "in_progress"
