import React, { useState } from 'react';
import { 
  FolderPlus, Pencil, Trash2, Save, X, Palette, Hash, 
  Globe, Type, FileText, Layers, AlertTriangle, CheckCircle2,
  Briefcase, Camera, Code, Megaphone, PenTool, Video, Music,
  Smartphone, Monitor, Headphones, Zap, Target, TrendingUp,
  Users, Database, Shield, Building2, CheckSquare, Sparkles, Check
} from 'lucide-react';
import type { Department } from '../types';

interface DepartmentManagementProps {
  departments: Department[];
  onCreateDepartment: (data: {
    name_ar: string;
    name_en?: string;
    code?: string;
    icon?: string;
    color?: string;
    description?: string;
    roles?: string[];
    services?: string[];
  }) => Promise<void>;
  onUpdateDepartment: (departmentId: number, data: {
    name_ar?: string;
    name_en?: string;
    code?: string;
    icon?: string;
    color?: string;
    description?: string;
    roles?: string[];
    services?: string[];
  }) => Promise<void>;
  onDeleteDepartment: (departmentId: number) => Promise<void>;
}

export const renderDepartmentIcon = (iconName?: string, nameAr?: string, className = "w-5 h-5") => {
  const ic = (iconName || '').toLowerCase();
  const n = (nameAr || '').toLowerCase();
  
  if (ic === 'camera' || n.includes('تصوير') || n.includes('مرئي') || n.includes('فيديو')) return <Camera className={className} />;
  if (ic === 'palette' || n.includes('تصميم') || n.includes('هوية') || n.includes('جرافيك')) return <Palette className={className} />;
  if (ic === 'code' || n.includes('برمج') || n.includes('متاجر') || n.includes('مواقع')) return <Code className={className} />;
  if (ic === 'megaphone' || n.includes('سوشيال') || n.includes('محتوى')) return <Megaphone className={className} />;
  if (ic === 'trendingup' || ic === 'trend' || n.includes('إعلان') || n.includes('ممولة') || n.includes('performance')) return <TrendingUp className={className} />;
  if (ic === 'target' || n.includes('استراتيج') || n.includes('استشار')) return <Target className={className} />;
  if (ic === 'briefcase' || n.includes('عملاء') || n.includes('عمليات')) return <Briefcase className={className} />;
  if (ic === 'pentool') return <PenTool className={className} />;
  if (ic === 'video') return <Video className={className} />;
  if (ic === 'music') return <Music className={className} />;
  if (ic === 'monitor') return <Monitor className={className} />;
  if (ic === 'smartphone') return <Smartphone className={className} />;
  if (ic === 'headphones') return <Headphones className={className} />;
  if (ic === 'zap') return <Zap className={className} />;
  if (ic === 'users') return <Users className={className} />;
  if (ic === 'database') return <Database className={className} />;
  if (ic === 'shield') return <Shield className={className} />;
  if (ic === 'globe') return <Globe className={className} />;
  return <Building2 className={className} />;
};

const ICON_OPTIONS = [
  'Briefcase', 'Palette', 'Camera', 'Code', 'Megaphone', 
  'PenTool', 'Video', 'Music', 'Globe', 'Smartphone',
  'Monitor', 'Headphones', 'Zap', 'Target', 'TrendingUp',
  'Users', 'FileText', 'Layers', 'Database', 'Shield'
];

const COLOR_PRESETS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#a855f7', '#f43f5e', '#10b981', '#0ea5e9', '#f59e0b',
  '#84cc16'
];

