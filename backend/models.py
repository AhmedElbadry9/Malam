from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, Table, Index
from sqlalchemy.orm import relationship
from database import Base


def _utc_now():
    """Returns current UTC time. Used as a callable default for SQLAlchemy columns."""
    return datetime.now(timezone.utc)


# Many-to-Many Association Table between Team Members and Departments
member_departments = Table(
    "member_departments",
    Base.metadata,
    Column("member_id", Integer, ForeignKey("team_members.id", ondelete="CASCADE"), primary_key=True),
    Column("department_id", Integer, ForeignKey("departments.id", ondelete="CASCADE"), primary_key=True)
)


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name_ar = Column(String, nullable=False)
    name_en = Column(String, nullable=False)
    code = Column(String, unique=True, index=True)
    icon = Column(String, default="Briefcase")
    color = Column(String, default="#6366f1")
    description = Column(Text, nullable=True)
    services_json = Column("services", Text, default="[]")
    roles_json = Column("roles", Text, default="[]")

    @property
    def services(self):
        if not self.services_json:
            return []
        try:
            import json
            return json.loads(self.services_json)
        except (json.JSONDecodeError, TypeError):
            return []

    @services.setter
    def services(self, val):
        import json
        if isinstance(val, list):
            self.services_json = json.dumps(val, ensure_ascii=False)
        elif isinstance(val, str):
            self.services_json = val
        else:
            self.services_json = "[]"

    @property
    def roles(self):
        if not self.roles_json:
            return []
        try:
            import json
            return json.loads(self.roles_json)
        except (json.JSONDecodeError, TypeError):
            return []

    @roles.setter
    def roles(self, val):
        import json
        if isinstance(val, list):
            self.roles_json = json.dumps(val, ensure_ascii=False)
        elif isinstance(val, str):
            self.roles_json = val
        else:
            self.roles_json = "[]"

    members = relationship("TeamMember", secondary=member_departments, back_populates="departments")
    primary_members = relationship("TeamMember", back_populates="department", foreign_keys="TeamMember.department_id")
    stages = relationship("TaskStage", back_populates="department")


class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    phone = Column(String, nullable=True)
    avatar = Column(String, nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    role_type = Column(String, default="employee")  # admin, manager, head, employee, super_admin
    is_active = Column(Boolean, default=True)

    department = relationship("Department", back_populates="primary_members", foreign_keys=[department_id])
    departments = relationship("Department", secondary=member_departments, back_populates="members")
    assigned_stages = relationship("TaskStage", back_populates="assigned_member", foreign_keys="[TaskStage.assigned_member_id]")

    @property
    def department_ids(self):
        ids = [d.id for d in self.departments] if self.departments else []
        if self.department_id and self.department_id not in ids:
            ids.insert(0, self.department_id)
        return ids


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    company_name = Column(String, nullable=False)
    service_type = Column(String, nullable=False)
    request_details = Column(Text, nullable=True)
    priority = Column(String, default="medium")
    status = Column(String, default="intake", index=True)
    drive_folder_url = Column(String, nullable=False)
    drive_folder_id = Column(String, nullable=False)
    website_url = Column(String, nullable=True)
    agency_email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    platform = Column(String, nullable=True)
    ticket_number = Column(String, nullable=True, index=True)
    store_id = Column(String, nullable=True)
    package_name = Column(String, nullable=True)
    brief_sheet = Column(Text, nullable=True)  # JSON storing the 11 standardized columns
    sheet_url = Column(String, nullable=True)
    intake_timestamp = Column(DateTime, default=_utc_now)
    target_deadline = Column(DateTime, nullable=True)
    completion_timestamp = Column(DateTime, nullable=True)
    progress_percentage = Column(Integer, default=0)

    stages = relationship("TaskStage", back_populates="client", cascade="all, delete-orphan")
    drive_items = relationship("DriveFolderItem", back_populates="client", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="client", cascade="all, delete-orphan")

    # Composite index for common query patterns
    __table_args__ = (
        Index("ix_clients_status_priority", "status", "priority"),
    )


# ---------------------------------------------------------------------------
# Task Stage Status Constants & State Machine
# ---------------------------------------------------------------------------
VALID_TASK_STATUSES = {"pending", "in_progress", "under_review", "revision_requested", "completed"}

# Allowed transitions: current_status -> set of valid next statuses
TASK_STATUS_TRANSITIONS = {
    "pending":              {"in_progress", "completed"},
    "in_progress":          {"under_review", "completed", "pending", "revision_requested"},
    "under_review":         {"completed", "revision_requested", "in_progress"},
    "revision_requested":   {"in_progress", "under_review", "completed"},
    "completed":            {"in_progress", "revision_requested", "under_review"},
}


def validate_task_transition(current_status: str, new_status: str) -> bool:
    """Returns True if the status transition is allowed by the state machine."""
    if current_status == new_status:
        return True  # No-op is always allowed
    allowed = TASK_STATUS_TRANSITIONS.get(current_status, set())
    return new_status in allowed


class TaskStage(Base):
    __tablename__ = "task_stages"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False, index=True)
    assigned_member_id = Column(Integer, ForeignKey("team_members.id"), index=True)
    stage_name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, default="pending", index=True)  # pending, in_progress, under_review, revision_requested, completed
    completion_timestamp = Column(DateTime, nullable=True)
    deliverable_note = Column(Text, nullable=True)
    deliverable_url = Column(String, nullable=True)
    order_index = Column(Integer, default=0)
    revision_notes = Column(Text, nullable=True)
    reviewer_id = Column(Integer, ForeignKey("team_members.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    assigned_by_id = Column(Integer, ForeignKey("team_members.id"), nullable=True)

    client = relationship("Client", back_populates="stages")
    department = relationship("Department", back_populates="stages")
    assigned_member = relationship("TeamMember", back_populates="assigned_stages", foreign_keys=[assigned_member_id])
    reviewer = relationship("TeamMember", foreign_keys=[reviewer_id])
    assigned_by = relationship("TeamMember", foreign_keys=[assigned_by_id])


class DriveFolderItem(Base):
    __tablename__ = "drive_folder_items"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    path = Column(String, nullable=False)
    is_folder = Column(Boolean, default=True)
    file_type = Column(String, nullable=True)
    file_size = Column(String, nullable=True)
    drive_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=_utc_now)

    client = relationship("Client", back_populates="drive_items")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True, index=True)
    stage_id = Column(Integer, ForeignKey("task_stages.id"), nullable=True, index=True)
    action = Column(String, nullable=False, index=True)
    performed_by = Column(String, nullable=False)
    timestamp = Column(DateTime, default=_utc_now)
    details = Column(Text, nullable=True)

    client = relationship("Client", back_populates="audit_logs")
