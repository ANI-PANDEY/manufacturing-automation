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
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { login, register, resetPassword } = useAuth();

  // Mode switcher: 'login' | 'register' | 'forgot'
  const [authMode, setAuthMode] = useState('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [companyName, setCompanyName] = useState('StackPulse Enterprise');
  const [role, setRole] = useState('ADMIN');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fillAdminCredentials = () => {
    setEmail('admin@stackpulse.com');
    setPassword('admin123');
    setSecretCode('1234');
    setErrorMsg('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(cleanEmail, password);
      setLoading(false);
      if (!result.success) {
        setErrorMsg(result.message || 'Invalid email or password. Please try again.');
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.response?.data?.message || err.message || 'Server connection error.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim();
    if (!name.trim() || !cleanEmail || !password) {
      setErrorMsg('Name, email, and password are required.');
      return;
    }

    if (password.length < 4) {
      setErrorMsg('Password must be at least 4 characters long.');
      return;
    }

    setLoading(true);
    try {
      const result = await register({
        name: name.trim(),
        email: cleanEmail,
        password,
        role,
        companyName: companyName.trim() || 'Manufacturing ERP Enterprise',
        secretCode: secretCode.trim() || '1234',
      });
      setLoading(false);

      if (!result.success) {
        setErrorMsg(result.message || 'Registration failed. Email might already exist.');
      } else {
        setSuccessMsg('Account created successfully! Logging you in...');
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.response?.data?.message || err.message || 'Registration server error.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim();
    const cleanSecret = secretCode.trim();

    if (!cleanEmail || !cleanSecret || !password) {
      setErrorMsg('Please fill in your registered email, secret recovery code, and new password.');
      return;
    }

    if (password.length < 4) {
      setErrorMsg('New password must be at least 4 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter both correctly.');
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword({
        email: cleanEmail,
        secretCode: cleanSecret,
        newPassword: password,
      });
      setLoading(false);

      if (!result.success) {
        setErrorMsg(result.message || 'Password reset failed. Invalid secret recovery code.');
      } else {
        setSuccessMsg(result.message || 'Password reset successfully! Please sign in with your new password.');
        setPassword('');
        setConfirmPassword('');
        setAuthMode('login');
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.response?.data?.message || err.message || 'Error resetting password.');
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
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-cyan-400 shadow-lg shadow-sky-500/30 mb-3 transform hover:scale-105 transition">
            <Factory className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span>StackPulse</span>
            <span className="bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
              ENTERPRISE ERP
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {authMode === 'login' && 'Sign in with your @stackpulse.com ID or Email'}
            {authMode === 'register' && 'Create your StackPulse account (fresh 0 start)'}
            {authMode === 'forgot' && 'Reset forgotten password with your secret recovery code'}
          </p>
        </div>

        {/* 3-Mode Segmented Control Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition ${
              authMode === 'login'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition ${
              authMode === 'register'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>New User</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('forgot');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition ${
              authMode === 'forgot'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Pass</span>
          </button>
        </div>

        {/* 1-Click Demo Credentials Pill (Login Mode Only) */}
        {authMode === 'login' && (
          <div className="mb-5 p-3 rounded-2xl bg-sky-950/40 border border-sky-800/40 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-sky-200">Default Demo Admin</p>
                <p className="text-[11px] text-sky-400/80">admin@stackpulse.com • admin123</p>
              </div>
            </div>
            <button
              type="button"
              onClick={fillAdminCredentials}
              className="text-xs font-extrabold bg-sky-500 hover:bg-sky-400 text-slate-950 px-3 py-1.5 rounded-xl shadow transition cursor-pointer"
            >
              1-Click Fill
            </button>
          </div>
        )}

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ----------------- MODE 1: LOGIN ----------------- */}
        {authMode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-300">Username / StackPulse Email</label>
                <span className="text-[10px] text-sky-400 font-mono bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                  @stackpulse.com
                </span>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. aniket or aniket@stackpulse.com"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                  required
                />
              </div>
              {email && !email.includes('@') && (
                <p className="text-[10px] text-sky-400/90 mt-1 pl-1 font-mono">
                  Logging in as: <strong>{email.trim().toLowerCase()}@stackpulse.com</strong>
                </p>
              )}
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
                  className="text-[11px] font-bold text-amber-400 hover:text-amber-300 transition underline underline-offset-2 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Forgot Password? (पासवर्ड भूल गए?)</span>
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
              className="w-full bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 font-extrabold py-3 rounded-xl shadow-lg shadow-sky-500/25 transition transform active:scale-98 flex items-center justify-center space-x-2 text-xs uppercase tracking-wider cursor-pointer"
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

            <div className="pt-2 text-center border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('forgot');
                  setErrorMsg('');
                  setSuccessMsg('');
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="inline-flex items-center space-x-1.5 text-xs text-amber-400 hover:text-amber-300 font-bold bg-amber-500/10 hover:bg-amber-500/20 px-3.5 py-2 rounded-xl border border-amber-500/30 transition cursor-pointer w-full justify-center"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Forgot Password? Click here to Reset (पासवर्ड रीसेट करें)</span>
              </button>
            </div>
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
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-300">
                  StackPulse Username or Email *
                </label>
                <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  @stackpulse.com
                </span>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. aniket or aniket@stackpulse.com"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 pl-1">
                Your login ID will be:{' '}
                <strong className="text-emerald-400 font-mono">
                  {email ? (email.includes('@') ? email.trim() : `${email.trim().toLowerCase()}@stackpulse.com`) : 'username@stackpulse.com'}
                </strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Create Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 4 characters"
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
                  Secret Recovery Code / PIN (सिक्रेट कोड)
                </label>
                <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                  Save this PIN!
                </span>
              </div>
              <div className="relative">
                <ShieldAlert className="w-4 h-4 text-amber-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value)}
                  placeholder="e.g. 1234 or your private PIN"
                  className="w-full bg-slate-800/80 border border-amber-500/40 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Password bhoolne par is code se reset hoga (Default: <strong>1234</strong>).
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Company / Factory Name</label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. StackPulse Enterprise or your factory name"
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
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold py-3 rounded-xl shadow-lg shadow-emerald-500/25 transition transform active:scale-98 flex items-center justify-center space-x-2 text-xs uppercase tracking-wider cursor-pointer"
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
            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="font-bold text-amber-200">Reset Your Password</p>
                <p className="text-[11px] text-amber-300/90 mt-0.5">
                  Apna registered email aur Secret Code daalein. Agar code nahi badla tha toh default <strong>1234</strong> daalein.
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-300">
                  StackPulse Username or Email
                </label>
                <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  @stackpulse.com
                </span>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. aniket or aniket@stackpulse.com"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                  required
                />
              </div>
              {email && !email.includes('@') && (
                <p className="text-[10px] text-amber-400/90 mt-1 pl-1 font-mono">
                  Resetting account for: <strong>{email.trim().toLowerCase()}@stackpulse.com</strong>
                </p>
              )}
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
                  className="w-full bg-slate-800/80 border border-amber-500/40 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Default Admin (admin@stackpulse.com) code: <strong>1234</strong>
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
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
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
                  placeholder="Re-type new password"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
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
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold py-3 rounded-xl shadow-lg shadow-amber-500/25 transition transform active:scale-98 flex items-center justify-center space-x-2 text-xs uppercase tracking-wider cursor-pointer"
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
        <div className="mt-5 text-center border-t border-slate-800 pt-4">
          {authMode === 'login' && (
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('forgot');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="font-bold text-amber-400 hover:text-amber-300 transition"
              >
                Forgot Password?
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="font-bold text-sky-400 hover:text-sky-300 transition"
              >
                Create Account →
              </button>
            </div>
          )}

          {authMode === 'register' && (
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="font-bold text-sky-400 hover:text-sky-300 transition inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('forgot');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="font-bold text-amber-400 hover:text-amber-300 transition"
              >
                Forgot Password?
              </button>
            </div>
          )}

          {authMode === 'forgot' && (
            <div className="text-center text-xs">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="font-bold text-sky-400 hover:text-sky-300 transition inline-flex items-center gap-1"
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
