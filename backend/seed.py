from datetime import datetime, timedelta
from database import SessionLocal, engine, Base
import models

OFFICIAL_DEPARTMENTS_DATA = [
    {
        "name_ar": "قسم المحتوى والسوشيال ميديا",
        "name_en": "Social Media & Content",
        "code": "SOCIAL_CONTENT",
        "icon": "Megaphone",
        "color": "#8b5cf6",
        "description": "كتابة المحتوى الإعلاني، خطط السوشيال ميديا، التدقيق اللغوي ومراجعة الجودة، وإدارة الحسابات والتفاعل.",
        "roles": [
            "كاتب محتوى إعلاني وتسويقي (Copywriter)",
            "كاتب محتوى سوشيال ميديا (Social Media Content Creator)",
            "مصحح لغوي ومراجع جودة (Proofreader & QA)",
            "مدير حسابات سوشيال ميديا (Account Manager)",
            "مصمم جرافيك سوشيال ميديا",
            "مسؤول جدولة ونشر"
        ],
        "services": [
            "نصوص الإعلانات الممولة وصفحات الهبوط (24-48 ساعة)",
            "إعداد وتطوير خطة المحتوى الشهرية والريلز",
            "مراجعة وتدقيق الجودة اللغوية للنصوص",
            "إدارة النشر والتفاعل اليومي على الحسابات"
        ]
    },
    {
        "name_ar": "قسم الإنتاج المرئي والمسموع",
        "name_en": "Visual & Audio Production",
        "code": "PRODUCTION",
        "icon": "Camera",
        "color": "#f59e0b",
        "description": "التصوير الميداني والإعلاني، المونتاج وتصحيح الألوان، كتابة السيناريو، التصوير بالدرون، والتعليق الصوتي.",
        "roles": [
            "مصور فيديو / مخرج (Videographer / Director)",
            "كاتب سيناريو (Scriptwriter)",
            "مونتير فيديو (Video Editor)",
            "مشغل درون معتمد (Drone Operator)",
            "فنان تعليق صوتي (Voice Over)",
            "مصور فوتوغرافي إعلاني"
        ],
        "services": [
            "تصوير ميداني وجلسات تصوير منتجات 4K",
            "كتابة السيناريو وبناء لوحة القصة (Storyboard)",
            "مونتاج وقص وتعديل ألوان ومؤثرات الفيديو (3-5 أيام)",
            "تصوير جوي بالدرون للمواقع والفعاليات",
            "تسجيل تعليق صوتي إعلاني احترافي (1-2 يوم)"
        ]
    },
    {
        "name_ar": "قسم التصميم والهوية البصرية",
        "name_en": "Branding & Visual Identity",
        "code": "BRANDING",
        "icon": "Palette",
        "color": "#ec4899",
        "description": "بناء الهويات البصرية الكاملة، الشعارات، أدلة الاستخدام، وتصميم واجهات وتجربة المستخدم UI/UX.",
        "roles": [
            "مصمم هوية بصرية (Brand Designer)",
            "مصمم واجهات وتجربة مستخدم (UI/UX)",
            "مصمم جرافيك ومطبوعات"
        ],
        "services": [
            "تصميم الشعار وبناء الهوية البصرية ودليل الاستخدام",
            "تصميم واجهات المتاجر والتطبيقات وتجربة المستخدم (UI/UX)",
            "تصميم المطبوعات والبوسترات التسويقية"
        ]
    },
    {
        "name_ar": "قسم البرمجة والمتاجر الإلكترونية",
        "name_en": "Web & E-Commerce Development",
        "code": "DEV_ECOMMERCE",
        "icon": "Code",
        "color": "#10b981",
        "description": "تأسيس وإعداد المتاجر الإلكترونية (سلة / زد)، تطوير الواجهات والمواقع المخصصة، تحسين SEO، وإدارة المتاجر.",
        "roles": [
            "مختص متاجر إلكترونية (سلة / زد)",
            "مطور واجهات (Front-end)",
            "مختص SEO تقني",
            "مسؤول إدارة متجر"
        ],
        "services": [
            "تأسيس المتجر وربط بوابات الدفع والشحن (3-5 أيام)",
            "برمجة وتطوير واجهات مواقع وصفحات هبوط مخصصة (Front-end)",
            "تهيئة محركات البحث وتحسين سرعة المتجر (SEO)",
            "رفع وتنسيق المنتجات وإدارة المخزون والطلبات"
        ]
    },
    {
        "name_ar": "قسم الإعلانات الممولة والحملات",
        "name_en": "Performance Marketing & Paid Ads",
        "code": "PERFORMANCE_ADS",
        "icon": "TrendingUp",
        "color": "#3b82f6",
        "description": "إدارة الحملات الممولة على ميتا وتيك توك وسناب شات وجوجل ولينكدإن، وتحليل البيانات الإعلانية وتكلفة الاستحواذ.",
        "roles": [
            "مختص إعلانات منصات التواصل (Meta / TikTok / Snapchat)",
            "مختص إعلانات جوجل (Google Ads)",
            "مختص إعلانات لينكدإن (LinkedIn / B2B)",
            "مختص تحليل بيانات إعلانية"
        ],
        "services": [
            "إعداد وإطلاق حملات التواصل ومتابعة التحويلات (B2C)",
            "إدارة حملات البحث وشراء جوجل (Google Search & Shopping)",
            "حملات B2B واستقطاب الشركات عبر لينكدإن",
            "تحليل نتائج الحملات وإعداد تقارير ROAS و CAC"
        ]
    },
    {
        "name_ar": "قسم الاستراتيجية والاستشارات",
        "name_en": "Strategy & Consulting",
        "code": "STRATEGY",
        "icon": "Target",
        "color": "#f97316",
        "description": "بناء الاستراتيجيات التسويقية الشاملة، دراسات وبحوث السوق، وتحليل المنافسين والفرص.",
        "roles": [
            "استشاري تسويقي أول",
            "محلل منافسين وبحوث سوق"
        ],
        "services": [
            "بناء الخطة الاستراتيجية التسويقية الشاملة للنمو (5-7 أيام)",
            "إعداد دراسة السوق وتحليل المنافسين والفجوات (3-5 أيام)"
        ]
    },
    {
        "name_ar": "قسم إدارة العملاء والعمليات",
        "name_en": "Client Success & Operations",
        "code": "OPERATIONS",
        "icon": "Briefcase",
        "color": "#6366f1",
        "description": "إدارة التواصل مع العملاء، التنسيق الداخلي بين الأقسام، متابعة مواعيد التسليم والجودة.",
        "roles": [
            "مدير حساب مخصص (Account Manager)",
            "منسق عمليات داخلي"
        ],
        "services": [
            "إدارة العلاقة والتواصل المباشر مع العميل ومتابعة الرضا",
            "تنسيق وتوزيع المهام بين الأقسام ومتابعة مواعيد التسليم (SLA)"
        ]
    }
]

