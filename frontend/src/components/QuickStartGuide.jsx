import React, { useState } from 'react';
import { HelpCircle, ChevronRight, Users, PackagePlus, ShoppingCart, CreditCard, X, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const QuickStartGuide = ({ onNavigate }) => {
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const steps = [
    {
      step: '1',
      title: t('step1Title'),
      desc: t('step1Desc'),
      icon: Users,
      color: 'text-sky-500 dark:text-sky-400',
      bgColor: 'bg-sky-50 hover:bg-sky-100/80 dark:bg-sky-950/30 dark:hover:bg-sky-900/40',
      borderColor: 'border-sky-200 dark:border-sky-800/60',
      badgeBg: 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-300 dark:border-sky-700/60',
      tab: 'parties',
    },
    {
      step: '2',
      title: t('step2Title'),
      desc: t('step2Desc'),
      icon: PackagePlus,
      color: 'text-purple-500 dark:text-purple-400',
      bgColor: 'bg-purple-50 hover:bg-purple-100/80 dark:bg-purple-950/30 dark:hover:bg-purple-900/40',
      borderColor: 'border-purple-200 dark:border-purple-800/60',
      badgeBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-300 dark:border-purple-700/60',
      tab: 'inventory',
    },
    {
      step: '3',
      title: t('step3Title'),
      desc: t('step3Desc'),
      icon: ShoppingCart,
      color: 'text-blue-500 dark:text-blue-400',
      bgColor: 'bg-blue-50 hover:bg-blue-100/80 dark:bg-blue-950/30 dark:hover:bg-blue-900/40',
      borderColor: 'border-blue-200 dark:border-blue-800/60',
      badgeBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-300 dark:border-blue-700/60',
      tab: 'orders',
    },
    {
      step: '4',
      title: t('step4Title'),
      desc: t('step4Desc'),
      icon: CreditCard,
      color: 'text-emerald-500 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40',
      borderColor: 'border-emerald-200 dark:border-emerald-800/60',
      badgeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60',
      tab: 'ledger',
    },
  ];

  return (
    <div className="bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-sky-500/5 dark:from-slate-900 dark:via-slate-900/90 dark:to-indigo-950/30 border border-indigo-200/60 dark:border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden text-slate-800 dark:text-slate-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-md shadow-indigo-500/25">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{t('quickGuideTitle')}</span>
              <span className="text-[10px] font-extrabold uppercase bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/30">
                Workflow
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('quickGuideSubtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 transition text-xs flex items-center space-x-1"
        >
          <span>Hide</span>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.step}
              onClick={() => onNavigate && onNavigate(item.tab)}
              className={`p-3.5 rounded-2xl border ${item.borderColor} ${item.bgColor} transition cursor-pointer group flex flex-col justify-between shadow-sm hover:shadow-md transform hover:-translate-y-0.5 duration-150`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`w-5 h-5 rounded-full border text-[11px] font-black flex items-center justify-center ${item.badgeBg}`}>
                      {item.step}
                    </span>
                    <Icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition transform group-hover:translate-x-0.5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-white transition">
                  {item.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                  {item.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuickStartGuide;
