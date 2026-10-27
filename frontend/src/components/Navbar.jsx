import React, { useState, useRef, useEffect } from 'react';
import {
  Factory,
  CreditCard,
  ShoppingCart,
  PackagePlus,
  Sun,
  Moon,
  Languages,
  LogOut,
  Building2,
  Edit3,
  Sliders,
  ChevronDown,
  Menu,
  X,
  LayoutDashboard,
  BookOpen,
  Users,
  Boxes,
  Plus,
  KeyRound,
  FileSpreadsheet,
  Database,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useIndustry } from '../context/IndustryContext';

const Navbar = ({
  darkMode,
  toggleTheme,
  onOpenPaymentModal,
  onOpenOrderModal,
  onOpenInwardModal,
  onOpenEditEnterpriseModal,
  onOpenIndustryModal,
  onOpenResetPasswordModal,
  onOpenMigrationModal,
  activeTab,
  setActiveTab,
}) => {
  const { lang, setLang, t } = useLanguage();
  const { user, logout } = useAuth();
  const { activePreset } = useIndustry();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentCompanyName = user?.companyName || 'StackPulse Enterprise';

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Prevent background scrolling when mobile drawer is open
  useEffect(() => {
    if (isMobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileDrawerOpen]);

  const handleMobileNav = (tabId) => {
    if (setActiveTab) setActiveTab(tabId);
    setIsMobileDrawerOpen(false);
  };

  return (
    <>
      <header className="w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 sticky top-0 z-40 shadow-sm font-sans transition-colors duration-200">
        <div className="w-full px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            {/* LEFT: Mobile Menu Button & Brand Logo */}
            <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
              {/* Mobile Drawer Hamburger Button */}
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(true)}
                className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none transition"
                aria-label="Open Navigation Menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0 font-black">
                <Factory className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>

              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm sm:text-lg tracking-tight text-slate-900 dark:text-white whitespace-nowrap hidden min-[360px]:inline">
                  {t('appTitle') || 'StackPulse ERP'}
                </span>

                {/* Unified Enterprise & Industry Pill */}
                <button
                  onClick={onOpenEditEnterpriseModal}
                  title="Click to manage Company Name & Industry Settings"
                  className="group inline-flex items-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100/80 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 text-xs font-bold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border border-indigo-200/80 dark:border-indigo-800/60 transition max-w-[130px] sm:max-w-[260px] md:max-w-[320px] shadow-sm"
                >
                  <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate text-[11px] sm:text-xs">{currentCompanyName}</span>
                  <span className="text-[9px] sm:text-[10px] bg-indigo-600 text-white dark:bg-indigo-500/30 dark:text-indigo-300 font-extrabold px-1.5 py-0.5 rounded-full shrink-0 hidden md:inline-block border border-indigo-500/30">
                    {activePreset.badge}
                  </span>
                  <Edit3 className="w-3 h-3 text-indigo-400 opacity-70 group-hover:opacity-100 shrink-0 transition hidden sm:inline" />
                </button>
              </div>
            </div>

            {/* CENTER: Main ERP Quick Actions (Desktop only) */}
            <div className="hidden lg:flex items-center space-x-2.5">
              <button
                onClick={onOpenInwardModal}
                title="Inward Stock (Alt + I)"
                className="inline-flex items-center space-x-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-3.5 py-1.5 rounded-xl text-xs font-bold border border-purple-200/80 dark:border-purple-800/50 transition shadow-sm"
              >
                <PackagePlus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>{t('inwardStock')}</span>
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 ml-1">
                  Alt+I
                </kbd>
              </button>

              <button
                onClick={onOpenOrderModal}
                title="Create Dispatch Invoice (Alt + D)"
                className="inline-flex items-center space-x-1.5 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 px-3.5 py-1.5 rounded-xl text-xs font-bold border border-sky-200/80 dark:border-sky-800/50 transition shadow-sm"
              >
                <ShoppingCart className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>{t('createDispatch')}</span>
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-700 ml-1">
                  Alt+D
                </kbd>
              </button>

              <button
                onClick={() => onOpenPaymentModal('')}
                title="Receive Payment (Alt + P)"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-1.5 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/25 transition transform active:scale-95 cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-white" />
                <span>{t('receivePayment')}</span>
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-700/80 text-emerald-100 border border-emerald-400/30 ml-1 font-bold">
                  Alt+P
                </kbd>
              </button>

              <button
                onClick={() => onOpenMigrationModal && onOpenMigrationModal('parties')}
                title="Import Old Data & Excel Records (डेटा माइग्रेशन)"
                className="inline-flex items-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-xl text-xs font-bold border border-indigo-200/80 dark:border-indigo-800/50 transition shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Import Old Data</span>
              </button>
            </div>

            {/* RIGHT: Responsive Actions & Unified Profile Menu */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
              {/* Quick Payment Button for Mobile & Tablet */}
              <button
                onClick={() => onOpenPaymentModal('')}
                className="lg:hidden px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-xs flex items-center gap-1 shadow-sm shadow-emerald-600/30 active:scale-95"
                title="Receive Payment"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">Pay</span>
              </button>

              {/* Quick Dispatch Button for Mobile */}
              <button
                onClick={onOpenOrderModal}
                className="lg:hidden p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-sky-600 text-white font-bold text-xs flex items-center gap-1 shadow-sm shadow-sky-600/20 active:scale-95"
                title="Create Dispatch Invoice"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Invoice</span>
              </button>

              {/* Direct Prominent Reset Password Button on Navbar */}
              <button
                onClick={() => onOpenResetPasswordModal && onOpenResetPasswordModal()}
                className="flex items-center space-x-1 sm:space-x-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 px-2 sm:px-3 py-1.5 rounded-xl font-extrabold text-xs transition cursor-pointer shadow-sm active:scale-95"
                title="Reset or Change Password with Secret PIN"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Reset Password</span>
                <span className="sm:hidden text-[10px]">PIN/Pass</span>
              </button>

              {/* User Profile & System Controls Dropdown */}
              <div className="relative z-50" ref={dropdownRef}>
                <button
                  type="button"
                  id="admin-profile-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsProfileMenuOpen((prev) => !prev);
                  }}
                  className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 sm:px-2.5 sm:py-1.5 transition text-left cursor-pointer"
                  aria-expanded={isProfileMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <div className="hidden sm:block leading-tight pr-1">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-1 max-w-[100px]">
                      {user?.name || 'Admin'}
                    </p>
                    <p className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                      {user?.role || 'ADMIN'}
                    </p>
                  </div>
                  <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Profile & Controls Dropdown Menu */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 z-50 animate-fadeIn space-y-2.5">
                    {/* Account Info Header */}
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{user?.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {user?.email || 'admin@erp.com'}
                      </p>
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[9px] font-extrabold uppercase bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded font-mono border border-indigo-500/30">
                          {user?.role || 'ADMIN'}
                        </span>
                        <span className="text-[9px] font-extrabold uppercase bg-purple-500/15 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded font-mono border border-purple-500/30">
                          {activePreset.badge}
                        </span>
                      </div>
                    </div>

                    {/* Settings Actions List */}
                    <div className="space-y-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                      {/* Language Switcher Row */}
                      <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                        <div className="flex items-center space-x-2">
                          <Languages className="w-4 h-4 text-slate-400" />
                          <span>Language</span>
                        </div>
                        <select
                          value={lang}
                          onChange={(e) => setLang(e.target.value)}
                          className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-lg px-2 py-1 focus:outline-none cursor-pointer border border-slate-200 dark:border-slate-700"
                        >
                          <option value="en">English (EN)</option>
                          <option value="hi">हिंदी (Hindi)</option>
                          <option value="hi_en">Hinglish (Hi-En)</option>
                        </select>
                      </div>

                      {/* Theme Switcher Row */}
                      <button
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer"
                      >
                        <div className="flex items-center space-x-2">
                          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
                          <span>{darkMode ? 'Light Theme' : 'Dark Theme'}</span>
                        </div>
                        <span className="text-[10px] font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 font-bold">
                          {darkMode ? 'DARK' : 'LIGHT'}
                        </span>
                      </button>

                      {/* Customize Enterprise Title */}
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onOpenEditEnterpriseModal();
                        }}
                        className="w-full flex items-center space-x-2 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer"
                      >
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span>Edit Enterprise Title</span>
                      </button>

                      {/* Change Industry Preset */}
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onOpenIndustryModal();
                        }}
                        className="w-full flex items-center space-x-2 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer"
                      >
                        <Sliders className="w-4 h-4 text-slate-400" />
                        <span>Switch Industry Preset</span>
                      </button>

                      {/* Reset / Change Password */}
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onOpenResetPasswordModal && onOpenResetPasswordModal();
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-amber-500/10 transition text-left cursor-pointer text-amber-600 dark:text-amber-400"
                      >
                        <div className="flex items-center space-x-2">
                          <KeyRound className="w-4 h-4 text-amber-500" />
                          <span className="font-semibold text-xs">Reset / Change Password</span>
                        </div>
                        <span className="text-[9px] bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded font-mono">
                          PIN
                        </span>
                      </button>
                    </div>

                    {/* Logout Button */}
                    <div className="pt-1 border-t border-slate-200 dark:border-slate-800">
                      <button
                        onClick={logout}
                        className="w-full flex items-center justify-center space-x-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout Account</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE SLIDE-OUT DRAWER OVERLAY */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          ></div>

          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-xs bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col justify-between p-4 z-10 overflow-y-auto">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold">
                    <Factory className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                      Manufacturing ERP
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[170px]">
                      {currentCompanyName}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ERP Module Navigation Links */}
              <div className="space-y-1 mb-5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 px-2">
                  Navigation
                </p>
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-sky-500' },
                  { id: 'ledger', label: 'Party Ledger', icon: BookOpen, color: 'text-amber-500' },
                  { id: 'parties', label: 'Parties / Directory', icon: Users, color: 'text-indigo-500' },
                  { id: 'orders', label: 'Dispatch Orders', icon: ShoppingBag, color: 'text-blue-500' },
                  { id: 'inventory', label: 'Inventory & Stock', icon: Boxes, color: 'text-purple-500' },
                ].map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleMobileNav(item.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <ItemIcon className={`w-4 h-4 ${isActive ? 'text-white' : item.color}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Actions in Drawer */}
              <div className="space-y-2 mb-5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 px-2">
                  Quick Actions
                </p>
                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenPaymentModal('');
                  }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                >
                  <CreditCard className="w-4 h-4 text-emerald-500" />
                  <span>Receive Payment</span>
                </button>

                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenOrderModal();
                  }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20"
                >
                  <ShoppingCart className="w-4 h-4 text-sky-500" />
                  <span>Create Dispatch Invoice</span>
                </button>

                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenInwardModal();
                  }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                >
                  <PackagePlus className="w-4 h-4 text-purple-500" />
                  <span>Inward Raw Material</span>
                </button>
              </div>

              {/* Enterprise Settings */}
              <div className="space-y-2">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 px-2">
                  Enterprise Config
                </p>
                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenEditEnterpriseModal();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>Company Name</span>
                  </span>
                  <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                </button>

                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenIndustryModal();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  <span className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-slate-400" />
                    <span>Industry Preset</span>
                  </span>
                  <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-mono">
                    {activePreset.badge}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenResetPasswordModal && onOpenResetPasswordModal();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                >
                  <span className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-500" />
                    <span>Change Password (पासवर्ड बदलें)</span>
                  </span>
                  <span className="text-[9px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded font-mono">
                    PIN
                  </span>
                </button>
              </div>
            </div>

            {/* Drawer Footer: Theme, Lang, Logout */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5"
                >
                  {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                  <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>

                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl px-2 py-1.5 border border-slate-200 dark:border-slate-700"
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी</option>
                  <option value="hi_en">Hinglish</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center space-x-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 py-2.5 rounded-xl text-xs font-bold transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout ({user?.name || 'Account'})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