def sync_default_departments(target_session=None):
    db = target_session if target_session is not None else SessionLocal()
    should_close = target_session is None
    try:
        for d in OFFICIAL_DEPARTMENTS_DATA:
            existing = db.query(models.Department).filter(
                (models.Department.code == d["code"]) | (models.Department.name_ar == d["name_ar"])
            ).first()
            if not existing:
                new_dep = models.Department(
                    name_ar=d["name_ar"],
                    name_en=d["name_en"],
                    code=d["code"],
                    icon=d["icon"],
                    color=d["color"],
                    description=d["description"],
                    roles=d["roles"],
                    services=d["services"]
                )
                db.add(new_dep)
            else:
                if not existing.roles or len(existing.roles) == 0:
                    existing.roles = d["roles"]
                if not existing.services or len(existing.services) == 0:
                    existing.services = d["services"]
        db.commit()
    except Exception as e:
        print(f"Error syncing default departments: {e}")
    finally:
        if should_close:
            db.close()

def sync_member_departments(target_session=None):
    db = target_session if target_session is not None else SessionLocal()
    should_close = target_session is None
    try:
        members = db.query(models.TeamMember).all()
        for m in members:
            if m.department_id and len(m.departments) == 0:
                dept = db.get(models.Department, m.department_id)
                if dept:
                    m.departments.append(dept)
        db.commit()
    except Exception as e:
        print(f"Error syncing member departments: {e}")
    finally:
        if should_close:
            db.close()

