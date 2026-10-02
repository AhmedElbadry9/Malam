import pytest

def test_client_lifecycle_and_tasks(client):
    # 1. Create client intake with manual assignments
    client_payload = {
        "name": "مجموعة الفهد الاستثمارية",
        "company_name": "شركة الفهد للطاقة",
        "service_type": "هوية متكاملة وموقع إلكتروني",
        "priority": "urgent",
        "target_deadline_hours": 72,
        "drive_folder_url": "https://drive.google.com/drive/folders/custom_test_123",
        "assignments": [
            {
                "department_id": 1,
                "assigned_member_id": 1,
                "stage_name": "تصميم الشعار والهوية",
                "description": "تجهيز الشعار والملفات المصدرية"
            },
            {
                "department_id": 2,
                "assigned_member_id": 2,
                "stage_name": "برمجة الموقع والصفحة الرئيسية",
                "description": "تطوير المتجر وإعداد السيرفر"
            }
        ]
    }

    create_res = client.post("/api/clients/intake", json=client_payload)
    assert create_res.status_code == 201
    created_client = create_res.json()
    client_id = created_client["id"]
    assert created_client["drive_folder_url"] == "https://drive.google.com/drive/folders/custom_test_123"
    assert len(created_client["stages"]) == 2
    assert created_client["priority"] == "urgent"

    stage1 = created_client["stages"][0]
    stage1_id = stage1["id"]
    stage2 = created_client["stages"][1]
    stage2_id = stage2["id"]

    # 2. Add assignment manually to client
    new_stage_payload = {
        "department_id": 1,
        "assigned_member_id": 1,
        "stage_name": "إنتاج فيديو الموشن جرافيك",
        "description": "فيديو ترويجي 30 ثانية"
    }
    add_stage_res = client.post(f"/api/clients/{client_id}/assignments", json=new_stage_payload)
    assert add_stage_res.status_code == 200
    stage3_id = add_stage_res.json()["id"]

    # 3. Submit stage for review (by employee)
    submit_res = client.post("/api/tasks/submit-review", json={
        "stage_id": stage1_id,
        "member_id": 1,
        "deliverable_note": "تم الانتهاء من تصاميم الشعار",
        "deliverable_url": "https://drive.google.com/file/d/logo_test.pdf"
    })
    assert submit_res.status_code == 200
    assert submit_res.json()["status"] == "under_review"

    # 4. Check pending reviews endpoint
    pending_res = client.get("/api/tasks/pending-reviews")
    assert pending_res.status_code == 200
    pending_list = pending_res.json()
    assert any(p["stage"]["id"] == stage1_id for p in pending_list)

    # 5. Management review: Request Revision
    rev_res = client.post("/api/tasks/review", json={
        "stage_id": stage1_id,
        "reviewer_id": 1,
        "action": "request_revision",
        "notes": "يرجى تعديل ألوان الشعار لتناسب الهوية"
    })
    assert rev_res.status_code == 200
    assert rev_res.json()["status"] == "revision_requested"
    assert rev_res.json()["revision_notes"] == "يرجى تعديل ألوان الشعار لتناسب الهوية"

    # 6. Re-submit and Approve
    client.post("/api/tasks/submit-review", json={
        "stage_id": stage1_id,
        "member_id": 1,
        "deliverable_note": "تم تطبيق تعديل الألوان"
    })
    approve_res = client.post("/api/tasks/review", json={
        "stage_id": stage1_id,
        "reviewer_id": 1,
        "action": "approve"
    })
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "completed"

    # 7. Direct complete task stage (by admin)
    complete_res = client.post("/api/tasks/complete", json={
        "stage_id": stage2_id,
        "member_id": 2,
        "deliverable_note": "تم نشر الموقع بنجاح"
    })
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "completed"

    # 8. Update client details and Drive Folder URL
    update_res = client.put(f"/api/clients/{client_id}", json={
        "drive_folder_url": "https://drive.google.com/drive/folders/updated_url_789",
        "priority": "high"
    })
    assert update_res.status_code == 200
    assert update_res.json()["drive_folder_url"] == "https://drive.google.com/drive/folders/updated_url_789"
    assert update_res.json()["priority"] == "high"

    # 9. Verify Hierarchy API
    hier_res = client.get("/api/clients/hierarchy?search=الفهد")
    assert hier_res.status_code == 200
    groups = hier_res.json()
    assert len(groups) >= 1
    assert groups[0]["client_name"] == "مجموعة الفهد الاستثمارية"

    # 10. Clean up test stage
    del_stage_res = client.delete(f"/api/clients/{client_id}/assignments/{stage3_id}")
    assert del_stage_res.status_code == 200

