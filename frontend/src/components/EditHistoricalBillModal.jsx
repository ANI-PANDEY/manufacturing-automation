import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Calendar,
  AlertCircle,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Plus,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { historicalBillService } from '../services/api';
import { formatCurrency } from '../utils/exportUtils';

const EditHistoricalBillModal = ({
  isOpen,
  onClose,
  billData,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');

  const [billId, setBillId] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState('');
  const [partyName, setPartyName] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentReceived, setPaymentReceived] = useState(0);

  // Line items
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (billData) {
      const id = billData._id || billData.billId || billData.billNumber || billData.refNo;
      setBillId(id || '');
      setBillNumber(billData.billNumber || billData.refNo || '');
      setPartyName(billData.party?.name || billData.partyName || '');

      const d = billData.date || billData.billDate;
      if (d) {
        try {
          setBillDate(new Date(d).toISOString().split('T')[0]);
        } catch (e) {
          setBillDate(new Date().toISOString().split('T')[0]);
        }
      } else {
        setBillDate(new Date().toISOString().split('T')[0]);
      }

      setPaymentReceived(billData.paymentReceived !== undefined ? billData.paymentReceived : 0);
      setNotes(billData.notes || '');
      setError('');
      setShowDeleteConfirm(false);

      if (Array.isArray(billData.items) && billData.items.length > 0) {
        setItems(
          billData.items.map((it, idx) => ({
            id: it._id || idx + 1,
            description: it.description || it.particulars || '',
            bags: it.bags !== undefined ? it.bags : '',
            qtyPerBag: it.qtyPerBag !== undefined ? it.qtyPerBag : '',
            totalWeight: it.totalWeight !== undefined ? it.totalWeight : '',
            rate: it.rate !== undefined ? it.rate : '',
            amount: it.amount || 0,
          }))
        );
      } else {
        // Fallback default row
        setItems([
          {
            id: 1,
            description: billData.notes || 'Goods Invoiced',
            bags: '',
            qtyPerBag: '',
            totalWeight: 1,
            rate: billData.debit || billData.subTotal || 0,
            amount: billData.debit || billData.subTotal || 0,
          },
        ]);
      }

      // Fetch full bill data by ID or billNumber to ensure all line items are loaded
      if (id) {
        historicalBillService.getById(id)
          .then((res) => {
            if (res.data?.success && res.data.bill) {
              const b = res.data.bill;
              setBillId(b._id || id);
              setBillNumber(b.billNumber || billData.billNumber || '');
              if (b.partyId?.name) setPartyName(b.partyId.name);
              if (b.date) {
                setBillDate(new Date(b.date).toISOString().split('T')[0]);
              }
              setPaymentReceived(b.paymentReceived !== undefined ? b.paymentReceived : 0);
              if (b.notes) setNotes(b.notes);
              if (Array.isArray(b.items) && b.items.length > 0) {
                setItems(
                  b.items.map((it, idx) => ({
                    id: it._id || idx + 1,
                    description: it.description || '',
                    bags: it.bags !== undefined ? it.bags : '',
                    qtyPerBag: it.qtyPerBag !== undefined ? it.qtyPerBag : '',
                    totalWeight: it.totalWeight !== undefined ? it.totalWeight : '',
                    rate: it.rate !== undefined ? it.rate : '',
                    amount: it.amount || 0,
                  }))
                );
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [billData, isOpen]);

  if (!isOpen || !billData) return null;

  // Handle cell edits in item table
  const handleUpdateItem = (itemId, field, value) => {
    setItems((prev) =>
      prev.map((row) => {
        if (row.id !== itemId) return row;
        const updated = { ...row, [field]: value };

        const bags = Number(updated.bags) || 0;
        const qtyPerBag = Number(updated.qtyPerBag) || 0;

        let totalWeight = Number(updated.totalWeight) || 0;
        if (field === 'bags' || field === 'qtyPerBag') {
          if (bags > 0 && qtyPerBag > 0) {
            totalWeight = Math.round((bags * qtyPerBag + Number.EPSILON) * 100) / 100;
            updated.totalWeight = totalWeight;
          }
        }

        const rate = Number(updated.rate) || 0;
        if (totalWeight > 0 && rate > 0) {
          updated.amount = Math.round((totalWeight * rate + Number.EPSILON) * 100) / 100;
        } else if (field === 'amount') {
          updated.amount = Number(value) || 0;
        }

        return updated;
      })
    );
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        description: '',
        bags: '',
        qtyPerBag: '',
        totalWeight: '',
        rate: '',
        amount: 0,
      },
    ]);
  };

  const handleRemoveItem = (itemId) => {
    if (items.length <= 1) {
      setError('At least one line item is required in the bill');
      return;
    }
    setItems((prev) => prev.filter((r) => r.id !== itemId));
  };

  // Calculations
  const totalBags = items.reduce((sum, r) => sum + (Number(r.bags) || 0), 0);
  const totalWeight = Math.round((items.reduce((sum, r) => sum + (Number(r.totalWeight) || 0), 0) + Number.EPSILON) * 100) / 100;
  const grandTotalAmount = Math.round((items.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) + Number.EPSILON) * 100) / 100;
  const payRec = Math.min(Number(paymentReceived) || 0, grandTotalAmount);
  const netBalanceDue = Math.round((Math.max(0, grandTotalAmount - payRec) + Number.EPSILON) * 100) / 100;

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');

    if (!billNumber.trim()) {
      setError('Bill / Invoice number cannot be empty');
      return;
    }

    if (grandTotalAmount <= 0) {
      setError('Please provide at least one valid line item with rate and amount > ₹0');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        billNumber: billNumber.trim(),
        date: billDate,
        items: items.map((it) => ({
          description: it.description || 'Goods Invoiced',
          bags: Number(it.bags) || 0,
          qtyPerBag: Number(it.qtyPerBag) || 0,
          totalWeight: Number(it.totalWeight) || 1,
          rate: Number(it.rate) || 0,
          amount: Number(it.amount) || 0,
        })),
        subTotal: grandTotalAmount,
        paymentReceived: payRec,
        balanceDue: netBalanceDue,
        notes,
      };

      const res = await historicalBillService.update(billId || billNumber, payload);
      if (res.data?.success) {
        onSuccess && onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      console.error('Error updating historical bill:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update historical bill');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      setError('');
      const res = await historicalBillService.delete(billId || billNumber);
      if (res.data?.success) {
        onSuccess && onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      console.error('Error deleting historical bill:', err);
      setError(err.response?.data?.message || err.message || 'Failed to delete historical bill');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-500/20 bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-white">Edit Past Invoice / Historical Bill</h3>
                <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  #{billNumber || 'HB-EDIT'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {partyName ? `Party: ${partyName}` : 'Correct line items, rates, and historical payment adjustments'}
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
        <form onSubmit={handleUpdate} className="p-6 overflow-y-auto custom-scrollbar space-y-5">
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
                <span>Confirm Historical Bill Deletion (क्या आप सचमुच यह बिल हटाना चाहते हैं?)</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Deleting this bill will remove it from the party's passbook and reduce the pending due balance by {formatCurrency(netBalanceDue)}. This cannot be undone.
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
                  <span>Yes, Delete Historical Bill</span>
                </button>
              </div>
            </div>
          )}

          {/* Top metadata grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Bill / Invoice Number (बिल संख्या)
              </label>
              <input
                type="text"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Bill Date (बिल तारीख)
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Itemized Line Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Itemized Line Items (सामान व वजन विवरण)
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {items.length} Item(s)
              </span>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[700px] text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-extrabold border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2.5 px-3">Description / Item</th>
                    <th className="py-2.5 px-3 w-20 text-center">Bags</th>
                    <th className="py-2.5 px-3 w-28 text-center">Qty/Bag (kg)</th>
                    <th className="py-2.5 px-3 w-28 text-right">Total Wt (kg)</th>
                    <th className="py-2.5 px-3 w-28 text-right">Rate (₹/kg)</th>
                    <th className="py-2.5 px-3 w-32 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-2 w-12 text-center">Del</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      {/* Description */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          placeholder="e.g. Steel Pipe 50mm"
                          value={row.description}
                          onChange={(e) => handleUpdateItem(row.id, 'description', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </td>

                      {/* Bags */}
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={row.bags}
                          onChange={(e) => handleUpdateItem(row.id, 'bags', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-center text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </td>

                      {/* Qty/Bag */}
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={row.qtyPerBag}
                          onChange={(e) => handleUpdateItem(row.id, 'qtyPerBag', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-center text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </td>

                      {/* Total Weight */}
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={row.totalWeight}
                          onChange={(e) => handleUpdateItem(row.id, 'totalWeight', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-right text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </td>

                      {/* Rate */}
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0.00"
                          value={row.rate}
                          onChange={(e) => handleUpdateItem(row.id, 'rate', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-right text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </td>

                      {/* Amount */}
                      <td className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                        {formatCurrency(row.amount)}
                      </td>

                      {/* Delete item */}
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(row.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Line Item</span>
            </button>
          </div>

          {/* Real-time Calculation Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase block">Total Weight</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {totalBags > 0 ? `${totalBags} Bags / ` : ''}{totalWeight} kg
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase block">Subtotal</span>
              <span className="font-black text-slate-900 dark:text-white">{formatCurrency(grandTotalAmount)}</span>
            </div>

            <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase block">Paid at Bill Time (₹)</span>
              <input
                type="number"
                min="0"
                step="any"
                value={paymentReceived}
                onChange={(e) => setPaymentReceived(e.target.value)}
                className="w-full bg-transparent font-black text-emerald-700 dark:text-emerald-400 text-xs focus:outline-none"
              />
            </div>

            <div className="bg-amber-50/60 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800">
              <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase block">Net Balance Due</span>
              <span className="font-black text-amber-700 dark:text-amber-400">{formatCurrency(netBalanceDue)}</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Notes / Correction Reason (विवरण)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Corrected line item weight and recorded past advance payment"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                <span>Delete Bill</span>
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
                className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/25 transition transform active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Update & Sync Ledger</span>
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

export default EditHistoricalBillModal;