CLEAN_TEAM_DATA = [
    # 1. الإدارة العامة والتشغيل (Management & Operations)
    {
        "name": "أحمد المنشاوي",
        "username": "admin",
        "password": "123",
        "email": "admin@agency.com",
        "phone": "01000000001",
        "role": "المدير التنفيذي والعام (CEO)",
        "role_type": "admin",
        "dept_code": "OPERATIONS",
        "is_active": True,
        "dept_codes_list": ["SOCIAL_CONTENT", "PRODUCTION", "BRANDING", "DEV_ECOMMERCE", "PERFORMANCE_ADS", "STRATEGY", "OPERATIONS"]
    },
    {
        "name": "كريم الشناوي",
        "username": "manager",
        "password": "123",
        "email": "manager@agency.com",
        "phone": "01000000002",
        "role": "مدير العمليات والمشاريع (Project & Operations Manager)",
        "role_type": "manager",
        "dept_code": "OPERATIONS",
        "is_active": True,
        "dept_codes_list": ["SOCIAL_CONTENT", "PRODUCTION", "BRANDING", "DEV_ECOMMERCE", "PERFORMANCE_ADS", "STRATEGY", "OPERATIONS"]
    },

    # 2. قسم المحتوى والسوشيال ميديا (Social Media & Content)
    {
        "name": "مريم الشريف",
        "username": "head_social",
        "password": "123",
        "email": "head.social@agency.com",
        "phone": "01000000003",
        "role": "رئيس قسم السوشيال ميديا والمحتوى",
        "role_type": "head",
        "dept_code": "SOCIAL_CONTENT",
        "is_active": True,
        "dept_codes_list": ["SOCIAL_CONTENT"]
    },
    {
        "name": "زياد طارق",
        "username": "zeyad",
        "password": "123",
        "email": "zeyad@agency.com",
        "phone": "01000000004",
        "role": "كاتب محتوى إعلاني وتسويقي (Copywriter)",
        "role_type": "employee",
        "dept_code": "SOCIAL_CONTENT",
        "is_active": True,
        "dept_codes_list": ["SOCIAL_CONTENT"]
    },
    {
        "name": "دينا إبراهيم",
        "username": "dina",
        "password": "123",
        "email": "dina@agency.com",
        "phone": "01000000005",
        "role": "أخصائي إدارة منصات ونشر (Community Manager)",
        "role_type": "employee",
        "dept_code": "SOCIAL_CONTENT",
        "is_active": True,
        "dept_codes_list": ["SOCIAL_CONTENT"]
    },
    {
        "name": "أحمد سامح",
        "username": "sameh",
        "password": "123",
        "email": "sameh@agency.com",
        "phone": "01000000006",
        "role": "صانع محتوى إبداعي وسيناريو (Scriptwriter)",
        "role_type": "employee",
        "dept_code": "SOCIAL_CONTENT",
        "is_active": True,
        "dept_codes_list": ["SOCIAL_CONTENT"]
    },

    # 3. قسم الإنتاج المرئي والمسموع (Video Production & Audio)
    {
        "name": "كريم صادق",
        "username": "head_production",
        "password": "123",
        "email": "head.production@agency.com",
        "phone": "01000000007",
        "role": "رئيس قسم الإنتاج والمخرج الفني",
        "role_type": "head",
        "dept_code": "PRODUCTION",
        "is_active": True,
        "dept_codes_list": ["PRODUCTION"]
    },
    {
        "name": "يوسف خالد",
        "username": "youssef",
        "password": "123",
        "email": "youssef@agency.com",
        "phone": "01000000008",
        "role": "مونتير فيديو وتصحيح ألوان ومؤثرات",
        "role_type": "employee",
        "dept_code": "PRODUCTION",
        "is_active": True,
        "dept_codes_list": ["PRODUCTION"]
    },
    {
        "name": "مصطفى شوقي",
        "username": "mostafa_vfx",
        "password": "123",
        "email": "mostafa@agency.com",
        "phone": "01000000009",
        "role": "مصمم موشن جرافيكس ورسوم متحركة (Motion Graphics)",
        "role_type": "employee",
        "dept_code": "PRODUCTION",
        "is_active": True,
        "dept_codes_list": ["PRODUCTION"]
    },
    # 4. قسم التصميم والهوية البصرية (Branding & Visual Design)
    {
        "name": "سارة محمود",
        "username": "head_design",
        "password": "123",
        "email": "head.design@agency.com",
        "phone": "01000000011",
        "role": "رئيس قسم التصميم والهوية البصرية",
        "role_type": "head",
        "dept_code": "BRANDING",
        "is_active": True,
        "dept_codes_list": ["BRANDING"]
    },
    {
        "name": "نور الدين حسن",
        "username": "nour",
        "password": "123",
        "email": "nour@agency.com",
        "phone": "01000000012",
        "role": "مصمم واجهات وتجربة مستخدم (UI/UX Designer)",
        "role_type": "employee",
        "dept_code": "BRANDING",
        "is_active": True,
        "dept_codes_list": ["BRANDING"]
    },
    {
        "name": "مينا مجدي",
        "username": "mina",
        "password": "123",
        "email": "mina@agency.com",
        "phone": "01000000013",
        "role": "مصمم جرافيك وبنرات إعلانية (Graphic Designer)",
        "role_type": "employee",
        "dept_code": "BRANDING",
        "is_active": True,
        "dept_codes_list": ["BRANDING"]
    },

    # 5. قسم البرمجة والمتاجر الإلكترونية (Dev & E-commerce)
    {
        "name": "عمر الفاروق",
        "username": "head_dev",
        "password": "123",
        "email": "head.dev@agency.com",
        "phone": "01000000015",
        "role": "رئيس قسم البرمجة والمتاجر الإلكترونية",
        "role_type": "head",
        "dept_code": "DEV_ECOMMERCE",
        "is_active": True,
        "dept_codes_list": ["DEV_ECOMMERCE"]
    },
    {
        "name": "طارق مصطفى",
        "username": "tarek",
        "password": "123",
        "email": "tarek@agency.com",
        "phone": "01000000016",
        "role": "مختص منصات متاجر (سلة / زد / Shopify)",
        "role_type": "employee",
        "dept_code": "DEV_ECOMMERCE",
        "is_active": True,
        "dept_codes_list": ["DEV_ECOMMERCE"]
    },
    {
        "name": "إسلام النجار",
        "username": "eslam",
        "password": "123",
        "email": "eslam@agency.com",
        "phone": "01000000017",
        "role": "مطور واجهات ومتاجر (Frontend Web Developer)",
        "role_type": "employee",
        "dept_code": "DEV_ECOMMERCE",
        "is_active": True,
        "dept_codes_list": ["DEV_ECOMMERCE"]
    },
    {
        "name": "هاني رضوان",
        "username": "hany",
        "password": "123",
        "email": "hany@agency.com",
        "phone": "01000000018",
        "role": "مهندس تكامل وبوابات دفع وربط تقني (API & Integrations)",
        "role_type": "employee",
        "dept_code": "DEV_ECOMMERCE",
        "is_active": True,
        "dept_codes_list": ["DEV_ECOMMERCE"]
    },

    # 6. قسم الإعلانات الممولة والحملات (Performance Ads & Media Buying)
    {
        "name": "حسن الدسوقي",
        "username": "head_ads",
        "password": "123",
        "email": "head.ads@agency.com",
        "phone": "01000000019",
        "role": "رئيس قسم الإعلانات والحملات الممولة",
        "role_type": "head",
        "dept_code": "PERFORMANCE_ADS",
        "is_active": True,
        "dept_codes_list": ["PERFORMANCE_ADS"]
    },
    {
        "name": "سلمى عبد العزيز",
        "username": "salma",
        "password": "123",
        "email": "salma@agency.com",
        "phone": "01000000020",
        "role": "مختص إعلانات منصات (Meta / TikTok Ads)",
        "role_type": "employee",
        "dept_code": "PERFORMANCE_ADS",
        "is_active": True,
        "dept_codes_list": ["PERFORMANCE_ADS"]
    },
    {
        "name": "ريهام فؤاد",
        "username": "reham",
        "password": "123",
        "email": "reham@agency.com",
        "phone": "01000000022",
        "role": "محلل بيانات حملات ومعدلات تحويل (CRO & Analytics)",
        "role_type": "employee",
        "dept_code": "PERFORMANCE_ADS",
        "is_active": True,
        "dept_codes_list": ["PERFORMANCE_ADS"]
    },

    # 7. قسم الاستراتيجية والاستشارات (Strategy & Growth)
    {
        "name": "د. عمرو عثمان",
        "username": "head_strategy",
        "password": "123",
        "email": "head.strategy@agency.com",
        "phone": "01000000023",
        "role": "استشاري تسويقي أول وبحوث سوق",
        "role_type": "head",
        "dept_code": "STRATEGY",
        "is_active": True,
        "dept_codes_list": ["STRATEGY"]
    },
    {
        "name": "ليلى عبد الرحمن",
        "username": "laila",
        "password": "123",
        "email": "laila@agency.com",
        "phone": "01000000024",
        "role": "أخصائي أبحاث سوق وتحليل منافسين (Market Researcher)",
        "role_type": "employee",
        "dept_code": "STRATEGY",
        "is_active": True,
        "dept_codes_list": ["STRATEGY"]
    },
    {
        "name": "خالد أنور",
        "username": "khaled",
        "password": "123",
        "email": "khaled@agency.com",
        "phone": "01000000025",
        "role": "مخطط استراتيجي ونمو مبيعات (Growth Strategist)",
        "role_type": "employee",
        "dept_code": "STRATEGY",
        "is_active": True,
        "dept_codes_list": ["STRATEGY"]
    },

    # 8. قسم إدارة العملاء والعمليات (Account Management & Operations)
    {
        "name": "منى زكي",
        "username": "mona",
        "password": "123",
        "email": "head.operations@agency.com",
        "phone": "01000000026",
        "role": "مدير حسابات العملاء ومتابعة الرضا (Senior Account Manager)",
        "role_type": "head",
        "dept_code": "OPERATIONS",
        "is_active": True,
        "dept_codes_list": ["OPERATIONS"]
    },
    {
        "name": "هبة الله يحيى",
        "username": "heba",
        "password": "123",
        "email": "heba@agency.com",
        "phone": "01000000027",
        "role": "أخصائي خدمة عملاء ومتابعة تسليمات (Client Success Specialist)",
        "role_type": "employee",
        "dept_code": "OPERATIONS",
        "is_active": True,
        "dept_codes_list": ["OPERATIONS"]
    },
    {
        "name": "وليد شريف",
        "username": "waleed",
        "password": "123",
        "email": "waleed@agency.com",
        "phone": "01000000028",
        "role": "منسق عمليات وجداول زمنية (Operations Coordinator)",
        "role_type": "employee",
        "dept_code": "OPERATIONS",
        "is_active": True,
        "dept_codes_list": ["OPERATIONS"]
    }
]

