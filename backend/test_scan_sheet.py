import sys
sys.stdout.reconfigure(encoding='utf-8')
from google.oauth2 import service_account
from googleapiclient.discovery import build

creds = service_account.Credentials.from_service_account_file('credentials.json', scopes=['https://www.googleapis.com/auth/drive'])
drive_svc = build('drive', 'v3', credentials=creds)

def scan_for_sheet(folder_id):
    # Search for spreadsheets inside this folder
    query = f"'{folder_id}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
    results = drive_svc.files().list(
        q=query,
        supportsAllDrives=True,
        includeItemsFromAllDrives=True,
        fields='files(id, name, webViewLink)'
    ).execute().get('files', [])
    return results

print("Scanning folder 1TK6X3tmTNlK4-N6KJVknSKQb-wZqPVS5...")
sheets = scan_for_sheet('1TK6X3tmTNlK4-N6KJVknSKQb-wZqPVS5')
print("Found sheets:", sheets)
