"""
Password hashing and verification utilities using bcrypt,
along with HMAC-SHA256 signed access token issuance and verification.
"""
import os
import time
import json
import base64
import hmac
import hashlib
import logging
from typing import Optional, Dict, Any
import bcrypt

logger = logging.getLogger(__name__)

SECRET_KEY = os.environ.get("SECRET_KEY", "malam-agency-super-secure-production-secret-key-2026")
DEFAULT_EXPIRE_MINUTES = 480  # 8 hours


def hash_password(plain_password: str) -> str:
    """
    Hashes a plaintext password using bcrypt with automatic salt generation.
    Returns the hashed password string suitable for database storage.
    """
    if not plain_password or not plain_password.strip():
        raise ValueError("Password cannot be empty")
    pwd_bytes = plain_password.strip().encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plaintext password against a bcrypt hash.
    Also handles legacy plaintext passwords by comparing directly if the stored
    value doesn't look like a bcrypt hash (migration support).
    """
    if not plain_password or not hashed_password:
        return False

    pwd_bytes = plain_password.strip().encode("utf-8")

    # Check if it's a bcrypt hash (starts with $2b$ or $2a$ or $2y$)
    if hashed_password.startswith(("$2b$", "$2a$", "$2y$")):
        try:
            return bcrypt.checkpw(pwd_bytes, hashed_password.encode("utf-8"))
        except (ValueError, TypeError) as e:
            logger.warning(f"Password verification error: {e}")
            return False
    else:
        # Legacy plaintext comparison
        return plain_password.strip() == hashed_password


def create_access_token(user_id: int, username: str, role_type: str, expires_minutes: int = DEFAULT_EXPIRE_MINUTES) -> str:
    """
    Creates an HMAC-SHA256 signed URL-safe bearer token.
    Contains: user_id (sub), username, role_type, exp (expiration timestamp).
    """
    payload = {
        "sub": user_id,
        "username": username,
        "role_type": role_type,
        "exp": int(time.time()) + (expires_minutes * 60)
    }
    raw_payload = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    b64_payload = base64.urlsafe_b64encode(raw_payload).decode('utf-8').rstrip('=')
    
    signature = hmac.new(
        SECRET_KEY.encode('utf-8'),
        b64_payload.encode('utf-8'),
        hashlib.sha256
    ).digest()
    b64_sig = base64.urlsafe_b64encode(signature).decode('utf-8').rstrip('=')
    
    return f"{b64_payload}.{b64_sig}"


def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies the HMAC-SHA256 signature and expiration of a bearer token.
    Returns the decoded payload dict if valid, or None if expired/tampered.
    """
    if not token or "." not in token:
        return None

    try:
        parts = token.strip().split(".")
        if len(parts) != 2:
            return None

        b64_payload, b64_sig = parts

        # Verify signature
        expected_sig = hmac.new(
            SECRET_KEY.encode('utf-8'),
            b64_payload.encode('utf-8'),
            hashlib.sha256
        ).digest()
        
        # Add padding back if necessary
        sig_padding = len(b64_sig) % 4
        padded_b64_sig = b64_sig + ('=' * (4 - sig_padding) if sig_padding else '')
        actual_sig = base64.urlsafe_b64decode(padded_b64_sig)

        if not hmac.compare_digest(expected_sig, actual_sig):
            return None

        # Decode payload
        payload_padding = len(b64_payload) % 4
        padded_b64_payload = b64_payload + ('=' * (4 - payload_padding) if payload_padding else '')
        payload_json = base64.urlsafe_b64decode(padded_b64_payload).decode('utf-8')
        payload = json.loads(payload_json)

        # Check expiration
        if payload.get("exp", 0) < time.time():
            return None

        return payload
    except Exception as e:
        logger.warning(f"Token verification error: {e}")
        return None
