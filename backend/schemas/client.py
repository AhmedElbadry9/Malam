from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict
from schemas.task_stage import TaskStageBase, TaskStageOut
from schemas.common import DriveItemOut, AuditLogOut
from schemas.enums import ClientPriority


class FolderShareConfig(BaseModel):
    folder_type: str = "client_uploads"  # "client_uploads" or "team_deliverables"
    email: str
    role: str = "reader"  # "reader" or "writer"


class ClientCreate(BaseModel):
    name: str = Field(..., min_length=1)
    company_name: str = Field(..., min_length=1)
    service_type: Optional[str] = Field(default="خدمة عامة")
    request_details: Optional[str] = None
    priority: str = Field(default="medium")
    target_deadline_hours: int = Field(default=48, ge=1)
    target_deadline: Optional[datetime] = None
    drive_folder_url: Optional[str] = None
    website_url: Optional[str] = None
    agency_email: Optional[str] = None
    phone: Optional[str] = None
    platform: Optional[str] = None
    ticket_number: Optional[str] = None
    store_id: Optional[str] = None
    package_name: Optional[str] = None
    created_at: Optional[datetime] = None
    status: Optional[str] = "intake"
    sheet_url: Optional[str] = None
    brief_sheet: Optional[str] = None
    assignments: List[TaskStageBase] = Field(default_factory=list)
    share_email: Optional[str] = None
    share_role: Optional[str] = "reader"  # "reader" or "writer"
    folder_shares: List[FolderShareConfig] = Field(default_factory=list)

    @field_validator('priority')
    @classmethod
    def normalize_priority(cls, v: str) -> str:
        s = v.lower().strip() if v else "medium"
        if s in ["normal", "medium"]:
            return "medium"
        if s in ["high", "urgent", "low"]:
            return s
        return "medium"


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    company_name: Optional[str] = None
    service_type: Optional[str] = None
    request_details: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    ticket_number: Optional[str] = None
    store_id: Optional[str] = None
    package_name: Optional[str] = None
    target_deadline: Optional[datetime] = None
    target_deadline_hours: Optional[int] = None
    drive_folder_url: Optional[str] = None
    website_url: Optional[str] = None
    agency_email: Optional[str] = None
    phone: Optional[str] = None
    platform: Optional[str] = None
    sheet_url: Optional[str] = None
    brief_sheet: Optional[str] = None

    @field_validator('priority')
    @classmethod
    def normalize_priority(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        s = v.lower().strip()
        if s in ["normal", "medium"]:
            return "medium"
        if s in ["high", "urgent", "low"]:
            return s
        return "medium"


class ClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    company_name: str
    service_type: str
    request_details: Optional[str] = None
    priority: str
    status: str
    ticket_number: Optional[str] = None
    store_id: Optional[str] = None
    package_name: Optional[str] = None
    drive_folder_url: str
    drive_folder_id: str
    website_url: Optional[str] = None
    agency_email: Optional[str] = None
    phone: Optional[str] = None
    platform: Optional[str] = None
    sheet_url: Optional[str] = None
    brief_sheet: Optional[str] = None
    intake_timestamp: datetime
    target_deadline: Optional[datetime] = None
    completion_timestamp: Optional[datetime] = None
    progress_percentage: int
    stages: List[TaskStageOut] = Field(default_factory=list)
    drive_items: List[DriveItemOut] = Field(default_factory=list)
    audit_logs: List[AuditLogOut] = Field(default_factory=list)


class ShareDriveRequest(BaseModel):
    email: str = Field(..., min_length=3)
    role: str = Field(default="reader")
    folder_id: Optional[str] = None
    folder_type: Optional[str] = "root"

    @field_validator('email')
    @classmethod
    def strip_email(cls, v: str) -> str:
        return v.strip()


class UpdateDrivePermissionRequest(BaseModel):
    role: str = Field(default="reader")
    folder_id: Optional[str] = None


class ClientGroupHierarchy(BaseModel):
    client_name: str
    total_companies: int
    total_tasks: int
    active_tasks: int
    completed_tasks: int
    overall_progress: int
    companies: List[ClientOut]
