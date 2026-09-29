import uuid
import json
import re
from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import models
import schemas
import drive_service
from services import task_service

def extract_brand_from_url(url: str) -> str:
    """
    Extracts brand identifier from a website URL.
    Examples:
    www.saleh.com -> saleh
    https://saleh.com/store -> saleh
    http://www.saleh.sa -> saleh
    https://store.al-anaqa.com -> al-anaqa
    """
    if not url:
        return ""
    clean = url.strip().lower()
    clean = re.sub(r"^https?://", "", clean)
    clean = clean.split("/")[0].split("?")[0].split("#")[0].split(":")[0]
    clean = re.sub(r"^www\.", "", clean)
    parts = [p for p in clean.split(".") if p]
    if not parts:
        return ""
    if len(parts) == 1:
        return re.sub(r"[^a-z0-9_-]", "", parts[0])
    common_tlds = {"com", "org", "net", "edu", "gov", "co", "me", "io", "ai", "store", "shop", "online", "app", "site", "dev", "sa", "ae", "eg", "uk", "us"}
    while len(parts) > 1 and parts[-1] in common_tlds:
        parts.pop()
    brand = parts[-1] if parts else clean
    return re.sub(r"[^a-z0-9_-]", "", brand)

def generate_agency_email(url: str) -> str:
    """
    Generates agency email alias for a website URL:
    e.g. www.saleh.com -> info+saleh@malamsa.com
    """
    brand = extract_brand_from_url(url)
    return f"info+{brand}@malamsa.com" if brand else ""

def get_all_clients(db: Session) -> List[models.Client]:
    return db.query(models.Client).order_by(models.Client.intake_timestamp.desc()).all()

def get_client_by_id(db: Session, client_id: int) -> models.Client:
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="العميل غير موجود")
    return client

