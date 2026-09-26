import React, { useState, useMemo, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, Clock, FolderGit2, 
  Search, ShieldCheck, Building2,
  ExternalLink, Layers, Check, RotateCcw,
  Palette, Camera, Code, FileText, Megaphone, Target, Briefcase, Monitor,
  Plus, ChevronDown, ChevronUp, Edit, AlertTriangle, Info, User, Calendar, Trash2
} from 'lucide-react';
import type { Client, Department, SystemKPIs, TeamMember, TaskStage } from '../types';
import { EditClientModal } from './EditClientModal';
import { DepartmentDetailsModal } from './DepartmentDetailsModal';
import { ClientHierarchyTree } from './ClientHierarchyTree';
import { Button } from './ui/Button';
import { Card, CardBody } from './ui/Card';
import { StatusBadge } from './ui/StatusBadge';
import { PriorityBadge } from './ui/PriorityBadge';
import { Modal } from './ui/Modal';
import { Textarea } from './ui/Textarea';
import { EmptyState } from './ui/EmptyState';

const getDepartmentIcon = (nameAr: string, iconName?: string) => {
  const n = (nameAr || '').toLowerCase();
  const ic = (iconName || '').toLowerCase();
  if (ic === 'camera' || n.includes('تصوير') || n.includes('مرئي') || n.includes('فيديو')) return <Camera className="w-4 h-4" />;
  if (ic === 'palette' || n.includes('تصميم') || n.includes('جرافيك') || n.includes('هوية')) return <Palette className="w-4 h-4" />;
  if (ic === 'code' || n.includes('برمج') || n.includes('متاجر') || n.includes('مواقع')) return <Code className="w-4 h-4" />;
  if (ic === 'megaphone' || n.includes('إعلان') || n.includes('ممولة') || n.includes('performance')) return <Megaphone className="w-4 h-4" />;
  if (ic === 'filetext' || n.includes('محتوى') || n.includes('سوشيال') || n.includes('أفكار')) return <FileText className="w-4 h-4" />;
  if (ic === 'target' || n.includes('استراتيج') || n.includes('استشار')) return <Target className="w-4 h-4" />;
  if (ic === 'briefcase' || n.includes('إدارة العملاء') || n.includes('عمليات')) return <Briefcase className="w-4 h-4" />;
  if (ic === 'monitor' || n.includes('واجهات') || n.includes('مستخدم')) return <Monitor className="w-4 h-4" />;
  return <Building2 className="w-4 h-4" />;
};

interface AdminDashboardProps {
  clients: Client[];
  departments: Department[];
  members: TeamMember[];
  kpis: SystemKPIs | null;
  onOpenDriveModal: (client: Client) => void;
  onOpenBriefModal?: (client: Client) => void;
  onOpenNewClientModal: (clientName?: string) => void;
  onUpdateClient: (clientId: number, data: any) => Promise<void>;
  onDeleteClient?: (clientId: number) => Promise<void>;
  onAddAssignment: (clientId: number, data: any) => Promise<void>;
  onUpdateAssignment: (clientId: number, stageId: number, data: any) => Promise<void>;
  onDeleteAssignment: (clientId: number, stageId: number) => Promise<void>;
  onReviewTaskStage?: (stageId: number, action: 'approve' | 'request_revision', notes?: string) => Promise<void>;
  onOpenHistoryModal?: (stage: TaskStage, client?: Client) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  clients,
  departments,
  members,
  kpis,
  onOpenDriveModal,
  onOpenBriefModal,
  onOpenNewClientModal,
  onUpdateClient,
  onDeleteClient,
  onAddAssignment,
  onUpdateAssignment,
  onDeleteAssignment,
  onReviewTaskStage,
  onOpenHistoryModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');
  const [expandSignal, setExpandSignal] = useState(0);
  const [selectedClientToEdit, setSelectedClientToEdit] = useState<Client | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [expandedClientIds, setExpandedClientIds] = useState<Set<number>>(new Set());

