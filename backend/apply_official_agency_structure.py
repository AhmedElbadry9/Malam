# -*- coding: utf-8 -*-
"""
Apply the 7 Official Departments and Agency Structure to SQLite agency.db
Preserves all existing clients and task stages while re-mapping them cleanly.
"""
import json
from database import SessionLocal
import models

DEPARTMENTS_CONFIG = [
    {
        "code": "SOCIAL_CONTENT",
        "name_ar": "قسم السوشيال ميديا والمحتوى",
        "name_en": "Social Media & Content",
        "icon": "Megaphone",
        "color": "#8b5cf6",
        "description": "إدارة المنصات، كتابة المحتوى، التصميم اليومي، وخطط المحتوى الشهرية والرد على التفاعلات.",
        "services": [
            "إدارة حسابات ومتابعة أداء المنصات",
            "كتابة الكابشن اليومي والمقالات (Copywriting)",
            "إعداد خطة المحتوى الشهرية وتطوير الأفكار",
            "تصميم بوستات وستوري السوشيال ميديا اليومية",
            "جدولة النشر والرد على التعليقات والرسائل"
        ]
    },
    {
        "code": "PRODUCTION",
        "name_ar": "قسم الإنتاج المرئي (تصوير وفيديو)",
        "name_en": "Visual Production (Photo & Video)",
        "icon": "Camera",
        "color": "#f59e0b",
        "description": "كل أنواع الفيديو والتصوير الفوتوغرافي الإعلاني، جلسات المنتجات، التصوير الجوي والتعليق الصوتي.",
        "services": [
            "تصوير فوتوغرافي للمنتجات بجودة إعلانية 4K",
            "تصوير ميداني إعلاني ومقاطع UGC/EGC",
            "كتابة السيناريو وبناء الفكرة الإبداعية (Scriptwriting)",
            "مونتاج الفيديو وقص وتصحيح الألوان والمؤثرات",
            "تصوير جوي مرخص بالدرون (Drone Footage)",
            "تسجيل تعليق صوتي احترافي بالفصحى واللهجات (Voice Over)"
        ]
    },
    {
        "code": "BRANDING",
        "name_ar": "قسم التصميم والهوية البصرية",
        "name_en": "Branding & Visual Identity",
        "icon": "Palette",
        "color": "#ec4899",
        "description": "بناء الهوية البصرية الكاملة، الشعارات، أدلة الاستخدام، وتصميم واجهات وتجربة المستخدم UI/UX.",
        "services": [
            "تصميم الشعار وبناء الهوية البصرية الكاملة",
            "إعداد دليل الاستخدام للعلامة التجارية (Brand Guidelines)",
            "تصميم واجهات وتجربة المستخدم للمواقع والمتاجر (UI/UX)",
            "بناء وتجهيز ملفات التصميم والبروتوتايب التفاعلي (Figma)"
        ]
    },
    {
        "code": "DEV_ECOMMERCE",
        "name_ar": "قسم البرمجة والمتاجر الإلكترونية",
        "name_en": "Web & E-Commerce Development",
        "icon": "Code",
        "color": "#10b981",
        "description": "تأسيس وإدارة المواقع والمتاجر الإلكترونية (سلة وزد) والمواقع المخصصة والتحسين التقني SEO.",
        "services": [
            "تأسيس وإعداد متجر إلكتروني تقنياً (سلة / زد)",
            "ربط بوابات الدفع الإلكتروني وشركات الشحن",
            "تطوير واجهات مواقع ويب مخصصة فرونت إند (Front-end)",
            "تحسين محركات البحث التقني للموقع (Technical SEO)",
            "الإدارة والتشغيل اليومي للمتجر ومتابعة المنتجات والطلبات"
        ]
    },
    {
        "code": "PERFORMANCE_ADS",
        "name_ar": "قسم الإعلانات الممولة (Performance Marketing)",
        "name_en": "Performance Marketing & Paid Ads",
        "icon": "TrendingUp",
        "color": "#3b82f6",
        "description": "إدارة كل الحملات الإعلانية المدفوعة وتحسين العائد عبر مختلف المنصات الرقمية وتحليل البيانات.",
        "services": [
            "إدارة حملات إعلانات ميتا وتيك توك وسناب شات (B2C Ads)",
            "إدارة إعلانات جوجل والكلمات المفتاحية (Google Ads Search)",
            "إعلانات منصة لينكدإن واستهداف قطاع الأعمال بدقة (B2B Ads)",
            "تحليل بيانات أداء الحملات وإعداد التقارير وتوصيات التحسين"
        ]
    },
    {
        "code": "STRATEGY",
        "name_ar": "قسم الاستراتيجية والاستشارات",
        "name_en": "Strategy & Consulting",
        "icon": "Target",
        "color": "#f97316",
        "description": "بناء الخطط التسويقية الكبرى، دراسات السوق، تحليل المنافسين، ودعم قرارات التسعير والتموضع.",
        "services": [
            "بناء الاستراتيجية التسويقية الشاملة وخطة العمل التنفيذية",
            "دراسة السوق وتحليل المنافسين والفجوات والفرص",
            "استشارات التسعير وتموضع العلامة التجارية في السوق"
        ]
    },
    {
        "code": "OPERATIONS",
        "name_ar": "قسم إدارة العملاء والعمليات",
        "name_en": "Client Success & Operations",
        "icon": "Briefcase",
        "color": "#6366f1",
        "description": "إدارة العلاقة مع العميل، التنسيق الداخلي بين الأقسام، ضمان جودة التسليم، ومتابعة الـ SLA.",
        "services": [
            "إدارة ومتابعة كبار العملاء والتواصل المستمر (Key Account Management)",
            "تنسيق العمليات وتوزيع المهام اليومية بين الأقسام",
            "متابعة الالتزام الزمني (SLA) وحل أي تعارضات تشغيلية",
            "مراجعة وتدقيق الجودة قبل التسليم النهائي للعميل"
        ]
    }
]