def create_client_intake(db: Session, client_in: schemas.ClientCreate, current_user: Optional[models.TeamMember] = None) -> models.Client:
    now = datetime.now()
    deadline = client_in.target_deadline or (now + timedelta(hours=client_in.target_deadline_hours))

    phone = client_in.phone.strip() if client_in.phone else None
    platform = client_in.platform.strip() if client_in.platform else None
    website_url = client_in.website_url.strip() if client_in.website_url else None
    agency_email = client_in.agency_email.strip() if client_in.agency_email else None

    if not agency_email and (platform == "زد" or (platform is None and website_url)):
        brand_source = website_url or client_in.company_name
        agency_email = generate_agency_email(brand_source)

    # 1. Google Drive Folder Provisioning (Main folder + 2 subfolders + Client Sheet)
    sheet_url = None
    if client_in.drive_folder_url and client_in.drive_folder_url.strip().startswith("http"):
        drive_url = client_in.drive_folder_url.strip()
        drive_id = f"custom-drive-{uuid.uuid4().hex[:8]}"
        sheet_url = client_in.sheet_url or f"{drive_url}/sheet"
    else:
        folder_data = drive_service.create_client_folder(
            company_name=client_in.company_name,
            share_email=client_in.share_email,
            share_role=client_in.share_role or "reader"
        )
        drive_url = folder_data.get("url", "#")
        drive_id = folder_data.get("id", "")
        sheet_url = folder_data.get("sheet_url")

        # Process individual subfolder shares
        if client_in.folder_shares:
            for share in client_in.folder_shares:
                if not share.email or not share.email.strip():
                    continue
                target_fid = None
                if share.folder_type == "client_uploads":
                    target_fid = folder_data.get("subfolder_client_id")
                elif share.folder_type == "team_deliverables":
                    target_fid = folder_data.get("subfolder_team_id")

                if target_fid:
                    try:
                        drive_service.share_folder(target_fid, share.email.strip(), role=share.role)
                    except Exception as ex:
                        print(f"Subfolder share error for {share.email} on {share.folder_type}: {ex}")

    # Initializing standardized 11-column brief sheet
    initial_brief = {
        "logo_brand_file": "",
        "website_url": website_url or "",
        "platform_theme": platform or "",
        "products_file": "",
        "categories_silo": "",
        "offers_discounts": "",
        "selling_advantages": "",
        "competitors_links": "",
        "best_sellers": "",
        "featured_product": "",
        "design_style": ""
    }
    if client_in.brief_sheet:
        try:
            parsed = json.loads(client_in.brief_sheet) if isinstance(client_in.brief_sheet, str) else client_in.brief_sheet
            if isinstance(parsed, dict):
                initial_brief.update(parsed)
        except Exception:
            pass

    intake_time = client_in.created_at or now
    status_val = client_in.status.strip() if client_in.status else "intake"

    client = models.Client(
        name=client_in.name.strip(),
        company_name=client_in.company_name.strip(),
        service_type=client_in.service_type.strip() if client_in.service_type else "خدمة عامة",
        request_details=client_in.request_details.strip() if client_in.request_details else None,
        priority=client_in.priority,
        status=status_val,
        ticket_number=client_in.ticket_number.strip() if client_in.ticket_number else None,
        store_id=client_in.store_id.strip() if client_in.store_id else None,
        package_name=client_in.package_name.strip() if client_in.package_name else None,
        drive_folder_url=drive_url,
        drive_folder_id=drive_id,
        website_url=website_url,
        agency_email=agency_email,
        phone=phone,
        platform=platform,
        sheet_url=sheet_url,
        brief_sheet=json.dumps(initial_brief, ensure_ascii=False),
        intake_timestamp=intake_time,
        target_deadline=deadline,
        progress_percentage=0
    )
    try:
        db.add(client)
        db.flush()

        sub1_url = folder_data.get("subfolder_client_url") if 'folder_data' in locals() else None
        sub2_url = folder_data.get("subfolder_team_url") if 'folder_data' in locals() else None
        sheet_url_val = folder_data.get("sheet_url") if 'folder_data' in locals() else sheet_url

        # 1.5 Auto-create standard drive items (2 subfolders + 1 strategy sheet inside subfolder 1)
        sub1 = models.DriveFolderItem(
            client_id=client.id,
            name="01 - مرفقات ومواد العميل (Client Uploads)",
            path="/01 - مرفقات ومواد العميل (Client Uploads)",
            is_folder=True,
            file_type="folder",
            drive_url=sub1_url,
            created_at=now
        )
        sub2 = models.DriveFolderItem(
            client_id=client.id,
            name="02 - مخرجات وشغل الفريق (Team Deliverables)",
            path="/02 - مخرجات وشغل الفريق (Team Deliverables)",
            is_folder=True,
            file_type="folder",
            drive_url=sub2_url,
            created_at=now
        )
        sheet_item = models.DriveFolderItem(
            client_id=client.id,
            name=f"📊 شيت بيانات واستراتيجية العميل - {client.company_name}",
            path=f"/01 - مرفقات ومواد العميل (Client Uploads)/📊 شيت بيانات واستراتيجية العميل - {client.company_name}",
            is_folder=False,
            file_type="spreadsheet",
            file_size="24 KB",
            drive_url=sheet_url_val,
            created_at=now
        )
        db.add(sub1)
        db.add(sub2)
        db.add(sheet_item)

        # 2. Dispatch Task Stages per Department & Member (Concurrent by default)
        for idx, stage_in in enumerate(client_in.assignments):
            assigned_by = stage_in.assigned_by_id or (current_user.id if current_user else None)
            stage_desc = stage_in.description.strip() if stage_in.description else (client_in.request_details.strip() if client_in.request_details else None)
            stage = models.TaskStage(
                client_id=client.id,
                department_id=stage_in.department_id,
                assigned_member_id=stage_in.assigned_member_id,
                assigned_by_id=assigned_by,
                stage_name=stage_in.stage_name.strip(),
                description=stage_desc,
                status="in_progress",
                order_index=idx
            )
            db.add(stage)

        if client_in.assignments:
            client.status = "in_progress"

        # Sync Drive permissions for assigned members and relevant Department Heads
        assigned_mids = {s.assigned_member_id for s in client_in.assignments if s.assigned_member_id}
        for mem_id in assigned_mids:
            try:
                task_service._sync_member_drive_access(db, client, mem_id, action="grant")
            except Exception as se:
                print(f"Auto-sync drive access notice for member {mem_id}: {se}")

        # Also guarantee Drive access to the Heads of involved departments
        involved_dept_ids = {s.department_id for s in client_in.assignments if s.department_id}
        if involved_dept_ids:
            heads = db.query(models.TeamMember).filter(
                models.TeamMember.role_type == "head",
                models.TeamMember.is_active == True
            ).all()
            for head in heads:
                head_depts = [head.department_id] if head.department_id else []
                if head.departments:
                    head_depts.extend([d.id for d in head.departments if d.id not in head_depts])
                if any(d_id in involved_dept_ids for d_id in head_depts):
                    try:
                        task_service._sync_member_drive_access(db, client, head.id, action="grant")
                    except Exception as he:
                        print(f"Auto-sync drive access notice for head {head.name}: {he}")

        # 3. Create Audit Log Entry
        audit = models.AuditLog(
            client_id=client.id,
            action="CLIENT_INTAKE_AUTO_PROVISIONED",
            performed_by="System Auto-Provisioner",
            timestamp=now,
            details=f"تم تسجيل العميل تلقائياً وإنشاء مجلد Google Drive برقم {drive_id} وتم توزيع {len(client_in.assignments)} مهام على الأقسام المعنية."
        )
        db.add(audit)

        db.commit()
        db.refresh(client)
        return client
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"فشل حفظ بيانات العميل: {str(e)}"
        )

