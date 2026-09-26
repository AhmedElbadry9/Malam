import React, { useState } from 'react';
import { 
  UserPlus, KeyRound, CheckCircle2, 
  XCircle, Search, Mail, UserCheck, Save, Phone, Edit, Trash2, Check, Plus, Crown, Target, Briefcase, Award, Building2
} from 'lucide-react';
import type { Department, TeamMember } from '../types';

interface TeamManagementProps {
  members: TeamMember[];
  departments: Department[];
  currentUserRole?: 'admin' | 'manager' | 'head' | 'employee' | 'super_admin';
  onAddMember: (memberData: any) => Promise<void>;
  onUpdateMember: (memberId: number, memberData: any) => Promise<void>;
  onDeleteMember: (memberId: number) => Promise<void>;
  onChangePassword: (memberId: number, newPassword: string) => Promise<void>;
  onToggleActive: (memberId: number) => Promise<void>;
}

const DEPARTMENT_ROLES_MAP: Record<string, string[]> = {
  "SOCIAL_CONTENT": [
    "كاتب محتوى إعلاني وتسويقي (Copywriter)",
    "كاتب محتوى سوشيال ميديا (Social Media Content Creator)",
    "مصحح لغوي ومراجع جودة (Proofreader & QA)",
    "مدير حسابات سوشيال ميديا (Account Manager)",
    "مصمم جرافيك سوشيال ميديا",
    "مسؤول جدولة ونشر"
  ],
  "PRODUCTION": [
    "مصور فيديو / مخرج (Videographer / Director)",
    "كاتب سيناريو (Scriptwriter)",
    "مونتير فيديو (Video Editor)",
    "مشغل درون معتمد (Drone Operator)",
    "فنان تعليق صوتي (Voice Over)",
    "مصور فوتوغرافي إعلاني"
  ],
  "BRANDING": [
    "مصمم هوية بصرية (Brand Designer)",
    "مصمم واجهات وتجربة مستخدم (UI/UX)",
    "مصمم جرافيك ومطبوعات"
  ],
  "DEV_ECOMMERCE": [
    "مختص متاجر إلكترونية (سلة / زد)",
    "مطور واجهات (Front-end)",
    "مختص SEO تقني",
    "مسؤول إدارة متجر"
  ],
  "PERFORMANCE_ADS": [
    "مختص إعلانات منصات التواصل (Meta / TikTok / Snapchat)",
    "مختص إعلانات جوجل (Google Ads)",
    "مختص إعلانات لينكدإن (LinkedIn / B2B)",
    "مختص تحليل بيانات إعلانية"
  ],
  "STRATEGY": [
    "استشاري تسويقي أول",
    "محلل منافسين وبحوث سوق"
  ],
  "OPERATIONS": [
    "مدير حساب مخصص (Account Manager)",
    "منسق عمليات داخلي"
  ]
};

const getRolesForDepartment = (dept: Department): string[] => {
  if (dept.roles && Array.isArray(dept.roles) && dept.roles.length > 0) {
    return dept.roles;
  }
  const codeKey = (dept.code || '').toUpperCase();
  if (DEPARTMENT_ROLES_MAP[codeKey]) {
    return DEPARTMENT_ROLES_MAP[codeKey];
  }
  const name = dept.name_ar.toLowerCase();
  if (name.includes('سوشيال') || name.includes('محتوى')) return DEPARTMENT_ROLES_MAP["SOCIAL_CONTENT"];
  if (name.includes('إنتاج') || name.includes('تصوير') || name.includes('فيديو')) return DEPARTMENT_ROLES_MAP["PRODUCTION"];
  if (name.includes('هوية') || name.includes('تصميم') || name.includes('براند')) return DEPARTMENT_ROLES_MAP["BRANDING"];
  if (name.includes('برمجة') || name.includes('متاجر') || name.includes('مواقع')) return DEPARTMENT_ROLES_MAP["DEV_ECOMMERCE"];
  if (name.includes('إعلانات') || name.includes('ممولة') || name.includes('performance')) return DEPARTMENT_ROLES_MAP["PERFORMANCE_ADS"];
  if (name.includes('استراتيجية') || name.includes('استشارات')) return DEPARTMENT_ROLES_MAP["STRATEGY"];
  if (name.includes('عملاء') || name.includes('عمليات')) return DEPARTMENT_ROLES_MAP["OPERATIONS"];
  return [];
};

