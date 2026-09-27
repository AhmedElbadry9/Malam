import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, User, ChevronDown, ChevronUp, Folder, ExternalLink, 
  Clock, AlertCircle, Layers, 
  Edit, RefreshCw, Check, 
  ArrowUpRight, Plus, Copy, CheckCheck, Sparkles,
  Info, ShieldCheck, AlertTriangle, RotateCcw, Trash2, History
} from 'lucide-react';
import type { Client, ClientGroupHierarchy, Department, TeamMember, TaskStage } from '../types';
import { fetchClientsHierarchy } from '../services/api';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface ClientHierarchyTreeProps {
  onOpenDriveModal: (client: Client) => void;
  onOpenBriefModal?: (client: Client) => void;
  onEditClient: (client: Client) => void;
  onDeleteClient?: (clientId: number) => Promise<void>;
  onOpenNewClientModal: (clientName?: string) => void;
  departments: Department[];
  members: TeamMember[];
  onReviewTaskStage?: (stageId: number, action: 'approve' | 'request_revision', notes?: string) => Promise<void>;
  onOpenRevisionModal?: (client: Client, stage: TaskStage) => void;
  onOpenHistoryModal?: (stage: TaskStage, client?: Client) => void;
  searchTerm?: string;
  onClearSearch?: () => void;
  filterCategory?: FilterCategory;
  expandSignal?: number;
  clients?: Client[];
}

type FilterCategory = 'all' | 'in_progress' | 'completed' | 'urgent';

