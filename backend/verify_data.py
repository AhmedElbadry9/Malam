import requests

r = requests.get("http://127.0.0.1:8000/api/clients/hierarchy")
data = r.json()

print(f"\n=======================================================")
print(f"📊 إجمالي مجموعات العملاء في الشجرة الهرمية: {len(data)}")
print(f"=======================================================\n")

for g in data:
    print(f"👤 العميل / المالك: {g['client_name']}")
    print(f"   🏢 عدد الشركات التابعة: {g['total_companies']}")
    print(f"   📌 إجمالي المهام: {g['total_tasks']} (⏳ نشطة: {g['active_tasks']} | ✅ مكتملة: {g['completed_tasks']})")
    print(f"   📈 نسبة الإنجاز العامة: {g['overall_progress']}%")
    print(f"   الشركات ومراحلها:")
    for c in g['companies']:
        print(f"      🏢 {c['company_name']} ({c['service_type']}) - {c['progress_percentage']}%")
        for s in c['stages']:
            status_icon = "✅" if s['status'] == "completed" else ("⏳" if s['status'] == "in_progress" else "⏱️")
            print(f"         {status_icon} [{s.get('department', {}).get('name_ar') or 'قسم'}] {s['stage_name']} ({s.get('assigned_member', {}).get('name') or 'غير مسند'})")
    print("-------------------------------------------------------")
