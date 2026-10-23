import React, { useState } from 'react';
import {
  Factory,
  Lock,
  Mail,
  UserCheck,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { login, register, resetPassword } = useAuth();

  // 'login' | 'register' | 'forgot'
  const [authMode, setAuthMode] = useState('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [companyName, setCompanyName] = useState('Manufacturing ERP Enterprise');
  const [role, setRole] = useState('ADMIN');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fillAdminCredentials = () => {
    setEmail('admin@manufacturer.com');
    setPassword('admin123');
    setSecretCode('1234');
    setErrorMsg('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      setErrorMsg(result.message);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name || !email || !password) {
      setErrorMsg('Name, email, and password are required.');
      return;
    }

    if (password.length < 4) {
      setErrorMsg('Password must be at least 4 characters.');
      return;
    }

    setLoading(true);
    const result = await register({
      name,
      email,
      password,
      role,
      companyName,
      secretCode: secretCode.trim() || '1234',
    });
    setLoading(false);

    if (!result.success) {
      setErrorMsg(result.message);
    } else {
      setSuccessMsg('Account created successfully! Logging you in...');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !secretCode || !password) {
      setErrorMsg('Please fill in your email, secret recovery code, and new password.');
      return;
    }

    if (password.length < 4) {
      setErrorMsg('New password must be at least 4 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter both correctly.');
      return;
    }

    setLoading(true);
    const result = await resetPassword({
      email,
      secretCode,
      newPassword: password,
    });
    setLoading(false);

    if (!result.success) {
      setErrorMsg(result.message);
    } else {
      setSuccessMsg(result.message || 'Password reset successfully! You can now log in.');
      setPassword('');
      setConfirmPassword('');
      setAuthMode('login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Animated Glow Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-sky-500/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div
        className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none animate-pulse"
        style={{ animationDelay: '1s' }}
      ></div>

      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 p-6 sm:p-8">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-400 shadow-lg shadow-sky-500/30 mb-3 transform hover:scale-105 transition">
            <Factory className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            <span>Manufacturing ERP</span>
            <span className="bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
              ENTERPRISE
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {authMode === 'register' && 'Register New Custom Manufacturer Account'}
            {authMode === 'login' && 'Enter credentials to access the ERP Software'}
            {authMode === 'forgot' && 'Reset Password using Secret Recovery Code'}
          </p>
        </div>

        {/* 1-Click Demo Credentials Quick Pill (Login Mode Only) */}
        {authMode === 'login' && (
          <div className="mb-6 p-3 rounded-2xl bg-sky-950/40 border border-sky-800/40 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-sky-200">Default Demo Admin</p>
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

        {/* ----------------- MODE 1: LOGIN ----------------- */}
        {authMode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Email Address</label>
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('forgot');
                    setErrorMsg('');
                    setSuccessMsg('');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 transition hover:underline"
                >
                  Forgot Password? (पासवर्ड भूल गए?)
                </button>
              </div>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 font-extrabold py-3 rounded-xl shadow-lg shadow-sky-500/25 transition transform active:scale-98 flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In To Software</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ----------------- MODE 2: REGISTER ----------------- */}
        {authMode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
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

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Create Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 4 characters"
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

            {/* Secret Recovery Code Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-300">
                  Secret Recovery Code / PIN (सिक्रेट रिकवरी कोड)
                </label>
                <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                  Save this!
                </span>
              </div>
              <div className="relative">
                <ShieldAlert className="w-4 h-4 text-amber-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value)}
                  placeholder="e.g. 1234 or your private recovery PIN"
                  className="w-full bg-slate-800/80 border border-amber-500/30 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Agar aap kabhi password bhool gaye, toh is code se reset kar payenge (Default: 1234).
              </p>
            </div>

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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold py-3 rounded-xl shadow-lg shadow-emerald-500/25 transition transform active:scale-98 flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Create Account & Log In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ----------------- MODE 3: FORGOT PASSWORD ----------------- */}
        {authMode === 'forgot' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                Apna account email, registration ke time diya gaya <strong>Secret Code</strong>, aur naya password daal kar password reset karein.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Registered Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@company.com"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Secret Recovery Code / Security PIN
              </label>
              <div className="relative">
                <ShieldAlert className="w-4 h-4 text-amber-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value)}
                  placeholder="e.g. 1234 or your secret PIN"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Tip: Agar aapne code nahi badla tha, toh default <strong>1234</strong> check karein.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">New Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password (min 4 characters)"
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

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Confirm New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 transition"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold py-3 rounded-xl shadow-lg shadow-amber-500/25 transition transform active:scale-98 flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Reset Password Now</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Navigation Between Modes */}
        <div className="mt-6 text-center border-t border-slate-800 pt-4">
          {authMode === 'login' && (
            <div>
              <p className="text-xs text-slate-400">Need to set up a new custom user account?</p>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="mt-1 text-xs font-bold text-sky-400 hover:text-sky-300 transition underline underline-offset-4"
              >
                Create New User Account (Zero Data Start)
              </button>
            </div>
          )}

          {authMode === 'register' && (
            <div>
              <p className="text-xs text-slate-400">Already have an account?</p>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="mt-1 text-xs font-bold text-sky-400 hover:text-sky-300 transition underline underline-offset-4 inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Switch to Sign In</span>
              </button>
            </div>
          )}

          {authMode === 'forgot' && (
            <div>
              <p className="text-xs text-slate-400">Remember your password?</p>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="mt-1 text-xs font-bold text-sky-400 hover:text-sky-300 transition underline underline-offset-4 inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
