import urllib.request
import json

# Test POST /api/departments
data = json.dumps({
    "name_ar": "قسم التسويق",
    "name_en": "Marketing",
    "code": "marketing",
    "icon": "Megaphone",
    "color": "#f97316",
    "description": "قسم التسويق الرقمي"
}).encode('utf-8')

req = urllib.request.Request(
    'http://localhost:8000/api/departments',
    data=data,
    headers={'Content-Type': 'application/json'},
    method='POST'
)

try:
    r = urllib.request.urlopen(req, timeout=5)
    result = json.loads(r.read().decode('utf-8'))
    print("SUCCESS:", json.dumps(result, ensure_ascii=False, indent=2))
except urllib.error.HTTPError as e:
    body = e.read().decode('utf-8')
    print(f"HTTP Error {e.code}: {body}")
except Exception as e:
    print(f"Error: {e}")
