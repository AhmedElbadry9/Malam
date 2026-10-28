import React, { useMemo, useState } from 'react';
import {
  Award, Building2, Calendar, CheckCircle2, Clock, Info, Layers,
  RotateCcw, Search, ShieldCheck, Users, AlertTriangle
} from 'lucide-react';
import type { Client, Department, TeamMember } from '../types';
import { Card, CardBody } from './ui/Card';
import { Modal } from './ui/Modal';
import { StatusBadge } from './ui/StatusBadge';
import { EmptyState } from './ui/EmptyState';
import { DeliverablesDisplay } from './DeliverablesDisplay';
import {
  PERIOD_LABELS,
  computeMemberPerformance,
  resolvePeriod,
  summarizePerformance,
} from '../utils/teamPerformance';
import type { MemberPerformance, PeriodPreset, PerformanceTask } from '../utils/teamPerformance';

interface TeamPerformanceProps {
  /** Members to track (the parent decides scope: one department for a Head, everyone for Management). */
  members: TeamMember[];
  clients: Client[];
  departments?: Department[];
  currentMemberId?: number;
  title?: string;
  subtitle?: string;
  /** Show the department dropdown (useful for management-wide views). */
  showDepartmentFilter?: boolean;
  accent?: 'indigo' | 'teal';
}

type SortKey = 'completed' | 'remaining' | 'name';

const PRESET_ORDER: PeriodPreset[] = [
  'this_month', 'last_month', 'last_30', 'last_7', 'custom', 'all'
];

const ACCENT = {
  indigo: {
    chipActive: 'bg-indigo-600 text-white shadow-sm',
    ring: 'focus:ring-indigo-500',
    bar: 'bg-indigo-500',
    icon: 'text-indigo-400',
    avatar: 'from-indigo-600/30 to-slate-800 border-indigo-500/30 text-indigo-300',
  },
  teal: {
    chipActive: 'bg-teal-600 text-white shadow-sm',
    ring: 'focus:ring-teal-500',
    bar: 'bg-teal-500',
    icon: 'text-teal-400',
    avatar: 'from-teal-600/30 to-slate-800 border-teal-500/30 text-teal-300',
  },
} as const;

