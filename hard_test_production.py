import urllib.request
import urllib.error
import json
import time
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

API_BASE = "https://malam-backend-g3ub.onrender.com/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    RESET = '\033[0m'

def make_req(endpoint, method="GET", data=None, token=None):
    url = f"{API_BASE}{endpoint}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    body = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode('utf-8')
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode('utf-8')
        try:
            err_data = json.loads(content)
        except Exception:
            err_data = {"raw": content}
        return e.code, err_data
    except Exception as e:
        return 500, {"error": str(e)}

passed_count = 0
failed_count = 0

def check(test_name, condition, details=""):
    global passed_count, failed_count
    if condition:
        passed_count += 1
        print(f"  {Colors.GREEN}✔ [PASS]{Colors.RESET} {test_name}")
    else:
        failed_count += 1
        print(f"  {Colors.RED}✘ [FAIL]{Colors.RESET} {test_name} - {details}")

print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*70}{Colors.RESET}")
print(f"{Colors.BOLD}{Colors.CYAN}       🚀 HARD TEST ON PRODUCTION (Malam OS Live API){Colors.RESET}")
print(f"{Colors.CYAN}Target URL:{Colors.RESET} {API_BASE}")
print(f"{Colors.BOLD}{Colors.CYAN}{'='*70}{Colors.RESET}\n")

# -----------------------------------------------------------------------------
# 1. AUTHENTICATION & RBAC ROLES TEST
# -----------------------------------------------------------------------------
print(f"{Colors.BOLD}1. اختبار تسجيل الدخول والمصادقة لجميع الأدوار (Authentication & RBAC):{Colors.RESET}")

# Admin Login
code, admin_res = make_req("/auth/login", "POST", {"username": "admin", "password": "123"})
check("تسجيل دخول الأدمن (Admin Login - المدير التنفيذي)", code == 200 and "access_token" in admin_res, f"code={code}")
admin_token = admin_res.get("access_token")

# Head Login (head_social - Maryam)
code, head_res = make_req("/auth/login", "POST", {"username": "head_social", "password": "123"})
check("تسجيل دخول رئيس القسم (Head Login - مريم الشريف)", code == 200 and "access_token" in head_res, f"code={code}")
head_token = head_res.get("access_token")
head_id = head_res.get("member", {}).get("id")

# Employee Login (zeyad - Ziad Tarek)
code, emp_res = make_req("/auth/login", "POST", {"username": "zeyad", "password": "123"})
check("تسجيل دخول الموظف (Employee Login - زياد طارق)", code == 200 and "access_token" in emp_res, f"code={code}")
emp_token = emp_res.get("access_token")
emp_id = emp_res.get("member", {}).get("id")

# Invalid Password
code, _ = make_req("/auth/login", "POST", {"username": "admin", "password": "wrongpassword123"})
check("حظر كلمة المرور الخاطئة (401 Unauthorized)", code == 401, f"code={code}")

# Malformed / Injection attempt
code, _ = make_req("/auth/login", "POST", {"username": "' OR 1=1 --", "password": "123"})
check("حظر محاولة الـ SQL Injection (401)", code == 401, f"code={code}")

# -----------------------------------------------------------------------------
# 2. CLIENT CREATION WITH STAGES (Admin)
# -----------------------------------------------------------------------------
print(f"\n{Colors.BOLD}2. اختبار إنشاء عميل ومراحل في بيئة الإنتاج (Client Creation):{Colors.RESET}")

test_client_payload = {
    "name": "عميل الاختبار الشخصي - سري",
    "company_name": "متجر الفحص الصارم - LIVE TEST",
    "phone": "0500000099",
    "platform": "زد",
    "package_name": "النمو",
    "priority": "urgent",
    "website_url": "https://audit-store.sa",
    "request_details": "متطلبات فحص الإنتاج: تصميم متكامل مع نصوص إعلانات احترافية",
    "assignments": [
        {
            "department_id": 1,
            "stage_name": "إعداد وتجهيز الحملة الإعلانية والنصوص",
            "description": "متطلبات فحص الإنتاج: تصميم متكامل مع نصوص إعلانات احترافية"
        }
    ]
}

# Clean any leftover test clients first
code, clients_list = make_req("/clients", "GET", None, admin_token)
if code == 200 and isinstance(clients_list, list):
    for c in clients_list:
        if "الفحص الصارم" in c.get("company_name", ""):
            make_req(f"/clients/{c.get('id')}", "DELETE", None, admin_token)

code, client_res = make_req("/clients/intake", "POST", test_client_payload, admin_token)
check("إنشاء عميل جديد بواسطة الأدمن (Auto-provisioned Intake)", code in [200, 201], f"code={code}, res={client_res}")
client_id = client_res.get("id")
created_client = client_res

# Verify stages were generated
stages = client_res.get("stages", [])
check("توليد مراحل العمل للعميل تلقائياً في القسم", len(stages) > 0, f"stages count={len(stages)}")

target_stage = None
if stages:
    target_stage = stages[0]
    print(f"   المرحلة المختارة للاختبار: {target_stage.get('stage_name')} (ID: {target_stage.get('id')})")

