import React, { useState } from 'react';
import {
  Award, CheckCircle2, Clock, FolderGit2, Building2,
  RotateCcw, ExternalLink, ShieldCheck, Users, Search,
  Check, UserCheck, Send, AlertTriangle,
  Layers, History, UserPlus, Edit, FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Client, Department, TeamMember, TaskStage } from '../types';
import { Button } from './ui/Button';
import { Card, CardBody } from './ui/Card';
import { StatusBadge } from './ui/StatusBadge';
import { PriorityBadge } from './ui/PriorityBadge';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { EmptyState } from './ui/EmptyState';

interface HeadWorkspaceProps {
  currentMember: TeamMember;
  clients: Client[];
  departments: Department[];
  members: TeamMember[];
  onUpdateAssignment: (clientId: number, stageId: number, data: { assigned_member_id?: number | null; status?: string; description?: string; head_instructions?: string }) => Promise<void>;
  onReviewTaskStage: (stageId: number, action: 'approve' | 'request_revision', feedbackNotes?: string) => Promise<void>;
  onSubmitForReview?: (stageId: number, note?: string, url?: string) => Promise<void>;
  onOpenDriveModal: (client: Client) => void;
  onOpenBriefModal?: (client: Client) => void;
  onOpenHistoryModal?: (stage: TaskStage, client?: Client) => void;
}

