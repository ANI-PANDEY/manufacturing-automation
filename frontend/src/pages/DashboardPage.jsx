import React, { useState, useEffect } from 'react';
import {
  Users,
  CreditCard,
  ShoppingCart,
  Boxes,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Plus,
  ChevronRight,
  TrendingUp,
  Database,
  FileSpreadsheet,
} from 'lucide-react';
import QuickStartGuide from '../components/QuickStartGuide';
import { partyService, orderService, inventoryService } from '../services/api';
import { formatCurrency } from '../utils/exportUtils';

const DashboardPage = ({
  onNavigate,
  onOpenPaymentModal,
  onOpenOrderModal,
  onOpenInwardModal,
  onOpenMigrationModal,
  refreshTrigger,
}) => {
  const [parties, setParties] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [refreshTrigger]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [partyRes, orderRes, prodRes, rawRes] = await Promise.all([
        partyService.getAll(),
        orderService.getAll(),
        inventoryService.getProducts(),
        inventoryService.getRawMaterials(),
      ]);

      if (partyRes.data?.success) setParties(partyRes.data.parties || []);
      if (orderRes.data?.success) setRecentOrders(orderRes.data.orders || []);
      if (prodRes.data?.success) setProducts(prodRes.data.products || []);
      if (rawRes.data?.success) setRawMaterials(rawRes.data.rawMaterials || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalOutstandingDue = parties.reduce((acc, curr) => acc + (Number(curr.currentBalance) || 0), 0);
  const totalOrdersCount = recentOrders.length;
  const unpaidOrdersCount = recentOrders.filter((o) => o.paymentStatus !== 'PAID').length;
  const lowStockCount = products.filter((p) => p.stockQuantity <= p.minStockLevel).length;

  return (
    <div className="space-y-6">
      {/* Quick Onboarding Guide */}
      <QuickStartGuide onNavigate={onNavigate} />

      {/* Migration & Old Data Import Hub Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm sm:text-base font-black text-white">
                Migrate Previous Bahi-Khata or Excel Data
              </h3>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                पुरानी डेटा एंट्री
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Import customers with old pending balances, warehouse opening stock, and past bills without manual re-calculation.
            </p>
          </div>
        </div>
        <button
          onClick={() => onOpenMigrationModal && onOpenMigrationModal('parties')}
          className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 active:scale-95 shrink-0 border border-indigo-400/30"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
          <span>Import Old Data / Excel</span>
        </button>
      </div>

      {/* KPI Stats Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Outstanding */}
        <div
          onClick={() => onNavigate('ledger')}
          className="bg-gradient-to-br from-amber-500/10 via-white dark:via-slate-900 to-amber-500/5 border border-amber-200/80 dark:border-amber-500/30 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-amber-400 dark:hover:border-amber-500/50 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Total Outstanding Due
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white block mt-2 font-mono">
            {formatCurrency(totalOutstandingDue)}
          </span>
          <span className="text-[11px] text-amber-600/80 dark:text-amber-400/80 block mt-1 font-medium">
            Pending collection from {parties.filter((p) => p.currentBalance > 0).length} accounts
          </span>
        </div>

        {/* Metric 2: Dispatch Orders */}
        <div
          onClick={() => onNavigate('orders')}
          className="bg-gradient-to-br from-sky-500/10 via-white dark:via-slate-900 to-sky-500/5 border border-sky-200/80 dark:border-sky-500/30 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-sky-400 dark:hover:border-sky-500/50 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
              B2B Dispatch Orders
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white block mt-2 font-mono">
            {totalOrdersCount} Invoices
          </span>
          <span className="text-[11px] text-sky-600/80 dark:text-sky-300 block mt-1 font-medium">
            {unpaidOrdersCount} pending full settlement
          </span>
        </div>

        {/* Metric 3: Active Parties */}
        <div
          onClick={() => onNavigate('parties')}
          className="bg-gradient-to-br from-indigo-500/10 via-white dark:via-slate-900 to-indigo-500/5 border border-indigo-200/80 dark:border-indigo-500/30 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-500/50 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
              Active Parties
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white block mt-2 font-mono">
            {parties.length} Accounts
          </span>
          <span className="text-[11px] text-indigo-600/80 dark:text-indigo-300 block mt-1 font-medium">
            Customers & Raw Material Vendors
          </span>
        </div>

        {/* Metric 4: Inventory */}
        <div
          onClick={() => onNavigate('inventory')}
          className="bg-gradient-to-br from-emerald-500/10 via-white dark:via-slate-900 to-emerald-500/5 border border-emerald-200/80 dark:border-emerald-500/30 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-400 dark:hover:border-emerald-500/50 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Inventory & Products
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white block mt-2 font-mono">
            {products.length} Products
          </span>
          <span className={`text-[11px] block mt-1 font-bold ${lowStockCount > 0 ? 'text-rose-500 dark:text-rose-400 animate-pulse' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {lowStockCount > 0 ? `⚠️ ${lowStockCount} items below min stock!` : '✓ All stock levels healthy'}
          </span>
        </div>
      </div>

      {/* Main Grid: Quick Action Buttons & Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Quick Action Touch Buttons */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 tracking-tight">Quick Actions</h3>

          <div className="space-y-3">
            <button
              onClick={() => onOpenPaymentModal('')}
              className="w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white p-4 rounded-2xl font-extrabold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-between transition transform hover:-translate-y-0.5 active:scale-98"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center shadow-sm">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="block leading-none font-black text-base">Receive Payment</span>
                  <span className="text-[11px] font-medium text-emerald-100 mt-1 block">Record customer cash/bank entry</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/80" />
            </button>

            <button
              onClick={onOpenOrderModal}
              className="w-full bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white p-4 rounded-2xl font-extrabold text-sm shadow-lg shadow-sky-500/25 flex items-center justify-between transition transform hover:-translate-y-0.5 active:scale-98"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center shadow-sm">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="block leading-none font-black text-base">Create Dispatch Invoice</span>
                  <span className="text-[11px] font-medium text-sky-100 mt-1 block">Bill customer & deduct stock</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/80" />
            </button>

            <button
              onClick={onOpenInwardModal}
              className="w-full bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/40 hover:border-purple-400 dark:hover:border-purple-600/70 text-slate-800 dark:text-slate-100 p-4 rounded-2xl font-bold text-sm flex items-center justify-between transition shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-sm">
                  <Boxes className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="block leading-none font-black">Inward Raw Material</span>
                  <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-1 block">Receive stock batch from vendor</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-purple-500" />
            </button>

            <button
              onClick={() => onNavigate('ledger')}
              className="w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/40 hover:border-amber-400 dark:hover:border-amber-600/70 text-slate-800 dark:text-slate-100 p-4 rounded-2xl font-bold text-sm flex items-center justify-between transition shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-sm">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="block leading-none font-black">Party Passbook Ledger</span>
                  <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-1 block">Export PDF / Excel statement</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-amber-500" />
            </button>
          </div>
        </div>

        {/* Right Column: Recent Dispatch Orders & Statuses */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 tracking-tight">Recent Dispatch Orders</h3>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition flex items-center gap-1"
            >
              <span>View All Orders</span>
              <span>&rarr;</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden transition-colors">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentOrders.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs">
                  No dispatch orders created yet. Click "+ Create Dispatch Invoice" to generate your first invoice.
                </div>
              ) : (
                recentOrders.slice(0, 5).map((ord) => (
                  <div
                    key={ord._id}
                    onClick={() => onNavigate('ledger')}
                    className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-extrabold text-xs text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800/60">
                          {ord.orderNumber}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{ord.party?.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Date: {new Date(ord.orderDate).toLocaleDateString('en-IN')} | Total: <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(ord.totalAmount)}</span>
                      </p>
                    </div>

                    <div className="text-right space-y-1">
                      <span className="font-mono font-extrabold text-xs text-amber-600 dark:text-amber-400 block">
                        Due: {formatCurrency(ord.balanceDue)}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full inline-block border ${
                          ord.paymentStatus === 'PAID'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : ord.paymentStatus === 'PARTIAL'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {ord.paymentStatus}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
