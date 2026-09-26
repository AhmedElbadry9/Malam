import sys
sys.stdout.reconfigure(encoding='utf-8')
from google.oauth2 import service_account
from googleapiclient.discovery import build

creds = service_account.Credentials.from_service_account_file('credentials.json', scopes=['https://www.googleapis.com/auth/drive'])
drive_svc = build('drive', 'v3', credentials=creds)

folder_id = '1TK6X3tmTNlK4-N6KJVknSKQb-wZqPVS5'
res = drive_svc.files().list(
    q=f"'{folder_id}' in parents and trashed=false",
    supportsAllDrives=True,
    includeItemsFromAllDrives=True,
    fields='files(id, name, mimeType, webViewLink, shortcutDetails)'
).execute()

print(f"Items in folder {folder_id}:")
for f in res.get('files', []):
    print(f"- Name: {f['name']} | Type: {f['mimeType']} | ID: {f['id']}")
