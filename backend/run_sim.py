import sys
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

from database.session import SessionLocal
import models
from schemas.task_stage import TaskStageUpdate
from services import task_service
import drive_service

db = SessionLocal()
client = db.query(models.Client).filter(models.Client.id == 1).first()
stage = db.query(models.TaskStage).filter(models.TaskStage.id == 1).first()

print(f'Initial stage: ID={stage.id}, assigned_member_id={stage.assigned_member_id}')

# 1. Update to Ziyad (4)
print('\n--- Updating to Ziyad (ID 4) ---')
stage_up1 = TaskStageUpdate(assigned_member_id=4)
task_service.update_task_stage(db, 1, stage.id, stage_up1)

# Check Drive perms
print('\nDrive permissions after assigning to Ziyad:')
for p in drive_service.list_folder_permissions(client.drive_folder_id):
    print(' -', p.get('emailAddress'), '->', p.get('role'))

# 2. Update to Dina (5)
print('\n--- Updating to Dina (ID 5) ---')
stage_up2 = TaskStageUpdate(assigned_member_id=5)
task_service.update_task_stage(db, 1, stage.id, stage_up2)

# Check Drive perms again
print('\nDrive permissions after assigning to Dina:')
for p in drive_service.list_folder_permissions(client.drive_folder_id):
    print(' -', p.get('emailAddress'), '->', p.get('role'))
