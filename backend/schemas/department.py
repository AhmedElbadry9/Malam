from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class DepartmentBase(BaseModel):
    name_ar: str = Field(..., min_length=1, description="اسم القسم باللغة العربية")
    name_en: Optional[str] = Field(default="", description="Department name in English")
    code: Optional[str] = Field(default="", description="رمز القسم الفريد")
    icon: str = Field(default="Briefcase")
    color: str = Field(default="#6366f1")
    description: Optional[str] = None
    roles: Optional[List[str]] = Field(default_factory=list, description="الأدوار والمسميات الوظيفية للقسم")
    services: Optional[List[str]] = Field(default_factory=list, description="المهام والخدمات التي يوفرها القسم")


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name_ar: Optional[str] = None
    name_en: Optional[str] = None
    code: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    roles: Optional[List[str]] = None
    services: Optional[List[str]] = None


class DepartmentOut(DepartmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
