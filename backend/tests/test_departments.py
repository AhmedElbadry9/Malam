import pytest

def test_list_departments(client):
    res = client.get("/api/departments")
    assert res.status_code == 200
    depts = res.json()
    assert isinstance(depts, list)
    assert len(depts) >= 1

def test_create_and_update_department(client):
    new_dept = {
        "name_ar": "قسم التطوير التقني",
        "name_en": "Tech Development",
        "code": "TECH_UNIT",
        "icon": "Code",
        "color": "#10b981",
        "description": "قسم البرمجة والمواقع والتطبيقات",
        "services": ["تطوير واجهات", "تطوير تطبيقات", "ربط API"]
    }
    create_res = client.post("/api/departments", json=new_dept)
    assert create_res.status_code == 201
    created_data = create_res.json()
    dept_id = created_data["id"]
    assert created_data["code"] == "TECH_UNIT"
    assert len(created_data["services"]) == 3

    # Duplicate code rejection test
    dup_res = client.post("/api/departments", json=new_dept)
    assert dup_res.status_code == 400

    # Update test
    update_payload = {"description": "وصف محدث للقسم"}
    upd_res = client.put(f"/api/departments/{dept_id}", json=update_payload)
    assert upd_res.status_code == 200
    assert upd_res.json()["description"] == "وصف محدث للقسم"

    # Delete test
    del_res = client.delete(f"/api/departments/{dept_id}")
    assert del_res.status_code == 200
