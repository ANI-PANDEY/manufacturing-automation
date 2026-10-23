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
  UserCheck,
  Sparkles,
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
}) => {
  const { lang, setLang, t } = useLanguage();
  const { user, logout } = useAuth();
  const { activePreset } = useIndustry();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentCompanyName = user?.companyName || 'Manufacturing ERP Enterprise';

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 sticky top-0 z-30 shadow-sm font-sans transition-colors duration-200">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* LEFT: Logo & Unified Enterprise/Industry Pill */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0 font-black">
              <Factory className="w-5 h-5 text-white" />
            </div>

            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                {t('appTitle')}
              </span>

              {/* Unified Enterprise & Industry Pill */}
              <button
                onClick={onOpenEditEnterpriseModal}
                title="Click to manage Company Name & Industry Settings"
                className="group inline-flex items-center space-x-2 bg-indigo-50 hover:bg-indigo-100/80 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 text-xs font-bold px-3 py-1.5 rounded-full border border-indigo-200/80 dark:border-indigo-800/60 transition max-w-[200px] sm:max-w-[320px] shadow-sm"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="truncate">{currentCompanyName}</span>
                <span className="text-[10px] bg-indigo-600 text-white dark:bg-indigo-500/30 dark:text-indigo-300 font-extrabold px-2 py-0.5 rounded-full shrink-0 hidden sm:inline-block border border-indigo-500/30">
                  {activePreset.badge}
                </span>
                <Edit3 className="w-3 h-3 text-indigo-400 opacity-70 group-hover:opacity-100 shrink-0 transition" />
              </button>
            </div>
          </div>

          {/* CENTER: Main ERP Quick Actions */}
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
              onClick={onOpenPaymentModal}
              title="Receive Payment (Alt + P)"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-1.5 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/25 transition transform active:scale-95"
            >
              <CreditCard className="w-4 h-4 text-white" />
              <span>{t('receivePayment')}</span>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-700/80 text-emerald-100 border border-emerald-400/30 ml-1 font-bold">
                Alt+P
              </kbd>
            </button>
          </div>

          {/* RIGHT: Responsive Actions & Unified Profile Menu */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Quick Action Button for Mobile/Tablet */}
            <button
              onClick={onOpenOrderModal}
              className="lg:hidden p-2 rounded-xl bg-sky-600 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-sky-600/20"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Dispatch</span>
            </button>

            {/* Unified User Profile & System Controls Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 sm:px-3 sm:py-1.5 transition text-left"
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
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {/* Profile & Controls Dropdown Menu */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 z-50 animate-fadeIn space-y-2.5">
                  {/* Account Info Header */}
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{user?.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email || 'admin@erp.com'}</p>
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
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
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
                      className="w-full flex items-center space-x-2 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
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
                      className="w-full flex items-center space-x-2 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
                    >
                      <Sliders className="w-4 h-4 text-slate-400" />
                      <span>Switch Industry Preset</span>
                    </button>
                  </div>

                  {/* Logout Button */}
                  <div className="pt-1 border-t border-slate-200 dark:border-slate-800">
                    <button
                      onClick={logout}
                      className="w-full flex items-center justify-center space-x-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 py-2 rounded-xl text-xs font-bold transition"
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
  );
};

export default Navbar;