def update_client(db: Session, client_id: int, client_in: schemas.ClientUpdate) -> models.Client:
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="العميل غير موجود")

    update_data = client_in.model_dump(exclude_unset=True)

    if "target_deadline_hours" in update_data and update_data["target_deadline_hours"] is not None:
        client.target_deadline = datetime.now() + timedelta(hours=update_data.pop("target_deadline_hours"))

    if "brief_sheet" in update_data and update_data["brief_sheet"] is not None:
        if isinstance(update_data["brief_sheet"], dict):
            update_data["brief_sheet"] = json.dumps(update_data["brief_sheet"], ensure_ascii=False)

    if "website_url" in update_data and update_data["website_url"]:
        if "agency_email" not in update_data or not update_data["agency_email"]:
            update_data["agency_email"] = generate_agency_email(update_data["website_url"])

    for key, value in update_data.items():
        setattr(client, key, value)

    audit = models.AuditLog(
        client_id=client.id,
        action="CLIENT_UPDATED",
        performed_by="Admin",
        timestamp=datetime.now(),
        details="تم تحديث بيانات العميل بنجاح."
    )
    db.add(audit)

    db.commit()
    db.refresh(client)
    return client

def get_clients_hierarchy(db: Session, search: Optional[str] = None) -> List[schemas.ClientGroupHierarchy]:
    query = db.query(models.Client).order_by(models.Client.intake_timestamp.desc())
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (models.Client.name.ilike(term)) | (models.Client.company_name.ilike(term)) | (models.Client.ticket_number.ilike(term)) | (models.Client.store_id.ilike(term))
        )

    clients = query.all()

    # Group by client name
    grouped: dict = {}
    for c in clients:
        key = c.name.strip()
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(c)

    result = []
    for client_name, companies in grouped.items():
        total_comps = len(companies)
        total_tasks = 0
        completed_tasks = 0
        for comp in companies:
            stages = comp.stages or []
            total_tasks += len(stages)
            completed_tasks += sum(1 for s in stages if s.status == "completed")

        active_tasks = total_tasks - completed_tasks
        overall_progress = int((completed_tasks / total_tasks * 100)) if total_tasks > 0 else 0

        result.append(schemas.ClientGroupHierarchy(
            client_name=client_name,
            total_companies=total_comps,
            total_tasks=total_tasks,
            active_tasks=active_tasks,
            completed_tasks=completed_tasks,
            overall_progress=overall_progress,
            companies=companies
        ))

    return result

def get_client_drive_items(db: Session, client_id: int) -> List[models.DriveFolderItem]:
    return db.query(models.DriveFolderItem).filter(models.DriveFolderItem.client_id == client_id).all()

def _resolve_folder_id(client: models.Client, folder_id: Optional[str] = None, folder_type: Optional[str] = "root") -> str:
    import re
    if folder_id and folder_id.strip():
        fid = folder_id.strip()
        if fid.startswith("http"):
            m = re.search(r'folders/([a-zA-Z0-9_-]+)', fid)
            if m:
                return m.group(1)
            m2 = re.search(r'[?&]id=([a-zA-Z0-9_-]+)', fid)
            if m2:
                return m2.group(1)
        return fid

    if folder_type == "client_uploads":
        for item in client.drive_items:
            if "01" in item.name and item.drive_url:
                m = re.search(r'folders/([a-zA-Z0-9_-]+)', item.drive_url)
                if m:
                    return m.group(1)
    elif folder_type == "team_deliverables":
        for item in client.drive_items:
            if "02" in item.name and item.drive_url:
                m = re.search(r'folders/([a-zA-Z0-9_-]+)', item.drive_url)
                if m:
                    return m.group(1)

    return client.drive_folder_id or ""

