import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Calendar,
  CreditCard,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  RefreshCw,
  AlertCircle,
  Building,
  CheckCircle2,
  Clock,
  Send,
  Printer,
} from 'lucide-react';
import { partyService, historicalBillService } from '../services/api';
import { formatCurrency, exportLedgerToPDF, exportLedgerToExcel, shareLedgerOnWhatsApp } from '../utils/exportUtils';
import { useAuth } from '../context/AuthContext';
import HistoricalBillPrintModal from '../components/HistoricalBillPrintModal';

const PartyLedger = ({ parties = [], selectedPartyId: initialPartyId = '', onOpenPaymentModal, refreshTrigger }) => {
  const { user } = useAuth();
  const [selectedPartyId, setSelectedPartyId] = useState(initialPartyId || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const handleOpenInvoice = async (row) => {
    try {
      const res = await historicalBillService.getPrintData(row.refNo);
      if (res.data?.success && res.data.data) {
        setSelectedInvoice(res.data.data);
        setIsPrintModalOpen(true);
        return;
      }
    } catch (e) {
      // Fallback: construct printable invoice from ledger row
      const fallback = {
        billNumber: row.refNo,
        date: row.date,
        party: ledgerData?.party,
        items: [
          {
            srNo: 1,
            description: row.notes || 'Goods Dispatch & Supplies',
            bags: 0,
            qtyPerBag: 0,
            totalWeight: 1,
            rate: row.debit,
            amount: row.debit,
          },
        ],
        subTotal: row.debit,
        paymentReceived: row.credit || 0,
        balanceDue: row.remainingBalance,
        paymentStatus: row.paymentStatus || (row.remainingBalance <= 0 ? 'PAID' : 'UNPAID'),
        notes: row.notes,
      };
      setSelectedInvoice(fallback);
      setIsPrintModalOpen(true);
    }
  };

  useEffect(() => {
    if (initialPartyId) {
      setSelectedPartyId(initialPartyId);
    } else if (parties.length > 0) {
      const exists = parties.some((p) => (p._id || p.id) === selectedPartyId);
      if (!exists) {
        setSelectedPartyId(parties[0]._id || parties[0].id);
      }
    }
  }, [parties, initialPartyId]);

  useEffect(() => {
    if (selectedPartyId) {
      fetchLedger();
    }
  }, [selectedPartyId, startDate, endDate, refreshTrigger]);

  const fetchLedger = async () => {
    if (!selectedPartyId) return;
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await partyService.getLedger(selectedPartyId, params);
      if (res.data?.success) {
        setLedgerData(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load ledger');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDateFilter = (days) => {
    if (days === 0) {
      setStartDate('');
      setEndDate('');
      return;
    }
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const filteredEvents = (ledgerData?.ledger || []).filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.refNo.toLowerCase().includes(q) ||
      (item.notes && item.notes.toLowerCase().includes(q)) ||
      item.type.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Top Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-lg space-y-4 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Party Selector */}
          <div className="flex-1 min-w-[280px]">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Select B2B Party / Customer
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-indigo-500 absolute left-3.5 top-3" />
              <select
                value={selectedPartyId}
                onChange={(e) => setSelectedPartyId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold rounded-2xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-sm"
              >
                {parties.length === 0 ? (
                  <option value="">-- No Parties Available --</option>
                ) : (
                  parties.map((p) => {
                    const pId = p._id || p.id;
                    return (
                      <option key={pId} value={pId}>
                        {p.name} ({p.type}) - Due: {formatCurrency(p.currentBalance)}
                      </option>
                    );
                  })
                )}
              </select>
            </div>
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-center space-x-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <span className="text-slate-400 mt-5">-</span>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Quick Date Pills */}
          <div className="flex items-center space-x-1.5 pt-4 lg:pt-0">
            <button
              onClick={() => handleQuickDateFilter(0)}
              className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl font-bold border border-slate-200 dark:border-slate-700 transition"
            >
              All Time
            </button>
            <button
              onClick={() => handleQuickDateFilter(30)}
              className="text-xs bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-3 py-2 rounded-xl font-bold border border-indigo-200 dark:border-indigo-800/50 transition"
            >
              Last 30 Days
            </button>
          </div>
        </div>

        {/* Action Controls & Export */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Invoice #, Receipt #, Notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end flex-wrap gap-y-2">
            <button
              onClick={() => ledgerData && shareLedgerOnWhatsApp(ledgerData, user?.companyName, user?.upiId)}
              disabled={!ledgerData}
              className="inline-flex items-center space-x-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-bold px-3 py-2 rounded-xl border border-emerald-500/30 transition disabled:opacity-50"
              title="Share Passbook Summary on WhatsApp"
            >
              <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={() => ledgerData && exportLedgerToPDF(ledgerData, startDate, endDate, user?.companyName)}
              disabled={!ledgerData}
              className="inline-flex items-center space-x-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-800/50 transition disabled:opacity-50"
            >
              <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Export PDF</span>
            </button>

            <button
              onClick={() => ledgerData && exportLedgerToExcel(ledgerData, user?.companyName)}
              disabled={!ledgerData}
              className="inline-flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800/50 transition disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={() => onOpenPaymentModal(selectedPartyId)}
              className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black px-4 py-2 rounded-xl shadow-lg shadow-emerald-600/25 transition transform active:scale-95"
            >
              <CreditCard className="w-4 h-4" />
              <span>+ Receive Payment</span>
            </button>
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="py-12 flex items-center justify-center space-x-2 text-indigo-500 dark:text-indigo-400 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="font-semibold">Calculating Dynamic Ledger Passbook...</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm rounded-2xl p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {!loading && ledgerData && (
        <>
          {/* 3 Prominent Balance Metrics (Step 3.2 Requirement) */}
          {(() => {
            const openBal = Number(ledgerData.openingBalance) || 0;
            const isPayableOpen =
              ledgerData.party?.openingBalanceType === 'TO_PAY' ||
              ledgerData.party?.openingBalanceType === 'PAYABLE';
            const fullPayable = Math.round(((ledgerData.totalDebit || 0) + (isPayableOpen ? 0 : openBal) + Number.EPSILON) * 100) / 100;
            const totalRec = Math.round(((ledgerData.totalCredit || 0) + (isPayableOpen ? openBal : 0) + Number.EPSILON) * 100) / 100;
            const remBal = Math.round(((ledgerData.closingBalance !== undefined ? ledgerData.closingBalance : fullPayable - totalRec) + Number.EPSILON) * 100) / 100;
            const status = remBal <= 0 ? 'PAID' : totalRec > 0 ? 'PARTIAL' : 'UNPAID';

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. [Full Payable] in white/neutral */}
                <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm relative overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Full Payable (कुल देय)
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                    {formatCurrency(fullPayable)}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                    Purana udhaar (₹{openBal.toLocaleString('en-IN')}) + Sales Bills
                  </p>
                </div>

                {/* 2. [Total Received] in emerald/green */}
                <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white dark:to-slate-900 border-2 border-emerald-500/30 p-5 rounded-3xl shadow-sm relative overflow-hidden transition-all hover:border-emerald-500/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                      Total Received (कुल जमा)
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <ArrowDownLeft className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                    {formatCurrency(totalRec)}
                  </div>
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-2 font-medium">
                    Kul jama raqam (Cash, UPI, Bank Settlements)
                  </p>
                </div>

                {/* 3. [Remaining Balance] in amber/yellow with due status badge */}
                <div className="bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-white dark:to-slate-900 border-2 border-amber-500/40 p-5 rounded-3xl shadow-sm relative overflow-hidden transition-all hover:border-amber-500/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                      Remaining Balance (बाकी रकम)
                    </span>

                    {/* Due status badge: UNPAID / PARTIAL / PAID */}
                    {status === 'PAID' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500 text-white shadow-sm shadow-emerald-500/25">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>PAID</span>
                      </span>
                    )}
                    {status === 'PARTIAL' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-sky-500 text-white shadow-sm shadow-sky-500/25">
                        <Clock className="w-3 h-3" />
                        <span>PARTIAL</span>
                      </span>
                    )}
                    {status === 'UNPAID' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/25">
                        <AlertCircle className="w-3 h-3" />
                        <span>UNPAID</span>
                      </span>
                    )}
                  </div>

                  <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
                    {formatCurrency(remBal)}
                  </div>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-2 font-medium">
                    Abhi baki kitna lena banta hai
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Date-wise Passbook Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden transition-colors">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/80">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {ledgerData.party?.name} - Passbook Ledger Statement
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Chronological transaction history with dynamic running balance
                </p>
              </div>
              <span className="text-xs font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/30">
                {filteredEvents.length} Record(s)
              </span>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[650px] text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-extrabold border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3.5 px-4">Payment / Value Date</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Ref / Invoice #</th>
                    <th className="py-3.5 px-4 text-right">Debit (₹)</th>
                    <th className="py-3.5 px-4 text-right">Credit (₹)</th>
                    <th className="py-3.5 px-4 text-right">Remaining Balance (₹)</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Mode / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-12 text-slate-400">
                        No transactions found for this party within the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map((row, idx) => {
                      const isOpening = row.type === 'OPENING_BALANCE';
                      const isDispatch = row.type === 'DISPATCH';
                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <td className="py-3.5 px-4 font-mono font-medium text-slate-600 dark:text-slate-300">
                            {new Date(row.date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center space-x-1 font-bold text-[11px] px-2.5 py-0.5 rounded-full border ${
                                isOpening
                                  ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700/60'
                                  : isDispatch
                                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/60'
                                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60'
                              }`}
                            >
                              <span>{isOpening ? 'OPENING BALANCE' : isDispatch ? 'DISPATCH' : 'PAYMENT'}</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center space-x-2">
                              <span>{row.refNo}</span>
                              {(isDispatch || row.debit > 0 || row.refNo?.startsWith('HB-') || row.refNo?.startsWith('BILL-') || row.refNo?.startsWith('HIST-')) && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenInvoice(row)}
                                  className="p-1 rounded-md bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 transition"
                                  title="View & Print Tax Invoice"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                            {row.debit > 0 ? formatCurrency(row.debit) : '-'}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {row.credit > 0 ? formatCurrency(row.credit) : '-'}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-950/50">
                            {formatCurrency(row.remainingBalance)}
                          </td>

                          <td className="py-3.5 px-4">
                            {isOpening ? (
                              <span className="text-[10px] font-black bg-sky-500/15 text-sky-700 dark:text-sky-300 px-2.5 py-1 rounded-full border border-sky-500/30 flex items-center gap-1 w-max">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>OPENING RECORD</span>
                              </span>
                            ) : isDispatch ? (
                              <span
                                className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                                  row.paymentStatus === 'PAID'
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                    : row.paymentStatus === 'PARTIAL'
                                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                }`}
                              >
                                {row.paymentStatus}
                              </span>
                            ) : (
                              <span className="text-[10px] font-black bg-teal-500/15 text-teal-600 dark:text-teal-300 px-2.5 py-1 rounded-full border border-teal-500/30 flex items-center gap-1 w-max">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>RECONCILED</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                            {row.notes}
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

      {/* Historical Bill / Dispatch Printable Tax Invoice Modal */}
      <HistoricalBillPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setSelectedInvoice(null);
        }}
        billData={selectedInvoice}
      />
    </div>
  );
};

export default PartyLedger;