  // Delete project target state
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !onDeleteClient) return;
    try {
      setIsDeleting(true);
      await onDeleteClient(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err: any) {
      alert(err.message || 'فشل حذف العميل والمشروع');
    } finally {
      setIsDeleting(false);
    }
  };

  // Sync with Master Bar expand/collapse all
  useEffect(() => {
    if (expandSignal > 0) {
      setExpandedClientIds(new Set(clients.map(c => c.id)));
    } else if (expandSignal < 0) {
      setExpandedClientIds(new Set());
    }
  }, [expandSignal, clients]);

  // Keep selectedClientToEdit synced with fresh clients array
  useEffect(() => {
    if (selectedClientToEdit) {
      const fresh = clients.find(c => c.id === selectedClientToEdit.id);
      if (fresh) {
        setSelectedClientToEdit(fresh);
      }
    }
  }, [clients]);

  const toggleClientExpansion = (clientId: number) => {
    setExpandedClientIds(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const clientCounts = useMemo(() => {
    const total = clients.length;
    const active = clients.filter(c => c.status !== 'completed').length;
    const completed = clients.filter(c => c.status === 'completed').length;
    const urgent = clients.filter(c => c.priority === 'urgent').length;
    return { total, active, completed, urgent };
  }, [clients]);

  // Review states
  const [selectedStageForRevision, setSelectedStageForRevision] = useState<{ client: Client; stage: TaskStage } | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

  // Collect tasks requiring direct Management/Admin review:
  // 1. Direct management tasks (assigned by admin/manager directly to an employee or head)
  // 2. Tasks where the department has NO Head
  // 3. Tasks submitted by the Head themselves
  const pendingReviews = useMemo(() => {
    const list: { client: Client; stage: TaskStage }[] = [];
    clients.forEach(c => {
      c.stages?.forEach(s => {
        if (s.status === 'under_review') {
          const assigner = s.assigned_by || members.find(m => m.id === s.assigned_by_id);
          const isAssignedByManagement = assigner 
            ? (assigner.role_type === 'admin' || assigner.role_type === 'manager' || assigner.role_type === 'super_admin') 
            : false;
          
          const deptHead = members.find(m => 
            (m.role_type === 'head' || m.role?.toLowerCase().includes('head') || m.role?.includes('رئيس')) &&
            (m.department_id === s.department_id || (m.department_ids && m.department_ids.includes(s.department_id)))
          );
          
          const isSubmittedByHead = deptHead && s.assigned_member_id === deptHead.id;
          const hasNoDeptHead = !deptHead;
          const isDirectManagement = isAssignedByManagement && (!deptHead || s.assigned_by_id !== deptHead.id);

          // If no dept head, or submitted by head, or assigned directly by management -> goes to Admin/Manager!
          if (hasNoDeptHead || isSubmittedByHead || isDirectManagement || !s.assigned_by_id) {
            list.push({ client: c, stage: s });
          }
        }
      });
    });
    return list;
  }, [clients, members]);

  const handleApproveStage = async (stageId: number) => {
    if (!onReviewTaskStage) return;
    try {
      await onReviewTaskStage(stageId, 'approve');
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStageForRevision || !onReviewTaskStage) return;
    if (!revisionNotes.trim()) {
      alert('يرجى كتابة ملاحظات وتوجيهات التعديل للموظف');
      return;
    }
    try {
      setIsSubmittingRevision(true);
      await onReviewTaskStage(selectedStageForRevision.stage.id, 'request_revision', revisionNotes);
      setSelectedStageForRevision(null);
      setRevisionNotes('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.service_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'urgent' ? c.priority === 'urgent' : c.status === statusFilter);
    return matchesSearch && matchesStatus;
  });

  const activeClientsCount = kpis?.active_clients ?? clients.filter(c => c.status !== 'completed').length;
  const completedClientsCount = kpis?.completed_clients ?? clients.filter(c => c.status === 'completed').length;
  const totalClientsCount = kpis?.total_clients ?? clients.length;
  const slaRate = kpis?.on_time_sla_rate ?? 100;
  const avgHours = kpis?.avg_completion_hours ?? 0;

  const uniqueClientsCount = useMemo(() => {
    return new Set(clients.map(c => c.name.trim().toLowerCase())).size;
  }, [clients]);

  const departmentWorkloads = useMemo(() => {
    if (kpis?.department_workloads && kpis.department_workloads.length > 0) {
      return kpis.department_workloads;
    }
    return departments.map(dep => {
      let active_t = 0;
      let comp_t = 0;
      clients.forEach(c => {
        c.stages?.forEach(s => {
          if (s.department_id === dep.id) {
            if (s.status === 'completed') comp_t++;
            else active_t++;
          }
        });
      });
      const memCount = members.filter(m => m.department_ids?.includes(dep.id) || m.department_id === dep.id).length;
      return {
        department_id: dep.id,
        name_ar: dep.name_ar,
        name_en: dep.name_en,
        color: dep.color,
        icon: dep.icon,
        total_active_tasks: active_t,
        total_completed_tasks: comp_t,
        assigned_members_count: memCount
      };
    });
  }, [kpis, departments, clients, members]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* 🔔 0. Prominent Top Alert Banner: Direct Management Review Queue */}
      {pendingReviews.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/40 border-2 border-amber-500/50 p-5 sm:p-6 shadow-2xl shadow-amber-500/15 animate-in fade-in duration-300">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          
          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center animate-pulse shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2.5">
                    <span>🔔 يتطلب انتباه الإدارة: طابور الاعتماد والمراجعة للتكليفات المباشرة</span>
                    <span className="px-3 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-sm">
                      {pendingReviews.length} {pendingReviews.length === 1 ? 'مهمة تنتظر قرارك' : 'مهام تنتظر قرارك'}
                    </span>
                  </h2>
                  <p className="text-xs text-amber-200/80 mt-0.5 font-medium">
                    مهام منجزة تم تسليمها من الموظفين مسندة بتكليف إداري مباشر، وتنتظر قرارك بالاعتماد النهائي أو طلب تعديل
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 pt-1">
              {pendingReviews.map(({ client, stage }) => {
                const assignedMember = stage.assigned_member || members.find(m => m.id === stage.assigned_member_id);
                const dept = departments.find(d => d.id === stage.department_id);

                return (
                  <div
                    key={stage.id}
                    className="bg-slate-900/90 rounded-xl border border-amber-500/30 p-4 flex flex-col justify-between space-y-3.5 hover:border-amber-500/60 transition-all shadow-lg shadow-black/40"
                  >
                    {/* Header */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-white truncate flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          {client.company_name}
                        </span>
                        {dept && (
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white shrink-0"
                            style={{ backgroundColor: dept.color ? `${dept.color}33` : '#6366f133', color: dept.color || '#818cf8', borderColor: dept.color ? `${dept.color}66` : '#6366f166' }}
                          >
                            {dept.name_ar}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-amber-100 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                        {stage.stage_name}
                      </p>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>العميل: {client.name}</span>
                        <span>•</span>
                        <span className="text-indigo-300 font-semibold">الموظف: {assignedMember?.name || 'غير مسند'}</span>
                      </div>
                    </div>

                    {/* Deliverable Notes & URL */}
                    <div className="space-y-2 bg-slate-950/70 rounded-lg p-2.5 border border-slate-800 text-xs">
                      {stage.deliverable_note ? (
                        <div className="text-slate-300 text-[11px] leading-relaxed">
                          <span className="text-slate-400 font-bold block mb-0.5">ملاحظات التسليم من الموظف:</span>
                          &quot;{stage.deliverable_note}&quot;
                        </div>
                      ) : (
                        <div className="text-slate-300 text-[11px] italic">تم التسليم بدون ملاحظات إضافية</div>
                      )}

                      {stage.deliverable_url && (
                        <a
                          href={stage.deliverable_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 underline underline-offset-2 break-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          معاينة رابط المخرج والتسليم ↗
                        </a>
                      )}
                    </div>

                    {/* Quick Review Actions */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                      <Button
                        size="sm"
                        variant="primary"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-1.5"
                        icon={<Check className="w-3.5 h-3.5" />}
                        onClick={() => handleApproveStage(stage.id)}
                      >
                        اعتماد فوري
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30 text-xs font-bold py-1.5"
                        icon={<RotateCcw className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setSelectedStageForRevision({ client, stage });
                          setRevisionNotes('');
                        }}
                      >
                        طلب تعديل
                      </Button>
                      {onOpenHistoryModal && (
                        <button
                          type="button"
                          onClick={() => onOpenHistoryModal(stage, client)}
                          title="عرض السجل الزمني للمهمة"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 1. Executive KPIs Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Total Companies & Projects */}
        <Card className="hover:border-slate-700 transition-colors">
          <CardBody className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium block">إجمالي الشركات والمشاريع</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-white">{totalClientsCount}</span>
                <span className="text-[11px] text-slate-400">شركة ومؤسسة</span>
              </div>
              <span className="text-[10px] text-indigo-300 block mt-0.5 font-bold">
                تابعة لـ {uniqueClientsCount} عملاء رئيسيين
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
          </CardBody>
        </Card>

        {/* Active Projects */}
        <Card className="hover:border-slate-700 transition-colors">
          <CardBody className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium block">المشاريع الجارية</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-amber-400">{activeClientsCount}</span>
                <span className="text-[11px] text-amber-300/80">قيد التنفيذ</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </CardBody>
        </Card>

        {/* Completed Projects */}
        <Card className="hover:border-slate-700 transition-colors">
          <CardBody className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium block">المشاريع المنجزة</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-emerald-400">{completedClientsCount}</span>
                <span className="text-[11px] text-emerald-300/80">تم التسليم</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardBody>
        </Card>

        {/* SLA Rate */}
        <Card className="hover:border-slate-700 transition-colors">
          <CardBody className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium block">الالتزام بالموعد (SLA)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-indigo-300">{slaRate}%</span>
                {avgHours > 0 && (
                  <span className="text-[10px] text-slate-400">({avgHours} ساعة/مشروع)</span>
                )}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 2. Department Performance & Workloads */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-indigo-400" />
              <span>مؤشرات أداء الأقسام</span>
            </h2>
            <span className="text-xs text-slate-400 hidden sm:inline">(اضغط على أي قسم لعرض كوادره ومهامه بالتفصيل)</span>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            إجمالي {departmentWorkloads.length} أقسام إنتاجية
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {departmentWorkloads.map(dep => (
            <button
              key={dep.department_id}
              type="button"
              onClick={() => setSelectedDeptId(dep.department_id)}
              className="text-right p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 transition-all cursor-pointer group flex flex-col justify-between space-y-3 shadow-sm relative overflow-hidden"
              style={{ borderTop: `3px solid ${dep.color || '#6366f1'}` }}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  dep.total_active_tasks > 0 
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' 
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {dep.total_active_tasks} نشط
                </span>
                <div 
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform border"
                  style={{
                    backgroundColor: (dep.color || '#6366f1') + '20',
                    color: dep.color || '#818cf8',
                    borderColor: (dep.color || '#6366f1') + '40'
                  }}
                >
                  {getDepartmentIcon(dep.name_ar, dep.icon)}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                  {dep.name_ar}
                </h3>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                  <span>{dep.assigned_members_count} موظفين</span>
                  {dep.total_completed_tasks > 0 && (
                    <span className="text-emerald-400/90 font-medium">{dep.total_completed_tasks} مكتمل</span>
                  )}
                </div>
              </div>

              <div className="w-full pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                <span>عرض التفاصيل والمهام</span>
                <span className="text-indigo-400 font-bold group-hover:translate-x-[-2px] transition-transform">←</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Action Required: PENDING REVIEWS QUEUE (Only for tasks without a Head) */}
      {pendingReviews.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-lg space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
              <h2 className="text-sm sm:text-base font-black text-amber-300 flex items-center gap-2">
                <span>يتطلب انتباهك: طابور الاعتماد المباشر للإدارة</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950">
                  {pendingReviews.length}
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              مهام تم تسليمها وتتطلب مراجعة واعتماد الإدارة المباشر (لعدم وجود رئيس قسم مسؤول حالياً).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {pendingReviews.map(({ client, stage }) => {
              const member = stage.assigned_member || members.find(m => m.id === stage.assigned_member_id);
              const dept = stage.department || departments.find(d => d.id === stage.department_id);

              return (
                <div
                  key={stage.id}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 space-y-3 flex flex-col justify-between hover:border-amber-500/50 transition-colors shadow-sm"
                >
                  <div className="space-y-2.5">
                    {/* Header: Company & Service */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                          {client.service_type}
                        </span>
                        <h3 className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate">{client.company_name}</span>
                        </h3>
                        <p className="text-[11px] text-slate-400">{client.name}</p>
                      </div>
                      <StatusBadge status="under_review" size="sm" />
                    </div>

                    {/* Task Title & Dept */}
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 block font-medium">المهمة المسلمة:</span>
                      <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dept?.color || '#6366f1' }} />
                        <span>{stage.stage_name}</span>
                      </div>
                      {stage.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-1">{stage.description}</p>
                      )}
                    </div>

                    {/* Employee Info */}
                    {member && (
                      <div className="flex items-center gap-2 text-xs text-slate-300 pt-0.5">
                        <div className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-[10px] shrink-0">
                          {member.name ? member.name.slice(0, 1) : 'م'}
                        </div>
                        <span>المسلّم: <strong className="text-white">{member.name}</strong></span>
                      </div>
                    )}

                    {/* Deliverable Link & Note */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-800">
                      {stage.deliverable_url && (
                        <a
                          href={stage.deliverable_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>فتح رابط المخرجات والتسليم ↗</span>
                        </a>
                      )}
                      {stage.deliverable_note && (
                        <p className="text-xs text-slate-300 bg-slate-800/40 p-2 rounded-lg border border-slate-700/50 italic leading-relaxed">
                          "{stage.deliverable_note}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <Button
                      variant="success"
                      size="sm"
                      icon={<Check className="w-3.5 h-3.5" />}
                      className="flex-1"
                      onClick={() => handleApproveStage(stage.id)}
                    >
                      اعتماد
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<RotateCcw className="w-3.5 h-3.5" />}
                      className="flex-1 text-rose-400 hover:text-rose-300 border-rose-500/30 hover:bg-rose-500/10"
                      onClick={() => setSelectedStageForRevision({ client, stage })}
                    >
                      طلب تعديل
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Unified Master Control Bar */}
      <div className="glass-panel p-3 sm:p-3.5 rounded-2xl border border-white/10 shadow-xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        
        {/* Right Side (حيث تبدأ قراءة المستخدم بالعربي): Primary Action & Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Add Client Primary Button */}
          <button
            onClick={() => onOpenNewClientModal()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل عميل جديد</span>
          </button>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              الكل ({clientCounts.total})
            </button>

            <button
              onClick={() => setStatusFilter('in_progress')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === 'in_progress'
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              قيد التنفيذ ({clientCounts.active})
            </button>

            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === 'completed'
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              مكتمل ({clientCounts.completed})
            </button>

            {clientCounts.urgent > 0 && (
              <button
                onClick={() => setStatusFilter('urgent')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'urgent'
                    ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-400'
                    : 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                <span>أولوية طارئة ({clientCounts.urgent})</span>
              </button>
            )}
          </div>
        </div>

        {/* Left Side (أدوات البحث والتحكم والعرض): Search Box & View Mode Utilities */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-end flex-1">
          
          {/* Search Box */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالشركة، العميل، أو الخدمة..."
              className="w-full pl-8 pr-9 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs w-4 h-4 flex items-center justify-center rounded-full bg-white/10 cursor-pointer"
                title="مسح البحث"
              >
                ✕
              </button>
            )}
          </div>

          {/* Tree Expand/Collapse Controls (Only in Tree mode) */}
          {viewMode === 'tree' && (
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs shrink-0 self-start sm:self-auto">
              <button
                onClick={() => setExpandSignal(s => (s > 0 ? s + 1 : 1))}
                className="px-2.5 py-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white font-medium transition-colors flex items-center gap-1 cursor-pointer text-xs"
                title="توسيع كافة العملاء والشركات"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                <span>توسيع الكل</span>
              </button>
              <span className="text-slate-700">|</span>
              <button
                onClick={() => setExpandSignal(s => (s < 0 ? s - 1 : -1))}
                className="px-2.5 py-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white font-medium transition-colors flex items-center gap-1 cursor-pointer text-xs"
                title="طي كافة العناصر"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                <span>طي الكل</span>
              </button>
            </div>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-900 rounded-xl border border-slate-800 p-1 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                viewMode === 'tree'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="عرض الشجرة الهرمية للعملاء والشركات"
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>شجرة المتابعة</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="عرض جدول سريع للشركات"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>جدول سريع</span>
            </button>
          </div>

        </div>
      </div>

      {/* 4. Main Client Hierarchy View */}
      {viewMode === 'tree' ? (
        <ClientHierarchyTree
          departments={departments}
          members={members}
          onOpenDriveModal={onOpenDriveModal}
          onOpenBriefModal={onOpenBriefModal}
          onOpenNewClientModal={onOpenNewClientModal}
          onEditClient={setSelectedClientToEdit}
          onDeleteClient={onDeleteClient}
          onReviewTaskStage={onReviewTaskStage}
          onOpenRevisionModal={(client, stage) => setSelectedStageForRevision({ client, stage })}
          onOpenHistoryModal={onOpenHistoryModal}
          searchTerm={searchTerm}
          onClearSearch={() => setSearchTerm('')}
          filterCategory={statusFilter as any}
          expandSignal={expandSignal}
        />
      ) : (
        /* Alternative Table View */
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-bold">
                <tr>
                  <th className="p-3.5 text-center">الشركة والمتجر</th>
                  <th className="p-3.5 text-center">الخدمة</th>
                  <th className="p-3.5 text-center">المنصة</th>
                  <th className="p-3.5 text-center">الأولوية</th>
                  <th className="p-3.5 text-center">الحالة</th>
                  <th className="p-3.5 text-center">نسبة الإنجاز</th>
                  <th className="p-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center">
                      <EmptyState
                        title="لا توجد نتائج تطابق هذا البحث"
                        description="جرب البحث بكلمة أخرى أو تغيير فلتر الحالة"
                        actionLabel="إعادة ضبط البحث"
                        onAction={() => { setSearchTerm(''); setStatusFilter('all'); }}
                      />
                    </td>
                  </tr>
                ) : (
                  filteredClients.map(client => {
                    const isExpanded = expandedClientIds.has(client.id);
                    const stages = client.stages || [];
                    const completedStages = stages.filter(s => s.status === 'completed').length;

                    return (
                      <React.Fragment key={client.id}>
                        <tr 
                          onClick={() => toggleClientExpansion(client.id)}
                          className={`hover:bg-slate-800/40 transition-colors cursor-pointer border-b border-slate-800/50 ${
                            isExpanded ? 'bg-indigo-950/15 border-b-0' : ''
                          }`}
                        >
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-2.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleClientExpansion(client.id);
                                }}
                                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 transition-transform cursor-pointer"
                                title={isExpanded ? 'طي تفاصيل المهام' : 'عرض وتعديل تفاصيل المهام'}
                              >
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                              <div className="text-center">
                                <div className="font-bold text-white text-sm flex items-center justify-center gap-2">
                                  <span>{client.company_name}</span>
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60">
                                    {stages.length} مهام
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">{client.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 font-medium text-center">{client.service_type}</td>
                          <td className="p-3.5 text-center">
                            <div className="flex justify-center">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/50 text-slate-300 font-medium text-xs">
                                {client.platform || 'غير محدد'}
                              </span>
                            </div>
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex justify-center">
                              <PriorityBadge priority={client.priority} />
                            </div>
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex justify-center">
                              <StatusBadge status={client.status} size="sm" />
                            </div>
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-2.5">
                              <div className="w-20 bg-slate-800 rounded-full h-2 overflow-hidden shrink-0">
                                <div
                                  className="bg-indigo-500 h-full rounded-full transition-all"
                                  style={{ width: `${client.progress_percentage || 0}%` }}
                                />
                              </div>
                              <span className="font-mono text-xs font-bold text-slate-200 min-w-[32px] text-left">
                                {client.progress_percentage || 0}%
                              </span>
                            </div>
                          </td>
                          <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setSelectedClientToEdit(client)}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                                title="تعديل تفاصيل الشركة وإضافة أو تعديل المهام والمراحل"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>تعديل وإدارة المهام</span>
                              </button>
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={<FolderGit2 className="w-3.5 h-3.5 text-amber-400" />}
                                onClick={() => onOpenDriveModal(client)}
                              >
                                ملفات Drive
                              </Button>
                              {onDeleteClient && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget({ id: client.id, name: client.company_name })}
                                  className="p-1.5 px-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                                  title="حذف هذا المشروع نهائياً"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span className="hidden xl:inline">حذف</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded details row */}
                        {isExpanded && (
                          <tr className="bg-slate-950/80 border-b border-indigo-500/30">
                            <td colSpan={7} className="p-4 sm:p-5">
                              <div className="space-y-4">
                                {/* Top bar of details */}
                                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-sm">
                                      <Building2 className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                                        <span>تفاصيل ومراحل المتجر: {client.company_name}</span>
                                        {client.ticket_number && (
                                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono font-bold">
                                            تذكرة #{client.ticket_number}
                                          </span>
                                        )}
                                        {client.store_id && (
                                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                                            معرّف: {client.store_id}
                                          </span>
                                        )}
                                        {client.package_name && (
                                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                            {client.package_name}
                                          </span>
                                        )}
                                      </h4>
                                      <p className="text-xs text-slate-400 mt-0.5">
                                        الخدمة المطلوبة: <span className="text-indigo-300 font-semibold">{client.service_type}</span> | المنصة: <span className="text-slate-300 font-semibold">{client.platform || 'غير محدد'}</span> | الإنجاز: <span className="text-emerald-400 font-bold">{completedStages} من {stages.length} مكتملة</span>
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedClientToEdit(client)}
                                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                      <span>تعديل وإدارة مهام المشروع</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onOpenDriveModal(client)}
                                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <FolderGit2 className="w-3.5 h-3.5 text-amber-400" />
                                      <span>مجلدات وملفات Drive</span>
                                    </button>
                                    {onDeleteClient && (
                                      <button
                                        type="button"
                                        onClick={() => setDeleteTarget({ id: client.id, name: client.company_name })}
                                        className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                                        title="حذف هذا المشروع نهائياً"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>حذف المشروع</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Request Details if available */}
                                {client.request_details && (
                                  <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-slate-300 flex items-start gap-2.5">
                                    <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                    <div>
                                      <strong className="text-indigo-300 font-bold block mb-0.5">ملاحظات ومتطلبات الطلب:</strong>
                                      <span>{client.request_details}</span>
                                    </div>
                                  </div>
                                )}

                                {/* Stages & Tasks Grid */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                      <Layers className="w-4 h-4 text-indigo-400" />
                                      <span>المراحل والمهام التنفيذية ({stages.length})</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedClientToEdit(client)}
                                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>إضافة أو تعديل المهام</span>
                                    </button>
                                  </div>

                                  {stages.length === 0 ? (
                                    <div className="p-6 text-center rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 space-y-2">
                                      <p className="text-xs">لا توجد مهام مسندة لهذه الشركة بعد.</p>
                                      <button
                                        type="button"
                                        onClick={() => setSelectedClientToEdit(client)}
                                        className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-bold border border-indigo-500/30 cursor-pointer"
                                      >
                                        + إضافة أول مهمة الآن
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {stages.map((stage, idx) => {
                                        const dept = stage.department || departments.find(d => d.id === stage.department_id);
                                        const member = stage.assigned_member || members.find(m => m.id === stage.assigned_member_id);

                                        return (
                                          <div
                                            key={stage.id}
                                            className={`p-3.5 rounded-xl border transition-all space-y-2.5 relative ${
                                              stage.status === 'completed'
                                                ? 'bg-emerald-950/20 border-emerald-500/25'
                                                : stage.status === 'in_progress'
                                                ? 'bg-blue-950/20 border-blue-500/25'
                                                : stage.status === 'under_review'
                                                ? 'bg-amber-950/20 border-amber-500/30'
                                                : 'bg-slate-900/70 border-slate-800'
                                            }`}
                                          >
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 flex items-center justify-center">
                                                  #{idx + 1}
                                                </span>
                                                <h5 className="font-bold text-xs text-white">
                                                  {stage.stage_name}
                                                </h5>
                                              </div>
                                              <div>
                                                {stage.status === 'completed' ? (
                                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                                    <Check className="w-3 h-3" /> معتمد
                                                  </span>
                                                ) : stage.status === 'under_review' ? (
                                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 animate-pulse">
                                                    <Clock className="w-3 h-3 text-amber-400" /> بانتظار الاعتماد
                                                  </span>
                                                ) : stage.status === 'revision_requested' ? (
                                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3 text-rose-400" /> مطلوب تعديل
                                                  </span>
                                                ) : stage.status === 'in_progress' ? (
                                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> جاري العمل
                                                  </span>
                                                ) : (
                                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                                    قيد الانتظار
                                                  </span>
                                                )}
                                              </div>
                                            </div>

                                            {/* Department & Member */}
                                            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                                              <span className="font-semibold text-slate-300">
                                                {dept ? dept.name_ar : 'قسم عام'}
                                              </span>
                                              <span className="flex items-center gap-1 text-indigo-300">
                                                <User className="w-3 h-3" />
                                                {member ? member.name : 'غير مسند'}
                                              </span>
                                            </div>

                                            {/* Completion Date or Status & Review Actions */}
                                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                                              <span className="flex items-center gap-1">
                                                {stage.completion_timestamp ? (
                                                  <>
                                                    <Calendar className="w-3 h-3 text-emerald-400" />
                                                    <span>اكتملت: {new Date(stage.completion_timestamp).toLocaleDateString('ar-EG')}</span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <Clock className="w-3 h-3 text-slate-400" />
                                                    <span>قيد المتابعة</span>
                                                  </>
                                                )}
                                              </span>

                                              {stage.status === 'under_review' && (
                                                <div className="flex items-center gap-1">
                                                  <button
                                                    type="button"
                                                    onClick={() => handleApproveStage(stage.id)}
                                                    className="px-2 py-0.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] cursor-pointer"
                                                  >
                                                    اعتماد
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => setSelectedStageForRevision({ client, stage })}
                                                    className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-[10px] cursor-pointer"
                                                  >
                                                    طلب تعديل
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}



      {/* Modal: Request Revision */}
      {selectedStageForRevision && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedStageForRevision(null)}
          title={`طلب تعديلات على مرحلة: ${selectedStageForRevision.stage.stage_name}`}
          description={`العميل: ${selectedStageForRevision.client.company_name}`}
          icon={<RotateCcw className="w-5 h-5 text-rose-400" />}
          footer={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedStageForRevision(null)}
                disabled={isSubmittingRevision}
              >
                إلغاء
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleSubmitRevision}
                loading={isSubmittingRevision}
              >
                إرسال التعديل للموظف
              </Button>
            </>
          }
        >
          <form onSubmit={handleSubmitRevision} className="space-y-4">
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs leading-relaxed">
              يرجى كتابة ملاحظات وتوجيهات واضحة للموظف حول التعديلات المطلوبة لإعادة تنفيذها وتسليمها مجدداً.
            </div>

            <Textarea
              label="ملاحظات وتوجيهات التعديل المطلوبة:"
              required
              rows={4}
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              placeholder="مثال: يرجى تغيير ألوان الترويسة ومطابقتها لملف الهوية الرسمي المرفق في المجلد..."
            />
          </form>
        </Modal>
      )}

      {/* Modal: Edit Client */}
      {selectedClientToEdit && (
        <EditClientModal
          client={selectedClientToEdit}
          departments={departments}
          members={members}
          onClose={() => setSelectedClientToEdit(null)}
          onUpdateClient={onUpdateClient}
          onDeleteClient={onDeleteClient}
          onAddAssignment={onAddAssignment}
          onUpdateAssignment={onUpdateAssignment}
          onDeleteAssignment={onDeleteAssignment}
        />
      )}

      {/* Modal: Department Details */}
      {selectedDeptId && (
        <DepartmentDetailsModal
          departmentId={selectedDeptId}
          departments={departments}
          members={members}
          clients={clients}
          onClose={() => setSelectedDeptId(null)}
          onOpenDriveModal={onOpenDriveModal}
          onOpenBriefModal={onOpenBriefModal}
        />
      )}

      {/* Confirmation Modal for Client Deletion */}
      {deleteTarget && (
        <Modal
          isOpen={true}
          onClose={() => !isDeleting && setDeleteTarget(null)}
          title="تأكيد حذف المشروع والعميل نهائياً"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-white mb-1">
                  هل أنت متأكد من رغبتك في حذف: &quot;{deleteTarget.name}&quot;؟
                </p>
                <p className="leading-relaxed">
                  سيتم حذف المشروع وجميع مراحله التنفيذية وسجلاته بصورة نهائية من قاعدة البيانات ولا يمكن التراجع عن هذا الإجراء.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                إلغاء
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                loading={isDeleting}
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