def sync_clean_team_members(target_session=None):
    db = target_session if target_session is not None else SessionLocal()
    should_close = target_session is None
    try:
        departments = {}
        for d in db.query(models.Department).all():
            if d.code:
                departments[str(d.code).upper()] = d
                departments[str(d.code).lower()] = d

        if not departments:
            return

        for m_data in CLEAN_TEAM_DATA:
            try:
                m_copy = dict(m_data)
                username = m_copy.get("username")
                email = m_copy.get("email")
                dept_code = m_copy.pop("dept_code", None)
                dept_codes_list = m_copy.pop("dept_codes_list", [])

                primary_dept = departments.get(str(dept_code).upper()) if dept_code else None
                if primary_dept:
                    m_copy["department_id"] = primary_dept.id

                target_depts = []
                for code in dept_codes_list:
                    dept_obj = departments.get(str(code).upper())
                    if dept_obj and dept_obj not in target_depts:
                        target_depts.append(dept_obj)

                existing = db.query(models.TeamMember).filter(
                    (models.TeamMember.username == username) | 
                    (models.TeamMember.email == email)
                ).first()

                if existing:
                    existing.username = username
                    existing.name = m_copy["name"]
                    existing.role = m_copy["role"]
                    if email:
                        existing.email = email
                    if "phone" in m_copy:
                        existing.phone = m_copy["phone"]
                    existing.avatar = m_copy.get("avatar", None)
                    if "role_type" in m_copy:
                        existing.role_type = m_copy["role_type"]
                    if primary_dept:
                        existing.department_id = primary_dept.id
                    if target_depts:
                        existing.departments = target_depts
                    db.commit()
                else:
                    member = models.TeamMember(**m_copy)
                    db.add(member)
                    db.commit()
                    db.refresh(member)
                    if target_depts:
                        member.departments = target_depts
                    db.commit()
            except Exception as single_err:
                db.rollback()
                print(f"Notice syncing member {m_data.get('username')}: {single_err}")
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error in sync_clean_team_members: {e}")
    finally:
        if should_close:
            db.close()

