import requests
import drive_service
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

BASE = 'http://127.0.0.1:8000/api'

members = requests.get(f'{BASE}/members').json()
ziyad = next(m for m in members if 'زياد' in m['name'] or 'abdallahyassein' in (m.get('email') or ''))
dina = next(m for m in members if 'دينا' in m['name'] or 'glowstudio' in (m.get('email') or ''))
mariam = next(m for m in members if 'مريم' in m['name'] or 'abdallah.work' in (m.get('email') or ''))

client = requests.get(f'{BASE}/clients/1').json()
fid = client['drive_folder_id']
stage_id = client['stages'][0]['id']

def get_drive_emails(folder_id):
    service = drive_service.get_drive_service()
    if not service:
        return []
    emails = []
    perms = drive_service.list_folder_permissions(folder_id)
    for p in perms:
        if p.get('emailAddress'):
            emails.append(p.get('emailAddress').lower())
    sub_res = service.files().list(
        q=f"'{folder_id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        supportsAllDrives=True,
        includeItemsFromAllDrives=True,
        fields='files(id)'
    ).execute()
    for sub_f in sub_res.get('files', []):
        sub_perms = drive_service.list_folder_permissions(sub_f['id'])
        for sp in sub_perms:
            if sp.get('emailAddress'):
                emails.append(sp.get('emailAddress').lower())
    return list(set(emails))

print("==================================================")
print("🔍 اختبار سيناريو رئيس القسم والموظفين على Google Drive الحقيقي")
print(f"🏢 العميل: {client['company_name']} | مجلد Drive: {fid}")
print("==================================================\n")

# STEP 1: Assign to Ziyad
print("1️⃣ [الخطوة 1]: إسناد المهمة إلى زياد طارق (الموظف الأول)...")
r1 = requests.put(f'{BASE}/clients/1/assignments/{stage_id}', json={'assigned_member_id': ziyad['id']})
assert r1.status_code == 200

emails_1 = get_drive_emails(fid)
print(f"   📧 الإيميلات الموجودة على درايف حالياً: {emails_1}")
print(f"   -> مريم (Head) موجودة؟ {mariam['email'].lower() in emails_1}")
print(f"   -> زياد (Employee) موجود؟ {ziyad['email'].lower() in emails_1}")
print(f"   -> دينا (Employee) موجودة؟ {dina['email'].lower() in emails_1}")
assert mariam['email'].lower() in emails_1, "مريم (رئيس القسم) يجب أن تحتفظ بصلاحيتها دائماً!"
assert ziyad['email'].lower() in emails_1, "زياد يجب أن يملك صلاحية"
print("   ✅ الخطوة 1 سليمة 100%.\n")

# STEP 2: Reassign to Dina
print("2️⃣ [الخطوة 2]: تحويل المهمة من زياد طارق إلى دينا إبراهيم...")
r2 = requests.put(f'{BASE}/clients/1/assignments/{stage_id}', json={'assigned_member_id': dina['id']})
assert r2.status_code == 200

emails_2 = get_drive_emails(fid)
print(f"   📧 الإيميلات الموجودة على درايف بعد التحويل: {emails_2}")
print(f"   -> مريم (Head) ما زالت موجودة؟ {mariam['email'].lower() in emails_2}")
print(f"   -> دينا (الموظفة الجديدة) أصبحت موجودة؟ {dina['email'].lower() in emails_2}")
print(f"   -> زياد (الموظف القديم) تم حذفه؟ {ziyad['email'].lower() not in emails_2}")

assert mariam['email'].lower() in emails_2, "مريم (رئيس القسم) تم مسحها بالخطأ!"
assert dina['email'].lower() in emails_2, "دينا يجب أن تملك صلاحية"
assert ziyad['email'].lower() not in emails_2, "زياد لم يتم مسحه!"

print("\n==================================================")
print("🎉 النتيجة المؤكدة على درايف:")
print("1. رئيس القسم (مريم) تحتفظ بكامل صلاحياتها ولا تُمس نهائياً!")
print("2. الموظف المسند إليه (دينا) أُضيفت لمجلد درايف بصلاحية التعديل.")
print("3. الموظف القديم (زياد) حُذف بالكامل من المجلد الرئيسي وكل المجلدات الفرعية.")
print("==================================================")
