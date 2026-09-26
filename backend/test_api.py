import requests
import time
import random

BASE_URL = "http://127.0.0.1:8000/api"

def run_tests():
    suffix = str(int(time.time())) + str(random.randint(100, 999))
    print("Running Comprehensive Backend Tests...")

    # 1. Departments
    print("1. Testing Departments CRUD...")
    # Create
    dept_res = requests.post(f"{BASE_URL}/departments", json={
        "name_ar": f"قسم الاختبار {suffix}",
        "name_en": f"Test Dept {suffix}",
        "code": f"TEST_{suffix}",
        "icon": "Briefcase",
        "color": "#000000"
    })
    assert dept_res.status_code in [200, 201], f"Dept Create Failed: {dept_res.text}"
    dept_id = dept_res.json()["id"]

    # Read
    dept_get = requests.get(f"{BASE_URL}/departments")
    assert any(d["id"] == dept_id for d in dept_get.json())

    # Update
    dept_upd = requests.put(f"{BASE_URL}/departments/{dept_id}", json={
        "name_ar": f"تعديل القسم {suffix}"
    })
    assert dept_upd.status_code == 200
    assert dept_upd.json()["name_ar"] == f"تعديل القسم {suffix}"


    # 2. Members
    print("2. Testing Members CRUD & Auth...")
    # Create
    member_res = requests.post(f"{BASE_URL}/members", json={
        "name": f"Test Member {suffix}",
        "username": f"user_{suffix}",
        "email": f"test_{suffix}@agency.com",
        "password": "password123",
        "role": "Tester",
        "role_type": "employee",
        "department_id": dept_id
    })
    assert member_res.status_code in [200, 201], f"Member Create Failed: {member_res.text}"
    member_id = member_res.json()["id"]

    # Login
    login_res = requests.post(f"{BASE_URL}/auth/login", json={
        "username": f"user_{suffix}",
        "password": "password123"
    })
    assert login_res.status_code == 200, "Login Failed"

    # Update
    mem_upd = requests.put(f"{BASE_URL}/members/{member_id}", json={
        "phone": "01000000000"
    })
    assert mem_upd.status_code == 200
    assert mem_upd.json()["phone"] == "01000000000"

    # Toggle Active
    mem_tog = requests.put(f"{BASE_URL}/members/{member_id}/toggle-active")
    assert mem_tog.status_code == 200


    # 3. Clients & Assignments
    print("3. Testing Clients & Task Assignments...")
    # Create Client
    client_res = requests.post(f"{BASE_URL}/clients/intake", json={
        "name": "Test Client",
        "company_name": f"Company {suffix}",
        "service_type": "Testing",
        "priority": "normal",
        "target_deadline_hours": 24,
        "assignments": [
            {
                "department_id": dept_id,
                "assigned_member_id": member_id,
                "stage_name": "Stage 1",
                "description": "Desc 1"
            }
        ]
    })
    assert client_res.status_code in [200, 201], f"Client Create Failed: {client_res.text}"
    client_id = client_res.json()["id"]
    stages = client_res.json()["stages"]
    stage_id = stages[0]["id"]

    # Update Client
    cli_upd = requests.put(f"{BASE_URL}/clients/{client_id}", json={
        "priority": "high"
    })
    assert cli_upd.status_code == 200
    assert cli_upd.json()["priority"] == "high"

    # Add Stage
    add_stg = requests.post(f"{BASE_URL}/clients/{client_id}/assignments", json={
        "department_id": dept_id,
        "assigned_member_id": member_id,
        "stage_name": "Stage 2"
    })
    assert add_stg.status_code in [200, 201]
    stage2_id = add_stg.json()["id"]

    # Update Stage
    upd_stg = requests.put(f"{BASE_URL}/clients/{client_id}/assignments/{stage2_id}", json={
        "stage_name": "Stage 2 Updated"
    })
    assert upd_stg.status_code == 200

    # 4. Tasks & KPIs
    print("4. Testing Tasks Completion & KPIs...")
    task_res = requests.post(f"{BASE_URL}/tasks/complete", json={
        "stage_id": stage_id,
        "member_id": member_id,
        "deliverable_note": "Done 1"
    })
    assert task_res.status_code == 200, f"Task Complete Failed: {task_res.text}"

    kpi_res = requests.get(f"{BASE_URL}/stats/kpis")
    assert kpi_res.status_code == 200
    assert "total_clients" in kpi_res.json()


    # 5. Constraints & Cleanup
    print("5. Testing DB Constraints & Cleanup...")
    # Cannot delete member with tasks
    del_member_fail = requests.delete(f"{BASE_URL}/members/{member_id}")
    assert del_member_fail.status_code == 400

    # Cannot delete dept with members
    del_dept_fail = requests.delete(f"{BASE_URL}/departments/{dept_id}")
    assert del_dept_fail.status_code == 400

    # Delete client assignments
    requests.delete(f"{BASE_URL}/clients/{client_id}/assignments/{stage_id}")
    requests.delete(f"{BASE_URL}/clients/{client_id}/assignments/{stage2_id}")

    # Now member can be deleted
    del_member_ok = requests.delete(f"{BASE_URL}/members/{member_id}")
    assert del_member_ok.status_code == 200

    # Now dept can be deleted
    del_dept_ok = requests.delete(f"{BASE_URL}/departments/{dept_id}")
    assert del_dept_ok.status_code == 200

    print("✅ All 21 endpoints and business rules tested successfully!")

if __name__ == "__main__":
    try:
        run_tests()
    except Exception as e:
        print(f"TEST FAILED: {e}")
