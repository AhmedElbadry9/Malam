from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.session import get_db
import schemas
from services import auth_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=schemas.AuthResponse)
def login_user(req: schemas.LoginRequest, db: Session = Depends(get_db)):
    """
    تسجيل الدخول للمستخدمين والمدراء مع التحقق من تفعيل الحساب وإزالة المسافات الزائدة.
    """
    return auth_service.authenticate_user(db, req)
