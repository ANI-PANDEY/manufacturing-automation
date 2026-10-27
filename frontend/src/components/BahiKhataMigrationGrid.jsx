import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  BookOpen,
  ArrowRight,
  ClipboardPaste,
  Info,
} from 'lucide-react';
import { partyService } from '../services/api';
import { formatCurrency } from '../utils/exportUtils';

/**
 * BahiKhataMigrationGrid
 * Interactive manual grid / table to migrate customer records from pen-and-paper registers.
 * Inputs: Party Name, Phone, Opening Balance, Balance Type (TO_RECEIVE / TO_PAY).
 * Submits to POST /api/parties/migrate-bulk.
 */
const BahiKhataMigrationGrid = ({ onSuccess, onCancel }) => {
  const [rows, setRows] = useState([
    {
      id: 1,
      name: '',
      phone: '',
      openingBalance: '',
      openingBalanceType: 'TO_RECEIVE',
      type: 'CUSTOMER',
    },
    {
      id: 2,
      name: '',
      phone: '',
      openingBalance: '',
      openingBalanceType: 'TO_RECEIVE',
      type: 'CUSTOMER',
    },
    {
      id: 3,
      name: '',
      phone: '',
      openingBalance: '',
      openingBalanceType: 'TO_RECEIVE',
      type: 'CUSTOMER',
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successReport, setSuccessReport] = useState(null);

  // Add new blank row
  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        name: '',
        phone: '',
        openingBalance: '',
        openingBalanceType: 'TO_RECEIVE',
        type: 'CUSTOMER',
      },
    ]);
  };

  // Remove specific row
  const handleRemoveRow = (id) => {
    if (rows.length === 1) {
      setRows([
        {
          id: Date.now(),
          name: '',
          phone: '',
          openingBalance: '',
          openingBalanceType: 'TO_RECEIVE',
          type: 'CUSTOMER',
        },
      ]);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Update field value in row
  const handleUpdateField = (id, field, value) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // Populate sample test records
  const handleLoadSample = () => {
    setRows([
      {
        id: 101,
        name: 'Sharma Hardware & Building Materials',
        phone: '9876543210',
        openingBalance: '45000',
        openingBalanceType: 'TO_RECEIVE',
        type: 'CUSTOMER',
      },
      {
        id: 102,
        name: 'Gupta Steel Traders',
        phone: '9812345678',
        openingBalance: '125000',
        openingBalanceType: 'TO_RECEIVE',
        type: 'CUSTOMER',
      },
      {
        id: 103,
        name: 'Aggarwal Industrial Parts',
        phone: '9789012345',
        openingBalance: '32000',
        openingBalanceType: 'TO_PAY',
        type: 'VENDOR',
      },
    ]);
  };

  // Quick paste parser from clipboard (tab/newline separated)
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) return;

      const lines = text.trim().split(/\r?\n/);
      const parsed = lines.map((line, idx) => {
        const parts = line.split(/\t|,/);
        return {
          id: Date.now() + idx,
          name: parts[0]?.trim() || '',
          phone: parts[1]?.replace(/\D/g, '').slice(-10) || '',
          openingBalance: parts[2]?.replace(/[^0-9.]/g, '') || '0',
          openingBalanceType: 'TO_RECEIVE',
          type: 'CUSTOMER',
        };
      });

      if (parsed.length > 0) {
        setRows(parsed);
      }
    } catch (e) {
      setErrorMsg('Could not read clipboard. Please paste manually into table cells.');
    }
  };

  // Calculate grid summary statistics
  const filledRows = rows.filter((r) => r.name.trim().length > 0);
  const totalOpeningReceivable = filledRows
    .filter((r) => r.openingBalanceType === 'TO_RECEIVE')
    .reduce((acc, curr) => acc + (Number(curr.openingBalance) || 0), 0);
  const totalOpeningPayable = filledRows
    .filter((r) => r.openingBalanceType === 'TO_PAY')
    .reduce((acc, curr) => acc + (Number(curr.openingBalance) || 0), 0);

  // Submit to bulk migration endpoint
  const handleSubmitMigration = async () => {
    setErrorMsg('');

    if (filledRows.length === 0) {
      setErrorMsg('Please enter at least one customer name in the grid.');
      return;
    }

    // Validate phone numbers if present
    for (const r of filledRows) {
      const cleanPhone = r.phone.replace(/\D/g, '').slice(-10);
      if (r.phone.trim() && cleanPhone.length !== 10) {
        setErrorMsg(`Customer '${r.name}' has invalid phone. Must be exactly 10 digits.`);
        return;
      }
    }

    try {
      setLoading(true);

      const payload = filledRows.map((r) => ({
        name: r.name.trim(),
        phone: r.phone.replace(/\D/g, '').slice(-10),
        openingBalance: Number(r.openingBalance) || 0,
        openingBalanceType: r.openingBalanceType,
        type: r.type,
      }));

      const res = await partyService.migrateBulk(payload);

      if (res.data?.success) {
        setSuccessReport(res.data);
        onSuccess && onSuccess(res.data);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Migration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Bahi-Khata Pen-and-Paper Migration Grid
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter old notebook/register customers with past opening balances (बकाया हिसाब)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handlePasteFromClipboard}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
            title="Paste from Excel or spreadsheet clipboard"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>Paste Excel</span>
          </button>

          <button
            type="button"
            onClick={handleLoadSample}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sample Data</span>
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
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold">{successReport.message}</span>
          </div>
          <span className="font-mono font-black text-emerald-700 dark:text-emerald-300">
            {successReport.stats?.created || 0} Added / {successReport.stats?.updated || 0} Updated
          </span>
        </div>
      )}

      {/* Manual Grid / Table */}
      <div className="overflow-x-auto custom-scrollbar border border-slate-200 dark:border-slate-800 rounded-2xl">
        <table className="w-full min-w-[720px] text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-extrabold border-b border-slate-200 dark:border-slate-800">
              <th className="py-3 px-3 w-12 text-center">#</th>
              <th className="py-3 px-3">Party / Customer Name *</th>
              <th className="py-3 px-3">Phone (10 Digits)</th>
              <th className="py-3 px-3 text-right">Opening Balance (₹)</th>
              <th className="py-3 px-3">Balance Nature</th>
              <th className="py-3 px-3">Account Type</th>
              <th className="py-3 px-3 w-14 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row, idx) => (
              <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                <td className="py-2 px-3 text-center text-slate-400 font-mono font-bold">
                  {idx + 1}
                </td>

                <td className="py-2 px-3">
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Hardware Store"
                    value={row.name}
                    onChange={(e) => handleUpdateField(row.id, 'name', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </td>

                <td className="py-2 px-3">
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="98XXXXXXXX"
                    value={row.phone}
                    onChange={(e) => handleUpdateField(row.id, 'phone', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </td>

                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={row.openingBalance}
                    onChange={(e) => handleUpdateField(row.id, 'openingBalance', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-right font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </td>

                <td className="py-2 px-3">
                  <select
                    value={row.openingBalanceType}
                    onChange={(e) => handleUpdateField(row.id, 'openingBalanceType', e.target.value)}
                    className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      row.openingBalanceType === 'TO_RECEIVE'
                        ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                        : 'border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    <option value="TO_RECEIVE">TO_RECEIVE (लेना है / Debit)</option>
                    <option value="TO_PAY">TO_PAY (देना है / Credit)</option>
                  </select>
                </td>

                <td className="py-2 px-3">
                  <select
                    value={row.type}
                    onChange={(e) => handleUpdateField(row.id, 'type', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none"
                  >
                    <option value="CUSTOMER">Customer (ग्राहक)</option>
                    <option value="VENDOR">Vendor (सप्लायर)</option>
                    <option value="BOTH">Both</option>
                  </select>
                </td>

                <td className="py-2 px-3 text-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(row.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    title="Remove row"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Grid footer controls & Summary stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={handleAddRow}
          className="inline-flex items-center space-x-1.5 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800/50 transition self-start"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Another Customer</span>
        </button>

        {/* Live Calculation preview */}
        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="text-slate-600 dark:text-slate-300">
            <span>To Receive: </span>
            <strong className="text-amber-600 dark:text-amber-400 font-black">
              {formatCurrency(totalOpeningReceivable)}
            </strong>
          </div>
          {totalOpeningPayable > 0 && (
            <div className="text-slate-600 dark:text-slate-300">
              <span>To Pay: </span>
              <strong className="text-rose-600 dark:text-rose-400 font-black">
                {formatCurrency(totalOpeningPayable)}
              </strong>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Submit Action */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
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
          onClick={handleSubmitMigration}
          disabled={loading || filledRows.length === 0}
          className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/25 transition transform active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Migrating into Bahi-Khata Ledger...</span>
            </>
          ) : (
            <>
              <span>Migrate {filledRows.length} Customers into Ledger</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default BahiKhataMigrationGrid;