def share_client_drive(db: Session, client_id: int, req: schemas.ShareDriveRequest):
    client = get_client_by_id(db, client_id)
    target_folder_id = _resolve_folder_id(client, req.folder_id, req.folder_type)
    if not target_folder_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="لا يوجد مجلد Google Drive مرتبط بهذا العميل")

    result = drive_service.share_folder(
        folder_id=target_folder_id,
        email=req.email,
        role=req.role
    )
    if not result.get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result.get("message", "فشلت عملية المشاركة"))

    folder_label = "المجلد 01 (مرفقات العميل)" if req.folder_type == "client_uploads" else ("المجلد 02 (مخرجات الفريق)" if req.folder_type == "team_deliverables" else "المجلد الرئيسي")
    audit = models.AuditLog(
        client_id=client.id,
        action="DRIVE_SHARED",
        performed_by="Admin",
        timestamp=datetime.now(),
        details=f"تمت مشاركة {folder_label} مع {req.email} بصلاحية {req.role}"
    )
    db.add(audit)
    db.commit()
    return result

def get_client_drive_permissions(db: Session, client_id: int, folder_id: Optional[str] = None):
    client = get_client_by_id(db, client_id)
    target_folder_id = _resolve_folder_id(client, folder_id, "root")
    if not target_folder_id:
        return []
    return drive_service.list_folder_permissions(target_folder_id)

def update_client_drive_permission(db: Session, client_id: int, permission_id: str, req: schemas.UpdateDrivePermissionRequest):
    client = get_client_by_id(db, client_id)
    folder_type = getattr(req, "folder_type", None) or "root"
    target_folder_id = _resolve_folder_id(client, req.folder_id, folder_type)
    if not target_folder_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="لا يوجد مجلد Google Drive مرتبط بهذا العميل")

    result = drive_service.update_folder_permission(
        folder_id=target_folder_id,
        permission_id=permission_id,
        new_role=req.role
    )
    if not result.get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result.get("message", "فشل تعديل الصلاحية"))

    audit = models.AuditLog(
        client_id=client.id,
        action="DRIVE_PERMISSION_UPDATED",
        performed_by="Admin",
        timestamp=datetime.now(),
        details=f"تم تعديل صلاحية Google Drive ({permission_id}) إلى {req.role}"
    )
    db.add(audit)
    db.commit()
    return result

def delete_client_drive_permission(db: Session, client_id: int, permission_id: str, folder_id: Optional[str] = None):
    client = get_client_by_id(db, client_id)
    target_folder_id = _resolve_folder_id(client, folder_id, "root")
    if not target_folder_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="لا يوجد مجلد Google Drive مرتبط بهذا العميل")

    result = drive_service.remove_folder_permission(
        folder_id=target_folder_id,
        permission_id=permission_id
    )
    if not result.get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result.get("message", "فشل حذف الصلاحية"))

    audit = models.AuditLog(
        client_id=client.id,
        action="DRIVE_PERMISSION_REMOVED",
        performed_by="Admin",
        timestamp=datetime.now(),
        details=f"تم إلغاء صلاحية الوصول إلى مجلد Google Drive ({permission_id})"
    )
    db.add(audit)
    db.commit()
    return result