export const ClientHierarchyTree: React.FC<ClientHierarchyTreeProps> = ({
  onOpenDriveModal,
  onOpenBriefModal: _onOpenBriefModal,
  onEditClient,
  onDeleteClient,
  onOpenNewClientModal,
  departments,
  members,
  onReviewTaskStage,
  onOpenRevisionModal,
  onOpenHistoryModal,
  searchTerm: externalSearchTerm = '',
  onClearSearch,
  filterCategory: externalFilterCategory = 'all',
  expandSignal,
  clients
}) => {
  const [hierarchyData, setHierarchyData] = useState<ClientGroupHierarchy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const [expandedCompanies, setExpandedCompanies] = useState<Record<number, boolean>>({});
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showTip, setShowTip] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const toSafeExternalUrl = (url?: string | null) => {
    if (!url) return '#';
    const trimmed = url.trim();
    if (!trimmed) return '#';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const handleCopyLink = (url: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedText(url);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !onDeleteClient) return;
    try {
      setIsDeleting(true);
      await onDeleteClient(deleteTarget.id);
      setDeleteTarget(null);
      await loadData(currentSearchTerm);
    } catch (err: any) {
      alert(err.message || 'فشل حذف العميل والمشروع');
    } finally {
      setIsDeleting(false);
    }
  };

  const currentSearchTerm = externalSearchTerm;
  const currentFilterCategory = externalFilterCategory as FilterCategory;

  const loadData = async (query?: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchClientsHierarchy(query);
      const safeData = Array.isArray(data) ? data : [];
      setHierarchyData(safeData);
      
      // Auto-expand first 5 clients for seamless view
      const initialExpClients: Record<string, boolean> = {};
      const initialExpComps: Record<number, boolean> = {};
      safeData.forEach((group, idx) => {
        if (idx < 5 && group?.client_name) {
          initialExpClients[group.client_name] = true;
          (group.companies || []).forEach(c => {
            if (c?.id) initialExpComps[c.id] = true;
          });
        }
      });
      setExpandedClients(prev => ({ ...initialExpClients, ...prev }));
      setExpandedCompanies(prev => ({ ...initialExpComps, ...prev }));
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل الشجرة الهرمية للعملاء');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(currentSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [currentSearchTerm]);

  // Sync tree hierarchy whenever external clients list updates (e.g. after CRUD actions)
  useEffect(() => {
    if (clients) {
      loadData(currentSearchTerm);
    }
  }, [clients]);

  useEffect(() => {
    if (expandSignal && expandSignal > 0) {
      expandAll();
    } else if (expandSignal && expandSignal < 0) {
      collapseAll();
    }
  }, [expandSignal]);

  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Filtered Clients based on currentFilterCategory
  const filteredHierarchy = useMemo(() => {
    if (!Array.isArray(hierarchyData)) return [];
    if (currentFilterCategory === 'all') return hierarchyData;

    return hierarchyData
      .map(group => {
        const matchingCompanies = (group.companies || []).filter(c => {
          if (currentFilterCategory === 'in_progress') return c.status !== 'completed';
          if (currentFilterCategory === 'completed') return c.status === 'completed';
          if (currentFilterCategory === 'urgent') return c.priority === 'urgent';
          return true;
        });

        if (matchingCompanies.length === 0) return null;

        return {
          ...group,
          companies: matchingCompanies,
          total_companies: matchingCompanies.length
        };
      })
      .filter((g): g is ClientGroupHierarchy => g !== null);
  }, [hierarchyData, currentFilterCategory]);

  const toggleClient = (clientName: string) => {
    setExpandedClients(prev => ({
      ...prev,
      [clientName]: !prev[clientName]
    }));
  };

  const toggleCompany = (companyId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedCompanies(prev => ({
      ...prev,
      [companyId]: !prev[companyId]
    }));
  };

  const expandAll = () => {
    const expClients: Record<string, boolean> = {};
    const expComps: Record<number, boolean> = {};
    (filteredHierarchy || []).forEach(group => {
      if (group?.client_name) {
        expClients[group.client_name] = true;
        (group.companies || []).forEach(c => {
          if (c?.id) expComps[c.id] = true;
        });
      }
    });
    setExpandedClients(expClients);
    setExpandedCompanies(expComps);
  };

  const collapseAll = () => {
    setExpandedClients({});
    setExpandedCompanies({});
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1 shadow-sm shadow-rose-500/10">
            <AlertCircle className="w-3.5 h-3.5" /> طارئ جداً
          </span>
        );
      case 'high':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> أولوية عالية
          </span>
        );
      case 'medium':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            أولوية متوسطة
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-800/80 text-gray-300 border border-gray-700">
            أولوية عادية
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-sm shadow-emerald-500/10">
            <Check className="w-3.5 h-3.5" /> مكتمل
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> قيد التنفيذ
          </span>
        );
      case 'review':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            مراجعة نهائية
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            استلام جديد
          </span>
        );
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'غير محدد';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Friendly Tips Banner */}
      {showTip && (
        <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 text-indigo-200 text-xs flex items-center justify-between gap-3 shadow-inner backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <span>
              <strong>دليل الاستخدام:</strong> اضغط على كارت أي <strong>عميل</strong> لاستعراض شركاته، أو اضغط على <strong>الشركة</strong> لرؤية تفاصيل المهام والموظفين ومجلد Drive.
            </span>
          </div>
          <button 
            onClick={() => setShowTip(false)}
            className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            title="إخفاء التلميح"
          >
            ✕
          </button>
        </div>
      )}



      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && hierarchyData.length === 0 && (
        <div className="py-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="text-sm font-medium">جاري إعداد العرض الشجري للعملاء والشركات...</span>
        </div>
      )}

      {/* Empty state with friendly prompt */}
      {!loading && filteredHierarchy.length === 0 && (
        <div className="py-16 px-6 text-center rounded-2xl bg-gray-900/40 border border-white/5 flex flex-col items-center justify-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">لا توجد نتائج مطابقة لبحثك</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-md">
              {currentSearchTerm 
                ? `لم يتم العثور على أي عميل أو شركة مطابقة لـ "${currentSearchTerm}". يمكنك مسح البحث أو إضافة عميل جديد.`
                : 'لا توجد بيانات متاحة في هذا الفلتر حالياً.'}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {currentSearchTerm && onClearSearch && (
              <button
                onClick={onClearSearch}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all"
              >
                مسح البحث
              </button>
            )}
            <button
              onClick={() => onOpenNewClientModal()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة عميل جديد</span>
            </button>
          </div>
        </div>
      )}

      {/* HIERARCHICAL TREE LIST */}
      <div className="space-y-5">
        {filteredHierarchy.map((clientGroup) => {
          const isClientExpanded = !!expandedClients[clientGroup.client_name];

          return (
            <div
              key={clientGroup.client_name}
              className="rounded-2xl bg-[#0c0e15] border border-white/10 overflow-hidden shadow-xl transition-all"
            >
              {/* LEVEL 1: CLIENT / OWNER CARD */}
              <div
                onClick={() => toggleClient(clientGroup.client_name)}
                className="p-4 sm:p-5 bg-gradient-to-r from-gray-900 via-gray-900/90 to-indigo-950/40 hover:bg-white/[0.03] transition-colors cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 select-none border-b border-white/5"
              >
                {/* Left side: Avatar + Client Name + Companies Count + Copy Button */}
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/25 flex-shrink-0">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-base font-black text-white tracking-wide">
                        {clientGroup.client_name}
                      </h3>

                      {/* Copy Client Name Button */}
                      <button
                        onClick={(e) => handleCopy(clientGroup.client_name, e)}
                        className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="نسخ اسم العميل"
                      >
                        {copiedText === clientGroup.client_name ? (
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Company count chip */}
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        <span>{clientGroup.total_companies} {clientGroup.total_companies === 1 ? 'شركة تابعة' : 'شركات تابعة'}</span>
                      </span>
                    </div>

                    {/* Task Stats Bar */}
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-400">
                      <span>📌 {clientGroup.total_tasks} إجمالي المهام</span>
                      <span>•</span>
                      <span className="text-blue-400 font-medium">⏳ {clientGroup.active_tasks} جارية</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-medium">✅ {clientGroup.completed_tasks} منجزة</span>
                    </div>
                  </div>
                </div>

                {/* Right side: Overall Progress + Quick Add Company + Toggle Chevron */}
                <div className="flex items-center justify-between lg:justify-end gap-3 sm:gap-4 pt-2 lg:pt-0">
                  {/* Quick Add Company for this specific client */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenNewClientModal(clientGroup.client_name);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-indigo-600/30 border border-white/10 hover:border-indigo-500/40 text-gray-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                    title={`إضافة شركة جديدة تابعة لـ ${clientGroup.client_name}`}
                  >
                    <Plus className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="hidden sm:inline">إضافة شركة للعميل</span>
                    <span className="sm:hidden">+ شركة</span>
                  </button>

                  {/* Progress Bar */}
                  <div className="w-32 sm:w-40 text-right">
                    <div className="flex justify-between items-center text-xs mb-1 font-bold">
                      <span className="text-gray-400">الإنجاز العام</span>
                      <span className={clientGroup.overall_progress === 100 ? 'text-emerald-400' : 'text-indigo-400'}>
                        {clientGroup.overall_progress}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-black/60 overflow-hidden border border-white/5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          clientGroup.overall_progress === 100 
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                            : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                        }`}
                        style={{ width: `${clientGroup.overall_progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Toggle Accordion Chevron */}
                  <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-colors flex-shrink-0">
                    {isClientExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* LEVEL 2 & 3: COMPANIES & TASKS (EXPANDABLE TREE) */}
              {isClientExpanded && (
                <div className="p-4 sm:p-6 space-y-5 bg-black/40">
                  {(clientGroup.companies || []).map((company) => {
                    const isCompanyExpanded = !!expandedCompanies[company.id];

                    return (
                      <div
                        key={company.id}
                        className="relative pr-4 sm:pr-6 border-r-2 border-indigo-500/30 transition-all group/company"
                      >
                        {/* Tree Branch Visual Connector Dot */}
                        <div className="absolute -right-[7px] top-6 w-3 h-3 rounded-full bg-indigo-500 border-2 border-[#0c0e15] shadow-sm shadow-indigo-500/50" />

                        {/* COMPANY CARD */}
                        <div className="rounded-2xl bg-gray-900/90 border border-white/10 overflow-hidden shadow-lg hover:border-indigo-500/40 transition-all">
                          {/* COMPANY HEADER */}
                          <div className="p-4 sm:p-5">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-white/5">
                              {/* Company Identity */}
                              <div className="flex items-start sm:items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center font-bold flex-shrink-0 shadow-inner">
                                  <Building2 className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="text-sm sm:text-base font-black text-white">
                                      {company.company_name}
                                    </h4>

                                    {/* Copy Company Name Button */}
                                    <button
                                      onClick={(e) => handleCopy(company.company_name, e)}
                                      className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                      title="نسخ اسم الشركة"
                                    >
                                      {copiedText === company.company_name ? (
                                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>

                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                                      {company.service_type}
                                    </span>
                                    {getPriorityBadge(company.priority)}
                                    {getStatusBadge(company.status)}
                                  </div>

                                  {/* Intake Date & SLA Target Deadline */}
                                  <div className="text-xs text-gray-400 mt-1.5 flex flex-wrap items-center gap-3">
                                    <span>📅 تاريخ التسجيل: {formatDate(company.intake_timestamp)}</span>
                                    {company.target_deadline && (
                                      <>
                                        <span>•</span>
                                        <span className="text-amber-400 font-medium flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          <span>الموعد النهائي (SLA): {formatDate(company.target_deadline)}</span>
                                        </span>
                                      </>
                                    )}
                                  </div>

                                  {/* Platform, Phone, Website & Agency Email Badges */}
                                  {(company.website_url || company.agency_email || company.phone || company.platform) && (
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                      {company.platform && (
                                        <div
                                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold"
                                          title="المنصة"
                                        >
                                          <span>🛍️ المنصة: {company.platform}</span>
                                        </div>
                                      )}
                                      {company.phone && (
                                        <a
                                          href={`tel:${company.phone}`}
                                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono transition-colors"
                                          title="الاتصال برقم العميل"
                                        >
                                          <span>📞 {company.phone}</span>
                                        </a>
                                      )}
                                      {company.website_url && (
                                        <a
                                          href={company.website_url.startsWith('http') ? company.website_url : `https://${company.website_url}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-teal-300 border border-teal-500/20 text-[11px] font-mono transition-colors"
                                          title="زيارة موقع العميل"
                                        >
                                          <span>🌐 {company.website_url}</span>
                                          <ArrowUpRight className="w-3 h-3" />
                                        </a>
                                      )}
                                      {company.agency_email && (
                                        <div
                                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/30 text-[11px] font-mono select-all"
                                          title="البريد المخصص للوكالة"
                                        >
                                          <span>✉️ {company.agency_email}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Company Action Buttons */}
                              <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
                                {/* Open Google Drive Folder Direct Button */}
                                {company.drive_folder_url && (
                                  <a
                                    href={company.drive_folder_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                                    title="فتح مجلد الشركة مباشرة على موقع Google Drive في نافذة جديدة"
                                  >
                                    <Folder className="w-3.5 h-3.5" />
                                    <span>فتح في Drive</span>
                                    <ArrowUpRight className="w-3 h-3" />
                                  </a>
                                )}

                                {/* Open Drive Permissions & Files Modal */}
                                <button
                                  onClick={() => onOpenDriveModal(company)}
                                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
                                  title="مشاركة المجلد مع العميل وإدارة صلاحيات الوصول والمجلدات الفرعية"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                                  <span>إدارة الصلاحيات والمجلدات</span>
                                </button>



                                {/* Edit & Manage Tasks Button */}
                                <button
                                  onClick={() => onEditClient(company)}
                                  className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
                                  title="تعديل تفاصيل الشركة وإضافة أو حذف المهام والمراحل"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  <span>تعديل وإدارة المهام</span>
                                </button>

                                {/* Delete Company / Project Button */}
                                {onDeleteClient && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteTarget({ id: company.id, name: company.company_name });
                                    }}
                                    className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                                    title="حذف هذا المشروع والشركة نهائياً"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">حذف</span>
                                  </button>
                                )}

                                {/* Toggle Tasks Sub-tree */}
                                <button
                                  onClick={(e) => toggleCompany(company.id, e)}
                                  className="px-3 py-1.5 rounded-xl bg-black/40 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                                  title="عرض أو إخفاء المهام والمراحل التنفيذية"
                                >
                                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                                  <span>المهام ({company.stages?.length || 0})</span>
                                  {isCompanyExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>

                            {/* Request Notes / Project Details */}
                            {company.request_details && (
                              <div className="mt-3 p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-gray-300 flex items-start gap-2">
                                <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold text-gray-400 ml-1">ملاحظات ومتطلبات الطلب:</span>
                                  <span>{company.request_details}</span>
                                </div>
                              </div>
                            )}

                            {/* Company Progress Bar */}
                            <div className="mt-3.5 flex items-center gap-3">
                              <div className="flex-1 h-2 rounded-full bg-black/60 overflow-hidden border border-white/5">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    company.progress_percentage === 100
                                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                      : 'bg-gradient-to-r from-indigo-500 to-blue-500'
                                  }`}
                                  style={{ width: `${company.progress_percentage}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-gray-300 w-12 text-left">
                                {company.progress_percentage}%
                              </span>
                            </div>
                          </div>

                          {/* LEVEL 3: TASKS & STAGES SUB-TREE */}
                          {isCompanyExpanded && (
                            <div className="p-4 sm:p-5 pt-0 border-t border-white/5 bg-black/30">
                              <div className="pt-3 pb-2.5 flex items-center justify-between text-xs font-bold text-gray-400">
                                <span className="flex items-center gap-1.5">
                                  <Layers className="w-4 h-4 text-indigo-400" />
                                  <span>المراحل والمهام التنفيذية ({company.stages?.length || 0})</span>
                                </span>
                                <button
                                  onClick={() => onEditClient(company)}
                                  className="text-indigo-400 hover:text-indigo-300 text-xs font-bold flex items-center gap-1 hover:underline"
                                >
                                  + إضافة مهمة أو قسم
                                </button>
                              </div>

                              {(!company.stages || company.stages.length === 0) ? (
                                <div className="py-6 text-center text-xs text-gray-400 bg-white/[0.02] rounded-xl border border-white/5">
                                  لا توجد مهام مسندة لهذه الشركة بعد. اضغط على "تعديل وإدارة المهام" لإضافة أول مهمة.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                  {(company.stages || []).map((stage, sIdx) => {
                                    const dept = stage.department || departments.find(d => d.id === stage.department_id);
                                    const member = stage.assigned_member || members.find(m => m.id === stage.assigned_member_id);

                                    return (
                                      <div
                                        key={stage.id}
                                        className={`p-3.5 rounded-xl border transition-all relative overflow-hidden ${
                                          stage.status === 'completed'
                                            ? 'bg-emerald-950/20 border-emerald-500/25'
                                            : stage.status === 'in_progress'
                                            ? 'bg-blue-950/20 border-blue-500/25'
                                            : 'bg-gray-900/60 border-white/5'
                                        }`}
                                      >
                                        {/* Task Title & Status */}
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-gray-400 flex items-center justify-center">
                                              #{sIdx + 1}
                                            </span>
                                            <span className="font-bold text-xs text-white">
                                              {stage.stage_name}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            {onOpenHistoryModal && (
                                              <button
                                                type="button"
                                                onClick={() => onOpenHistoryModal(stage, company)}
                                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/25 flex items-center gap-1 transition-colors cursor-pointer"
                                                title="عرض سجل دورة حياة المهمة والتعديلات"
                                              >
                                                <History className="w-3 h-3 text-indigo-400" />
                                                <span>سجل الدورة</span>
                                              </button>
                                            )}

                                            {stage.status === 'completed' ? (
                                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                                <Check className="w-3 h-3" /> معتمد ومكتمل
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
                                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-400 border border-gray-700">
                                                قيد الانتظار
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Task Description */}
                                        {stage.description && (
                                          <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed line-clamp-2">
                                            {stage.description}
                                          </p>
                                        )}

                                        {/* Assigned Dept & Member */}
                                        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                                          {/* Department Badge */}
                                          <div className="flex items-center gap-1.5">
                                            <span
                                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                              style={{ backgroundColor: dept?.color || '#6366f1' }}
                                            />
                                            <span className="text-gray-300 font-medium">
                                              {dept?.name_ar || 'قسم عام'}
                                            </span>
                                          </div>

                                          {/* Assigned Member Badge */}
                                          {member ? (
                                            <div className="flex items-center gap-1.5">
                                              <div className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-[9px] shrink-0 select-none">
                                                {member.name ? member.name.slice(0, 1) : 'م'}
                                              </div>
                                              <span className="text-gray-300 font-medium truncate max-w-[110px]">
                                                {member.name}
                                              </span>
                                            </div>
                                          ) : (
                                            <span className="text-gray-500">غير مسند لموظف</span>
                                          )}
                                        </div>

                                        {/* Deliverable Notes & URL if finished or under review */}
                                        {(stage.deliverable_note || stage.deliverable_url) && (
                                          <div className="mt-2.5 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300 space-y-1">
                                            {stage.deliverable_note && (
                                              <div>
                                                <span className="font-bold">ملاحظة التسليم: </span>
                                                {stage.deliverable_note}
                                              </div>
                                            )}
                                            {stage.deliverable_url && (
                                              <div className="flex items-center justify-between gap-1 pt-1 border-t border-emerald-500/20">
                                                <span className="font-mono text-emerald-200 truncate max-w-[180px]" dir="ltr">
                                                  {stage.deliverable_url}
                                                </span>
                                                <div className="flex items-center gap-1 shrink-0">
                                                  <button
                                                    type="button"
                                                    onClick={() => handleCopyLink(stage.deliverable_url || '')}
                                                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[9px] font-bold flex items-center gap-0.5 border border-slate-700 cursor-pointer"
                                                    title="نسخ الرابط"
                                                  >
                                                    {copiedText === stage.deliverable_url ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                                                    <span>{copiedText === stage.deliverable_url ? 'تم' : 'نسخ'}</span>
                                                  </button>
                                                  <a
                                                    href={toSafeExternalUrl(stage.deliverable_url)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-0.5 font-bold"
                                                  >
                                                    <span>فتح</span>
                                                    <ExternalLink className="w-2.5 h-2.5" />
                                                  </a>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {/* Revision feedback note if requested */}
                                        {stage.status === 'revision_requested' && stage.revision_notes && (
                                          <div className="mt-2 p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-[10px] text-rose-300">
                                            <span className="font-bold">ملاحظات الإدارة: </span>
                                            {stage.revision_notes}
                                          </div>
                                        )}

                                        {/* Quick Review Actions for Under Review Stages */}
                                        {stage.status === 'under_review' && onReviewTaskStage && (
                                          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center gap-2">
                                            <button
                                              onClick={() => onReviewTaskStage(stage.id, 'approve')}
                                              className="flex-1 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
                                              title="اعتماد وإنهاء المهمة"
                                            >
                                              <Check className="w-3 h-3" />
                                              <span>اعتماد</span>
                                            </button>
                                            <button
                                              onClick={() => onOpenRevisionModal && onOpenRevisionModal(company, stage)}
                                              className="flex-1 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                                              title="طلب تعديل وملاحظات"
                                            >
                                              <RotateCcw className="w-3 h-3" />
                                              <span>طلب تعديل</span>
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal for Client/Project Deletion */}
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
                  سيتم حذف المشروع وجميع مراحله وسجلات التدقيق الخاصة به نهائياً من النظام.
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
