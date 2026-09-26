import sys
from database import engine, Base, get_db, run_migrations
import models, schemas, crud

def run_test():
    print("=== Testing Approval & Review Workflow ===")
    run_migrations()
    db = next(get_db())
    
    # 1. Check an in_progress or pending stage
    stage = db.query(models.TaskStage).filter(models.TaskStage.status.in_(["in_progress", "pending"])).first()
    assert stage is not None, "No active stage found"
    print(f"Testing with Stage #{stage.id}: {stage.stage_name} (Client: {stage.client.name})")

    # 2. Employee submits stage for review
    submit_req = schemas.StageCompleteRequest(
        stage_id=stage.id,
        member_id=stage.assigned_member_id or 1,
        deliverable_note="تم إنجاز التصميم المبدئي ومراجعته مع التوجيهات الفنية",
        deliverable_url="https://drive.google.com/test-deliverable"
    )
    submitted_stage = crud.submit_stage_for_review(db, submit_req)
    assert submitted_stage.status == "under_review", f"Expected under_review, got {submitted_stage.status}"
    assert submitted_stage.deliverable_note == submit_req.deliverable_note
    print("[OK] Step 1: Employee successfully submitted task for review. Status is 'under_review'.")

    # 3. Manager/Admin checks pending reviews
    pending = crud.get_pending_review_stages(db)
    assert any(p["stage"].id == stage.id for p in pending), "Stage not found in pending reviews"
    print(f"[OK] Step 2: Manager/Admin retrieved pending queue ({len(pending)} pending tasks).")

    # 4. Manager requests revision with notes
    manager = db.query(models.TeamMember).filter(models.TeamMember.role_type == "manager").first()
    manager_id = manager.id if manager else 1
    rev_req = schemas.TaskReviewRequest(
        stage_id=stage.id,
        reviewer_id=manager_id,
        action="request_revision",
        notes="يرجى تعديل حجم الشعار في الترويسة وتنسيق الألوان حسب دليل الهوية."
    )
    rev_stage = crud.review_task_stage(db, rev_req)
    assert rev_stage.status == "revision_requested", f"Expected revision_requested, got {rev_stage.status}"
    assert "تعديل حجم الشعار" in rev_stage.revision_notes
    print("[OK] Step 3: Manager requested revisions with notes. Status is 'revision_requested'.")

    # 5. Employee revises and resubmits
    resubmit_req = schemas.StageCompleteRequest(
        stage_id=stage.id,
        member_id=stage.assigned_member_id or 1,
        deliverable_note="تم تعديل حجم الشعار وضبط الألوان وفق دليل الهوية المرفق",
        deliverable_url="https://drive.google.com/test-deliverable-v2"
    )
    resubmitted_stage = crud.submit_stage_for_review(db, resubmit_req)
    assert resubmitted_stage.status == "under_review"
    print("[OK] Step 4: Employee revised and resubmitted. Status returned to 'under_review'.")

    # 6. Manager approves task
    appr_req = schemas.TaskReviewRequest(
        stage_id=stage.id,
        reviewer_id=manager_id,
        action="approve"
    )
    approved_stage = crud.review_task_stage(db, appr_req)
    assert approved_stage.status == "completed", f"Expected completed, got {approved_stage.status}"
    assert approved_stage.reviewer_id == manager_id
    assert approved_stage.completion_timestamp is not None
    print("[OK] Step 5: Manager approved task. Status is 'completed' and reviewer_id is recorded.")

    # 7. Check audit log entries
    logs = db.query(models.AuditLog).filter(models.AuditLog.client_id == stage.client_id).order_by(models.AuditLog.id.desc()).limit(5).all()
    actions = [l.action for l in logs]
    print(f"Audit log actions recorded: {actions}")
    assert "STAGE_APPROVED" in actions
    assert "STAGE_REVISION_REQUESTED" in actions
    assert "STAGE_SUBMITTED_FOR_REVIEW" in actions
    print("[OK] Step 6: All audit log events recorded accurately.")

    db.close()
    print("\nALL APPROVAL & REVISION WORKFLOW TESTS PASSED PERFECTLY!\n")

if __name__ == "__main__":
    run_test()