def test_client_brief_sheet_11_columns(client):
    # 1. Create client
    res = client.post("/api/clients/intake", json={
        "name": "شركة النماء",
        "company_name": "متجر النماء للعطور",
        "service_type": "تسويق متكامل ومتاجر إلكترونية",
        "priority": "medium",
        "target_deadline_hours": 48
    })
    assert res.status_code == 201
    c_data = res.json()
    cid = c_data["id"]

    # Verify subfolders & spreadsheet drive items auto-created
    assert len(c_data["drive_items"]) >= 3
    item_names = [item["name"] for item in c_data["drive_items"]]
    assert any("01 - مرفقات ومواد العميل" in name for name in item_names)
    assert any("02 - مخرجات وشغل الفريق" in name for name in item_names)
    assert any("شيت بيانات واستراتيجية العميل" in name for name in item_names)

    # 2. Get brief sheet (11 columns)
    sheet_res = client.get(f"/api/clients/{cid}/brief-sheet")
    assert sheet_res.status_code == 200
    sheet_data = sheet_res.json()
    assert len(sheet_data["fields"]) == 11
    assert sheet_data["fields"][0]["key"] == "logo_brand_file"
    assert sheet_data["fields"][1]["key"] == "website_url"
    assert sheet_data["fields"][2]["key"] == "platform_theme"
    assert sheet_data["fields"][10]["key"] == "design_style"

    # 3. Update brief sheet
    update_res = client.put(f"/api/clients/{cid}/brief-sheet", json={
        "website_url": "https://alnamaa-store.com",
        "platform_theme": "منصة سلة - قالب رائد",
        "offers_discounts": "خصم 20% بكود NAMA20"
    })
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["raw_data"]["website_url"] == "https://alnamaa-store.com"
    assert updated_data["raw_data"]["platform_theme"] == "منصة سلة - قالب رائد"

def test_client_website_url_and_agency_email_generation(client):
    # Test www.saleh.com -> info+saleh@malamsa.com
    res = client.post("/api/clients/intake", json={
        "name": "صالح الأحمد",
        "company_name": "متاجر صالح",
        "service_type": "تصميم وتطوير متجر",
        "website_url": "www.saleh.com",
        "priority": "high",
        "target_deadline_hours": 24
    })
    assert res.status_code == 201
    data = res.json()
    assert data["website_url"] == "www.saleh.com"
    assert data["agency_email"] == "info+saleh@malamsa.com"

    cid = data["id"]
    # Verify brief sheet also has the website_url initialized
    sheet_res = client.get(f"/api/clients/{cid}/brief-sheet")
    assert sheet_res.status_code == 200
    assert sheet_res.json()["raw_data"]["website_url"] == "www.saleh.com"

    # Test update website_url
    up_res = client.put(f"/api/clients/{cid}", json={
        "website_url": "https://store.al-anaqa.sa"
    })
    assert up_res.status_code == 200
    assert up_res.json()["agency_email"] == "info+al-anaqa@malamsa.com"

