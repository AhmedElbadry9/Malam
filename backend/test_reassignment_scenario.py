import requests
import json
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

BASE = 'http://127.0.0.1:8000/api'

# 1. Fetch team members to get Ziyad and Dina
members_res = requests.get(f'{BASE}/members')
members = members_res.json()

ziyad = next((m for m in members if 'زياد' in m['name'] or 'abdallahyassein' in (m.get('email') or '')), None)
dina = next((m for m in members if 'دينا' in m['name'] or 'glowstudio' in (m.get('email') or '')), None)
mariam = next((m for m in members if 'مريم' in m['name'] or 'abdallah.work' in (m.get('email') or '')), None)

print('========================================')
print('📋 بيانات أعضاء الفريق الحقيقية من النظام:')
print(f'1. زياد طارق (ID: {ziyad["id"]} | Email: {ziyad.get("email")})')
print(f'2. دينا إبراهيم (ID: {dina["id"]} | Email: {dina.get("email")})')
if mariam:
    print(f'3. مريم الشريف (ID: {mariam["id"]} | Email: {mariam.get("email")})')
print('========================================\n')

# 2. Get or create a test client
clients = requests.get(f'{BASE}/clients').json()
client = clients[0] if clients else None

if not client:
    clients = requests.get(f'{BASE}/clients/hierarchy').json()
    client = clients[0] if clients else None

print(f'🏢 العميل قيد التجربة: {client["company_name"]} (ID: {client["id"]})')

# Find or add a stage in Social Media department
stages = client.get('stages', [])
stage = stages[0] if stages else None

if not stage:
    dept_id = ziyad['department_id'] if ziyad else 1
    add_res = requests.post(f'{BASE}/clients/{client["id"]}/assignments', json={
        'department_id': dept_id,
        'assigned_member_id': ziyad['id'],
        'stage_name': 'كتابة محتوى وخطة النشر للأسبوع الأول',
        'description': 'إعداد وكتابة البوستات الإعلانية'
    })
    stage = add_res.json()

stage_id = stage['id']
stage_name = stage['stage_name']
print(f'📌 المهمة المختبرة: [{stage_name}] (معرف المرحلة: {stage_id})\n')

# ==========================================================
# STEP 1: Assign task to Ziyad Tariq
# ==========================================================
print('🔵 [الخطوة 1]: إسناد المهمة إلى [زياد طارق]...')
r1 = requests.put(f'{BASE}/clients/{client["id"]}/assignments/{stage_id}', json={
    'assigned_member_id': ziyad['id']
})
assert r1.status_code == 200, f'Failed step 1: {r1.text}'

# Check tasks in Ziyad and Dina's workspaces
fresh_clients = requests.get(f'{BASE}/clients').json()
ziyad_tasks = [s['stage_name'] for c in fresh_clients for s in c.get('stages', []) if s.get('assigned_member_id') == ziyad['id']]
dina_tasks = [s['stage_name'] for c in fresh_clients for s in c.get('stages', []) if s.get('assigned_member_id') == dina['id']]

print(f'  » قائمة مهام زياد طارق الحالية: {ziyad_tasks}')
print(f'  » قائمة مهام دينا إبراهيم الحالية: {dina_tasks}')
assert stage_name in ziyad_tasks, 'زياد يجب أن يملك المهمة'
assert stage_name not in dina_tasks, 'دينا يجب ألا تملك المهمة'
print('  ✅ النتيجة: المهمة موجودة عند زياد فقط ومختفية تماماً من عند دينا.\n')

# ==========================================================
# STEP 2: Reassign task from Ziyad Tariq to Dina Ibrahim
# ==========================================================
print('🔄 [الخطوة 2]: تحويل المهمة من [زياد طارق] إلى [دينا إبراهيم]...')
r2 = requests.put(f'{BASE}/clients/{client["id"]}/assignments/{stage_id}', json={
    'assigned_member_id': dina['id']
})
assert r2.status_code == 200, f'Failed step 2: {r2.text}'

# Check tasks in Ziyad and Dina's workspaces again
fresh_clients2 = requests.get(f'{BASE}/clients').json()
ziyad_tasks_after = [s['stage_name'] for c in fresh_clients2 for s in c.get('stages', []) if s.get('assigned_member_id') == ziyad['id']]
dina_tasks_after = [s['stage_name'] for c in fresh_clients2 for s in c.get('stages', []) if s.get('assigned_member_id') == dina['id']]

print(f'  » قائمة مهام زياد طارق بعد التحويل: {ziyad_tasks_after}')
print(f'  » قائمة مهام دينا إبراهيم بعد التحويل: {dina_tasks_after}')

assert stage_name not in ziyad_tasks_after, 'المهمة يجب أن تكون حذفت واختفت من زياد'
assert stage_name in dina_tasks_after, 'المهمة يجب أن تكون ظهرت عند دينا'
print('  ✅ النتيجة: المهمة حُذفت واختفت تماماً من لوحة زياد، وظهرت حصراً في لوحة دينا!')

print('\n========================================')
print('🎉 تم اختبار السيناريو بنجاح تام وبشكل عملي ومباشر على قاعدة البيانات!')
print('========================================')
