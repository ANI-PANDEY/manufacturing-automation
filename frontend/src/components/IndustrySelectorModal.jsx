import React, { useState } from 'react';
import { X, Sliders, CheckCircle2, Factory, Shirt, Pill, ShoppingBag, Cpu, Sparkles, HelpCircle } from 'lucide-react';
import { useIndustry } from '../context/IndustryContext';

const ICON_MAP = {
  Factory: Factory,
  Shirt: Shirt,
  Pill: Pill,
  ShoppingBag: ShoppingBag,
  Cpu: Cpu,
  Sliders: Sliders,
};

const INDUSTRY_STYLES = {
  manufacturing: {
    accent: 'from-blue-600 to-indigo-600',
    iconBg: 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40',
    badgeBg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    selectedBorder: 'border-blue-500 ring-2 ring-blue-500/30',
  },
  garments: {
    accent: 'from-purple-600 to-pink-600',
    iconBg: 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/40',
    badgeBg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    selectedBorder: 'border-purple-500 ring-2 ring-purple-500/30',
  },
  pharma: {
    accent: 'from-emerald-600 to-teal-600',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40',
    badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    selectedBorder: 'border-emerald-500 ring-2 ring-emerald-500/30',
  },
  retail: {
    accent: 'from-amber-500 to-orange-600',
    iconBg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40',
    badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    selectedBorder: 'border-amber-500 ring-2 ring-amber-500/30',
  },
  electronics: {
    accent: 'from-cyan-600 to-blue-600',
    iconBg: 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/40',
    badgeBg: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
    selectedBorder: 'border-cyan-500 ring-2 ring-cyan-500/30',
  },
  custom: {
    accent: 'from-violet-600 to-rose-600',
    iconBg: 'bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/40',
    badgeBg: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    selectedBorder: 'border-violet-500 ring-2 ring-violet-500/30',
  },
};

const IndustrySelectorModal = ({ isOpen, onClose }) => {
  const { currentIndustryKey, allPresets, selectIndustry, customConfig } = useIndustry();

  const [activeTab, setActiveTab] = useState('presets'); // 'presets' or 'custom'
  const [customForm, setCustomForm] = useState({
    name: customConfig.name || 'Custom Enterprise',
    rawMaterialLabel: customConfig.rawMaterialLabel || 'Raw Inventory Inputs',
    productLabel: customConfig.productLabel || 'Finished Product Catalog',
    inwardButtonLabel: customConfig.inwardButtonLabel || 'Inward Input Stock',
    productButtonLabel: customConfig.productButtonLabel || 'Add Catalog Product',
    badge: customConfig.badge || 'Custom Enterprise',
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSelectPreset = (key) => {
    selectIndustry(key);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const handleSaveCustom = (e) => {
    e.preventDefault();
    selectIndustry('custom', customForm);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with vibrant gradient */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center backdrop-blur-md shadow-md">
              <Sliders className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight leading-tight text-white flex items-center gap-2">
                Industry & Business Customizer
                <span className="bg-white/20 backdrop-blur-md text-[10px] uppercase font-black px-2 py-0.5 rounded-full border border-white/30 text-white">
                  1-Click Adaptive
                </span>
              </h3>
              <p className="text-xs text-blue-100 font-medium">
                Adapt the ERP terminology, batches, and workflow to suit your exact manufacturing sector
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition border border-white/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 px-6 pt-3 space-x-4">
          <button
            onClick={() => setActiveTab('presets')}
            className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'presets'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Industry Presets (Ready to Use)
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'custom'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Custom Labels & Terminology Editor
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4 bg-slate-50/50 dark:bg-slate-950/60">
          {savedSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Industry customization applied successfully! Updating ERP interface...</span>
            </div>
          )}

          {activeTab === 'presets' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {Object.keys(allPresets).map((key) => {
                const preset = allPresets[key];
                const isSelected = currentIndustryKey === key;
                const IconComponent = ICON_MAP[preset.iconName] || Factory;
                const style = INDUSTRY_STYLES[key] || INDUSTRY_STYLES.manufacturing;

                return (
                  <div
                    key={key}
                    onClick={() => handleSelectPreset(key)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between space-y-3 relative overflow-hidden group hover:shadow-md ${
                      isSelected
                        ? `bg-white dark:bg-slate-800 ${style.selectedBorder} shadow-lg shadow-indigo-500/10 dark:shadow-indigo-900/20`
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-105 ${
                            isSelected
                              ? `bg-gradient-to-tr ${style.accent} text-white shadow-md shadow-indigo-500/20 border-transparent`
                              : style.iconBg
                          }`}
                        >
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {preset.name}
                          </h4>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md inline-block mt-0.5 ${style.badgeBg}`}>
                            {preset.badge}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          <CheckCircle2 className="w-3 h-3 text-white" /> ACTIVE
                        </span>
                      )}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/70 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 text-[11px] space-y-1.5">
                      <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                        <span className="text-[10px] uppercase font-bold tracking-wider">Input Section:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-right truncate ml-2">
                          {preset.rawMaterialLabel.split('&')[0].trim()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                        <span className="text-[10px] uppercase font-bold tracking-wider">Output Section:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-right truncate ml-2">
                          {preset.productLabel.split('&')[0].trim()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'custom' && (
            <form onSubmit={handleSaveCustom} className="space-y-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl flex items-center gap-2.5 text-xs text-indigo-700 dark:text-indigo-300">
                <HelpCircle className="w-4 h-4 shrink-0 text-indigo-500" />
                <span>Tailor button captions, section headers, and unit labels to match your company's internal process terminology.</span>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Industry / Business Title
                  </label>
                  <input
                    type="text"
                    value={customForm.name}
                    onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Industry Badge Tag
                  </label>
                  <input
                    type="text"
                    value={customForm.badge}
                    onChange={(e) => setCustomForm({ ...customForm, badge: e.target.value })}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Inward Raw Material Section Title
                  </label>
                  <input
                    type="text"
                    value={customForm.rawMaterialLabel}
                    onChange={(e) => setCustomForm({ ...customForm, rawMaterialLabel: e.target.value })}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Finished Goods Catalog Section Title
                  </label>
                  <input
                    type="text"
                    value={customForm.productLabel}
                    onChange={(e) => setCustomForm({ ...customForm, productLabel: e.target.value })}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Inward Button Text
                  </label>
                  <input
                    type="text"
                    value={customForm.inwardButtonLabel}
                    onChange={(e) => setCustomForm({ ...customForm, inwardButtonLabel: e.target.value })}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Add Product Button Text
                  </label>
                  <input
                    type="text"
                    value={customForm.productButtonLabel}
                    onChange={(e) => setCustomForm({ ...customForm, productButtonLabel: e.target.value })}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/25 transition active:scale-95"
                >
                  Save Custom Industry Layout
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default IndustrySelectorModal;
