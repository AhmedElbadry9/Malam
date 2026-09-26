from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class DriveItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    path: str
    is_folder: bool
    file_type: Optional[str] = None
    file_size: Optional[str] = None
    drive_url: Optional[str] = None
    created_at: datetime


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: Optional[int] = None
    stage_id: Optional[int] = None
    action: str
    performed_by: str
    timestamp: datetime
    details: Optional[str] = None


class DepartmentWorkload(BaseModel):
    department_id: int
    name_ar: str
    name_en: str
    color: str
    icon: str
    total_active_tasks: int
    total_completed_tasks: int
    assigned_members_count: int


class SystemKPIs(BaseModel):
    total_clients: int
    active_clients: int
    completed_clients: int
    avg_completion_hours: float
    on_time_sla_rate: float
    department_workloads: List[DepartmentWorkload]
