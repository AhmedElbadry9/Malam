"""
Dry Run Sandbox Simulation Script for Agency Operations Platform.
Tests the entire lifecycle across Admin, Department Head, and Employee in an isolated in-memory database.
Does NOT modify or touch the production agency.db.
"""
import sys
import os
import io

# Ensure UTF-8 stdout on Windows
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database.session import Base
import models
import schemas
from utils.security import hash_password
from services import (
    client_service,
    task_service,
    department_service,
    member_service,
    stats_service
)
import drive_service

def run_dry_test():
    print("=" * 80)
    print("🚀 بدء تشغيل الـ DRY RUN SIMULATION (محاكاة الاختبار الشامل في بيئة معزولة)")
    print("=" * 80)

    # 1. Create In-Memory SQLite Engine
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestSession()

    results = []

    def record_step(step_name: str, success: bool, details: str, issue_note: str = None, suggestion: str = None):
        status_icon = "✅ ناجح" if success else "❌ مشكلة/خلل"
        results.append({
            "step": step_name,
            "success": success,
            "status": status_icon,
            "details": details,
            "issue_note": issue_note,
            "suggestion": suggestion
        })
        print(f"\n[{status_icon}] {step_name}")
        print(f"   تفاصيل: {details}")
        if issue_note:
            print(f"   ⚠️ الخلل المكتشف: {issue_note}")
        if suggestion:
            print(f"   💡 الاقتراح: {suggestion}")

    try:
        # -------------------------------------------------------------
        # Step 1: Initializing Departments and Roles
        # -------------------------------------------------------------
        print("\n--- [1] إنشاء الأقسام التجريبية ---")
        dept_content = department_service.create_department(db, schemas.DepartmentCreate(
            name_ar="قسم المحتوى والسوشيال ميديا",
            name_en="Content & Social Media",
            code="CONTENT",
            icon="PenTool",
            color="#ec4899",
            description="إعداد الخطة التسويقية وكتابة المحتوى",
            services=["كتابة محتوى", "خطة سوشيال ميديا"],
            roles=["كاتب محتوى", "أخصائي سوشيال ميديا", "مدير محتوى"]
        ))
        
        dept_design = department_service.create_department(db, schemas.DepartmentCreate(
            name_ar="قسم التصميم والميديا",
            name_en="Design & Media",
            code="DESIGN",
            icon="Palette",
            color="#8b5cf6",
            description="تصميم البوستات والبانرات والهويات",
            services=["تصاميم سوشيال ميديا", "بنرات متجر"],
            roles=["مصمم جرافيك", "مصمم موشن", "مخرج فني"]
        ))
        
        record_step(
            "إنشاء الأقسام والأدوار",
            True,
            f"تم إنشاء قسمين: {dept_content.name_ar} و {dept_design.name_ar} مع الأدوار والخدمات بنجاح."
        )

        # -------------------------------------------------------------
        # Step 2: Create Team Members (Admin, Head, Employee)
        # -------------------------------------------------------------
        print("\n--- [2] إنشاء المستخدمين (Admin, Head, Employee) ---")
        admin_user = member_service.create_member(db, schemas.TeamMemberCreate(
            username="admin_test",
            password="password123",
            name="أحمد المدير",
            role="مدير العمليات",
            email="admin@test.com",
            role_type="admin"
        ))

        head_content = member_service.create_member(db, schemas.TeamMemberCreate(
            username="head_content_test",
            password="password123",
            name="سارة رئيسة المحتوى",
            role="رئيس قسم المحتوى",
            email="head_content@test.com",
            department_id=dept_content.id,
            role_type="head"
        ))

        emp_writer = member_service.create_member(db, schemas.TeamMemberCreate(
            username="emp_writer_test",
            password="password123",
            name="محمود كاتب المحتوى",
            role="كاتب محتوى",
            email="writer@test.com",
            department_id=dept_content.id,
            role_type="employee"
        ))

        record_step(
            "إنشاء المستخدمين وتوزيع الصلاحيات",
            True,
            f"تم إنشاء: أدمن ({admin_user.name})، رئيس قسم ({head_content.name})، موظف ({emp_writer.name})."
        )

        # -------------------------------------------------------------
        # Step 3: Client Intake with Unassigned Stage
        # -------------------------------------------------------------
        print("\n--- [3] تسجيل عميل جديد مع مرحلة غير معينة لموظف (Unassigned) ---")
        unassigned_schema_failed = False
        try:
            # We try passing unassigned task stage where assigned_member_id is None
            stage_dict = {
                "department_id": dept_content.id,
                "assigned_member_id": None,
                "stage_name": "كتابة خطة وإعلانات الشهر الأول",
                "description": "كتابة 15 بوست + 4 إعلانات"
            }
            # Test if TaskStageBase validates None
            schemas.TaskStageBase(**stage_dict)
            client_in = schemas.ClientCreate(
                name="عبدالله التميمي",
                company_name="متجر العطور الفاخرة",
                service_type="باقة إدارة متكاملة",
                platform="زد",
                website_url="https://luxury-perfumes.sa",
                priority="high",
                target_deadline_hours=72,
                assignments=[schemas.TaskStageBase(**stage_dict)]
            )
            client_obj = client_service.create_client_intake(db, client_in)
            record_step(
                "تسجيل عميل بمهمة غير معينة (Unassigned)",
                True,
                f"تم تسجيل العميل بنجاح برقم ID: {client_obj.id}"
            )
        except Exception as ex:
            unassigned_schema_failed = True
            # Fallback for the rest of simulation
            stage_obj_fallback = schemas.TaskStageBase(
                department_id=dept_content.id,
                assigned_member_id=head_content.id, # had to put an int because of schema bug
                stage_name="كتابة خطة وإعلانات الشهر الأول"
            )
            client_in_fallback = schemas.ClientCreate(
                name="عبدالله التميمي",
                company_name="متجر العطور الفاخرة",
                service_type="باقة إدارة متكاملة",
                platform="زد",
                website_url="https://luxury-perfumes.sa",
                priority="high",
                target_deadline_hours=72,
                assignments=[stage_obj_fallback]
            )
            client_obj = client_service.create_client_intake(db, client_in_fallback)
            # Manually set assigned_member_id to None in DB for testing Head workflow
            stage_to_reset = db.query(models.TaskStage).filter(models.TaskStage.client_id == client_obj.id).first()
            stage_to_reset.assigned_member_id = None
            db.commit()
            db.refresh(stage_to_reset)

            record_step(
                "تسجيل عميل بمهمة غير مسندة لموظف (Unassigned)",
                False,
                f"فشل التحقق بسبب تقييد Schema: {ex}",
                issue_note="حقل assigned_member_id في TaskStageBase معرف كـ int إجباري بدلاً من Optional[int]، مما يمنع إنشاء مهام بدون موظف مسبقاً ليوزعها الـ Head.",
                suggestion="تعديل TaskStageBase ليصبح assigned_member_id: Optional[int] = None."
            )

        # -------------------------------------------------------------
        # Step 4: Department Head assigning the task to an Employee
        # -------------------------------------------------------------
        print("\n--- [4] رئيس القسم يسند المهمة لموظف فريقه (Head Assign Workflow) ---")
        stage = db.query(models.TaskStage).filter(models.TaskStage.client_id == client_obj.id).first()
        try:
            updated_stage = task_service.update_task_stage(
                db, 
                client_id=client_obj.id, 
                stage_id=stage.id, 
                stage_in=schemas.TaskStageUpdate(
                    assigned_member_id=emp_writer.id,
                    status="in_progress"
                )
            )
            record_step(
                "إسناد المهمة للموظف من قبل رئيس القسم",
                True,
                f"تم إسناد المهمة '{updated_stage.stage_name}' للموظف '{emp_writer.name}' وأصبحت حالتها {updated_stage.status}."
            )
        except Exception as ex:
            record_step(
                "إسناد المهمة للموظف من قبل رئيس القسم",
                False,
                f"فشل إسناد المهمة: {ex}"
            )

        # -------------------------------------------------------------
        # Step 5: Employee Submitting Deliverable for Review
        # -------------------------------------------------------------
        print("\n--- [5] تسليم الموظف للمهمة وإحالتها للمراجعة (Submit For Review) ---")
        try:
            submitted_stage = task_service.submit_stage_for_review(
                db,
                schemas.StageCompleteRequest(
                    stage_id=stage.id,
                    member_id=emp_writer.id,
                    deliverable_note="تم الانتهاء من كتابة محتوى الـ 15 بوست وخطة الإعلانات",
                    deliverable_url="https://drive.google.com/drive/folders/mock-deliverable"
                )
            )
            record_step(
                "تسليم الموظف للمهمة وإحالتها للمراجعة",
                submitted_stage.status == "under_review",
                f"حالة المهمة الحالية: {submitted_stage.status} - الملاحظة: {submitted_stage.deliverable_note}"
            )
        except Exception as ex:
            record_step(
                "تسليم الموظف للمهمة وإحالتها للمراجعة",
                False,
                f"فشل تسليم المهمة للمراجعة: {ex}"
            )

        # -------------------------------------------------------------
        # Step 6: Head Requesting Revision
        # -------------------------------------------------------------
        print("\n--- [6] رئيس القسم يطلب تعديل على الشغل (Request Revision) ---")
        try:
            revision_stage = task_service.review_task_stage(
                db,
                schemas.TaskReviewRequest(
                    stage_id=stage.id,
                    reviewer_id=head_content.id,
                    action="request_revision",
                    notes="يرجى تعديل العناوين الرئيسية للبوست رقم 3 و 5 وإضافة كول تو أكشن أوضح."
                )
            )
            record_step(
                "طلب تعديل من رئيس القسم (Request Revision)",
                revision_stage.status == "revision_requested",
                f"حالة المهمة أصبحت: {revision_stage.status} - ملاحظات التعديل: {revision_stage.revision_notes}"
            )
        except Exception as ex:
            record_step(
                "طلب تعديل من رئيس القسم",
                False,
                f"فشل طلب التعديل: {ex}"
            )

        # -------------------------------------------------------------
        # Step 7: Employee Resubmitting & Head Approving
        # -------------------------------------------------------------
        print("\n--- [7] إعادة التسليم بعد التعديل ثم الاعتماد النهائي (Approval) ---")
        try:
            task_service.submit_stage_for_review(
                db,
                schemas.StageCompleteRequest(
                    stage_id=stage.id,
                    member_id=emp_writer.id,
                    deliverable_note="تم تعديل العناوين والـ CTA كما هو مطلوب بالضبط.",
                    deliverable_url="https://drive.google.com/drive/folders/mock-deliverable-v2"
                )
            )
            approved_stage = task_service.review_task_stage(
                db,
                schemas.TaskReviewRequest(
                    stage_id=stage.id,
                    reviewer_id=head_content.id,
                    action="approve",
                    notes="شغل ممتاز ومعتمد للنشر."
                )
            )
            db.refresh(client_obj)
            progress_updated = client_obj.progress_percentage == 100 and client_obj.status == "completed"
            record_step(
                "اعتماد المهمة وتحديث نسبة إنجاز العميل",
                progress_updated,
                f"حالة المهمة: {approved_stage.status} | نسبة إنجاز العميل: {client_obj.progress_percentage}% | حالة العميل: {client_obj.status}"
            )
        except Exception as ex:
            record_step(
                "اعتماد المهمة وتحديث تقدم العميل",
                False,
                f"فشل اعتماد المهمة: {ex}"
            )

        # -------------------------------------------------------------
        # Step 8: Test Reopening a Completed Stage (State Machine Lock Bug Check)
        # -------------------------------------------------------------
        print("\n--- [8] اختبار إعادة فتح مهمة مكتملة من قبل الأدمن (Reopen Test) ---")
        reopen_failed = False
        try:
            task_service.update_task_stage(
                db,
                client_id=client_obj.id,
                stage_id=stage.id,
                stage_in=schemas.TaskStageUpdate(status="in_progress")
            )
            record_step(
                "إعادة فتح مهمة مكتملة للتعديل الإداري",
                True,
                "تمكن الأدمن من إعادة فتح المهمة المكتملة بنجاح."
            )
        except Exception as ex:
            reopen_failed = True
            record_step(
                "إعادة فتح مهمة مكتملة للتعديل الإداري",
                False,
                f"فشلت العملية برفض آلة الحالات: {ex}",
                issue_note="حالة 'completed' معرفة كـ Terminal State في TASK_STATUS_TRANSITIONS، مما يمنع الأدمن من التراجع أو إعادة فتح المهمة لو تم إغلاقها بالخطأ.",
                suggestion="إتاحة الانتقال من 'completed' إلى 'in_progress' أو 'revision_requested' لإعطاء مرونة للإدارة."
            )

        # -------------------------------------------------------------
        # Step 9: Updating Stage Directly without recalculating progress
        # -------------------------------------------------------------
        print("\n--- [9] فحص تحديث تقدم العميل عند تعديل المهمة مباشرة ---")
        # Add a 2nd stage
        new_stage = task_service.add_task_stage(
            db,
            client_id=client_obj.id,
            stage_in=schemas.TaskStageCreate(
                department_id=dept_design.id,
                stage_name="تصميم البانرات",
                assigned_member_id=admin_user.id
            )
        )
        db.refresh(client_obj)
        initial_progress = client_obj.progress_percentage

        # Directly complete both stages via update_task_stage
        try:
            task_service.update_task_stage(
                db,
                client_id=client_obj.id,
                stage_id=stage.id,
                stage_in=schemas.TaskStageUpdate(status="completed")
            )
            task_service.update_task_stage(
                db,
                client_id=client_obj.id,
                stage_id=new_stage.id,
                stage_in=schemas.TaskStageUpdate(status="completed")
            )
            db.refresh(client_obj)
            # Expecting progress to be 100% since both stages are completed
            progress_synced = client_obj.progress_percentage == 100
            if not progress_synced:
                record_step(
                    "مزامنة نسبة إنجاز العميل عند تعديل حالة المهمة مباشرة",
                    False,
                    f"نسبة إنجاز العميل ظلت {client_obj.progress_percentage}% رغم اكتمال كافة المهام!",
                    issue_note="دالة update_task_stage لم تحدث نسبة إنجاز العميل.",
                    suggestion="إضافة استدعاء _recalculate_client_progress(db, client_id) داخل update_task_stage."
                )
            else:
                record_step(
                    "مزامنة نسبة إنجاز العميل عند تعديل حالة المهمة مباشرة",
                    True,
                    f"تم تحديث وإعادة احتساب نسبة الإنجاز بنجاح إلى {client_obj.progress_percentage}% وحالة العميل إلى {client_obj.status}."
                )
        except Exception as ex:
            record_step(
                "مزامنة نسبة إنجاز العميل عند تعديل حالة المهمة مباشرة",
                False,
                f"حدث خطأ أثناء تعديل المهمة: {ex}"
            )

        # -------------------------------------------------------------
        # Step 10: Client Brief Sheet 11 Columns Verification
        # -------------------------------------------------------------
        print("\n--- [10] فحص وتحديث شيت بيانات واستراتيجية العميل (الـ 11 خانة) ---")
        try:
            brief_sheet = client_service.get_client_brief_sheet(db, client_obj.id)
            fields_count = len(brief_sheet.get("fields", []))
            
            # Update values
            client_service.update_client_brief_sheet(db, client_obj.id, {
                "platform_theme": "منصة زد - ثيم سيلفي متجاوب",
                "selling_advantages": "شحن مجاني، تقسيط تابي وتمارا، ضمان أصالة 100%"
            })
            updated_sheet = client_service.get_client_brief_sheet(db, client_obj.id)
            platform_val = next((f["value"] for f in updated_sheet["fields"] if f["key"] == "platform_theme"), "")
            
            record_step(
                "شيت استراتيجية العميل المعتمد (11 خانة)",
                fields_count == 11 and "زد" in platform_val,
                f"عدد الخانات: {fields_count} خانة معتمدة - تم التحديث والقراءة بنجاح."
            )
        except Exception as ex:
            record_step(
                "شيت استراتيجية العميل المعتمد (11 خانة)",
                False,
                f"فشل قراءة أو تحديث شيت الاستراتيجية: {ex}"
            )

        # -------------------------------------------------------------
        # Step 11: Member Department Association Sync
        # -------------------------------------------------------------
        print("\n--- [11] فحص ربط الموظف بأكثر من قسم وتحديد القسم الأساسي ---")
        try:
            updated_emp = member_service.update_member(
                db,
                member_id=emp_writer.id,
                member_in=schemas.TeamMemberUpdate(
                    department_ids=[dept_design.id, dept_content.id],
                    department_id=dept_design.id
                )
            )
            # Check if primary dept is indeed dept_design.id
            primary_correct = updated_emp.department_id == dept_design.id
            record_step(
                "تحديث أقسام الموظف والقسم الأساسي",
                primary_correct,
                f"القسم الأساسي الحالي: {updated_emp.department_id} (المتوقع: {dept_design.id}) - عدد الأقسام المرتبطة: {len(updated_emp.departments)}"
            )
        except Exception as ex:
            record_step(
                "تحديث أقسام الموظف والقسم الأساسي",
                False,
                f"فشل تحديث بيانات الموظف: {ex}"
            )

        # -------------------------------------------------------------
        # Step 12: System KPIs and Workload Computation
        # -------------------------------------------------------------
        print("\n--- [12] فحص حساب الـ KPIs ومؤشرات أداء الأقسام ---")
        try:
            kpis = stats_service.get_system_kpis(db)
            record_step(
                "حساب الـ KPIs ومؤشرات أداء الأقسام",
                kpis.total_clients >= 1,
                f"إجمالي العملاء: {kpis.total_clients} | العملاء المكتملين: {kpis.completed_clients} | نسبة الالتزام بالساعة: {kpis.on_time_sla_rate}% | أقسام محسوبة: {len(kpis.department_workloads)}"
            )
        except Exception as ex:
            record_step(
                "حساب الـ KPIs ومؤشرات أداء الأقسام",
                False,
                f"فشل حساب الـ KPIs: {ex}"
            )

    finally:
        db.close()

    # -------------------------------------------------------------
    # Final Summary Report
    # -------------------------------------------------------------
    print("\n" + "=" * 80)
    print("📊 تقرير نتائج الـ DRY RUN SIMULATION:")
    print("=" * 80)
    total_steps = len(results)
    passed_steps = sum(1 for r in results if r["success"])
    failed_steps = total_steps - passed_steps

    print(f"إجمالي الاختبارات: {total_steps} | الناجحة: {passed_steps} | الملاحظات/الخلل: {failed_steps}\n")

    for idx, r in enumerate(results, 1):
        print(f"{idx}. [{r['status']}] {r['step']}")
        if r.get("issue_note"):
            print(f"   ⚠️ المشكلة: {r['issue_note']}")
            print(f"   💡 الحل: {r['suggestion']}")

    return results

if __name__ == "__main__":
    run_dry_test()