export const HeadWorkspace: React.FC<HeadWorkspaceProps> = ({
  currentMember,
  clients,
  departments,
  members,
  onUpdateAssignment,
  onReviewTaskStage,
  onSubmitForReview,
  onOpenDriveModal,
  onOpenBriefModal: _onOpenBriefModal,
  onOpenHistoryModal,
}) => {
  // Collect all department IDs associated with this Head
  const memberDeptIds: number[] = [];
  if (currentMember.department_id) memberDeptIds.push(currentMember.department_id);
  if (currentMember.department_ids && currentMember.department_ids.length > 0) {
    currentMember.department_ids.forEach(id => {
      if (!memberDeptIds.includes(id)) memberDeptIds.push(id);
    });
  }

  // Selected Department Filter (if Head manages multiple departments)
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<number | 'all'>(
    memberDeptIds.length === 1 ? memberDeptIds[0] : (memberDeptIds.length > 0 ? memberDeptIds[0] : 'all')
  );

  const [activeTab, setActiveTab] = useState<'dispatch' | 'my_tasks' | 'review' | 'team'>('dispatch');
  const [searchTerm, setSearchTerm] = useState('');

  // Assignment & Briefing Modal State
  const [selectedStageForAssignment, setSelectedStageForAssignment] = useState<{ client: Client; stage: TaskStage } | null>(null);
  const [assignmentSelectedMemberId, setAssignmentSelectedMemberId] = useState<number | ''>('');
  const [assignmentInstructions, setAssignmentInstructions] = useState('');
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);

  // Task & Brief Details Modal State
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<{ client: Client; stage: TaskStage } | null>(null);
  const [editingTaskDesc, setEditingTaskDesc] = useState('');
  const [isSavingTaskDesc, setIsSavingTaskDesc] = useState(false);
  const [saveDescSuccess, setSaveDescSuccess] = useState(false);

  // Review modal state
  const [selectedReviewStage, setSelectedReviewStage] = useState<{ client: Client; stage: TaskStage } | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // Submit Deliverable Modal State (for tasks assigned directly to the Head)
  const [selectedStageToSubmit, setSelectedStageToSubmit] = useState<{ client: Client; stage: TaskStage } | null>(null);
  const [deliverableNote, setDeliverableNote] = useState('');
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Gather tasks for this Head's departments OR tasks directly assigned to this Head
  const deptTasks: { client: Client; stage: TaskStage }[] = [];
  const myDirectTasks: { client: Client; stage: TaskStage }[] = [];

  clients.forEach(client => {
    client.stages?.forEach(stage => {
      const isDirectlyAssigned = stage.assigned_member_id === currentMember.id;
      if (isDirectlyAssigned) {
        myDirectTasks.push({ client, stage });
      }

      const matchesDept = memberDeptIds.length === 0 
        ? true 
        : (selectedDeptFilter === 'all' ? memberDeptIds.includes(stage.department_id) : stage.department_id === selectedDeptFilter);

      if (matchesDept || isDirectlyAssigned) {
        deptTasks.push({ client, stage });
      }
    });
  });

  // Team members under this Head (strictly this department's employees and the head)
  const deptMembers = members.filter(m => {
    // Exclude system admins and agency managers from department worker pool
    if (m.role_type === 'admin' || m.role_type === 'super_admin' || m.role_type === 'manager') {
      return false;
    }
    if (memberDeptIds.length === 0) return true;
    const targetDeptIds = selectedDeptFilter === 'all' ? memberDeptIds : [selectedDeptFilter as number];
    return targetDeptIds.some(dId => m.department_id === dId || (m.department_ids && m.department_ids.includes(dId)));
  });

  // Helper to identify direct management tasks that bypass the Head
  const isDirectManagementTask = (stage: TaskStage) => {
    // If assigned to the Head themselves, it's their direct task
    if (stage.assigned_member_id === currentMember.id) return false;
    // If dispatched/assigned by this Head, it is a Head-managed task
    if (stage.assigned_by_id === currentMember.id) return false;

    // Check assigner
    const assigner = stage.assigned_by || members.find(m => m.id === stage.assigned_by_id);
    const isAssignedByManagement = assigner && (assigner.role_type === 'admin' || assigner.role_type === 'manager' || assigner.role_type === 'super_admin');
    
    // If assigned by Admin/Manager directly to a department employee (not this Head), it's a Direct Management task
    return !!isAssignedByManagement;
  };

  const reviewTasks = deptTasks.filter(item => 
    item.stage.status === 'under_review' && 
    item.stage.assigned_member_id !== currentMember.id && 
    !isDirectManagementTask(item.stage)
  );
  const inProgressTasks = deptTasks.filter(item => item.stage.status === 'in_progress' || item.stage.status === 'pending' || item.stage.status === 'revision_requested');
  const unassignedTasks = deptTasks.filter(item => !item.stage.assigned_member_id);
  const myActiveTasks = myDirectTasks.filter(item => item.stage.status !== 'completed');
  const completedTasks = deptTasks.filter(item => item.stage.status === 'completed');

  // Filtered tasks for current active tab
  const getTabFilteredTasks = () => {
    let list: { client: Client; stage: TaskStage }[] = [];
    if (activeTab === 'review') {
      list = reviewTasks;
    } else if (activeTab === 'my_tasks') {
      list = myDirectTasks;
    } else if (activeTab === 'dispatch') {
      list = deptTasks.filter(item => item.stage.status !== 'completed');
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return list.filter(item => (
        item.client.name.toLowerCase().includes(q) ||
        item.client.company_name.toLowerCase().includes(q) ||
        item.stage.stage_name.toLowerCase().includes(q)
      ));
    }
    return list;
  };

  const currentTabTasks = getTabFilteredTasks();

  const handleConfirmAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStageForAssignment || !assignmentSelectedMemberId) return;
    try {
      setIsSubmittingAssignment(true);
      await onUpdateAssignment(
        selectedStageForAssignment.client.id,
        selectedStageForAssignment.stage.id,
        {
          assigned_member_id: Number(assignmentSelectedMemberId),
          head_instructions: assignmentInstructions.trim() || undefined
        }
      );
      setSelectedStageForAssignment(null);
      setAssignmentInstructions('');
      setAssignmentSelectedMemberId('');
    } catch (err) {
      console.error(err);
      alert('فشل إسناد المهمة. يرجى المحاولة مجدداً.');
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  const handleSaveHeadInstructions = async () => {
    if (!selectedTaskForDetails) return;
    try {
      setIsSavingTaskDesc(true);
      await onUpdateAssignment(
        selectedTaskForDetails.client.id,
        selectedTaskForDetails.stage.id,
        {
          head_instructions: editingTaskDesc.trim() || undefined
        }
      );
      setSelectedTaskForDetails(prev => prev ? {
        ...prev,
        stage: {
          ...prev.stage,
          head_instructions: editingTaskDesc.trim() || undefined
        }
      } : null);
      setSaveDescSuccess(true);
      setTimeout(() => setSaveDescSuccess(false), 2500);
    } catch (err) {
      console.error(err);
      alert('فشل حفظ توجيهات المهمة. يرجى المحاولة مجدداً.');
    } finally {
      setIsSavingTaskDesc(false);
    }
  };



  const handleApprove = async (stageId: number) => {
    try {
      setReviewLoading(true);
      await onReviewTaskStage(stageId, 'approve');
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });
      setSelectedReviewStage(null);
      setReviewFeedback('');
    } catch (err) {
      console.error(err);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleRequestRevision = async (stageId: number) => {
    if (!reviewFeedback.trim()) {
      alert('يرجى كتابة ملاحظات وتوجيهات التعديل للموظف');
      return;
    }
    try {
      setReviewLoading(true);
      await onReviewTaskStage(stageId, 'request_revision', reviewFeedback);
      setSelectedReviewStage(null);
      setReviewFeedback('');
    } catch (err) {
      console.error(err);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleOpenSubmitModal = (item: { client: Client; stage: TaskStage }) => {
    setSelectedStageToSubmit(item);
    setDeliverableNote(item.stage.deliverable_note || '');
    setDeliverableUrl(item.stage.deliverable_url || '');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStageToSubmit || !onSubmitForReview) return;

    try {
      setSubmitting(true);
      await onSubmitForReview(selectedStageToSubmit.stage.id, deliverableNote, deliverableUrl);
      confetti({
        particleCount: 60,
        spread: 50,
        origin: { y: 0.6 }
      });
      setSelectedStageToSubmit(null);
      setDeliverableNote('');
      setDeliverableUrl('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const headDepts = departments.filter(d => memberDeptIds.includes(d.id));

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* 1. Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-white">
                {headDepts.length > 0 ? headDepts.map(d => d.name_ar).join(' & ') : 'لوحة إدارة القسم'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/20">
                رئيس القسم: {currentMember.name}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              إسناد وتوزيع المهام، فحص واعتماد المخرجات، ومتابعة المهام المسندة إليك شخصياً
            </p>
          </div>
        </div>

        {/* Counter cards */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div 
            onClick={() => setActiveTab('dispatch')}
            className={`px-3 py-1.5 rounded-xl border text-center cursor-pointer transition-all ${
              activeTab === 'dispatch' ? 'bg-teal-500/20 border-teal-500 ring-1 ring-teal-400' : 'bg-slate-800/80 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <span className="text-[10px] text-slate-400 block font-medium">مهام القسم</span>
            <span className="text-base font-black text-teal-400">{inProgressTasks.length}</span>
          </div>

          <div 
            onClick={() => setActiveTab('my_tasks')}
            className={`px-3 py-1.5 rounded-xl border text-center cursor-pointer transition-all ${
              activeTab === 'my_tasks' ? 'bg-indigo-500/20 border-indigo-500 ring-1 ring-indigo-400' : 'bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20'
            }`}
          >
            <span className="text-[10px] text-indigo-300 block font-medium">مهامي الشخصية</span>
            <span className="text-base font-black text-indigo-400">{myActiveTasks.length}</span>
          </div>

          {unassignedTasks.length > 0 && (
            <div 
              onClick={() => setActiveTab('dispatch')}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center cursor-pointer hover:bg-rose-500/20 transition-all"
            >
              <span className="text-[10px] text-rose-300 block font-medium">تحتاج تعيين</span>
              <span className="text-base font-black text-rose-400">{unassignedTasks.length}</span>
            </div>
          )}

          <div 
            onClick={() => setActiveTab('review')}
            className={`px-3 py-1.5 rounded-xl border text-center cursor-pointer transition-all ${
              activeTab === 'review' ? 'bg-amber-500/20 border-amber-500 ring-1 ring-amber-400' : 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
            }`}
          >
            <span className="text-[10px] text-amber-300 block font-medium">بانتظار الاعتماد</span>
            <span className="text-base font-black text-amber-400">{reviewTasks.length}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
            <span className="text-[10px] text-emerald-300 block font-medium">مكتمل</span>
            <span className="text-base font-black text-emerald-400">{completedTasks.length}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
            <span className="text-[10px] text-slate-400 block font-medium">موظفو القسم</span>
            <span className="text-base font-black text-slate-200">{deptMembers.length}</span>
          </div>
        </div>
      </div>

      {/* Multi-Department Switcher if Head manages more than 1 department */}
      {headDepts.length > 1 && (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 font-bold px-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-teal-400" />
            <span>تصفية حسب القسم:</span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedDeptFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedDeptFilter === 'all'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              جميع الأقسام ({headDepts.length})
            </button>
            {headDepts.map(d => (
              <button
                key={d.id}
                onClick={() => setSelectedDeptFilter(d.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedDeptFilter === d.id
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {d.name_ar}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. Sub Navigation Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center bg-slate-900 rounded-xl border border-slate-800 p-1 gap-1 flex-wrap">
          
          {/* Tab 1: Dispatch & All Department Tasks */}
          <button
            onClick={() => setActiveTab('dispatch')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'dispatch'
                ? 'bg-teal-600 text-white shadow-sm font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>مهام القسم وتوزيع العمل</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-800 text-slate-300">
              {inProgressTasks.length}
            </span>
          </button>

          {/* Tab 2: My Personal Assigned Tasks */}
          <button
            onClick={() => setActiveTab('my_tasks')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'my_tasks'
                ? 'bg-indigo-600 text-white shadow-sm font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <span>مهامي المسندة لي شخصياً</span>
            {myActiveTasks.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-indigo-500 text-white">
                {myActiveTasks.length}
              </span>
            )}
          </button>

          {/* Tab 3: Review Queue */}
          <button
            onClick={() => setActiveTab('review')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'review'
                ? 'bg-amber-600 text-white shadow-sm font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>طابور المراجعة والاعتماد</span>
            {reviewTasks.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                {reviewTasks.length}
              </span>
            )}
          </button>

          {/* Tab 4: Team */}
          <button
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'team'
                ? 'bg-teal-600 text-white shadow-sm font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>أعضاء الفريق والضغط</span>
          </button>
        </div>

        {/* Search */}
        {activeTab !== 'team' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث في المهام أو الشركات..."
              className="w-full pl-3 pr-9 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        )}
      </div>

      {/* 3. Tab Content: Dispatch & All Department Tasks */}
      {activeTab === 'dispatch' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-bold">
                <tr>
                  <th className="p-3.5 text-center">الشركة والمشروع</th>
                  <th className="p-3.5 text-center">المرحلة / المهمة</th>
                  <th className="p-3.5 text-center">الموظف المسند إليه (Assign)</th>
                  <th className="p-3.5 text-center">الحالة</th>
                  <th className="p-3.5 text-center">الأولوية</th>
                  <th className="p-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {currentTabTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center">
                      <EmptyState
                        title="لا توجد مهام جارية في القسم حالياً"
                        description="عند قيام الأدمن بتسجيل عميل جديد أو إضافة مرحلة تابعة لقسمك ستظهر هنا فوراً لتوزيعها على فريقك."
                      />
                    </td>
                  </tr>
                ) : (
                  currentTabTasks.map(({ client, stage }) => {
                    const isUnassigned = !stage.assigned_member_id;
                    const isAssignedToMe = stage.assigned_member_id === currentMember.id;

                    return (
                      <tr key={stage.id} className={`hover:bg-slate-800/30 transition-colors ${isUnassigned || isAssignedToMe ? 'bg-amber-500/[0.03]' : ''}`}>
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTaskForDetails({ client, stage });
                              setEditingTaskDesc(stage.head_instructions || '');
                            }}
                            className="group cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-all block w-full text-center"
                            title="عرض تفاصيل المهمة والمتجر"
                          >
                            <div className="font-bold text-white text-sm group-hover:text-teal-300 flex items-center justify-center gap-1.5">
                              <span>{client.company_name}</span>
                              <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-teal-400" />
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{client.name}</div>
                          </button>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <span className="text-white text-xs font-bold">{stage.stage_name}</span>
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {stage.head_instructions && (
                                <span
                                  onClick={() => {
                                    setSelectedTaskForDetails({ client, stage });
                                    setEditingTaskDesc(stage.head_instructions || '');
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] text-teal-300 bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 px-2 py-0.5 rounded-full cursor-pointer transition-colors"
                                  title={stage.head_instructions}
                                >
                                  ✍️ توجيهاتي للموظف
                                </span>
                              )}
                              {(stage.description || client.request_details) && (
                                <span
                                  onClick={() => {
                                    setSelectedTaskForDetails({ client, stage });
                                    setEditingTaskDesc(stage.head_instructions || '');
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] text-indigo-300 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 px-2 py-0.5 rounded-full cursor-pointer transition-colors"
                                  title={stage.description || client.request_details || ''}
                                >
                                  📋 توجيهات الإدارة
                                </span>
                              )}
                              {(isUnassigned || isAssignedToMe) && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  بانتظار التعيين
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center">
                            {(() => {
                              const assignedMem = deptMembers.find(m => m.id === stage.assigned_member_id);
                              const needsAssignment = isUnassigned || isAssignedToMe || !assignedMem;

                              if (needsAssignment) {
                                return (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedStageForAssignment({ client, stage });
                                      const defaultEmp = deptMembers.find(m => m.id !== currentMember.id);
                                      setAssignmentSelectedMemberId(defaultEmp ? defaultEmp.id : '');
                                      setAssignmentInstructions(stage.head_instructions || '');
                                    }}
                                    className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                  >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    <span>تعيين موظف</span>
                                  </button>
                                );
                              }

                              return (
                                <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-inner">
                                  <div className="text-right">
                                    <div className="text-xs font-bold text-white flex items-center gap-1">
                                      <span>👤 {assignedMem.name}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400">{assignedMem.role}</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedStageForAssignment({ client, stage });
                                      setAssignmentSelectedMemberId(assignedMem.id);
                                      setAssignmentInstructions(stage.head_instructions || '');
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                    title="تحويل لموظف آخر أو تعديل التوجيهات"
                                  >
                                    <Edit className="w-3.5 h-3.5 text-indigo-400" />
                                  </button>
                                </div>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex justify-center">
                            <StatusBadge status={stage.status} size="sm" />
                          </div>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex justify-center">
                            <PriorityBadge priority={client.priority} />
                          </div>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<FileText className="w-3.5 h-3.5 text-teal-400" />}
                              onClick={() => {
                                setSelectedTaskForDetails({ client, stage });
                                setEditingTaskDesc(stage.head_instructions || '');
                              }}
                              title="عرض وتعديل توجيهات المهمة وبيانات المتجر"
                            >
                              التوجيهات والتفاصيل
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<FolderGit2 className="w-3.5 h-3.5 text-amber-400" />}
                              onClick={() => onOpenDriveModal(client)}
                              title="فتح مجلد جوجل درايف"
                            >
                              ملفات Drive
                            </Button>
                            {onOpenHistoryModal && (
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<History className="w-3.5 h-3.5 text-indigo-400" />}
                                onClick={() => onOpenHistoryModal(stage, client)}
                                title="عرض سجل دورة حياة المهمة وتتبع التحويلات"
                              >
                                سجل الدورة
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 4. Tab Content: My Personal Assigned Tasks */}
      {activeTab === 'my_tasks' && (
        <div className="space-y-4">
          {currentTabTasks.length === 0 ? (
            <EmptyState
              icon={<UserCheck className="w-6 h-6 text-indigo-400" />}
              title="لا توجد مهام مسندة إليك شخصياً حالياً"
              description="عندما يقوم الأدمن أو أنت بإسناد مهمة إلى حسابك مباشرة ستظهر هنا لمتابعتها وتسليم مخرجاتها."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {currentTabTasks.map(({ client, stage }) => (
                <Card key={stage.id} className="border-indigo-500/30 hover:border-indigo-500/60 transition-colors flex flex-col justify-between">
                  <CardBody className="p-4 sm:p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300">
                          {client.service_type}
                        </span>
                        <h3 className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>{client.company_name}</span>
                        </h3>
                      </div>
                      <StatusBadge status={stage.status} size="sm" />
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 block font-medium">المهمة المطلوبة منك:</span>
                      <h4 className="text-xs font-bold text-white leading-relaxed">{stage.stage_name}</h4>
                      {stage.description && (
                        <p className="text-[11px] text-slate-400 mt-1">{stage.description}</p>
                      )}
                    </div>

                    {stage.revision_notes && (
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 space-y-1">
                        <span className="font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          <span>ملاحظات التعديل:</span>
                        </span>
                        <p className="text-[11px] leading-relaxed">{stage.revision_notes}</p>
                      </div>
                    )}
                  </CardBody>

                    <div className="p-3 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between gap-2">
                      {stage.status !== 'completed' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Send className="w-3.5 h-3.5" />}
                          className="flex-1"
                          onClick={() => handleOpenSubmitModal({ client, stage })}
                        >
                          تسليم العمل للمراجعة
                        </Button>
                      ) : (
                        <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>مكتمل ومعتمد</span>
                        </span>
                      )}

                      {onOpenHistoryModal && (
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<History className="w-3.5 h-3.5 text-indigo-400" />}
                          onClick={() => onOpenHistoryModal(stage, client)}
                          title="عرض سجل دورة حياة المهمة"
                        >
                          السجل
                        </Button>
                      )}

                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<FolderGit2 className="w-3.5 h-3.5 text-amber-400" />}
                        onClick={() => onOpenDriveModal(client)}
                      >
                        Drive
                      </Button>
                    </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Tab Content: Review Queue */}
      {activeTab === 'review' && (
        <div className="space-y-4">
          {reviewTasks.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="w-6 h-6 text-emerald-400" />}
              title="رائع! لا توجد تسليمات معلقة تنتظر المراجعة"
              description="جميع الأعمال المسلمة من موظفي قسمك تمت مراجعتها واعتمادها."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {reviewTasks.map(({ client, stage }) => {
                const member = members.find(m => m.id === stage.assigned_member_id);

                return (
                  <Card key={stage.id} className="border-amber-500/40 hover:border-amber-500/60 transition-colors flex flex-col justify-between">
                    <CardBody className="p-4 sm:p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300">
                            {client.service_type}
                          </span>
                          <h3 className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>{client.company_name}</span>
                          </h3>
                        </div>
                        <StatusBadge status="under_review" size="sm" />
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 block font-medium">المهمة المسلمة:</span>
                        <h4 className="text-xs font-bold text-white">{stage.stage_name}</h4>
                      </div>

                      {member && (
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                          <div className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {member.name ? member.name.slice(0, 1) : 'م'}
                          </div>
                          <span>الموظف: <strong className="text-white">{member.name}</strong></span>
                        </div>
                      )}

                      {/* Deliverables */}
                      <div className="space-y-1.5 pt-1 border-t border-slate-800">
                        {stage.deliverable_url && (
                          <a
                            href={stage.deliverable_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:underline font-bold"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>معاينة ملف المخرجات ↗</span>
                          </a>
                        )}
                        {stage.deliverable_note && (
                          <p className="text-xs text-slate-300 bg-slate-800/40 p-2 rounded-lg border border-slate-700/50 italic">
                            "{stage.deliverable_note}"
                          </p>
                        )}
                      </div>
                    </CardBody>

                    <div className="p-3 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between gap-2">
                      <Button
                        variant="success"
                        size="sm"
                        icon={<Check className="w-3.5 h-3.5" />}
                        className="flex-1"
                        onClick={() => handleApprove(stage.id)}
                      >
                        اعتماد
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<RotateCcw className="w-3.5 h-3.5" />}
                        className="flex-1 text-rose-400 hover:text-rose-300 border-rose-500/30"
                        onClick={() => setSelectedReviewStage({ client, stage })}
                      >
                        طلب تعديل
                      </Button>
                      {onOpenHistoryModal && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<History className="w-3.5 h-3.5 text-indigo-400" />}
                          onClick={() => onOpenHistoryModal(stage, client)}
                          title="عرض سجل دورة حياة المهمة"
                        >
                          السجل
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. Tab Content: Team & Workload */}
      {activeTab === 'team' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {deptMembers.map(member => {
            const memberAssigned = deptTasks.filter(item => item.stage.assigned_member_id === member.id);
            const activeCount = memberAssigned.filter(item => item.stage.status !== 'completed').length;
            const completedCount = memberAssigned.filter(item => item.stage.status === 'completed').length;

            return (
              <Card key={member.id} className="hover:border-slate-700 transition-colors">
                <CardBody className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600/30 to-slate-800 border border-indigo-500/30 flex items-center justify-center font-bold text-xs text-indigo-300 shadow-inner shrink-0 select-none">
                      {member.name ? (member.name.trim().split(/\s+/).length > 1 ? member.name.trim().split(/\s+/)[0][0] + member.name.trim().split(/\s+/)[1][0] : member.name.slice(0, 2)) : 'م'}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                        <span>{member.name}</span>
                        {member.id === currentMember.id && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                            أنت
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-400">{member.role}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-center">
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      <span className="text-[10px] text-slate-400 block font-medium">مهام نشطة</span>
                      <span className="text-sm font-black text-amber-400">{activeCount}</span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      <span className="text-[10px] text-slate-400 block font-medium">مهام مكتملة</span>
                      <span className="text-sm font-black text-emerald-400">{completedCount}</span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Review / Request Revision Modal */}
      {selectedReviewStage && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReviewStage(null)}
          title={`طلب تعديل على تسليم: ${selectedReviewStage.stage.stage_name}`}
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
              <span className="text-slate-400 block">الشركة: <strong className="text-white">{selectedReviewStage.client.company_name}</strong></span>
              {selectedReviewStage.stage.deliverable_url && (
                <span className="text-slate-400 block truncate">
                  رابط المخرجات: <a href={selectedReviewStage.stage.deliverable_url} target="_blank" rel="noreferrer" className="text-indigo-400 underline">{selectedReviewStage.stage.deliverable_url}</a>
                </span>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1 font-bold">
                اكتب ملاحظات وتوجيهات التعديل المطلوبة بدقة:
              </label>
              <Textarea
                required
                rows={4}
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                placeholder="مثال: يرجى تعديل المقاسات لتناسب إعلانات ستوري إنستقرام وإبراز العرض في أول 3 ثوانٍ..."
                className="w-full text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setSelectedReviewStage(null)}
              >
                إلغاء
              </Button>
              <Button
                variant="danger"
                disabled={reviewLoading || !reviewFeedback.trim()}
                onClick={() => handleRequestRevision(selectedReviewStage.stage.id)}
              >
                {reviewLoading ? 'جارِ إرسال الملاحظات...' : 'إرسال طلب التعديل'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Submit Deliverable Modal for Head's Own Tasks */}
      {selectedStageToSubmit && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedStageToSubmit(null)}
          title={`تسليم وإحالة المهمة: ${selectedStageToSubmit.stage.stage_name}`}
        >
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <span className="text-slate-400 block">الشركة: <strong className="text-white">{selectedStageToSubmit.client.company_name}</strong></span>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1 font-bold">
                رابط المخرجات على Google Drive أو ملف العمل:
              </label>
              <Input
                type="url"
                value={deliverableUrl}
                onChange={(e) => setDeliverableUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="w-full text-xs"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1 font-bold">
                ملاحظات التسليم والشرح:
              </label>
              <Textarea
                rows={3}
                value={deliverableNote}
                onChange={(e) => setDeliverableNote(e.target.value)}
                placeholder="تفاصيل ما تم تنفيذه وإنجازه..."
                className="w-full text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setSelectedStageToSubmit(null)}
              >
                إلغاء
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'جارِ التسليم...' : 'تسليم المهمة للمراجعة'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Assignment & Briefing Modal */}
      {selectedStageForAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">إسناد وتوجيه المهمة للموظف</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedStageForAssignment.client.company_name} • <span className="text-teal-300 font-semibold">{selectedStageForAssignment.stage.stage_name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStageForAssignment(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmAssignment} className="p-6 space-y-4 text-xs">
              {/* Management brief context if exists */}
              {(selectedStageForAssignment.stage.description || selectedStageForAssignment.client.request_details) && (
                <div className="bg-slate-950/60 border-r-2 border-indigo-500 rounded-xl p-3 border border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>توجيهات ومتطلبات الإدارة (مرجع):</span>
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed max-h-24 overflow-y-auto whitespace-pre-wrap">
                    {selectedStageForAssignment.stage.description || selectedStageForAssignment.client.request_details}
                  </p>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-200 mb-1.5">
                  1. اختر الموظف المنفذ من فريق قسمك:
                </label>
                <select
                  required
                  value={assignmentSelectedMemberId}
                  onChange={(e) => setAssignmentSelectedMemberId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white font-bold text-xs focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  <option value="" disabled>-- اختر الموظف المنفذ --</option>
                  {deptMembers.filter(m => m.id !== currentMember.id).map(m => (
                    <option key={m.id} value={m.id}>
                      👤 {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-teal-300 flex items-center gap-1.5">
                    <span>✍️</span>
                    <span>2. توجيهاتك الخاصة للموظف:</span>
                  </label>
                  <span className="text-[10px] text-slate-400">ستصل للموظف كتعليمات فنية منك</span>
                </div>
                <textarea
                  rows={3}
                  value={assignmentInstructions}
                  onChange={(e) => setAssignmentInstructions(e.target.value)}
                  placeholder="اكتب هنا توجيهاتك وتفاصيل التنفيذ المطلوبة من الموظف..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-teal-400 text-white placeholder-slate-500 leading-relaxed text-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedStageForAssignment(null)}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!assignmentSelectedMemberId || isSubmittingAssignment}
                  loading={isSubmittingAssignment}
                  icon={<Send className="w-3.5 h-3.5" />}
                  className="bg-teal-600 hover:bg-teal-500 text-white"
                >
                  تأكيد التكليف وإرسال المهمة
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details & Brief Directives Modal */}
      {selectedTaskForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            
            {/* 1. Modal Top Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/25 text-teal-400 flex items-center justify-center font-bold shrink-0 shadow-inner">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold text-white tracking-wide">{selectedTaskForDetails.stage.stage_name}</h3>
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-teal-300 border border-teal-500/30">
                      {selectedTaskForDetails.client.platform || 'زد'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-slate-200 font-semibold">{selectedTaskForDetails.client.company_name}</span>
                    <span className="text-slate-600">•</span>
                    <span>العميل: {selectedTaskForDetails.client.name}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <StatusBadge status={selectedTaskForDetails.stage.status} size="sm" />
                <PriorityBadge priority={selectedTaskForDetails.client.priority} />
                <button
                  type="button"
                  onClick={() => setSelectedTaskForDetails(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer mr-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 2. Modal Body - 2 Columns */}
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900/50">
              
              {/* Right Column: Directives & Instructions (7 / 12) */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Admin Management Brief */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2 relative overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      <span>توجيهات ومتطلبات الإدارة</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">مرجع للاطلاع</span>
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans max-h-36 overflow-y-auto pt-1">
                    {selectedTaskForDetails.stage.description || selectedTaskForDetails.client.request_details || (
                      <span className="text-slate-500 italic text-[11px]">لا توجد ملاحظات إضافية مسجلة من الإدارة على هذه المهمة.</span>
                    )}
                  </div>
                </div>

                {/* Head Instructions to Employee */}
                <div className="bg-slate-950/70 border border-teal-500/20 rounded-xl p-4 space-y-3 relative shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <div>
                      <h4 className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                        <span>✍️</span>
                        <span>توجيهات رئيس القسم للموظف:</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        تصل للموظف كتعليمات فنية مباشرة للتنفيذ
                      </p>
                    </div>
                    {selectedTaskForDetails.stage.head_instructions && (
                      <span className="text-[10px] font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                        محدثة
                      </span>
                    )}
                  </div>

                  <Textarea
                    rows={4}
                    value={editingTaskDesc}
                    onChange={(e) => setEditingTaskDesc(e.target.value)}
                    placeholder="اكتب هنا توجيهاتك الفنية للموظف (نقاط العمل، التفاصيل المطلوبة، الزوايا الفنية)..."
                    className="w-full text-xs leading-relaxed bg-slate-900 border-slate-700/80 focus:border-teal-400 rounded-xl p-3 text-slate-100 placeholder:text-slate-500"
                  />

                  <div className="flex items-center justify-between pt-1">
                    {saveDescSuccess ? (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-fadeIn">
                        <Check className="w-3.5 h-3.5" />
                        <span>تم حفظ التوجيهات بنجاح!</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">
                        يمكنك تعديل التوجيهات وحفظها في أي وقت
                      </span>
                    )}

                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      onClick={handleSaveHeadInstructions}
                      disabled={isSavingTaskDesc}
                      className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-sm px-4"
                    >
                      {isSavingTaskDesc ? 'جاري الحفظ...' : 'حفظ التوجيهات'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Left Column: Metadata & Store Specs Sidebar (5 / 12) */}
              <div className="lg:col-span-5 space-y-4">
                
                {/* Assigned Member Card */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5 shadow-sm">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">الموظف المكلف بالمهمة</span>
                  {(() => {
                    const mem = members.find(m => m.id === selectedTaskForDetails.stage.assigned_member_id);
                    if (mem) {
                      return (
                        <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                              {mem.name.slice(0, 1)}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-white block">{mem.name}</span>
                              <span className="text-[10px] text-slate-400 block">{mem.role}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const cl = selectedTaskForDetails.client;
                              const st = selectedTaskForDetails.stage;
                              setSelectedTaskForDetails(null);
                              setSelectedStageForAssignment({ client: cl, stage: st });
                              setAssignmentSelectedMemberId(mem.id);
                              setAssignmentInstructions(editingTaskDesc || st.head_instructions || '');
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="تحويل لموظف آخر"
                          >
                            <Edit className="w-3.5 h-3.5 text-indigo-400" />
                          </button>
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center justify-between bg-amber-500/5 p-2.5 rounded-lg border border-amber-500/20">
                        <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                          <span>⚠️ لم يتم التعيين بعد</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const cl = selectedTaskForDetails.client;
                            const st = selectedTaskForDetails.stage;
                            setSelectedTaskForDetails(null);
                            setSelectedStageForAssignment({ client: cl, stage: st });
                            const defaultEmp = deptMembers.find(m => m.id !== currentMember.id);
                            setAssignmentSelectedMemberId(defaultEmp ? defaultEmp.id : '');
                            setAssignmentInstructions(editingTaskDesc || st.head_instructions || '');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
                        >
                          تعيين موظف
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Store & Project Specs */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5 text-xs shadow-sm">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">تفاصيل المتجر والطلب</span>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-1.5">
                      <span className="text-slate-400 text-[11px]">المنصة:</span>
                      <span className="text-slate-200 font-bold">{selectedTaskForDetails.client.platform || 'زد'}</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-850 pb-1.5">
                      <span className="text-slate-400 text-[11px]">الباقة / الخدمة:</span>
                      <span className="text-amber-300 font-bold text-[11px]">{selectedTaskForDetails.client.package_name || selectedTaskForDetails.client.service_type || 'باقة متكاملة'}</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-850 pb-1.5">
                      <span className="text-slate-400 text-[11px]">إيميل الوكالة:</span>
                      <span className="text-indigo-300 font-mono text-[11px] select-all truncate max-w-[150px]">{selectedTaskForDetails.client.agency_email || 'غير محدد'}</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-850 pb-1.5">
                      <span className="text-slate-400 text-[11px]">رقم الهاتف:</span>
                      <span className="text-slate-300 font-mono text-[11px]">{selectedTaskForDetails.client.phone || 'غير مسجل'}</span>
                    </div>

                    {selectedTaskForDetails.client.website_url && (
                      <div className="pt-0.5">
                        <span className="text-slate-400 text-[11px] block mb-0.5">رابط المتجر:</span>
                        <a
                          href={selectedTaskForDetails.client.website_url.startsWith('http') ? selectedTaskForDetails.client.website_url : `https://${selectedTaskForDetails.client.website_url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:underline font-mono text-[11px] truncate block"
                        >
                          {selectedTaskForDetails.client.website_url} ↗
                        </a>
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* 3. Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0 text-xs">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={<FolderGit2 className="w-3.5 h-3.5 text-amber-400" />}
                  onClick={() => onOpenDriveModal(selectedTaskForDetails.client)}
                >
                  ملفات Drive
                </Button>
                {onOpenHistoryModal && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<History className="w-3.5 h-3.5 text-indigo-400" />}
                    onClick={() => onOpenHistoryModal(selectedTaskForDetails.stage, selectedTaskForDetails.client)}
                  >
                    سجل الدورة
                  </Button>
                )}
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedTaskForDetails(null)}
              >
                إغلاق
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};