def seed_database(target_session=None):
    db = target_session if target_session is not None else SessionLocal()
    should_close = target_session is None

    # Drop existing data for clean re-seed
    db.query(models.AuditLog).delete()
    db.query(models.DriveFolderItem).delete()
    db.query(models.TaskStage).delete()
    db.query(models.Client).delete()
    db.query(models.member_departments).delete()
    db.query(models.TeamMember).delete()
    db.query(models.Department).delete()
    db.commit()

    print("Seeding database with pristine, realistic Agency data...")

    # 1. Official 7 Departments with Roles (الوظائف) and Services/Tasks (المهام)
    deps_data = [
        {
            "name_ar": "قسم المحتوى والسوشيال ميديا",
            "name_en": "Social Media & Content",
            "code": "SOCIAL_CONTENT",
            "icon": "Megaphone",
            "color": "#8b5cf6",
            "description": "كتابة المحتوى الإعلاني، خطط السوشيال ميديا، التدقيق اللغوي ومراجعة الجودة، وإدارة الحسابات والتفاعل.",
            "roles": [
                "كاتب محتوى إعلاني وتسويقي (Copywriter)",
                "كاتب محتوى سوشيال ميديا (Social Media Content Creator)",
                "مصحح لغوي ومراجع جودة (Proofreader & QA)",
                "مدير حسابات سوشيال ميديا (Account Manager)",
                "مصمم جرافيك سوشيال ميديا",
                "مسؤول جدولة ونشر"
            ],
            "services": [
                "نصوص الإعلانات الممولة وصفحات الهبوط (24-48 ساعة)",
                "إعداد وتطوير خطة المحتوى الشهرية والريلز",
                "مراجعة وتدقيق الجودة اللغوية للنصوص",
                "إدارة النشر والتفاعل اليومي على الحسابات"
            ]
        },
        {
            "name_ar": "قسم الإنتاج المرئي والمسموع",
            "name_en": "Visual & Audio Production",
            "code": "PRODUCTION",
            "icon": "Camera",
            "color": "#f59e0b",
            "description": "التصوير الميداني والإعلاني، المونتاج وتصحيح الألوان، كتابة السيناريو، التصوير بالدرون، والتعليق الصوتي.",
            "roles": [
                "مصور فيديو / مخرج (Videographer / Director)",
                "كاتب سيناريو (Scriptwriter)",
                "مونتير فيديو (Video Editor)",
                "مشغل درون معتمد (Drone Operator)",
                "فنان تعليق صوتي (Voice Over)",
                "مصور فوتوغرافي إعلاني"
            ],
            "services": [
                "تصوير ميداني وجلسات تصوير منتجات 4K",
                "كتابة السيناريو وبناء لوحة القصة (Storyboard)",
                "مونتاج وقص وتعديل ألوان ومؤثرات الفيديو (3-5 أيام)",
                "تصوير جوي بالدرون للمواقع والفعاليات",
                "تسجيل تعليق صوتي إعلاني احترافي (1-2 يوم)"
            ]
        },
        {
            "name_ar": "قسم التصميم والهوية البصرية",
            "name_en": "Branding & Visual Identity",
            "code": "BRANDING",
            "icon": "Palette",
            "color": "#ec4899",
            "description": "بناء الهويات البصرية الكاملة، الشعارات، أدلة الاستخدام، وتصميم واجهات وتجربة المستخدم UI/UX.",
            "roles": [
                "مصمم هوية بصرية (Brand Designer)",
                "مصمم واجهات وتجربة مستخدم (UI/UX)",
                "مصمم جرافيك ومطبوعات"
            ],
            "services": [
                "تصميم الشعار وبناء الهوية البصرية ودليل الاستخدام",
                "تصميم واجهات المتاجر والتطبيقات وتجربة المستخدم (UI/UX)",
                "تصميم المطبوعات والبوسترات التسويقية"
            ]
        },
        {
            "name_ar": "قسم البرمجة والمتاجر الإلكترونية",
            "name_en": "Web & E-Commerce Development",
            "code": "DEV_ECOMMERCE",
            "icon": "Code",
            "color": "#10b981",
            "description": "تأسيس وإعداد المتاجر الإلكترونية (سلة / زد)، تطوير الواجهات والمواقع المخصصة، تحسين SEO، وإدارة المتاجر.",
            "roles": [
                "مختص متاجر إلكترونية (سلة / زد)",
                "مطور واجهات (Front-end)",
                "مختص SEO تقني",
                "مسؤول إدارة متجر"
            ],
            "services": [
                "تأسيس المتجر وربط بوابات الدفع والشحن (3-5 أيام)",
                "برمجة وتطوير واجهات مواقع وصفحات هبوط مخصصة (Front-end)",
                "تهيئة محركات البحث وتحسين سرعة المتجر (SEO)",
                "رفع وتنسيق المنتجات وإدارة المخزون والطلبات"
            ]
        },
        {
            "name_ar": "قسم الإعلانات الممولة والحملات",
            "name_en": "Performance Marketing & Paid Ads",
            "code": "PERFORMANCE_ADS",
            "icon": "TrendingUp",
            "color": "#3b82f6",
            "description": "إدارة الحملات الممولة على ميتا وتيك توك وسناب شات وجوجل ولينكدإن، وتحليل البيانات الإعلانية وتكلفة الاستحواذ.",
            "roles": [
                "مختص إعلانات منصات التواصل (Meta / TikTok / Snapchat)",
                "مختص إعلانات جوجل (Google Ads)",
                "مختص إعلانات لينكدإن (LinkedIn / B2B)",
                "مختص تحليل بيانات إعلانية"
            ],
            "services": [
                "إعداد وإطلاق حملات التواصل ومتابعة التحويلات (B2C)",
                "إدارة حملات البحث وشراء جوجل (Google Search & Shopping)",
                "حملات B2B واستقطاب الشركات عبر لينكدإن",
                "تحليل نتائج الحملات وإعداد تقارير ROAS و CAC"
            ]
        },
        {
            "name_ar": "قسم الاستراتيجية والاستشارات",
            "name_en": "Strategy & Consulting",
            "code": "STRATEGY",
            "icon": "Target",
            "color": "#f97316",
            "description": "بناء الاستراتيجيات التسويقية الشاملة، دراسات وبحوث السوق، وتحليل المنافسين والفرص.",
            "roles": [
                "استشاري تسويقي أول",
                "محلل منافسين وبحوث سوق"
            ],
            "services": [
                "بناء الخطة الاستراتيجية التسويقية الشاملة للنمو (5-7 أيام)",
                "إعداد دراسة السوق وتحليل المنافسين والفجوات (3-5 أيام)"
            ]
        },
        {
            "name_ar": "قسم إدارة العملاء والعمليات",
            "name_en": "Client Success & Operations",
            "code": "OPERATIONS",
            "icon": "Briefcase",
            "color": "#6366f1",
            "description": "إدارة التواصل مع العملاء، التنسيق الداخلي بين الأقسام، متابعة مواعيد التسليم والجودة.",
            "roles": [
                "مدير حساب مخصص (Account Manager)",
                "منسق عمليات داخلي"
            ],
            "services": [
                "إدارة العلاقة والتواصل المباشر مع العميل ومتابعة الرضا",
                "تنسيق وتوزيع المهام بين الأقسام ومتابعة مواعيد التسليم (SLA)"
            ]
        }
    ]

    dept_models = []
    for d in deps_data:
        roles_val = d.pop("roles", [])
        services_val = d.pop("services", [])
        dep = models.Department(**d)
        dep.roles = roles_val
        dep.services = services_val
        db.add(dep)
        dept_models.append(dep)
    db.commit()

    # 2. Team Members
    members_data = [
        # Administrator (Full system privileges)
        {
            "username": "admin",
            "password": "123",
            "name": "مدير التشغيل وإدارة الموظفين (Admin)",
            "role": "Operations & Client Success Director",
            "email": "admin@agency.com",
            "department_id": dept_models[2].id,
            "role_type": "admin",
            "is_active": True,
            "dept_ids": [d.id for d in dept_models]
        },
        # Superadmin (also mapped to admin role)
        {
            "username": "superadmin",
            "password": "123",
            "name": "مالك الوكالة (Admin)",
            "role": "Agency Owner & Executive Director",
            "email": "superadmin@agency.com",
            "department_id": dept_models[0].id,
            "role_type": "admin",
            "is_active": True,
            "dept_ids": [d.id for d in dept_models]
        },
        # Manager Account
        {
            "username": "manager",
            "password": "123",
            "name": "كريم الشناوي (Manager)",
            "role": "Operations & Project Manager",
            "email": "manager@agency.com",
            "department_id": dept_models[0].id,
            "role_type": "manager",
            "is_active": True,
            "dept_ids": [dept_models[0].id, dept_models[1].id, dept_models[2].id, dept_models[3].id, dept_models[4].id]
        },
        # Head of Department Account (Demo Head for Production)
        {
            "username": "head",
            "password": "123",
            "name": "كريم صادق (رئيس قسم الإنتاج)",
            "role": "Head of Visual Production",
            "email": "head.production@agency.com",
            "department_id": dept_models[1].id,
            "role_type": "head",
            "is_active": True,
            "dept_ids": [dept_models[1].id]
        },
        # Employee 1: Senior Brand Designer
        {
            "username": "sara",
            "password": "123",
            "name": "سارة محمود",
            "role": "Senior Brand & Visual Identity Designer",
            "email": "sara@agency.com",
            "department_id": dept_models[0].id,
            "role_type": "employee",
            "is_active": True,
            "dept_ids": [dept_models[0].id]
        },
        # Employee 2: Lead UI/UX Architect
        {
            "username": "ahmed",
            "password": "123",
            "name": "أحمد حلمي",
            "role": "Lead Product & UI/UX Architect",
            "email": "ahmed@agency.com",
            "department_id": dept_models[2].id,
            "role_type": "employee",
            "is_active": True,
            "dept_ids": [dept_models[2].id, dept_models[0].id]
        },
        # Head of Visual Production
        {
            "username": "kareem",
            "password": "123",
            "name": "كريم صادق",
            "role": "Commercial & Drone Media Director (Head of Production)",
            "email": "kareem@agency.com",
            "department_id": dept_models[1].id,
            "role_type": "head",
            "is_active": True,
            "dept_ids": [dept_models[1].id]
        },
        # Employee 4: Creative Copywriter
        {
            "username": "maryam",
            "password": "123",
            "name": "مريم الشريف",
            "role": "Senior Growth & Content Strategist",
            "email": "maryam@agency.com",
            "department_id": dept_models[3].id,
            "role_type": "employee",
            "is_active": True,
            "dept_ids": [dept_models[3].id]
        },
        # Employee 5: Full Stack Web Developer
        {
            "username": "omar",
            "password": "123",
            "name": "عمر الفاروق",
            "role": "Principal Software & Web Engineer",
            "email": "omar@agency.com",
            "department_id": dept_models[4].id,
            "role_type": "employee",
            "is_active": True,
            "dept_ids": [dept_models[4].id]
        }
    ]

    member_objs = {}
    for m in members_data:
        dept_ids = m.pop("dept_ids")
        mem = models.TeamMember(**m)
        db.add(mem)
        db.commit()
        db.refresh(mem)
        # Assign many-to-many departments
        depts = db.query(models.Department).filter(models.Department.id.in_(dept_ids)).all()
        mem.departments = depts
        db.commit()
        member_objs[m["username"]] = mem

    # 3. Realistic Clients & Multiple Companies
    now = datetime.now()
    
    clients_seed = [
        # ---------------- CLIENT 1: المهندس هشام نور (2 شركات) ----------------
        {
            "name": "المهندس هشام نور",
            "company_name": "شركة أفق للتطوير العقاري",
            "service_type": "تطوير هوية بصرية + منصة حجز عقاري",
            "request_details": "طلب هوية بصرية راقية لمشروع سكني في التجمع الخامس، مع منصة ويب متجاوبة لعرض الوحدات والفلل ونظام حجز واستفسارات مباشر.",
            "priority": "urgent",
            "status": "in_progress",
            "drive_folder_url": "https://drive.google.com/drive/folders/1OfuqRealEstate",
            "drive_folder_id": "1OfuqRealEstate",
            "intake_timestamp": now - timedelta(days=2, hours=4),
            "target_deadline": now + timedelta(hours=36),
            "progress_percentage": 66,
            "stages": [
                {
                    "department_id": dept_models[0].id,
                    "assigned_member_id": member_objs["sara"].id,
                    "stage_name": "تصميم الشعار ودليل الهوية البصرية المتكامل",
                    "description": "تصميم الشعار الأساسي مع كود الألوان، الخطوط الرسمية، وتطبيقات المطبوعات وكروت العمل.",
                    "status": "completed",
                    "completion_timestamp": now - timedelta(days=1, hours=8),
                    "deliverable_note": "تم اعتماد الشعار الرئيسي ودليل الهوية بصيغة PDF عالية الدقة وتم رفع ملفات الفيكتور.",
                    "deliverable_url": "https://drive.google.com/file/d/ofuque-brandbook-final.pdf",
                    "order_index": 0
                },
                {
                    "department_id": dept_models[2].id,
                    "assigned_member_id": member_objs["ahmed"].id,
                    "stage_name": "تخطيط واجهات وتجربة مستخدم منصة الحجز UI/UX",
                    "description": "تصميم 14 شاشة رئيسية تشمل خريطة الوحدات التفاعلية، حاسبة التمويل، ومعرض الصور ثلاثي الأبعاد.",
                    "status": "completed",
                    "completion_timestamp": now - timedelta(hours=14),
                    "deliverable_note": "تم تسليم بروتوتايب Figma التفاعلي واعتماده من مجلس إدارة الشركة.",
                    "deliverable_url": "https://www.figma.com/file/ofuq-prototype-approved",
                    "order_index": 1
                },
                {
                    "department_id": dept_models[4].id,
                    "assigned_member_id": member_objs["omar"].id,
                    "stage_name": "برمجة المنصة الإلكترونية وربط محرك البحث العقاري",
                    "description": "تطوير الفرونت إند والباك إند وربط استمارات الحجز السريع بنظام إدارة العملاء CRM.",
                    "status": "in_progress",
                    "completion_timestamp": None,
                    "deliverable_note": None,
                    "deliverable_url": None,
                    "order_index": 2
                }
            ]
        },
        {
            "name": "المهندس هشام نور",
            "company_name": "أفق لإدارة الأصول والمنتجعات الفندقية",
            "service_type": "تصوير سينمائي وميديا رقمية للمنتجعات",
            "request_details": "تغطية بصرية شاملة وتصوير فوتوغرافي وجوي بالدرون لمنتجع الشركة بالساحل الشمالي لإطلاق الحجوزات الصيفية.",
            "priority": "high",
            "status": "in_progress",
            "drive_folder_url": "https://drive.google.com/drive/folders/1OfuqHospitality",
            "drive_folder_id": "1OfuqHospitality",
            "intake_timestamp": now - timedelta(days=1, hours=10),
            "target_deadline": now + timedelta(hours=48),
            "progress_percentage": 50,
            "stages": [
                {
                    "department_id": dept_models[1].id,
                    "assigned_member_id": member_objs["kareem"].id,
                    "stage_name": "جلسة التصوير الفوتوغرافي والجوي بالدرون للوحدات الفندقية",
                    "description": "التقاط 60 صورة معالجة احترافياً للأجنحة، حمامات السباحة، وشاطئ المنتجع الخاص.",
                    "status": "completed",
                    "completion_timestamp": now - timedelta(hours=8),
                    "deliverable_note": "تم رفع ألبوم الصور بجودة 4K على المجلد السحابي بانتظار المونتاج.",
                    "deliverable_url": "https://drive.google.com/drive/folders/1OfuqHospitality/photos_4k",
                    "order_index": 0
                },
                {
                    "department_id": dept_models[1].id,
                    "assigned_member_id": member_objs["kareem"].id,
                    "stage_name": "مونتاج وتلوين الفيديو الإعلاني الترويجي للحملة",
                    "description": "إنتاج فيديو دعائي مدته 60 ثانية مع تعليق صوتي وموسيقى مرخصة وتعديل سينمائي للألوان.",
                    "status": "in_progress",
                    "completion_timestamp": None,
                    "deliverable_note": None,
                    "deliverable_url": None,
                    "order_index": 1
                }
            ]
        },

        # ---------------- CLIENT 2: د. رانيا عبد العزيز (2 شركات) ----------------
        {
            "name": "د. رانيا عبد العزيز",
            "company_name": "علامة نماء للأغذية الصحية والعضوية",
            "service_type": "تصوير منتجات + تصميم عبوات + إعلانات",
            "request_details": "إطلاق خط إنتاج جديد من السناكس الصحية الغنية بالبروتين، مع تصميم عبوات عصرية وتصوير المنتجات وصناعة المحتوى الترويجي.",
            "priority": "high",
            "status": "in_progress",
            "drive_folder_url": "https://drive.google.com/drive/folders/1NamaaHealthy",
            "drive_folder_id": "1NamaaHealthy",
            "intake_timestamp": now - timedelta(days=3, hours=2),
            "target_deadline": now + timedelta(hours=24),
            "progress_percentage": 66,
            "stages": [
                {
                    "department_id": dept_models[3].id,
                    "assigned_member_id": member_objs["maryam"].id,
                    "stage_name": "صياغة اسكريبتات الحملة ورسائل القيمة الغذائية",
                    "description": "كتابة نصوص إعلانية وفيديوهات توعوية للسوشيال ميديا تسلط الضوء على الفوائد الصحية للمنتجات.",
                    "status": "completed",
                    "completion_timestamp": now - timedelta(days=2),
                    "deliverable_note": "تم اعتماد جدول النصوص والاسكريبتات المكون من 12 منشور وفيديو ريلز.",
                    "deliverable_url": "https://drive.google.com/file/d/namaa-copywriting-scripts.docx",
                    "order_index": 0
                },
                {
                    "department_id": dept_models[1].id,
                    "assigned_member_id": member_objs["kareem"].id,
                    "stage_name": "جلسة تصوير المنتجات في الاستوديو مع إضاءة سينمائية",
                    "description": "تصوير المنتجات مع المكونات الطبيعية (عسل، شوفان، مكسرات) لإنتاج لقطات جذابة تفتح الشهية.",
                    "status": "completed",
                    "completion_timestamp": now - timedelta(hours=22),
                    "deliverable_note": "تم تسليم 45 صورة للمنتجات مفرغة الخلفية وجاهزة للتصميم والمتجر.",
                    "deliverable_url": "https://drive.google.com/drive/folders/1NamaaHealthy/clean_product_shots",
                    "order_index": 1
                },
                {
                    "department_id": dept_models[0].id,
                    "assigned_member_id": member_objs["sara"].id,
                    "stage_name": "تصميم بنرات المتجر الإلكتروني وتصاميم السوشيال ميديا",
                    "description": "تجهيز البوستات والستوريز للحملة الممولة على إنستجرام وتيك توك وفيسبوك.",
                    "status": "in_progress",
                    "completion_timestamp": None,
                    "deliverable_note": None,
                    "deliverable_url": None,
                    "order_index": 2
                }
            ]
        },
        {
            "name": "د. رانيا عبد العزيز",
            "company_name": "سلسلة كافيهات نماء أورجانيك (Namaa Cafe)",
            "service_type": "تصميم الهوية البصرية والقوائم والزي الموحد",
            "request_details": "تجهيز هوية متكاملة لفرعي الشيخ زايد والقاهرة الجديدة تشمل أكواب القهوة، الأكياس الصديقة للبيئة، والمنيو التفاعلي.",
            "priority": "medium",
            "status": "completed",
            "drive_folder_url": "https://drive.google.com/drive/folders/1NamaaCafe",
            "drive_folder_id": "1NamaaCafe",
            "intake_timestamp": now - timedelta(days=5),
            "target_deadline": now - timedelta(hours=6),
            "progress_percentage": 100,
            "stages": [
                {
                    "department_id": dept_models[0].id,
                    "assigned_member_id": member_objs["sara"].id,
                    "stage_name": "تصميم هوية الأكواب والأكياس الورقية والزي الموحد",
                    "description": "تصميم متكامل بألوان طبيعية وأنيقة مع شعار الكافيه والعبارات التحفيزية.",
                    "status": "completed",
                    "completion_timestamp": now - timedelta(days=3),
                    "deliverable_note": "تم إرسال الملفات المطبعية للمطبعة والبدء في تصنيع الأكواب والأكياس.",
                    "deliverable_url": "https://drive.google.com/file/d/namaa-cafe-packaging-print-ready.pdf",
                    "order_index": 0
                },
                {
                    "department_id": dept_models[0].id,
                    "assigned_member_id": member_objs["sara"].id,
                    "stage_name": "تصميم وطباعة قوائم المشروبات والوجبات الصحية",
                    "description": "تصميم المنيو المطبوع وقائمة الأسعار الرقمية لشاشات العرض داخل الفروع.",
                    "status": "completed",
                    "completion_timestamp": now - timedelta(hours=10),
                    "deliverable_note": "تم تسليم النسخ الرقمية وتجهيز كود الـ QR للمنيو الإلكتروني.",
                    "deliverable_url": "https://drive.google.com/file/d/namaa-cafe-digital-menu.pdf",
                    "order_index": 1
                }
            ]
        },

        # ---------------- CLIENT 3: أ. طارق الشناوي (2 شركات) ----------------
        {
            "name": "أ. طارق الشناوي",
            "company_name": "الشناوي للخدمات اللوجستية والشحن المبرد",
            "service_type": "تطوير لوحة تحكم تتبع الشحنات وموقع الشحن",
            "request_details": "بناء نظام رقمي متكامل لمتابعة خطوط التوزيع والشحن المبرد للشركات والمصانع الكبرى في جميع محافظات مصر.",
            "priority": "urgent",
            "status": "in_progress",
            "drive_folder_url": "https://drive.google.com/drive/folders/1ShennawyLogistics",
            "drive_folder_id": "1ShennawyLogistics",
            "intake_timestamp": now - timedelta(days=2, hours=16),
            "target_deadline": now + timedelta(hours=30),
            "progress_percentage": 33,
            "stages": [
                {
                    "department_id": dept_models[2].id,
                    "assigned_member_id": member_objs["ahmed"].id,
                    "stage_name": "دراسة تجربة المستخدم وهندسة واجهات نظام التتبع",
                    "description": "تخطيط شاشات السائقين وشاشات غرفة التحكم والمتابعة اللحظية لدرجات الحرارة ومسارات السيارات.",
                    "status": "completed",
                    "completion_timestamp": now - timedelta(days=1),
                    "deliverable_note": "تم تسليم واجهات النظام التفاعلية ولوحة تحكم العمليات على Figma.",
                    "deliverable_url": "https://www.figma.com/file/shennawy-logistics-ux",
                    "order_index": 0
                },
                {
                    "department_id": dept_models[4].id,
                    "assigned_member_id": member_objs["omar"].id,
                    "stage_name": "برمجة خريطة التتبع المباشر وتنبيهات أجهزة الاستشعار",
                    "description": "ربط نظام المتابعة السحابي مع أجهزة الـ GPS ومستشعرات التبريد في أسطول الشاحنات.",
                    "status": "in_progress",
                    "completion_timestamp": None,
                    "deliverable_note": None,
                    "deliverable_url": None,
                    "order_index": 1
                },
                {
                    "department_id": dept_models[4].id,
                    "assigned_member_id": member_objs["omar"].id,
                    "stage_name": "بوابة دفع الفواتير للشركات وإصدار بوالص الشحن",
                    "description": "أتمتة الفواتير الإلكترونية وبوالص الشحن عبر بوابات الدفع الإلكتروني المعتمدة.",
                    "status": "pending",
                    "completion_timestamp": None,
                    "deliverable_note": None,
                    "deliverable_url": None,
                    "order_index": 2
                }
            ]
        },
        {
            "name": "أ. طارق الشناوي",
            "company_name": "منصة الشناوي للمزادات والتوريدات التجارية",
            "service_type": "حملات تسويق رقمي وإدارة السوشيال ميديا",
            "request_details": "إدارة الحملات التسويقية للمزادات الكبرى لجذب المستثمرين ورجال الأعمال والشركات الصناعية.",
            "priority": "high",
            "status": "in_progress",
            "drive_folder_url": "https://drive.google.com/drive/folders/1ShennawyAuctions",
            "drive_folder_id": "1ShennawyAuctions",
            "intake_timestamp": now - timedelta(days=1, hours=8),
            "target_deadline": now + timedelta(hours=40),
            "progress_percentage": 50,
            "stages": [
                {
                    "department_id": dept_models[3].id,
                    "assigned_member_id": member_objs["maryam"].id,
                    "stage_name": "إعداد المحتوى الاستراتيجي لحملة مزادات الربع الأخير",
                    "description": "صياغة كراسات الشروط الإعلانية والمنشورات الاحترافية على شبكة LinkedIn.",
                    "status": "completed",
                    "completion_timestamp": now - timedelta(hours=12),
                    "deliverable_note": "تم تجهيز ونشر الخطة التسويقية وحقائب المزاد التعريفية بنجاح.",
                    "deliverable_url": "https://drive.google.com/file/d/auctions-plan-q4.pdf",
                    "order_index": 0
                },
                {
                    "department_id": dept_models[3].id,
                    "assigned_member_id": member_objs["maryam"].id,
                    "stage_name": "إطلاق وإدارة الحملات الممولة على Google Search & LinkedIn",
                    "description": "متابعة أداء الإعلانات وتحسين تكلفة الحصول على مشترين ومزايدين مؤهلين.",
                    "status": "in_progress",
                    "completion_timestamp": None,
                    "deliverable_note": None,
                    "deliverable_url": None,
                    "order_index": 1
                }
            ]
        },

        # ---------------- CLIENT 4: م. حسام التميمي (1 شركة مكتملة 100%) ----------------
        {
            "name": "م. حسام التميمي",
            "company_name": "تطبيق باص كليك للنقل التشاركي الذكي",
            "service_type": "تصميم واجهات وتطوير تطبيق جوال متكامل",
            "request_details": "تطوير تطبيق جوال للنقل الجماعي الذكي بين المدن مع شاشات الحجز المباشر واختيار المقاعد والدفع السريع.",
            "priority": "medium",
            "status": "completed",
            "drive_folder_url": "https://drive.google.com/drive/folders/1BusClickApp",
            "drive_folder_id": "1BusClickApp",
            "intake_timestamp": now - timedelta(days=6),
            "target_deadline": now - timedelta(days=1),
            "progress_percentage": 100,
            "stages": [
                {
                    "department_id": dept_models[2].id,
                    "assigned_member_id": member_objs["ahmed"].id,
                    "stage_name": "تصميم رحلة المستخدم وواجهات الركاب والسائقين",
                    "description": "تصميم الواجهات الكاملة للتطبيق مع محاكاة تجربة الحجز التفاعلي واختيار المقاعد.",
                    "status": "completed",
                    "completion_timestamp": now - timedelta(days=4),
                    "deliverable_note": "تم تسليم كافة الشاشات على Figma مع تصدير الأيقونات والرسومات.",
                    "deliverable_url": "https://www.figma.com/file/busclick-app-design-complete",
                    "order_index": 0
                },
                {
                    "department_id": dept_models[4].id,
                    "assigned_member_id": member_objs["omar"].id,
                    "stage_name": "برمجة لوحة التحكم والخرائط الحية وتطبيق الموبايل",
                    "description": "برمجة التطبيق ولوحة العمليات وربط الخرائط الحية وتتبع الرحلات المباشر.",
                    "status": "completed",
                    "completion_timestamp": now - timedelta(days=2),
                    "deliverable_note": "تم رفع نسخة التطبيق التجريبية (Beta APK & TestFlight) واعتمادها.",
                    "deliverable_url": "https://drive.google.com/file/d/busclick-release-v1.apk",
                    "order_index": 1
                },
                {
                    "department_id": dept_models[4].id,
                    "assigned_member_id": member_objs["omar"].id,
                    "stage_name": "فحص التوافقية والأمان وتسليم النظام النهائي",
                    "description": "اختبار ضغط الخوادم والتأكد من أمان بوابات الدفع وتسليم كود المشروع والوثائق.",
                    "status": "completed",
                    "completion_timestamp": now - timedelta(hours=28),
                    "deliverable_note": "تم تسليم شهادة الجودة والأكواد المصدرية وتشغيل النظام رسمياً.",
                    "deliverable_url": "https://drive.google.com/file/d/system-delivery-certificate.pdf",
                    "order_index": 2
                }
            ]
        }
    ]

    for cdata in clients_seed:
        stages_info = cdata.pop("stages")
        client = models.Client(**cdata)
        db.add(client)
        db.commit()
        db.refresh(client)

        # Drive folder sub-items
        drive_items = [
            models.DriveFolderItem(client_id=client.id, name="01_Brand_Identity_Assets", path="/01_Brand_Identity_Assets", is_folder=True, created_at=client.intake_timestamp),
            models.DriveFolderItem(client_id=client.id, name="02_Media_Photography_4K", path="/02_Media_Photography_4K", is_folder=True, created_at=client.intake_timestamp),
            models.DriveFolderItem(client_id=client.id, name="03_UI_UX_Design_Figma", path="/03_UI_UX_Design_Figma", is_folder=True, created_at=client.intake_timestamp),
            models.DriveFolderItem(client_id=client.id, name="04_Approved_Deliverables", path="/04_Approved_Deliverables", is_folder=True, created_at=client.intake_timestamp)
        ]
        for ditem in drive_items:
            db.add(ditem)

        audit_intake = models.AuditLog(
            client_id=client.id,
            action="INTAKE_RECORDED",
            performed_by="System Auto-Provisioner",
            timestamp=client.intake_timestamp,
            details=f"تم تسجيل الشركة وتوليد مجلد Google Drive السحابي ({client.company_name}) وتوزيع المهام."
        )
        db.add(audit_intake)

        for sinfo in stages_info:
            stage = models.TaskStage(client_id=client.id, **sinfo)
            db.add(stage)
            db.commit()

            if sinfo["status"] == "completed" and sinfo["completion_timestamp"]:
                member = db.get(models.TeamMember, sinfo["assigned_member_id"])
                audit_stage = models.AuditLog(
                    client_id=client.id,
                    action="STAGE_COMPLETED",
                    performed_by=member.name if member else "Team Member",
                    timestamp=sinfo["completion_timestamp"],
                    details=f"تم تسليم مرحلة ({sinfo['stage_name']}) بنجاح وتسجيل الملاحظات وروابط الإنجاز."
                )
                db.add(audit_stage)

    db.commit()
    if should_close:
        db.close()
    print("Realistic seeding finished with 4 real clients, 7 companies, full tasks, and 0 numeric test records!")

if __name__ == "__main__":
    seed_database()
