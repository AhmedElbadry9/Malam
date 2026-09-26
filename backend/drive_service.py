import os
import logging

logger = logging.getLogger(__name__)
from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/drive']
SERVICE_ACCOUNT_FILE = os.path.join(os.path.dirname(__file__), 'credentials.json')

# The ID of the main "Malam Clients" folder provided by the user
MAIN_FOLDER_ID = '1dhuayx660p7NyCnxeAXTQ0tPZUfuy8j8'
MASTER_TEMPLATE_SHEET_ID = os.environ.get('GOOGLE_SHEET_TEMPLATE_ID') or '1ovyYQ1VcWBS9LhUg9IuAucHwE9qCGjPOOIKYsW25pZI'
DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw6rpEZCNIe1bel7SiBRdS0auLVOP5K36oEh2su-ypwEEJpIui_0PJ96Bi4eRZZy5-7/exec'

_cached_service = None

def get_drive_service():
    global _cached_service
    if _cached_service is not None:
        return _cached_service

    import json
    import base64

    creds = None

    # 1. Try from raw JSON string in environment variable (Render / Cloud deployment)
    env_json = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON') or os.environ.get('GOOGLE_CREDENTIALS_JSON')
    if env_json and env_json.strip():
        try:
            info = json.loads(env_json.strip())
            creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
            logger.info("Successfully loaded Google Drive credentials from GOOGLE_SERVICE_ACCOUNT_JSON env var.")
        except Exception as e:
            logger.error(f"Error loading credentials from GOOGLE_SERVICE_ACCOUNT_JSON: {e}")

    # 2. Try from Base64 encoded environment variable
    if not creds:
        env_b64 = os.environ.get('GOOGLE_CREDENTIALS_BASE64') or os.environ.get('GOOGLE_SERVICE_ACCOUNT_BASE64')
        if env_b64 and env_b64.strip():
            try:
                decoded = base64.b64decode(env_b64.strip()).decode('utf-8')
                info = json.loads(decoded)
                creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
                logger.info("Successfully loaded Google Drive credentials from Base64 env var.")
            except Exception as e:
                logger.error(f"Error loading credentials from Base64 env var: {e}")

    # 3. Try custom path from GOOGLE_APPLICATION_CREDENTIALS
    if not creds:
        custom_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
        if custom_path and os.path.exists(custom_path):
            try:
                creds = service_account.Credentials.from_service_account_file(custom_path, scopes=SCOPES)
                logger.info(f"Successfully loaded Google Drive credentials from path: {custom_path}")
            except Exception as e:
                logger.error(f"Error loading credentials from {custom_path}: {e}")

    # 4. Try local file path (credentials.json)
    if not creds and os.path.exists(SERVICE_ACCOUNT_FILE):
        try:
            creds = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
            logger.info(f"Successfully loaded Google Drive credentials from file: {SERVICE_ACCOUNT_FILE}")
        except Exception as e:
            logger.error(f"Error initializing Google Drive client from {SERVICE_ACCOUNT_FILE}: {e}")

    if not creds:
        logger.warning("Google Drive credentials not found (checked env vars and credentials.json). Drive features will use fallback mock.")
        return None

    try:
        _cached_service = build('drive', 'v3', credentials=creds, cache_discovery=False)
        return _cached_service
    except Exception as e:
        logger.error(f"Error building Google Drive client: {e}")
        return None

