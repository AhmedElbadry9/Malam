import pytest
from utils.security import hash_password, verify_password, create_access_token, verify_access_token


def test_password_hashing_and_verification():
    raw = "P@ssw0rdSecure2026"
    hashed = hash_password(raw)
    
    assert hashed.startswith("$2b$")
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False
    assert verify_password("", hashed) is False


def test_token_creation_and_tampering():
    token = create_access_token(user_id=42, username="ahmed", role_type="admin", expires_minutes=60)
    assert token is not None
    assert "." in token
    
    payload = verify_access_token(token)
    assert payload is not None
    assert payload["sub"] == 42
    assert payload["username"] == "ahmed"
    assert payload["role_type"] == "admin"
    
    # Tampering with payload
    parts = token.split(".")
    tampered_token = f"{parts[0]}tampered.{parts[1]}"
    assert verify_access_token(tampered_token) is None
    
    # Tampering with signature
    tampered_sig = f"{parts[0]}.wrongsignature"
    assert verify_access_token(tampered_sig) is None


def test_token_expiration():
    # Expired token (negative minutes)
    expired_token = create_access_token(user_id=1, username="test", role_type="employee", expires_minutes=-10)
    assert verify_access_token(expired_token) is None


def test_rbac_endpoint_protection(client):
    # 1. Login as employee sara
    login_res = client.post("/api/auth/login", json={"username": "sara", "password": "123"})
    assert login_res.status_code == 200
    token = login_res.json().get("access_token")
    assert token is not None
    
    # 2. Login as superadmin
    admin_res = client.post("/api/auth/login", json={"username": "superadmin", "password": "123"})
    assert admin_res.status_code == 200
    admin_token = admin_res.json().get("access_token")
    assert admin_token is not None