export const OFFICIAL_DEPARTMENT_ROLES: Record<string, string[]> = {
  "SOCIAL_CONTENT": [
    "كاتب محتوى إعلاني وتسويقي (Copywriter)",
    "كاتب محتوى سوشيال ميديا (Social Media Content Creator)",
    "مصحح لغوي ومراجع جودة (Proofreader & QA)",
    "مدير حسابات سوشيال ميديا (Account Manager)",
    "مصمم جرافيك سوشيال ميديا",
    "مسؤول جدولة ونشر"
  ],
  "PRODUCTION": [
    "مصور فيديو / مخرج (Videographer / Director)",
    "كاتب سيناريو (Scriptwriter)",
    "مونتير فيديو (Video Editor)",
    "مشغل درون معتمد (Drone Operator)",
    "فنان تعليق صوتي (Voice Over)",
    "مصور فوتوغرافي إعلاني"
  ],
  "BRANDING": [
    "مصمم هوية بصرية (Brand Designer)",
    "مصمم واجهات وتجربة مستخدم (UI/UX)",
    "مصمم جرافيك ومطبوعات"
  ],
  "DEV_ECOMMERCE": [
    "مختص متاجر إلكترونية (سلة / زد)",
    "مطور واجهات (Front-end)",
    "مختص SEO تقني",
    "مسؤول إدارة متجر"
  ],
  "PERFORMANCE_ADS": [
    "مختص إعلانات منصات التواصل (Meta / TikTok / Snapchat)",
    "مختص إعلانات جوجل (Google Ads)",
    "مختص إعلانات لينكدإن (LinkedIn / B2B)",
    "مختص تحليل بيانات إعلانية"
  ],
  "STRATEGY": [
    "استشاري تسويقي أول",
    "محلل منافسين وبحوث سوق"
  ],
  "OPERATIONS": [
    "مدير حساب مخصص (Account Manager)",
    "منسق عمليات داخلي"
  ]
};

export const OFFICIAL_DEPARTMENT_TASKS: Record<string, string[]> = {
  "SOCIAL_CONTENT": [
    "نصوص الإعلانات الممولة وصفحات الهبوط (24-48 ساعة)",
    "إعداد وتطوير خطة المحتوى الشهرية والريلز",
    "مراجعة وتدقيق الجودة اللغوية للنصوص",
    "إدارة النشر والتفاعل اليومي على الحسابات"
  ],
  "PRODUCTION": [
    "تصوير ميداني وجلسات تصوير منتجات 4K",
    "كتابة السيناريو وبناء لوحة القصة (Storyboard)",
    "مونتاج وقص وتعديل ألوان ومؤثرات الفيديو (3-5 أيام)",
    "تصوير جوي بالدرون للمواقع والفعاليات",
    "تسجيل تعليق صوتي إعلاني احترافي (1-2 يوم)"
  ],
  "BRANDING": [
    "تصميم الشعار وبناء الهوية البصرية ودليل الاستخدام",
    "تصميم واجهات المتاجر والتطبيقات وتجربة المستخدم (UI/UX)",
    "تصميم المطبوعات والبوسترات التسويقية"
  ],
  "DEV_ECOMMERCE": [
    "تأسيس المتجر وربط بوابات الدفع والشحن (3-5 أيام)",
    "برمجة وتطوير واجهات مواقع وصفحات هبوط مخصصة (Front-end)",
    "تهيئة محركات البحث وتحسين سرعة المتجر (SEO)",
    "رفع وتنسيق المنتجات وإدارة المخزون والطلبات"
  ],
  "PERFORMANCE_ADS": [
    "إعداد وإطلاق حملات التواصل ومتابعة التحويلات (B2C)",
    "إدارة حملات البحث وشراء جوجل (Google Search & Shopping)",
    "حملات B2B واستقطاب الشركات عبر لينكدإن",
    "تحليل نتائج الحملات وإعداد تقارير ROAS و CAC"
  ],
  "STRATEGY": [
    "بناء الخطة الاستراتيجية التسويقية الشاملة للنمو (5-7 أيام)",
    "إعداد دراسة السوق وتحليل المنافسين والفجوات (3-5 أيام)"
  ],
  "OPERATIONS": [
    "إدارة العلاقة والتواصل المباشر مع العميل ومتابعة الرضا",
    "تنسيق وتوزيع المهام بين الأقسام ومتابعة مواعيد التسليم (SLA)"
  ]
};

