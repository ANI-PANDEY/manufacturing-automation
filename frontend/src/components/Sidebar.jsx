import React from 'react';
import { LayoutDashboard, BookOpen, Users, ShoppingBag, Boxes, Database } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { t } = useLanguage();

  const menuItems = [
    { id: 'dashboard', label: t('overviewDashboard'), icon: LayoutDashboard, shortcut: 'Alt+1', color: 'text-indigo-400' },
    { id: 'ledger', label: t('partyLedger'), icon: BookOpen, badge: t('reconcileBadge'), shortcut: 'Alt+2', color: 'text-amber-400' },
    { id: 'parties', label: t('partyDirectory'), icon: Users, shortcut: 'Alt+3', color: 'text-sky-400' },
    { id: 'orders', label: t('dispatchInvoices'), icon: ShoppingBag, shortcut: 'Alt+4', color: 'text-blue-400' },
    { id: 'inventory', label: t('inventoryStock'), icon: Boxes, shortcut: 'Alt+5', color: 'text-purple-400' },
    { id: 'migration', label: 'Old Data Migration', icon: Database, badge: 'Excel / Khata', shortcut: 'Alt+6', color: 'text-emerald-400' },
  ];

  return (
    <aside className="w-64 bg-white/70 dark:bg-slate-950/80 backdrop-blur-md border-r border-slate-200 dark:border-slate-800/80 shrink-0 hidden md:flex flex-col justify-between transition-colors duration-200">
      <div className="p-4">
        <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-3">
          Core ERP Modules
        </h2>
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={`Open ${item.label} (${item.shortcut})`}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/50 scale-[1.02]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/80 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-white' : item.color}`} />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  {item.badge && (
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                      isActive 
                        ? 'bg-indigo-900/80 text-indigo-100 border-indigo-400/40' 
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  <kbd className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                    isActive 
                      ? 'bg-indigo-800/80 text-indigo-100 border-indigo-400/30'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'
                  }`}>
                    {item.shortcut}
                  </kbd>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800/80">
        <div className="bg-gradient-to-br from-indigo-500/10 via-slate-50 dark:via-slate-900/90 to-purple-500/10 rounded-2xl p-3.5 border border-indigo-200/50 dark:border-indigo-900/40 space-y-1.5 shadow-sm">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50"></span>
            <span>ACID Ledger Engine</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            Real-time balance syncing & instant passbook statements.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