# Specific Staff mapping per department
STAFF_SEEDS = [
    # 1. Leadership (Admin holds all management & system powers, Manager handles projects)
    {
        "username": "admin",
        "name": "مدير النظام والتشغيل (Admin)",
        "role": "المدير العام ومدير النظام والتشغيل",
        "email": "admin@malam.agency",
        "role_type": "admin",
        "is_active": True,
        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        "dept_codes": ["OPERATIONS", "SOCIAL_CONTENT", "BRANDING", "DEV_ECOMMERCE", "PRODUCTION", "STRATEGY", "PERFORMANCE_ADS"]
    },
    {
        "username": "superadmin",
        "name": "المدير التنفيذي (Admin)",
        "role": "المدير التنفيذي والمالك",
        "email": "superadmin@malam.agency",
        "role_type": "admin",
        "is_active": True,
        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        "dept_codes": ["OPERATIONS", "STRATEGY", "SOCIAL_CONTENT", "PRODUCTION", "BRANDING", "DEV_ECOMMERCE", "PERFORMANCE_ADS"]
    },
    {
        "username": "manager",
        "name": "كريم الشناوي (مدير المشاريع)",
        "role": "مدير المشاريع والعمليات المشتركة (Manager)",
        "email": "manager@malam.agency",
        "role_type": "manager",
        "is_active": True,
        "avatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
        "dept_codes": ["OPERATIONS", "SOCIAL_CONTENT", "PRODUCTION"]
    },
    # 2. رؤساء الأقسام (Department Heads)
    {
        "username": "head",
        "name": "كريم صادق (رئيس قسم الإنتاج)",
        "role": "رئيس قسم الإنتاج المرئي (Head of Production)",
        "email": "head.production@malam.agency",
        "role_type": "head",
        "is_active": True,
        "avatar": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150",
        "dept_codes": ["PRODUCTION"]
    },
    {
        "username": "head_social",
        "name": "مريم الشريف (رئيس السوشيال ميديا)",
        "role": "رئيس قسم السوشيال ميديا والمحتوى (Head of Social)",
        "email": "head.social@malam.agency",
        "role_type": "head",
        "is_active": True,
        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        "dept_codes": ["SOCIAL_CONTENT"]
    },
    # 2. قسم السوشيال ميديا والمحتوى
    {
        "username": "maryam",
        "name": "مريم الشريف",
        "role": "كاتب محتوى (Copywriter)",
        "email": "maryam@malam.agency",
        "role_type": "employee",
        "is_active": True,
        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        "dept_codes": ["SOCIAL_CONTENT"]
    },
    {
        "username": "nour",
        "name": "نور الهدى إبراهيم",
        "role": "مصمم جرافيك سوشيال ميديا",
        "email": "nour@malam.agency",
        "role_type": "employee",
        "is_active": True,
        "avatar": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
        "dept_codes": ["SOCIAL_CONTENT", "BRANDING"]
    },
    {
        "username": "hassan_social",
        "name": "حسن رضوان",
        "role": "مسؤول جدولة ونشر",
        "email": "hassan@malam.agency",
        "role_type": "employee",
        "is_active": True,
        "avatar": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150",
        "dept_codes": ["SOCIAL_CONTENT"]
    },
    # 3. قسم الإنتاج المرئي
    {
        "username": "kareem",
        "name": "كريم صادق",
        "role": "رئيس قسم الإنتاج المرئي والمخرج التجاري",
        "email": "kareem@malam.agency",
        "role_type": "head",
        "is_active": True,
        "avatar": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150",
        "dept_codes": ["PRODUCTION"]
    },
    {
        "username": "tamer_photo",
        "name": "تامر عبد الرحمن",
        "role": "مصور فوتوغرافي",
        "email": "tamer@malam.agency",
        "role_type": "employee",
        "is_active": True,
        "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
        "dept_codes": ["PRODUCTION"]
    },
    {
        "username": "youssef_editor",
        "name": "يوسف متولي",
        "role": "مونتير (Video Editor)",
        "email": "youssef@malam.agency",
        "role_type": "employee",
        "is_active": True,
        "avatar": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150",
        "dept_codes": ["PRODUCTION"]
    },
    # 4. قسم التصميم والهوية البصرية
    {
        "username": "sara",
        "name": "سارة محمود",
        "role": "مصمم هوية بصرية (Brand Designer)",
        "email": "sara@malam.agency",
        "role_type": "employee",
        "is_active": True,
        "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
        "dept_codes": ["BRANDING"]
    },
    {
        "username": "ahmed",
        "name": "أحمد حلمي",
        "role": "مصمم UI/UX",
        "email": "ahmed@malam.agency",
        "role_type": "employee",
        "is_active": True,
        "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
        "dept_codes": ["BRANDING", "DEV_ECOMMERCE"]
    },
    # 5. قسم البرمجة والمتاجر الإلكترونية
    {
        "username": "omar",
        "name": "عمر الفاروق",
        "role": "مطور واجهات (Front-end)",
        "email": "omar@malam.agency",
        "role_type": "employee",
        "is_active": True,
        "avatar": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150",
        "dept_codes": ["DEV_ECOMMERCE"]
    },
    {
        "username": "khaled_ecommerce",
        "name": "خالد الصاوي",
        "role": "مختص متاجر إلكترونية (سلة/زد)",
        "email": "khaled@malam.agency",
        "role_type": "employee",
        "is_active": True,
        "avatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
        "dept_codes": ["DEV_ECOMMERCE"]
    },
    # 6. قسم الإعلانات الممولة
    {
        "username": "mahmoud_ads",
        "name": "محمود زكريا",
        "role": "مختص إعلانات ميتا/تيك توك/سناب",
        "email": "mahmoud@malam.agency",
        "role_type": "employee",
        "is_active": True,
        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        "dept_codes": ["PERFORMANCE_ADS"]
    },
    {
        "username": "ziad_google",
        "name": "زياد علام",
        "role": "مختص جوجل ادز (Google Ads)",
        "email": "ziad@malam.agency",
        "role_type": "employee",
        "is_active": True,
        "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
        "dept_codes": ["PERFORMANCE_ADS"]
    },
    # 7. قسم الاستراتيجية والاستشارات
    {
        "username": "dr_tarek",
        "name": "د. طارق السعيد",
        "role": "استشاري تسويقي أول",
        "email": "tarek@malam.agency",
        "role_type": "employee",
        "is_active": True,
        "avatar": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150",
        "dept_codes": ["STRATEGY"]
    },
    {
        "username": "salma_analyst",
        "name": "سلمى عبد الحميد",
        "role": "محلل منافسين وسوق",
        "email": "salma@malam.agency",
        "role_type": "employee",
        "is_active": True,
        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        "dept_codes": ["STRATEGY", "PERFORMANCE_ADS"]
    }
]

