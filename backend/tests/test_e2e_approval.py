import pytest


def test_end_to_end_approval_workflow(client):
    """
    Comprehensive End-to-End Approval Workflow Test:
    1. Root check
    2. Employee login
    3. Query or create a client with an active task stage for employee
    4. Employee submits task for review (/api/tasks/submit-review)
    5. Manager queries pending reviews queue (/api/tasks/pending-reviews)
    6. Manager requests revisions with specific feedback note (/api/tasks/review)
    7. Employee resubmits task after addressing notes (/api/tasks/submit-review)
    8. Manager approves task (/api/tasks/review) -> verify completed status and timestamp
    """
    # 1. Root check
    root_res = client.get("/")
    assert root_res.status_code == 200
    assert root_res.json()["status"] == "online"

    # 2. Login as employee (sara / 123)
    login_res = client.post("/api/auth/login", json={"username": "sara", "password": "123"})
    assert login_res.status_code == 200
    emp = login_res.json()["member"]
    assert emp["username"] == "sara"

    # 3. Create a client with a task assigned to sara
    client_payload = {
        "name": "عميل تجريبي للاعتماد",
        "company_name": "مؤسسة الأفق للاستشارات",
        "service_type": "تصميم وتطوير متجر",
        "priority": "high",
        "drive_folder_url": "https://drive.google.com/drive/folders/test_approval_e2e",
        "assignments": [
            {
                "department_id": emp["department_id"] or 1,
                "assigned_member_id": emp["id"],
                "stage_name": "تصميم الهوية والشعار التجريبي",
                "description": "مهمة اختبارية للمراجعة والاعتماد"
            }
        ]
    }
    intake_res = client.post("/api/clients/intake", json=client_payload)
    assert intake_res.status_code == 201
    created_client = intake_res.json()
    stage = created_client["stages"][0]
    stage_id = stage["id"]

    # In our state machine: newly created stage is "pending".
    # An employee puts it into "in_progress" before submitting
    client.put(f"/api/clients/{created_client['id']}/stages/{stage_id}", json={
        "status": "in_progress"
    })

    # 4. Employee submits task for review
    submit_res = client.post("/api/tasks/submit-review", json={
        "stage_id": stage_id,
        "member_id": emp["id"],
        "deliverable_note": "تم الانتهاء من جميع المتطلبات ورفع النسخة التجريبية",
        "deliverable_url": "https://drive.google.com/test-e2e"
    })
    assert submit_res.status_code == 200
    submitted = submit_res.json()
    assert submitted["status"] == "under_review"

    # 5. Manager checks pending reviews endpoint
    pending_res = client.get("/api/tasks/pending-reviews")
    assert pending_res.status_code == 200
    pending_list = pending_res.json()
    assert any(p["stage"]["id"] == stage_id for p in pending_list)

    # 6. Manager requests revisions with feedback note
    rev_res = client.post("/api/tasks/review", json={
        "stage_id": stage_id,
        "reviewer_id": 2,  # Manager
        "action": "request_revision",
        "notes": "يرجى تعديل ألوان الترويسة واستخدام الخط المعتمد في الهوية"
    })
    assert rev_res.status_code == 200
    rev_data = rev_res.json()
    assert rev_data["status"] == "revision_requested"
    assert "تعديل ألوان الترويسة" in rev_data["revision_notes"]

    # 7. Employee resubmits after revision
    resubmit_res = client.post("/api/tasks/submit-review", json={
        "stage_id": stage_id,
        "member_id": emp["id"],
        "deliverable_note": "تم تعديل ألوان الترويسة واستخدام الخط المعتمد بنجاح",
        "deliverable_url": "https://drive.google.com/test-e2e-revised"
    })
    assert resubmit_res.status_code == 200
    resubmitted = resubmit_res.json()
    assert resubmitted["status"] == "under_review"

    # 8. Manager approves task
    appr_res = client.post("/api/tasks/review", json={
        "stage_id": stage_id,
        "reviewer_id": 2,
        "action": "approve"
    })
    assert appr_res.status_code == 200
    appr_data = appr_res.json()
    assert appr_data["status"] == "completed"
    assert appr_data["reviewer_id"] == 2
    assert appr_data["completion_timestamp"] is not None
