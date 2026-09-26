import drive_service
import requests
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

BASE = 'http://127.0.0.1:8000/api'
clients = requests.get(f'{BASE}/clients').json()

for c in clients:
    fid = c.get('drive_folder_id')
    print(f'=== العميل: {c.get("company_name")} (ID: {c.get("id")}, Drive Folder ID: {fid}) ===')
    if fid and not fid.startswith('folder-') and not fid.startswith('custom-'):
        perms = drive_service.list_folder_permissions(fid)
        print('صلاحيات المجلد الرئيسي:')
        for p in perms:
            print(f' - {p.get("displayName", "")} ({p.get("emailAddress", "")}) -> {p.get("role")}')
        
        service = drive_service.get_drive_service()
        if service:
            sub_res = service.files().list(
                q=f"'{fid}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
                supportsAllDrives=True,
                includeItemsFromAllDrives=True,
                fields='files(id, name)'
            ).execute()
            for sub in sub_res.get('files', []):
                print(f'  📂 المجلد الفرعي: {sub["name"]} (ID: {sub["id"]})')
                sub_perms = drive_service.list_folder_permissions(sub['id'])
                for sp in sub_perms:
                    print(f'     - {sp.get("displayName", "")} ({sp.get("emailAddress", "")}) -> {sp.get("role")}')
    print('----------------------------------------------------')