export const TeamManagement: React.FC<TeamManagementProps> = ({
  members,
  departments,
  currentUserRole,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onChangePassword,
  onToggleActive
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<'all' | number>('all');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [selectedMemberForPassword, setSelectedMemberForPassword] = useState<TeamMember | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [departmentId, setDepartmentId] = useState<number>(departments[0]?.id || 1);
  const [departmentIds, setDepartmentIds] = useState<number[]>([]);
  const [roleType, setRoleType] = useState<'admin' | 'manager' | 'head' | 'employee' | 'super_admin'>('employee');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showAllRoles, setShowAllRoles] = useState(false);

  // Password Reset State
  const [newPassword, setNewPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  // If the logged-in user is a Manager, hide Admins, Super Admins, and all Managers completely from the list
  const isManager = currentUserRole === 'manager';
  const visibleMembers = members.filter(m => {
    if (isManager) {
      if (m.role_type === 'admin' || m.role_type === 'super_admin' || m.role_type === 'manager') {
        return false;
      }
    }
    return true;
  });

  const filteredMembers = visibleMembers.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDeptFilter === 'all' || 
                        m.department_id === selectedDeptFilter || 
                        (m.department_ids && m.department_ids.includes(selectedDeptFilter as number));
    return matchesSearch && matchesDept;
  });

  const openAddModal = () => {
    setEditingMember(null);
    setName('');
    setUsername('');
    setPassword('');
    setEmail('');
    setPhone('');
    setRoleTitle('');
    setDepartmentId(departments[0]?.id || 1);
    setDepartmentIds([departments[0]?.id || 1]);
    setRoleType('employee');
    setIsActive(true);
    setShowAllRoles(false);
    setIsModalOpen(true);
  };

  const openEditModal = (member: TeamMember) => {
    const isTargetAdminOrManager = member.role_type === 'admin' || member.role_type === 'manager' || member.role_type === 'super_admin';
    if (currentUserRole === 'manager' && isTargetAdminOrManager) {
      alert('لا يملك مدير المشاريع صلاحية تعديل بيانات حسابات المدراء أو المسؤولين.');
      return;
    }
    setEditingMember(member);
    setName(member.name);
    setUsername(member.username);
    setPassword('');
    setEmail(member.email || '');
    setPhone(member.phone || '');
    setRoleTitle(member.role || '');
    setDepartmentId(member.department_id || (departments[0]?.id || 1));
    const ids = member.department_ids && member.department_ids.length > 0 
      ? member.department_ids 
      : (member.department_id ? [member.department_id] : [departments[0]?.id || 1]);
    setDepartmentIds(ids);
    setRoleType(member.role_type || 'employee');
    setIsActive(member.is_active !== false);
    setShowAllRoles(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !name.trim()) return;

    try {
      setLoading(true);
      const chosenDepts = departmentIds.length > 0 ? departmentIds : [departmentId || departments[0]?.id || 1];
      const memberData: any = {
        name,
        username,
        email: email || `${username}@agency.com`,
        phone: phone || null,
        role: roleTitle || 'عضو فريق',
        department_id: chosenDepts[0],
        department_ids: chosenDepts,
        role_type: roleType,
        is_active: isActive
      };

      if (editingMember) {
        await onUpdateMember(editingMember.id, memberData);
      } else {
        if (!password.trim()) {
          alert('كلمة المرور مطلوبة عند إضافة مستخدم جديد');
          return;
        }
        memberData.password = password;
        await onAddMember(memberData);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'فشل حفظ الحساب');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberForPassword || !newPassword.trim()) return;

    try {
      setPwdLoading(true);
      await onChangePassword(selectedMemberForPassword.id, newPassword);
      setSelectedMemberForPassword(null);
      setNewPassword('');
    } catch (err: any) {
      alert(err.message || 'فشل تغيير كلمة المرور');
    } finally {
      setPwdLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': 
      case 'super_admin': 
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 w-fit">
            <Crown className="w-3 h-3 text-amber-400" />
            <span>مدير النظام (Admin)</span>
          </span>
        );
      case 'manager': 
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 w-fit">
            <Target className="w-3 h-3 text-indigo-400" />
            <span>مدير المشاريع (Manager)</span>
          </span>
        );
      case 'head': 
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30 flex items-center gap-1.5 w-fit">
            <Award className="w-3 h-3 text-teal-400" />
            <span>رئيس قسم (Head)</span>
          </span>
        );
      default: 
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-300 border border-slate-500/30 flex items-center gap-1.5 w-fit">
            <Briefcase className="w-3 h-3 text-slate-400" />
            <span>موظف تنفيذي (Employee)</span>
          </span>
        );
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'م';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2);
  };

  const getAvatarBadge = (member: TeamMember) => {
    let colorClass = 'from-slate-700/60 to-slate-800 text-slate-300 border-white/10';
    if (member.role_type === 'admin' || member.role_type === 'super_admin') {
      colorClass = 'from-amber-500/20 to-amber-900/40 text-amber-300 border-amber-500/30';
    } else if (member.role_type === 'manager') {
      colorClass = 'from-indigo-500/20 to-indigo-900/40 text-indigo-300 border-indigo-500/30';
    } else if (member.role_type === 'head') {
      colorClass = 'from-teal-500/20 to-teal-900/40 text-teal-300 border-teal-500/30';
    }

    return (
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClass} border flex items-center justify-center font-bold text-xs shadow-inner shrink-0 group-hover:scale-105 transition-transform select-none`}>
        {getInitials(member.name)}
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Top Header & Actions Bar */}
      <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-400" />
            <span>إدارة فريق العمل والكوادر</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            إضافة وتعديل بيانات الموظفين، تحديد الرتب والصلاحيات، وتعيين كلمات المرور
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white transition-all cursor-pointer shadow-lg shadow-indigo-600/25 active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة موظف جديد</span>
        </button>
      </div>

      {/* Filter and Search Bar (قائمة الحسابات) */}
      <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] shadow-xl space-y-4">
        {/* Top Header & Search Input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-sm text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              <span>قائمة الحسابات</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              {filteredMembers.length} من أصل {visibleMembers.length}
            </span>
            {searchTerm && (
              <span className="text-[11px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                نتائج البحث عن: "{searchTerm}"
              </span>
            )}
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="ابحث بالاسم، اسم المستخدم، أو البريد..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-8 py-2 text-xs bg-slate-950 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs cursor-pointer p-0.5"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Department Quick Filter Grid */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 font-bold text-[11px] flex items-center gap-1.5">
              <span>تصفية حسب القسم:</span>
            </span>
            {selectedDeptFilter !== 'all' && (
              <button
                onClick={() => setSelectedDeptFilter('all')}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
              >
                إلغاء التصفية (عرض الكل)
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {/* All Departments Button */}
            <button
              onClick={() => setSelectedDeptFilter('all')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border ${
                selectedDeptFilter === 'all'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30 border-indigo-400/50'
                  : 'bg-slate-900/60 hover:bg-slate-800 text-gray-300 hover:text-white border-white/[0.06] hover:border-white/10'
              }`}
            >
              <span>كل الأقسام</span>
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                  selectedDeptFilter === 'all'
                    ? 'bg-black/30 text-white'
                    : 'bg-white/[0.08] text-gray-400'
                }`}
              >
                {visibleMembers.length}
              </span>
            </button>

            {/* Department Buttons */}
            {departments.map((d) => {
              const count = visibleMembers.filter(
                (m) =>
                  m.department_id === d.id ||
                  (m.department_ids && m.department_ids.includes(d.id))
              ).length;
              const isSelected = selectedDeptFilter === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDeptFilter(d.id)}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border truncate ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30 border-indigo-400/50'
                      : 'bg-slate-900/60 hover:bg-slate-800 text-gray-300 hover:text-white border-white/[0.06] hover:border-white/10'
                  }`}
                  title={d.name_ar}
                >
                  <span className="truncate">{d.name_ar}</span>
                  <span
                    className={`shrink-0 mr-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                      isSelected
                        ? 'bg-black/30 text-white'
                        : 'bg-white/[0.08] text-gray-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Members Matrix Table */}
      <div className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 text-gray-400 font-bold border-b border-white/[0.08]">
              <tr>
                <th className="p-3.5">الموظف</th>
                <th className="p-3.5">التواصل</th>
                <th className="p-3.5">الدور والقسم</th>
                <th className="p-3.5">مستوى الصلاحية</th>
                <th className="p-3.5">حالة الحساب</th>
                <th className="p-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] font-medium">
              {filteredMembers.map((member) => (
                <tr 
                  key={member.id} 
                  className="hover:bg-white/[0.03] transition-colors group"
                >
                  
                  {/* Avatar & Name */}
                  <td className="p-3.5 cursor-pointer" onClick={() => openEditModal(member)}>
                    <div className="flex items-center gap-3">
                      {getAvatarBadge(member)}
                      <div>
                        <div className="font-bold text-white group-hover:text-indigo-300 transition-colors">{member.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">@{member.username}</div>
                      </div>
                    </div>
                  </td>

                  {/* Contact Info */}
                  <td className="p-3.5 cursor-pointer" onClick={() => openEditModal(member)}>
                    <div className="text-[11px] text-gray-300 flex items-center gap-1.5 mb-1">
                      <Mail className="w-3 h-3 text-gray-500" />
                      <span>{member.email}</span>
                    </div>
                    {member.phone && (
                      <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-gray-500" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                  </td>

                  {/* Role Title & Department */}
                  <td className="p-3.5 cursor-pointer" onClick={() => openEditModal(member)}>
                    <div className="text-gray-200 font-bold">{member.role}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {member.departments && member.departments.length >= departments.length && departments.length > 1 ? (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-bold border border-indigo-500/30 flex items-center gap-1 w-fit">
                          <Building2 className="w-3 h-3 text-indigo-400" />
                          <span>كامل أقسام الوكالة ({member.departments.length} أقسام)</span>
                        </span>
                      ) : member.departments && member.departments.length > 0 ? (
                        member.departments.map(d => (
                          <span key={d.id} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 font-bold border border-white/5">
                            {d.name_ar}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-400">{member.department?.name_ar || 'بدون قسم'}</span>
                      )}
                    </div>
                  </td>

                  {/* Role Level Badge */}
                  <td className="p-3.5 cursor-pointer" onClick={() => openEditModal(member)}>
                    {getRoleBadge(member.role_type || 'employee')}
                  </td>

                  {/* Active / Disabled Status Toggle */}
                  <td className="p-3.5">
                    {(() => {
                      const isTargetAdminOrManager = member.role_type === 'admin' || member.role_type === 'manager' || member.role_type === 'super_admin';
                      const isRestricted = currentUserRole === 'manager' && isTargetAdminOrManager;

                      return (
                        <button
                          disabled={isRestricted}
                          onClick={(e) => { e.stopPropagation(); onToggleActive(member.id); }}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                            isRestricted ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                          } ${
                            member.is_active !== false
                              ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30'
                          }`}
                          title={isRestricted ? 'لا يملك مدير المشاريع صلاحية تعديل حالة المدراء' : (member.is_active !== false ? 'تعطيل الحساب' : 'تفعيل الحساب')}
                        >
                          {member.is_active !== false ? (
                            <><CheckCircle2 className="w-3.5 h-3.5" /> نشط</>
                          ) : (
                            <><XCircle className="w-3.5 h-3.5" /> معطل</>
                          )}
                        </button>
                      );
                    })()}
                  </td>

                  {/* Actions */}
                  <td className="p-3.5 text-center">
                    {(() => {
                      const isTargetAdminOrManager = member.role_type === 'admin' || member.role_type === 'manager' || member.role_type === 'super_admin';
                      const isRestrictedByManager = currentUserRole === 'manager' && isTargetAdminOrManager;

                      return (
                        <div className="flex items-center justify-center gap-1.5">
                          {!isRestrictedByManager ? (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); openEditModal(member); }}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-indigo-600 text-gray-300 hover:text-white transition-all cursor-pointer"
                                title="تعديل البيانات"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedMemberForPassword(member); }}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-amber-600 text-gray-300 hover:text-white transition-all cursor-pointer"
                                title="تغيير كلمة المرور"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={async (e) => { 
                                  e.stopPropagation(); 
                                  if (window.confirm(`هل أنت متأكد من حذف الحساب الخاص بـ "${member.name}" نهائياً؟`)) {
                                    try {
                                      await onDeleteMember(member.id);
                                    } catch (err: any) {
                                      alert(err.message || 'فشل الحذف. قد يكون للحساب مهام مرتبطة.');
                                    }
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-600 text-gray-300 hover:text-white transition-all cursor-pointer"
                                title="حذف الحساب نهائياً"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-gray-500 font-bold px-2 py-0.5 rounded bg-white/5 border border-white/5">
                              🔒 محمي إدارياً
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-6 border border-white/10 space-y-5 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {editingMember ? <Edit className="w-5 h-5 text-indigo-400" /> : <UserPlus className="w-5 h-5 text-indigo-400" />}
                <span>{editingMember ? 'تعديل بيانات الموظف' : 'إضافة موظف / مدير جديد'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white font-bold p-1 rounded-lg hover:bg-white/10">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-300 mb-1">الاسم الكامل:</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: أحمد عبد الله"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-300 mb-1">اسم المستخدم (Username):</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="مثال: ahmed_dev"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-300 mb-1">البريد الإلكتروني:</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@agency.com"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block font-bold text-gray-300 mb-1">رقم الهاتف (اختياري):</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {!editingMember && (
                <div>
                  <label className="block font-bold text-gray-300 mb-1">كلمة المرور (Password):</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="كلمة السر..."
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {/* 1. Select Departments FIRST */}
              <div>
                <label className="block font-bold text-gray-300 mb-1.5 flex items-center justify-between">
                  <span>1. اختر الأقسام التابع لها الموظف:</span>
                  <span className="text-[10px] text-indigo-400 font-bold">تم اختيار {departmentIds.length} أقسام</span>
                </label>
                <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-slate-950 border border-white/10">
                  {departments.map(d => {
                    const isSelected = departmentIds.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            if (departmentIds.length > 1) {
                              setDepartmentIds(departmentIds.filter(id => id !== d.id));
                            }
                          } else {
                            setDepartmentIds([...departmentIds, d.id]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                            : 'bg-slate-900 border-white/5 text-gray-400 hover:text-white hover:border-white/20'
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Plus className="w-3.5 h-3.5" />}
                        <span>{d.name_ar}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Select / Type Role Title SECOND (Filtered dynamically by chosen department) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-gray-300">2. المسمى الوظيفي (Role Title):</label>
                  <button
                    type="button"
                    onClick={() => setShowAllRoles(!showAllRoles)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
                  >
                    {showAllRoles ? '✨ إظهار وظائف القسم المختار فقط' : '🌐 عرض كل وظائف الوكالة (24)'}
                  </button>
                </div>

                <input
                  type="text"
                  required
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="اكتب المسمى الوظيفي أو اضغط على أي مسمى مقترح بالأسفل..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                />

                {/* Dynamic Role Suggestions based on chosen department(s) */}
                <div className="mt-2 p-3 rounded-xl bg-slate-950/80 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <span className="text-[11px] text-indigo-300 font-bold flex items-center gap-1.5">
                      <span>{showAllRoles ? 'كل مسميات ووظائف الوكالة:' : 'الوظائف المتاحة للأقسام المختارة (اضغط للاختيار):'}</span>
                    </span>
                    <span className="text-[10px] text-gray-400">يمكنك أيضاً كتابة مسمى مخصص بالخانة</span>
                  </div>

                  {(() => {
                    const activeDepts = showAllRoles
                      ? departments
                      : departments.filter(d => departmentIds.includes(d.id));

                    if (activeDepts.length === 0) {
                      return (
                        <p className="text-[11px] text-gray-400 py-1">
                          اختر قسماً من القائمة بالأعلى لتظهر وظائفه هنا، أو اكتب المسمى يدوياً.
                        </p>
                      );
                    }

                    return (
                      <div className="space-y-2.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        {activeDepts.map(d => {
                          const roles = getRolesForDepartment(d);
                          if (roles.length === 0) return null;
                          return (
                            <div key={d.id} className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color || '#6366f1' }} />
                                <span className="text-[10px] text-gray-300 font-bold">{d.name_ar}:</span>
                              </div>
                              <div className="flex flex-wrap gap-1 pr-3">
                                {roles.map(preset => {
                                  const isCurrent = roleTitle === preset;
                                  return (
                                    <button
                                      key={preset}
                                      type="button"
                                      onClick={() => setRoleTitle(preset)}
                                      className={`text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer border ${
                                        isCurrent
                                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                                          : 'bg-white/5 border-white/5 text-gray-300 hover:text-white hover:bg-white/10'
                                      }`}
                                    >
                                      {preset}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-300 mb-1">مستوى الصلاحية والرتبة:</label>
                <select
                  value={roleType}
                  onChange={(e) => setRoleType(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                >
                  <option value="employee">💼 موظف تنفيذي (تنفيذ المهام المسندة له ورفع المخرجات)</option>
                  <option value="head">⭐ رئيس قسم (Head - توزيع مهام القسم ومراجعة واعتماد المخرجات)</option>
                  {currentUserRole !== 'manager' && (
                    <>
                      <option value="manager">🎯 مدير مشاريع (Manager - متابعة العمليات وإدارة المشاريع)</option>
                      <option value="admin">👑 مدير النظام (Admin - صلاحيات كاملة: أقسام، كوادر، عملاء، تشغيل)</option>
                    </>
                  )}
                </select>
              </div>

              {editingMember && (
                <div>
                  <label className="flex items-center gap-2 cursor-pointer mt-2 p-2.5 rounded-xl bg-slate-900 border border-white/10">
                    <input 
                      type="checkbox" 
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="accent-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="font-bold text-gray-200">الحساب نشط (يمكنه تسجيل الدخول للنظام)</span>
                  </label>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-white/10 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 font-bold text-gray-300 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'جاري الحفظ...' : 'حفظ بيانات الموظف'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {selectedMemberForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 border border-white/10 space-y-4 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>تغيير كلمة المرور</span>
              </h3>
              <button onClick={() => setSelectedMemberForPassword(null)} className="text-gray-400 hover:text-white font-bold p-1 rounded-lg hover:bg-white/10">✕</button>
            </div>
            
            <p className="text-xs text-gray-300">
              أنت تقوم بتغيير كلمة المرور لحساب: <strong className="text-white font-bold">{selectedMemberForPassword.name}</strong>
            </p>

            <form onSubmit={handlePasswordResetSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-300 mb-1">كلمة المرور الجديدة:</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="ادخل كلمة المرور الجديدة..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-white/10 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedMemberForPassword(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 font-bold text-gray-300 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{pwdLoading ? 'جاري التحديث...' : 'حفظ كلمة المرور'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
