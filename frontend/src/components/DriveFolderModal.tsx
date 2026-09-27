import React, { useState, useEffect } from 'react';
import { 
  FolderGit2, ExternalLink, Check, Copy, ShieldCheck, Link2,
  UserPlus, Mail, AlertCircle, Loader2, Eye, Edit3, Trash2, 
  Users, RefreshCw, Crown, Folder, FolderOpen, FileSpreadsheet,
  Layers, Lock, User
} from 'lucide-react';
import type { Client, TeamMember } from '../types';
import { 
  shareClientDrive, 
  fetchClientDrivePermissions, 
  updateClientDrivePermission, 
  deleteClientDrivePermission, 
  updateClientDriveUrl,
  fetchMembers,
  type DrivePermission 
} from '../services/api';

interface DriveFolderModalProps {
  client: Client;
  members?: TeamMember[];
  canManageAccess?: boolean;
  onClose: () => void;
  onOpenBriefModal?: (client: Client) => void;
}

type FolderTarget = 'root' | 'client_uploads' | 'team_deliverables';

export const DriveFolderModal: React.FC<DriveFolderModalProps> = ({
  client,
  members,
  canManageAccess = false,
  onClose,
  onOpenBriefModal
}) => {
  const [copied, setCopied] = useState(false);
  const [currentDriveUrl, setCurrentDriveUrl] = useState(client.drive_folder_url || '');
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [newUrlInput, setNewUrlInput] = useState(client.drive_folder_url || '');
  const [savingUrl, setSavingUrl] = useState(false);

  // Team members list for auto-selection
  const [teamMemberList, setTeamMemberList] = useState<TeamMember[]>(members || []);

  useEffect(() => {
    if (!members || members.length === 0) {
      fetchMembers().then(data => setTeamMemberList(data)).catch(() => {});
    } else {
      setTeamMemberList(members);
    }
  }, [members]);

  // Folder Target State for fine-grained access control
  const [selectedFolderTarget, setSelectedFolderTarget] = useState<FolderTarget>('root');

  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState<'reader' | 'writer'>('reader');
  const [sharing, setSharing] = useState(false);
  const [shareSuccessMsg, setShareSuccessMsg] = useState('');
  const [shareErrorMsg, setShareErrorMsg] = useState('');

  const [permissions, setPermissions] = useState<DrivePermission[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [updatingPermId, setUpdatingPermId] = useState<string | null>(null);

  const driveUrl = client.drive_folder_url || '#';

  const sub1Item = client.drive_items?.find(i => i.name.includes('01'));
  const sub1Url = sub1Item?.drive_url || (currentDriveUrl || client.drive_folder_url);

  const sub2Item = client.drive_items?.find(i => i.name.includes('02'));
  const sub2Url = sub2Item?.drive_url || (currentDriveUrl || client.drive_folder_url);

  const sheetItem = client.drive_items?.find(i => i.file_type === 'spreadsheet' || i.name.includes('شيت'));
  const sheetUrl = client.sheet_url || sheetItem?.drive_url || sub1Url;

  const getTargetFolderMeta = (target: FolderTarget) => {
    switch (target) {
      case 'client_uploads':
        return {
          key: 'client_uploads' as const,
          name: '01 - مرفقات ومواد العميل (Client Uploads)',
          shortName: '01 - مرفقات العميل',
          desc: 'مخصص لمواد العميل والشيت المعتمد',
          url: sub1Url,
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          activeBg: 'bg-amber-500/20 border-amber-500 text-amber-200'
        };
      case 'team_deliverables':
        return {
          key: 'team_deliverables' as const,
          name: '02 - مخرجات وشغل الفريق (Team Deliverables)',
          shortName: '02 - مخرجات الفريق',
          desc: 'مخصص لتسليمات الموظفين وتصاميم الأقسام',
          url: sub2Url,
          badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
          activeBg: 'bg-indigo-500/20 border-indigo-500 text-indigo-200'
        };
      case 'root':
      default:
        return {
          key: 'root' as const,
          name: `المجلد الرئيسي بالكامل (${client.company_name})`,
          shortName: 'المجلد الرئيسي بالكامل',
          desc: 'يشمل المجلد الأب وكافة المجلدات الفرعية',
          url: currentDriveUrl || client.drive_folder_url,
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          activeBg: 'bg-emerald-500/20 border-emerald-500 text-emerald-200'
        };
    }
  };

  const currentTargetMeta = getTargetFolderMeta(selectedFolderTarget);

  const loadPermissions = async (target = selectedFolderTarget) => {
    try {
      setLoadingPermissions(true);
      const meta = getTargetFolderMeta(target);
      const perms = await fetchClientDrivePermissions(client.id, meta.url);
      setPermissions(perms);
    } catch (err) {
      console.error('Failed to load permissions:', err);
    } finally {
      setLoadingPermissions(false);
    }
  };

  useEffect(() => {
    loadPermissions(selectedFolderTarget);
  }, [client.id, selectedFolderTarget]);

  const handleCopyUrl = (urlToCopy?: string) => {
    const targetUrl = urlToCopy || currentDriveUrl || client.drive_folder_url;
    if (!targetUrl) return;
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveDriveUrl = async () => {
    if (!newUrlInput.trim()) return;
    try {
      setSavingUrl(true);
      setShareSuccessMsg('');
      setShareErrorMsg('');
      await updateClientDriveUrl(client.id, newUrlInput.trim());
      setCurrentDriveUrl(newUrlInput.trim());
      client.drive_folder_url = newUrlInput.trim();
      setIsEditingUrl(false);
      setShareSuccessMsg('تم تحديث وحفظ رابط Google Drive بنجاح!');
    } catch (err: any) {
      setShareErrorMsg(err.message || 'فشل حفظ رابط المجلد');
    } finally {
      setSavingUrl(false);
    }
  };

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareEmail.trim()) return;

    try {
      setSharing(true);
      setShareSuccessMsg('');
      setShareErrorMsg('');

      const res = await shareClientDrive(
        client.id, 
        shareEmail.trim(), 
        shareRole, 
        currentTargetMeta.url, 
        currentTargetMeta.key
      );
      setShareSuccessMsg(res.message || `تمت مشاركة ${currentTargetMeta.shortName} بنجاح!`);
      setShareEmail('');
      await loadPermissions(selectedFolderTarget);
    } catch (err: any) {
      setShareErrorMsg(err.message || 'حدث خطأ أثناء محاولة المشاركة');
    } finally {
      setSharing(false);
    }
  };

  const handleUpdateRole = async (permId: string, newRole: 'reader' | 'writer') => {
    try {
      setUpdatingPermId(permId);
      setShareSuccessMsg('');
      setShareErrorMsg('');
      const res = await updateClientDrivePermission(client.id, permId, newRole, currentTargetMeta.url);
      setShareSuccessMsg(res.message);
      await loadPermissions(selectedFolderTarget);
    } catch (err: any) {
      setShareErrorMsg(err.message || 'فشل تعديل الصلاحية');
    } finally {
      setUpdatingPermId(null);
    }
  };

  const handleDeletePermission = async (permId: string, email?: string) => {
    const confirmDelete = window.confirm(`هل أنت متأكد من إلغاء صلاحية الوصول لـ ${email || 'هذا المستخدم'} من ${currentTargetMeta.shortName}؟`);
    if (!confirmDelete) return;

    try {
      setUpdatingPermId(permId);
      setShareSuccessMsg('');
      setShareErrorMsg('');
      const res = await deleteClientDrivePermission(client.id, permId, currentTargetMeta.url);
      setShareSuccessMsg(res.message || 'تم إلغاء الصلاحية وحذف الوصول بنجاح');
      await loadPermissions(selectedFolderTarget);
    } catch (err: any) {
      setShareErrorMsg(err.message || 'فشل إلغاء الصلاحية');
    } finally {
      setUpdatingPermId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-xl rounded-3xl p-6 sm:p-7 border border-gray-800 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg glow-emerald">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Google Drive</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                مجلد العميل: <strong className="text-emerald-400 font-bold">{client.company_name}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700 flex items-center justify-center font-bold cursor-pointer transition-all"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        {/* Message & Status */}
        <div className="text-center space-y-2 bg-gray-950/50 p-3.5 rounded-2xl border border-gray-800/80">
          <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-200">
              {canManageAccess ? 'نظام إدارة ومشاركة الصلاحيات لكل مجلد' : 'استعراض مجلدات العميل والصلاحيات الحالية'}
            </h4>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
              {canManageAccess 
                ? 'يمكنك التحكم بصلاحيات الوصول بشكل منفصل لكل من المجلد الرئيسي، مجلد مرفقات العميل، ومجلد تسليمات الفريق.'
                : 'يمكنك الاطلاع على قائمة المصرح لهم بالوصول لكل مجلد وفتح واستعراض كافة المجلدات والملفات المعتمدة.'}
            </p>
          </div>
        </div>

        {/* Drive Link Box with Edit Capability */}
        <div className="space-y-2 bg-gray-950/80 border border-gray-800 p-3 rounded-2xl">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-gray-300 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>رابط المجلد الرئيسي:</span>
            </label>
            {canManageAccess && (
              !isEditingUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    setNewUrlInput(currentDriveUrl || client.drive_folder_url || '');
                    setIsEditingUrl(true);
                  }}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>تعديل الرابط</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingUrl(false)}
                  className="text-[11px] text-gray-400 hover:text-gray-200 font-bold cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
              )
            )}
          </div>

          {!isEditingUrl ? (
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl p-2">
              <span className="text-xs text-gray-300 font-mono truncate flex-1 select-all direction-ltr text-left">
                {currentDriveUrl || client.drive_folder_url || 'لا يوجد رابط مسجل'}
              </span>

              {currentDriveUrl && currentDriveUrl.startsWith('http') && (
                <a
                  href={currentDriveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold transition-all shrink-0 cursor-pointer border border-emerald-500/20"
                  title="فتح في Google Drive"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>فتح</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => handleCopyUrl(currentDriveUrl)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold transition-all shrink-0 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'تم' : 'نسخ'}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={newUrlInput}
                onChange={(e) => setNewUrlInput(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="flex-1 p-2 rounded-xl bg-gray-900 border border-emerald-500/50 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleSaveDriveUrl}
                disabled={savingUrl}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1"
              >
                {savingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>حفظ الرابط</span>
              </button>
            </div>
          )}
        </div>

        {/* Subfolders & Standard 11-Column Strategy Sheet */}
        <div className="space-y-2.5 bg-gray-950/80 border border-gray-800 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black text-gray-200">هيكلة مجلدات العميل والشيت المعتمد</span>
            </div>
            <span className="text-[10px] text-gray-400 font-bold">
              {canManageAccess ? 'انقر على المجلد لإدارة صلاحياته' : 'انقر على المجلد لعرض صلاحياته ومحتواه'}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Subfolder 1 with Sheet nested inside */}
            <div className={`p-3 rounded-2xl bg-gray-900/90 border transition-all ${
              selectedFolderTarget === 'client_uploads' ? 'border-amber-500/80 ring-1 ring-amber-500/50' : 'border-amber-500/20'
            } space-y-2.5`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <Folder className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-gray-200 text-xs truncate">01 - مرفقات ومواد العميل (Client Uploads)</div>
                    <div className="text-[10px] text-gray-400">مخصص لمواد العميل ويحتوي على شيت البيانات المعتمد بالداخل</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedFolderTarget('client_uploads')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      selectedFolderTarget === 'client_uploads'
                        ? 'bg-amber-500 text-gray-950 shadow-sm font-black'
                        : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    <Lock className="w-3 h-3" />
                    <span>{selectedFolderTarget === 'client_uploads' ? (canManageAccess ? 'محدد للإدارة' : 'المعروض حالياً') : (canManageAccess ? 'إدارة الصلاحيات' : 'عرض الصلاحيات')}</span>
                  </button>
                  <a
                    href={sub1Url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-[11px] font-bold shrink-0 flex items-center gap-1 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>فتح</span>
                  </a>
                </div>
              </div>

              {/* Standard Strategy Sheet (11 columns) nested inside Subfolder 1 */}
              <div className="mr-3 pr-3 border-r-2 border-emerald-500/50 bg-emerald-950/25 border-y border-l border-emerald-500/20 p-2.5 rounded-xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-emerald-200 text-xs truncate">📊 شيت بيانات واستراتيجية العميل</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold shrink-0">
                        ملف واحد معتمد
                      </span>
                    </div>
                    <div className="text-[10px] text-emerald-300/70 truncate">
                      الهوية، اللينكات، الأقسام، العروض، المنافسين، التفضيلات (الـ 11 خانة)
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {onOpenBriefModal && (
                    <button
                      type="button"
                      onClick={() => onOpenBriefModal(client)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black text-[11px] transition-all cursor-pointer shadow-sm"
                    >
                      عرض وتعديل
                    </button>
                  )}
                  <a
                    href={sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 transition-colors"
                    title="فتح في Google Sheets"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>فتح الشيت</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Subfolder 2 */}
            <div className={`p-2.5 rounded-xl bg-gray-900 border transition-all flex items-center justify-between gap-2 ${
              selectedFolderTarget === 'team_deliverables' ? 'border-indigo-500/80 ring-1 ring-indigo-500/50' : 'border-gray-800/80'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <Folder className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-gray-200 truncate text-xs">02 - مخرجات وشغل الفريق (Team Deliverables)</div>
                  <div className="text-[10px] text-gray-400">مخصص لمخرجات وتسليمات موظفي الأقسام والتصاميم المعتمدة</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedFolderTarget('team_deliverables')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    selectedFolderTarget === 'team_deliverables'
                      ? 'bg-indigo-500 text-white shadow-sm font-black'
                      : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  <span>{selectedFolderTarget === 'team_deliverables' ? (canManageAccess ? 'محدد للإدارة' : 'المعروض حالياً') : (canManageAccess ? 'إدارة الصلاحيات' : 'عرض الصلاحيات')}</span>
                </button>
                <a
                  href={sub2Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-[11px] font-bold shrink-0 flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>فتح</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Folder Selector Tabs for Access Control */}
        <div className="p-3.5 rounded-2xl bg-gray-950/90 border border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-black text-gray-200">اختر المجلد للتحكم في صلاحياته:</h4>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentTargetMeta.badgeColor}`}>
              {currentTargetMeta.shortName}
            </span>
          </div>

          {/* Segmented Control Buttons */}
          <div className="grid grid-cols-3 gap-1.5 bg-gray-900/90 p-1.5 rounded-xl border border-gray-800">
            <button
              type="button"
              onClick={() => setSelectedFolderTarget('root')}
              className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                selectedFolderTarget === 'root'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-black'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              <span className="truncate">المجلد الرئيسي</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFolderTarget('client_uploads')}
              className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                selectedFolderTarget === 'client_uploads'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 font-black'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              <span className="truncate">01 مرفقات العميل</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFolderTarget('team_deliverables')}
              className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                selectedFolderTarget === 'team_deliverables'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-black'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <Folder className="w-3.5 h-3.5 text-indigo-400" />
              <span className="truncate">02 مخرجات الفريق</span>
            </button>
          </div>
        </div>

        {/* Existing Users with Access for SELECTED FOLDER */}
        <div className="p-4 rounded-2xl bg-gray-950/80 border border-gray-800 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-black text-gray-200">
                المصرح لهم بالوصول إلى <span className="text-emerald-300 underline underline-offset-4">{currentTargetMeta.shortName}</span> ({permissions.length})
              </h4>
            </div>
            <button
              type="button"
              onClick={() => loadPermissions(selectedFolderTarget)}
              disabled={loadingPermissions}
              className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              title="تحديث القائمة"
            >
              <RefreshCw className={`w-3 h-3 ${loadingPermissions ? 'animate-spin' : ''}`} />
              <span>تحديث</span>
            </button>
          </div>

          {loadingPermissions ? (
            <div className="py-5 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>جارِ جلب الصلاحيات لهذا المجلد من Google Drive...</span>
            </div>
          ) : permissions.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-2">لا توجد صلاحيات مخصصة مسجلة لهذا المجلد</p>
          ) : (
            <div className="space-y-2">
              {permissions.map((perm) => {
                const isOwner = perm.role === 'owner';
                const isUpdating = updatingPermId === perm.id;

                return (
                  <div
                    key={perm.id}
                    className="p-2.5 rounded-xl bg-gray-900/90 border border-gray-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0 text-white font-bold text-xs">
                        {isOwner ? <Crown className="w-4 h-4 text-amber-400" /> : (perm.emailAddress ? perm.emailAddress[0].toUpperCase() : 'U')}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-200 truncate flex items-center gap-1.5">
                          <span>{perm.displayName || perm.emailAddress || 'مستخدم بدون اسم'}</span>
                          {isOwner && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              مالك المجلد
                            </span>
                          )}
                        </div>
                        {perm.emailAddress && (
                          <div className="text-[11px] text-gray-400 font-mono truncate">{perm.emailAddress}</div>
                        )}
                      </div>
                    </div>

                    {/* Actions: Edit Role & Delete (Only for Management) */}
                    {!isOwner && (
                      canManageAccess ? (
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                          <select
                            value={perm.role === 'writer' ? 'writer' : 'reader'}
                            disabled={isUpdating}
                            onChange={(e) => handleUpdateRole(perm.id, e.target.value as 'reader' | 'writer')}
                            className="bg-gray-950 border border-gray-700 rounded-lg px-2 py-1 text-[11px] font-bold text-gray-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            <option value="reader">عرض فقط (Viewer)</option>
                            <option value="writer">تعديل ورفع (Editor)</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleDeletePermission(perm.id, perm.emailAddress)}
                            disabled={isUpdating}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                            title="إلغاء صلاحية الوصول"
                          >
                            {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                            perm.role === 'writer'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                          }`}>
                            {perm.role === 'writer' ? 'تعديل ورفع (Editor)' : 'عرض فقط (Viewer)'}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add New Permission Section for SELECTED FOLDER (Only for Management) */}
        {canManageAccess ? (
          <div className="p-4 rounded-2xl bg-gray-950/80 border border-indigo-500/20 space-y-3.5">
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-black text-gray-200">
                  منح صلاحية وصول إلى: <span className="text-indigo-300 font-bold">{currentTargetMeta.shortName}</span>
                </h4>
              </div>
              <span className="text-[10px] text-gray-400 font-mono">
                {currentTargetMeta.desc}
              </span>
            </div>

            <form onSubmit={handleShareSubmit} className="space-y-3">
              {/* Member Quick Selector */}
              <div>
                <label className="text-[11px] text-gray-300 block mb-1 font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    <span>اختيار الموظف بالاسم (يتم جلب البريد المسجل تلقائياً):</span>
                  </span>
                  <span className="text-[10px] text-indigo-400 font-bold">فريق العمل ({teamMemberList.length})</span>
                </label>
                <select
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      setShareEmail(val);
                      setShareRole('writer');
                    }
                  }}
                  value={teamMemberList.some(m => (m.email || '').toLowerCase() === shareEmail.trim().toLowerCase()) ? shareEmail.trim() : ''}
                  className="w-full bg-gray-900 border border-indigo-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                >
                  <option value="">-- اختر موظفاً من قائمة الكوادر أو أدخل الإيميل يدوياً بالأسفل --</option>
                  {teamMemberList.filter(m => m.email && m.email.trim()).map(m => (
                    <option key={m.id} value={m.email}>
                      👤 {m.name} ({m.role || 'موظف'}) — {m.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">
                  البريد الإلكتروني المعتمد (Google Workspace / Gmail):
                </label>
                <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 focus-within:border-indigo-500">
                  <Mail className="w-4 h-4 text-gray-500 shrink-0" />
                  <input
                    type="email"
                    required
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="name@gmail.com أو اختر من القائمة بالأعلى"
                    className="bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none w-full"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">
                  نوع الصلاحية الممنوحة:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShareRole('reader')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      shareRole === 'reader'
                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-sm'
                        : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>عرض فقط (Viewer)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShareRole('writer')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      shareRole === 'writer'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                        : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>تعديل ورفع (Editor)</span>
                  </button>
                </div>
              </div>

              {/* Notification messages */}
              {shareSuccessMsg && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{shareSuccessMsg}</span>
                </div>
              )}

              {shareErrorMsg && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{shareErrorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={sharing || !shareEmail.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                {sharing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جارِ ربط الصلاحية وإرسال الدعوة...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>
                      إرسال الدعوة إلى {currentTargetMeta.shortName} ({shareRole === 'reader' ? 'عرض فقط' : 'تعديل ورفع'})
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-gray-950/40 border border-gray-800/60 flex items-center justify-center gap-2 text-center text-xs text-gray-400">
            <Lock className="w-4 h-4 text-emerald-400/70 shrink-0" />
            <span>منح وسحب الصلاحيات خاص بإدارة الوكالة (Admin & Manager). حسابك الحالي يتيح لك الاطلاع واستخدام الروابط المباشرة.</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <a
            href={currentTargetMeta.url || driveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-gray-950 font-black transition-all shadow-lg shadow-emerald-500/20 text-xs"
          >
            <ExternalLink className="w-4 h-4" />
            <span>فتح {currentTargetMeta.shortName} في Google Drive</span>
          </a>

          <button
            onClick={onClose}
            className="py-3 px-5 rounded-xl bg-gray-900 border border-gray-800 hover:bg-gray-800 text-gray-300 font-bold transition-all cursor-pointer text-xs"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