def apply_structure():
    db = SessionLocal()
    try:
        print("[1/4] Upserting 7 Official Agency Departments...")
        code_to_dept = {}

        # 1. Fetch or create each department
        for d_cfg in DEPARTMENTS_CONFIG:
            dept = db.query(models.Department).filter(models.Department.code == d_cfg["code"]).first()
            if not dept:
                dept = db.query(models.Department).filter(models.Department.name_ar == d_cfg["name_ar"]).first()

            if dept:
                dept.name_ar = d_cfg["name_ar"]
                dept.name_en = d_cfg["name_en"]
                dept.code = d_cfg["code"]
                dept.icon = d_cfg["icon"]
                dept.color = d_cfg["color"]
                dept.description = d_cfg["description"]
                dept.services = d_cfg["services"]
            else:
                dept = models.Department(**d_cfg)
                db.add(dept)
            
            db.flush()
            code_to_dept[d_cfg["code"]] = dept

        db.commit()
        print(f"  -> {len(code_to_dept)} departments configured successfully!")

        # 2. Clean up or map obsolete department IDs if any
        old_to_new = {
            "GRAPHIC": "BRANDING",
            "MEDIA": "PRODUCTION",
            "UIUX": "BRANDING",
            "COPY": "SOCIAL_CONTENT",
            "DEV": "DEV_ECOMMERCE"
        }
        for old_code, new_code in old_to_new.items():
            old_dept = db.query(models.Department).filter(models.Department.code == old_code).first()
            if old_dept and old_dept.id != code_to_dept[new_code].id:
                target_id = code_to_dept[new_code].id
                stages = db.query(models.TaskStage).filter(models.TaskStage.department_id == old_dept.id).all()
                for s in stages:
                    s.department_id = target_id
                members = db.query(models.TeamMember).filter(models.TeamMember.department_id == old_dept.id).all()
                for m in members:
                    m.department_id = target_id
                db.flush()
                try:
                    db.delete(old_dept)
                    db.flush()
                except Exception:
                    pass

        db.commit()

        # 3. Upsert Staff with exact Roles and multi-department links
        print("[2/4] Upserting Agency Team Members with exact Roles...")
        for s in STAFF_SEEDS:
            primary_dept = code_to_dept[s["dept_codes"][0]]
            member = db.query(models.TeamMember).filter(models.TeamMember.username == s["username"]).first()
            if member:
                member.name = s["name"]
                member.role = s["role"]
                member.email = s["email"]
                member.role_type = s["role_type"]
                member.avatar = s["avatar"]
                member.department_id = primary_dept.id
                member.is_active = s["is_active"]
            else:
                member = models.TeamMember(
                    username=s["username"],
                    password="123",
                    name=s["name"],
                    role=s["role"],
                    email=s["email"],
                    role_type=s["role_type"],
                    avatar=s["avatar"],
                    department_id=primary_dept.id,
                    is_active=s["is_active"]
                )
                db.add(member)

            db.flush()
            linked_depts = [code_to_dept[c] for c in s["dept_codes"] if c in code_to_dept]
            member.departments = linked_depts

        db.commit()
        print(f"  -> {len(STAFF_SEEDS)} team members synchronized with official roles!")

        # 4. Verify Final State
        all_depts = db.query(models.Department).all()
        all_members = db.query(models.TeamMember).all()
        print(f"\n[DONE] Structure successfully updated! Total Departments: {len(all_depts)}, Total Staff: {len(all_members)}")
        for d in all_depts:
            print(f"  - [{d.id}] {d.name_ar} ({d.code}) - {len(d.services or [])} services")

    except Exception as e:
        db.rollback()
        print(f"Error applying agency structure: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    apply_structure()