def test_client_phone_and_platform_handling(client):
    # Test client with phone and standard platform (سلة)
    res = client.post("/api/clients/intake", json={
        "name": "عبد الله الشمري",
        "company_name": "مؤسسة الأفق للحلول",
        "service_type": "تسويق رقمي",
        "phone": "0551234567",
        "platform": "سلة",
        "priority": "medium",
        "target_deadline_hours": 48
    })
    assert res.status_code == 201
    data = res.json()
    assert data["phone"] == "0551234567"
    assert data["platform"] == "سلة"
    cid = data["id"]

    # Verify brief sheet platform_theme
    sheet_res = client.get(f"/api/clients/{cid}/brief-sheet")
    assert sheet_res.status_code == 200
    assert sheet_res.json()["raw_data"]["platform_theme"] == "سلة"

    # Test update with custom/other platform
    up_res = client.put(f"/api/clients/{cid}", json={
        "phone": "+966509876543",
        "platform": "ماجنتو المخصص"
    })
    assert up_res.status_code == 200
    up_data = up_res.json()
    assert up_data["phone"] == "+966509876543"
    assert up_data["platform"] == "ماجنتو المخصص"

def test_client_sheet_inside_subfolder_with_11_columns(client):
    res = client.post("/api/clients/intake", json={
        "name": "سلطان الراشد",
        "company_name": "متجر روعة الأناقة",
        "service_type": "تصميم وتجهيز متجر",
        "phone": "0501122334",
        "platform": "زد",
        "website_url": "www.rawaa-style.com",
        "priority": "high",
        "target_deadline_hours": 36
    })
    assert res.status_code == 201
    data = res.json()
    cid = data["id"]

    # Verify drive items created
    drive_items = data.get("drive_items", [])
    assert len(drive_items) >= 3

    sub1 = next((item for item in drive_items if "01 - مرفقات ومواد العميل" in item["name"]), None)
    assert sub1 is not None
    assert sub1["is_folder"] is True

    sub2 = next((item for item in drive_items if "02 - مخرجات وشغل الفريق" in item["name"]), None)
    assert sub2 is not None
    assert sub2["is_folder"] is True

    sheet_item = next((item for item in drive_items if item["file_type"] == "spreadsheet"), None)
    assert sheet_item is not None
    # Crucial: Sheet path must be inside Subfolder 1!
    assert sheet_item["path"].startswith("/01 - مرفقات ومواد العميل (Client Uploads)/")

    # Verify 11 columns in brief sheet API
    sheet_res = client.get(f"/api/clients/{cid}/brief-sheet")
    assert sheet_res.status_code == 200
    brief_data = sheet_res.json()
    assert len(brief_data["fields"]) == 11

    # Check that pre-filled fields are populated from intake
    raw = brief_data["raw_data"]
    assert raw["website_url"] == "www.rawaa-style.com"
    assert raw["platform_theme"] == "زد"


def test_delete_stage_with_audit_logs(client):
    # 1. Create a client with a task stage
    res = client.post("/api/clients/intake", json={
        "name": "عميل تجربة الحذف",
        "company_name": "مؤسسة الحذف الآمن",
        "service_type": "تسويق",
        "priority": "low",
        "assignments": [
            {
                "department_id": 1,
                "assigned_member_id": 1,
                "stage_name": "مهمة أولى للتجربة",
                "description": "وصف المهمة الأولى"
            }
        ]
    })
    assert res.status_code == 201
    cid = res.json()["id"]
    stage_id = res.json()["stages"][0]["id"]

    # 2. Perform updates and reviews to generate audit logs tied to this stage
    update_res = client.put(f"/api/clients/{cid}/assignments/{stage_id}", json={
        "stage_name": "مهمة تم تحديثها"
    })
    assert update_res.status_code == 200

    # 3. Delete the stage and verify it succeeds
    del_res = client.delete(f"/api/clients/{cid}/assignments/{stage_id}")
    assert del_res.status_code == 200
    assert del_res.json()["message"] == "تم حذف المرحلة بنجاح."

    # 4. Verify client stages are empty and progress recalculated
    client_res = client.get("/api/clients")
    assert client_res.status_code == 200
    created_client = next(c for c in client_res.json() if c["id"] == cid)
    assert len(created_client["stages"]) == 0
    assert created_client["progress_percentage"] == 0



