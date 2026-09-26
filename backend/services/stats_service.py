from datetime import datetime
from sqlalchemy.orm import Session
import models
import schemas


def get_system_kpis(db: Session) -> schemas.SystemKPIs:
    clients = db.query(models.Client).all()
    total_clients = len(clients)
    active_clients = sum(1 for c in clients if c.status in ["intake", "in_progress", "review"])
    completed_clients = sum(1 for c in clients if c.status == "completed")

    # On-time calculation & average completion hours calculation
    completed_with_deadline = [
        c for c in clients
        if c.status == "completed" and c.completion_timestamp and c.target_deadline
    ]
    on_time_count = sum(1 for c in completed_with_deadline if c.completion_timestamp <= c.target_deadline)
    on_time_rate = (on_time_count / len(completed_with_deadline) * 100) if completed_with_deadline else 100.0

    # Dynamic calculation of avg completion hours from actual timestamps
    completed_with_intake = [
        c for c in clients
        if c.status == "completed" and c.completion_timestamp and c.intake_timestamp
    ]
    if completed_with_intake:
        durations = [
            (c.completion_timestamp - c.intake_timestamp).total_seconds() / 3600.0
            for c in completed_with_intake
            if (c.completion_timestamp - c.intake_timestamp).total_seconds() >= 0
        ]
        avg_hours = round(sum(durations) / len(durations), 1) if durations else 0.0
    else:
        avg_hours = 0.0

    # Department Workloads
    departments = db.query(models.Department).all()
    dep_workloads = []
    for dep in departments:
        stages = db.query(models.TaskStage).filter(models.TaskStage.department_id == dep.id).all()
        active_t = sum(1 for s in stages if s.status in ["pending", "in_progress", "under_review", "revision_requested"])
        comp_t = sum(1 for s in stages if s.status == "completed")
        members_c = db.query(models.TeamMember).filter(
            (models.TeamMember.department_id == dep.id) | 
            (models.TeamMember.departments.any(models.Department.id == dep.id))
        ).distinct().count()

        dep_workloads.append(schemas.DepartmentWorkload(
            department_id=dep.id,
            name_ar=dep.name_ar,
            name_en=dep.name_en,
            color=dep.color,
            icon=dep.icon,
            total_active_tasks=active_t,
            total_completed_tasks=comp_t,
            assigned_members_count=members_c
        ))

    return schemas.SystemKPIs(
        total_clients=total_clients,
        active_clients=active_clients,
        completed_clients=completed_clients,
        avg_completion_hours=avg_hours,
        on_time_sla_rate=round(on_time_rate, 1),
        department_workloads=dep_workloads
    )
