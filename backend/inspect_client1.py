import requests
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

BASE = 'http://127.0.0.1:8000/api'
c = requests.get(f'{BASE}/clients/1').json()
print('Client company:', c.get('company_name'))
print('Stages:')
for s in c.get('stages', []):
    mem_name = s.get('assigned_member', {}).get('name') if s.get('assigned_member') else 'None'
    print(f' - Stage ID: {s.get("id")}, Name: {s.get("stage_name")}, Member ID: {s.get("assigned_member_id")} ({mem_name}), Status: {s.get("status")}')