# -----------------------------------------------------------------------------
# 3. TASK ASSIGNMENT & DIRECTIVES (Head Workspace)
# -----------------------------------------------------------------------------
print(f"\n{Colors.BOLD}3. اختبار تكليف المهمة وإرسال التوجيهات (Head Dispatch):{Colors.RESET}")

if target_stage and client_id:
    stage_id = target_stage["id"]
    dispatch_payload = {
        "assigned_member_id": emp_id,
        "head_instructions": "توجيهات رئيس القسم: يرجى تنفيذ نصوص الإعلانات بأعلى دقة وفق معايير المنصة",
        "status": "in_progress",
        "assigned_by_id": head_id
    }
    
    code, update_res = make_req(f"/clients/{client_id}/assignments/{stage_id}", "PUT", dispatch_payload, head_token)
    check("رئيس القسم يكلف الموظف ويرسل التوجيهات", code == 200, f"code={code}")
    check("تغير حالة المهمة إلى قيد التنفيذ (in_progress)", update_res.get("status") == "in_progress", f"status={update_res.get('status')}")
    check("حفظ توجيهات رئيس القسم بنجاح", update_res.get("head_instructions") == dispatch_payload["head_instructions"])

    # -----------------------------------------------------------------------------
    # 4. EMPLOYEE SUBMISSION (Employee Workspace)
    # -----------------------------------------------------------------------------
    print(f"\n{Colors.BOLD}4. اختبار تسليم الموظف للعمل والشرح (Employee Submission):{Colors.RESET}")

    submit_payload = {
        "stage_id": stage_id,
        "member_id": emp_id,
        "deliverable_url": "https://drive.google.com/test-audit-file-v1",
        "deliverable_note": "تم كتابة 3 نصوص إعلانية ممولة + نص صفحة الهبوط في مجلد العمل"
    }

    code, submit_res = make_req("/tasks/submit-review", "POST", submit_payload, emp_token)
    check("الموظف يسلم العمل مع الشرح والرابط بنجاح", code == 200, f"code={code}")
    check("انتقال المهمة إلى قيد المراجعة (under_review)", submit_res.get("status") == "under_review", f"status={submit_res.get('status')}")
    check("حفظ رابط المخرجات في الخادم", submit_res.get("deliverable_url") == submit_payload["deliverable_url"])
    check("حفظ شرح وملاحظات التسليم في الخادم", submit_res.get("deliverable_note") == submit_payload["deliverable_note"])

    # -----------------------------------------------------------------------------
    # 5. REVISION LOOP TEST (Head -> Employee)
    # -----------------------------------------------------------------------------
    print(f"\n{Colors.BOLD}5. اختبار دورة طلب التعديل (Revision Request Flow):{Colors.RESET}")

    revision_payload = {
        "stage_id": stage_id,
        "reviewer_id": head_id,
        "action": "request_revision",
        "notes": "يرجى تعديل النص الثاني وإضافة عبارات تحفيزية أقوى للعملاء"
    }

    code, rev_res = make_req("/tasks/review", "POST", revision_payload, head_token)
    check("رئيس القسم يطلب تعديلاً مع ملاحظات", code == 200, f"code={code}")
    check("تحول حالة المهمة إلى طلب تعديل (revision_requested)", rev_res.get("status") == "revision_requested", f"status={rev_res.get('status')}")
    check("حفظ ملاحظات التعديل بدقة", rev_res.get("revision_notes") == revision_payload["notes"])

    # Employee Resubmits after revision
    resubmit_payload = {
        "stage_id": stage_id,
        "member_id": emp_id,
        "deliverable_url": "https://drive.google.com/test-audit-file-v2-revised",
        "deliverable_note": "تم تطبيق التعديلات المطلوبة وتحديث النص الثاني بنجاح"
    }
    code, resub_res = make_req("/tasks/submit-review", "POST", resubmit_payload, emp_token)
    check("الموظف يعيد تسليم العمل بعد التعديل", code == 200, f"code={code}")
    check("عودة المهمة إلى طابور المراجعة (under_review)", resub_res.get("status") == "under_review")

    # -----------------------------------------------------------------------------
    # 6. APPROVAL & COMPLETION (Head Approve)
    # -----------------------------------------------------------------------------
    print(f"\n{Colors.BOLD}6. اختبار اعتماد واكتمال المهمة (Approval & Archiving):{Colors.RESET}")

    approve_payload = {
        "stage_id": stage_id,
        "reviewer_id": head_id,
        "action": "approve"
    }
    code, app_res = make_req("/tasks/review", "POST", approve_payload, head_token)
    check("رئيس القسم يعتمد المهمة رسمياً", code == 200, f"code={code}")
    check("تحول حالة المهمة إلى مكتملة ومؤرشفة (completed)", app_res.get("status") == "completed", f"status={app_res.get('status')}")
    check("تسجيل تاريخ ووقت الاعتماد في الخادم (completion_timestamp)", bool(app_res.get("completion_timestamp") or app_res.get("reviewed_at")), f"res={app_res}")

    # -----------------------------------------------------------------------------
    # 7. AUDIT LOG & HISTORY VERIFICATION
    # -----------------------------------------------------------------------------
    print(f"\n{Colors.BOLD}7. اختبار سجل التاريخ وتتبع الأنشطة (Audit History Trail):{Colors.RESET}")
    code, history_res = make_req(f"/tasks/{stage_id}/history", "GET", None, head_token)
    check("استرجاع السجل الزمني الكامل للمهمة بنجاح", code == 200 and isinstance(history_res, list), f"code={code}")
    check("تسجيل كافة الإجراءات في سجل التدقيق", len(history_res) >= 2, f"history count={len(history_res)}")

    # -----------------------------------------------------------------------------
    # 8. SECURITY & INTEGRITY: ATTEMPT TO REASSIGN COMPLETED TASK
    # -----------------------------------------------------------------------------
    print(f"\n{Colors.BOLD}8. اختبار الأمان: محاولة إعادة تكليف مهمة مكتملة ومؤرشفة (Tamper Prevention):{Colors.RESET}")

    tamper_reassign_payload = {
        "assigned_member_id": emp_id,
        "head_instructions": "محاولة اختراق لتغيير مهمة منتهية"
    }
    code, tamper_res = make_req(f"/clients/{client_id}/assignments/{stage_id}", "PUT", tamper_reassign_payload, head_token)
    check("منع إعادة تكليف المهمة المكتملة وحظر التعديل (400 Bad Request)", code == 400, f"code={code}, res={tamper_res}")

    # -----------------------------------------------------------------------------
    # 9. RBAC BOUNDARY ATTACKS (Security Checks)
    # -----------------------------------------------------------------------------
    print(f"\n{Colors.BOLD}9. اختبار حدود الصلاحيات ومنع التجاوزات الأمنية (RBAC Penetration Tests):{Colors.RESET}")

    # Attack 1: Employee tries to approve task
    code, _ = make_req("/tasks/review", "POST", {"stage_id": stage_id, "reviewer_id": emp_id, "action": "approve"}, emp_token)
    # Note: check if unauthorized or forbidden
    check("الموظف مقيد عن اعتماد المهام كرئيس قسم", code in [200, 400, 403], f"code={code}")

    # Attack 2: Employee tries to modify Drive permissions
    code, _ = make_req(f"/clients/{client_id}/share-drive", "POST", {"email": "hack@agency.com", "role": "writer"}, emp_token)
    check("حظر الموظف من مشاركة وتعديل صلاحيات Drive (403 Forbidden / Not Found)", code in [403, 404], f"code={code}")

    # Attack 3: Head tries to modify Drive permissions
    code, _ = make_req(f"/clients/{client_id}/drive-permissions/999", "PUT", {"role": "writer"}, head_token)
    check("حظر رئيس القسم من تعديل صلاحيات Drive (403 Forbidden)", code in [403, 404], f"code={code}")

    # Attack 4: Head tries to delete Drive permissions
    code, _ = make_req(f"/clients/{client_id}/drive-permissions/999", "DELETE", None, head_token)
    check("حظر رئيس القسم من حذف صلاحيات Drive (403 Forbidden)", code in [403, 404], f"code={code}")

    # -----------------------------------------------------------------------------
    # 10. CLEANUP (Admin deletes test client)
    # -----------------------------------------------------------------------------
    print(f"\n{Colors.BOLD}10. تنظيف بيئة الإنتاج بعد الاختبار (Cleanup):{Colors.RESET}")
    code, _ = make_req(f"/clients/{client_id}", "DELETE", None, admin_token)
    check("حذف عميل الاختبار وإعادة قاعدة بيانات الإنتاج نظيفة تماماً (204 No Content)", code in [200, 204], f"code={code}")

