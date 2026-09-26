import pytest

def test_list_members(client):
    res = client.get("/api/members")
    assert res.status_code == 200
    members = res.json()
    assert isinstance(members, list)
    assert len(members) >= 1

def test_create_update_toggle_member(client):
    member_payload = {
        "username": "tester_dev",
        "password": "password123",
        "name": "مهندس تجريبي",
        "role": "Full Stack Dev",
        "email": "tester_dev@example.com",
        "department_id": 1,
        "department_ids": [1, 2],
        "role_type": "employee",
        "is_active": True
    }
    create_res = client.post("/api/members", json=member_payload)
    assert create_res.status_code == 201
    member = create_res.json()
    member_id = member["id"]
    assert member["username"] == "tester_dev"

    # Toggle active
    toggle_res = client.put(f"/api/members/{member_id}/toggle-active")
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_active"] is False

    # Attempt login while inactive should be 403 Forbidden
    login_res = client.post("/api/auth/login", json={"username": "tester_dev", "password": "password123"})
    assert login_res.status_code == 403

    # Toggle back to active
    client.put(f"/api/members/{member_id}/toggle-active")

    # Change password
    pwd_res = client.put(f"/api/members/{member_id}/password", json={"new_password": "newsecretpassword"})
    assert pwd_res.status_code == 200

    # Delete member
    del_res = client.delete(f"/api/members/{member_id}")
    assert del_res.status_code == 200
