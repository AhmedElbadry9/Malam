import requests
import drive_service
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

BASE = 'http://127.0.0.1:8000/api'

# Fetch members
members = requests.get(f'{BASE}/members').json()
ziyad = next((m for m in members if 'زياد' in m['name'] or 'abdallahyassein' in (m.get('email') or '')), None)
dina = next((m for m in members if 'دينا' in m['name'] or 'glowstudio' in (m.get('email') or '')), None)
mariam = next((m for m in members if 'مريم' in m['name'] or 'abdallah.work' in (m.get('email') or '')), None)

clients = requests.get(f'{BASE}/clients').json()
client = clients[0]
client_id = client['id']
fid = client['drive_folder_id']
stage = client['stages'][0]
stage_id = stage['id']

print(f"==================================================")
print(f"🏢 فحص كامل على Google Drive الحقيقي للعميل {client['company_name']}")
print(f"📁 Folder ID: {fid}")
print(f"==================================================\n")

def get_drive_emails(folder_id):
    service = drive_service.get_drive_service()
    if not service:
        return []
    emails = []
    # Main folder
    perms = drive_service.list_folder_permissions(folder_id)
    for p in perms:
        em = p.get('emailAddress')
        if em:
            emails.append(em.lower())
    # Subfolders
    sub_res = service.files().list(
        q=f"'{folder_id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        supportsAllDrives=True,
        includeItemsFromAllDrives=True,
        fields='files(id)'
    ).execute()
    for sub_f in sub_res.get('files', []):
        sub_perms = drive_service.list_folder_permissions(sub_f['id'])
        for sp in sub_perms:
            em = sp.get('emailAddress')
            if em:
                emails.append(em.lower())
    return list(set(emails))

# 1. Step 1: Assign to Ziyad
print("1️⃣ [الخطوة 1]: إسناد المهمة إلى زياد طارق عبر الـ API...")
r1 = requests.put(f'{BASE}/clients/{client_id}/assignments/{stage_id}', json={
    'assigned_member_id': ziyad['id']
})
assert r1.status_code == 200

drive_emails_1 = get_drive_emails(fid)
print(f"   📧 الإيميلات الموجودة على درايف حالياً: {drive_emails_1}")
ziyad_in_drive_1 = ziyad['email'].lower() in drive_emails_1
dina_in_drive_1 = dina['email'].lower() in drive_emails_1
print(f"   -> زياد موجود على درايف؟ {ziyad_in_drive_1}")
print(f"   -> دينا موجودة على درايف؟ {dina_in_drive_1}")
assert ziyad_in_drive_1, "زياد يجب أن يملك صلاحية على درايف"
assert not dina_in_drive_1, "دينا يجب ألا تملك صلاحية على درايف"
print("   ✅ تم التحقق من الخطوة 1 بنجاح!\n")

# 2. Step 2: Reassign from Ziyad to Dina
print("2️⃣ [الخطوة 2]: تحويل المهمة من زياد طارق إلى دينا إبراهيم عبر الـ API...")
r2 = requests.put(f'{BASE}/clients/{client_id}/assignments/{stage_id}', json={
    'assigned_member_id': dina['id']
})
assert r2.status_code == 200

drive_emails_2 = get_drive_emails(fid)
print(f"   📧 الإيميلات الموجودة على درايف بعد التحويل: {drive_emails_2}")
ziyad_in_drive_2 = ziyad['email'].lower() in drive_emails_2
dina_in_drive_2 = dina['email'].lower() in drive_emails_2
print(f"   -> زياد ما زال موجوداً على درايف؟ {ziyad_in_drive_2}")
print(f"   -> دينا أصبحت موجودة على درايف؟ {dina_in_drive_2}")

assert not ziyad_in_drive_2, "زياد يجب أن تكون حذفت صلاحيته تماماً من درايف"
assert dina_in_drive_2, "دينا يجب أن تكون أضيفت إلى درايف"
print("\n🎉 تم التحقق بنجاح 100%: زياد اتحذف كلياً من درايف ودينا انضافت مكانه!")