def share_folder(folder_id: str, email: str, role: str = "reader", send_notification: bool = True) -> dict:
    """
    Grants access to a Google Drive folder.
    role: 'reader' (View only) or 'writer' (Editor)
    """
    if not folder_id or folder_id.startswith("folder-") or folder_id.startswith("custom-drive-"):
        role_label = "عرض فقط (Viewer)" if role == "reader" else "تعديل ورفع (Editor)"
        return {
            "success": True,
            "permission_id": f"perm-mock-{folder_id}",
            "role": role,
            "email": email,
            "message": f"تم منح صلاحية {role_label} لـ {email} بنجاح!"
        }

    service = get_drive_service()
    if not service:
        return {"success": False, "message": "خدمة Google Drive غير متصلة"}

    try:
        valid_role = role if role in ["reader", "writer", "commenter"] else "reader"
        permission = {
            'type': 'user',
            'role': valid_role,
            'emailAddress': email.strip()
        }
        result = service.permissions().create(
            fileId=folder_id,
            body=permission,
            sendNotificationEmail=send_notification,
            supportsAllDrives=True,
            fields='id, role, type, emailAddress'
        ).execute()

        role_label = "عرض فقط (Viewer)" if valid_role == "reader" else "تعديل ورفع (Editor)"
        return {
            "success": True,
            "permission_id": result.get("id"),
            "role": result.get("role"),
            "email": result.get("emailAddress") or email,
            "message": f"تم منح صلاحية {role_label} لـ {email} بنجاح!"
        }
    except Exception as e:
        print(f"Error sharing folder {folder_id} with {email}: {e}")
        return {"success": False, "message": f"خطأ في مشاركة المجلد: {str(e)}"}

def list_folder_permissions(folder_id: str) -> list:
    """
    Lists users who have permission on this folder.
    """
    if not folder_id or folder_id.startswith("folder-") or folder_id.startswith("custom-drive-"):
        return []

    service = get_drive_service()
    if not service:
        return []
    try:
        results = service.permissions().list(
            fileId=folder_id,
            supportsAllDrives=True,
            fields='permissions(id, role, type, emailAddress, displayName)'
        ).execute()
        return results.get('permissions', [])
    except Exception as e:
        print(f"Notice: Google Drive list permissions error: {e}")
        return []

def remove_folder_permission(folder_id: str, permission_id: str) -> dict:
    """
    Removes a permission from a Google Drive folder.
    """
    if not folder_id or folder_id.startswith("folder-") or folder_id.startswith("custom-drive-"):
        return {"success": True, "message": "تم إلغاء الصلاحية بنجاح"}

    service = get_drive_service()
    if not service:
        return {"success": False, "message": "خدمة Google Drive غير متصلة"}
    try:
        service.permissions().delete(
            fileId=folder_id,
            permissionId=permission_id,
            supportsAllDrives=True
        ).execute()
        return {"success": True, "message": "تم إلغاء الصلاحية وحذف الوصول بنجاح"}
    except Exception as e:
        print(f"Error removing permission {permission_id} on {folder_id}: {e}")
        return {"success": False, "message": f"خطأ في حذف الصلاحية: {str(e)}"}

def remove_folder_permission_by_email(folder_id: str, email: str, recursive: bool = True) -> dict:
    """
    Finds and deletes any permission for the specified email address on the folder (and its direct subfolders).
    """
    if not folder_id or not email or folder_id.startswith("folder-") or folder_id.startswith("custom-drive-"):
        return {"success": True, "message": "تم إلغاء الصلاحية بنجاح"}

    service = get_drive_service()
    if not service:
        return {"success": False, "message": "خدمة Google Drive غير متصلة"}

    try:
        clean_email = email.strip().lower()
        target_fids = [folder_id]
        if recursive:
            try:
                sub_res = service.files().list(
                    q=f"'{folder_id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
                    supportsAllDrives=True,
                    includeItemsFromAllDrives=True,
                    fields='files(id)'
                ).execute()
                for sub_f in sub_res.get('files', []):
                    if sub_f.get('id') and sub_f['id'] not in target_fids:
                        target_fids.append(sub_f['id'])
            except Exception as e_sub:
                print(f"Notice: subfolder search during perm revocation: {e_sub}")

        removed_count = 0
        for fid in target_fids:
            perms = list_folder_permissions(fid)
            for p in perms:
                if p.get("emailAddress", "").strip().lower() == clean_email:
                    try:
                        service.permissions().delete(
                            fileId=fid,
                            permissionId=p["id"],
                            supportsAllDrives=True
                        ).execute()
                        removed_count += 1
                        print(f"Auto-revoked Drive permission for {clean_email} on {fid}")
                    except Exception as del_err:
                        print(f"Error removing perm {p['id']} for {clean_email}: {del_err}")
        return {"success": True, "removed_count": removed_count}
    except Exception as e:
        print(f"Notice: remove_folder_permission_by_email error: {e}")
        return {"success": False, "message": str(e)}

