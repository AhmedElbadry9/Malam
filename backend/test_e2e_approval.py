import urllib.request
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def test_api():
    print("Testing live API server at", BASE_URL)
    time.sleep(1) # wait for server to initialize
    
    # 1. Root check
    req = urllib.request.urlopen(f"{BASE_URL}/")
    data = json.loads(req.read().decode())
    assert data["status"] == "online"
    print("[OK] API root is online.")

    # 2. Login as employee (sara / 123)
    login_payload = json.dumps({"username": "sara", "password": "123"}).encode()
    login_req = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=login_payload, headers={"Content-Type": "application/json"})
    login_res = json.loads(urllib.request.urlopen(login_req).read().decode())
    emp = login_res["member"]
    print(f"[OK] Employee logged in: {emp['name']} (ID: {emp['id']})")

    # 3. Get clients to find an active stage for this employee
    clients_req = urllib.request.urlopen(f"{BASE_URL}/api/clients")
    clients = json.loads(clients_req.read().decode())
    target_stage = None
    target_client = None
    for c in clients:
        for s in c["stages"]:
            if s["assigned_member_id"] == emp["id"] and s["status"] in ["in_progress", "pending"]:
                target_stage = s
                target_client = c
                break
    if target_stage is None and len(clients) > 0:
        add_payload = json.dumps({
            "department_id": emp["department_id"] or 1,
            "assigned_member_id": emp["id"],
            "stage_name": "تصميم الهوية والشعار التجريبي",
            "description": "مهمة اختبارية للمراجعة والاعتماد"
        }).encode()
        add_req = urllib.request.Request(f"{BASE_URL}/api/clients/{clients[0]['id']}/assignments", data=add_payload, headers={"Content-Type": "application/json"})
        target_stage = json.loads(urllib.request.urlopen(add_req).read().decode())
        target_client = clients[0]

    assert target_stage is not None, "No active stage found for employee"
    print(f"[OK] Found target stage: #{target_stage['id']} '{target_stage['stage_name']}' for {target_client['company_name']}")

    # 4. Employee submits task for review
    submit_payload = json.dumps({
        "stage_id": target_stage["id"],
        "member_id": emp["id"],
        "deliverable_note": "تم الانتهاء من جميع المتطلبات ورفع النسخة التجريبية",
        "deliverable_url": "https://drive.google.com/test-e2e"
    }).encode()
    submit_req = urllib.request.Request(f"{BASE_URL}/api/tasks/submit-review", data=submit_payload, headers={"Content-Type": "application/json"})
    submitted = json.loads(urllib.request.urlopen(submit_req).read().decode())
    assert submitted["status"] == "under_review"
    print(f"[OK] Task submitted for review. Status: {submitted['status']}")

    # 5. Manager checks pending reviews endpoint
    pending_req = urllib.request.urlopen(f"{BASE_URL}/api/tasks/pending-reviews")
    pending = json.loads(pending_req.read().decode())
    assert any(p["stage"]["id"] == target_stage["id"] for p in pending)
    print(f"[OK] Manager retrieved pending reviews queue. Count: {len(pending)}")

    # 6. Manager requests revisions with feedback note
    rev_payload = json.dumps({
        "stage_id": target_stage["id"],
        "reviewer_id": 2, # Manager
        "action": "request_revision",
        "notes": "يرجى تعديل ألوان الترويسة واستخدام الخط المعتمد في الهوية"
    }).encode()
    rev_req = urllib.request.Request(f"{BASE_URL}/api/tasks/review", data=rev_payload, headers={"Content-Type": "application/json"})
    rev_res = json.loads(urllib.request.urlopen(rev_req).read().decode())
    assert rev_res["status"] == "revision_requested"
    assert "تعديل ألوان الترويسة" in rev_res["revision_notes"]
    print(f"[OK] Manager requested revisions. Status: {rev_res['status']}. Notes: {rev_res['revision_notes']}")

    # 7. Employee resubmits after revision
    resubmit_payload = json.dumps({
        "stage_id": target_stage["id"],
        "member_id": emp["id"],
        "deliverable_note": "تم تعديل ألوان الترويسة واستخدام الخط المعتمد بنجاح",
        "deliverable_url": "https://drive.google.com/test-e2e-revised"
    }).encode()
    resubmit_req = urllib.request.Request(f"{BASE_URL}/api/tasks/submit-review", data=resubmit_payload, headers={"Content-Type": "application/json"})
    resubmitted = json.loads(urllib.request.urlopen(resubmit_req).read().decode())
    assert resubmitted["status"] == "under_review"
    print(f"[OK] Employee resubmitted. Status returned to: {resubmitted['status']}")

    # 8. Manager approves task
    appr_payload = json.dumps({
        "stage_id": target_stage["id"],
        "reviewer_id": 2, # Manager
        "action": "approve"
    }).encode()
    appr_req = urllib.request.Request(f"{BASE_URL}/api/tasks/review", data=appr_payload, headers={"Content-Type": "application/json"})
    appr_res = json.loads(urllib.request.urlopen(appr_req).read().decode())
    assert appr_res["status"] == "completed"
    assert appr_res["reviewer_id"] == 2
    assert appr_res["completion_timestamp"] is not None
    print(f"[OK] Manager approved task. Status: {appr_res['status']}, Reviewer: {appr_res['reviewer_id']}")

    print("\n>>> LIVE SERVER END-TO-END APPROVAL WORKFLOW TEST COMPLETED SUCCESSFULLY! <<<\n")

if __name__ == "__main__":
    test_api()
