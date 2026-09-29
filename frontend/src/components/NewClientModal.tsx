import React, { useState, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Sparkles, Plus, Trash2, User, Folder,
  Globe, Mail, Copy, Check, RefreshCw,
  Phone, Clock, Calendar, Hash, Package,
  AlertCircle, CheckCircle2, ChevronLeft, ChevronRight
} from 'lucide-react';
import type { Department, TeamMember, NewClientPayload, NewClientAssignment, Client, FolderShareConfig } from '../types';
import { checkDriveFolder, type CheckDriveFolderResult } from '../services/api';
import { extractBrandFromUrl } from '../utils/urlHelper';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { PriorityBadge } from './ui/PriorityBadge';

interface DepartmentTaskGroup {
  id: string;
  department_id: number;
  assigned_member_id: number;
  selected_services: string[];
  custom_tasks: string[];
  new_custom_input: string;
  is_other_open?: boolean;
  notes: string;
}

interface NewClientModalProps {
  departments: Department[];
  members: TeamMember[];
  initialClientName?: string;
  existingClients?: Client[];
  onClose: () => void;
  onSubmitIntake: (payload: NewClientPayload & { drive_folder_url?: string }) => Promise<void>;
}

export const NewClientModal: React.FC<NewClientModalProps> = ({
  departments,
  members,
  initialClientName,
  existingClients,
  onClose,
  onSubmitIntake
}) => {
  // Stepped flow: 1 (Basic Info & Platform), 2 (Priority & Drive), 3 (Department Tasks), 4 (Review)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form fields
  const [name, setName] = useState(initialClientName || '');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [storeId, setStoreId] = useState('');
  const [packageName, setPackageName] = useState('');
  const [createdAt, setCreatedAt] = useState(() => new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('');
  const [platform, setPlatform] = useState('زد');
  const [customPlatform, setCustomPlatform] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [agencyEmail, setAgencyEmail] = useState('');
  const [isEmailManuallyEdited, setIsEmailManuallyEdited] = useState(false);
  const [copiedAgencyEmail, setCopiedAgencyEmail] = useState(false);
  const [serviceType, setServiceType] = useState('');
  const [requestDetails, setRequestDetails] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

  // Live Provisioning Screen States
  const [provisionProgress, setProvisionProgress] = useState(15);
  const [provisionStepIndex, setProvisionStepIndex] = useState(0);
  const [isProvisionDone, setIsProvisionDone] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const clientSuggestions = useMemo(() => {
    if (!existingClients) return [];
    const map = new Map<string, { name: string; phone?: string; company_name?: string }>();
    for (const c of existingClients) {
      const trimmedName = c.name?.trim();
      if (trimmedName && !map.has(trimmedName.toLowerCase())) {
        map.set(trimmedName.toLowerCase(), {
          name: trimmedName,
          phone: c.phone || undefined,
          company_name: c.company_name || undefined
        });
      }
    }
    return Array.from(map.values());
  }, [existingClients]);

  const filteredClientSuggestions = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q) return [];
    return clientSuggestions.filter(c => (c.name || '').toLowerCase().includes(q));
  }, [clientSuggestions, name]);

  // Duplicate Store Name detection on Drive & System
  const [driveMatch, setDriveMatch] = useState<CheckDriveFolderResult | null>(null);
  const [isCheckingDrive, setIsCheckingDrive] = useState(false);

  const isDuplicateInDb = useMemo(() => {
    const trimmed = companyName.trim().toLowerCase();
    if (!trimmed || !existingClients) return false;
    return existingClients.some(c => c.company_name?.trim().toLowerCase() === trimmed);
  }, [companyName, existingClients]);

  useEffect(() => {
    const trimmed = companyName.trim();
    if (!trimmed || trimmed.length < 2) {
      setDriveMatch(null);
      setIsCheckingDrive(false);
      return;
    }

    let isCancelled = false;
    setIsCheckingDrive(true);
    const handler = setTimeout(async () => {
      try {
        const res = await checkDriveFolder(trimmed);
        if (!isCancelled) {
          setDriveMatch(res.exists ? res : null);
        }
      } catch {
        if (!isCancelled) setDriveMatch(null);
      } finally {
        if (!isCancelled) setIsCheckingDrive(false);
      }
    }, 400);

    return () => {
      isCancelled = true;
      clearTimeout(handler);
    };
  }, [companyName]);

  const hasDuplicate = isDuplicateInDb || !!driveMatch?.exists;
  const duplicateDisplayName = driveMatch?.folder_name || companyName;

  // Delivery Deadline: Days and Date Picker
  const [deadlineDays, setDeadlineDays] = useState(2);
  const [deadlineDate, setDeadlineDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [deadlineHours, setDeadlineHours] = useState(48);

  const handleDaysChange = (days: number) => {
    const validDays = Math.max(1, days);
    setDeadlineDays(validDays);
    setDeadlineHours(validDays * 24);
    const d = new Date();
    d.setDate(d.getDate() + validDays);
    setDeadlineDate(d.toISOString().split('T')[0]);
  };

  const handleDateChange = (dateStr: string) => {
    setDeadlineDate(dateStr);
    if (!dateStr) return;
    const picked = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    picked.setHours(0, 0, 0, 0);
    const diffTime = picked.getTime() - now.getTime();
    const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
    setDeadlineDays(diffDays);
    setDeadlineHours(diffDays * 24);
  };

  // Subfolder Sharing State
  const [clientUploadsEnabled, setClientUploadsEnabled] = useState(true);
  const [clientUploadsShares, setClientUploadsShares] = useState<Array<{ id: string; email: string; role: 'reader' | 'writer' }>>([
    { id: '1', email: '', role: 'writer' } // Default to writer (محرر) for uploading files
  ]);

  const [teamDeliverablesEnabled, setTeamDeliverablesEnabled] = useState(false);
  const [teamDeliverablesShares, setTeamDeliverablesShares] = useState<Array<{ id: string; email: string; role: 'reader' | 'writer' }>>([
    { id: '1', email: '', role: 'reader' } // Default to reader (مشاهد) for deliverables
  ]);

  // Helper to find the actual Head or Employee of a specific department
  const findProperAssigneeForDept = (deptId: number, memberList: TeamMember[]): TeamMember | undefined => {
    // 1. Strictly look for Head of this department
    const headMem = memberList.find(m => 
      m.role_type === 'head' && 
      (m.department_id === deptId || m.department_ids?.includes(deptId))
    );
    if (headMem) return headMem;

    // 2. Otherwise look for an employee in this department
    const deptEmp = memberList.find(m => 
      m.role_type === 'employee' && 
      (m.department_id === deptId || m.department_ids?.includes(deptId))
    );
    if (deptEmp) return deptEmp;

    // 3. Fallback: non-admin member
    const otherNonAdmin = memberList.find(m => 
      m.role_type !== 'admin' && m.role_type !== 'super_admin' && m.role_type !== 'manager' &&
      (m.department_id === deptId || m.department_ids?.includes(deptId))
    );
    return otherNonAdmin || memberList[0];
  };

  // Groups
  const [groups, setGroups] = useState<DepartmentTaskGroup[]>(() => {
    const firstDept = departments[0];
    const deptId = firstDept ? firstDept.id : 1;
    const firstMem = findProperAssigneeForDept(deptId, members);
    return [
      {
        id: Math.random().toString(36).substring(2, 9),
        department_id: deptId,
        assigned_member_id: firstMem ? firstMem.id : 1,
        selected_services: firstDept?.services && firstDept.services.length > 0 ? [firstDept.services[0]] : [],
        custom_tasks: [],
        new_custom_input: '',
        notes: ''
      }
    ];
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (departments.length > 0 && members.length > 0) {
      setGroups(prev => prev.map(g => {
        const curMem = members.find(m => m.id === g.assigned_member_id);
        // If current assigned member is missing, or is Admin/Manager, reassign to the proper department head
        if (!curMem || curMem.role_type === 'admin' || curMem.role_type === 'manager' || curMem.role_type === 'super_admin') {
          const properMem = findProperAssigneeForDept(g.department_id, members);
          if (properMem) {
            return {
              ...g,
              assigned_member_id: properMem.id
            };
          }
        }
        return g;
      }));
    }
  }, [departments, members]);

  const getBrandSlug = () => {
    const fromUrl = extractBrandFromUrl(websiteUrl);
    if (fromUrl) return fromUrl;
    const cleanName = companyName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    return cleanName || (platform === 'سلة' ? 'sallastore' : 'zidstore');
  };

  const handlePlatformChange = (newPlatform: string) => {
    setPlatform(newPlatform);
    if (newPlatform === 'زد' || newPlatform === 'سلة') {
      if (!isEmailManuallyEdited || !agencyEmail) {
        const brand = getBrandSlug();
        setAgencyEmail(`info+${brand}@malamsa.com`);
      }
    } else {
      if (!isEmailManuallyEdited) {
        setAgencyEmail('');
      }
    }
  };

  useEffect(() => {
    if ((platform === 'زد' || platform === 'سلة') && !isEmailManuallyEdited) {
      const brand = getBrandSlug();
      if (brand) {
        setAgencyEmail(`info+${brand}@malamsa.com`);
      }
    }
  }, [platform, companyName, websiteUrl, isEmailManuallyEdited]);

  const handleCopyAgencyEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!agencyEmail) return;
    navigator.clipboard.writeText(agencyEmail);
    setCopiedAgencyEmail(true);
    setTimeout(() => setCopiedAgencyEmail(false), 2000);
  };

  const handleDepartmentChange = (groupId: string, deptId: number) => {
    const dept = departments.find(d => d.id === deptId);
    const properMem = findProperAssigneeForDept(deptId, members);

    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        department_id: deptId,
        assigned_member_id: properMem ? properMem.id : g.assigned_member_id,
        selected_services: dept?.services && dept.services.length > 0 ? [dept.services[0]] : [],
        custom_tasks: [],
        new_custom_input: '',
        is_other_open: false,
        task_descriptions: {}
      };
    }));
  };

  const handleAddDepartmentGroup = () => {
    const unusedDept = departments.find(d => !groups.some(g => Number(g.department_id) === Number(d.id))) || departments[0];
    const deptId = unusedDept ? unusedDept.id : 1;
    const properMem = findProperAssigneeForDept(deptId, members);

    // Place the new department at the TOP (beginning of array)
    setGroups(prev => [
      {
        id: Math.random().toString(36).substring(2, 9),
        department_id: deptId,
        assigned_member_id: properMem ? properMem.id : 1,
        selected_services: unusedDept?.services && unusedDept.services.length > 0 ? [unusedDept.services[0]] : [],
        custom_tasks: [],
        new_custom_input: '',
        is_other_open: false,
        notes: '',
        task_descriptions: {}
      },
      ...prev
    ]);
  };

  const handleRemoveDepartmentGroup = (groupId: string) => {
    if (groups.length <= 1) return;
    setGroups(prev => prev.filter(g => g.id !== groupId));
  };

  const handleToggleService = (groupId: string, serviceName: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const exists = g.selected_services.includes(serviceName);
      return {
        ...g,
        selected_services: exists
          ? g.selected_services.filter(s => s !== serviceName)
          : [...g.selected_services, serviceName]
      };
    }));
  };

  const handleToggleOther = (groupId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        is_other_open: !g.is_other_open
      };
    }));
  };

  const handleAddCustomTask = (groupId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const text = g.new_custom_input.trim();
      if (!text || g.custom_tasks.includes(text)) return g;
      return {
        ...g,
        custom_tasks: [...g.custom_tasks, text],
        new_custom_input: '',
        is_other_open: true
      };
    }));
  };

  const handleRemoveCustomTask = (groupId: string, taskText: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        custom_tasks: g.custom_tasks.filter(t => t !== taskText)
      };
    }));
  };

  const handleNext = () => {
    setErrorMessage(null);
    if (step === 1) {
      if (!companyName.trim()) {
        setErrorMessage('يرجى إدخال اسم المتجر (Store Name)');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setStep(1);
      setErrorMessage('يرجى إكمال بيانات المتجر الأساسية');
      return;
    }

    const assignments: NewClientAssignment[] = [];
    for (const g of groups) {
      const allTasks = [...g.selected_services, ...g.custom_tasks];
      if (g.new_custom_input.trim() && !allTasks.includes(g.new_custom_input.trim())) {
        allTasks.push(g.new_custom_input.trim());
      }

      const defaultDesc = g.notes.trim() || requestDetails.trim() || undefined;

      if (allTasks.length === 0) {
        const curDept = departments.find(d => Number(d.id) === Number(g.department_id));
        assignments.push({
          department_id: g.department_id,
          assigned_member_id: g.assigned_member_id,
          stage_name: `مهام ${curDept?.name_ar || 'القسم'}`,
          description: defaultDesc
        });
      } else {
        for (const t of allTasks) {
          assignments.push({
            department_id: g.department_id,
            assigned_member_id: g.assigned_member_id,
            stage_name: t,
            description: defaultDesc
          });
        }
      }
    }

    const finalPlatform = platform === 'other' ? customPlatform.trim() : platform;

    const folder_shares: FolderShareConfig[] = [];
    if (clientUploadsEnabled) {
      for (const s of clientUploadsShares) {
        if (s.email.trim()) {
          folder_shares.push({
            folder_type: 'client_uploads',
            email: s.email.trim(),
            role: s.role
          });
        }
      }
    }
    if (teamDeliverablesEnabled) {
      for (const s of teamDeliverablesShares) {
        if (s.email.trim()) {
          folder_shares.push({
            folder_type: 'team_deliverables',
            email: s.email.trim(),
            role: s.role
          });
        }
      }
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      setProvisionProgress(15);
      setProvisionStepIndex(0);
      setIsProvisionDone(false);

      let currProg = 15;
      let currStep = 0;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        currProg += Math.floor(Math.random() * 12) + 8;
        if (currProg >= 92) {
          currProg = 92;
        }
        if (currProg > 28 && currStep === 0) currStep = 1;
        if (currProg > 55 && currStep === 1) currStep = 2;
        if (currProg > 78 && currStep === 2) currStep = 3;

        setProvisionProgress(currProg);
        setProvisionStepIndex(currStep);
      }, 700);

      await onSubmitIntake({
        name: (name.trim() || companyName.trim()),
        company_name: companyName.trim(),
        phone: phone.trim() || undefined,
        store_id: storeId.trim() || undefined,
        package_name: packageName.trim() || undefined,
        created_at: createdAt ? new Date(createdAt).toISOString() : undefined,
        status: status.trim() || 'الطلبات المستلمة',
        platform: finalPlatform || undefined,
        service_type: serviceType.trim() || 'خدمة عامة',
        request_details: requestDetails.trim() || 'طلب تدشين عميل جديد',
        priority,
        target_deadline_hours: Number(deadlineHours),
        target_deadline: deadlineDate ? new Date(`${deadlineDate}T18:00:00`).toISOString() : undefined,
        website_url: websiteUrl.trim() || undefined,
        agency_email: agencyEmail.trim() || undefined,
        assignments,
        folder_shares,
        share_email: folder_shares[0]?.email || undefined,
        share_role: folder_shares[0]?.role || 'reader',
        drive_folder_url: undefined
      });

      if (timerRef.current) clearInterval(timerRef.current);
      setProvisionProgress(100);
      setProvisionStepIndex(4);
      setIsProvisionDone(true);

      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 }
      });

      setTimeout(() => {
        setLoading(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      if (timerRef.current) clearInterval(timerRef.current);
      console.error(err);
      setLoading(false);
      setErrorMessage(err.message || 'فشلت عملية إنشاء العميل، تم حفظ البيانات المدخلة لتتمكن من إعادة المحاولة.');
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={() => !loading && onClose()}
      maxWidth="3xl"
      title={loading ? 'تجهيز مساحة العمل السحابية' : 'تسجيل عميل جديد وتوزيع المهام'}
      description={
        loading
          ? 'جاري الربط السحابي مع Google Drive وتوليد الشيت والمهام'
          : 'إدخال بيانات المتجر، وإنشاء المجلدات السحابية وتوزيع خطة العمل على الأقسام'
      }
      icon={<Sparkles className="w-5 h-5 text-indigo-400" />}
      footer={
        loading ? null : (
          <div className="flex items-center justify-between w-full">
            <div>
              {step > 1 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setStep((step - 1) as any)}
                  disabled={loading}
                  icon={<ChevronRight className="w-4 h-4" />}
                >
                  السابق
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={loading}
              >
                إلغاء
              </Button>

              {step < 4 ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleNext}
                  icon={<ChevronLeft className="w-4 h-4" />}
                >
                  التالي
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  loading={loading}
                  onClick={handleSubmit}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500/30"
                >
                  تأكيد وحفظ العميل
                </Button>
              )}
            </div>
          </div>
        )
      }
    >
      {loading ? (
        /* Interactive Live Provisioning Loading Screen */
        <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-6 animate-fadeIn">
          {/* Animated Glowing Icon / Spinner */}
          <div className="relative flex items-center justify-center">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-500 shadow-2xl ${
              isProvisionDone 
                ? 'bg-emerald-500/20 border-2 border-emerald-500/60 text-emerald-400 shadow-emerald-500/30' 
                : 'bg-indigo-600/20 border-2 border-indigo-500/50 text-indigo-400 shadow-indigo-500/30 animate-pulse'
            }`}>
              {isProvisionDone ? (
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              ) : (
                <RefreshCw className="w-10 h-10 animate-spin text-indigo-400" />
              )}
            </div>
            {!isProvisionDone && (
              <div className="absolute inset-0 -m-3 border-2 border-dashed border-indigo-500/40 rounded-full animate-spin [animation-duration:9s]" />
            )}
          </div>

          {/* Title & Description */}
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-xl font-black text-white">
              {isProvisionDone ? '🎉 تم تجهيز المشروع السحابي بنجاح!' : 'جارٍ تجهيز مساحة العمل والربط السحابي...'}
            </h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              {isProvisionDone 
                ? 'تم إنشاء مجلدات Google Drive، وتوليد شيت الاستراتيجية، وتوزيع المهام'
                : `جاري الاتصال بـ Google Drive وتخصيص مساحة العمل السحابية لمتجر (${companyName})`}
            </p>
          </div>

          {/* Progress Bar with Percentage */}
          <div className="w-full max-w-md space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                معدل اكتمال التهيئة والربط
              </span>
              <span className="text-indigo-300 font-mono text-sm font-black">{provisionProgress}%</span>
            </div>
            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-500 ease-out shadow-sm"
                style={{ width: `${provisionProgress}%` }}
              />
            </div>
          </div>

          {/* Live Step Checklist */}
          <div className="w-full max-w-md bg-slate-900/90 rounded-2xl border border-slate-800 p-4 space-y-2.5 text-right">
            {[
              { title: 'إنشاء المجلد السحابي الرئيسي على Google Drive', desc: `مجلد سحابي مستقل باسم: ${companyName}` },
              { title: 'تهيئة مجلدات المواد وتسليمات الأقسام', desc: '01 - مرفقات العميل / 02 - تسليمات ومخرجات الفريق' },
              { title: 'توليد شيت المحددات واستراتيجية العميل (11 عامود)', desc: 'ربط مباشر بالشيت التفاعلي المخصص' },
              { title: 'منح الصلاحيات السحابية وتوزيع المهام على الفريق', desc: `توزيع ${groups.length} خطط عمل للأقسام المعنية` },
            ].map((st, idx) => {
              const isCompleted = isProvisionDone || provisionStepIndex > idx;
              const isCurrent = !isProvisionDone && provisionStepIndex === idx;

              return (
                <div 
                  key={idx} 
                  className={`flex items-start gap-3 p-2.5 rounded-xl transition-all ${
                    isCurrent 
                      ? 'bg-indigo-500/15 border border-indigo-500/40 text-white shadow-sm' 
                      : isCompleted 
                        ? 'bg-emerald-500/5 border border-emerald-500/20 text-slate-200' 
                        : 'text-slate-500 opacity-60 border border-transparent'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isCompleted ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center text-xs font-bold">
                        ✓
                      </div>
                    ) : isCurrent ? (
                      <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500 text-indigo-400 flex items-center justify-center text-xs animate-spin font-bold">
                        ⟳
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-slate-500 flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold">{st.title}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{st.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>يتم الآن تأمين البيانات ومزامنتها لحظياً بدون الحاجة لأي تدخل يدوي</span>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
        
        {/* Step Indicator */}
        <div className="flex items-center justify-between bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800 text-xs">
          {[
            { id: 1, label: '١. بيانات العميل والمتجر' },
            { id: 2, label: '٢. الأولوية ومجلد Drive' },
            { id: 3, label: '٣. مهام الأقسام' },
            { id: 4, label: '٤. مراجعة وتأكيد' }
          ].map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => s.id < step && setStep(s.id as any)}
              className={`flex-1 text-center py-1.5 rounded-xl font-bold transition-colors ${
                step === s.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : step > s.id
                  ? 'text-emerald-400 bg-emerald-500/10 cursor-pointer'
                  : 'text-slate-500'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Error message banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: Basic Info, Store, Platform & Custom Agency Email */}
        {step === 1 && (
          <div className="space-y-4 animate-fadeIn">
            {/* Two-Column Grid: Row-by-Row in RTL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Row 1: Right = Store Name, Left = Client Name */}
              <div>
                <Input
                  label="اسم المتجر (Store Name):"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="مثال: Malam"
                />
                {isCheckingDrive && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                    <span>جارٍ فحص الاسم على Google Drive...</span>
                  </div>
                )}
                {hasDuplicate && !isCheckingDrive && (
                  <div className="mt-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-start gap-2 animate-fadeIn shadow-sm">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">⚠️ تنبيه: الاسم ({duplicateDisplayName}) موجود بالفعل على Google Drive!</span>
                      <span className="text-[11px] text-amber-200/80 block mt-0.5 leading-relaxed">
                        يوجد مجلد مسجل مسبقاً بهذا الاسم على Drive. يمكنك تعديل الاسم لتجنب تكرار المجلدات السحابية.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <Input
                  label="اسم العميل المسؤول (اختياري):"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setShowNameSuggestions(true);
                  }}
                  onFocus={() => setShowNameSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowNameSuggestions(false), 250)}
                  placeholder="اسم الشخص المسؤول أو المالك (مثال: صالح، أحمد...)"
                  hint="إذا ترك فارغاً سيتم تعيين اسم المتجر تلقائياً"
                  icon={<User className="w-4 h-4 text-purple-400" />}
                />

                {/* Auto-suggest dropdown when matches found */}
                {showNameSuggestions && filteredClientSuggestions.length > 0 && (
                  <div 
                    className="absolute top-full left-0 right-0 mt-1 z-50 rounded-2xl bg-slate-900/95 border border-purple-500/40 shadow-2xl backdrop-blur-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-white/5 animate-fadeIn"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <div className="px-3.5 py-2 bg-purple-950/60 border-b border-purple-500/20 text-[11px] font-bold text-purple-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-purple-400" />
                        <span>عملاء سابقين مطابقين (اضغط لاختيار):</span>
                      </span>
                      <span className="text-[10px] text-purple-400/80">{filteredClientSuggestions.length} عميل</span>
                    </div>
                    {filteredClientSuggestions.map((sug) => (
                      <button
                        key={sug.name}
                        type="button"
                        onClick={() => {
                          setName(sug.name);
                          if (sug.phone && !phone) {
                            setPhone(sug.phone);
                          }
                          setShowNameSuggestions(false);
                        }}
                        className="w-full px-3.5 py-2.5 text-right hover:bg-purple-600/20 transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                              {sug.name}
                            </span>
                            {sug.company_name && (
                              <span className="block text-[10px] text-slate-400">
                                متجر سابق: {sug.company_name}
                              </span>
                            )}
                          </div>
                        </div>
                        {sug.phone && (
                          <span className="text-[11px] font-mono text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {sug.phone}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Row 2: Right = Store Platform, Left = Store Link */}
              <div>
                <Select
                  label="نوع منصة المتجر الإلكتروني:"
                  value={platform}
                  onChange={(e) => handlePlatformChange(e.target.value)}
                >
                  <option value="زد">منصة زد (Zid)</option>
                  <option value="سلة">منصة سلة (Salla)</option>
                  <option value="شوبيفاي">شوبيفاي (Shopify)</option>
                  <option value="other">منصة أخرى (مخصصة)</option>
                </Select>
                {platform === 'other' && (
                  <div className="mt-2">
                    <Input
                      label="اسم المنصة المخصصة:"
                      value={customPlatform}
                      onChange={(e) => setCustomPlatform(e.target.value)}
                      placeholder="مثال: متجر ماجنتو، أوبن كارت..."
                    />
                  </div>
                )}
              </div>

              <div>
                <Input
                  label="رابط موقع أو متجر العميل (اختياري):"
                  type="url"
                  dir="ltr"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="www.malam.com"
                  icon={<Globe className="w-4 h-4" />}
                  hint="يتم توليد إيميل الوكالة منه تلقائياً لمنصتي زد وسلة"
                />
              </div>

              {/* Row 3: Agency Email underneath Platform & Store Link */}
              <div className="md:col-span-2 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                    <Mail className="w-4 h-4 text-indigo-400" />
                    <span>إيميل الوكالة المخصص:</span>
                  </label>
                  {(platform === 'زد' || platform === 'سلة') ? (
                    <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/30 font-bold">
                      توليد تلقائي ({platform})
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
                      اختياري لبقية المنصات
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    dir="ltr"
                    value={agencyEmail}
                    onChange={(e) => {
                      setAgencyEmail(e.target.value);
                      setIsEmailManuallyEdited(true);
                    }}
                    placeholder="info+store@malamsa.com"
                    className="flex-1 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 placeholder:text-slate-500 text-xs sm:text-sm px-3.5 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono tracking-wide"
                  />
                  {(platform === 'زد' || platform === 'سلة') && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const brand = getBrandSlug();
                        setAgencyEmail(`info+${brand}@malamsa.com`);
                        setIsEmailManuallyEdited(false);
                      }}
                      icon={<RefreshCw className="w-3.5 h-3.5" />}
                      title="إعادة التوليد من الرابط أو اسم المتجر"
                    >
                      توليد
                    </Button>
                  )}
                  {agencyEmail && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleCopyAgencyEmail}
                      icon={copiedAgencyEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    >
                      {copiedAgencyEmail ? 'تم النسخ' : 'نسخ'}
                    </Button>
                  )}
                </div>

                <p className="text-[11px] text-slate-400">
                  {(platform === 'زد' || platform === 'سلة') 
                    ? `يتم توليده تلقائياً لمنصة ${platform} بناءً على الرابط أو اسم المتجر أعلاه، ويمكنك تعديله يدوياً وسيتم حفظه`
                    : 'يظل فارغاً لبقية المنصات، ويمكنك كتابته وتعديله يدوياً لحفظه'}
                </p>
              </div>

              {/* Row 4: Right = Service, Left = Package Name */}
              <div>
                <Input
                  label="الخدمة:"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  placeholder="مثال: تصميم وتطوير متجر متكامل"
                  hint="حقل نصي للخدمة - يمكنك كتابة أي خدمة أو تركها فارغة"
                />
              </div>

              <div>
                <Input
                  label="اسم الباقة:"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  placeholder="مثال: باقة التأسيس والنمو"
                  icon={<Package className="w-4 h-4 text-purple-400" />}
                />
              </div>

              {/* Row 5: Right = Store ID, Left = Phone */}
              <div>
                <Input
                  label="معرّف المتجر (Store ID):"
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  placeholder="مثال: 3183062"
                  icon={<Hash className="w-4 h-4 text-purple-400" />}
                />
              </div>

              <div>
                <Input
                  label="رقم هاتف العميل:"
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="مثال: +966590875138"
                  icon={<Phone className="w-4 h-4 text-purple-400" />}
                />
              </div>

              {/* Row 6: Right = Stage (Free Text Input, EMPTY by default!), Left = Created At */}
              <div>
                <Input
                  label="المرحلة:"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  placeholder="مثال: الطلبات المستلمة"
                  hint="حقل نصي للمرحلة (اتركه فارغاً أو اكتب المرحلة)"
                />
              </div>

              <div>
                <Input
                  label="تاريخ الإنشاء:"
                  type="date"
                  value={createdAt}
                  onChange={(e) => setCreatedAt(e.target.value)}
                  icon={<Calendar className="w-4 h-4 text-purple-400" />}
                />
              </div>

              {/* Row 7: Request Content (Full Width) */}
              <div className="md:col-span-2">
                <Textarea
                  label="المحتوى (تفاصيل ومتطلبات الطلب):"
                  value={requestDetails}
                  onChange={(e) => setRequestDetails(e.target.value)}
                  placeholder="اكتب هنا محتوى الطلب، التفاصيل، أو N/A..."
                  rows={2}
                />
              </div>

            </div>
          </div>
        )}

        {/* STEP 2: Priority & Google Drive */}
        {step === 2 && (
          <div className="space-y-4 animate-fadeIn">
            {/* Priority and Delivery Deadline Section */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white mb-0.5">درجة الأولوية ومهلة التسليم</h3>
                  <p className="text-xs text-slate-400">حدد درجة أهمية المشروع وتاريخ أو مدة التسليم المطلوبة</p>
                </div>
                <div className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                  {deadlineDays === 1 ? 'يوم واحد' : deadlineDays === 2 ? 'يومين' : `${deadlineDays} أيام`}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Select
                  label="درجة الأولوية:"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                >
                  <option value="urgent">طارئ جداً</option>
                  <option value="high">عالية</option>
                  <option value="medium">متوسطة</option>
                  <option value="low">منخفضة</option>
                </Select>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="المهلة (بالأيام):"
                      type="number"
                      min={1}
                      max={90}
                      value={deadlineDays}
                      onChange={(e) => handleDaysChange(Number(e.target.value))}
                      icon={<Clock className="w-4 h-4 text-purple-400" />}
                    />
                    <Input
                      label="تاريخ التسليم (التقويم):"
                      type="date"
                      value={deadlineDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => handleDateChange(e.target.value)}
                      icon={<Calendar className="w-4 h-4 text-purple-400" />}
                    />
                  </div>

                  {/* Preset quick buttons & dynamic delivery indicator */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 5, 7, 14].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handleDaysChange(d)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                            deadlineDays === d
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'bg-white/5 hover:bg-white/10 text-slate-300'
                          }`}
                        >
                          {d === 1 ? 'يوم' : d === 2 ? 'يومين' : `${d} أيام`}
                        </button>
                      ))}
                    </div>
                    <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      📅 {new Date(deadlineDate).toLocaleDateString('ar-EG', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cloud Drive & Independent Subfolders Access */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-0.5">الربط السحابي ومشاركة مجلدات Google Drive</h3>
                <p className="text-xs text-slate-400">حدد الموظفين المصرح لهم بالوصول إلى مجلدات العمل والمخرجات ومرفقات العميل</p>
              </div>

              {/* TWO SUBFOLDERS ACCESS CONFIGURATION */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                
                {/* SUBFOLDER 1: مرفقات ومواد العميل */}
                <div className={`p-3.5 rounded-2xl border transition-all space-y-3 ${
                  clientUploadsEnabled 
                    ? 'bg-indigo-950/20 border-indigo-500/40 shadow-lg shadow-indigo-950/30' 
                    : 'bg-slate-900/50 border-slate-800 opacity-60'
                }`}>
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                        <Folder className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">01 - مرفقات ومواد العميل</h4>
                        <span className="text-[10px] text-indigo-300">مجلد رفع ملفات وهوية العميل</span>
                      </div>
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={clientUploadsEnabled}
                        onChange={(e) => setClientUploadsEnabled(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-800 border-slate-700 cursor-pointer"
                      />
                      <span className="text-xs text-slate-300 font-medium">مشاركة المجلد</span>
                    </label>
                  </div>

                  {clientUploadsEnabled && (
                    <div className="space-y-2.5 animate-fadeIn">
                      
                      {/* Team Member Quick Add Dropdown */}
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-300 font-bold block">منح صلاحية لموظف من الفريق:</label>
                        <select
                          className="w-full bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-2.5 py-2 focus:outline-none focus:border-indigo-500 font-bold cursor-pointer"
                          defaultValue=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              if (!clientUploadsShares.some(s => (s.email || '').toLowerCase() === val.toLowerCase())) {
                                setClientUploadsShares(prev => [...prev, { id: Math.random().toString(36).substring(2, 9), email: val, role: 'writer' }]);
                              }
                              e.target.value = '';
                            }
                          }}
                        >
                          <option value="" disabled>➕ اختر موظفاً لإضافته للمرفقات...</option>
                          {members.filter(m => m.email && m.email.trim()).map(m => (
                            <option key={m.id} value={m.email}>
                              👤 {m.name} ({m.role || 'عضو'}) — {m.email}
                            </option>
                          ))}
                        </select>
                      </div>

                      {clientUploadsShares.map((share) => {
                        const matchedMember = members.find(m => (m.email || '').toLowerCase() === (share.email || '').toLowerCase());

                        return (
                          <div key={share.id} className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                            {matchedMember && (
                              <div className="flex items-center gap-1.5 text-[10px] text-indigo-300 font-bold">
                                <span>👤</span>
                                <span>{matchedMember.name} ({matchedMember.role})</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <Input
                                  type="email"
                                  dir="ltr"
                                  value={share.email}
                                  onChange={(e) => {
                                    const newEmail = e.target.value;
                                    setClientUploadsShares(prev => prev.map(s => s.id === share.id ? { ...s, email: newEmail } : s));
                                  }}
                                  placeholder="client@gmail.com أو بريد موظف"
                                />
                              </div>
                              <div className="w-32">
                                <Select
                                  value={share.role}
                                  onChange={(e) => {
                                    const newRole = e.target.value as 'reader' | 'writer';
                                    setClientUploadsShares(prev => prev.map(s => s.id === share.id ? { ...s, role: newRole } : s));
                                  }}
                                >
                                  <option value="writer">محرر (رفع وتعديل)</option>
                                  <option value="reader">مشاهد (عرض فقط)</option>
                                </Select>
                              </div>
                              <button
                                type="button"
                                onClick={() => setClientUploadsShares(prev => prev.filter(s => s.id !== share.id))}
                                className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-colors cursor-pointer shrink-0"
                                title="إلغاء هذا البريد"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => setClientUploadsShares(prev => [
                          ...prev,
                          { id: Math.random().toString(36).substring(2, 9), email: '', role: 'writer' }
                        ])}
                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 pt-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ إضافة بريد يدوي (للعميل أو خارجي)</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* SUBFOLDER 2: مخرجات وشغل الفريق */}
                <div className={`p-3.5 rounded-2xl border transition-all space-y-3 ${
                  teamDeliverablesEnabled 
                    ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-950/30' 
                    : 'bg-slate-900/50 border-slate-800 opacity-60'
                }`}>
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        <Folder className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">02 - مخرجات وشغل الفريق</h4>
                        <span className="text-[10px] text-emerald-300">مجلد التصاميم والتسليمات</span>
                      </div>
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={teamDeliverablesEnabled}
                        onChange={(e) => setTeamDeliverablesEnabled(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-0 bg-slate-800 border-slate-700 cursor-pointer"
                      />
                      <span className="text-xs text-slate-300 font-medium">مشاركة المجلد</span>
                    </label>
                  </div>

                  {teamDeliverablesEnabled && (
                    <div className="space-y-2.5 animate-fadeIn">
                      
                      {/* Team Member Quick Add Dropdown */}
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-300 font-bold block">منح صلاحية لموظف من الفريق:</label>
                        <select
                          className="w-full bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-2.5 py-2 focus:outline-none focus:border-emerald-500 font-bold cursor-pointer"
                          defaultValue=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              if (!teamDeliverablesShares.some(s => (s.email || '').toLowerCase() === val.toLowerCase())) {
                                setTeamDeliverablesShares(prev => [...prev, { id: Math.random().toString(36).substring(2, 9), email: val, role: 'writer' }]);
                              }
                              e.target.value = '';
                            }
                          }}
                        >
                          <option value="" disabled>➕ اختر موظفاً لإضافته للمخرجات...</option>
                          {members.filter(m => m.email && m.email.trim()).map(m => (
                            <option key={m.id} value={m.email}>
                              👤 {m.name} ({m.role || 'عضو'}) — {m.email}
                            </option>
                          ))}
                        </select>
                      </div>

                      {teamDeliverablesShares.map((share) => {
                        const matchedMember = members.find(m => (m.email || '').toLowerCase() === (share.email || '').toLowerCase());

                        return (
                          <div key={share.id} className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                            {matchedMember && (
                              <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 font-bold">
                                <span>👤</span>
                                <span>{matchedMember.name} ({matchedMember.role})</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <Input
                                  type="email"
                                  dir="ltr"
                                  value={share.email}
                                  onChange={(e) => {
                                    const newEmail = e.target.value;
                                    setTeamDeliverablesShares(prev => prev.map(s => s.id === share.id ? { ...s, email: newEmail } : s));
                                  }}
                                  placeholder="client@gmail.com أو بريد موظف"
                                />
                              </div>
                              <div className="w-32">
                                <Select
                                  value={share.role}
                                  onChange={(e) => {
                                    const newRole = e.target.value as 'reader' | 'writer';
                                    setTeamDeliverablesShares(prev => prev.map(s => s.id === share.id ? { ...s, role: newRole } : s));
                                  }}
                                >
                                  <option value="writer">محرر (رفع وتعديل)</option>
                                  <option value="reader">مشاهد (عرض فقط)</option>
                                </Select>
                              </div>
                              <button
                                type="button"
                                onClick={() => setTeamDeliverablesShares(prev => prev.filter(s => s.id !== share.id))}
                                className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-colors cursor-pointer shrink-0"
                                title="إلغاء هذا البريد"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => setTeamDeliverablesShares(prev => [
                          ...prev,
                          { id: Math.random().toString(36).substring(2, 9), email: '', role: 'reader' }
                        ])}
                        className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 pt-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ إضافة بريد يدوي (للعميل أو خارجي)</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Department Tasks & Dispatch */}
        {step === 3 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">توزيع خطة العمل على الأقسام</h3>
                <p className="text-xs text-slate-400">حدد الأقسام المعنية والموظفين المسند إليهم لكل قسم</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={handleAddDepartmentGroup}
              >
                إضافة قسم آخر
              </Button>
            </div>

            <div className="space-y-3.5">
              {groups.map((group, idx) => {
                const curDept = departments.find(d => Number(d.id) === Number(group.department_id));

                return (
                  <div
                    key={group.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 relative"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-xs text-white">
                          {curDept?.name_ar || `القسم رقم ${idx + 1}`}
                        </span>
                      </div>
                      {groups.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDepartmentGroup(group.id)}
                          className="text-slate-400 hover:text-rose-400 p-1 text-xs"
                          title="حذف هذا القسم"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Select
                        label="اختر القسم المسؤول:"
                        value={group.department_id}
                        onChange={(e) => handleDepartmentChange(group.id, Number(e.target.value))}
                      >
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name_ar} ({d.name_en})</option>
                        ))}
                      </Select>

                      {(() => {
                        const deptId = Number(group.department_id);
                        const curDeptHead = members.find(m => {
                          const mRole = m.role || '';
                          return (m.department_id === deptId || m.department_ids?.includes(deptId)) && 
                            (m.role_type === 'head' || mRole.toLowerCase().includes('head') || mRole.includes('رئيس'));
                        });
                        // Actual specialist employees belonging to this department
                        const deptEmployees = members.filter(m => 
                          m.role_type === 'employee' &&
                          (m.department_id === deptId || m.department_ids?.includes(deptId)) && 
                          m.id !== curDeptHead?.id
                        );

                        return (
                          <Select
                            label="المكلف بالمهمة (رئيس القسم أو موظف مباشر):"
                            value={group.assigned_member_id}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setGroups(prev => prev.map(g => g.id === group.id ? { ...g, assigned_member_id: val } : g));
                            }}
                          >
                            {curDeptHead && (
                              <optgroup label={`⭐ رئيس قسم ${curDept?.name_ar || ''} (يستلمها لتوزيعها لاحقاً):`}>
                                <option value={curDeptHead.id}>
                                  👑 {curDeptHead.name} (رئيس القسم - Head)
                                </option>
                              </optgroup>
                            )}
                            <optgroup label={`👤 موظفو ${curDept?.name_ar || 'هذا القسم'} (إسناد مباشر):`}>
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
                          </Select>
                        );
                      })()}
                    </div>

                    {/* Predefined services checklist + Other Button */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-xs font-bold text-slate-300 block">مهام وخدمات القسم المتاحة:</span>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {curDept?.services?.map((srv, sIdx) => {
                          const isSelected = group.selected_services.includes(srv);
                          return (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() => handleToggleService(group.id, srv)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                                isSelected
                                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                              }`}
                            >
                              {isSelected ? '✓ ' : '+ '}
                              {srv}
                            </button>
                          );
                        })}

                        {/* Other (+ أخرى) Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleOther(group.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center gap-1 ${
                            group.is_other_open || group.custom_tasks.length > 0
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                              : 'bg-slate-950 text-slate-400 border-dashed border-slate-700 hover:text-amber-300 hover:border-amber-500/40'
                          }`}
                        >
                          <span>+</span>
                          <span>أخرى (Other)</span>
                        </button>
                      </div>
                    </div>

                    {/* Custom tasks input drawer (shows when is_other_open or has custom tasks) */}
                    {(group.is_other_open || group.custom_tasks.length > 0) && (
                      <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-300 block">إضافة مهمة مخصصة (Other Task):</span>
                          <button
                            type="button"
                            onClick={() => handleToggleOther(group.id)}
                            className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
                          >
                            {group.is_other_open ? 'إخفاء الحقل' : 'فتح الحقل'}
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={group.new_custom_input}
                            onChange={(e) => {
                              const val = e.target.value;
                              setGroups(prev => prev.map(g => g.id === group.id ? { ...g, new_custom_input: val } : g));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCustomTask(group.id);
                              }
                            }}
                            placeholder="اكتب اسم المهمة واضغط Enter أو إضافة..."
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            autoFocus={group.is_other_open}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddCustomTask(group.id)}
                          >
                            + إضافة
                          </Button>
                        </div>

                        {group.custom_tasks.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {group.custom_tasks.map((ct, ctIdx) => (
                              <span
                                key={ctIdx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-200 border border-amber-500/30"
                              >
                                <span>{ct}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomTask(group.id, ct)}
                                  className="text-amber-300 hover:text-rose-400 cursor-pointer font-bold"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Unified Department Tasks Description & Brief Box */}
                    <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <span>💬</span>
                          <span>شرح وتوجيهات وملاحظات العمل لهذا القسم (اختياري):</span>
                        </label>
                        <span className="text-[10px] text-slate-400">ستصل هذه التوجيهات للموظف ورئيس القسم</span>
                      </div>
                      <Textarea
                        rows={2}
                        value={group.notes}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGroups(prev => prev.map(g => g.id === group.id ? { ...g, notes: val } : g));
                        }}
                        placeholder="مثال: التركيز على هوية المتجر واستخدام نصوص تسويقية مميزة وفق خطة العمل المعتمدة..."
                        className="w-full text-xs"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: Summary & Confirmation */}
        {step === 4 && (
          <div className="space-y-4 animate-fadeIn">
            {hasDuplicate && (
              <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-start gap-2.5 animate-fadeIn shadow-sm">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-sm block text-amber-200">⚠️ تنبيه: اسم المتجر ({duplicateDisplayName}) موجود مسبقاً على Google Drive!</span>
                  <span className="text-xs text-amber-300/80 block mt-1 leading-relaxed">
                    يوجد مجلد سابق مسجل بنفس هذا الاسم على Drive. يمكنك الرجوع للخطوة الأولى لتعديل الاسم إذا كنت ترغب في تجنب تكرار المجلدات.
                  </span>
                </div>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-slate-200 space-y-2.5">
              <h3 className="font-black text-sm text-indigo-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>ملخص بيانات العميل قبل الحفظ والتجهيز:</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-slate-300">
                <div>
                  <span className="text-slate-400 block text-[11px]">اسم المتجر:</span>
                  <strong className="text-white">{companyName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">اسم العميل المسؤول:</span>
                  <strong className="text-slate-200">{name || companyName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">المنصة:</span>
                  <strong className="text-white">{platform === 'other' ? customPlatform || 'أخرى' : platform}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">إيميل الوكالة:</span>
                  <strong className="text-indigo-300 font-mono text-[11px] truncate block">{agencyEmail || 'غير محدد'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">رابط الموقع:</span>
                  {websiteUrl ? (
                    <a
                      href={websiteUrl.startsWith('http://') || websiteUrl.startsWith('https://') ? websiteUrl : `https://${websiteUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 underline font-mono text-[11px] truncate block"
                      dir="ltr"
                    >
                      {websiteUrl}
                    </a>
                  ) : (
                    <strong className="text-slate-500">غير محدد</strong>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">اسم الباقة:</span>
                  <strong className="text-slate-300">{packageName || 'غير محدد'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">رقم الهاتف:</span>
                  <strong className="text-slate-300 font-mono">{phone || 'غير محدد'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">المرحلة:</span>
                  <strong className="text-emerald-400">{status || 'غير محدد'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">الأولوية:</span>
                  <PriorityBadge priority={priority} />
                </div>
              </div>

              {requestDetails && requestDetails.trim() && (
                <div className="pt-2 border-t border-indigo-500/20 mt-1">
                  <span className="text-slate-400 block text-[11px] font-bold mb-1">المحتوى إن وجد:</span>
                  <p className="text-slate-200 text-[11px] bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 whitespace-pre-wrap leading-relaxed max-h-24 overflow-y-auto">
                    {requestDetails}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <span className="text-xs font-bold text-slate-300 block">الأقسام والمهام التي سيتم توزيعها:</span>
              <ul className="space-y-1.5 text-slate-300">
                {groups.map((g, idx) => {
                  const curDept = departments.find(d => Number(d.id) === Number(g.department_id));
                  const mem = members.find(m => m.id === g.assigned_member_id);
                  const tasksCount = g.selected_services.length + g.custom_tasks.length;
                  return (
                    <li key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="font-bold text-white">{curDept?.name_ar}: {tasksCount} مهام</span>
                      <span className="text-slate-400">المكلف: {mem?.name || 'غير محدد'}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

      </div>
      )}
    </Modal>
  );
};
