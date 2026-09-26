from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from schemas.department import DepartmentOut
from schemas.team_member import TeamMemberOut
from schemas.enums import TaskStageStatus, TaskReviewAction


class TaskStageBase(BaseModel):
    department_id: int
    assigned_member_id: Optional[int] = None
    stage_name: str = Field(..., min_length=1)
    description: Optional[str] = None
    assigned_by_id: Optional[int] = None


class TaskStageCreate(BaseModel):
    department_id: int
    assigned_member_id: Optional[int] = None
    stage_name: str = Field(..., min_length=1)
    description: Optional[str] = None
    order_index: Optional[int] = None
    assigned_by_id: Optional[int] = None


class TaskStageUpdate(BaseModel):
    department_id: Optional[int] = None
    assigned_member_id: Optional[int] = None
    stage_name: Optional[str] = None
    description: Optional[str] = None
    order_index: Optional[int] = None
    status: Optional[str] = None
    deliverable_note: Optional[str] = None
    deliverable_url: Optional[str] = None
    assigned_by_id: Optional[int] = None


class TaskStageOut(TaskStageBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int
    status: str
    completion_timestamp: Optional[datetime] = None
    deliverable_note: Optional[str] = None
    deliverable_url: Optional[str] = None
    order_index: int
    revision_notes: Optional[str] = None
    reviewer_id: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    assigned_by_id: Optional[int] = None
    department: Optional[DepartmentOut] = None
    assigned_member: Optional[TeamMemberOut] = None
    reviewer: Optional[TeamMemberOut] = None
    assigned_by: Optional[TeamMemberOut] = None


class StageCompleteRequest(BaseModel):
    stage_id: int
    member_id: int
    deliverable_note: Optional[str] = None
    deliverable_url: Optional[str] = None


class TaskReviewRequest(BaseModel):
    stage_id: int
    reviewer_id: int
    action: str = Field(..., description="'approve' or 'request_revision'")
    notes: Optional[str] = None


class PendingReviewItemOut(BaseModel):
    stage: TaskStageOut
    client_name: str
    company_name: str
    client_id: int
