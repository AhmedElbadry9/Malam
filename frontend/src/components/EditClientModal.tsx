import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, CheckCircle2, 
  Trash2, Plus, UserPlus, GripVertical, Save, Edit3, Sparkles, Check,
  Clock, AlertTriangle, ShieldCheck, RotateCcw, FolderGit2, ExternalLink,
  Globe, Mail, Copy, Phone, ShoppingBag
} from 'lucide-react';
import type { Client, Department, TeamMember, TaskStage } from '../types';
import { generateAgencyEmail } from '../utils/urlHelper';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface EditClientModalProps {
  client: Client;
  departments: Department[];
  members: TeamMember[];
  onClose: () => void;
  onUpdateClient: (clientId: number, data: any) => Promise<void>;
  onDeleteClient?: (clientId: number) => Promise<void>;
  onAddAssignment: (clientId: number, data: any) => Promise<void>;
  onUpdateAssignment: (clientId: number, stageId: number, data: any) => Promise<void>;
  onDeleteAssignment: (clientId: number, stageId: number) => Promise<void>;
}

export const EditClientModal: React.FC<EditClientModalProps> = ({
  client,
  departments,
  members,
  onClose,
  onUpdateClient,
  onDeleteClient,
  onAddAssignment,
  onUpdateAssignment,
  onDeleteAssignment
}) => {
  // Delete modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingClient, setIsDeletingClient] = useState(false);

  const handleConfirmDeleteClient = async () => {
    if (!onDeleteClient) return;
    try {
      setIsDeletingClient(true);
      await onDeleteClient(client.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err: any) {
      alert(err.message || 'فشل حذف العميل والمشروع');
      setIsDeletingClient(false);
    }
  };
  // Core client state
  const [name, setName] = useState(client.name);
  const [companyName, setCompanyName] = useState(client.company_name);
  const [serviceType, setServiceType] = useState(client.service_type);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>(((client.priority as string) === 'normal' ? 'medium' : client.priority) as 'low' | 'medium' | 'high' | 'urgent' || 'medium');
  const [requestDetails, setRequestDetails] = useState(client.request_details || '');
  const [driveFolderUrl, setDriveFolderUrl] = useState(client.drive_folder_url || '');
  const [websiteUrl, setWebsiteUrl] = useState(client.website_url || '');
  const [phone, setPhone] = useState(client.phone || '');
  const [ticketNumber, setTicketNumber] = useState(client.ticket_number || '');
  const [storeId, setStoreId] = useState(client.store_id || '');
  const [packageName, setPackageName] = useState(client.package_name || '');
  const [status, setStatus] = useState(client.status || 'intake');
  const isStandardPlatform = ['سلة', 'زد', 'شوبيفاي', 'ووردبريس'].includes(client.platform || '');
  const [platform, setPlatform] = useState(isStandardPlatform ? (client.platform || 'سلة') : (client.platform ? 'other' : 'سلة'));
  const [customPlatform, setCustomPlatform] = useState(!isStandardPlatform && client.platform ? client.platform : '');
  const [copiedAgencyEmail, setCopiedAgencyEmail] = useState(false);
  const generatedAgencyEmail = websiteUrl ? generateAgencyEmail(websiteUrl) : (client.agency_email || '');

  // Local stages state synced with prop
  const [stages, setStages] = useState<TaskStage[]>(client.stages || []);

  useEffect(() => {
    setStages(client.stages || []);
  }, [client.stages]);

  const handleCopyAgencyEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!generatedAgencyEmail) return;
    navigator.clipboard.writeText(generatedAgencyEmail);
    setCopiedAgencyEmail(true);
    setTimeout(() => setCopiedAgencyEmail(false), 2000);
  };
  
  // Loading states
  const [isSavingCore, setIsSavingCore] = useState(false);
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New assignment state
  const [showAddStage, setShowAddStage] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [newStageName, setNewStageName] = useState('');
  const [newStageDescription, setNewStageDescription] = useState('');
  const [newStageDeptId, setNewStageDeptId] = useState<number>(departments[0]?.id || 1);
  const [newStageMemberId, setNewStageMemberId] = useState<number>(members.find(m => m.department_id === (departments[0]?.id || 1))?.id || members[0]?.id || 1);

  // Auto-sync department/member IDs when departments or members change
  useEffect(() => {
    if (departments.length > 0 && !departments.some(d => d.id === newStageDeptId)) {
      setNewStageDeptId(departments[0].id);
    }
  }, [departments]);

  // Compute available members for selected department
  const availableMembers = useMemo(() => {
    const filtered = members.filter(m => m.department_ids?.includes(newStageDeptId) || m.department_id === newStageDeptId);
    return filtered.length > 0 ? filtered : members;
  }, [members, newStageDeptId]);

  // Auto-sync member ID when available members change
  useEffect(() => {
    if (availableMembers.length > 0 && !availableMembers.some(m => m.id === newStageMemberId)) {
      setNewStageMemberId(availableMembers[0].id);
    }
  }, [availableMembers]);

  // Auto-dismiss success message
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Default fallback services when department has none
  const DEFAULT_SERVICES = [
    'إعداد المتطلبات وتحديد الأهداف',
    'تنفيذ العمل والتصاميم',
    'المراجعة وضبط المعايير',
    'التسليم النهائي'
  ];

  const toggleService = (service: string) => {
    setSelectedServices(prev =>
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    );
  };

  const handleUpdateCore = async () => {
    const finalPlatform = platform === 'other' ? customPlatform.trim() : platform;
    try {
      setIsSavingCore(true);
      await onUpdateClient(client.id, {
        name,
        company_name: companyName,
        phone: phone.trim() || undefined,
        ticket_number: ticketNumber.trim() || undefined,
        store_id: storeId.trim() || undefined,
        package_name: packageName.trim() || undefined,
        status,
        platform: finalPlatform || undefined,
        service_type: serviceType,
        priority,
        request_details: requestDetails,
        drive_folder_url: driveFolderUrl.trim(),
        website_url: websiteUrl.trim() || undefined,
        agency_email: generatedAgencyEmail || undefined
      });
      setSuccessMsg('✅ تم حفظ البيانات وتحديث تفاصيل التذكرة والمتجر بنجاح!');
    } catch (err: any) {
      alert(err.message || 'فشل التحديث');
    } finally {
      setIsSavingCore(false);
    }
  };

  const handleAddStage = async () => {
    // Collect all selected services + custom typed task name
    const tasksToAdd: string[] = [...selectedServices];
    const customName = newStageName.trim();
    if (customName && !tasksToAdd.includes(customName)) {
      tasksToAdd.push(customName);
    }

    if (tasksToAdd.length === 0) return;

    try {
      setIsAddingStage(true);
      for (let i = 0; i < tasksToAdd.length; i++) {
        await onAddAssignment(client.id, {
          department_id: newStageDeptId,
          assigned_member_id: newStageMemberId,
          stage_name: tasksToAdd[i],
          description: newStageDescription,
          order_index: stages.length + i
        });
      }
      setShowAddStage(false);
      setSelectedServices([]);
      setNewStageName('');
      setNewStageDescription('');
      setSuccessMsg(`✅ تم إسناد ${tasksToAdd.length > 1 ? tasksToAdd.length + ' مهام' : 'المهمة'} بنجاح!`);
    } catch (err: any) {
      alert(err.message || 'فشل إضافة المهام');
    } finally {
      setIsAddingStage(false);
    }
  };

  const handleUpdateStage = async (stage: TaskStage, field: string, value: any) => {
    setStages(prev => prev.map(s => s.id === stage.id ? { ...s, [field]: value } : s));
    try {
      await onUpdateAssignment(client.id, stage.id, {
        [field]: value
      });
      setSuccessMsg('✅ تم تحديث بيانات المهمة وإسنادها بنجاح!');
    } catch (err: any) {
      setStages(client.stages || []);
      alert(err.message || 'فشل تحديث المهمة');
    }
  };

  const handleDeleteStage = async (stage: TaskStage) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المهمة من مسار العميل؟')) return;
    setStages(prev => prev.filter(s => s.id !== stage.id));
    try {
      await onDeleteAssignment(client.id, stage.id);
      setSuccessMsg('✅ تم حذف المهمة بنجاح!');
    } catch (err: any) {
      setStages(client.stages || []);
      alert(err.message || 'فشل الحذف');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-5 bg-slate-950/80 backdrop-blur shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">ملف العميل: {client.company_name}</h3>
              <p className="text-xs text-gray-400">تعديل البيانات الأساسية وإدارة المهام والمسؤولين</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white font-bold p-2 bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer transition-colors">✕ إغلاق</button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">

        {/* Success Toast */}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Core Data Edit */}
          <div className="lg:col-span-1 space-y-4">
            <h4 className="font-bold text-indigo-300 text-sm flex items-center gap-2 border-b border-gray-800 pb-2">
              <Edit3 className="w-4 h-4" />
              البيانات الأساسية
            </h4>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">اسم العميل (الجهة):</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 mb-1">اسم المسؤول (الشخص):</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-indigo-400" />
                  <span>رقم الهاتف:</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  className="w-full p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-white focus:outline-none focus:border-indigo-500 font-mono direction-ltr text-right"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">رقم التذكرة:</label>
                  <input
                    type="text"
                    value={ticketNumber}
                    onChange={e => setTicketNumber(e.target.value)}
                    placeholder="48564380723"
                    className="w-full p-2 rounded-xl bg-gray-900 border border-gray-800 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">معرّف المتجر:</label>
                  <input
                    type="text"
                    value={storeId}
                    onChange={e => setStoreId(e.target.value)}
                    placeholder="3183062"
                    className="w-full p-2 rounded-xl bg-gray-900 border border-gray-800 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">اسم الباقة:</label>
                  <input
                    type="text"
                    value={packageName}
                    onChange={e => setPackageName(e.target.value)}
                    placeholder="باقة النمو"
                    className="w-full p-2 rounded-xl bg-gray-900 border border-gray-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">المرحلة:</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full p-2 rounded-xl bg-gray-900 border border-gray-800 text-white text-xs font-bold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="intake">الطلبات المستلمة</option>
                    <option value="in_progress">قيد التنفيذ</option>
                    <option value="review">بانتظار المراجعة</option>
                    <option value="completed">مكتمل</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-indigo-400" />
                    <span>المنصة:</span>
                  </span>
                </label>
                <select
                  value={platform}
                  onChange={e => setPlatform(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-white focus:outline-none focus:border-indigo-500 font-bold"
                >
                  <option value="زد">زد (Zid)</option>
                  <option value="سلة">سلة (Salla)</option>
                  <option value="شوبيفاي">شوبيفاي (Shopify)</option>
                  <option value="other">أخرى (Other...)</option>
                </select>

                {platform === 'other' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={customPlatform}
                      onChange={e => setCustomPlatform(e.target.value)}
                      placeholder="اسم المنصة..."
                      className="w-full p-2 rounded-xl bg-gray-950 border border-indigo-500/50 text-white text-xs focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-400 mb-1">نوع الخدمة:</label>
                <input
                  type="text"
                  value={serviceType}
                  onChange={e => setServiceType(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">الأولوية:</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent')}
                  className="w-full p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-white focus:outline-none focus:border-indigo-500 font-bold"
                >
                  <option value="urgent">طارئ جداً</option>
                  <option value="high">عالية</option>
                  <option value="medium">متوسطة</option>
                  <option value="low">منخفضة</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-1">رابط مجلد Google Drive:</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-emerald-400">
                      <FolderGit2 className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="url"
                      value={driveFolderUrl}
                      onChange={e => setDriveFolderUrl(e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="w-full pr-9 pl-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-white focus:outline-none focus:border-emerald-500 text-xs font-mono"
                    />
                  </div>
                  {driveFolderUrl && driveFolderUrl.startsWith('http') && (
                    <a
                      href={driveFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors flex items-center justify-center shrink-0"
                      title="فتح مجلد Google Drive في تبويب جديد"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Website URL & Agency Email Generator */}
              <div className="p-3 rounded-xl bg-gray-950/80 border border-teal-500/30 space-y-2">
                <div>
                  <label className="block text-gray-300 font-bold text-[11px] mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-teal-400" />
                      <span>رابط الموقع أو المتجر (Website Link):</span>
                    </span>
                    <span className="text-[10px] text-teal-400/80">توليد إيميل الوكالة تلقائياً</span>
                  </label>
                  <input
                    type="text"
                    value={websiteUrl}
                    onChange={e => setWebsiteUrl(e.target.value)}
                    placeholder="مثال: www.saleh.com"
                    className="w-full p-2 rounded-xl bg-gray-900 border border-gray-800 text-white text-xs focus:outline-none focus:border-teal-500 font-mono direction-ltr text-left"
                  />
                </div>

                {generatedAgencyEmail && (
                  <div className="p-2 rounded-lg bg-teal-950/50 border border-teal-500/40 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] text-teal-300 font-bold">إيميل الوكالة المخصص:</div>
                        <div className="text-xs font-mono font-bold text-white truncate select-all direction-ltr text-left">
                          {generatedAgencyEmail}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyAgencyEmail}
                      className="px-2 py-1 rounded bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-[10px] font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copiedAgencyEmail ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedAgencyEmail ? 'تم' : 'نسخ'}</span>
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-400 mb-1">تفاصيل وملاحظات:</label>
                <textarea
                  value={requestDetails}
                  onChange={e => setRequestDetails(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-white focus:outline-none focus:border-indigo-500 custom-scrollbar"
                />
              </div>

              <button
                onClick={handleUpdateCore}
                disabled={isSavingCore}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all"
              >
                <Save className="w-4 h-4" />
                {isSavingCore ? 'جاري الحفظ...' : 'حفظ البيانات'}
              </button>
            </div>
          </div>

          {/* Right Column: Assignments Control */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <h4 className="font-bold text-amber-300 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                مسار العمل والمهام الموكلة (Assignments)
              </h4>
              <button
                onClick={() => setShowAddStage(!showAddStage)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> إضافة مهمة
              </button>
            </div>

            {/* Add New Stage Box */}
            {showAddStage && (
              <div className="p-4 rounded-2xl bg-gray-900/90 border border-amber-500/30 space-y-3.5 animate-fadeIn shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <h5 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4" /> 
                    <span>إسناد مهام جديدة للعميل</span>
                  </h5>
                  <span className="text-[10px] text-gray-400 font-medium">يمكنك تحديد أكثر من خدمة معاً أو كتابة مهمة خاصة</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-gray-400 mb-1 font-bold">1. القسم المسؤول:</label>
                    <select
                      value={newStageDeptId}
                      onChange={e => {
                        const deptId = Number(e.target.value);
                        setNewStageDeptId(deptId);
                        setSelectedServices([]);
                        const firstMember = members.find(m => m.department_ids?.includes(deptId) || m.department_id === deptId);
                        if (firstMember) setNewStageMemberId(firstMember.id);
                      }}
                      className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white font-bold focus:outline-none focus:border-amber-500"
                    >
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name_ar}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-bold">2. المكلف بالمهمة (الـ Head أو موظف):</label>
                    {(() => {
                      const selDept = departments.find(d => d.id === newStageDeptId);
                      const curDeptHead = members.find(m => {
                        const mRole = m.role || '';
                        return (m.department_id === newStageDeptId || m.department_ids?.includes(newStageDeptId)) && 
                          (m.role_type === 'head' || mRole.toLowerCase().includes('head') || mRole.includes('رئيس'));
                      });
                      const deptEmployees = members.filter(m => 
                        m.role_type === 'employee' &&
                        (m.department_id === newStageDeptId || m.department_ids?.includes(newStageDeptId)) && 
                        m.id !== curDeptHead?.id
                      );

                      return (
                        <select
                          value={newStageMemberId}
                          onChange={e => setNewStageMemberId(Number(e.target.value))}
                          className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white font-bold focus:outline-none focus:border-amber-500"
                        >
                          {curDeptHead && (
                            <optgroup label={`⭐ رئيس قسم ${selDept?.name_ar || ''} (يستلمها لتوزيعها لاحقاً):`}>
                              <option value={curDeptHead.id}>
                                👑 {curDeptHead.name} (رئيس القسم - Head)
                              </option>
                            </optgroup>
                          )}
                          <optgroup label={`👤 موظفو ${selDept?.name_ar || 'هذا القسم'} (إسناد مباشر):`}>
                            {deptEmployees.length > 0 ? (
                              deptEmployees.map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.name} ({m.role || 'موظف'})
                                </option>
                              ))
                            ) : (
                              <option value="" disabled>-- لا يوجد موظفون إضافيون مسجلون بهذا القسم --</option>
                            )}
                          </optgroup>
                        </select>
                      );
                    })()}
                  </div>
                </div>

                {/* Department Services Multi-Select Chips */}
                {(() => {
                  const selDept = departments.find(d => d.id === newStageDeptId);
                  const srvs = (selDept?.services && selDept.services.length > 0) ? selDept.services : DEFAULT_SERVICES;

                  return (
                    <div className="p-3 rounded-xl bg-gray-950/70 border border-gray-800/90 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-amber-300 font-bold flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>اختر خدمات {selDept?.name_ar || 'القسم'} (يمكنك تحديد أكثر من خدمة):</span>
                        </span>
                        {selectedServices.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              تم تحديد {selectedServices.length} خدمات
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedServices([])}
                              className="text-[10px] text-gray-400 hover:text-rose-400 cursor-pointer underline"
                            >
                              إلغاء التحديد
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {srvs.map((srv, idx) => {
                          const isSelected = selectedServices.includes(srv);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => toggleService(srv)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-amber-500 border-amber-400 text-gray-950 shadow-md shadow-amber-500/20 scale-[1.02]'
                                  : 'bg-gray-900/90 border-gray-800 text-gray-300 hover:text-white hover:border-gray-700'
                              }`}
                            >
                              {isSelected ? (
                                <Check className="w-3.5 h-3.5 text-gray-950 stroke-[3]" />
                              ) : (
                                <Plus className="w-3.5 h-3.5 text-gray-500" />
                              )}
                              <span>{srv}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Custom Task Input */}
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">
                    اسم مهمة إضافية مخصصة (إذا أردت كتابة مهمة يدوياً):
                  </label>
                  <input
                    type="text"
                    value={newStageName}
                    onChange={e => setNewStageName(e.target.value)}
                    placeholder="اكتب هنا إذا لم تكن المهمة موجودة في الخدمات أعلاه..."
                    className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 text-xs">شرح المهمة للموظف (اختياري):</label>
                  <textarea
                    value={newStageDescription}
                    onChange={e => setNewStageDescription(e.target.value)}
                    placeholder="مثال: يرجى مراعاة هوية العميل والألوان المتفق عليها..."
                    rows={2}
                    className="w-full p-2 rounded-xl bg-gray-950 border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 text-xs custom-scrollbar"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                  <div className="text-xs text-gray-400">
                    {(() => {
                      const count = selectedServices.length + (newStageName.trim() && !selectedServices.includes(newStageName.trim()) ? 1 : 0);
                      if (count === 0) return 'لم يتم تحديد أي مهمة بعد';
                      if (count === 1) return 'سيتم إضافة مهمة واحدة';
                      return `سيتم إضافة (${count}) مهام معاً للعميل`;
                    })()}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddStage(false);
                        setSelectedServices([]);
                        setNewStageName('');
                        setNewStageDescription('');
                      }}
                      className="px-3 py-2 text-xs font-bold text-gray-400 hover:text-white rounded-xl bg-gray-800 hover:bg-gray-700 cursor-pointer"
                    >
                      إلغاء
                    </button>

                    <button
                      type="button"
                      onClick={handleAddStage}
                      disabled={isAddingStage || (selectedServices.length === 0 && !newStageName.trim())}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-black bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-gray-950 rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer transition-all"
                    >
                      {isAddingStage ? (
                        <span>جاري الإضافة...</span>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>
                            {(() => {
                              const count = selectedServices.length + (newStageName.trim() && !selectedServices.includes(newStageName.trim()) ? 1 : 0);
                              return count > 1 ? `إسناد (${count}) مهام معاً` : 'إسناد المهمة';
                            })()}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* Assignments List */}
            <div className="space-y-2">
              {stages.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-500">لا يوجد مهام حالية لهذا العميل.</div>
              ) : (
                stages.map((stage, index) => (
                  <div key={stage.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors">
                    
                    {/* Stage Info */}
                    <div className="flex items-center gap-3 flex-1">
                      <div className="cursor-move text-gray-600 hover:text-gray-400" title="ترتيب">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-400 shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          defaultValue={stage.stage_name}
                          onBlur={e => e.target.value !== stage.stage_name && handleUpdateStage(stage, 'stage_name', e.target.value)}
                          className="font-bold text-sm text-white bg-transparent border-b border-transparent hover:border-gray-700 focus:border-indigo-500 focus:outline-none w-full"
                          placeholder="اسم المهمة"
                        />
                        <input
                          type="text"
                          defaultValue={stage.description || ''}
                          onBlur={e => e.target.value !== stage.description && handleUpdateStage(stage, 'description', e.target.value)}
                          className="text-xs text-gray-400 bg-transparent border-b border-transparent hover:border-gray-700 focus:border-indigo-500 focus:outline-none w-full"
                          placeholder="أضف شرح أو تفاصيل للمهمة (اختياري)..."
                        />
                        <div className="text-[10px] text-gray-400 flex gap-2">
                          {stage.status === 'completed' ? (
                            <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> مكتمل ومعتمد</span>
                          ) : stage.status === 'under_review' ? (
                            <span className="text-amber-400 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> قيد مراجعة الإدارة</span>
                          ) : stage.status === 'revision_requested' ? (
                            <span className="text-rose-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> مطلوب تعديلات</span>
                          ) : stage.status === 'pending' ? (
                            <span className="text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> في الانتظار</span>
                          ) : (
                            <span className="text-blue-400 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> قيد التنفيذ</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Reassign Controls */}
                    <div className="flex items-center gap-2 text-xs">
                      {(() => {
                        const stageDept = departments.find(d => d.id === stage.department_id);
                        const stageHead = members.find(m => {
                          const mRole = m.role || '';
                          return (m.department_id === stage.department_id || m.department_ids?.includes(stage.department_id)) && 
                            (m.role_type === 'head' || mRole.toLowerCase().includes('head') || mRole.includes('رئيس'));
                        });
                        const deptMembers = members.filter(m => 
                          m.role_type === 'employee' &&
                          (m.department_id === stage.department_id || m.department_ids?.includes(stage.department_id)) && 
                          m.id !== stageHead?.id
                        );

                        return (
                          <select
                            value={stage.assigned_member_id || ''}
                            onChange={e => handleUpdateStage(stage, 'assigned_member_id', Number(e.target.value))}
                            disabled={stage.status === 'completed'}
                            className={`p-1.5 rounded-lg border focus:outline-none w-40 text-xs font-bold ${
                              stage.status === 'completed' 
                                ? 'bg-gray-950/50 border-gray-800/50 text-gray-500 cursor-not-allowed' 
                                : 'bg-gray-950 border-gray-700 text-gray-200'
                            }`}
                          >
                            {stageHead && (
                              <optgroup label={`⭐ رئيس القسم (${stageDept?.name_ar || ''}):`}>
                                <option value={stageHead.id}>
                                  👑 {stageHead.name} (رئيس القسم)
                                </option>
                              </optgroup>
                            )}
                            <optgroup label="👤 موظفو القسم:">
                              {deptMembers.map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.name} ({m.role || 'موظف'})
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        );
                      })()}

                      <button
                        onClick={() => handleDeleteStage(stage)}
                        disabled={stage.status === 'completed'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          stage.status === 'completed'
                            ? 'text-gray-700 cursor-not-allowed'
                            : 'text-gray-500 hover:text-rose-400 hover:bg-rose-500/10'
                        }`}
                        title={stage.status === 'completed' ? 'لا يمكن حذف مهمة مكتملة' : 'حذف المهمة'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                ))
              )}
            </div>

          </div>
        </div>

        </div>

        {/* Sticky Modal Footer */}
        <div className="p-4 px-6 border-t border-white/10 bg-slate-950/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            {onDeleteClient && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                title="حذف هذا العميل / المشروع نهائياً"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف المشروع</span>
              </button>
            )}
            {successMsg && <span className="text-emerald-400 font-bold text-xs">{successMsg}</span>}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs transition-all cursor-pointer"
            >
              إغلاق النافذة
            </button>
            <button
              type="button"
              onClick={handleUpdateCore}
              disabled={isSavingCore}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingCore ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Delete Project Confirmation Modal */}
      {showDeleteConfirm && (
        <Modal
          isOpen={true}
          onClose={() => !isDeletingClient && setShowDeleteConfirm(false)}
          title="تأكيد حذف المشروع والعميل نهائياً"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-white mb-1">
                  هل أنت متأكد من رغبتك في حذف: &quot;{client.company_name}&quot;؟
                </p>
                <p className="leading-relaxed">
                  سيتم حذف المشروع وكافة المهام والمراحل التنفيذية وسجلات التدقيق التابعة له نهائياً ولا يمكن استرجاعها.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeletingClient}
              >
                إلغاء
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDeleteClient}
                loading={isDeletingClient}
                icon={<Trash2 className="w-4 h-4" />}
              >
                تأكيد الحذف نهائياً
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
