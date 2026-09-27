import React, { useState, useMemo } from 'react';
import { 
  Layers, Users, FolderGit2, X, Clock, CheckCircle2, 
  Search, ShieldCheck, Crown, ExternalLink, Calendar, 
  FileText, Folder, Sparkles, UserCheck, 
  ArrowUpRight, Check, AlertTriangle, Briefcase, Camera, 
  Palette, Code, Megaphone, Target, CheckCircle
} from 'lucide-react';
import type { Department, TeamMember, Client, TaskStage } from '../types';
import { StatusBadge } from './ui/StatusBadge';
import { PriorityBadge } from './ui/PriorityBadge';

interface DepartmentDetailsModalProps {
  departmentId: number;
  departments: Department[];
  members: TeamMember[];
  clients: Client[];
  onClose: () => void;
  onOpenDriveModal?: (client: Client) => void;
  onOpenBriefModal?: (client: Client) => void;
}

const getDeptTheme = (department: Department) => {
  const code = (department.code || '').toLowerCase();
  const name = (department.name_ar || '').toLowerCase();
  
  if (code.includes('design') || name.includes('تصميم') || name.includes('جرافيك') || name.includes('هوية')) {
    return {
      icon: <Palette className="w-6 h-6" />,
      accentColor: 'from-purple-500/20 to-indigo-500/5',
      textColor: 'text-purple-400',
      badgeColor: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
      borderAccent: 'border-purple-500/30',
      glow: 'shadow-[0_0_30px_rgba(168,85,247,0.15)]',
      gradientBar: 'from-purple-500 via-indigo-500 to-purple-600',
    };
  }
  if (code.includes('prod') || name.includes('تصوير') || name.includes('مرئي') || name.includes('فيديو')) {
    return {
      icon: <Camera className="w-6 h-6" />,
      accentColor: 'from-amber-500/20 to-orange-500/5',
      textColor: 'text-amber-400',
      badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
      borderAccent: 'border-amber-500/30',
      glow: 'shadow-[0_0_30px_rgba(245,158,11,0.15)]',
      gradientBar: 'from-amber-500 via-orange-500 to-amber-600',
    };
  }
  if (code.includes('dev') || name.includes('برمج') || name.includes('متاجر') || name.includes('مواقع')) {
    return {
      icon: <Code className="w-6 h-6" />,
      accentColor: 'from-cyan-500/20 to-blue-500/5',
      textColor: 'text-cyan-400',
      badgeColor: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
      borderAccent: 'border-cyan-500/30',
      glow: 'shadow-[0_0_30px_rgba(6,182,212,0.15)]',
      gradientBar: 'from-cyan-500 via-blue-500 to-cyan-600',
    };
  }
  if (code.includes('ads') || name.includes('إعلان') || name.includes('ممولة') || name.includes('performance')) {
    return {
      icon: <Megaphone className="w-6 h-6" />,
      accentColor: 'from-rose-500/20 to-pink-500/5',
      textColor: 'text-rose-400',
      badgeColor: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
      borderAccent: 'border-rose-500/30',
      glow: 'shadow-[0_0_30px_rgba(244,63,94,0.15)]',
      gradientBar: 'from-rose-500 via-pink-500 to-rose-600',
    };
  }
  if (code.includes('content') || name.includes('محتوى') || name.includes('سوشيال')) {
    return {
      icon: <FileText className="w-6 h-6" />,
      accentColor: 'from-emerald-500/20 to-teal-500/5',
      textColor: 'text-emerald-400',
      badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      borderAccent: 'border-emerald-500/30',
      glow: 'shadow-[0_0_30px_rgba(16,185,129,0.15)]',
      gradientBar: 'from-emerald-500 via-teal-500 to-emerald-600',
    };
  }
  if (code.includes('strat') || name.includes('استراتيج') || name.includes('استشار')) {
    return {
      icon: <Target className="w-6 h-6" />,
      accentColor: 'from-indigo-500/20 to-blue-500/5',
      textColor: 'text-indigo-400',
      badgeColor: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
      borderAccent: 'border-indigo-500/30',
      glow: 'shadow-[0_0_30px_rgba(99,102,241,0.15)]',
      gradientBar: 'from-indigo-500 via-violet-500 to-indigo-600',
    };
  }
  return {
    icon: <Briefcase className="w-6 h-6" />,
    accentColor: 'from-blue-500/20 to-indigo-500/5',
    textColor: 'text-blue-400',
    badgeColor: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    borderAccent: 'border-blue-500/30',
    glow: 'shadow-[0_0_30px_rgba(59,130,246,0.15)]',
    gradientBar: 'from-blue-500 via-indigo-500 to-blue-600',
  };
};

