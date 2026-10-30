import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Calendar,
  AlertCircle,
  RefreshCw,
  Trash2,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { paymentService } from '../services/api';
import { formatCurrency } from '../utils/exportUtils';

const EditPaymentModal = ({
  isOpen,
  onClose,
  paymentData,
  partyName = '',
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');

  const [paymentId, setPaymentId] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [originalAmount, setOriginalAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (paymentData) {
      const id = paymentData._id || paymentData.id || paymentData.receiptNumber || paymentData.refNo;
      setPaymentId(id || '');
      setReceiptNumber(paymentData.receiptNumber || paymentData.refNo || paymentData.referenceId || '');

      const d = paymentData.paymentDate || paymentData.date;
      if (d) {
        try {
          setPaymentDate(new Date(d).toISOString().split('T')[0]);
        } catch (e) {
          setPaymentDate(new Date().toISOString().split('T')[0]);
        }
      } else {
        setPaymentDate(new Date().toISOString().split('T')[0]);
      }

      const rawAmt = paymentData.amountPaid !== undefined
        ? paymentData.amountPaid
        : paymentData.credit !== undefined
        ? paymentData.credit
        : paymentData.amount || 0;

      setAmountPaid(rawAmt);
      setOriginalAmount(Number(rawAmt) || 0);

      setPaymentMode(
        paymentData.paymentMode
          ? String(paymentData.paymentMode).toUpperCase()
          : 'BANK_TRANSFER'
      );
      setReferenceNo(paymentData.referenceNo || paymentData.referenceId || '');
      setNotes(paymentData.notes || '');
      setError('');
      setShowDeleteConfirm(false);

      // If missing details, fetch from API
      if (id) {
        paymentService.getById(id)
          .then((res) => {
            if (res.data?.success && res.data.payment) {
              const p = res.data.payment;
              setReceiptNumber(p.receiptNumber || id);
              if (p.paymentDate) {
                setPaymentDate(new Date(p.paymentDate).toISOString().split('T')[0]);
              }
              const amt = p.amountPaid !== undefined ? p.amountPaid : p.credit || rawAmt;
              setAmountPaid(amt);
              setOriginalAmount(Number(amt) || 0);
              if (p.paymentMode) setPaymentMode(String(p.paymentMode).toUpperCase());
              if (p.referenceNo) setReferenceNo(p.referenceNo);
              if (p.notes) setNotes(p.notes);
            }
          })
          .catch(() => {});
      }
    }
  }, [paymentData, isOpen]);

  if (!isOpen || !paymentData) return null;

  const currentParsedAmt = Number(amountPaid) || 0;
  const difference = currentParsedAmt - originalAmount;

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');

    if (!amountPaid || Number(amountPaid) <= 0) {
      setError('Please enter a valid payment amount greater than ₹0');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        amountPaid: Number(amountPaid),
        paymentDate,
        paymentMode,
        referenceNo,
        notes,
      };

      const res = await paymentService.update(paymentId, payload);
      if (res.data?.success) {
        onSuccess && onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      console.error('Error updating payment:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update payment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      setError('');
      const res = await paymentService.delete(paymentId);
      if (res.data?.success) {
        onSuccess && onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      console.error('Error deleting payment:', err);
      setError(err.response?.data?.message || err.message || 'Failed to delete payment');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-500/20 bg-gradient-to-r from-slate-900 via-emerald-950/50 to-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-white">Edit Received Payment</h3>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {receiptNumber || 'RCP-EDIT'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {partyName ? `Party: ${partyName}` : 'Correct payment details & synchronize Bahi-Khata ledger'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800/60 p-2 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleUpdate} className="p-6 overflow-y-auto custom-scrollbar space-y-4">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl p-3.5 flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Delete confirmation banner */}
          {showDeleteConfirm && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700 p-4 rounded-2xl space-y-3">
              <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-300 text-xs font-bold">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <span>Confirm Payment Deletion (क्या आप सचमुच यह भुगतान हटाना चाहते हैं?)</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Deleting this payment of {formatCurrency(originalAmount)} will restore the customer's balance by {formatCurrency(originalAmount)}. This action cannot be undone.
              </p>
              <div className="flex items-center space-x-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 transition flex items-center space-x-1.5 shadow-sm"
                >
                  {deleteLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Yes, Delete Payment</span>
                </button>
              </div>
            </div>
          )}

          {/* Date & Payment Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Payment Date (भुगतान तारीख)
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Payment Mode (माध्यम)
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
                <option value="UPI">UPI (GPay, PhonePe, Paytm)</option>
                <option value="CASH">Cash (नकद रोकड़)</option>
                <option value="CHEQUE">Cheque (बैंक चेक)</option>
              </select>
            </div>
          </div>

          {/* Amount Paid with Live Delta preview */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Payment Amount Received (₹ प्राप्त रकम)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-black text-emerald-600 dark:text-emerald-400">₹</span>
              <input
                type="number"
                min="0.01"
                step="any"
                placeholder="0.00"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-700/80 rounded-xl pl-8 pr-3 py-2 text-sm text-slate-900 dark:text-white font-mono font-black focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            {/* Delta explanation pill */}
            {difference !== 0 && (
              <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-mono">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Original: {formatCurrency(originalAmount)} → New: {formatCurrency(currentParsedAmt)}
                </span>
                <span className={`font-black text-xs ${difference > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {difference > 0 ? `Due reduces by -${formatCurrency(difference)}` : `Due increases by +${formatCurrency(Math.abs(difference))}`}
                </span>
              </div>
            )}
          </div>

          {/* Reference No / UTR */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Reference / UTR / Cheque No. (हवाला / चेक नंबर)
            </label>
            <input
              type="text"
              placeholder="e.g. UTR-98213812, Cheque #40102"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Remarks / Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Remarks / Notes (टिप्पणी / विवरण)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Correction made after monthly bank statement reconciliation"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Payment</span>
              </button>
            ) : <div />}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/25 transition transform active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Update Payment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPaymentModal;