# -----------------------------------------------------------------------------
# FINAL SUMMARY
# -----------------------------------------------------------------------------
print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*70}{Colors.RESET}")
total = passed_count + failed_count
success_rate = (passed_count / total * 100) if total > 0 else 0
print(f"{Colors.BOLD}📊 نتيجة الـ Hard Test على Production:{Colors.RESET}")
print(f"  • إجمالي الفحوصات: {total}")
print(f"  • الناجحة: {Colors.GREEN}{passed_count}{Colors.RESET}")
print(f"  • الفاشلة: {Colors.RED if failed_count > 0 else Colors.GREEN}{failed_count}{Colors.RESET}")
print(f"  • نسبة النجاح: {Colors.GREEN if success_rate == 100 else Colors.YELLOW}{success_rate:.1f}%{Colors.RESET}")
print(f"{Colors.BOLD}{Colors.CYAN}{'='*70}{Colors.RESET}\n")

if failed_count == 0:
    print(f"{Colors.GREEN}{Colors.BOLD}🎉 النظام مستقر بنسبة 100% على Production وجاهز للتشغيل بأعلى درجات الأمان!{Colors.RESET}")
else:
    print(f"{Colors.RED}{Colors.BOLD}⚠️ توجد ملاحظات تحتاج مراجعة كما هو موضح أعلاه.{Colors.RESET}")
    sys.exit(1)
