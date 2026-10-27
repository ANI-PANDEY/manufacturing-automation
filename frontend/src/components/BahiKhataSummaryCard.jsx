import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  Send,
  RefreshCw,
  Search,
  Filter,
  User,
  ShieldAlert,
} from 'lucide-react';
import { partyService } from '../services/api';
import { formatCurrency, exportLedgerToPDF, exportLedgerToExcel, shareLedgerOnWhatsApp } from '../utils/exportUtils';
import { useAuth } from '../context/AuthContext';

/**
 * BahiKhataSummaryCard
 * Displays 3 prominent balance metrics:
 * 1. [Full Payable] in white/neutral
 * 2. [Total Received] in emerald/green
 * 3. [Remaining Balance] in amber/yellow with due status badge (UNPAID / PARTIAL / PAID)
 * Includes chronological ledger passbook with 2-decimal accuracy.
 */
const BahiKhataSummaryCard = ({
  partyId,
  partyName = '',
  onOpenPaymentModal,
  refreshTrigger,
  onPaymentSuccess,
}) => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, INVOICE, PAYMENT_RECEIVED, OPENING_BALANCE

  useEffect(() => {
    if (partyId) {
      fetchSummary();
    }
  }, [partyId, refreshTrigger]);

  const fetchSummary = async () => {
    if (!partyId) return;
    try {
      setLoading(true);
      setError('');
      const res = await partyService.getLedgerSummary(partyId);
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching ledger summary:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load ledger summary');
    } finally {
      setLoading(false);
    }
  };

  if (!partyId) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center text-slate-400">
        <User className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
        <p className="font-semibold text-sm">Please select a customer to view their Bahi-Khata ledger & balance summary</p>
      </div>
    );
  }

  const party = data?.party;
  const totalPayable = data?.totalPayable !== undefined ? data.totalPayable : 0;
  const totalReceived = data?.totalReceived !== undefined ? data.totalReceived : 0;
  const remainingBalance = data?.remainingBalance !== undefined ? data.remainingBalance : 0;
  const status = data?.status || (remainingBalance <= 0 ? 'PAID' : totalReceived > 0 ? 'PARTIAL' : 'UNPAID');

  // Filtered ledger transactions
  const filteredLedger = (data?.ledger || []).filter((item) => {
    if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.referenceId && item.referenceId.toLowerCase().includes(q)) ||
      (item.notes && item.notes.toLowerCase().includes(q)) ||
      (item.type && item.type.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Header bar with customer title & action buttons */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-indigo-500/25">
            {party?.name ? party.name.charAt(0).toUpperCase() : 'C'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {party?.name || partyName || 'Customer Account'}
              </h2>
              <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {party?.type || 'CUSTOMER'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Phone: {party?.phone ? `+91 ${party.phone}` : 'N/A'} • GSTIN: {party?.gstin || 'Unregistered'}
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => data && shareLedgerOnWhatsApp({ party, openingBalance: party.openingBalance, closingBalance: remainingBalance, totalDebit: totalPayable, totalCredit: totalReceived, ledger: data.ledger }, user?.companyName, user?.upiId)}
            disabled={!data}
            className="inline-flex items-center space-x-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold px-3 py-2 rounded-xl border border-emerald-500/30 transition disabled:opacity-50"
            title="Share Ledger Statement on WhatsApp"
          >
            <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={() => data && exportLedgerToPDF({ party, openingBalance: party.openingBalance, closingBalance: remainingBalance, totalDebit: totalPayable, totalCredit: totalReceived, ledger: data.ledger }, null, null, user?.companyName)}
            disabled={!data}
            className="inline-flex items-center space-x-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-800/50 transition disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>PDF</span>
          </button>

          <button
            onClick={() => data && exportLedgerToExcel({ party, openingBalance: party.openingBalance, closingBalance: remainingBalance, totalDebit: totalPayable, totalCredit: totalReceived, ledger: data.ledger }, user?.companyName)}
            disabled={!data}
            className="inline-flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 transition disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            <span>Excel</span>
          </button>

          <button
            onClick={() => onOpenPaymentModal && onOpenPaymentModal(partyId)}
            className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black px-4 py-2 rounded-xl shadow-lg shadow-emerald-600/25 transition transform active:scale-95"
          >
            <CreditCard className="w-4 h-4" />
            <span>+ Receive Payment</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="py-8 flex items-center justify-center space-x-2 text-indigo-500 text-sm font-semibold">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Calculating Bahi-Khata balances...</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm rounded-2xl p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {!loading && (
        <>
          {/* ============================================================== */}
          {/* THREE PROMINENT BALANCE METRICS (STEP 3.2 REQUIREMENT) */}
          {/* ============================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Metric 1: [Full Payable] in white/neutral */}
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm relative overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Full Payable (कुल देय)
                </span>
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {formatCurrency(totalPayable)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                Purana udhaar (₹{(party?.openingBalance || 0).toLocaleString('en-IN')}) + Sales Invoices
              </p>
            </div>

            {/* Metric 2: [Total Received] in emerald/green */}
            <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white dark:to-slate-900 border-2 border-emerald-500/30 rounded-3xl p-5 shadow-sm relative overflow-hidden transition-all hover:border-emerald-500/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  Total Received (कुल जमा)
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                {formatCurrency(totalReceived)}
              </div>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-2 font-medium">
                Kul jama raqam (Cash, UPI, Bank Transfer settlements)
              </p>
            </div>

            {/* Metric 3: [Remaining Balance] in amber/yellow with due status badge */}
            <div className="bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-white dark:to-slate-900 border-2 border-amber-500/40 rounded-3xl p-5 shadow-sm relative overflow-hidden transition-all hover:border-amber-500/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  Remaining Balance (बाकी रकम)
                </span>

                {/* Due status badge: UNPAID / PARTIAL / PAID */}
                {status === 'PAID' && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500 text-white shadow-sm shadow-emerald-500/25">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>PAID (हिसाब चुकता)</span>
                  </span>
                )}
                {status === 'PARTIAL' && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-sky-500 text-white shadow-sm shadow-sky-500/25">
                    <Clock className="w-3 h-3" />
                    <span>PARTIAL (आंशिक बकाया)</span>
                  </span>
                )}
                {status === 'UNPAID' && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/25">
                    <AlertCircle className="w-3 h-3" />
                    <span>UNPAID (पूरा बाकी)</span>
                  </span>
                )}
              </div>

              <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
                {formatCurrency(remainingBalance)}
              </div>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-2 font-medium">
                Abhi baki kitna lena banta hai (Full Payable - Total Received)
              </p>
            </div>
          </div>

          {/* ============================================================== */}
          {/* DETAILED DATE-WISE LEDGER PASSBOOK TABLE */}
          {/* ============================================================== */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden transition-colors">
            {/* Filter toolbar */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/80">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Bahi-Khata Statement ({filteredLedger.length} Records)
                </h3>
              </div>

              <div className="flex items-center flex-wrap gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search invoice or ref..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Type Filter */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Types</option>
                  <option value="OPENING_BALANCE">Opening Balance</option>
                  <option value="INVOICE">Invoices (Debit)</option>
                  <option value="PAYMENT_RECEIVED">Payments (Credit)</option>
                </select>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[700px] text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-extrabold border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Ref / Invoice #</th>
                    <th className="py-3 px-4 text-right">Debit / Lena (+)</th>
                    <th className="py-3 px-4 text-right">Credit / Jama (-)</th>
                    <th className="py-3 px-4 text-right font-black">Remaining Balance (₹)</th>
                    <th className="py-3 px-4">Mode / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-10 text-slate-400 font-medium">
                        No transactions recorded in Bahi-Khata ledger yet.
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.map((row, idx) => {
                      const isInvoice = row.type === 'INVOICE';
                      const isPayment = row.type === 'PAYMENT_RECEIVED';
                      const isOpening = row.type === 'OPENING_BALANCE';

                      return (
                        <tr
                          key={row.id || idx}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {new Date(row.date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>

                          <td className="py-3 px-4">
                            {isOpening && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                OPENING BALANCE
                              </span>
                            )}
                            {isInvoice && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                INVOICE / MAL BECHA
                              </span>
                            )}
                            {isPayment && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                PAYMENT RECEIVED
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {row.referenceId || 'N/A'}
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                            {row.debit > 0 ? formatCurrency(row.debit) : '-'}
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {row.credit > 0 ? formatCurrency(row.credit) : '-'}
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                            {formatCurrency(row.runningBalance)}
                          </td>

                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                            {row.paymentMode && row.paymentMode !== 'N/A' && (
                              <span className="font-bold text-slate-700 dark:text-slate-300 mr-1.5">
                                [{row.paymentMode}]
                              </span>
                            )}
                            <span>{row.notes || '-'}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BahiKhataSummaryCard;
