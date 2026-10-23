import React, { useState } from 'react';
import { Factory, Lock, Mail, UserCheck, KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle, ArrowRight, Sparkles, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { login, register } = useAuth();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('Manufacturing ERP Enterprise');
  const [role, setRole] = useState('ADMIN');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fillAdminCredentials = () => {
    setEmail('admin@manufacturer.com');
    setPassword('admin123');
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password) {
      setErrorMsg('Please fill in both email and password.');
      return;
    }

    if (isRegisterMode && !name) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    setLoading(true);

    if (isRegisterMode) {
      const result = await register({ name, email, password, role, companyName });
      setLoading(false);
      if (!result.success) {
        setErrorMsg(result.message);
      } else {
        setSuccessMsg('Account created successfully! Logging you in...');
      }
    } else {
      const result = await login(email, password);
      setLoading(false);
      if (!result.success) {
        setErrorMsg(result.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Animated Glow Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-sky-500/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 p-6 sm:p-8">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-400 shadow-lg shadow-sky-500/30 mb-3 transform hover:scale-105 transition">
            <Factory className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            <span>Manufacturing ERP</span>
            <span className="bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
              ADMIN SECURE
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isRegisterMode ? 'Register New Admin / Staff Account' : 'Enter credentials to access the ERP Software'}
          </p>
        </div>

        {/* 1-Click Demo Credentials Quick Pill */}
        {!isRegisterMode && (
          <div className="mb-6 p-3 rounded-2xl bg-sky-950/40 border border-sky-800/40 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-sky-200">Default Admin Account</p>
                <p className="text-[11px] text-sky-400/80">admin@manufacturer.com • admin123</p>
              </div>
            </div>
            <button
              type="button"
              onClick={fillAdminCredentials}
              className="text-xs font-extrabold bg-sky-500 hover:bg-sky-400 text-slate-950 px-3 py-1.5 rounded-xl shadow transition"
            >
              1-Click Fill
            </button>
          </div>
        )}

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Login / Register Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegisterMode && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aniket Pandey"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Admin Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@manufacturer.com"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isRegisterMode && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Company / Organization</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Apex Manufacturing Ltd"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500 transition"
                >
                  <option value="ADMIN">System Administrator (Full Access)</option>
                  <option value="MANAGER">Plant Manager (Operations)</option>
                  <option value="OPERATOR">Inventory Operator</option>
                </select>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 font-extrabold py-3 rounded-xl shadow-lg shadow-sky-500/25 transition transform active:scale-98 flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>{isRegisterMode ? 'Create Account & Log In' : 'Sign In To Software'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode Button */}
        <div className="mt-6 text-center border-t border-slate-800 pt-4">
          <p className="text-xs text-slate-400">
            {isRegisterMode ? 'Already have an Admin account?' : 'Need to set up a new Admin / Staff user?'}
          </p>
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="mt-1 text-xs font-bold text-sky-400 hover:text-sky-300 transition underline underline-offset-4"
          >
            {isRegisterMode ? 'Switch to Sign In' : 'Create New User Account'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
