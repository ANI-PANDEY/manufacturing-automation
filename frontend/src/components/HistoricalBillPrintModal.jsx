import React, { useRef } from 'react';
import {
  X,
  Printer,
  Download,
  Calendar,
  Building,
  User,
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { formatCurrency } from '../utils/exportUtils';
import { useAuth } from '../context/AuthContext';
const HistoricalBillPrintModal = ({ isOpen, onClose, billData }) => {
  const { user } = useAuth();
  const printRef = useRef(null);

  if (!isOpen || !billData) return null;

  const party = billData.party || billData.partyId || {};
  const items = billData.items || [];
  const billNumber = billData.billNumber || billData.orderNumber || 'HIST-BILL';
  const billDate = billData.date ? new Date(billData.date) : new Date();
  const formattedDate = billDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const totalBags = items.reduce((sum, it) => sum + (Number(it.bags) || 0), 0);
  const totalWeight = Math.round((items.reduce((sum, it) => sum + (Number(it.totalWeight) || 0), 0) + Number.EPSILON) * 100) / 100;
  const subTotal = Number(billData.subTotal || billData.totalAmount || 0);
  const paymentReceived = Number(billData.paymentReceived || billData.paidAmount || 0);
  const balanceDue = Number(billData.balanceDue !== undefined ? billData.balanceDue : subTotal - paymentReceived);
  const paymentStatus = billData.paymentStatus || (balanceDue <= 0 ? 'PAID' : paymentReceived > 0 ? 'PARTIAL' : 'UNPAID');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
      {/* Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header toolbar (Hidden during print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 print:hidden">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Historical Invoice Preview: <span className="font-mono text-indigo-600 dark:text-indigo-400">#{billNumber}</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Printable itemized invoice statement for customer records
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/25 transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Document Body */}
        <div ref={printRef} className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-900 dark:text-slate-100 print:p-0 print:text-black">
          {/* Top Banner: Company Info & Bill Details */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b-2 border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 block mb-1">
                ORIGINAL TAX INVOICE / REGISTER BILL
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {user?.companyName || 'Manufacturing ERP Enterprise'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                Industrial Area, Factory Units & Heavy Manufacturing Division
              </p>
              {user?.gstin && (
                <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                  GSTIN: {user.gstin}
                </p>
              )}
            </div>

            <div className="sm:text-right bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 min-w-[200px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Invoice Reference</span>
              <span className="text-base font-black font-mono text-indigo-600 dark:text-indigo-400 block">
                #{billNumber}
              </span>

              <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="text-slate-400 text-[10px] uppercase block">Date of Issue</span>
                <span className="font-mono font-bold">{formattedDate}</span>
              </div>
            </div>
          </div>

          {/* Customer / Billed To Info */}
          <div className="bg-slate-50/70 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                BILLED TO / CUSTOMER DETAILS
              </span>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {party.name || 'Valued Customer'}
              </h2>
              {party.phone && (
                <p className="text-xs text-slate-600 dark:text-slate-300 font-mono mt-0.5">
                  Phone: +91 {party.phone.replace(/\D/g, '').slice(-10)}
                </p>
              )}
              {party.address && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-sm">
                  {party.address}
                </p>
              )}
              {party.gstin && (
                <p className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  GSTIN: {party.gstin}
                </p>
              )}
            </div>

            <div className="sm:text-right flex flex-col justify-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Payment Status</span>
              <div className="mt-1">
                {paymentStatus === 'PAID' && (
                  <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-white shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>FULLY PAID</span>
                  </span>
                )}
                {paymentStatus === 'PARTIAL' && (
                  <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-black bg-sky-500 text-white shadow-sm">
                    <Clock className="w-3.5 h-3.5" />
                    <span>PARTIALLY PAID</span>
                  </span>
                )}
                {paymentStatus === 'UNPAID' && (
                  <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-sm">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>UNPAID / BALANCE DUE</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Particulars / Description</th>
                  <th className="py-2.5 px-3 text-right">Bags / Pcs</th>
                  <th className="py-2.5 px-3 text-right">Qty/Bag (kg)</th>
                  <th className="py-2.5 px-3 text-right">Total Wt (kg)</th>
                  <th className="py-2.5 px-3 text-right">Rate (₹/kg)</th>
                  <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400">
                      No line items recorded.
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => (
                    <tr key={it._id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {it.description}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {it.bags > 0 ? it.bags : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {it.qtyPerBag > 0 ? `${it.qtyPerBag} kg` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {it.totalWeight} kg
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatCurrency(it.rate)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                        {formatCurrency(it.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Summary Totals & Calculations */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 max-w-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Notes & Dispatches</span>
              <p className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-200 dark:border-slate-800 italic">
                {billData.notes || 'Goods dispatched in good condition as per historical pen-and-paper register.'}
              </p>
              <p className="text-[10px] text-slate-400 pt-1">
                * Weight verified & calculated based on bag units or loose standard.
              </p>
            </div>

            {/* Financial Breakdown Table */}
            <div className="w-full sm:w-80 space-y-2 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-mono">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total Quantity:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {totalBags > 0 ? `${totalBags} Bags / ` : ''}{totalWeight} kg
                </span>
              </div>

              <div className="flex justify-between text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-700">
                <span className="font-bold">Subtotal Amount:</span>
                <span className="font-black text-slate-900 dark:text-white">{formatCurrency(subTotal)}</span>
              </div>

              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Payment Received / Adv:</span>
                <span className="font-black">(-) {formatCurrency(paymentReceived)}</span>
              </div>

              <div className="flex justify-between text-base font-black text-amber-600 dark:text-amber-400 pt-2 border-t-2 border-slate-200 dark:border-slate-700">
                <span>Balance Due:</span>
                <span>{formatCurrency(balanceDue)}</span>
              </div>
            </div>
          </div>

          {/* Signatures Footer */}
          <div className="pt-10 flex justify-between items-end text-xs text-slate-500 border-t border-slate-200 dark:border-slate-800">
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">Customer Acceptance</p>
              <div className="w-36 border-b border-slate-400 dark:border-slate-600 mt-8"></div>
              <p className="text-[10px] text-slate-400 mt-1">Signature / Stamp</p>
            </div>

            <div className="text-right">
              <p className="font-semibold text-slate-700 dark:text-slate-300">For {user?.companyName || 'Enterprise'}</p>
              <div className="w-36 border-b border-slate-400 dark:border-slate-600 mt-8 ml-auto"></div>
              <p className="text-[10px] text-slate-400 mt-1">Authorized Signatory</p>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-3 bg-slate-50 dark:bg-slate-800/60 print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            Close
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/25 transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print Invoice</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoricalBillPrintModal;
