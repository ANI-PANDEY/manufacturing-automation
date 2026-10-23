import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ShoppingBag,
  Boxes,
  Plus,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const MobileBottomNav = ({ activeTab, setActiveTab, onOpenPaymentModal, onOpenOrderModal }) => {
  const { t } = useLanguage();

  const navItems = [
    {
      id: 'dashboard',
      label: t('overviewDashboard') || 'Home',
      shortLabel: 'Overview',
      icon: LayoutDashboard,
      activeColor: 'text-sky-500 dark:text-sky-400',
      activeBg: 'bg-sky-500/15',
    },
    {
      id: 'ledger',
      label: t('partyLedger') || 'Ledger',
      shortLabel: 'Ledger',
      icon: BookOpen,
      activeColor: 'text-amber-500 dark:text-amber-400',
      activeBg: 'bg-amber-500/15',
    },
    {
      id: 'parties',
      label: t('partyDirectory') || 'Parties',
      shortLabel: 'Parties',
      icon: Users,
      activeColor: 'text-indigo-500 dark:text-indigo-400',
      activeBg: 'bg-indigo-500/15',
    },
    {
      id: 'orders',
      label: t('dispatchInvoices') || 'Orders',
      shortLabel: 'Orders',
      icon: ShoppingBag,
      activeColor: 'text-blue-500 dark:text-blue-400',
      activeBg: 'bg-blue-500/15',
    },
    {
      id: 'inventory',
      label: t('inventoryStock') || 'Stock',
      shortLabel: 'Stock',
      icon: Boxes,
      activeColor: 'text-purple-500 dark:text-purple-400',
      activeBg: 'bg-purple-500/15',
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-slate-800/90 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.5)] px-2 py-1.5 transition-colors"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative ${
                isActive
                  ? `${item.activeColor} font-black scale-105`
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <div
                className={`w-9 h-7 flex items-center justify-center rounded-lg transition-all ${
                  isActive ? item.activeBg : 'bg-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px]">
                {item.shortLabel}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-current absolute bottom-0 shadow-sm"></span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
