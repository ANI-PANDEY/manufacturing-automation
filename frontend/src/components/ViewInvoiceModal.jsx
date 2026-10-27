import React, { useState } from 'react';
import { X, Printer, Download, FileText, CheckCircle2, Clock, AlertCircle, Building2, User, Truck, ShieldCheck, Tag, Trash2, Send, QrCode, Copy, Check } from 'lucide-react';
import { formatCurrency, exportInvoiceToPDF, shareInvoiceOnWhatsApp, getUPIQRCodeImageURL } from '../utils/exportUtils';
import { useAuth } from '../context/AuthContext';
import { useIndustry } from '../context/IndustryContext';

const ViewInvoiceModal = ({ isOpen, onClose, order = null, onDeleteOrder = null }) => {
  const { user } = useAuth();
  const { activePreset } = useIndustry();
  const [copiedUpi, setCopiedUpi] = useState(false);

  if (!isOpen || !order) return null;

  const currentCompanyName = user?.companyName || 'Manufacturing ERP Enterprise';
  const currentUpiId = user?.upiId || 'enterprise@upi';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    exportInvoiceToPDF(order, currentCompanyName, currentUpiId);
  };

  const handleWhatsAppShare = () => {
    shareInvoiceOnWhatsApp(order, currentCompanyName, currentUpiId);
  };

  const handleCopyUPI = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(currentUpiId);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = currentUpiId;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    } catch (err) {
      console.warn('UPI Copy fallback:', err);
    }
  };

  const qrImageUrl = getUPIQRCodeImageURL(currentUpiId, currentCompanyName, order.balanceDue, 180);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-800 dark:text-slate-100">
        
        {/* Top Header Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-sky-500/20 bg-gradient-to-r from-slate-900 via-sky-950/50 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center font-black text-sky-400 shrink-0">
              <FileText className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2 flex-wrap">
                <span>Tax Invoice Bill Details</span>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 font-mono px-2.5 py-0.5 rounded-full border border-sky-500/30">
                  {order.orderNumber}
                </span>
              </h3>
              <p className="text-xs text-slate-300">B2B Goods Dispatch Invoice & Billing Breakdown</p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap justify-end">
            <button
              onClick={handleWhatsAppShare}
              title="Share Invoice on WhatsApp"
              className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold px-3 py-2 rounded-xl shadow-md shadow-emerald-600/25 transition"
            >
              <Send className="w-3.5 h-3.5 text-white" />
              <span>WhatsApp</span>
            </button>

            {onDeleteOrder && (
              <button
                onClick={() => onDeleteOrder(order)}
                title="Remove / Delete this Invoice Bill"
                className="inline-flex items-center space-x-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-extrabold px-2.5 py-2 rounded-xl border border-rose-500/30 transition"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              title="Print Tax Invoice Bill"
              className="inline-flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-2.5 py-2 rounded-xl border border-slate-700 transition"
            >
              <Printer className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              title="Download PDF Bill"
              className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-extrabold px-3 py-2 rounded-xl shadow-lg shadow-indigo-600/30 transition transform active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Document Body */}
        <div id="printable-invoice" className="p-6 sm:p-8 overflow-y-auto custom-scrollbar space-y-6 bg-slate-50 dark:bg-slate-950">
          
          {/* Company Brand & Bill Reference Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                OFFICIAL B2B TAX INVOICE
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">{currentCompanyName}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Industry: {activePreset.name}</p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <span
                className={`inline-flex items-center space-x-1 text-xs font-extrabold px-3 py-1 rounded-full border ${
                  order.paymentStatus === 'PAID'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : order.paymentStatus === 'PARTIAL'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                }`}
              >
                {order.paymentStatus === 'PAID' && <CheckCircle2 className="w-3.5 h-3.5" />}
                {order.paymentStatus === 'PARTIAL' && <Clock className="w-3.5 h-3.5" />}
                {order.paymentStatus === 'UNPAID' && <AlertCircle className="w-3.5 h-3.5" />}
                <span>PAYMENT {order.paymentStatus}</span>
              </span>
              <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                Invoice #: <span className="text-sky-600 dark:text-sky-400 font-black">{order.orderNumber}</span>
              </p>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Invoice Date: {new Date(order.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Customer / Party Billed Info Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" /> Billed Enterprise / Issuer
              </span>
              <p className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{currentCompanyName}</p>
              <p className="text-slate-500 dark:text-slate-400 font-mono">System ERP Issued Bill</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-sky-500" /> Billed Customer / Party Details
              </span>
              <p className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{order.party?.name || 'N/A'}</p>
              <p className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">GSTIN: {order.party?.gstin || 'N/A'}</p>
              <p className="text-slate-600 dark:text-slate-400 font-mono">
                Phone: <span className="font-bold text-slate-900 dark:text-white">{order.party?.phone ? `+91 ${order.party.phone.replace(/\D/g, '').slice(-10)}` : 'N/A'}</span>
              </p>
              <p className="text-slate-600 dark:text-slate-400 truncate">Address: {order.party?.address || 'N/A'}</p>
            </div>
          </div>

          {/* Itemized Goods Breakdown Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-indigo-500" />
              <span>Bill Items & Goods Summary</span>
            </h4>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-extrabold border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Item / Product Name</th>
                    <th className="py-3 px-4 text-center">Quantity & UOM</th>
                    <th className="py-3 px-4 text-right">Unit Rate (₹)</th>
                    <th className="py-3 px-4 text-right">Subtotal (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200 font-medium">
                  {(order.items || []).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {item.productName || item.product?.productName || 'Goods Item'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-900 dark:text-white">
                        {item.quantity} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{item.unit || 'Pcs'}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                        {formatCurrency(item.subtotal || item.quantity * item.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dynamic UPI Payment QR Code Card */}
          {order.balanceDue > 0 && (
            <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/80 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 border border-indigo-200 dark:border-indigo-800/50 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="bg-white p-2.5 rounded-2xl shadow-md shrink-0 border border-slate-200">
                  <img
                    src={qrImageUrl}
                    alt="UPI Payment QR Code"
                    className="w-28 h-28 object-contain"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800 inline-flex items-center gap-1">
                    <QrCode className="w-3 h-3 text-indigo-500" /> SCAN TO PAY VIA UPI
                  </span>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">Instant UPI Payment QR</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Scan using GPay, PhonePe, Paytm, or BHIM to pay <strong className="text-emerald-600 dark:text-emerald-400 font-mono">₹{order.balanceDue}</strong> directly.
                  </p>
                  
                  <div className="pt-2 flex items-center space-x-2">
                    <span className="text-[11px] font-mono text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                      {currentUpiId}
                    </span>
                    <button
                      onClick={handleCopyUPI}
                      className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 bg-white dark:bg-slate-800 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 transition"
                    >
                      {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUpi ? 'Copied!' : 'Copy VPA'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="w-full sm:w-auto flex sm:flex-col justify-center items-end gap-2">
                <button
                  onClick={handleWhatsAppShare}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition transform active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Bill on WhatsApp</span>
                </button>
              </div>
            </div>
          )}

          {/* Financial Totals Calculation Box */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            {/* Dispatch Notes */}
            <div className="flex-1 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-sky-500" /> Dispatch & Delivery Remarks
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-300 italic">{order.dispatchNotes || 'No specific dispatch notes recorded for this bill.'}</p>
            </div>

            {/* Bill Summary Calculations */}
            <div className="w-full sm:w-72 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs shadow-sm">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Subtotal Amount</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{formatCurrency(order.subtotalAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>GST Tax ({order.taxRate || 18}%)</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{formatCurrency(order.taxAmount)}</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between font-extrabold text-sm text-slate-900 dark:text-white">
                <span>Total Bill Amount</span>
                <span className="text-sky-600 dark:text-sky-400 font-mono font-black">{formatCurrency(order.totalAmount)}</span>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-2 flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>Amount Paid</span>
                <span className="font-mono">{formatCurrency(order.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-amber-600 dark:text-amber-400 font-black">
                <span>Balance Outstanding Due</span>
                <span className="font-mono">{formatCurrency(order.balanceDue)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="font-mono text-[11px]">Computer-generated B2B Invoice Bill</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold transition border border-slate-200 dark:border-slate-700"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewInvoiceModal;
