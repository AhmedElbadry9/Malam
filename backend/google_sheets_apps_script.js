/**
 * Google Apps Script Web App للإنشاء التلقائي لجوجل شيت العميل
 * هذا السكريبت يُنشئ ملف Google Sheet مباشرة بداخل مجلد العميل الفرعي (01 - مرفقات ومواد العميل)
 * ويملأ الصف الأول بالأعمدة الـ 11 المعتمدة مع تنسيق اليمين لليسار (RTL) وتجميد الهيدر.
 * 
 * خطوات التفعيل (تُنفذ مرة واحدة فقط في حسابك):
 * 1. افتح https://script.google.com واضغط على "مشروع جديد" (New project).
 * 2. انسخ هذا الكود بالكامل والصقه هناك.
 * 3. اضغط زر "نشر" (Deploy) أعلى اليمين -> "نشر جديد" (New deployment).
 * 4. اختر نوع النشر: "تطبيق ويب" (Web app).
 * 5. في خيار "تنفيذ كـ" (Execute as): اختر "أنا" (Me).
 * 6. في خيار "من لديه حق الوصول" (Who has access): اختر "أي شخص" (Anyone).
 * 7. اضغط "نشر" (Deploy) وامنح الصلاحية لحسابك، ثم انسخ رابط الويب (Web App URL).
 * 8. ضع الرابط في ملف backend/.env كالتالي:
 *    GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var folderId = data.folder_id;
    var sheetName = data.sheet_name || ("📊 شيت بيانات واستراتيجية العميل - " + (data.company_name || ""));
    var headers = data.headers || [
      "١ـ فايل الهوية البصريه اللوجو png بكوالتي عالي",
      "٢ـ لينك الموقع",
      "٣ـ المنصه والثيم",
      "٤ـ فايل للمنتجات بكوالتي عالي مصنفه حسب كل قسم",
      "٥ـ التصنيفات او الاقسام (السايلو)",
      "٦ـ العروض والتخفيضات",
      "٧ـ ميز البيع ( شحن مجاني - استبدال او استرجاع - خدمة عملاء ـ اسعار تنافسيه -تقسيط تابي او تمارا ... الخ )",
      "٨- لينكات المنافسين ان وجد",
      "٩- المنتجات الاكثر مبيعا",
      "١٠- لو في منتج معين حابب نستخدمه في التصاميم او حابب نبرزه اكتر وضحلي دا برضو",
      "١١-لو في استايل معين حابب نصمم زيه؟"
    ];

    // 1. إنشاء جدول البيانات الجديد
    var ss = SpreadsheetApp.create(sheetName);
    var sheet = ss.getActiveSheet();
    sheet.setName("بيانات واستراتيجية العميل");
    sheet.setRightToLeft(true); // تنسيق عربي من اليمين لليسار

    // 2. كتابة الأعمدة الـ 11 في الصف الأول
    sheet.appendRow(headers);

    // 3. تنسيق الصف الأول (لون تيل/زمردي داكن، خط عريض أبيض، توسيط)
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#0F766E"); // Dark Teal
    headerRange.setFontColor("#FFFFFF");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    headerRange.setWrap(true);
    sheet.setRowHeight(1, 45);
    sheet.setFrozenRows(1);

    // 4. ضبط عرض الأعمدة للقراءة المريحة
    for (var i = 1; i <= headers.length; i++) {
      sheet.setColumnWidth(i, 230);
    }

    // 5. نقل الملف بداخل مجلد العميل الفرعي
    if (folderId) {
      var file = DriveApp.getFileById(ss.getId());
      var targetFolder = DriveApp.getFolderById(folderId);
      targetFolder.addFile(file);
      DriveApp.getRootFolder().removeFile(file);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      id: ss.getId(),
      url: ss.getUrl()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    message: "Google Sheets Auto-Provisioner Webhook is active!"
  })).setMimeType(ContentService.MimeType.JSON);
}