def get_client_brief_sheet(db: Session, client_id: int) -> dict:
    client = get_client_by_id(db, client_id)
    raw_data = {}
    if client.brief_sheet:
        try:
            raw_data = json.loads(client.brief_sheet)
        except Exception:
            raw_data = {}

    # Standardized 11 Columns requested by the user
    fields = [
        {
            "id": 1,
            "key": "logo_brand_file",
            "title": "١ـ فايل الهوية البصرية (اللوجو png بكوالتي عالي)",
            "description": "رابط مجلد أو ملف الشعار الرسمي بدقة عالية وخلفية شفافة PNG",
            "value": raw_data.get("logo_brand_file", "")
        },
        {
            "id": 2,
            "key": "website_url",
            "title": "٢ـ لينك الموقع أو المتجر",
            "description": "رابط النطاق المباشر للمتجر الإلكتروني أو الموقع التعريفي",
            "value": raw_data.get("website_url", "")
        },
        {
            "id": 3,
            "key": "platform_theme",
            "title": "٣ـ المنصة والثيم",
            "description": "نوع المنصة (سلة، زد، شوبيفاي، ووردبريس...) واسم القالب/الثيم المفعل",
            "value": raw_data.get("platform_theme", "")
        },
        {
            "id": 4,
            "key": "products_file",
            "title": "٤ـ فايل المنتجات بكوالتي عالي مصنفة حسب كل قسم",
            "description": "ملف أو رابط مجلد صور المنتجات بدقة تصوير عالية مقسمة حسب الأقسام",
            "value": raw_data.get("products_file", "")
        },
        {
            "id": 5,
            "key": "categories_silo",
            "title": "٥ـ التصنيفات أو الأقسام (السايلو)",
            "description": "هيكلة الأقسام الرئيسية والفرعية للمتجر والترتيب الهرمي للتصنيفات",
            "value": raw_data.get("categories_silo", "")
        },
        {
            "id": 6,
            "key": "offers_discounts",
            "title": "٦ـ العروض والتخفيضات",
            "description": "العروض الترويجية الحالية، كود الخصم، باقات التوفير، أو الحملات الموسمية",
            "value": raw_data.get("offers_discounts", "")
        },
        {
            "id": 7,
            "key": "selling_advantages",
            "title": "٧ـ ميز البيع التنافسية (USPs)",
            "description": "شحن مجاني، استبدال واسترجاع، خدمة عملاء 24/7، أسعار تنافسية، تقسيط تابي/تمارا... الخ",
            "value": raw_data.get("selling_advantages", "")
        },
        {
            "id": 8,
            "key": "competitors_links",
            "title": "٨- لينكات المنافسين إن وُجد",
            "description": "روابط المتاجر والمنافسين المباشرين في السوق للدراسة والتحليل المقارن",
            "value": raw_data.get("competitors_links", "")
        },
        {
            "id": 9,
            "key": "best_sellers",
            "title": "٩- المنتجات الأكثر مبيعاً",
            "description": "أهم 3 إلى 5 منتجات مبيعاً وطلباً لتركيز الحملات والتصاميم عليها",
            "value": raw_data.get("best_sellers", "")
        },
        {
            "id": 10,
            "key": "featured_product",
            "title": "١٠- منتج معين حابب نستخدمه في التصاميم أو نبرزه أكثر",
            "description": "المنتج البطل (Hero Product) المراد تسليط الضوء عليه في البانرات والإعلانات",
            "value": raw_data.get("featured_product", "")
        },
        {
            "id": 11,
            "key": "design_style",
            "title": "١١- لو في استايل معين حابب نصمم زيه؟",
            "description": "التوجه الفني المفضل، لوحة الألوان المفضلة، أو روابط نماذج ملهمة (References)",
            "value": raw_data.get("design_style", "")
        }
    ]
    return {
        "client_id": client.id,
        "company_name": client.company_name,
        "sheet_url": client.sheet_url or f"{client.drive_folder_url}/sheet",
        "fields": fields,
        "raw_data": raw_data
    }

def update_client_brief_sheet(db: Session, client_id: int, payload: dict) -> dict:
    client = get_client_by_id(db, client_id)
    current_data = {}
    if client.brief_sheet:
        try:
            current_data = json.loads(client.brief_sheet)
        except Exception:
            current_data = {}

    current_data.update(payload)
    client.brief_sheet = json.dumps(current_data, ensure_ascii=False)

    audit = models.AuditLog(
        client_id=client.id,
        action="CLIENT_BRIEF_SHEET_UPDATED",
        performed_by="User",
        timestamp=datetime.now(),
        details="تم تحديث بيانات شيت استراتيجية العميل (الـ 11 خانة المعتمدة)."
    )
    db.add(audit)
    db.commit()
    db.refresh(client)
    return get_client_brief_sheet(db, client_id)

def delete_client(db: Session, client_id: int) -> bool:
    client = get_client_by_id(db, client_id)
    db.delete(client)
    db.commit()
    return True