const formatDate = (d: Date | null): string => {
  if (!d) return 'بدون تاريخ';
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDateTime = (d: Date | null): string => {
  if (!d) return 'بدون تاريخ';
  return d.toLocaleString('ar-EG', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const getInitials = (name?: string): string => {
  if (!name) return 'م';
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1 && parts[0] && parts[1]) return parts[0][0] + parts[1][0];
  return name.slice(0, 2);
};

const memberInDepartment = (m: TeamMember, deptId: number): boolean =>
  m.department_id === deptId || !!(m.department_ids && m.department_ids.includes(deptId));

export const TeamPerformance: React.FC<TeamPerformanceProps> = ({
  members,
  clients,
  departments = [],
  currentMemberId,
  title = 'أداء وإنتاجية الفريق',
  subtitle = 'تابع ما أنجزه كل موظف وما تبقى عليه، خلال أي فترة زمنية',
  showDepartmentFilter = false,
  accent = 'indigo',
}) => {
  const theme = ACCENT[accent];

  const [preset, setPreset] = useState<PeriodPreset>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState<'all' | number>('all');
  const [sortBy, setSortBy] = useState<SortKey>('completed');
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  // The period is resolved together with the rows so that "last N days" windows are
  // re-evaluated against the current time every time the polled data refreshes.
  const { period, allRows } = useMemo(() => {
    const resolved = resolvePeriod(preset, new Date(), customFrom, customTo);
    return {
      period: resolved,
      allRows: computeMemberPerformance(members, clients, resolved),
    };
  }, [preset, customFrom, customTo, members, clients]);

  const rows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = allRows.filter(r => {
      if (deptFilter !== 'all' && !memberInDepartment(r.member, deptFilter)) return false;
      if (!q) return true;
      return (
        (r.member.name || '').toLowerCase().includes(q) ||
        (r.member.role || '').toLowerCase().includes(q)
      );
    });
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sortBy === 'name') return (a.member.name || '').localeCompare(b.member.name || '', 'ar');
      if (sortBy === 'remaining') {
        return b.remainingCount - a.remainingCount ||
          (a.member.name || '').localeCompare(b.member.name || '', 'ar');
      }
      return b.completed.length - a.completed.length ||
        (a.member.name || '').localeCompare(b.member.name || '', 'ar');
    });
    return sorted;
  }, [allRows, searchTerm, deptFilter, sortBy]);

  const totals = useMemo(() => summarizePerformance(rows), [rows]);
  const maxCompleted = useMemo(
    () => rows.reduce((max, r) => Math.max(max, r.completed.length), 0),
    [rows]
  );

  const selectedRow: MemberPerformance | null = useMemo(
    () => (selectedMemberId == null ? null : allRows.find(r => r.member.id === selectedMemberId) || null),
    [allRows, selectedMemberId]
  );

  const periodDescription = (() => {
    if (!period.valid) return 'نطاق التاريخ غير صحيح: تاريخ البداية بعد تاريخ النهاية';
    if (!period.start && !period.end) {
      return preset === 'custom'
        ? 'حدّد تاريخ البداية والنهاية (حالياً تُعرض كل الأوقات)'
        : 'منذ بداية النظام وحتى الآن';
    }
    const from = period.start ? formatDate(period.start) : 'البداية';
    const to = period.end ? formatDate(period.end) : 'الآن';
    return `من ${from} إلى ${to}`;
  })();

  const renderTaskRow = (task: PerformanceTask, showCompletedDate: boolean) => (
    <div
      key={task.stage.id}
      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5"
    >
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <div className="text-xs font-bold text-white break-words">{task.stage.stage_name}</div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
            <Building2 className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="truncate">{task.client.company_name}</span>
            {task.client.name && task.client.name !== task.client.company_name && (
              <span className="text-slate-500">• {task.client.name}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StatusBadge status={task.stage.status} size="sm" />
          {showCompletedDate && (
            <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
              {formatDateTime(task.completedAt)}
            </span>
          )}
        </div>
      </div>
      {showCompletedDate && (
        <DeliverablesDisplay
          deliverableUrl={task.stage.deliverable_url}
          compact
          theme="emerald"
        />
      )}
    </div>
  );

  const summaryTiles = [
    {
      label: 'منجزة في الفترة',
      value: totals.completed,
      cls: 'text-emerald-400',
      box: 'bg-emerald-500/10 border-emerald-500/25',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    },
    {
      label: 'متبقية حالياً',
      value: totals.remaining,
      cls: 'text-amber-400',
      box: 'bg-amber-500/10 border-amber-500/25',
      icon: <Clock className="w-4 h-4 text-amber-400" />,
    },
    {
      label: 'بانتظار الاعتماد',
      value: totals.underReview,
      cls: 'text-sky-300',
      box: 'bg-sky-500/10 border-sky-500/25',
      icon: <ShieldCheck className="w-4 h-4 text-sky-300" />,
    },
    {
      label: 'مطلوب تعديلها',
      value: totals.revision,
      cls: 'text-rose-300',
      box: 'bg-rose-500/10 border-rose-500/25',
      icon: <RotateCcw className="w-4 h-4 text-rose-300" />,
    },
    {
      label: 'عدد الموظفين',
      value: totals.members,
      cls: 'text-slate-100',
      box: 'bg-slate-800/60 border-slate-700',
      icon: <Users className="w-4 h-4 text-slate-300" />,
    },
  ];

  return (
    <div className="space-y-4 animate-fadeIn">

      {/* Header + period selector */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center shrink-0">
                <Award className={`w-5 h-5 ${theme.icon}`} />
              </div>
              <div>
                <h2 className="text-base font-black text-white">{title}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
              </div>
            </div>
            <div className="text-[11px] font-bold text-slate-300 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5">
              <Calendar className={`w-3.5 h-3.5 ${theme.icon}`} />
              <span>{PERIOD_LABELS[preset]}</span>
              <span className="text-slate-500">•</span>
              <span className={period.valid ? 'text-slate-400 font-medium' : 'text-rose-300'}>
                {periodDescription}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {PRESET_ORDER.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPreset(p)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  preset === p
                    ? theme.chipActive
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="flex items-end gap-3 flex-wrap">
              <label className="space-y-1">
                <span className="text-[11px] text-slate-400 font-bold block">من تاريخ</span>
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || undefined}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className={`px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:ring-2 ${theme.ring}`}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] text-slate-400 font-bold block">إلى تاريخ</span>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom || undefined}
                  onChange={(e) => setCustomTo(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className={`px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:ring-2 ${theme.ring}`}
                />
              </label>
              {(customFrom || customTo) && (
                <button
                  type="button"
                  onClick={() => { setCustomFrom(''); setCustomTo(''); }}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  مسح التواريخ
                </button>
              )}
            </div>
          )}

          {!period.valid && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية.</span>
            </div>
          )}

          <div className="flex items-start gap-2 text-[11px] text-slate-400 leading-relaxed">
            <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
            <span>
              «المنجزة» تُحتسب حسب تاريخ اعتماد المهمة داخل الفترة المحددة، وتُنسب للموظف المسند إليه حالياً.
              أما «المتبقية» فهي الوضع الحالي الفعلي ولا تتأثر بالفترة.
            </span>
          </div>
        </CardBody>
      </Card>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {summaryTiles.map(t => (
          <div key={t.label} className={`p-3.5 rounded-2xl border ${t.box}`}>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-bold">
              {t.icon}
              <span>{t.label}</span>
            </div>
            <div className={`text-2xl font-black mt-1 ${t.cls}`}>{t.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث باسم الموظف أو وظيفته..."
            className={`w-full pl-3 pr-9 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 ${theme.ring}`}
          />
        </div>

        {showDepartmentFilter && departments.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={deptFilter === 'all' ? 'all' : String(deptFilter)}
              onChange={(e) => setDeptFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className={`px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:ring-2 ${theme.ring}`}
            >
              <option value="all">كل الأقسام</option>
              {departments.map(d => (
                <option key={d.id} value={String(d.id)}>{d.name_ar}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-bold">ترتيب حسب:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className={`px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:ring-2 ${theme.ring}`}
          >
            <option value="completed">الأكثر إنجازاً</option>
            <option value="remaining">الأكثر مهام متبقية</option>
            <option value="name">الاسم</option>
          </select>
        </div>
      </div>

      {/* Per-employee table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-bold">
              <tr>
                <th className="p-3.5 text-right">الموظف</th>
                <th className="p-3.5">منجزة في الفترة</th>
                <th className="p-3.5">قيد التنفيذ</th>
                <th className="p-3.5">بانتظار الاعتماد</th>
                <th className="p-3.5">مطلوب تعديل</th>
                <th className="p-3.5">المتبقي الآن</th>
                <th className="p-3.5">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8">
                    <EmptyState
                      title="لا يوجد موظفون مطابقون"
                      description="لا يوجد أعضاء ضمن هذا النطاق، أو لا توجد نتائج مطابقة للبحث/التصفية الحالية."
                    />
                  </td>
                </tr>
              ) : (
                rows.map(r => {
                  const completedCount = r.completed.length;
                  const barWidth = maxCompleted > 0 ? Math.round((completedCount / maxCompleted) * 100) : 0;
                  return (
                    <tr
                      key={r.member.id}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => setSelectedMemberId(r.member.id)}
                    >
                      <td className="p-3.5 text-right">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br border flex items-center justify-center font-bold text-[11px] shrink-0 select-none ${theme.avatar}`}>
                            {getInitials(r.member.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white text-sm flex items-center gap-1.5 flex-wrap">
                              <span>{r.member.name}</span>
                              {r.member.id === currentMemberId && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">أنت</span>
                              )}
                              {r.member.role_type === 'head' && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">رئيس قسم</span>
                              )}
                              {r.member.is_active === false && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">معطّل</span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[260px]">{r.member.role}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="flex flex-col items-center gap-1.5 min-w-[110px]">
                          <span className="text-base font-black text-emerald-400">{completedCount}</span>
                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${theme.bar} transition-all duration-500`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-bold text-slate-200">{r.inProgress.length}</td>
                      <td className="p-3.5 font-bold text-sky-300">{r.underReview.length}</td>
                      <td className="p-3.5 font-bold text-rose-300">{r.revision.length}</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 font-black">
                          {r.remainingCount}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedMemberId(r.member.id); }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          عرض المهام
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {totals.undatedCompleted > 0 && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] font-bold flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            يوجد {totals.undatedCompleted} مهمة مكتملة بدون تاريخ إنجاز مسجل، لذلك لم تُحتسب ضمن هذه الفترة.
            تظهر فقط عند اختيار «كل الأوقات».
          </span>
        </div>
      )}

      {/* Employee drill-down */}
      <Modal
        isOpen={selectedRow !== null}
        onClose={() => setSelectedMemberId(null)}
        title={selectedRow ? `مهام ${selectedRow.member.name}` : ''}
        description={selectedRow ? `${selectedRow.member.role || ''} • ${PERIOD_LABELS[preset]}: ${periodDescription}` : undefined}
        icon={<Users className="w-5 h-5" />}
        maxWidth="3xl"
      >
        {selectedRow && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                <div className="text-[10px] text-slate-300 font-bold">منجزة في الفترة</div>
                <div className="text-lg font-black text-emerald-400">{selectedRow.completed.length}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700">
                <div className="text-[10px] text-slate-300 font-bold">قيد التنفيذ</div>
                <div className="text-lg font-black text-slate-100">{selectedRow.inProgress.length}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/25">
                <div className="text-[10px] text-slate-300 font-bold">بانتظار الاعتماد</div>
                <div className="text-lg font-black text-sky-300">{selectedRow.underReview.length}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25">
                <div className="text-[10px] text-slate-300 font-bold">مطلوب تعديل</div>
                <div className="text-lg font-black text-rose-300">{selectedRow.revision.length}</div>
              </div>
            </div>

            <section className="space-y-2.5">
              <h3 className="text-sm font-black text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>المهام المنجزة في الفترة ({selectedRow.completed.length})</span>
              </h3>
              {selectedRow.completed.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-xs text-slate-500 text-center">
                  لا توجد مهام منجزة لهذا الموظف في الفترة المحددة.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedRow.completed.map(t => renderTaskRow(t, true))}
                </div>
              )}
              {selectedRow.undatedCompleted > 0 && (
                <div className="text-[11px] text-amber-300 font-bold">
                  + {selectedRow.undatedCompleted} مهمة مكتملة بدون تاريخ إنجاز مسجل (غير محتسبة في هذه الفترة).
                </div>
              )}
            </section>

            <section className="space-y-2.5">
              <h3 className="text-sm font-black text-amber-300 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>المهام المتبقية حالياً ({selectedRow.remainingCount})</span>
              </h3>
              {selectedRow.remainingCount === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-xs text-slate-500 text-center">
                  لا توجد مهام متبقية على هذا الموظف حالياً. 🎉
                </div>
              ) : (
                <div className="space-y-2">
                  {[...selectedRow.revision, ...selectedRow.underReview, ...selectedRow.inProgress]
                    .map(t => renderTaskRow(t, false))}
                </div>
              )}
            </section>
          </div>
        )}
      </Modal>
    </div>
  );
};
