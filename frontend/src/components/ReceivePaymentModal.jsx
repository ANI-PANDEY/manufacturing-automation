import React, { useState, useEffect } from 'react';
import { X, CreditCard, Calendar, FileText, CheckCircle2, AlertCircle, RefreshCw, Info, HelpCircle } from 'lucide-react';
import { paymentService, orderService, partyService } from '../services/api';
import { formatCurrency } from '../utils/exportUtils';
import { useLanguage } from '../context/LanguageContext';

const ReceivePaymentModal = ({ isOpen, onClose, parties = [], selectedPartyId = '', onSuccess }) => {
  const { t } = useLanguage();

  const [partyId, setPartyId] = useState(selectedPartyId || '');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');
  const [referenceNo, setReferenceNo] = useState('');
  const [allocationType, setAllocationType] = useState('FIFO');
  const [targetOrderId, setTargetOrderId] = useState('');
  const [notes, setNotes] = useState('');

  const [currentParty, setCurrentParty] = useState(null);
  const [openOrders, setOpenOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (selectedPartyId) {
      setPartyId(selectedPartyId);
    }
  }, [selectedPartyId]);

  useEffect(() => {
    if (!partyId) {
      setCurrentParty(null);
      setOpenOrders([]);
      return;
    }

    const fetchPartyDetails = async () => {
      try {
        const partyRes = await partyService.getById(partyId);
        if (partyRes.data?.success) {
          setCurrentParty(partyRes.data.party);
        }

        const ordersRes = await orderService.getAll({ partyId, paymentStatus: 'UNPAID' });
        const ordersResPartial = await orderService.getAll({ partyId, paymentStatus: 'PARTIAL' });

        const combined = [...(ordersRes.data?.orders || []), ...(ordersResPartial.data?.orders || [])];
        combined.sort((a, b) => new Date(a.orderDate) - new Date(b.orderDate));
        setOpenOrders(combined);
      } catch (err) {
        console.error('Error fetching party orders:', err);
      }
    };

    fetchPartyDetails();
  }, [partyId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!partyId) {
      setError('Please select a Party/Customer');
      return;
    }

    if (!amountPaid || Number(amountPaid) <= 0) {
      setError('Please enter a valid payment amount greater than ₹0');
      return;
    }

    if (allocationType === 'SPECIFIC_ORDER' && !targetOrderId) {
      setError('Please select a specific order from the dropdown');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        partyId,
        paymentDate,
        amountPaid: Number(amountPaid),
        paymentMode,
        referenceNo,
        allocationType,
        targetOrderId: allocationType === 'SPECIFIC_ORDER' ? targetOrderId : undefined,
        notes,
      };

      const res = await paymentService.receive(payload);
      if (res.data?.success) {
        setAmountPaid('');
        setReferenceNo('');
        setNotes('');
        onSuccess && onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const currentBal = currentParty?.currentBalance || 0;
  const payAmt = Number(amountPaid) || 0;
  const newOutstandingBalance = currentBal - payAmt;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-500/20 bg-gradient-to-r from-slate-900 via-emerald-950/50 to-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">{t('modalReceiveTitle')}</h3>
              <p className="text-xs text-slate-300">{t('modalReceiveDesc')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800/60 p-2 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-5">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl p-3.5 flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Select Customer */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>{t('selectCustomerLabel')} <span className="text-rose-500">*</span></span>
            </label>
            <select
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              required
            >
              <option value="">-- Choose Party --</option>
              {parties.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} (Due: {formatCurrency(p.currentBalance)})
                </option>
              ))}
            </select>
          </div>

          {/* Interactive Balance Calculator Snapshot */}
          {currentParty && (
            <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center space-x-1.5">
                  <Info className="w-4 h-4 text-emerald-500" />
                  <span>Passbook Balance Preview</span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-200 dark:border-slate-800">
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[10px] text-slate-400 block font-medium">{t('beforePayment')}</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {formatCurrency(currentBal)}
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold">{t('payingNow')}</span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatCurrency(payAmt)}
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-bold">{t('remainingDue')}</span>
                  <span className={`text-xs font-black font-mono ${newOutstandingBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {formatCurrency(newOutstandingBalance)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Payment Date & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t('paymentDateLabel')}</span>
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-mono rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('amountReceivedLabel')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 50000"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-mono font-bold rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                required
              />
            </div>
          </div>

          {/* Step 3: Payment Mode & Reference Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('paymentModeLabel')}</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              >
                <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS)</option>
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('refNumberLabel')}
              </label>
              <input
                type="text"
                placeholder="e.g. UTR98231019 or Cheque #000124"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          {/* Step 4: Settlement Strategy Switcher */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('settlementMethodLabel')}
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAllocationType('FIFO')}
                className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                  allocationType === 'FIFO'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-400 dark:border-emerald-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">{t('fifoRecommended')}</span>
                  {allocationType === 'FIFO' && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                </div>
                <p className={`text-[10px] leading-tight ${allocationType === 'FIFO' ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'}`}>
                  {t('fifoDesc')}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAllocationType('SPECIFIC_ORDER')}
                className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                  allocationType === 'SPECIFIC_ORDER'
                    ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-200 border-sky-400 dark:border-sky-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">{t('specificInvoice')}</span>
                  {allocationType === 'SPECIFIC_ORDER' && <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
                </div>
                <p className={`text-[10px] leading-tight ${allocationType === 'SPECIFIC_ORDER' ? 'text-sky-700 dark:text-sky-300' : 'text-slate-400'}`}>
                  {t('specificInvoiceDesc')}
                </p>
              </button>
            </div>

            {allocationType === 'SPECIFIC_ORDER' && (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Invoice <span className="text-rose-500">*</span>
                </label>
                {openOrders.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    No pending unpaid invoices found for this party.
                  </p>
                ) : (
                  <select
                    value={targetOrderId}
                    onChange={(e) => setTargetOrderId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                  >
                    <option value="">-- Choose Invoice --</option>
                    {openOrders.map((o) => (
                      <option key={o._id} value={o._id}>
                        {o.orderNumber} | Date: {new Date(o.orderDate).toLocaleDateString('en-IN')} | Due: {formatCurrency(o.balanceDue)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Payment Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('paymentRemarks')}</label>
            <input
              type="text"
              placeholder="e.g. Paid via GPay / Online Transfer"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>{t('savePaymentBtn')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReceivePaymentModal;
