import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.session import SessionLocal
import models

def reset_and_seed_clean_team():
    db = SessionLocal()
    try:
        print("Cleaning up old team members...")
        # Clear member-departments association table
        db.execute(models.member_departments.delete())
        
        # Clear team members
        db.query(models.TeamMember).delete()
        db.commit()

        # Get existing departments by code (lowercased)
        departments = {str(d.code).lower(): d for d in db.query(models.Department).all()}
        
        if not departments:
            print("No departments found! Please ensure departments exist.")
            return

        all_dept_ids = [d.id for d in departments.values()]

        clean_team = [
            # 1. الإدارة العامة والتشغيل (Management & Operations)
            {
                "name": "أحمد المنشاوي",
                "username": "admin",
                "password": "123",
                "email": "admin@agency.com",
                "phone": "01000000001",
                "role": "المدير التنفيذي والعام (CEO)",
                "role_type": "admin",
                "department_id": departments.get("operations", list(departments.values())[0]).id,
                "is_active": True,
                "dept_ids": all_dept_ids
            },
            {
                "name": "كريم الشناوي",
                "username": "manager",
                "password": "123",
                "email": "manager@agency.com",
                "phone": "01000000002",
                "role": "مدير العمليات والمشاريع (Project & Operations Manager)",
                "role_type": "manager",
                "department_id": departments.get("operations", list(departments.values())[0]).id,
                "is_active": True,
                "dept_ids": all_dept_ids
            },

            # 2. قسم المحتوى والسوشيال ميديا (Social Media & Content)
            {
                "name": "مريم الشريف",
                "username": "head_social",
                "password": "123",
                "email": "maryam@agency.com",
                "phone": "01000000003",
                "role": "رئيس قسم السوشيال ميديا والمحتوى",
                "role_type": "head",
                "department_id": departments["social_content"].id,
                "is_active": True,
                "dept_ids": [departments["social_content"].id]
            },
            {
                "name": "زياد طارق",
                "username": "zeyad",
                "password": "123",
                "email": "zeyad@agency.com",
                "phone": "01000000004",
                "role": "كاتب محتوى إعلاني وتسويقي (Copywriter)",
                "role_type": "employee",
                "department_id": departments["social_content"].id,
                "is_active": True,
                "dept_ids": [departments["social_content"].id]
            },
            {
                "name": "دينا إبراهيم",
                "username": "dina",
                "password": "123",
                "email": "dina@agency.com",
                "phone": "01000000005",
                "role": "أخصائي إدارة منصات ونشر (Community Manager)",
                "role_type": "employee",
                "department_id": departments["social_content"].id,
                "is_active": True,
                "dept_ids": [departments["social_content"].id]
            },
            {
                "name": "أحمد سامح",
                "username": "sameh",
                "password": "123",
                "email": "sameh@agency.com",
                "phone": "01000000006",
                "role": "صانع محتوى إبداعي وسيناريو (Scriptwriter)",
                "role_type": "employee",
                "department_id": departments["social_content"].id,
                "is_active": True,
                "dept_ids": [departments["social_content"].id]
            },

            # 3. قسم الإنتاج المرئي والمسموع (Video Production & Audio)
            {
                "name": "كريم صادق",
                "username": "head_production",
                "password": "123",
                "email": "kareem@agency.com",
                "phone": "01000000007",
                "role": "رئيس قسم الإنتاج والمخرج الفني",
                "role_type": "head",
                "department_id": departments["production"].id,
                "is_active": True,
                "dept_ids": [departments["production"].id]
            },
            {
                "name": "يوسف خالد",
                "username": "youssef",
                "password": "123",
                "email": "youssef@agency.com",
                "phone": "01000000008",
                "role": "مونتير فيديو وتصحيح ألوان ومؤثرات",
                "role_type": "employee",
                "department_id": departments["production"].id,
                "is_active": True,
                "dept_ids": [departments["production"].id]
            },
            {
                "name": "مصطفى شوقي",
                "username": "mostafa_vfx",
                "password": "123",
                "email": "mostafa@agency.com",
                "phone": "01000000009",
                "role": "مصمم موشن جرافيكس ورسوم متحركة (Motion Graphics)",
                "role_type": "employee",
                "department_id": departments["production"].id,
                "is_active": True,
                "dept_ids": [departments["production"].id]
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
                "department_id": departments["branding"].id,
                "is_active": True,
                "dept_ids": [departments["branding"].id]
            },
            {
                "name": "نور الدين حسن",
                "username": "nour",
                "password": "123",
                "email": "nour@agency.com",
                "phone": "01000000012",
                "role": "مصمم واجهات وتجربة مستخدم (UI/UX Designer)",
                "role_type": "employee",
                "department_id": departments["branding"].id,
                "is_active": True,
                "dept_ids": [departments["branding"].id]
            },
            {
                "name": "مينا مجدي",
                "username": "mina",
                "password": "123",
                "email": "mina@agency.com",
                "phone": "01000000013",
                "role": "مصمم جرافيك وبنرات إعلانية (Graphic Designer)",
                "role_type": "employee",
                "department_id": departments["branding"].id,
                "is_active": True,
                "dept_ids": [departments["branding"].id]
            },

            # 5. قسم البرمجة والمتاجر الإلكترونية (Dev & E-commerce)
            {
                "name": "عمر الفاروق",
                "username": "head_dev",
                "password": "123",
                "email": "omar@agency.com",
                "phone": "01000000015",
                "role": "رئيس قسم البرمجة والمتاجر الإلكترونية",
                "role_type": "head",
                "department_id": departments["dev_ecommerce"].id,
                "is_active": True,
                "dept_ids": [departments["dev_ecommerce"].id]
            },
            {
                "name": "طارق مصطفى",
                "username": "tarek",
                "password": "123",
                "email": "tarek@agency.com",
                "phone": "01000000016",
                "role": "مختص منصات متاجر (سلة / زد / Shopify)",
                "role_type": "employee",
                "department_id": departments["dev_ecommerce"].id,
                "is_active": True,
                "dept_ids": [departments["dev_ecommerce"].id]
            },
            {
                "name": "إسلام النجار",
                "username": "eslam",
                "password": "123",
                "email": "eslam@agency.com",
                "phone": "01000000017",
                "role": "مطور واجهات ومتاجر (Frontend Web Developer)",
                "role_type": "employee",
                "department_id": departments["dev_ecommerce"].id,
                "is_active": True,
                "dept_ids": [departments["dev_ecommerce"].id]
            },
            {
                "name": "هاني رضوان",
                "username": "hany",
                "password": "123",
                "email": "hany@agency.com",
                "phone": "01000000018",
                "role": "مهندس تكامل وبوابات دفع وربط تقني (API & Integrations)",
                "role_type": "employee",
                "department_id": departments["dev_ecommerce"].id,
                "is_active": True,
                "dept_ids": [departments["dev_ecommerce"].id]
            },

            # 6. قسم الإعلانات الممولة والحملات (Performance Ads & Media Buying)
            {
                "name": "حسن الدسوقي",
                "username": "head_ads",
                "password": "123",
                "email": "hassan@agency.com",
                "phone": "01000000019",
                "role": "رئيس قسم الإعلانات والحملات الممولة",
                "role_type": "head",
                "department_id": departments["performance_ads"].id,
                "is_active": True,
                "dept_ids": [departments["performance_ads"].id]
            },
            {
                "name": "سلمى عبد العزيز",
                "username": "salma",
                "password": "123",
                "email": "salma@agency.com",
                "phone": "01000000020",
                "role": "مختص إعلانات منصات (Meta / TikTok Ads)",
                "role_type": "employee",
                "department_id": departments["performance_ads"].id,
                "is_active": True,
                "dept_ids": [departments["performance_ads"].id]
            },
            {
                "name": "ريهام فؤاد",
                "username": "reham",
                "password": "123",
                "email": "reham@agency.com",
                "phone": "01000000022",
                "role": "محلل بيانات حملات ومعدلات تحويل (CRO & Analytics)",
                "role_type": "employee",
                "department_id": departments["performance_ads"].id,
                "is_active": True,
                "dept_ids": [departments["performance_ads"].id]
            },

            # 7. قسم الاستراتيجية والاستشارات (Strategy & Growth)
            {
                "name": "د. عمرو عثمان",
                "username": "head_strategy",
                "password": "123",
                "email": "amr@agency.com",
                "phone": "01000000023",
                "role": "استشاري تسويقي أول وبحوث سوق",
                "role_type": "head",
                "department_id": departments["strategy"].id,
                "is_active": True,
                "dept_ids": [departments["strategy"].id]
            },
            {
                "name": "ليلى عبد الرحمن",
                "username": "laila",
                "password": "123",
                "email": "laila@agency.com",
                "phone": "01000000024",
                "role": "أخصائي أبحاث سوق وتحليل منافسين (Market Researcher)",
                "role_type": "employee",
                "department_id": departments["strategy"].id,
                "is_active": True,
                "dept_ids": [departments["strategy"].id]
            },
            {
                "name": "خالد أنور",
                "username": "khaled",
                "password": "123",
                "email": "khaled@agency.com",
                "phone": "01000000025",
                "role": "مخطط استراتيجي ونمو مبيعات (Growth Strategist)",
                "role_type": "employee",
                "department_id": departments["strategy"].id,
                "is_active": True,
                "dept_ids": [departments["strategy"].id]
            },

            # 8. قسم إدارة العملاء والعمليات (Account Management & Operations)
            {
                "name": "منى زكي",
                "username": "mona",
                "password": "123",
                "email": "mona@agency.com",
                "phone": "01000000026",
                "role": "مدير حسابات العملاء ومتابعة الرضا (Senior Account Manager)",
                "role_type": "head",
                "department_id": departments["operations"].id,
                "is_active": True,
                "dept_ids": [departments["operations"].id]
            },
            {
                "name": "هبة الله يحيى",
                "username": "heba",
                "password": "123",
                "email": "heba@agency.com",
                "phone": "01000000027",
                "role": "أخصائي خدمة عملاء ومتابعة تسليمات (Client Success Specialist)",
                "role_type": "employee",
                "department_id": departments["operations"].id,
                "is_active": True,
                "dept_ids": [departments["operations"].id]
            },
            {
                "name": "وليد شريف",
                "username": "waleed",
                "password": "123",
                "email": "waleed@agency.com",
                "phone": "01000000028",
                "role": "منسق عمليات وجداول زمنية (Operations Coordinator)",
                "role_type": "employee",
                "department_id": departments["operations"].id,
                "is_active": True,
                "dept_ids": [departments["operations"].id]
            }
        ]

        for m_data in clean_team:
            dept_ids = m_data.pop("dept_ids")
            member = models.TeamMember(**m_data)
            db.add(member)
            db.commit()
            db.refresh(member)
            
            # Link departments
            member_depts = db.query(models.Department).filter(models.Department.id.in_(dept_ids)).all()
            member.departments = member_depts
            db.commit()

        # Re-link existing stages to valid employees
        zeyad = db.query(models.TeamMember).filter(models.TeamMember.username == "zeyad").first()
        if zeyad:
            db.query(models.TaskStage).filter(models.TaskStage.assigned_member_id.isnot(None)).update({"assigned_member_id": zeyad.id})
            db.commit()

        print(f"Successfully created {len(clean_team)} clean team members with clear Arabic titles, avatars, and structure!")
    except Exception as e:
        db.rollback()
        print(f"Error resetting team: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    reset_and_seed_clean_team()
