import logging
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import models
import schemas
from utils.security import hash_password, verify_password, create_access_token

logger = logging.getLogger(__name__)


def authenticate_user(db: Session, req: schemas.LoginRequest) -> schemas.AuthResponse:
    uname = req.username.strip()
    pwd = req.password.strip()

    member = db.query(models.TeamMember).filter(
        (models.TeamMember.username == uname) | (models.TeamMember.email == uname)
    ).first()

    if not member or not verify_password(pwd, member.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="اسم المستخدم أو كلمة المرور غير صحيحة"
        )

    if not member.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="تم تعطيل هذا الحساب من قبل إدارة الوكالة."
        )

    # Auto-migrate legacy plaintext passwords to bcrypt on successful login
    if not member.password.startswith(("$2b$", "$2a$", "$2y$")):
        try:
            member.password = hash_password(pwd)
            db.commit()
            logger.info(f"Auto-migrated password hash for user: {member.username}")
        except Exception as e:
            logger.warning(f"Failed to auto-migrate password for {member.username}: {e}")
            db.rollback()

    token = create_access_token(
        user_id=member.id,
        username=member.username,
        role_type=member.role_type or "employee"
    )

    return schemas.AuthResponse(
        user_type=member.role_type or "employee",
        member=member,
        access_token=token,
        token_type="bearer",
        message=f"أهلاً بك {member.name}! تم تسجيل الدخول بنجاح."
    )


def change_user_password(db: Session, member_id: int, new_password: str):
    member = db.query(models.TeamMember).filter(models.TeamMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="المستخدم غير موجود")

    clean_pwd = new_password.strip()
    if len(clean_pwd) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="كلمة المرور يجب أن تكون 4 أحرف على الأقل"
        )

    member.password = hash_password(clean_pwd)
    db.commit()
    return {"message": "تم تغيير كلمة المرور بنجاح"}


def toggle_user_active(db: Session, member_id: int):
    member = db.get(models.TeamMember, member_id)
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="المستخدم غير موجود")

    member.is_active = not member.is_active
    db.commit()
    status_str = "تفعيل" if member.is_active else "تعطيل"
    return {
        "message": f"تم {status_str} حساب ({member.name}) بنجاح.",
        "is_active": member.is_active
    }
