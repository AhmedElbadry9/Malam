import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
from google.oauth2 import service_account
from googleapiclient.discovery import build

creds = service_account.Credentials.from_service_account_file('credentials.json', scopes=['https://www.googleapis.com/auth/drive'])
drive_svc = build('drive', 'v3', credentials=creds)

files = drive_svc.files().list(
    q="mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
    supportsAllDrives=True,
    includeItemsFromAllDrives=True,
    fields='files(id, name, mimeType, webViewLink, owners)'
).execute().get('files', [])

print(f"Total spreadsheets found: {len(files)}")
for f in files:
    print(f"Name: {f['name']} | ID: {f['id']} | Link: {f.get('webViewLink')}")
