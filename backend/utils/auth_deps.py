"""
Authentication and Authorization dependencies for FastAPI endpoints.
Supports:
1. Bearer Token in 'Authorization: Bearer <token>' header
2. X-User-ID header for internal integration / backwards compatibility
3. Role-based access control (RBAC) checking member.role_type
"""
import logging
from typing import Optional, List
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from database.session import get_db
import models
from utils.security import verify_access_token

logger = logging.getLogger(__name__)


def get_current_user(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[models.TeamMember]:
    """
    Extracts and authenticates the current user from headers.
    Returns the TeamMember instance or None if unauthenticated.
    """
    # 1. Bearer Token Authentication
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
        payload = verify_access_token(token)
        if payload and "sub" in payload:
            user_id = payload["sub"]
            member = db.query(models.TeamMember).filter(models.TeamMember.id == user_id).first()
            if member and member.is_active:
                return member
            elif member and not member.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="تم تعطيل هذا الحساب."
                )

    # 2. X-User-ID fallback
    if x_user_id and x_user_id.strip():
        try:
            uid = int(x_user_id.strip())
            member = db.query(models.TeamMember).filter(models.TeamMember.id == uid).first()
            if member and member.is_active:
                return member
            elif member and not member.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="تم تعطيل هذا الحساب."
                )
        except (ValueError, TypeError):
            pass

    return None


def require_authenticated_user(
    current_user: Optional[models.TeamMember] = Depends(get_current_user)
) -> models.TeamMember:
    """Dependency that requires any valid authenticated user."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="يجب تسجيل الدخول للوصول إلى هذا المورد."
        )
    return current_user


def require_roles(allowed_roles: List[str]):
    """
    Factory dependency for Role-Based Access Control (RBAC).
    superadmin and admin have universal access.
    """
    def role_checker(
        current_user: Optional[models.TeamMember] = Depends(get_current_user)
    ) -> Optional[models.TeamMember]:
        if not current_user:
            # If not authenticated, allow or require?
            # When role check is applied, authentication is required
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="يجب تسجيل الدخول لإجراء هذه العملية."
            )

        role = current_user.role_type or "employee"
        # super_admin and admin bypass all role restrictions
        if role in ("super_admin", "admin"):
            return current_user

        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"ليس لديك الصلاحية الكافية لإجراء هذه العملية (مطلوب: {', '.join(allowed_roles)})."
            )
        return current_user

    return role_checker
