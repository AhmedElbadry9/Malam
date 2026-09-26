"""
Backward-compatibility layer for crud imports.
Delegates to modular services.
"""
from services import (
    create_client_intake as create_client_with_provisioning,
    update_client,
    get_clients_hierarchy,
    add_task_stage,
    update_task_stage,
    delete_task_stage,
    submit_stage_for_review,
    review_task_stage,
    get_pending_review_stages,
    complete_task_stage as mark_stage_complete,
    get_system_kpis,
    update_member,
    delete_member
)

__all__ = [
    "create_client_with_provisioning",
    "update_client",
    "get_clients_hierarchy",
    "add_task_stage",
    "update_task_stage",
    "delete_task_stage",
    "submit_stage_for_review",
    "review_task_stage",
    "get_pending_review_stages",
    "mark_stage_complete",
    "get_system_kpis",
    "update_member",
    "delete_member"
]