type ModalTab = 'active' | 'completed' | 'team' | 'services';

export const DepartmentDetailsModal: React.FC<DepartmentDetailsModalProps> = ({
  departmentId,
  departments,
  members,
  clients,
  onClose,
  onOpenDriveModal,
  onOpenBriefModal,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('active');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'under_review' | 'revision_requested' | 'pending'>('all');

  const department = useMemo(() => departments.find(d => d.id === departmentId), [departments, departmentId]);
  const theme = useMemo(() => department ? getDeptTheme(department) : null, [department]);

  // Department members
  const deptMembers = useMemo(() => {
    return members.filter(m => m.department_ids?.includes(departmentId) || m.department_id === departmentId);
  }, [members, departmentId]);

  // Categorize members
  const { heads, specialists, generalAdmins } = useMemo(() => {
    const h = deptMembers.filter(m => {
      const r = m.role || '';
      return (
        m.role_type === 'head' || 
        r.includes('رئيس') || 
        r.includes('مدير القسم') || 
        r.toLowerCase().includes('head') ||
        r.toLowerCase().includes('lead')
      );
    });
    const s = deptMembers.filter(m => 
      !h.some(item => item.id === m.id) && 
      m.role_type !== 'super_admin' && 
      m.role_type !== 'admin'
    );
    const a = deptMembers.filter(m => 
      !h.some(item => item.id === m.id) && 
      (m.role_type === 'super_admin' || m.role_type === 'admin')
    );
    return { heads: h, specialists: s, generalAdmins: a };
  }, [deptMembers]);

  // All active and completed tasks across all clients for this department
  const { activeTasks, completedTasks } = useMemo(() => {
    const active: { task: TaskStage; client: Client }[] = [];
    const completed: { task: TaskStage; client: Client }[] = [];

    clients.forEach(client => {
      client.stages?.forEach(stage => {
        if (stage.department_id === departmentId) {
          if (stage.status === 'completed') {
            completed.push({ task: stage, client });
          } else {
            active.push({ task: stage, client });
          }
        }
      });
    });

    return { activeTasks: active, completedTasks: completed };
  }, [clients, departmentId]);

  // Filtered active tasks
  const filteredActiveTasks = useMemo(() => {
    return activeTasks.filter(item => {
      const q = taskSearchQuery.toLowerCase();
      const matchesSearch = 
        !taskSearchQuery ||
        (item.client?.company_name || '').toLowerCase().includes(q) ||
        (item.task?.stage_name || '').toLowerCase().includes(q) ||
        (item.task?.description || '').toLowerCase().includes(q) ||
        (item.task?.assigned_member?.name || '').toLowerCase().includes(q);

      const matchesStatus = 
        statusFilter === 'all' || 
        item.task.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [activeTasks, taskSearchQuery, statusFilter]);

  // Calculate task counts per member
  const memberWorkloadMap = useMemo(() => {
    const map = new Map<number, number>();
    activeTasks.forEach(item => {
      if (item.task.assigned_member_id) {
        map.set(item.task.assigned_member_id, (map.get(item.task.assigned_member_id) || 0) + 1);
      } else if (item.task.assigned_member?.id) {
        map.set(item.task.assigned_member.id, (map.get(item.task.assigned_member.id) || 0) + 1);
      }
    });
    return map;
  }, [activeTasks]);

  const totalTasksCount = activeTasks.length + completedTasks.length;
  const completionRate = totalTasksCount > 0 
    ? Math.round((completedTasks.length / totalTasksCount) * 100) 
    : 100;

  if (!department || !theme) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl animate-fadeIn"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-5xl bg-[#0b0f17] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fadeInUp">
        
        {/* Top Accent Gradient Bar */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${theme.gradientBar}`} />

        {/* Header Section */}
        <div className="p-5 sm:p-6 border-b border-white/5 bg-[#0e1422] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${theme.accentColor} border ${theme.borderAccent} ${theme.textColor} flex items-center justify-center shrink-0 ${theme.glow}`}>
              {theme.icon}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{department.name_ar}</h2>
                <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${theme.badgeColor}`}>
                  {department.name_en || department.code}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                {department.description || 'إدارة وتنسيق مخرجات القسم وتوزيع المهام ومتابعة الجودة'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button 
              onClick={onClose}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5 hover:border-white/15"
              title="إغلاق النافذة (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 p-3 sm:px-6 sm:py-3.5 bg-[#090d16] border-b border-white/5 text-xs">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <FolderGit2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-gray-400 font-medium">المهام الجارية</div>
              <div className="text-sm font-extrabold text-white">{activeTasks.length} مهمة</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-gray-400 font-medium">المهام المكتملة</div>
              <div className="text-sm font-extrabold text-emerald-400">{completedTasks.length} مهمة</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-gray-400 font-medium">نسبة الإنجاز</div>
              <div className="text-sm font-extrabold text-amber-400">{completionRate}%</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-gray-400 font-medium">فريق العمل</div>
              <div className="text-sm font-extrabold text-white">{deptMembers.length} موظف</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-[#0b0f17] border-b border-white/5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all shrink-0 ${
              activeTab === 'active'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <FolderGit2 className="w-4 h-4" />
            <span>المهام الجارية</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'active' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-gray-400'
            }`}>
              {activeTasks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all shrink-0 ${
              activeTab === 'completed'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>سجل الإنجاز المكتمل</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'completed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-gray-400'
            }`}>
              {completedTasks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all shrink-0 ${
              activeTab === 'team'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>فريق العمل والكوادر</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'team' ? 'bg-orange-500/20 text-orange-300' : 'bg-white/5 text-gray-400'
            }`}>
              {deptMembers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all shrink-0 ${
              activeTab === 'services'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>دليل الخدمات</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'services' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-gray-400'
            }`}>
              {department.services?.length || 0}
            </span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-[#0b0f17]">
          
          {/* TAB 1: ACTIVE TASKS */}
          {activeTab === 'active' && (
            <div className="space-y-4">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={taskSearchQuery}
                    onChange={(e) => setTaskSearchQuery(e.target.value)}
                    placeholder="ابحث باسم الشركة أو المهمة أو الموظف المسند..."
                    className="w-full bg-[#0e1422] border border-white/10 rounded-xl py-2 pr-9 pl-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                  {taskSearchQuery && (
                    <button
                      onClick={() => setTaskSearchQuery('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
                    >
                      مسح
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                      statusFilter === 'all'
                        ? 'bg-white/15 text-white'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
                  >
                    الكل ({activeTasks.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('in_progress')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                      statusFilter === 'in_progress'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
                  >
                    جاري العمل
                  </button>
                  <button
                    onClick={() => setStatusFilter('under_review')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                      statusFilter === 'under_review'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
                  >
                    قيد المراجعة
                  </button>
                  <button
                    onClick={() => setStatusFilter('revision_requested')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                      statusFilter === 'revision_requested'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
                  >
                    تعديلات مطلوبة
                  </button>
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                      statusFilter === 'pending'
                        ? 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
                  >
                    بانتظار البدء
                  </button>
                </div>
              </div>

              {/* Tasks List */}
              {filteredActiveTasks.length === 0 ? (
                <div className="text-center py-16 px-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-white mb-1">
                    {taskSearchQuery ? 'لا توجد نتائج مطابقة لبحثك' : 'لا يوجد ضغط عمل حالياً في هذا القسم'}
                  </h4>
                  <p className="text-xs text-gray-400 max-w-md">
                    {taskSearchQuery 
                      ? 'جرب البحث بكلمات أخرى أو اختر تصفية حالة مختلفة' 
                      : 'جميع المهام المسندة لهذا القسم مكتملة أو تم تسليمها بنجاح.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5">
                  {filteredActiveTasks.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 sm:p-5 rounded-2xl bg-[#0e1422] border border-white/5 hover:border-white/15 transition-all shadow-sm group hover:shadow-md"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        
                        {/* Task Main Details */}
                        <div className="flex-1 space-y-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-blue-500/15 text-blue-300 border border-blue-500/20">
                              {item.client.company_name}
                            </span>
                            <StatusBadge status={item.task.status} />
                            <PriorityBadge priority={item.client.priority} />
                            
                            {item.client.service_type && (
                              <span className="text-[11px] text-gray-400 bg-white/5 px-2 py-0.5 rounded-md">
                                {item.client.service_type}
                              </span>
                            )}
                          </div>

                          <div>
                            <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                              {item.task.stage_name}
                            </h4>
                            {item.task.description && (
                              <p className="text-xs text-gray-300 mt-1.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 leading-relaxed">
                                {item.task.description}
                              </p>
                            )}
                          </div>

                          {/* Revision alert note if exists */}
                          {item.task.status === 'revision_requested' && item.task.revision_notes && (
                            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
                              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold">ملاحظات التعديل: </span>
                                <span>{item.task.revision_notes}</span>
                              </div>
                            </div>
                          )}

                          {/* Target Deadline / SLA Info */}
                          {item.client.target_deadline && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                              <span>الموعد النهائي المستهدف: </span>
                              <span className="text-gray-200 font-semibold">{item.client.target_deadline}</span>
                            </div>
                          )}
                        </div>

                        {/* Assignee & Action Buttons */}
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5 shrink-0">
                          
                          {/* Member Chip */}
                          <div className="flex items-center gap-2.5 bg-[#090d16] p-2 rounded-xl border border-white/5">
                            <div className="text-right">
                              <div className="text-[10px] text-gray-400 font-medium">المسؤول عن التنفيذ</div>
                              <div className="text-xs font-bold text-white">
                                {item.task.assigned_member?.name || 'غير مسند لموظف'}
                              </div>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-xs shrink-0 select-none">
                              {item.task.assigned_member?.name ? item.task.assigned_member.name.slice(0, 1) : 'م'}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5">
                            {onOpenDriveModal && (
                              <button
                                onClick={() => onOpenDriveModal(item.client)}
                                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all"
                                title="فتح مجلد جوجل درايف للعميل"
                              >
                                <Folder className="w-3.5 h-3.5 text-amber-400" />
                                <span>درايف</span>
                              </button>
                            )}

                            {onOpenBriefModal && (
                              <button
                                onClick={() => onOpenBriefModal(item.client)}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 hover:text-indigo-200 text-xs font-medium flex items-center gap-1.5 transition-all"
                                title="عرض شيت البريف وتفاصيل متطلبات العميل"
                              >
                                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                                <span>البريف</span>
                              </button>
                            )}

                            {item.task.deliverable_url && (
                              <a
                                href={item.task.deliverable_url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 text-xs font-medium flex items-center gap-1 transition-all"
                                title="معاينة رابط التسليم"
                              >
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                <span>التسليم</span>
                              </a>
                            )}
                          </div>

                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COMPLETED ARCHIVE */}
          {activeTab === 'completed' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>سجل المهام التي تم إنجازها وتسليمها بنجاح بواسطة هذا القسم ({completedTasks.length})</span>
                </div>
              </div>

              {completedTasks.length === 0 ? (
                <div className="text-center py-16 px-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 text-gray-500 flex items-center justify-center mb-3">
                    <Clock className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-white mb-1">لا توجد مهام مؤرشفة مكتملة بعد</h4>
                  <p className="text-xs text-gray-400 max-w-md">
                    عند إتمام وتسليم المهام الجارية في هذا القسم، ستظهر تلقائياً هنا في سجل الإنجاز التاريخي.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {completedTasks.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-[#0e1422] border border-white/5 hover:border-emerald-500/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white/5 text-gray-300 border border-white/5">
                            {item.client.company_name}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            تم الإنجاز
                          </span>
                        </div>

                        <div className="font-bold text-white text-sm">
                          {item.task.stage_name}
                        </div>

                        {item.task.completion_timestamp && (
                          <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-gray-500" />
                            <span>تاريخ الإنجاز: {new Date(item.task.completion_timestamp).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          </div>
                        )}

                        {item.task.deliverable_note && (
                          <div className="text-xs text-gray-400 bg-white/5 p-2 rounded-lg border border-white/5">
                            {item.task.deliverable_note}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {item.task.assigned_member && (
                          <div className="text-right text-xs">
                            <div className="text-[10px] text-gray-500 font-medium">أنجزها</div>
                            <div className="text-gray-300 font-semibold">{item.task.assigned_member.name}</div>
                          </div>
                        )}

                        {onOpenDriveModal && (
                          <button
                            onClick={() => onOpenDriveModal(item.client)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            title="فتح مجلد المشروع"
                          >
                            <Folder className="w-4 h-4 text-amber-400" />
                          </button>
                        )}

                        {item.task.deliverable_url && (
                          <a
                            href={item.task.deliverable_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                            title="عرض الملف المسلّم"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TEAM MEMBERS */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              
              {/* Department Head / Leadership */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>إدارة وقيادة القسم ({heads.length})</span>
                </h3>

                {heads.length === 0 ? (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-gray-400 text-center">
                    لم يتم تعيين رئيس قسم رسمي حالياً، يتم إدارة القسم مباشرة من إدارة العمليات.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {heads.map(member => {
                      const activeCount = memberWorkloadMap.get(member.id) || 0;
                      return (
                        <div
                          key={member.id}
                          className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-white/[0.02] to-transparent border border-amber-500/30 flex items-center gap-3.5 shadow-sm"
                        >
                          <div className="relative shrink-0">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-slate-800 border-2 border-amber-500/40 flex items-center justify-center font-bold text-sm text-amber-300 shadow-inner select-none">
                              {member.name ? (member.name.trim().split(/\s+/).length > 1 ? member.name.trim().split(/\s+/)[0][0] + member.name.trim().split(/\s+/)[1][0] : member.name.slice(0, 2)) : 'م'}
                            </div>
                            <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-amber-500 text-black">
                              <Crown className="w-3 h-3" />
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-white truncate">{member.name}</span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                رئيس القسم
                              </span>
                            </div>
                            <div className="text-xs text-gray-400 truncate mt-0.5">{member.role}</div>
                            <div className="text-[11px] text-gray-500 truncate">{member.email}</div>
                          </div>

                          <div className="text-left shrink-0">
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/5 text-gray-300 border border-white/5">
                              {activeCount} مهام جارية
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Specialists / Team Members */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-orange-400" />
                  <span>المتخصصون وأعضاء الفريق ({specialists.length})</span>
                </h3>

                {specialists.length === 0 ? (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-gray-400 text-center">
                    لا يوجد أعضاء متخصصين إضافيين مخصصين لهذا القسم حالياً.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {specialists.map(member => {
                      const activeCount = memberWorkloadMap.get(member.id) || 0;
                      return (
                        <div
                          key={member.id}
                          className="p-3.5 rounded-2xl bg-[#0e1422] border border-white/5 hover:border-white/15 transition-all flex items-center gap-3"
                        >
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600/30 to-slate-800 border border-white/10 flex items-center justify-center font-bold text-xs text-indigo-300 shadow-inner select-none">
                              {member.name ? (member.name.trim().split(/\s+/).length > 1 ? member.name.trim().split(/\s+/)[0][0] + member.name.trim().split(/\s+/)[1][0] : member.name.slice(0, 2)) : 'م'}
                            </div>
                            <div 
                              className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#0e1422] ${
                                member.is_active ? 'bg-emerald-500' : 'bg-rose-500'
                              }`} 
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-xs text-white truncate">{member.name}</div>
                            <div className="text-[11px] text-gray-400 truncate mt-0.5">{member.role}</div>
                            <div className="text-[10px] text-gray-500 truncate">{member.email}</div>
                          </div>

                          <div className="shrink-0 text-left">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              activeCount > 0 
                                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20' 
                                : 'bg-white/5 text-gray-400'
                            }`}>
                              {activeCount} مهام
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* General Administrators */}
              {generalAdmins.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
                    <span>مسؤولو النظام المشرفون ({generalAdmins.length})</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {generalAdmins.map(admin => (
                      <div
                        key={admin.id}
                        className="px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2 text-xs"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                        <span className="font-bold text-gray-300">{admin.name}</span>
                        <span className="text-[10px] text-gray-500">({admin.role})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 4: SERVICES CATALOG */}
          {activeTab === 'services' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>دليل الخدمات والمخرجات المعتمدة لقسم {department.name_ar}</span>
                </div>
                <span className="text-[11px] font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-lg border border-cyan-500/20">
                  {department.services?.length || 0} خدمة متوفرة
                </span>
              </div>

              {department.services && department.services.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {department.services.map((service, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-2xl bg-[#0e1422] border border-white/5 hover:border-cyan-500/30 transition-all group flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-black text-xs">
                            {index + 1}
                          </div>
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            متاحة ومفعلة
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors">
                          {service}
                        </h4>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                        <span>معيار الجودة: SLA 100%</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 px-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 text-gray-500 flex items-center justify-center mb-3">
                    <Layers className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-white mb-1">لم يتم إدخال دليل الخدمات بعد</h4>
                  <p className="text-xs text-gray-400 max-w-md">
                    يمكن للمسؤولين إضافة وتعديل خدمات هذا القسم ومخرجاته من خلال لوحة إعدادات النظام.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:px-6 bg-[#090d16] border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>نظام التشغيل والإدارة — {department.name_ar}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors font-medium text-xs"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
