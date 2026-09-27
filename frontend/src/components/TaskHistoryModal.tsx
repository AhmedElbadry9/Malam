import React, { useState, useEffect } from 'react';
import { 
  History, Clock, CheckCircle2, RotateCcw, Send, UserCheck, 
  ArrowRightLeft, AlertCircle, User, Calendar, 
  ShieldCheck, Loader2, X, FileText
} from 'lucide-react';
import type { TaskStage, AuditLog, Client } from '../types';
import { fetchTaskHistory } from '../services/api';
import { StatusBadge } from './ui/StatusBadge';
import { DeliverablesDisplay } from './DeliverablesDisplay';

interface TaskHistoryModalProps {
  stage: TaskStage;
  client?: Client | { id: number; company_name: string; name: string };
  onClose: () => void;
}

export const TaskHistoryModal: React.FC<TaskHistoryModalProps> = ({
  stage,
  client,
  onClose
}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchTaskHistory(stage.id)
      .then((data) => {
        if (isMounted) {
          setLogs(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'فشل تحميل سجل دورة المهمة');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [stage.id]);

  const formatTimestamp = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const getActionMeta = (action: string) => {
    switch (action) {
      case 'STAGE_ADDED':
        return {
          title: 'إنشاء وإسناد المهمة',
          icon: <UserCheck className="w-4 h-4 text-indigo-400" />,
          bgColor: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
          dotColor: 'bg-indigo-500 ring-indigo-500/30'
        };
      case 'STAGE_REASSIGNED':
        return {
          title: 'تحويل وإعادة إسناد المهمة',
          icon: <ArrowRightLeft className="w-4 h-4 text-amber-400" />,
          bgColor: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          dotColor: 'bg-amber-500 ring-amber-500/30'
        };
      case 'STAGE_SUBMITTED_FOR_REVIEW':
        return {
          title: 'تسليم المخرجات للمراجعة',
          icon: <Send className="w-4 h-4 text-sky-400" />,
          bgColor: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
          dotColor: 'bg-sky-500 ring-sky-500/30'
        };
      case 'STAGE_REVISION_REQUESTED':
        return {
          title: 'طلب تعديل وإعادة المهمة',
          icon: <RotateCcw className="w-4 h-4 text-rose-400" />,
          bgColor: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
          dotColor: 'bg-rose-500 ring-rose-500/30'
        };
      case 'STAGE_APPROVED':
        return {
          title: 'اعتماد رسمي وإنهاء المرحلة',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
          bgColor: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          dotColor: 'bg-emerald-500 ring-emerald-500/30'
        };
      case 'STAGE_COMPLETED':
        return {
          title: 'إتمام المهمة مباشرة',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
          bgColor: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          dotColor: 'bg-emerald-500 ring-emerald-500/30'
        };
      case 'STAGE_UPDATED':
      default:
        return {
          title: 'تحديث بيانات المرحلة',
          icon: <Clock className="w-4 h-4 text-gray-400" />,
          bgColor: 'bg-gray-800/60 border-gray-700 text-gray-300',
          dotColor: 'bg-gray-500 ring-gray-500/30'
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-2xl max-h-[90vh] rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-start justify-between gap-3 bg-slate-950/60 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <History className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-white">{stage.stage_name}</h3>
                <StatusBadge status={stage.status} size="sm" />
              </div>
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                <span>العميل:</span>
                <span className="font-bold text-gray-200">{client?.company_name || '—'}</span>
                {stage.department && (
                  <>
                    <span className="text-gray-600">•</span>
                    <span className="text-indigo-300 font-bold">{stage.department.name_ar}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto custom-scrollbar space-y-5 flex-1 text-xs">
          
          {/* Summary Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Current Assignee */}
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/5 space-y-1">
              <span className="text-[10px] text-gray-400 font-bold block flex items-center gap-1">
                <User className="w-3 h-3 text-indigo-400" />
                <span>المسند إليه حالياً</span>
              </span>
              <div className="font-bold text-white text-xs truncate">
                {stage.assigned_member ? stage.assigned_member.name : 'غير مسند'}
              </div>
              <div className="text-[10px] text-gray-500 truncate">
                {stage.assigned_member?.role || 'عضو فريق'}
              </div>
            </div>

            {/* Reviewer / Approved By */}
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/5 space-y-1">
              <span className="text-[10px] text-gray-400 font-bold block flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-teal-400" />
                <span>المراجع / المعتمد</span>
              </span>
              <div className="font-bold text-white text-xs truncate">
                {stage.reviewer ? stage.reviewer.name : (stage.status === 'completed' ? 'إدارة الوكالة' : 'بانتظار المراجعة')}
              </div>
              <div className="text-[10px] text-gray-500 truncate">
                {stage.reviewed_at ? formatTimestamp(stage.reviewed_at) : 'لم يتم الاعتماد بعد'}
              </div>
            </div>

            {/* Completion Status */}
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/5 space-y-1">
              <span className="text-[10px] text-gray-400 font-bold block flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-400" />
                <span>تاريخ الاكتمال</span>
              </span>
              <div className="font-bold text-emerald-300 text-xs truncate">
                {stage.completion_timestamp ? formatTimestamp(stage.completion_timestamp) : 'قيد التنفيذ'}
              </div>
              <div className="text-[10px] text-gray-500 truncate">
                {stage.status === 'completed' ? 'تم إنهاء الدورة بالكامل' : 'الدورة نشطة'}
              </div>
            </div>
          </div>

          {/* Active Deliverables / Revision Notes Card (If any) */}
          {(stage.deliverable_url || stage.deliverable_note || stage.revision_notes) && (
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-2.5">
              <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>تفاصيل التسليم وملاحظات المراجعة:</span>
              </h4>

              {stage.deliverable_note && (
                <div className="p-2 rounded-xl bg-slate-900 border border-white/5 text-gray-300">
                  <span className="text-[10px] text-gray-400 block font-bold mb-0.5">ملاحظة التسليم:</span>
                  <p>{stage.deliverable_note}</p>
                </div>
              )}

              <DeliverablesDisplay
                deliverableUrl={stage.deliverable_url}
                theme="indigo"
              />

              {stage.revision_notes && (
                <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200">
                  <span className="text-[10px] text-rose-300 block font-bold mb-0.5">ملاحظات التعديل المطلوبة:</span>
                  <p>{stage.revision_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Full Chronological Timeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h4 className="font-black text-white text-xs flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                <span>تتبع مسار ودورة حياة المهمة بالتفصيل ({logs.length} أحداث مسجلة)</span>
              </h4>
              <span className="text-[10px] text-gray-500 font-mono">من الأقدم إلى الأحدث</span>
            </div>

            {loading ? (
              <div className="py-10 flex flex-col items-center justify-center gap-2 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                <span>جارِ جلب السجل الزمني لدورة حياة المهمة...</span>
              </div>
            ) : error ? (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                لا توجد أحداث سابقة مسجلة لهذه المهمة حتى الآن.
              </div>
            ) : (
              <div className="relative pl-2 pr-4 space-y-4 before:absolute before:right-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-indigo-500 before:via-amber-500 before:to-emerald-500">
                {logs.map((log, index) => {
                  const meta = getActionMeta(log.action);

                  return (
                    <div key={log.id || index} className="relative pr-6 group">
                      {/* Timeline Dot */}
                      <div className={`absolute right-[-4px] top-1.5 w-3.5 h-3.5 rounded-full ring-4 ring-slate-950 flex items-center justify-center ${meta.dotColor}`} />

                      {/* Timeline Event Card */}
                      <div className={`p-3 rounded-2xl border transition-all ${meta.bgColor}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-white/5 pb-2 mb-2">
                          <div className="flex items-center gap-2">
                            {meta.icon}
                            <span className="font-bold text-white text-xs">{meta.title}</span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                            <Clock className="w-3 h-3 text-gray-500" />
                            <span>{formatTimestamp(log.timestamp)}</span>
                          </div>
                        </div>

                        {/* Performed By & Details */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-300">
                            <span className="text-gray-400 font-bold">بواسطة:</span>
                            <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded-md">
                              {log.performed_by || 'النظام'}
                            </span>
                          </div>

                          {log.details && (
                            <p className="text-xs text-gray-200 leading-relaxed bg-black/20 p-2.5 rounded-xl border border-white/5">
                              {log.details}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950/60 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
