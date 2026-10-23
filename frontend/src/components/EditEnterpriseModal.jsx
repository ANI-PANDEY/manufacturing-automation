import React, { useState, useEffect } from 'react';
import { X, Building2, CheckCircle2, Sparkles, Briefcase, Building, QrCode } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const EditEnterpriseModal = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user?.companyName) {
      setCompanyName(user.companyName);
    } else {
      setCompanyName('Manufacturing ERP Enterprise');
    }

    if (user?.upiId) {
      setUpiId(user.upiId);
    } else {
      setUpiId('enterprise@upi');
    }

    setSuccessMsg('');
    setErrorMsg('');
  }, [user, isOpen]);

  if (!isOpen) return null;

  const presets = [
    'Steel Works',
    'Pvt Ltd',
    'Industries',
    'Enterprises',
    'Trading Co.',
    'Engineering Works',
  ];

  const handleApplyPreset = (preset) => {
    if (!companyName) {
      setCompanyName(preset);
    } else if (!companyName.toLowerCase().includes(preset.toLowerCase())) {
      setCompanyName(`${companyName.trim()} ${preset}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setErrorMsg('Please enter a valid business or enterprise name.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await updateProfile({
      companyName: companyName.trim(),
      upiId: upiId.trim(),
    });
    setSaving(false);

    if (res.success) {
      setSuccessMsg('Enterprise details & UPI Payment ID updated successfully!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setErrorMsg('Failed to update business settings. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden transform transition-all">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 text-white flex items-center justify-between border-b border-indigo-500/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center backdrop-blur-md text-indigo-400 shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight leading-tight text-white">
                Customize Enterprise Settings
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Personalize business name and UPI QR Payment gateway
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800/60 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-extrabold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 font-semibold">
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Your Official Business / Company Name
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-indigo-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Apex Steel & Manufacturing Pvt Ltd"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              This name will appear on top header, PDF passbooks, and printed invoices.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Official Company UPI ID / VPA (For Dynamic QR Payments)
            </label>
            <div className="relative">
              <QrCode className="w-4 h-4 text-purple-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. 9820112345@paytm or company@upi"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Used to generate instant scannable UPI QR codes (GPay, PhonePe, Paytm) on invoices & WhatsApp links.
            </p>
          </div>

          {/* Quick Preset Badges */}
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500" /> Quick Name Suffixes:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 transition"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 transition transform active:scale-95 flex items-center space-x-2"
            >
              {saving ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Briefcase className="w-4 h-4" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEnterpriseModal;