def update_folder_permission(folder_id: str, permission_id: str, new_role: str) -> dict:
    """
    Updates a user's role on a Google Drive folder ('reader' or 'writer').
    """
    if not folder_id or folder_id.startswith("folder-") or folder_id.startswith("custom-drive-"):
        role_label = "عرض فقط (Viewer)" if new_role == "reader" else "تعديل ورفع (Editor)"
        return {
            "success": True,
            "role": new_role,
            "message": f"تم تعديل الصلاحية إلى {role_label} بنجاح"
        }

    service = get_drive_service()
    if not service:
        return {"success": False, "message": "خدمة Google Drive غير متصلة"}
    try:
        valid_role = new_role if new_role in ["reader", "writer", "commenter"] else "reader"
        result = service.permissions().update(
            fileId=folder_id,
            permissionId=permission_id,
            body={"role": valid_role},
            supportsAllDrives=True,
            fields='id, role, type, emailAddress'
        ).execute()
        role_label = "عرض فقط (Viewer)" if valid_role == "reader" else "تعديل ورفع (Editor)"
        return {
            "success": True,
            "role": result.get("role"),
            "message": f"تم تعديل الصلاحية إلى {role_label} بنجاح"
        }
    except Exception as e:
        print(f"Error updating permission {permission_id} on {folder_id}: {e}")
        return {"success": False, "message": f"خطأ في تعديل الصلاحية: {str(e)}"}

# 11 Standardized columns for client briefing and onboarding sheet
CLIENT_SHEET_COLUMNS = [
    "١ـ فايل الهوية البصريه اللوجو png بكوالتي عالي",
    "٢ـ لينك الموقع",
    "٣ـ المنصه والثيم",
    "٤ـ فايل للمنتجات بكوالتي عالي مصنفه حسب كل قسم",
    "٥ـ التصنيفات او الاقسام (السايلو)",
    "٦ـ العروض والتخفيضات",
    "٧ـ ميز البيع ( شحن مجاني - استبدال او استرجاع - خدمة عملاء ـ اسعار تنافسيه -تقسيط تابي او تمارا ... الخ )",
    "٨- لينكات المنافسين ان وجد",
    "٩- المنتجات الاكثر مبيعا",
    "١٠- لو في منتج معين حابب نستخدمه في التصاميم او حابب نبرزه اكتر وضحلي دا برضو",
    "١١-لو في استايل معين حابب نصمم زيه؟"
]

def scan_folder_for_spreadsheet(folder_id: str):
    """
    Scans a Google Drive folder for any real Google Spreadsheet file.
    Returns dict with id, name, url if found, else None.
    """
    if not folder_id or folder_id.startswith("folder-") or folder_id.startswith("sub-"):
        return None
    service = get_drive_service()
    if not service:
        return None
    try:
        q = f"'{folder_id}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
        res = service.files().list(
            q=q,
            supportsAllDrives=True,
            includeItemsFromAllDrives=True,
            fields='files(id, name, webViewLink)'
        ).execute().get('files', [])
        if res:
            return {
                "id": res[0]['id'],
                "name": res[0]['name'],
                "url": res[0].get('webViewLink')
            }
    except Exception as e:
        print(f"Error scanning folder {folder_id} for spreadsheet: {e}")
    return None

