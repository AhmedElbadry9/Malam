from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict
from schemas.department import DepartmentOut
from schemas.enums import RoleType


class TeamMemberBase(BaseModel):
    username: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    role: str = Field(..., min_length=1)
    email: str = Field(..., min_length=3)
    phone: Optional[str] = None
    avatar: Optional[str] = None
    department_id: Optional[int] = None
    department_ids: Optional[List[int]] = Field(default_factory=list)
    role_type: str = Field(default=RoleType.EMPLOYEE.value)
    is_active: bool = True

    @field_validator('username')
    @classmethod
    def strip_username(cls, v: str) -> str:
        return v.strip().lower() if v else v

    @field_validator('email')
    @classmethod
    def strip_email(cls, v: str) -> str:
        return v.strip().lower() if v else v


class TeamMemberUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    avatar: Optional[str] = None
    department_id: Optional[int] = None
    department_ids: Optional[List[int]] = None
    role_type: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator('username')
    @classmethod
    def strip_username(cls, v: Optional[str]) -> Optional[str]:
        return v.strip().lower() if v else v

    @field_validator('email')
    @classmethod
    def strip_email(cls, v: Optional[str]) -> Optional[str]:
        return v.strip().lower() if v else v


class TeamMemberCreate(TeamMemberBase):
    password: str = Field(..., min_length=4)


class ChangePasswordRequest(BaseModel):
    member_id: Optional[int] = None
    new_password: str = Field(..., min_length=4)

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        s = v.strip()
        if not s or len(s) < 4:
            raise ValueError("كلمة المرور يجب أن تكون 4 أحرف على الأقل")
        return s


class TeamMemberOut(TeamMemberBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    department: Optional[DepartmentOut] = None
    departments: List[DepartmentOut] = Field(default_factory=list)
    department_ids: List[int] = Field(default_factory=list)


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)

    @field_validator('username')
    @classmethod
    def strip_username(cls, v: str) -> str:
        return v.strip()

    @field_validator('password')
    @classmethod
    def strip_password(cls, v: str) -> str:
        return v.strip()


class AuthResponse(BaseModel):
    user_type: str
    member: Optional[TeamMemberOut] = None
    access_token: Optional[str] = None
    token_type: Optional[str] = "bearer"
    message: str
