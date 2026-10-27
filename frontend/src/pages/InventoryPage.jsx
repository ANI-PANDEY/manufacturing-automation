import React, { useState, useEffect } from 'react';
import {
  Boxes,
  PackagePlus,
  Plus,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Trash2,
  TrendingUp,
  PackageCheck,
  Layers,
  Sparkles,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  X,
  Database,
} from 'lucide-react';
import { inventoryService } from '../services/api';
import { formatCurrency } from '../utils/exportUtils';
import { useIndustry } from '../context/IndustryContext';
import RestockModal from '../components/RestockModal';
import BulkUploadProductModal from '../components/BulkUploadProductModal';
import DataMigrationModal from '../components/DataMigrationModal';

const InventoryPage = ({ onOpenInwardModal, refreshTrigger }) => {
  const { activePreset } = useIndustry();

  const [activeSubTab, setActiveSubTab] = useState('products'); // 'products' or 'raw'
  const [rawMaterials, setRawMaterials] = useState([]);
  const [products, setProducts] = useState([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'LOW_STOCK', 'IN_STOCK'

  // Restock Modal state
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [restockTargetItem, setRestockTargetItem] = useState(null);
  const [restockItemType, setRestockItemType] = useState('product');

  // Bulk Upload Modal state
  const [bulkUploadModalOpen, setBulkUploadModalOpen] = useState(false);
  const [importNotification, setImportNotification] = useState(null);
  const [recentlyImportedSkus, setRecentlyImportedSkus] = useState([]);

  // Data Migration Modal state (Old Data / Excel Import)
  const [migrationModalOpen, setMigrationModalOpen] = useState(false);
  const [migrationModule, setMigrationModule] = useState('rawMaterials');

  // Add Product Modal state
  const [showProductModal, setShowProductModal] = useState(false);
  const [prodName, setProdName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState(activePreset.categories[0] || 'General');
  const [unit, setUnit] = useState(activePreset.defaultUnits[0] || 'Pieces');
  const [customUnit, setCustomUnit] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [minStockLevel, setMinStockLevel] = useState('10');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, [refreshTrigger]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const rawRes = await inventoryService.getRawMaterials();
      if (rawRes.data?.success) {
        setRawMaterials(rawRes.data.rawMaterials || []);
      }

      const prodRes = await inventoryService.getProducts();
      if (prodRes.data?.success) {
        setProducts(prodRes.data.products || []);
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const finalUnit = unit === 'OTHER' ? (customUnit.trim() || 'Units') : unit;

      const res = await inventoryService.createProduct({
        productName: prodName,
        sku: sku || `SKU-${Date.now().toString().slice(-6)}`,
        category,
        unit: finalUnit,
        stockQuantity: Number(stockQuantity || 0),
        unitPrice: Number(unitPrice),
        minStockLevel: Number(minStockLevel || 10),
      });

      if (res.data?.success) {
        setProdName('');
        setSku('');
        setStockQuantity('');
        setUnitPrice('');
        setCustomUnit('');
        setShowProductModal(false);
        setActiveSubTab('products'); // Switch to products tab so user sees their added product!
        fetchInventory();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleOpenRestockForItem = (item, type) => {
    setRestockTargetItem(item);
    setRestockItemType(type);
    setRestockModalOpen(true);
  };

  const handleDeleteItem = async (id, type, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from inventory?`)) return;

    try {
      if (type === 'product') {
        await inventoryService.deleteProduct(id);
      } else {
        await inventoryService.deleteRawMaterial(id);
      }
      fetchInventory();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to delete item');
    }
  };

  // Filter calculations
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(searchQuery.toLowerCase());

    const isLow = p.stockQuantity <= (p.minStockLevel || 10);
    if (statusFilter === 'LOW_STOCK') return matchesSearch && isLow;
    if (statusFilter === 'IN_STOCK') return matchesSearch && !isLow;
    return matchesSearch;
  });

  const filteredRawMaterials = rawMaterials.filter((m) => {
    const matchesSearch =
      m.materialName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.vendor?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const isLow = m.quantityInStock <= 10;
    if (statusFilter === 'LOW_STOCK') return matchesSearch && isLow;
    if (statusFilter === 'IN_STOCK') return matchesSearch && !isLow;
    return matchesSearch;
  });

  // KPI Calculations
  const lowStockProductsCount = products.filter((p) => p.stockQuantity <= (p.minStockLevel || 10)).length;
  const lowStockRawCount = rawMaterials.filter((m) => m.quantityInStock <= 10).length;
  const totalLowStock = lowStockProductsCount + lowStockRawCount;

  const totalProductValuation = products.reduce((acc, p) => acc + (p.stockQuantity * p.unitPrice), 0);
  const totalRawValuation = rawMaterials.reduce((acc, m) => acc + (m.quantityInStock * m.unitPrice), 0);
  const grandTotalValuation = totalProductValuation + totalRawValuation;

  return (
    <div className="space-y-6">
      {/* Live Data Import Notification Banner */}
      {importNotification && (
        <div className="p-4 sm:p-5 rounded-3xl bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-950 dark:text-emerald-100 flex items-center justify-between shadow-xl animate-fadeIn">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold shadow-lg shadow-emerald-500/30 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm sm:text-base flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
                <span>Products Successfully Loaded Into Software!</span>
                <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                  LIVE IN CATALOG
                </span>
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium mt-0.5">
                Imported from <span className="font-bold underline">{importNotification.fileName}</span>: {importNotification.createdCount} new products added, {importNotification.updatedCount} existing rates updated right now.
              </p>
            </div>
          </div>
          <button
            onClick={() => setImportNotification(null)}
            className="p-2 rounded-xl hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 transition"
            title="Dismiss notification"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Top Header & Quick Action Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-purple-500/20 p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center space-x-2">
            <span className="bg-purple-500/20 text-purple-300 font-extrabold text-[10px] px-2.5 py-1 rounded-full border border-purple-500/30 uppercase tracking-wider">
              {activePreset.badge}
            </span>
            <span className="text-xs text-slate-400 font-mono">Real-time Stock Control</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Boxes className="w-5 h-5 text-purple-400" />
            <span>Inventory & Stock Asset Manager</span>
          </h2>
          <p className="text-xs text-slate-300">
            Track {activePreset.rawMaterialLabel.toLowerCase()}, {activePreset.productLabel.toLowerCase()}, & quick restock controls
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 z-10">
          <button
            onClick={() => {
              setMigrationModule(activeSubTab === 'raw' ? 'rawMaterials' : 'products');
              setMigrationModalOpen(true);
            }}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2.5 rounded-2xl text-xs font-extrabold shadow-lg shadow-emerald-600/25 transition transform hover:-translate-y-0.5 active:scale-95"
            title="Import old stock registers, bahi-khata or Excel sheets"
          >
            <Database className="w-4 h-4 text-white" />
            <span>Import Old Stock / Excel (पुरानी एंट्री)</span>
          </button>

          <button
            onClick={() => setBulkUploadModalOpen(true)}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white px-4 py-2.5 rounded-2xl text-xs font-extrabold shadow-lg shadow-orange-500/25 transition transform hover:-translate-y-0.5 active:scale-95"
            title="Upload CSV, Excel, or PDF price list to create items or update rates in bulk"
          >
            <FileSpreadsheet className="w-4 h-4 text-white" />
            <span>Bulk Upload (CSV / Excel / PDF)</span>
          </button>

          <button
            onClick={() => {
              setRestockTargetItem(null);
              setRestockItemType('product');
              setRestockModalOpen(true);
            }}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white px-4 py-2.5 rounded-2xl text-xs font-extrabold shadow-lg shadow-teal-600/25 transition transform hover:-translate-y-0.5 active:scale-95"
          >
            <RefreshCw className="w-4 h-4 text-white" />
            <span>+ Quick Restock</span>
          </button>

          <button
            onClick={() => setShowProductModal(true)}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white px-4 py-2.5 rounded-2xl text-xs font-extrabold shadow-lg shadow-indigo-600/25 transition transform hover:-translate-y-0.5 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ {activePreset.productButtonLabel}</span>
          </button>

          <button
            onClick={onOpenInwardModal}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-4 py-2.5 rounded-2xl text-xs font-extrabold shadow-lg shadow-purple-600/25 transition transform hover:-translate-y-0.5 active:scale-95"
          >
            <PackagePlus className="w-4 h-4" />
            <span>+ {activePreset.inwardButtonLabel}</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase">{activePreset.productLabel.split(' ')[0]} Items</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{products.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase">{activePreset.rawMaterialLabel.split(' ')[0]} Batches</p>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{rawMaterials.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-sm">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase">Low Stock Alerts</p>
            <p className={`text-2xl font-black mt-1 ${totalLowStock > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {totalLowStock}
            </p>
          </div>
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-sm ${totalLowStock > 0 ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase">Total Stock Valuation</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">{formatCurrency(grandTotalValuation)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Controls Bar: Sub-Tabs & Live Search & Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        {/* Tab Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveSubTab('products')}
            className={`px-4 py-2.5 text-xs font-extrabold rounded-2xl transition flex items-center space-x-2 ${
              activeSubTab === 'products'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/25 border border-indigo-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>{activePreset.productLabel} ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('raw')}
            className={`px-4 py-2.5 text-xs font-extrabold rounded-2xl transition flex items-center space-x-2 ${
              activeSubTab === 'raw'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/25 border border-purple-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{activePreset.rawMaterialLabel} ({rawMaterials.length})</span>
          </button>
        </div>

        {/* Search & Status Filter Controls */}
        <div className="flex items-center space-x-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder={`Search ${activeSubTab === 'products' ? 'Product, SKU, Category...' : 'Material, Batch, Supplier...'}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs rounded-2xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-2 py-1 shadow-sm">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 ml-1" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-none py-1 cursor-pointer"
            >
              <option value="ALL">All Stock Levels</option>
              <option value="LOW_STOCK">Low Stock Alerts</option>
              <option value="IN_STOCK">Optimal Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Tab Table */}
      {activeSubTab === 'products' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[850px] text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-extrabold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-4 px-4">SKU Code</th>
                  <th className="py-4 px-4">Item Name</th>
                  <th className="py-4 px-4">Category</th>
                  <th className="py-4 px-4">Unit</th>
                  <th className="py-4 px-4 text-right">Stock Quantity</th>
                  <th className="py-4 px-4 text-right">Selling Price (₹)</th>
                  <th className="py-4 px-4 text-right">Total Valuation</th>
                  <th className="py-4 px-4">Stock Status</th>
                  <th className="py-4 px-4 text-center">Restock Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-slate-400">
                      No matching products found in inventory catalog.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isLow = p.stockQuantity <= (p.minStockLevel || 10);
                    const isRecentlyImported = recentlyImportedSkus.includes(p.sku?.toUpperCase());
                    return (
                      <tr
                        key={p._id}
                        className={`transition group ${
                          isRecentlyImported
                            ? 'bg-emerald-500/10 dark:bg-emerald-950/30 border-l-4 border-emerald-500'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-4 px-4 font-mono font-extrabold text-indigo-600 dark:text-indigo-400">
                          <div className="flex items-center gap-1.5">
                            <span>{p.sku}</span>
                            {isRecentlyImported && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500 text-white shadow-sm shrink-0">
                                IMPORTED
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">{p.productName}</td>
                        <td className="py-4 px-4 text-slate-500 dark:text-slate-400 font-medium">{p.category}</td>
                        <td className="py-4 px-4">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-mono text-[11px] border border-slate-200 dark:border-slate-700">
                            {p.unit}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-black text-slate-900 dark:text-white text-sm">
                          {p.stockQuantity}
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-100">
                          {formatCurrency(p.unitPrice)}
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(p.stockQuantity * p.unitPrice)}
                        </td>
                        <td className="py-4 px-4">
                          {isLow ? (
                            <span className="inline-flex items-center space-x-1 bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[10px] font-black px-2.5 py-1 rounded-full border border-rose-500/30">
                              <AlertTriangle className="w-3 h-3 text-rose-500" />
                              <span>LOW STOCK</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2.5 py-1 rounded-full border border-emerald-500/30">
                              <ShieldCheck className="w-3 h-3 text-emerald-500" />
                              <span>OPTIMAL</span>
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleOpenRestockForItem(p, 'product')}
                              title="Restock Stock for this product"
                              className="inline-flex items-center space-x-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 font-extrabold text-[11px] px-3 py-1.5 rounded-xl transition transform active:scale-95 shadow-sm"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
                              <span>+ Restock</span>
                            </button>

                            <button
                              onClick={() => handleDeleteItem(p._id, 'product', p.productName)}
                              title="Delete Item from Inventory"
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Raw Materials Tab Table */}
      {activeSubTab === 'raw' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[850px] text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-extrabold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-4 px-4">Batch Number</th>
                  <th className="py-4 px-4">Material / Item Name</th>
                  <th className="py-4 px-4">Vendor / Supplier</th>
                  <th className="py-4 px-4">Unit</th>
                  <th className="py-4 px-4 text-right">Inward Stock Qty</th>
                  <th className="py-4 px-4 text-right">Purchase Rate (₹)</th>
                  <th className="py-4 px-4 text-right">Valuation</th>
                  <th className="py-4 px-4">Received Date</th>
                  <th className="py-4 px-4 text-center">Restock Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {filteredRawMaterials.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-slate-400">
                      No matching raw material batches found.
                    </td>
                  </tr>
                ) : (
                  filteredRawMaterials.map((rm) => (
                    <tr key={rm._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group">
                      <td className="py-4 px-4 font-mono font-extrabold text-purple-600 dark:text-purple-400">
                        {rm.batchNumber}
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">{rm.materialName}</td>
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-300 font-medium">{rm.vendor?.name || 'N/A'}</td>
                      <td className="py-4 px-4">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-mono text-[11px] border border-slate-200 dark:border-slate-700">
                          {rm.unit}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-black text-slate-900 dark:text-white text-sm">
                        {rm.quantityInStock}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-slate-800 dark:text-slate-300 font-semibold">
                        {formatCurrency(rm.unitPrice)}
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                        {formatCurrency(rm.quantityInStock * rm.unitPrice)}
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-500 dark:text-slate-400">
                        {new Date(rm.receivedDate || rm.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleOpenRestockForItem(rm, 'raw')}
                            title="Restock Stock for this raw material batch"
                            className="inline-flex items-center space-x-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 font-extrabold text-[11px] px-3 py-1.5 rounded-xl transition transform active:scale-95 shadow-sm"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-purple-500" />
                            <span>+ Restock</span>
                          </button>

                          <button
                            onClick={() => handleDeleteItem(rm._id, 'raw', rm.materialName)}
                            title="Delete Batch from Inventory"
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
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
      )}

      {/* Global Restock Modal */}
      <RestockModal
        isOpen={restockModalOpen}
        onClose={() => setRestockModalOpen(false)}
        targetItem={restockTargetItem}
        itemType={restockItemType}
        availableProducts={products}
        availableRawMaterials={rawMaterials}
        onSuccess={() => fetchInventory()}
      />

      {/* Bulk Upload Product & Rate Updater Modal */}
      <BulkUploadProductModal
        isOpen={bulkUploadModalOpen}
        onClose={() => setBulkUploadModalOpen(false)}
        existingProducts={products}
        onSuccess={(summary) => {
          fetchInventory();
          setActiveSubTab('products');
          if (summary) {
            setImportNotification(summary);
            if (summary.importedSkus?.length) {
              setRecentlyImportedSkus(summary.importedSkus);
            }
          }
        }}
      />

      {/* Add Product Item Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Add {activePreset.productButtonLabel}</span>
              <span className="text-[10px] bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-mono px-2 py-0.5 rounded-full border border-indigo-500/30">
                {activePreset.badge}
              </span>
            </h3>

            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Item / Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Heavy Duty Steel Pipes 50mm / Cotton Shirt"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">SKU / Item Code</label>
                  <input
                    type="text"
                    placeholder="e.g. SK-1002"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2 uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2"
                  >
                    {activePreset.categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Unit of Measure</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2"
                  >
                    {activePreset.defaultUnits.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                    <option value="OTHER">Custom Unit...</option>
                  </select>
                </div>

                {unit === 'OTHER' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Enter Custom Unit</label>
                    <input
                      type="text"
                      placeholder="e.g. Can, Box, Barrel"
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Min Alert Level</label>
                    <input
                      type="number"
                      value={minStockLevel}
                      onChange={(e) => setMinStockLevel(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Opening Stock Qty</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 100"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Selling Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1500"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-lg shadow-indigo-600/30"
                >
                  Save & Add to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Old Data Migration Modal */}
      <DataMigrationModal
        isOpen={migrationModalOpen}
        onClose={() => setMigrationModalOpen(false)}
        initialModule={migrationModule}
        onSuccess={fetchInventory}
      />
    </div>
  );
};

export default InventoryPage;
