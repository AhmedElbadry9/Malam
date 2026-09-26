from enum import Enum

class ClientPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class ClientStatus(str, Enum):
    INTAKE = "intake"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    COMPLETED = "completed"

class RoleType(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    MANAGER = "manager"
    HEAD = "head"
    EMPLOYEE = "employee"

class TaskStageStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    UNDER_REVIEW = "under_review"
    REVISION_REQUESTED = "revision_requested"
    COMPLETED = "completed"

class TaskReviewAction(str, Enum):
    APPROVE = "approve"
    REQUEST_REVISION = "request_revision"

class DriveShareRole(str, Enum):
    READER = "reader"
    WRITER = "writer"
    COMMENTER = "commenter"
