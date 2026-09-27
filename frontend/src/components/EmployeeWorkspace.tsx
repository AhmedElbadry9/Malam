import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, Clock, FolderGit2, Send, Building2,
  AlertTriangle, RotateCcw, ExternalLink, ShieldCheck, History, FileText,
  Globe, Copy, Check
} from 'lucide-react';
import type { Client, TeamMember, TaskStage } from '../types';
import { Button } from './ui/Button';
import { Card, CardBody } from './ui/Card';
import { StatusBadge } from './ui/StatusBadge';
import { PriorityBadge } from './ui/PriorityBadge';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { EmptyState } from './ui/EmptyState';

interface EmployeeWorkspaceProps {
  currentMember: TeamMember;
  clients: Client[];
  onSubmitForReview: (stageId: number, note?: string, url?: string) => Promise<void>;
  onOpenDriveModal: (client: Client) => void;
  onOpenBriefModal?: (client: Client) => void;
  onOpenHistoryModal?: (stage: TaskStage, client?: Client) => void;
}

export const EmployeeWorkspace: React.FC<EmployeeWorkspaceProps> = ({
  currentMember,
  clients,
  onSubmitForReview,
  onOpenDriveModal,
  onOpenBriefModal: _onOpenBriefModal,
  onOpenHistoryModal
}) => {
  const [activeTab, setActiveTab] = useState<'todo' | 'revisions' | 'review' | 'done'>('todo');
  const [selectedStageToSubmit, setSelectedStageToSubmit] = useState<{ client: Client; stage: TaskStage } | null>(null);
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<{ client: Client; stage: TaskStage } | null>(null);
  const [deliverableNote, setDeliverableNote] = useState('');
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopyText = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Filter tasks assigned ONLY to this logged in employee
  const memberTasks: { client: Client; stage: TaskStage }[] = [];
  
  clients.forEach(client => {
    client.stages?.forEach(stage => {
      if (stage.assigned_member_id === currentMember.id) {
        memberTasks.push({ client, stage });
      }
    });
  });

  const inProgressTasks = memberTasks.filter(item => item.stage.status === 'in_progress' || item.stage.status === 'pending');
  const revisionTasks = memberTasks.filter(item => item.stage.status === 'revision_requested');
  const underReviewTasks = memberTasks.filter(item => item.stage.status === 'under_review');
  const completedTasks = memberTasks.filter(item => item.stage.status === 'completed');

  const handleOpenSubmitModal = (item: { client: Client; stage: TaskStage }) => {
    setSelectedStageToSubmit(item);
    setDeliverableNote(item.stage.deliverable_note || '');
    setDeliverableUrl(item.stage.deliverable_url || '');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStageToSubmit) return;

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
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'تعذر تسليم المرحلة للمراجعة، يرجى المحاولة مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimestamp = (ts?: string | null) => {
    if (!ts) return 'غير محدد';
    const date = new Date(ts);
    return date.toLocaleString('ar-EG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* 1. Employee Welcome Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600/30 to-slate-800 border border-indigo-500/30 flex items-center justify-center font-bold text-sm text-indigo-300 shadow-inner shrink-0 select-none">
            {currentMember.name ? (currentMember.name.trim().split(/\s+/).length > 1 ? currentMember.name.trim().split(/\s+/)[0][0] + currentMember.name.trim().split(/\s+/)[1][0] : currentMember.name.slice(0, 2)) : 'م'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white">
                أهلاً بك، {currentMember.name}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                {currentMember.department?.name_ar || 'عضو فريق'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              مساحة العمل الخاصة بك لمتابعة المهام المطلوبة منك وتسليم المخرجات للاعتماد
            </p>
          </div>
        </div>

        {/* Quick KPI stats */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
            <span className="text-[10px] text-slate-400 block font-medium">المهام الجارية</span>
            <span className="text-base font-black text-amber-400">{inProgressTasks.length}</span>
          </div>
          {revisionTasks.length > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center animate-pulse">
              <span className="text-[10px] text-rose-300 block font-medium">مطلوب تعديلات</span>
              <span className="text-base font-black text-rose-400">{revisionTasks.length}</span>
            </div>
          )}
          <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
            <span className="text-[10px] text-slate-400 block font-medium">قيد المراجعة</span>
            <span className="text-base font-black text-indigo-300">{underReviewTasks.length}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
            <span className="text-[10px] text-slate-400 block font-medium">تم إنجازه</span>
            <span className="text-base font-black text-emerald-400">{completedTasks.length}</span>
          </div>
        </div>
      </div>

      {/* 2. CRITICAL ALERT: Revisions Requested */}
      {revisionTasks.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 shadow-lg space-y-3">
          <div className="flex items-center gap-2.5 text-rose-300">
            <AlertTriangle className="w-5 h-5 shrink-0 animate-bounce" />
            <h2 className="text-sm sm:text-base font-black">
              تنبيه عاجل: طُلب منك تعديلات على {revisionTasks.length} مهمة
            </h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            قام رئيس القسم أو الإدارة بمراجعة أعمالك وطلب إجراء تعديلات محددة. يرجى مراجعة الملاحظات وتحديث المخرجات ثم إعادة التسليم.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {revisionTasks.map(({ client, stage }) => (
              <div
                key={stage.id}
                className="p-3.5 rounded-xl bg-slate-900 border border-rose-500/40 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{client.company_name}</span>
                    </h3>
                    <p className="text-sm font-black text-rose-300 mt-0.5">{stage.stage_name}</p>
                  </div>
                  <StatusBadge status="revision_requested" size="sm" />
                </div>

                {stage.revision_notes && (
                  <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200">
                    <strong className="block text-[11px] text-rose-300 mb-1">ملاحظات التعديل المطلوبة:</strong>
                    <p className="leading-relaxed">"{stage.revision_notes}"</p>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedTaskForDetails({ client, stage })}
                      className="text-[11px] text-teal-400 hover:text-teal-300 font-bold"
                    >
                      وصف وتفاصيل المهمة ↗
                    </button>
                    <button
                      onClick={() => onOpenDriveModal(client)}
                      className="text-[11px] text-indigo-400 hover:underline font-bold"
                    >
                      ملفات العميل ↗
                    </button>
                    {onOpenHistoryModal && (
                      <button
                        onClick={() => onOpenHistoryModal(stage, client)}
                        className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
                      >
                        <History className="w-3 h-3 text-indigo-400" />
                        <span>سجل الدورة</span>
                      </button>
                    )}
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Send className="w-3.5 h-3.5" />}
                    onClick={() => handleOpenSubmitModal({ client, stage })}
                  >
                    إعادة التسليم
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Task Tabs Filter */}
      <div className="flex items-center bg-slate-900 rounded-xl border border-slate-800 p-1 w-full sm:w-auto gap-1">
        <button
          onClick={() => setActiveTab('todo')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'todo'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>المطلوب مني إنجازه</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-800 text-slate-200">
            {inProgressTasks.length}
          </span>
        </button>

        {revisionTasks.length > 0 && (
          <button
            onClick={() => setActiveTab('revisions')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'revisions'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-rose-400 hover:bg-rose-500/10'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>مطلوب تعديلات</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white">
              {revisionTasks.length}
            </span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('review')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'review'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>قيد المراجعة</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-800 text-slate-200">
            {underReviewTasks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('done')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'done'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>المكتملة</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-800 text-slate-200">
            {completedTasks.length}
          </span>
        </button>
      </div>

      {/* 4. Task Grid */}
      {activeTab === 'todo' && (
        <div className="space-y-4">
          {inProgressTasks.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="w-6 h-6 text-emerald-400" />}
              title="رائع! لا توجد مهام جديدة مطلوبة منك حالياً"
              description="أنت مواكب لكافة متطلبات المشاريع المسندة إليك بنجاح."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {inProgressTasks.map(({ client, stage }) => (
                <Card key={stage.id} className="hover:border-slate-700 transition-colors flex flex-col justify-between">
                  <CardBody className="p-4 sm:p-5 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                            {client.platform || 'زد'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/20">
                            {client.service_type || 'باقة متكاملة'}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-1.5 pt-0.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate">{client.company_name}</span>
                        </h3>
                        <p className="text-[11px] text-slate-400">{client.name}</p>
                      </div>
                      <StatusBadge status={stage.status} size="sm" />
                    </div>

                    {/* Task Title & Description */}
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">اسم المهمة:</span>
                        <h4 className="text-xs sm:text-sm font-black text-white">{stage.stage_name}</h4>
                      </div>

                      {/* Head Directives (If Provided) */}
                      {stage.head_instructions && (
                        <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs space-y-1">
                          <span className="text-[10px] font-bold text-teal-300 flex items-center gap-1">
                            <span>✍️ توجيهات وتعليمات رئيس القسم:</span>
                          </span>
                          <p className="text-slate-100 leading-relaxed whitespace-pre-wrap font-medium">{stage.head_instructions}</p>
                        </div>
                      )}

                      {/* Admin Management Brief */}
                      {stage.description && (
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                          <span className="text-[10px] font-bold text-indigo-300 flex items-center gap-1">
                            <span>📋 توجيهات ومتطلبات الإدارة:</span>
                          </span>
                          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{stage.description}</p>
                        </div>
                      )}

                      {/* General Client Request Details (if no specific stage admin description) */}
                      {!stage.description && client.request_details && (
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                          <span className="text-[10px] font-bold text-indigo-300 flex items-center gap-1">
                            <span>📋 متطلبات الطلب من الإدارة:</span>
                          </span>
                          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{client.request_details}</p>
                        </div>
                      )}
                    </div>

                    {/* Client Quick Links */}
                    <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setSelectedTaskForDetails({ client, stage })}
                          className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300 font-bold cursor-pointer"
                        >
                          <span>وصف وتفاصيل المهمة ↗</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenDriveModal(client)}
                          className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                        >
                          <FolderGit2 className="w-3.5 h-3.5" />
                          <span>مجلد Drive</span>
                        </button>
                      </div>
                      {onOpenHistoryModal && (
                        <button
                          onClick={() => onOpenHistoryModal(stage, client)}
                          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5 text-indigo-400" />
                          <span>سجل الدورة</span>
                        </button>
                      )}
                    </div>
                  </CardBody>

                  <div className="p-3 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between gap-2">
                    <PriorityBadge priority={client.priority} />
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Send className="w-3.5 h-3.5" />}
                      onClick={() => handleOpenSubmitModal({ client, stage })}
                    >
                      تسليم العمل للمراجعة
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Under Review */}
      {activeTab === 'review' && (
        <div className="space-y-4">
          {underReviewTasks.length === 0 ? (
            <EmptyState
              title="لا توجد مهام قيد المراجعة حالياً"
              description="عند تسليمك لأي مهمة، ستظهر هنا حتى يقوم المسؤول باعتمادها."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {underReviewTasks.map(({ client, stage }) => (
                <Card key={stage.id} className="border-amber-500/30">
                  <CardBody className="p-4 sm:p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>{client.company_name}</span>
                        </h3>
                        <h4 className="text-xs font-black text-amber-300 mt-1">{stage.stage_name}</h4>
                      </div>
                      <StatusBadge status="under_review" size="sm" />
                    </div>

                    <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-200">
                      تم تسليم العمل وإحالته للمراجعة الإدارية. بانتظار الاعتماد.
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      {stage.deliverable_url ? (
                        <a
                          href={stage.deliverable_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>رابط التسليم المسجل ↗</span>
                        </a>
                      ) : <span />}

                      {onOpenHistoryModal && (
                        <button
                          onClick={() => onOpenHistoryModal(stage, client)}
                          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
                        >
                          <History className="w-3.5 h-3.5 text-indigo-400" />
                          <span>سجل الدورة</span>
                        </button>
                      )}
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Completed */}
      {activeTab === 'done' && (
        <div className="space-y-4">
          {completedTasks.length === 0 ? (
            <EmptyState
              title="لم تكتمل أي مهام بعد"
              description="ستظهر المهام المعتمدة والمنجزة هنا بمجرد موافقة الإدارة."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {completedTasks.map(({ client, stage }) => (
                <Card key={stage.id} className="border-emerald-500/30 bg-slate-900/50">
                  <CardBody className="p-4 sm:p-5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>{client.company_name}</span>
                        </h3>
                        <h4 className="text-xs font-black text-emerald-300 mt-1">{stage.stage_name}</h4>
                      </div>
                      <StatusBadge status="completed" size="sm" />
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950/60 border border-emerald-500/20 text-[11px] text-emerald-300/90 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-bold">
                        <span>🔒</span>
                        <span>مكتملة ومؤرشفة (تم إنهاء صلاحية التعديل)</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <p className="text-[10px] text-slate-400">
                        تم الاعتماد: {formatTimestamp(stage.completion_timestamp || stage.reviewed_at)}
                      </p>
                      {onOpenHistoryModal && (
                        <button
                          onClick={() => onOpenHistoryModal(stage, client)}
                          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
                        >
                          <History className="w-3.5 h-3.5 text-indigo-400" />
                          <span>سجل الدورة</span>
                        </button>
                      )}
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Submit Task for Review */}
      {selectedStageToSubmit && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedStageToSubmit(null)}
          title={`تسليم مرحلة: ${selectedStageToSubmit.stage.stage_name}`}
          description={`العميل: ${selectedStageToSubmit.client.company_name}`}
          icon={<Send className="w-5 h-5 text-indigo-400" />}
          footer={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedStageToSubmit(null)}
                disabled={submitting}
              >
                إلغاء
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmitReview}
                loading={submitting}
                icon={<Send className="w-3.5 h-3.5" />}
              >
                تأكيد التسليم للمراجعة
              </Button>
            </>
          }
        >
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs leading-relaxed">
              سيتم إحالة هذه المرحلة إلى رئيس القسم أو إدارة الوكالة لمراجعتها والتأكد من مطابقتها للمواصفات قبل اعتمادها رسمياً.
            </div>

            <Input
              label="رابط ملف المخرجات والتسليم (Deliverable URL):"
              type="text"
              dir="ltr"
              value={deliverableUrl}
              onChange={(e) => setDeliverableUrl(e.target.value)}
              placeholder="https://drive.google.com/... أو https://figma.com/file/..."
              hint="رابط مجلد Google Drive، ملف Figma، أو رابط تجريبي مباشر"
            />

            <Textarea
              label="ملاحظات التسليم والتوضيحات للمراجع:"
              rows={3}
              value={deliverableNote}
              onChange={(e) => setDeliverableNote(e.target.value)}
              placeholder="مثال: تم الانتهاء من جميع تصاميم البنرات بدقة عالية ورفع النسخ المصدرية في المجلد رقم 02..."
            />
          </form>
        </Modal>
      )}

      {/* Task Details & Full Brief Modal */}
      {selectedTaskForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
            
            {/* 1. Modal Header - Spacious & Clean */}
            <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/90 flex items-start justify-between gap-4 shrink-0">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30">
                    {selectedTaskForDetails.client.platform || 'زد'}
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-white leading-snug">
                    {selectedTaskForDetails.stage.stage_name}
                  </h2>
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="text-slate-200 font-bold">{selectedTaskForDetails.client.company_name}</span>
                  <span className="text-slate-600">•</span>
                  <span>العميل: {selectedTaskForDetails.client.name}</span>
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 pt-0.5">
                <StatusBadge status={selectedTaskForDetails.stage.status} size="sm" />
                <PriorityBadge priority={selectedTaskForDetails.client.priority} />
                <button
                  type="button"
                  onClick={() => setSelectedTaskForDetails(null)}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-sm font-bold ml-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 2. Modal Body - Clean 2-Column Responsive Layout */}
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-900">
              
              {/* Main Column: Instructions & Notes (7 / 12) */}
              <div className="md:col-span-7 space-y-5">
                
                {/* Revisions Alert if any */}
                {selectedTaskForDetails.stage.revision_notes && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 space-y-1.5 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>ملاحظات التعديل المطلوبة من رئيس القسم / الإدارة:</span>
                    </div>
                    <p className="text-xs text-rose-100 leading-relaxed whitespace-pre-wrap font-sans pt-1">
                      {selectedTaskForDetails.stage.revision_notes}
                    </p>
                  </div>
                )}

                {/* Head Instructions */}
                {selectedTaskForDetails.stage.head_instructions ? (
                  <div className="rounded-xl bg-slate-950/60 border border-teal-500/30 p-4 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <h4 className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                        <span>✍️</span>
                        <span>توجيهات رئيس القسم للمهمة:</span>
                      </h4>
                      <span className="text-[10px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20 font-bold">
                        تعليمات فنية
                      </span>
                    </div>
                    <p className="text-xs text-slate-100 leading-relaxed whitespace-pre-wrap font-medium pt-1">
                      {selectedTaskForDetails.stage.head_instructions}
                    </p>
                  </div>
                ) : null}

                {/* Admin Management Brief */}
                <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span>توجيهات ومتطلبات الإدارة (مرجع للاطلاع):</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                    {selectedTaskForDetails.stage.description || selectedTaskForDetails.client.request_details || (
                      <span className="text-slate-500 italic text-[11px]">لا توجد ملاحظات إضافية مسجلة من الإدارة على هذه المهمة.</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Sidebar Column: Details (5 / 12) */}
              <div className="md:col-span-5 space-y-4">
                
                {/* Clean Property List */}
                <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4 space-y-2.5 text-xs">
                  <span className="text-xs font-bold text-white block pb-1 border-b border-slate-800">
                    تفاصيل المتجر والطلب
                  </span>

                  <div className="flex items-center justify-between py-1 border-b border-slate-850">
                    <span className="text-slate-400 text-xs">اسم المتجر:</span>
                    <span className="text-slate-200 font-bold">{selectedTaskForDetails.client.company_name}</span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-850">
                    <span className="text-slate-400 text-xs">المنصة:</span>
                    <span className="text-slate-200 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {selectedTaskForDetails.client.platform || 'زد'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-850">
                    <span className="text-slate-400 text-xs">الباقة / الخدمة:</span>
                    <span className="text-amber-300 font-bold">
                      {selectedTaskForDetails.client.package_name || selectedTaskForDetails.client.service_type || 'باقة متكاملة'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-850">
                    <span className="text-slate-400 text-xs">إيميل الوكالة:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-indigo-300 font-mono text-[11px] select-all max-w-[140px] truncate">
                        {selectedTaskForDetails.client.agency_email || 'غير مسجل'}
                      </span>
                      {selectedTaskForDetails.client.agency_email && (
                        <button
                          type="button"
                          onClick={() => handleCopyText(selectedTaskForDetails.client.agency_email || '', 'email')}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="نسخ الإيميل"
                        >
                          {copiedField === 'email' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>


                  {selectedTaskForDetails.client.website_url && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-400 text-xs">رابط المتجر:</span>
                      <a
                        href={selectedTaskForDetails.client.website_url.startsWith('http') ? selectedTaskForDetails.client.website_url : `https://${selectedTaskForDetails.client.website_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline font-mono text-xs flex items-center gap-1 font-bold"
                      >
                        <Globe className="w-3 h-3" />
                        <span>زيارة المتجر ↗</span>
                      </a>
                    </div>
                  )}
                </div>

              </div>

            </div>

            {/* 3. Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between shrink-0 text-xs">
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
