import sqlite3
import json

conn = sqlite3.connect('backend/agency.db')
cursor = conn.cursor()

# Check columns
cursor.execute('PRAGMA table_info(departments)')
cols = [c[1] for c in cursor.fetchall()]
if 'roles' not in cols:
    cursor.execute("ALTER TABLE departments ADD COLUMN roles TEXT DEFAULT '[]'")
    print('Added column roles to departments table.')
else:
    print('Column roles already exists.')

conn.commit()

OFFICIAL_DATA = {
    'SOCIAL_CONTENT': {
        'roles': [
            'كاتب محتوى إعلاني وتسويقي (Copywriter)',
            'كاتب محتوى سوشيال ميديا (Social Media Content Creator)',
            'مصحح لغوي ومراجع جودة (Proofreader & QA)',
            'مدير حسابات سوشيال ميديا (Account Manager)',
            'مصمم جرافيك سوشيال ميديا',
            'مسؤول جدولة ونشر'
        ],
        'services': [
            'نصوص الإعلانات الممولة وصفحات الهبوط (24-48 ساعة)',
            'إعداد وتطوير خطة المحتوى الشهرية والريلز',
            'مراجعة وتدقيق الجودة اللغوية للنصوص',
            'إدارة النشر والتفاعل اليومي على الحسابات'
        ]
    },
    'PRODUCTION': {
        'roles': [
            'مصور فيديو / مخرج (Videographer / Director)',
            'كاتب سيناريو (Scriptwriter)',
            'مونتير فيديو (Video Editor)',
            'مشغل درون معتمد (Drone Operator)',
            'فنان تعليق صوتي (Voice Over)',
            'مصور فوتوغرافي إعلاني'
        ],
        'services': [
            'تصوير ميداني وجلسات تصوير منتجات 4K',
            'كتابة السيناريو وبناء لوحة القصة (Storyboard)',
            'مونتاج وقص وتعديل ألوان ومؤثرات الفيديو (3-5 أيام)',
            'تصوير جوي بالدرون للمواقع والفعاليات',
            'تسجيل تعليق صوتي إعلاني احترافي (1-2 يوم)'
        ]
    },
    'BRANDING': {
        'roles': [
            'مصمم هوية بصرية (Brand Designer)',
            'مصمم واجهات وتجربة مستخدم (UI/UX)',
            'مصمم جرافيك ومطبوعات'
        ],
        'services': [
            'تصميم الشعار وبناء الهوية البصرية ودليل الاستخدام',
            'تصميم واجهات المتاجر والتطبيقات وتجربة المستخدم (UI/UX)',
            'تصميم المطبوعات والبوسترات التسويقية'
        ]
    },
    'DEV_ECOMMERCE': {
        'roles': [
            'مختص متاجر إلكترونية (سلة / زد)',
            'مطور واجهات (Front-end)',
            'مختص SEO تقني',
            'مسؤول إدارة متجر'
        ],
        'services': [
            'تأسيس المتجر وربط بوابات الدفع والشحن (3-5 أيام)',
            'برمجة وتطوير واجهات مواقع وصفحات هبوط مخصصة (Front-end)',
            'تهيئة محركات البحث وتحسين سرعة المتجر (SEO)',
            'رفع وتنسيق المنتجات وإدارة المخزون والطلبات'
        ]
    },
    'PERFORMANCE_ADS': {
        'roles': [
            'مختص إعلانات منصات التواصل (Meta / TikTok / Snapchat)',
            'مختص إعلانات جوجل (Google Ads)',
            'مختص إعلانات لينكدإن (LinkedIn / B2B)',
            'مختص تحليل بيانات إعلانية'
        ],
        'services': [
            'إعداد وإطلاق حملات التواصل ومتابعة التحويلات (B2C)',
            'إدارة حملات البحث وشراء جوجل (Google Search & Shopping)',
            'حملات B2B واستقطاب الشركات عبر لينكدإن',
            'تحليل نتائج الحملات وإعداد تقارير ROAS و CAC'
        ]
    },
    'STRATEGY': {
        'roles': [
            'استشاري تسويقي أول',
            'محلل منافسين وبحوث سوق'
        ],
        'services': [
            'بناء الخطة الاستراتيجية التسويقية الشاملة للنمو (5-7 أيام)',
            'إعداد دراسة السوق وتحليل المنافسين والفجوات (3-5 أيام)'
        ]
    },
    'OPERATIONS': {
        'roles': [
            'مدير حساب مخصص (Account Manager)',
            'منسق عمليات داخلي'
        ],
        'services': [
            'إدارة العلاقة والتواصل المباشر مع العميل ومتابعة الرضا',
            'تنسيق وتوزيع المهام بين الأقسام ومتابعة مواعيد التسليم (SLA)'
        ]
    }
}

cursor.execute('SELECT id, code, name_ar FROM departments')
rows = cursor.fetchall()
for r in rows:
    dep_id, dep_code, dep_name = r
    code_key = (dep_code or '').upper()
    if code_key in OFFICIAL_DATA:
        roles_json = json.dumps(OFFICIAL_DATA[code_key]['roles'], ensure_ascii=False)
        services_json = json.dumps(OFFICIAL_DATA[code_key]['services'], ensure_ascii=False)
        cursor.execute('UPDATE departments SET roles = ?, services = ? WHERE id = ?', (roles_json, services_json, dep_id))
        print(f'Successfully updated {dep_name} ({dep_code}) with roles and services.')

conn.commit()
conn.close()
print('Migration and sync finished successfully!')