def create_sheet_via_webhook(apps_script_url: str, folder_id: str, company_name: str) -> dict:
    """
    Calls Google Apps Script Webhook to create an actual Google Sheet with the 11 columns in folder_id.
    """
    import json
    import urllib.request
    try:
        payload = json.dumps({
            "action": "create_sheet",
            "folder_id": folder_id,
            "company_name": company_name,
            "sheet_name": f"📊 شيت بيانات واستراتيجية العميل - {company_name}",
            "headers": CLIENT_SHEET_COLUMNS
        }).encode('utf-8')
        req = urllib.request.Request(
            apps_script_url,
            data=payload,
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data.get("id") and data.get("url"):
                return {"id": data.get("id"), "url": data.get("url")}
    except Exception as e:
        print(f"Webhook creation error: {e}")
    return None

def cleanup_duplicate_spreadsheets(folder_id: str, subfolder_id: str = None):
    """
    Ensures strictly at most ONE spreadsheet/shortcut exists by removing duplicates across root and subfolder.
    1. If subfolder_id is provided, removes any spreadsheets located directly in root folder_id to avoid duplication.
    2. In the target folder (subfolder_id or folder_id), keeps only ONE spreadsheet and removes all duplicate files.
    """
    if not folder_id or folder_id.startswith("folder-") or folder_id.startswith("sub-"):
        return
    service = get_drive_service()
    if not service:
        return
    try:
        # If subfolder exists, clean any accidental spreadsheets in the main root folder
        if subfolder_id and not subfolder_id.startswith("sub-"):
            q_root = f"'{folder_id}' in parents and (mimeType='application/vnd.google-apps.spreadsheet' or mimeType='application/vnd.google-apps.shortcut') and trashed=false"
            res_root = service.files().list(
                q=q_root,
                supportsAllDrives=True,
                includeItemsFromAllDrives=True,
                fields='files(id, name)'
            ).execute().get('files', [])
            for root_sheet in res_root:
                try:
                    service.files().delete(fileId=root_sheet['id'], supportsAllDrives=True).execute()
                    print(f"Removed redundant root sheet: {root_sheet.get('name')} ({root_sheet.get('id')})")
                except Exception as de:
                    print(f"Root sheet cleanup notice: {de}")

        target_fid = subfolder_id or folder_id
        q = f"'{target_fid}' in parents and (mimeType='application/vnd.google-apps.spreadsheet' or mimeType='application/vnd.google-apps.shortcut') and trashed=false"
        res = service.files().list(
            q=q,
            supportsAllDrives=True,
            includeItemsFromAllDrives=True,
            fields='files(id, name, createdTime)'
        ).execute().get('files', [])
        if len(res) > 1:
            res.sort(key=lambda x: x.get('createdTime', ''))
            # Keep the first/oldest one and delete all extra duplicates
            for extra in res[1:]:
                try:
                    service.files().delete(fileId=extra['id'], supportsAllDrives=True).execute()
                    print(f"Cleaned up duplicate sheet in target folder: {extra['name']} ({extra['id']})")
                except Exception as del_err:
                    print(f"Duplicate delete notice: {del_err}")
    except Exception as e:
        print(f"Cleanup scan notice: {e}")

def create_client_folder(company_name: str, share_email: str = None, share_role: str = "reader") -> dict:
    """
    Creates:
    1. Main client folder in Google Drive: [company_name]
    2. Subfolder 1: '01 - مرفقات ومواد العميل (Client Uploads)'
    3. Subfolder 2: '02 - مخرجات وشغل الفريق (Team Deliverables)'
    4. Exactly ONE Google Sheet inside Subfolder 1: '📊 شيت بيانات واستراتيجية العميل - [company_name]'
    Returns a dict with all IDs and webViewLinks.
    """
    import uuid
    import json
    service = get_drive_service()
    if not service:
        mock_id = f"folder-{uuid.uuid4().hex[:8]}"
        sub1_id = f"sub-client-{uuid.uuid4().hex[:6]}"
        sub2_id = f"sub-team-{uuid.uuid4().hex[:6]}"
        sheet_id = f"sheet-{uuid.uuid4().hex[:6]}"
        return {
            "id": mock_id,
            "url": f"https://drive.google.com/drive/folders/{mock_id}?usp=sharing",
            "subfolder_client_id": sub1_id,
            "subfolder_client_url": f"https://drive.google.com/drive/folders/{sub1_id}?usp=sharing",
            "subfolder_team_id": sub2_id,
            "subfolder_team_url": f"https://drive.google.com/drive/folders/{sub2_id}?usp=sharing",
            "sheet_id": sheet_id,
            "sheet_url": f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit?usp=sharing"
        }

    try:
        # 1. Create main company folder
        file_metadata = {
            'name': company_name,
            'mimeType': 'application/vnd.google-apps.folder',
            'parents': [MAIN_FOLDER_ID]
        }
        folder = service.files().create(
            body=file_metadata,
            supportsAllDrives=True,
            fields='id, webViewLink'
        ).execute()

        folder_id = folder.get('id')
        web_link = folder.get('webViewLink')

        # 2. Subfolder 1: 01 - مرفقات ومواد العميل
        sub1_id = None
        sub1_link = None
        try:
            sub1 = service.files().create(
                body={
                    'name': '01 - مرفقات ومواد العميل (Client Uploads)',
                    'mimeType': 'application/vnd.google-apps.folder',
                    'parents': [folder_id]
                },
                supportsAllDrives=True,
                fields='id, webViewLink'
            ).execute()
            sub1_id = sub1.get('id')
            sub1_link = sub1.get('webViewLink')
        except Exception as e1:
            print(f"Subfolder 1 creation note: {e1}")

        # 3. Subfolder 2: 02 - مخرجات وشغل الفريق
        sub2_id = None
        sub2_link = None
        try:
            sub2 = service.files().create(
                body={
                    'name': '02 - مخرجات وشغل الفريق (Team Deliverables)',
                    'mimeType': 'application/vnd.google-apps.folder',
                    'parents': [folder_id]
                },
                supportsAllDrives=True,
                fields='id, webViewLink'
            ).execute()
            sub2_id = sub2.get('id')
            sub2_link = sub2.get('webViewLink')
        except Exception as e2:
            print(f"Subfolder 2 creation note: {e2}")

        # 4. Standardized Client Strategy Sheet with the 11 columns INSIDE Subfolder 1 ONLY ONCE
        sheet_id = None
        sheet_link = None
        sheet_parent = sub1_id or folder_id

        # First, check if a sheet already exists in parent
        existing_sheet = scan_folder_for_spreadsheet(sheet_parent)
        if existing_sheet:
            sheet_id = existing_sheet.get("id")
            sheet_link = existing_sheet.get("url")
            print(f"Sheet already exists in folder: {sheet_link}")
        else:
            # Method A: Google Apps Script Webhook
            apps_script_url = os.environ.get("GOOGLE_APPS_SCRIPT_URL") or DEFAULT_APPS_SCRIPT_URL
            if apps_script_url and sheet_parent:
                sheet_data = create_sheet_via_webhook(apps_script_url, sheet_parent, company_name)
                if sheet_data:
                    sheet_id = sheet_data.get("id")
                    sheet_link = sheet_data.get("url")
                    print(f"Google Apps Script successfully generated sheet in Subfolder 1: {sheet_link}")

            # Method B: Direct Google Drive API (ONLY if Method A did not run or failed)
            if not sheet_id and sheet_parent:
                try:
                    sheet = service.files().create(
                        body={
                            'name': f'📊 شيت بيانات واستراتيجية العميل - {company_name}',
                            'mimeType': 'application/vnd.google-apps.spreadsheet',
                            'parents': [sheet_parent]
                        },
                        supportsAllDrives=True,
                        fields='id, webViewLink'
                    ).execute()
                    sheet_id = sheet.get('id')
                    sheet_link = sheet.get('webViewLink')
                except Exception as es:
                    print(f"Drive API direct sheet creation note: {es}")

            # Method C: Template Shortcut (ONLY if both A and B failed)
            template_id = os.environ.get("GOOGLE_SHEET_TEMPLATE_ID") or MASTER_TEMPLATE_SHEET_ID
            if not sheet_id and template_id and sheet_parent:
                try:
                    shortcut = service.files().create(
                        body={
                            'name': f'📊 شيت بيانات واستراتيجية العميل - {company_name}',
                            'mimeType': 'application/vnd.google-apps.shortcut',
                            'shortcutDetails': {
                                'targetId': template_id
                            },
                            'parents': [sheet_parent]
                        },
                        supportsAllDrives=True,
                        fields='id, name, webViewLink'
                    ).execute()
                    sheet_id = shortcut.get('id')
                    sheet_link = f"https://docs.google.com/spreadsheets/d/{template_id}/edit?usp=sharing"
                except Exception as sc_err:
                    print(f"Shortcut creation error: {sc_err}")

        # Clean up any accidental duplicates in Root or Subfolder 1
        cleanup_duplicate_spreadsheets(folder_id, sheet_parent)

        # Automatically share ONLY Subfolder 01 (Client Uploads) with client email
        if share_email and share_email.strip():
            target_client_folder = sub1_id or folder_id
            try:
                share_folder(target_client_folder, share_email.strip(), role=share_role or "writer")
            except Exception as se:
                print(f"Share notice for client upload subfolder: {se}")

        return {
            "id": folder_id,
            "url": web_link,
            "subfolder_client_id": sub1_id or f"sub-client-{uuid.uuid4().hex[:6]}",
            "subfolder_client_url": sub1_link or f"https://drive.google.com/drive/folders/{sub1_id or folder_id}?usp=sharing",
            "subfolder_team_id": sub2_id or f"sub-team-{uuid.uuid4().hex[:6]}",
            "subfolder_team_url": sub2_link or f"https://drive.google.com/drive/folders/{sub2_id or folder_id}?usp=sharing",
            "sheet_id": sheet_id or f"sheet-{uuid.uuid4().hex[:6]}",
            "sheet_url": sheet_link or f"https://docs.google.com/spreadsheets/d/{MASTER_TEMPLATE_SHEET_ID}/edit?usp=sharing"
        }
    except Exception as e:
        print(f"Notice: Google Drive API fallback: {e}")
        mock_id = f"folder-{uuid.uuid4().hex[:8]}"
        sub1_id = f"sub-client-{uuid.uuid4().hex[:6]}"
        sub2_id = f"sub-team-{uuid.uuid4().hex[:6]}"
        sheet_id = f"sheet-{uuid.uuid4().hex[:6]}"
        return {
            "id": mock_id,
            "url": f"https://drive.google.com/drive/folders/{mock_id}?usp=sharing",
            "subfolder_client_id": sub1_id,
            "subfolder_client_url": f"https://drive.google.com/drive/folders/{sub1_id}?usp=sharing",
            "subfolder_team_id": sub2_id,
            "subfolder_team_url": f"https://drive.google.com/drive/folders/{sub2_id}?usp=sharing",
            "sheet_id": sheet_id,
            "sheet_url": f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit?usp=sharing"
        }

def normalize_arabic_text(text: str) -> str:
    if not text:
        return ""
    t = text.strip().lower()
    t = t.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")
    t = t.replace("ة", "ه").replace("ى", "ي")
    t = "".join(ch for ch in t if ch.isalnum() or ch.isspace())
    return " ".join(t.split())

def check_folder_exists_on_drive(folder_name: str, parent_id: str = MAIN_FOLDER_ID) -> dict:
    """
    Checks if a folder with a matching name already exists on Google Drive under parent_id.
    """
    if not folder_name or not folder_name.strip():
        return {"exists": False}

    service = get_drive_service()
    if not service:
        return {"exists": False}

    try:
        norm_query = normalize_arabic_text(folder_name)
        q = f"'{parent_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
        res = service.files().list(
            q=q,
            supportsAllDrives=True,
            includeItemsFromAllDrives=True,
            pageSize=1000,
            fields='files(id, name, webViewLink)'
        ).execute()

        files = res.get('files', [])
        for f in files:
            fname = f.get('name', '')
            if normalize_arabic_text(fname) == norm_query or fname.strip().lower() == folder_name.strip().lower():
                return {
                    "exists": True,
                    "folder_id": f.get('id'),
                    "folder_name": fname,
                    "folder_url": f.get('webViewLink')
                }

        return {"exists": False}
    except Exception as e:
        logger.warning(f"Error checking folder existence on Drive: {e}")
        return {"exists": False}

if __name__ == "__main__":
    # Test script
    print(create_client_folder("Test API Company Folder"))


