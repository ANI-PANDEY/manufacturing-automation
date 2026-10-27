import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Search, Filter, CheckCircle2, Clock, AlertCircle, Eye, Download, FileText, Trash2, ShieldAlert, FileSpreadsheet } from 'lucide-react';
import { orderService } from '../services/api';
import { formatCurrency } from '../utils/exportUtils';
import ViewInvoiceModal from '../components/ViewInvoiceModal';
import DataMigrationModal from '../components/DataMigrationModal';

const OrdersPage = ({ onOpenOrderModal, refreshTrigger }) => {
  const [orders, setOrders] = useState([]);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Migration modal state
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);

  // View Bill Modal state
  const [selectedOrderForBill, setSelectedOrderForBill] = useState(null);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);

  // Delete Invoice Modal state
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [paymentStatusFilter, refreshTrigger]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = {};
      if (paymentStatusFilter) params.paymentStatus = paymentStatusFilter;

      const res = await orderService.getAll(params);
      if (res.data?.success) {
        setOrders(res.data.orders || []);
      }
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBillModal = (order) => {
    setSelectedOrderForBill(order);
    setIsBillModalOpen(true);
  };

  const handleDeleteOrderConfirm = async () => {
    if (!orderToDelete) return;

    try {
      setDeleteLoading(true);
      const res = await orderService.delete(orderToDelete._id);
      if (res.data?.success) {
        setDeleteSuccessMsg(res.data.message || 'Invoice deleted successfully');
        setTimeout(() => {
          setDeleteSuccessMsg('');
          setOrderToDelete(null);
          setIsBillModalOpen(false);
          fetchOrders();
        }, 800);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.response?.status === 404
          ? 'Backend route not found. Please restart server (npm run dev) to apply new API endpoints.'
          : err.message || 'Failed to delete order');
      alert(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      (o.party?.name && o.party.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border border-sky-500/20 p-6 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="bg-sky-500/20 text-sky-300 font-extrabold text-[10px] px-2.5 py-1 rounded-full border border-sky-500/30 uppercase tracking-wider">
              Dispatch & Billing
            </span>
            <span className="text-xs text-slate-400 font-mono">Tax Invoices (GST Compliant)</span>
          </div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-sky-400" />
            <span>B2B Dispatch Orders & Tax Invoices</span>
          </h2>
          <p className="text-xs text-slate-300">
            Track outward sales dispatches, view complete bill details, or delete & restore stock for erroneous bills
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsMigrationModalOpen(true)}
            className="inline-flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl text-xs font-extrabold border border-white/20 transition transform hover:-translate-y-0.5 active:scale-95 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Import Past Bills / Excel (पुराने बिल)</span>
          </button>

          <button
            onClick={onOpenOrderModal}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-blue-500 text-white px-5 py-2.5 rounded-2xl text-xs font-extrabold shadow-lg shadow-sky-600/30 transition transform hover:-translate-y-0.5 active:scale-95 border border-sky-400/30"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create New Dispatch Invoice</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search Order Number or Party Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Payment Status:</span>
          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Orders</option>
            <option value="UNPAID">UNPAID</option>
            <option value="PARTIAL">PARTIAL</option>
            <option value="PAID">PAID</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[800px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-extrabold border-b border-slate-200 dark:border-slate-800">
                <th className="py-4 px-4">Order Ref #</th>
                <th className="py-4 px-4">Dispatch Date</th>
                <th className="py-4 px-4">Party / Customer</th>
                <th className="py-4 px-4 text-right">Subtotal</th>
                <th className="py-4 px-4 text-right">GST (18%)</th>
                <th className="py-4 px-4 text-right">Total Amount</th>
                <th className="py-4 px-4 text-right">Paid Amount</th>
                <th className="py-4 px-4 text-right">Balance Due</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-12 text-slate-400">
                    No dispatch orders found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr key={ord._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group">
                    <td className="py-4 px-4 font-mono font-extrabold text-sky-600 dark:text-sky-400">
                      <button
                        onClick={() => handleOpenBillModal(ord)}
                        className="hover:underline flex items-center space-x-1"
                        title="Click to view full Tax Invoice Bill"
                      >
                        <FileText className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        <span>{ord.orderNumber}</span>
                      </button>
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {new Date(ord.orderDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">
                      <div>{ord.party?.name || 'N/A'}</div>
                      {ord.party?.phone && (
                        <div className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                          +91 {ord.party.phone.replace(/\D/g, '').slice(-10)}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-slate-500 dark:text-slate-400">
                      {formatCurrency(ord.subtotalAmount)}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-slate-500 dark:text-slate-400">
                      {formatCurrency(ord.taxAmount)}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                      {formatCurrency(ord.totalAmount)}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(ord.paidAmount)}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400 bg-slate-50/50 dark:bg-slate-950/50">
                      {formatCurrency(ord.balanceDue)}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                          ord.paymentStatus === 'PAID'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : ord.paymentStatus === 'PARTIAL'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {ord.paymentStatus}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleOpenBillModal(ord)}
                          className="inline-flex items-center space-x-1 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50 text-xs font-bold px-2.5 py-1.5 rounded-xl transition transform active:scale-95"
                          title="View Full Bill & Goods Items Breakdown"
                        >
                          <Eye className="w-3.5 h-3.5 text-sky-500" />
                          <span>View Bill</span>
                        </button>

                        <button
                          onClick={() => setOrderToDelete(ord)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="Delete / Cancel Invoice Bill"
                        >
                          <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Cancel & Delete Invoice Bill?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to delete invoice <strong className="text-slate-900 dark:text-white">{orderToDelete.orderNumber}</strong>?
              </p>
              <div className="mt-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl text-[11px] text-slate-600 dark:text-slate-300 space-y-1 text-left border border-slate-200/80 dark:border-slate-800">
                <p>• <strong>Stock Quantity</strong> will be automatically restored for all goods items in this bill.</p>
                <p>• <strong>Party Balance</strong> will be adjusted to remove the bill amount.</p>
              </div>
            </div>

            {deleteSuccessMsg && (
              <p className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                {deleteSuccessMsg}
              </p>
            )}

            <div className="flex justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition border border-slate-200 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteOrderConfirm}
                disabled={deleteLoading}
                className="bg-rose-600 hover:bg-rose-500 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-lg shadow-rose-600/30 transition disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Confirm Delete Bill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Invoice / Bill Viewer Modal */}
      <ViewInvoiceModal
        isOpen={isBillModalOpen}
        onClose={() => setIsBillModalOpen(false)}
        order={selectedOrderForBill}
        onDeleteOrder={(ord) => setOrderToDelete(ord)}
      />

      {/* Historical Orders Migration Modal */}
      <DataMigrationModal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
        initialModule="orders"
        onSuccess={fetchOrders}
      />
    </div>
  );
};

export default OrdersPage;
