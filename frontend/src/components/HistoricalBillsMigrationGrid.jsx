import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Calendar,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ClipboardPaste,
  Printer,
  Pencil,
  Eye,
  ArrowRight,
  BookOpen,
  User,
  ShoppingBag,
} from 'lucide-react';
import { migrationService, historicalBillService, partyService } from '../services/api';
import { formatCurrency } from '../utils/exportUtils';
import HistoricalBillPrintModal from './HistoricalBillPrintModal';
import EditHistoricalBillModal from './EditHistoricalBillModal';

/**
 * HistoricalBillsMigrationGrid
 * Itemized Historical Bills & Orders Entry module for migrating pen-and-paper registers.
 * Columns: Date, Particulars/Description, Bags, Qty/Bag (kg), Total Weight (kg), Rate (₹/kg), Bill Total (₹), Payment Received (₹), Action.
 */
const HistoricalBillsMigrationGrid = ({
  parties = [],
  selectedPartyId: initialPartyId = '',
  onSuccess,
  onCancel,
}) => {
  const [selectedPartyId, setSelectedPartyId] = useState(initialPartyId || '');
  const [customPartyName, setCustomPartyName] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Itemized line rows
  const [rows, setRows] = useState([
    {
      id: 1,
      date: new Date().toISOString().split('T')[0],
      description: 'Steel Cast Components 50mm',
      bags: 20,
      qtyPerBag: 25,
      totalWeight: 500,
      rate: 85,
      amount: 42500,
      paymentReceived: 20000,
    },
    {
      id: 2,
      date: new Date().toISOString().split('T')[0],
      description: 'Industrial Flanges Grade A',
      bags: 10,
      qtyPerBag: 50,
      totalWeight: 500,
      rate: 110,
      amount: 55000,
      paymentReceived: 0,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successReport, setSuccessReport] = useState(null);

  // Print modal state
  const [previewBill, setPreviewBill] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Edit modal state
  const [editingBill, setEditingBill] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Past saved bills history for current party
  const [partyBills, setPartyBills] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (initialPartyId) {
      setSelectedPartyId(initialPartyId);
    } else if (parties.length > 0 && !selectedPartyId) {
      setSelectedPartyId(parties[0]._id || parties[0].id);
    }
  }, [initialPartyId, parties]);

  useEffect(() => {
    if (selectedPartyId) {
      fetchPartyBillsHistory(selectedPartyId);
    }
  }, [selectedPartyId]);

  const fetchPartyBillsHistory = async (partyId) => {
    try {
      setLoadingHistory(true);
      const res = await historicalBillService.getByParty(partyId);
      if (res.data?.success) {
        setPartyBills(res.data.bills || []);
      }
    } catch (e) {
      console.warn('Could not load prior historical bills:', e.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Add Row
  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        date: new Date().toISOString().split('T')[0],
        description: '',
        bags: '',
        qtyPerBag: '',
        totalWeight: '',
        rate: '',
        amount: 0,
        paymentReceived: 0,
      },
    ]);
  };

  // Remove Row
  const handleRemoveRow = (id) => {
    if (rows.length === 1) {
      setRows([
        {
          id: Date.now(),
          date: new Date().toISOString().split('T')[0],
          description: '',
          bags: '',
          qtyPerBag: '',
          totalWeight: '',
          rate: '',
          amount: 0,
          paymentReceived: 0,
        },
      ]);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Handle cell updates with auto-computation
  const handleUpdateRow = (id, field, value) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;

        const updated = { ...r, [field]: value };

        const bagsNum = Number(field === 'bags' ? value : updated.bags) || 0;
        const qtyPerBagNum = Number(field === 'qtyPerBag' ? value : updated.qtyPerBag) || 0;

        // Auto calculate totalWeight if bags and qtyPerBag provided
        if (field === 'bags' || field === 'qtyPerBag') {
          if (bagsNum > 0 && qtyPerBagNum > 0) {
            updated.totalWeight = Math.round((bagsNum * qtyPerBagNum + Number.EPSILON) * 100) / 100;
          }
        }

        const currentWeight = Number(field === 'totalWeight' ? value : updated.totalWeight) || 0;
        const currentRate = Number(field === 'rate' ? value : updated.rate) || 0;

        // Auto compute amount = totalWeight * rate
        updated.amount = Math.round((currentWeight * currentRate + Number.EPSILON) * 100) / 100;

        return updated;
      })
    );
  };

  // Populate sample registers
  const handleLoadSample = () => {
    setRows([
      {
        id: 201,
        date: new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0],
        description: 'TMT Steel Rods 12mm Fe550D',
        bags: 40,
        qtyPerBag: 25,
        totalWeight: 1000,
        rate: 68,
        amount: 68000,
        paymentReceived: 40000,
      },
      {
        id: 202,
        date: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
        description: 'Galvanized Binding Wire 18 Gauge',
        bags: 25,
        qtyPerBag: 20,
        totalWeight: 500,
        rate: 92,
        amount: 46000,
        paymentReceived: 20000,
      },
      {
        id: 203,
        date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
        description: 'Industrial Fasteners & Hex Bolts',
        bags: 10,
        qtyPerBag: 50,
        totalWeight: 500,
        rate: 135,
        amount: 67500,
        paymentReceived: 0,
      },
    ]);
    setNotes('Historical bills migrated from old sales khatabook / dispatch notebook');
  };

  // Paste from clipboard
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) return;

      const lines = text.trim().split(/\r?\n/);
      const parsed = lines.map((line, idx) => {
        const parts = line.split(/\t|,/);
        const desc = parts[0]?.trim() || 'Item';
        const bags = Number(parts[1]?.replace(/[^0-9.]/g, '')) || 0;
        const qtyPerBag = Number(parts[2]?.replace(/[^0-9.]/g, '')) || 0;
        const totalWeight = bags > 0 && qtyPerBag > 0 ? bags * qtyPerBag : Number(parts[3]?.replace(/[^0-9.]/g, '')) || bags || 1;
        const rate = Number(parts[4]?.replace(/[^0-9.]/g, '')) || 0;
        const paymentReceived = Number(parts[5]?.replace(/[^0-9.]/g, '')) || 0;
        return {
          id: Date.now() + idx,
          date: new Date().toISOString().split('T')[0],
          description: desc,
          bags,
          qtyPerBag,
          totalWeight,
          rate,
          amount: Math.round((totalWeight * rate + Number.EPSILON) * 100) / 100,
          paymentReceived,
        };
      });

      if (parsed.length > 0) {
        setRows(parsed);
      }
    } catch (e) {
      setErrorMsg('Could not read clipboard. Please enter row values manually.');
    }
  };

  // Grand summary computations
  const totalBags = rows.reduce((acc, r) => acc + (Number(r.bags) || 0), 0);
  const totalWeight = Math.round((rows.reduce((acc, r) => acc + (Number(r.totalWeight) || 0), 0) + Number.EPSILON) * 100) / 100;
  const grandTotalAmount = Math.round((rows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0) + Number.EPSILON) * 100) / 100;
  const totalPaymentReceived = Math.round((rows.reduce((acc, r) => acc + (Number(r.paymentReceived) || 0), 0) + Number.EPSILON) * 100) / 100;
  const netBalanceDue = Math.round((Math.max(0, grandTotalAmount - totalPaymentReceived) + Number.EPSILON) * 100) / 100;

  // Submit to backend API
  const handleSaveAndSync = async () => {
    setErrorMsg('');
    setSuccessReport(null);

    let partyId = selectedPartyId;
    if (!partyId && !customPartyName.trim()) {
      setErrorMsg('Please select an existing customer or enter a customer name.');
      return;
    }

    const validRows = rows.filter((r) => r.description.trim().length > 0 && (Number(r.amount) > 0 || Number(r.rate) > 0));
    if (validRows.length === 0) {
      setErrorMsg('Please enter at least one valid item with description and rate/amount.');
      return;
    }

    try {
      setLoading(true);

      // Group or create historical bill object
      const payload = {
        partyId: partyId || undefined,
        partyName: customPartyName.trim() || undefined,
        phone: customPhone.trim() || undefined,
        billNumber: billNumber.trim() || undefined,
        date: validRows[0].date || new Date().toISOString().split('T')[0],
        items: validRows.map((r) => ({
          description: r.description.trim(),
          bags: Number(r.bags) || 0,
          qtyPerBag: Number(r.qtyPerBag) || 0,
          totalWeight: Number(r.totalWeight) || (Number(r.bags) * Number(r.qtyPerBag)) || 1,
          rate: Number(r.rate) || 0,
          amount: Number(r.amount) || 0,
        })),
        subTotal: grandTotalAmount,
        paymentReceived: totalPaymentReceived,
        balanceDue: netBalanceDue,
        notes: notes.trim() || undefined,
      };

      const res = await migrationService.importHistoricalBills(payload);

      if (res.data?.success) {
        setSuccessReport({
          message: res.data.message,
          bills: res.data.bills,
        });

        // If there's a saved bill, set it as preview
        if (res.data.bills && res.data.bills.length > 0) {
          setPreviewBill(res.data.bills[0]);
        }

        // Refresh party's bills history
        if (partyId) {
          fetchPartyBillsHistory(partyId);
        }

        onSuccess && onSuccess(res.data);
      }
    } catch (err) {
      console.error('Error saving historical bills:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to save historical bills');
    } finally {
      setLoading(false);
    }
  };

  const selectedPartyObj = parties.find((p) => (p._id || p.id) === selectedPartyId);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/25">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Itemized Historical Bills & Orders Entry
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Migrate pen-and-paper registers with Bags, Qty/Bag (kg), Rates, and instant Ledger sync
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handlePasteClipboard}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>Paste Table</span>
          </button>

          <button
            type="button"
            onClick={handleLoadSample}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Sample Data</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-2xl p-4 flex items-center space-x-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successReport && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-bold">{successReport.message}</span>
          </div>
          {previewBill && (
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Preview & Print Invoice</span>
            </button>
          )}
        </div>
      )}

      {/* Customer & Bill Meta Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
        <div>
          <label className="block text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
            Customer / Party *
          </label>
          <select
            value={selectedPartyId}
            onChange={(e) => {
              setSelectedPartyId(e.target.value);
              setCustomPartyName('');
            }}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">-- Select Customer Account --</option>
            {parties.map((p) => (
              <option key={p._id || p.id} value={p._id || p.id}>
                {p.name} {p.phone ? `(${p.phone})` : ''}
              </option>
            ))}
          </select>
        </div>

        {!selectedPartyId && (
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
              Or New Customer Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Balaji Steels Pvt Ltd"
              value={customPartyName}
              onChange={(e) => setCustomPartyName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        )}

        <div>
          <label className="block text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
            Manual Bill / Invoice # (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. BILL-2026-081"
            value={billNumber}
            onChange={(e) => setBillNumber(e.target.value.toUpperCase())}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
            Register Reference / Notes
          </label>
          <input
            type="text"
            placeholder="Register Page #, Truck #..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Itemized Table */}
      <div className="overflow-x-auto custom-scrollbar border border-slate-200 dark:border-slate-800 rounded-2xl">
        <table className="w-full min-w-[850px] text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-extrabold border-b border-slate-200 dark:border-slate-800">
              <th className="py-3 px-3 w-32">Date</th>
              <th className="py-3 px-3">Particulars / Description *</th>
              <th className="py-3 px-3 w-24 text-right">Bags / Pcs</th>
              <th className="py-3 px-3 w-28 text-right">Qty/Bag (kg)</th>
              <th className="py-3 px-3 w-32 text-right">Total Wt (kg) *</th>
              <th className="py-3 px-3 w-28 text-right">Rate (₹/kg) *</th>
              <th className="py-3 px-3 w-32 text-right font-black">Bill Total (₹)</th>
              <th className="py-3 px-3 w-32 text-right text-emerald-600 dark:text-emerald-400">Payment Rec (₹)</th>
              <th className="py-3 px-2 w-12 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row, idx) => (
              <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                {/* Date */}
                <td className="py-2 px-3">
                  <input
                    type="date"
                    value={row.date}
                    onChange={(e) => handleUpdateRow(row.id, 'date', e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[11px] focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </td>

                {/* Particulars / Description */}
                <td className="py-2 px-3">
                  <input
                    type="text"
                    placeholder="Goods description..."
                    value={row.description}
                    onChange={(e) => handleUpdateRow(row.id, 'description', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </td>

                {/* Bags / Pcs */}
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={row.bags !== undefined ? row.bags : ''}
                    onChange={(e) => handleUpdateRow(row.id, 'bags', e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-right font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </td>

                {/* Qty/Bag in kg */}
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0 kg"
                    value={row.qtyPerBag !== undefined ? row.qtyPerBag : ''}
                    onChange={(e) => handleUpdateRow(row.id, 'qtyPerBag', e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-right focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </td>

                {/* Total Weight in kg */}
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Total kg"
                    value={row.totalWeight !== undefined ? row.totalWeight : ''}
                    onChange={(e) => handleUpdateRow(row.id, 'totalWeight', e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-right text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </td>

                {/* Rate in ₹/kg */}
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="₹ Rate"
                    value={row.rate !== undefined ? row.rate : ''}
                    onChange={(e) => handleUpdateRow(row.id, 'rate', e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-right focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </td>

                {/* Bill Total (₹) */}
                <td className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white whitespace-nowrap">
                  {formatCurrency(row.amount)}
                </td>

                {/* Payment Received (₹) */}
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={row.paymentReceived !== undefined ? row.paymentReceived : ''}
                    onChange={(e) => handleUpdateRow(row.id, 'paymentReceived', e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-mono font-bold text-right focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </td>

                {/* Action */}
                <td className="py-2 px-2 text-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(row.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    title="Delete line item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Row Controls & Live Totals Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pt-1">
        <button
          type="button"
          onClick={handleAddRow}
          className="inline-flex items-center space-x-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800/50 transition self-start"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Item Row</span>
        </button>

        {/* Real-time Computation Cards */}
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
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase block">Total Paid</span>
            <span className="font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(totalPaymentReceived)}</span>
          </div>

          <div className="bg-amber-50/60 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800">
            <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase block">Net Balance Due</span>
            <span className="font-black text-amber-700 dark:text-amber-400">{formatCurrency(netBalanceDue)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-100 dark:border-slate-800">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          onClick={handleSaveAndSync}
          disabled={loading}
          className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs px-6 py-3 rounded-xl shadow-lg shadow-emerald-600/25 transition transform active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Saving Historical Bills & Syncing Ledger...</span>
            </>
          ) : (
            <>
              <span>Save & Sync Ledger</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Prior Historical Bills Section for Current Party */}
      {selectedPartyId && partyBills.length > 0 && (
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Previously Saved Historical Bills for {selectedPartyObj?.name || 'Customer'} ({partyBills.length})
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {partyBills.map((b) => (
              <div
                key={b._id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400">
                      #{b.billNumber}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      b.paymentStatus === 'PAID'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : b.paymentStatus === 'PARTIAL'
                        ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    }`}>
                      {b.paymentStatus}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    {new Date(b.date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })} • {b.items?.length || 0} Line item(s)
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total / Due</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(b.subTotal)} / <span className="text-amber-600 dark:text-amber-400">{formatCurrency(b.balanceDue)}</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBill(b);
                        setIsEditModalOpen(true);
                      }}
                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold transition border border-amber-200 dark:border-amber-800/50"
                      title="Edit Historical Bill (पुराने बिल में सुधार करें)"
                    >
                      <Pencil className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPreviewBill(b);
                        setIsPrintModalOpen(true);
                      }}
                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 text-xs font-bold transition border border-indigo-200 dark:border-indigo-800/50"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Print / Preview Modal */}
      {isPrintModalOpen && previewBill && (
        <HistoricalBillPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          billData={previewBill}
        />
      )}

      {/* Edit Historical Bill Modal */}
      {isEditModalOpen && editingBill && (
        <EditHistoricalBillModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingBill(null);
          }}
          billData={editingBill}
          onSuccess={() => {
            if (selectedPartyId) fetchPartyBillsHistory(selectedPartyId);
            onSuccess && onSuccess();
          }}
        />
      )}
    </div>
  );
};

export default HistoricalBillsMigrationGrid;
