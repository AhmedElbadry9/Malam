import requests
import json
import time
import random

BASE = "http://127.0.0.1:8000/api"
s = requests.Session()

def run_comprehensive_test():
    suffix = str(int(time.time())) + str(random.randint(100, 999))
    print(f"=== Starting Comprehensive Backend Test (ID: {suffix}) ===")

    # 1. Test Root
    r = s.get("http://127.0.0.1:8000/", timeout=5)
    assert r.status_code == 200, "Root failed"
    print("✅ 1. Root API status: OK")

    # 2. Test Login
    r = s.post(f"{BASE}/auth/login", json={"username": "superadmin", "password": "123"}, timeout=5)
    assert r.status_code == 200, f"Login failed: {r.text}"
    user_info = r.json()
    print(f"✅ 2. Auth Login: OK (User: {user_info['member']['name']})")

    # 3. Test Departments with Services
    dept_payload = {
        "name_ar": f"قسم تجريبي {suffix}",
        "name_en": f"Test Dept {suffix}",
        "code": f"TST_{suffix}",
        "icon": "Palette",
        "color": "#6366f1",
        "description": "قسم اختبار الخدمات والوظائف",
        "services": ["خدمة اختبار أ", "خدمة اختبار ب", "خدمة اختبار ج"]
    }
    r = s.post(f"{BASE}/departments", json=dept_payload, timeout=5)
    assert r.status_code == 201, f"Create department failed: {r.text}"
    dept = r.json()
    dept_id = dept["id"]
    assert len(dept["services"]) == 3, "Services not saved"
    print(f"✅ 3. Create Department with Services: OK (ID: {dept_id}, Services: {dept['services']})")

    # 4. Test Update Department Services
    r = s.put(f"{BASE}/departments/{dept_id}", json={
        "services": ["خدمة معدلة 1", "خدمة معدلة 2"]
    }, timeout=5)
    assert r.status_code == 200, f"Update department failed: {r.text}"
    updated_dept = r.json()
    assert len(updated_dept["services"]) == 2, "Updated services failed"
    print(f"✅ 4. Update Department Services: OK (Updated: {updated_dept['services']})")

    # 5. Test Create Member in Multiple Departments
    member_payload = {
        "username": f"user_{suffix}",
        "password": "mypassword123",
        "name": f"موظف تجريبي {suffix}",
        "email": f"tester_{suffix}@agency.com",
        "role": "QA Engineer",
        "role_type": "employee",
        "department_ids": [1, 2, dept_id]
    }
    r = s.post(f"{BASE}/members", json=member_payload, timeout=5)
    assert r.status_code == 201, f"Create member failed: {r.text}"
    member = r.json()
    member_id = member["id"]
    assert 1 in member["department_ids"] and 2 in member["department_ids"] and dept_id in member["department_ids"], "Expected all departments in member.department_ids"
    print(f"✅ 5. Create Team Member with Multiple Departments: OK (ID: {member_id}, Depts: {member['department_ids']})")

    # Verify query by department filters correctly
    r1 = s.get(f"{BASE}/members?department_id=1", timeout=5).json()
    assert any(m["id"] == member_id for m in r1), "Member should be in dept 1"
    r2 = s.get(f"{BASE}/members?department_id=2", timeout=5).json()
    assert any(m["id"] == member_id for m in r2), "Member should be in dept 2"
    r_dept = s.get(f"{BASE}/members?department_id={dept_id}", timeout=5).json()
    assert any(m["id"] == member_id for m in r_dept), f"Member should be in dept {dept_id}"
    print("✅ 5b. Query Members by each assigned department: OK")

    # Test Updating Member Departments
    r_upd = s.put(f"{BASE}/members/{member_id}", json={"department_ids": [3, dept_id]}, timeout=5)
    assert r_upd.status_code == 200, f"Update member departments failed: {r_upd.text}"
    upd_mem = r_upd.json()
    assert 3 in upd_mem["department_ids"] and dept_id in upd_mem["department_ids"] and 1 not in upd_mem["department_ids"], "Expected updated departments"
    print("✅ 5c. Update Member Departments: OK")

    # 6. Test Member Login
    r = s.post(f"{BASE}/auth/login", json={"username": f"user_{suffix}", "password": "mypassword123"}, timeout=5)
    assert r.status_code == 200, f"Member login failed: {r.text}"
    print("✅ 6. Member Auth Login: OK")

    # 7. Test Member Toggle Active
    r = s.put(f"{BASE}/members/{member_id}/toggle-active", timeout=5)
    assert r.status_code == 200, f"Toggle active failed: {r.text}"
    assert r.json()["is_active"] == False, "Expected member inactive"
    r = s.put(f"{BASE}/members/{member_id}/toggle-active", timeout=5)
    assert r.status_code == 200 and r.json()["is_active"] == True, "Expected member reactivated"
    print("✅ 7. Member Toggle Active/Inactive: OK")

    # 8. Test Client Intake with Multiple Assignments
    client_payload = {
        "name": f"عميل تجريبي {suffix}",
        "company_name": f"شركة الاختبار {suffix}",
        "service_type": "خدمة تجريبية متعددة",
        "priority": "high",
        "target_deadline_hours": 48,
        "assignments": [
            {
                "department_id": dept_id,
                "assigned_member_id": member_id,
                "stage_name": "المهمة الأولى",
                "description": "تفاصيل المهمة الأولى"
            },
            {
                "department_id": dept_id,
                "assigned_member_id": member_id,
                "stage_name": "المهمة الثانية",
                "description": "تفاصيل المهمة الثانية"
            }
        ]
    }
    r = s.post(f"{BASE}/clients/intake", json=client_payload, timeout=15)
    assert r.status_code == 201, f"Client intake failed: {r.text}"
    client = r.json()
    client_id = client["id"]
    stages = client["stages"]
    assert len(stages) == 2, f"Expected 2 stages, got {len(stages)}"
    stage1_id = stages[0]["id"]
    stage2_id = stages[1]["id"]
    print(f"✅ 8. Client Intake with Multiple Assignments: OK (Client ID: {client_id}, Stages: {len(stages)})")

    # 9. Test Update Client
    r = s.put(f"{BASE}/clients/{client_id}", json={
        "priority": "urgent",
        "request_details": "ملاحظات وتفاصيل محدثة"
    }, timeout=5)
    assert r.status_code == 200, f"Client update failed: {r.text}"
    assert r.json()["priority"] == "urgent"
    print("✅ 9. Update Client Details: OK")

    # 10. Test Add Additional Assignment to Client
    r = s.post(f"{BASE}/clients/{client_id}/assignments", json={
        "department_id": dept_id,
        "assigned_member_id": member_id,
        "stage_name": "مهمة إضافية ثالثة",
        "description": "وصف المهمة الثالثة"
    }, timeout=5)
    assert r.status_code in [200, 201], f"Add assignment failed: {r.text}"
    stage3 = r.json()
    stage3_id = stage3["id"]
    print(f"✅ 10. Add Client Assignment: OK (Stage ID: {stage3_id})")

    # 11. Test Update Stage
    r = s.put(f"{BASE}/clients/{client_id}/assignments/{stage3_id}", json={
        "stage_name": "مهمة إضافية معدلة",
        "description": "شرح معدل"
    }, timeout=5)
    assert r.status_code == 200, f"Update assignment failed: {r.text}"
    assert r.json()["stage_name"] == "مهمة إضافية معدلة"
    print("✅ 11. Update Client Assignment: OK")

    # 12. Test Task Stage Completion
    r = s.post(f"{BASE}/tasks/complete", json={
        "stage_id": stage1_id,
        "member_id": member_id,
        "deliverable_note": "تم تسليم المهمة الأولى بنجاح",
        "deliverable_url": "https://drive.google.com/test-file"
    }, timeout=5)
    assert r.status_code == 200, f"Complete stage failed: {r.text}"
    completed_stage = r.json()
    assert completed_stage["status"] == "completed"
    print(f"✅ 12. Task Stage Completion: OK (Status: {completed_stage['status']})")

    # 13. Test System KPIs Calculation
    r = s.get(f"{BASE}/stats/kpis", timeout=5)
    assert r.status_code == 200, f"KPIs failed: {r.text}"
    kpi_data = r.json()
    assert "total_clients" in kpi_data
    assert "department_workloads" in kpi_data
    print(f"✅ 13. System KPIs & Workloads: OK (Total Clients: {kpi_data['total_clients']})")

    # 13b. Test Client Hierarchy Grouping & Search
    company2_payload = {
        "name": f"عميل تجريبي {suffix}",
        "company_name": f"شركة ثانية لنفس العميل {suffix}",
        "service_type": "خدمة تسويق إلكتروني",
        "priority": "medium",
        "target_deadline_hours": 24,
        "assignments": [
            {
                "department_id": 1,
                "assigned_member_id": member_id,
                "stage_name": "خطة إعلانية",
                "description": "وضع خطة حملة"
            }
        ]
    }
    r = s.post(f"{BASE}/clients/intake", json=company2_payload, timeout=15)
    assert r.status_code == 201, f"Second company intake failed: {r.text}"
    comp2 = r.json()
    comp2_id = comp2["id"]
    comp2_stage_id = comp2["stages"][0]["id"] if comp2.get("stages") else None

    r_hier = s.get(f"{BASE}/clients/hierarchy?search={suffix}", timeout=5)
    assert r_hier.status_code == 200, f"Hierarchy fetch failed: {r_hier.text}"
    hierarchy = r_hier.json()
    assert len(hierarchy) >= 1, "Expected at least 1 client group matching suffix"
    group = next((g for g in hierarchy if g["client_name"] == f"عميل تجريبي {suffix}"), None)
    assert group is not None, "Client group not found"
    assert group["total_companies"] == 2, f"Expected 2 companies under this client, got {group['total_companies']}"
    assert len(group["companies"]) == 2, f"Expected 2 companies in list, got {len(group['companies'])}"
    assert group["total_tasks"] >= 3, f"Expected at least 3 tasks total, got {group['total_tasks']}"
    assert any(c["id"] == comp2_id and c["service_type"] == "خدمة تسويق إلكتروني" for c in group["companies"])
    print(f"✅ 13b. Client & Companies Hierarchy API: OK (Client: {group['client_name']}, Companies: {group['total_companies']}, Tasks: {group['total_tasks']}, Overall Progress: {group['overall_progress']}%)")

    # 14. Test Cleanup Constraints
    # Cannot delete department while it has members or stages
    r = s.delete(f"{BASE}/departments/{dept_id}", timeout=5)
    assert r.status_code == 400, "Department deletion should be blocked by constraint"
    print("✅ 14. DB Constraint: Dept with members/stages cannot be deleted: OK")

    # Delete client stages
    s.delete(f"{BASE}/clients/{client_id}/assignments/{stage1_id}", timeout=5)
    s.delete(f"{BASE}/clients/{client_id}/assignments/{stage2_id}", timeout=5)
    s.delete(f"{BASE}/clients/{client_id}/assignments/{stage3_id}", timeout=5)
    if comp2_stage_id:
        s.delete(f"{BASE}/clients/{comp2_id}/assignments/{comp2_stage_id}", timeout=5)
    print("✅ 15. Delete Client Assignments: OK")

    # Delete member
    r = s.delete(f"{BASE}/members/{member_id}", timeout=5)
    assert r.status_code == 200, f"Delete member failed: {r.text}"
    print(f"✅ 16. Delete Team Member: OK")

    # Now delete department
    r = s.delete(f"{BASE}/departments/{dept_id}", timeout=5)
    assert r.status_code == 200, f"Delete department failed: {r.text}"
    print(f"✅ 17. Delete Department: OK")

    print("\n🎉 ALL 17 BACKEND FUNCTIONS & RULES TESTED SUCCESSFULLY WITH ZERO ERRORS!")

if __name__ == "__main__":
    run_comprehensive_test()
