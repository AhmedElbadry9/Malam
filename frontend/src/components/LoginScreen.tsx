import React, { useState } from 'react';
import { ArrowLeft, User, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import type { TeamMember } from '../types';
import malamLogo from '../assets/malam-logo.png';

interface LoginScreenProps {
  onLoginSuccess: (userType: 'admin' | 'manager' | 'head' | 'employee' | 'super_admin', member?: TeamMember) => void;
  onLoginSubmit: (username: string, password: string) => Promise<{ user_type: 'admin' | 'manager' | 'head' | 'employee' | 'super_admin'; member?: TeamMember }>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onLoginSubmit
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await onLoginSubmit(cleanUser, cleanPass);
      onLoginSuccess(res.user_type, res.member);
    } catch (err: any) {
      setError(err.message || 'اسم المستخدم أو كلمة المرور غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] flex items-center justify-center p-4 selection:bg-orange-500 selection:text-white relative overflow-hidden">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-1/6 left-1/5 w-[32rem] h-[32rem] bg-orange-600/10 rounded-full blur-[140px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute bottom-1/6 right-1/5 w-[32rem] h-[32rem] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-lg relative z-10 animate-fadeInUp">
        
        {/* Main Glass Card */}
        <div className="glass-panel p-8 sm:p-10 rounded-[2.5rem] relative overflow-hidden border border-white/10 shadow-2xl">
          
          {/* Top Edge Highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-orange-500/60 to-transparent"></div>

          {/* Logo & Brand */}
          <div className="flex flex-col items-center text-center space-y-4 mb-8">
            <div className="relative group cursor-default">
              <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/30 to-rose-500/30 blur-2xl rounded-2xl scale-125 opacity-75 group-hover:opacity-100 transition-opacity duration-500"></div>
              <img 
                src={malamLogo} 
                alt="Ma'lam - معلم" 
                className="w-20 h-20 rounded-2xl shadow-xl object-cover relative z-10 border border-white/15 transform transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
                Ma'lam <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-rose-400 to-amber-300">مَعْلَمْ</span>
              </h1>
              <p className="text-xs text-gray-400 mt-1 font-medium tracking-wide">نظام تشغيل وإدارة وكالات التسويق والإنتاج</p>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 flex items-center gap-3 text-xs font-bold animate-fadeIn">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            
            <div className="space-y-1.5">
              <label className="text-gray-300 font-semibold px-1 block text-xs">اسم المستخدم أو البريد الألكتروني</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="اسم المستخدم أو البريد الألكتروني"
                  className="w-full pr-11 pl-4 py-3 rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/60 focus:bg-slate-900/90 focus:ring-2 focus:ring-orange-500/20 transition-all font-sans"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-gray-300 font-semibold block text-xs">كلمة المرور</label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-11 pl-11 py-3 rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/60 focus:bg-slate-900/90 focus:ring-2 focus:ring-orange-500/20 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                  title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden rounded-xl p-[1px] mt-2 cursor-pointer transition-transform active:scale-[0.99]"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 rounded-xl opacity-90 group-hover:opacity-100 transition-opacity"></span>
              <div className="relative flex items-center justify-center gap-2 px-6 py-3.5 bg-[#0b0f19]/40 rounded-xl backdrop-blur-sm text-white font-bold text-sm group-hover:bg-transparent transition-all">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    <span>جاري التحقق...</span>
                  </div>
                ) : (
                  <>
                    <span>دخول النظام</span>
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  </>
                )}
              </div>
            </button>

          </form>

        </div>

      </div>
    </div>
  );
};
