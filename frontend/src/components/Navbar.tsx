import React, { useState } from 'react';
import { 
  PlusCircle, LogOut, Users, FolderGit2, Layers, Crown, Target, 
  Briefcase, Award, Menu, X 
} from 'lucide-react';
import type { TeamMember } from '../types';
import malamLogo from '../assets/malam-logo.png';

interface NavbarProps {
  currentUser: { type: 'admin' | 'manager' | 'head' | 'employee' | 'super_admin'; member?: TeamMember };
  activeTab: 'dispatch' | 'team' | 'departments';
  onTabChange: (tab: 'dispatch' | 'team' | 'departments') => void;
  onLogout: () => void;
  onOpenNewClientModal: () => void;
  onResetData: () => void;
  pendingReviewsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  onTabChange,
  onLogout,
  onOpenNewClientModal,
  pendingReviewsCount = 0,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = currentUser.type === 'admin' || currentUser.type === 'super_admin';
  const isManager = currentUser.type === 'manager';
  const isHead = currentUser.type === 'head';
  const isManagement = isAdmin || isManager;

  const getRoleDisplay = () => {
    switch (currentUser.type) {
      case 'super_admin':
      case 'admin':
        return {
          title: currentUser.member?.name || 'مدير النظام (Admin)',
          sub: currentUser.member?.role || 'Operations & Agency Director',
          icon: Crown,
          iconColor: 'text-amber-400',
          badgeText: 'إدارة عليا'
        };
      case 'manager':
        return {
          title: currentUser.member?.name || 'مدير المشاريع',
          sub: 'Project & Accounts Manager',
          icon: Target,
          iconColor: 'text-indigo-400',
          badgeText: 'إدارة مشاريع'
        };
      case 'head':
        return {
          title: currentUser.member?.name || 'رئيس القسم',
          sub: currentUser.member?.department?.name_ar || 'Head of Department',
          icon: Award,
          iconColor: 'text-teal-400',
          badgeText: 'رئيس قسم'
        };
      default:
        return {
          title: currentUser.member?.name || 'موظف تنفيذي',
          sub: currentUser.member?.department?.name_ar || 'Team Member',
          icon: Briefcase,
          iconColor: 'text-slate-400',
          badgeText: 'تنفيذ'
        };
    }
  };

  const roleInfo = getRoleDisplay();
  const RoleIcon = roleInfo.icon;

  const handleTabClick = (tab: 'dispatch' | 'team' | 'departments') => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0b0f17]/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 xl:px-12 py-3.5 mb-6 shadow-md">
      <div className="max-w-[1680px] mx-auto flex items-center justify-between gap-4 lg:gap-8">
        
        {/* Brand & Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative shrink-0 flex items-center justify-center">
            <img 
              src={malamLogo} 
              alt="Ma'lam - معلم" 
              className="w-10 h-10 rounded-xl object-contain bg-slate-900/90 border border-slate-700/80 p-0.5 shadow-md shadow-black/40 transition-transform hover:scale-105"
            />
          </div>
          <div className="flex flex-col justify-center text-right">
            <div className="flex items-center gap-2">
              <h1 className="font-black text-base sm:text-lg text-white tracking-tight flex items-center gap-2">
                <span>مَعْلَمْ</span>
                <span className="text-indigo-400 font-bold text-xs sm:text-sm font-sans tracking-normal opacity-90">Ma'lam</span>
              </h1>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>مباشر</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide mt-0.5">
              نظام التشغيل وإدارة الوكالة
            </p>
          </div>
        </div>

        {/* Center: Navigation Tabs for Management & Head (Desktop) */}
        {isManagement ? (
          <nav className="hidden md:flex items-center bg-slate-900/90 rounded-2xl border border-slate-800/90 p-1.5 shadow-inner gap-2">
            <button
              onClick={() => handleTabClick('dispatch')}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dispatch'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <FolderGit2 className="w-4 h-4 shrink-0" />
              <span>العملاء والمتابعة</span>
              {pendingReviewsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 shadow-sm">
                  {pendingReviewsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabClick('team')}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'team'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>فريق العمل</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => handleTabClick('departments')}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'departments'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                }`}
              >
                <Layers className="w-4 h-4 shrink-0" />
                <span>الأقسام والخدمات</span>
              </button>
            )}
          </nav>
        ) : isHead ? (
          <div className="hidden md:flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-bold shadow-sm">
            <Award className="w-4 h-4 text-teal-400 shrink-0" />
            <span>لوحة رئيس القسم (المراجعة والاعتماد)</span>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-bold shadow-sm">
            <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
            <span>لوحة الموظف (المهام والتسليمات)</span>
          </div>
        )}

        {/* Left (in RTL): Actions, User Profile & Mobile Toggle */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          
          {/* New Client Button (Management Only) */}
          {isManagement && (
            <button
              onClick={onOpenNewClientModal}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/25 border border-indigo-400/30 transition-all active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">عميل جديد</span>
              <span className="sm:hidden">إضافة</span>
            </button>
          )}

          {/* User Profile Info Card */}
          <div className="flex items-center gap-2.5 sm:gap-3 px-3.5 py-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all text-right shadow-sm">
            <div className="hidden sm:block leading-tight">
              <div className="font-bold text-xs text-white truncate max-w-[210px]">
                {roleInfo.title}
              </div>
              <div className="text-[11px] text-slate-400 font-medium truncate max-w-[210px] mt-0.5">
                {roleInfo.sub}
              </div>
            </div>
            
            <div className="w-9 h-9 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
              {currentUser.member?.avatar ? (
                <img
                  src={currentUser.member.avatar}
                  alt={currentUser.member.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <RoleIcon className={`w-4 h-4 ${roleInfo.iconColor}`} />
              )}
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            title="تسجيل الخروج"
            aria-label="تسجيل الخروج"
            className="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Mobile Menu Toggle Button */}
          {isManagement && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white transition-colors"
              aria-label="القائمة الرئيسية"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && isManagement && (
        <div className="md:hidden border-t border-slate-800 mt-2.5 pt-3 pb-2 flex flex-col gap-1.5 animate-fadeIn">
          <button
            onClick={() => handleTabClick('dispatch')}
            className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'dispatch'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FolderGit2 className="w-4 h-4" />
              <span>لوحة العملاء والمتابعة</span>
            </div>
            {pendingReviewsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                {pendingReviewsCount} معلق
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabClick('team')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'team'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>فريق العمل والكوادر</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => handleTabClick('departments')}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                activeTab === 'departments'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>الأقسام والخدمات</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
