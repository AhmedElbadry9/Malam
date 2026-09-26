import sys
import io
sys.stdout.reconfigure(encoding='utf-8')
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

creds = service_account.Credentials.from_service_account_file('credentials.json', scopes=['https://www.googleapis.com/auth/drive'])
drive_svc = build('drive', 'v3', credentials=creds)

csv_content = "\ufeff" + ",".join([
    '"١ـ فايل الهوية البصريه اللوجو png بكوالتي عالي"',
    '"٢ـ لينك الموقع"',
    '"٣ـ المنصه والثيم"',
    '"٤ـ فايل للمنتجات بكوالتي عالي مصنفه حسب كل قسم"',
    '"٥ـ التصنيفات او الاقسام (السايلو)"',
    '"٦ـ العروض والتخفيضات"',
    '"٧ـ ميز البيع"',
    '"٨- لينكات المنافسين ان وجد"',
    '"٩- المنتجات الاكثر مبيعا"',
    '"١٠- لو في منتج معين حابب نستخدمه"',
    '"١١-لو في استايل معين حابب نصمم زيه؟"'
]) + "\n"

media = MediaIoBaseUpload(io.BytesIO(csv_content.encode('utf-8-sig')), mimetype='text/csv', resumable=True)

try:
    file_metadata = {
        'name': 'Test Upload Conversion',
        'mimeType': 'application/vnd.google-apps.spreadsheet',
        'parents': ['1TK6X3tmTNlK4-N6KJVknSKQb-wZqPVS5']
    }
    f = drive_svc.files().create(
        body=file_metadata,
        media_body=media,
        supportsAllDrives=True,
        fields='id, name, mimeType, webViewLink'
    ).execute()
    print("SUCCESS creating converted sheet:", f)
    # delete it after test
    drive_svc.files().delete(fileId=f['id'], supportsAllDrives=True).execute()
except Exception as e:
    print("CSV conversion failed:", type(e), e)
