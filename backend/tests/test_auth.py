import pytest

def test_login_superadmin_success(client):
    res = client.post("/api/auth/login", json={"username": "superadmin", "password": "123"})
    assert res.status_code == 200
    data = res.json()
    assert data["user_type"] in ["admin", "super_admin"]
    assert data["member"]["username"] == "superadmin"

def test_login_admin_success(client):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "123"})
    assert res.status_code == 200
    data = res.json()
    assert data["user_type"] == "admin"

def test_login_head_success(client):
    res = client.post("/api/auth/login", json={"username": "head", "password": "123"})
    assert res.status_code == 200
    data = res.json()
    assert data["user_type"] == "head"
    assert data["member"]["username"] == "head"

def test_login_employee_success(client):
    res = client.post("/api/auth/login", json={"username": "ahmed", "password": "123"})
    assert res.status_code == 200
    data = res.json()
    assert data["user_type"] == "employee"

def test_login_whitespace_trimming(client):
    # Tests that whitespace around username and password gets trimmed cleanly
    res = client.post("/api/auth/login", json={"username": "  admin  ", "password": " 123 "})
    assert res.status_code == 200
    assert res.json()["user_type"] == "admin"

def test_login_wrong_password_returns_401(client):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "wrong_password"})
    assert res.status_code == 401
    assert "غير صحيحة" in res.json()["detail"]

def test_login_nonexistent_user_returns_401(client):
    res = client.post("/api/auth/login", json={"username": "ghost_user", "password": "123"})
    assert res.status_code == 401
    assert "غير صحيحة" in res.json()["detail"]

def test_login_missing_fields_validation_422(client):
    res = client.post("/api/auth/login", json={"username": "admin"})
    assert res.status_code == 422
    assert "detail" in res.json()
