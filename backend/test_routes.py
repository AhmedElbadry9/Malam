import sys
sys.path.insert(0, r'd:\opersting system\backend')

# Check if schemas have the right classes
import schemas
print("DepartmentCreate:", hasattr(schemas, 'DepartmentCreate'))
print("DepartmentUpdate:", hasattr(schemas, 'DepartmentUpdate'))

# Import the app and list its routes
from main import app
for route in app.routes:
    if hasattr(route, 'path') and 'department' in route.path.lower():
        methods = getattr(route, 'methods', set())
        print(f"Route: {route.path} | Methods: {methods}")