export const DepartmentManagement: React.FC<DepartmentManagementProps> = ({
  departments,
  onCreateDepartment,
  onUpdateDepartment,
  onDeleteDepartment
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Department | null>(null);

  // Form state
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [code, setCode] = useState('');
  const [icon, setIcon] = useState('Briefcase');
  const [color, setColor] = useState('#6366f1');
  const [description, setDescription] = useState('');
  
  // 1. Roles (الوظائف / الأدوار)
  const [deptRoles, setDeptRoles] = useState<string[]>([]);
  const [newRoleInput, setNewRoleInput] = useState('');
  
  // 2. Services / Tasks (المهام / الخدمات)
  const [deptServices, setDeptServices] = useState<string[]>([]);
  const [newServiceInput, setNewServiceInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active modal tab state
  const [activeModalTab, setActiveModalTab] = useState<'info' | 'roles' | 'tasks'>('info');

  // Dismissed suggestions tracking (so deleted items never bounce back to suggestions)
  const [dismissedRoles, setDismissedRoles] = useState<Set<string>>(new Set());
  const [dismissedTasks, setDismissedTasks] = useState<Set<string>>(new Set());

  // Inline edit state
  const [editingRoleName, setEditingRoleName] = useState<string | null>(null);
  const [editingRoleText, setEditingRoleText] = useState<string>('');
  const [editingTaskName, setEditingTaskName] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState<string>('');

  const resetForm = () => {
    setNameAr('');
    setNameEn('');
    setCode('');
    setIcon('Briefcase');
    setColor('#6366f1');
    setDescription('');
    setDeptRoles([]);
    setNewRoleInput('');
    setDeptServices([]);
    setNewServiceInput('');
    setDismissedRoles(new Set());
    setDismissedTasks(new Set());
    setEditingRoleName(null);
    setEditingTaskName(null);
    setActiveModalTab('info');
    setError(null);
  };

  const openEditModal = (dept: Department) => {
    setEditingDepartment(dept);
    setNameAr(dept.name_ar);
    setNameEn(dept.name_en);
    setCode(dept.code);
    setIcon(dept.icon || 'Briefcase');
    setColor(dept.color || '#6366f1');
    setDescription(dept.description || '');
    setDeptRoles(dept.roles || []);
    setNewRoleInput('');
    setDeptServices(dept.services || []);
    setNewServiceInput('');
    setDismissedRoles(new Set());
    setDismissedTasks(new Set());
    setEditingRoleName(null);
    setEditingTaskName(null);
    setActiveModalTab('info');
    setError(null);
  };

  // Roles helpers
  const handleAddRole = () => {
    const trimmed = newRoleInput.trim();
    if (!trimmed) return;
    if (!deptRoles.includes(trimmed)) {
      setDeptRoles([...deptRoles, trimmed]);
    }
    setNewRoleInput('');
  };

  const handleRemoveRole = (roleToRemove: string) => {
    setDeptRoles(deptRoles.filter(r => r !== roleToRemove));
    setDismissedRoles(prev => new Set(prev).add(roleToRemove));
    if (editingRoleName === roleToRemove) {
      setEditingRoleName(null);
    }
  };

  const handleStartEditRole = (role: string) => {
    setEditingRoleName(role);
    setEditingRoleText(role);
  };

  const handleSaveEditRole = (oldRole: string) => {
    const trimmed = editingRoleText.trim();
    if (!trimmed || trimmed === oldRole) {
      setEditingRoleName(null);
      return;
    }
    setDeptRoles(deptRoles.map(r => r === oldRole ? trimmed : r));
    setDismissedRoles(prev => new Set(prev).add(oldRole));
    setEditingRoleName(null);
  };

  // Services helpers
  const handleAddService = () => {
    const trimmed = newServiceInput.trim();
    if (!trimmed) return;
    if (!deptServices.includes(trimmed)) {
      setDeptServices([...deptServices, trimmed]);
    }
    setNewServiceInput('');
  };

  const handleRemoveService = (serviceToRemove: string) => {
    setDeptServices(deptServices.filter(s => s !== serviceToRemove));
    setDismissedTasks(prev => new Set(prev).add(serviceToRemove));
    if (editingTaskName === serviceToRemove) {
      setEditingTaskName(null);
    }
  };

  const handleStartEditTask = (task: string) => {
    setEditingTaskName(task);
    setEditingTaskText(task);
  };

  const handleSaveEditTask = (oldTask: string) => {
    const trimmed = editingTaskText.trim();
    if (!trimmed || trimmed === oldTask) {
      setEditingTaskName(null);
      return;
    }
    setDeptServices(deptServices.map(s => s === oldTask ? trimmed : s));
    setDismissedTasks(prev => new Set(prev).add(oldTask));
    setEditingTaskName(null);
  };

  const getSuggestedRoles = (): string[] => {
    const codeKey = (code || '').trim().toUpperCase();
    let list: string[] = [];
    if (OFFICIAL_DEPARTMENT_ROLES[codeKey]) list = OFFICIAL_DEPARTMENT_ROLES[codeKey];
    else {
      const n = (nameAr || '').toLowerCase();
      if (n.includes('سوشيال') || n.includes('محتوى')) list = OFFICIAL_DEPARTMENT_ROLES["SOCIAL_CONTENT"];
      else if (n.includes('إنتاج') || n.includes('تصوير') || n.includes('فيديو')) list = OFFICIAL_DEPARTMENT_ROLES["PRODUCTION"];
      else if (n.includes('هوية') || n.includes('تصميم') || n.includes('براند')) list = OFFICIAL_DEPARTMENT_ROLES["BRANDING"];
      else if (n.includes('برمجة') || n.includes('متاجر') || n.includes('مواقع')) list = OFFICIAL_DEPARTMENT_ROLES["DEV_ECOMMERCE"];
      else if (n.includes('إعلانات') || n.includes('ممولة') || n.includes('performance')) list = OFFICIAL_DEPARTMENT_ROLES["PERFORMANCE_ADS"];
      else if (n.includes('استراتيجية') || n.includes('استشارات')) list = OFFICIAL_DEPARTMENT_ROLES["STRATEGY"];
      else if (n.includes('عملاء') || n.includes('عمليات')) list = OFFICIAL_DEPARTMENT_ROLES["OPERATIONS"];
    }
    return list.filter(r => !deptRoles.includes(r) && !dismissedRoles.has(r));
  };

  const getSuggestedTasks = (): string[] => {
    const codeKey = (code || '').trim().toUpperCase();
    let list: string[] = [];
    if (OFFICIAL_DEPARTMENT_TASKS[codeKey]) list = OFFICIAL_DEPARTMENT_TASKS[codeKey];
    else {
      const n = (nameAr || '').toLowerCase();
      if (n.includes('سوشيال') || n.includes('محتوى')) list = OFFICIAL_DEPARTMENT_TASKS["SOCIAL_CONTENT"];
      else if (n.includes('إنتاج') || n.includes('تصوير') || n.includes('فيديو')) list = OFFICIAL_DEPARTMENT_TASKS["PRODUCTION"];
      else if (n.includes('هوية') || n.includes('تصميم') || n.includes('براند')) list = OFFICIAL_DEPARTMENT_TASKS["BRANDING"];
      else if (n.includes('برمجة') || n.includes('متاجر') || n.includes('مواقع')) list = OFFICIAL_DEPARTMENT_TASKS["DEV_ECOMMERCE"];
      else if (n.includes('إعلانات') || n.includes('ممولة') || n.includes('performance')) list = OFFICIAL_DEPARTMENT_TASKS["PERFORMANCE_ADS"];
      else if (n.includes('استراتيجية') || n.includes('استشارات')) list = OFFICIAL_DEPARTMENT_TASKS["STRATEGY"];
      else if (n.includes('عملاء') || n.includes('عمليات')) list = OFFICIAL_DEPARTMENT_TASKS["OPERATIONS"];
    }
    return list.filter(t => !deptServices.includes(t) && !dismissedTasks.has(t));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim()) {
      setError('يرجى إدخال اسم القسم بالعربي');
      setActiveModalTab('info');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onCreateDepartment({
        name_ar: nameAr.trim(),
        name_en: nameEn.trim() || undefined,
        code: code.trim().toLowerCase() || undefined,
        icon,
        color,
        description: description.trim() || undefined,
        roles: deptRoles,
        services: deptServices
      });
      setIsAddModalOpen(false);
      resetForm();
      showSuccess('تم إنشاء القسم بنجاح! ✅');
    } catch (err: any) {
      setError(err.message || 'فشل إنشاء القسم');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDepartment || !nameAr.trim()) {
      setError('يرجى إدخال اسم القسم بالعربي');
      setActiveModalTab('info');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onUpdateDepartment(editingDepartment.id, {
        name_ar: nameAr.trim(),
        name_en: nameEn.trim() || undefined,
        code: code.trim().toLowerCase() || undefined,
        icon,
        color,
        description: description.trim() || undefined,
        roles: deptRoles,
        services: deptServices
      });
      setEditingDepartment(null);
      resetForm();
      showSuccess('تم تحديث القسم بنجاح! ✅');
    } catch (err: any) {
      setError(err.message || 'فشل تحديث القسم');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setLoading(true);
      setError(null);
      await onDeleteDepartment(deleteConfirm.id);
      setDeleteConfirm(null);
      showSuccess('تم حذف القسم بنجاح! ✅');
    } catch (err: any) {
      setError(err.message || 'فشل حذف القسم');
      setDeleteConfirm(null);
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const renderModalForm = (onSubmit: (e: React.FormEvent) => void, submitLabel: string, _isEdit?: boolean) => {
    const suggestedRoles = getSuggestedRoles().filter(r => !deptRoles.includes(r));
    const suggestedTasks = getSuggestedTasks().filter(t => !deptServices.includes(t));

    return (
      <form onSubmit={onSubmit} className="flex flex-col h-full overflow-hidden text-xs">
        
        {/* Error notification banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center justify-between gap-2 text-xs font-bold animate-fadeIn shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError(null)} className="text-rose-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Tab Navigation Pill Bar */}
        <div className="px-6 pt-4 pb-2 shrink-0 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
            
            <button
              type="button"
              onClick={() => setActiveModalTab('info')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeModalTab === 'info'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>1. البيانات والمظهر</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModalTab('roles')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeModalTab === 'roles'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>2. الأدوار والمسميات</span>
              {deptRoles.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeModalTab === 'roles' ? 'bg-white text-indigo-700' : 'bg-indigo-500/20 text-indigo-300'
                }`}>
                  {deptRoles.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveModalTab('tasks')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeModalTab === 'tasks'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>3. مهام ومراحل المشاريع</span>
              {deptServices.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeModalTab === 'tasks' ? 'bg-white text-indigo-700' : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {deptServices.length}
                </span>
              )}
            </button>

          </div>
        </div>

        {/* Scrollable Tab Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
          
          {/* TAB 1: Basic Info & Appearance */}
          {activeModalTab === 'info' && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* Names row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-300 mb-1.5 flex items-center gap-1.5 text-xs">
                    <Type className="w-3.5 h-3.5 text-indigo-400" />
                    <span>اسم القسم بالعربي: <span className="text-rose-400">*</span></span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    placeholder="مثال: التصميم والهوية البصرية"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1.5 flex items-center gap-1.5 text-xs">
                    <Globe className="w-3.5 h-3.5 text-indigo-400" />
                    <span>اسم القسم بالإنجليزي (اختياري):</span>
                  </label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="مثال: Design & Branding"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all text-xs"
                  />
                </div>
              </div>

              {/* Code & Description row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-300 mb-1.5 flex items-center gap-1.5 text-xs">
                    <Hash className="w-3.5 h-3.5 text-indigo-400" />
                    <span>كود القسم (Code - اختياري):</span>
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="تلقائي إذا تُرك فارغاً (مثال: branding)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1.5 flex items-center gap-1.5 text-xs">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span>الوصف والاختصاص (اختياري):</span>
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="وصف مختصر عن مهام القسم"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all text-xs"
                  />
                </div>
              </div>

              {/* Color Picker & Live Badge Card */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                    <Palette className="w-3.5 h-3.5 text-indigo-400" />
                    <span>لون وثيم القسم:</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full border border-white/30 shadow-xs"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-[11px] text-slate-400 font-mono">{color}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {COLOR_PRESETS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-lg transition-all cursor-pointer border-2 ${
                        color === c 
                          ? 'border-white scale-110 shadow-md ring-2 ring-indigo-500/50' 
                          : 'border-transparent hover:border-slate-500 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                  <div className="flex items-center gap-1.5 mr-auto">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-6 h-6 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <span className="text-[10px] text-slate-400 font-bold">مخصص</span>
                  </div>
                </div>
              </div>

              {/* Icon Selector Grid (Compact) */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>أيقونة وشعار القسم:</span>
                  </label>
                  <span className="text-[11px] text-indigo-400 font-bold flex items-center gap-1">
                    الأيقونة الحالية: <span className="font-mono text-white">{icon}</span>
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-36 overflow-y-auto custom-scrollbar p-1">
                  {ICON_OPTIONS.map(ic => {
                    const isSelected = icon === ic;
                    return (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setIcon(ic)}
                        className={`p-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer border flex flex-col items-center gap-1 ${
                          isSelected 
                            ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-md ring-1 ring-indigo-500' 
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div className={isSelected ? 'text-indigo-300 scale-110 transition-transform' : 'text-slate-400'}>
                          {renderDepartmentIcon(ic, '', "w-4 h-4")}
                        </div>
                        <span className="truncate max-w-full font-mono text-[10px]">{ic}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: Roles (الأدوار والمسميات الوظيفية) */}
          {activeModalTab === 'roles' && (
            <div className="space-y-4 animate-fadeIn">
              
              <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-indigo-200 flex items-center gap-1.5 text-xs">
                    <Briefcase className="w-4 h-4 text-indigo-400" />
                    <span>إضافة مسمى وظيفي جديد:</span>
                  </label>
                  <span className="text-[10px] text-indigo-300 font-bold bg-indigo-500/15 px-2 py-0.5 rounded-full border border-indigo-500/30">
                    تظهر عند تعيين الكوادر
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRoleInput}
                    onChange={(e) => setNewRoleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRole();
                      }
                    }}
                    placeholder="اكتب المسمى الوظيفي (مثل: مصمم هوية بصرية، مونتير، كاتب محتوى)..."
                    className="flex-1 px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddRole}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <span>+ إضافة دور</span>
                  </button>
                </div>

                {/* Suggested Roles */}
                {suggestedRoles.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-indigo-300 font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-400" />
                        <span>أدوار مقترحة من الهيكل الإداري:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setDeptRoles(Array.from(new Set([...deptRoles, ...suggestedRoles])))}
                        className="text-[10px] text-indigo-400 hover:text-indigo-200 font-bold underline cursor-pointer"
                      >
                        + إضافة الكل ({suggestedRoles.length})
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestedRoles.map((sr, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (!deptRoles.includes(sr)) setDeptRoles([...deptRoles, sr]);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-900/50 border border-indigo-500/30 text-indigo-200 text-[10px] font-medium hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                        >
                          + {sr}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Active Roles List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="font-bold text-slate-300 text-xs flex items-center gap-1.5">
                    <span>المسميات المسجلة للقسم</span>
                    <span className="text-[11px] text-indigo-400">({deptRoles.length})</span>
                  </span>
                  {deptRoles.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDeptRoles([])}
                      className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                    >
                      مسح الكل
                    </button>
                  )}
                </div>

                {deptRoles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto custom-scrollbar p-1">
                    {deptRoles.map((role) => {
                      const isEditing = editingRoleName === role;
                      if (isEditing) {
                        return (
                          <div key={role} className="flex items-center gap-1.5 p-1.5 rounded-xl bg-indigo-950/70 border border-indigo-500/50 shadow-inner">
                            <input
                              type="text"
                              autoFocus
                              value={editingRoleText}
                              onChange={(e) => setEditingRoleText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); handleSaveEditRole(role); }
                                if (e.key === 'Escape') { e.preventDefault(); setEditingRoleName(null); }
                              }}
                              className="flex-1 px-2.5 py-1 text-xs bg-slate-900 border border-indigo-500/40 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditRole(role)}
                              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-xs"
                              title="حفظ التعديل"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRoleName(null)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                              title="إلغاء التعديل"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={role}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/90 text-slate-200 text-xs group hover:border-indigo-500/40 transition-all"
                        >
                          <div className="flex items-center gap-2 truncate min-w-0">
                            <Briefcase className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span className="truncate font-medium">{role}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleStartEditRole(role);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/15 cursor-pointer transition-colors"
                              title="تعديل المسمى"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleRemoveRole(role);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/15 cursor-pointer transition-colors"
                              title="حذف هذا المسمى"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 px-4 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-slate-500">
                    <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30 text-indigo-400" />
                    <p className="text-xs font-bold text-slate-400">لا توجد مسميات وظيفية مسجلة بعد</p>
                    <p className="text-[11px] mt-0.5 text-slate-500">أضف المسميات لتسهيل تعيين الموظفين في هذا القسم</p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: Tasks & Services (مهام ومراحل المشاريع) */}
          {activeModalTab === 'tasks' && (
            <div className="space-y-4 animate-fadeIn">
              
              <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-emerald-200 flex items-center gap-1.5 text-xs">
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                    <span>إضافة مهمة أو خدمة لمراحل المشاريع:</span>
                  </label>
                  <span className="text-[10px] text-emerald-300 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    تسمع في تسليمات المشاريع
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newServiceInput}
                    onChange={(e) => setNewServiceInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddService();
                      }
                    }}
                    placeholder="اكتب اسم المهمة (مثل: مونتاج الفيديو، تأسيس المتجر، حملات إعلانات جوجل)..."
                    className="flex-1 px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddService}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <span>+ إضافة مهمة</span>
                  </button>
                </div>

                {/* Suggested Tasks */}
                {suggestedTasks.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-emerald-300 font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        <span>مهام مقترحة ومعتمدة:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setDeptServices(Array.from(new Set([...deptServices, ...suggestedTasks])))}
                        className="text-[10px] text-emerald-400 hover:text-emerald-200 font-bold underline cursor-pointer"
                      >
                        + إضافة الكل ({suggestedTasks.length})
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestedTasks.map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => {
                            if (!deptServices.includes(st)) setDeptServices([...deptServices, st]);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-900/50 border border-emerald-500/30 text-emerald-200 text-[10px] font-medium hover:bg-emerald-600 hover:text-white transition-all cursor-pointer"
                        >
                          + {st}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Active Services List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="font-bold text-slate-300 text-xs flex items-center gap-1.5">
                    <span>المهام المعتمدة للقسم</span>
                    <span className="text-[11px] text-emerald-400">({deptServices.length})</span>
                  </span>
                  {deptServices.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDeptServices([])}
                      className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                    >
                      مسح الكل
                    </button>
                  )}
                </div>

                {deptServices.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto custom-scrollbar p-1">
                    {deptServices.map((srv) => {
                      const isEditing = editingTaskName === srv;
                      if (isEditing) {
                        return (
                          <div key={srv} className="flex items-center gap-1.5 p-1.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 shadow-inner">
                            <input
                              type="text"
                              autoFocus
                              value={editingTaskText}
                              onChange={(e) => setEditingTaskText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); handleSaveEditTask(srv); }
                                if (e.key === 'Escape') { e.preventDefault(); setEditingTaskName(null); }
                              }}
                              className="flex-1 px-2.5 py-1 text-xs bg-slate-900 border border-emerald-500/40 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditTask(srv)}
                              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs"
                              title="حفظ التعديل"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTaskName(null)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                              title="إلغاء التعديل"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={srv}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/90 text-slate-200 text-xs group hover:border-emerald-500/40 transition-all"
                        >
                          <div className="flex items-center gap-2 truncate min-w-0">
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate font-medium">{srv}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleStartEditTask(srv);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-300 hover:bg-emerald-500/15 cursor-pointer transition-colors"
                              title="تعديل المهمة"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleRemoveService(srv);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/15 cursor-pointer transition-colors"
                              title="حذف هذه المهمة"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 px-4 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-slate-500">
                    <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-400" />
                    <p className="text-xs font-bold text-slate-400">لا توجد مهام أو خدمات مسجلة بعد</p>
                    <p className="text-[11px] mt-0.5 text-slate-500">أضف المهام لتظهر تلقائياً كخيارات سريعة عند إنشاء مشاريع العملاء</p>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Sticky Footer Action Bar */}
        <div className="px-6 py-3.5 bg-slate-950/90 border-t border-slate-800/90 flex items-center justify-end gap-3 shrink-0">
          
          {/* Action buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => { setIsAddModalOpen(false); setEditingDepartment(null); resetForm(); }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-slate-300 transition-all cursor-pointer text-xs"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'جاري الحفظ...' : submitLabel}</span>
            </button>
          </div>

        </div>

      </form>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* Success Toast */}
      {successMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl bg-emerald-600/90 backdrop-blur-md text-white text-xs font-bold flex items-center gap-2 shadow-2xl animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Toast */}
      {error && !isAddModalOpen && !editingDepartment && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-2 text-xs font-bold">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="mr-auto text-rose-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gray-900 border border-gray-800 shadow-xl">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400" />
            <span>إدارة وتخصيص الأقسام (Department Management)</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            إدارة الأدوار الوظيفية والمهام والخدمات لكل قسم
          </p>
        </div>

        <button
          onClick={() => { resetForm(); setIsAddModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all cursor-pointer shadow-md"
        >
          <FolderPlus className="w-4 h-4" />
          <span>إضافة قسم جديد</span>
        </button>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map(dept => {
          const rolesList = dept.roles || [];
          const servicesList = dept.services || [];

          return (
            <div 
              key={dept.id} 
              className="glass-panel rounded-2xl p-5 space-y-4 group hover:border-indigo-500/40 transition-all shadow-lg relative overflow-hidden"
              style={{ borderColor: (dept.color || '#6366f1') + '35' }}
            >
              {/* Top Accent Color Line */}
              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: dept.color || '#6366f1' }}></div>

              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0 border transition-transform group-hover:scale-105"
                    style={{ 
                      backgroundColor: (dept.color || '#6366f1') + '22', 
                      color: dept.color || '#818cf8', 
                      borderColor: (dept.color || '#6366f1') + '50' 
                    }}
                  >
                    {renderDepartmentIcon(dept.icon, dept.name_ar, "w-6 h-6")}
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-white text-sm sm:text-base truncate group-hover:text-indigo-300 transition-colors">
                      {dept.name_ar}
                    </div>
                    <div className="text-[11px] text-gray-400 truncate font-medium">
                      {dept.name_en}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => openEditModal(dept)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-indigo-600 text-gray-300 hover:text-white transition-all cursor-pointer border border-white/5"
                    title="تعديل بيانات وأدوار ومهام القسم"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(dept)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-rose-600 text-gray-300 hover:text-white transition-all cursor-pointer border border-white/5"
                    title="حذف القسم"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Details & Badges */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between text-gray-400">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5">
                    <Hash className="w-3 h-3 text-gray-500" />
                    <span className="font-mono text-gray-300 font-bold">{dept.code}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5">
                    {renderDepartmentIcon(dept.icon, dept.name_ar, "w-3.5 h-3.5 text-gray-400")}
                    <span className="text-gray-300 font-mono text-[11px]">{dept.icon || 'Briefcase'}</span>
                  </div>
                </div>

                {/* Department Description */}
                {dept.description ? (
                  <div className="text-gray-300 text-xs p-2.5 rounded-xl bg-white/[0.03] border border-white/5 leading-relaxed">
                    {dept.description}
                  </div>
                ) : null}

                {/* 1. Department ROLES (الوظائف) */}
                <div className="pt-2 border-t border-white/5 space-y-1.5">
                  <div className="text-[11px] text-indigo-300 font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-indigo-400" />
                      <span>الأدوار الوظيفية ({rolesList.length}):</span>
                    </span>
                    <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                      تسمع بالتعيين
                    </span>
                  </div>
                  {rolesList.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                      {rolesList.map((r, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-lg bg-indigo-950/70 border border-indigo-500/20 text-[10px] text-indigo-200">
                          {r}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-500 italic">لا توجد أدوار وظيفية مسجلة</p>
                  )}
                </div>

                {/* 2. Department SERVICES / TASKS (المهام) */}
                <div className="pt-2 border-t border-white/5 space-y-1.5">
                  <div className="text-[11px] text-emerald-300 font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <CheckSquare className="w-3 h-3 text-emerald-400" />
                      <span>مهام ومراحل المشاريع ({servicesList.length}):</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      تسمع بالمشاريع
                    </span>
                  </div>
                  {servicesList.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                      {servicesList.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-lg bg-emerald-950/70 border border-emerald-500/20 text-[10px] text-emerald-200">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-500 italic">لا توجد مهام مسجلة</p>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {departments.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-bold">لا توجد أقسام حالياً</p>
          <p className="text-xs mt-1">اضغط على "إضافة قسم جديد" لإنشاء أول قسم</p>
        </div>
      )}

      {/* Add Department Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 pt-16 sm:pt-6 pb-6 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[76vh] rounded-3xl bg-slate-900/95 border border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-scaleIn my-auto">
            
            {/* Modal Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    إنشاء قسم تنظيمي جديد
                  </h3>
                  <p className="text-[11px] text-slate-400">تخصيص الهوية والأدوار الوظيفية ومهام المشاريع</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => { setIsAddModalOpen(false); resetForm(); }} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderModalForm(handleCreateSubmit, 'إنشاء القسم', false)}
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {editingDepartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 pt-16 sm:pt-6 pb-6 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[76vh] rounded-3xl bg-slate-900/95 border border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-scaleIn my-auto">
            
            {/* Modal Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white border border-white/20 shadow-xs"
                  style={{ backgroundColor: color }}
                >
                  {renderDepartmentIcon(icon, editingDepartment.name_ar, "w-4 h-4")}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                    <span>تعديل قسم: {editingDepartment.name_ar}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {editingDepartment.code}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">{editingDepartment.name_en}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => { setEditingDepartment(null); resetForm(); }} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderModalForm(handleUpdateSubmit, 'حفظ التعديلات', true)}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-sm rounded-3xl p-6 border border-gray-800 space-y-5">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/15 flex items-center justify-center mx-auto">
                <Trash2 className="w-7 h-7 text-rose-400" />
              </div>
              <h3 className="text-base font-bold text-white">حذف القسم</h3>
              <p className="text-xs text-gray-400">
                هل أنت متأكد من حذف قسم <span className="text-rose-300 font-bold">"{deleteConfirm.name_ar}"</span>؟
                <br />
                <span className="text-[10px] text-rose-400/70">لا يمكن التراجع عن هذا الإجراء إذا لم يكن به موظفين أو مهام.</span>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 font-bold text-gray-300 text-xs transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all cursor-pointer shadow-md"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{loading ? 'جاري الحذف...' : 'حذف القسم'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
