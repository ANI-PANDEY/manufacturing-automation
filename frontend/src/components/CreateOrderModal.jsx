import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Plus, Trash2, CheckCircle2, AlertCircle, Package, Scale } from 'lucide-react';
import { orderService, inventoryService } from '../services/api';
import { formatCurrency } from '../utils/exportUtils';

const CreateOrderModal = ({ isOpen, onClose, parties = [], onSuccess }) => {
  const [partyId, setPartyId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [taxRate, setTaxRate] = useState(18);
  const [dispatchNotes, setDispatchNotes] = useState('');

  const [availableProducts, setAvailableProducts] = useState([]);
  const [items, setItems] = useState([
    { productId: '', bags: '', qtyPerBag: '', quantity: 1, unitPrice: 0, unit: 'Kg' },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    try {
      const res = await inventoryService.getProducts();
      if (res.data?.success) {
        setAvailableProducts(res.data.products || []);
      }
    } catch (err) {
      console.error('Error loading products:', err);
    }
  };

  if (!isOpen) return null;

  const handleProductSelect = (index, productId) => {
    const prod = availableProducts.find((p) => p._id === productId);
    const newItems = [...items];
    newItems[index].productId = productId;
    if (prod) {
      newItems[index].unitPrice = prod.unitPrice || 0;
      newItems[index].unit = prod.unit || 'Kg';
    }
    setItems(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    const updated = { ...newItems[index], [field]: value };

    const bags = Number(updated.bags) || 0;
    const qtyPerBag = Number(updated.qtyPerBag) || 0;

    // Auto calculate total weight / quantity if bags and qtyPerBag are provided
    if (field === 'bags' || field === 'qtyPerBag') {
      if (bags > 0 && qtyPerBag > 0) {
        updated.quantity = Math.round((bags * qtyPerBag + Number.EPSILON) * 100) / 100;
      }
    }

    newItems[index] = updated;
    setItems(newItems);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      { productId: '', bags: '', qtyPerBag: '', quantity: 1, unitPrice: 0, unit: 'Kg' },
    ]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Live total calculation with float precision safety
  const totalBags = items.reduce((acc, curr) => acc + (Number(curr.bags) || 0), 0);
  const totalWeight = Math.round((items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0) + Number.EPSILON) * 100) / 100;
  const subtotal = Math.round((items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0) * (Number(curr.unitPrice) || 0), 0) + Number.EPSILON) * 100) / 100;
  const taxAmount = Math.round(((subtotal * (Number(taxRate) || 0)) / 100 + Number.EPSILON) * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount + Number.EPSILON) * 100) / 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!partyId) {
      setError('Please select a Party / Customer');
      return;
    }

    const invalidItem = items.find((i) => !i.productId || Number(i.quantity) <= 0);
    if (invalidItem) {
      setError('Please select a valid product and quantity (> 0) for all rows');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        partyId,
        orderDate,
        taxRate: Number(taxRate) || 0,
        dispatchNotes,
        items: items.map((i) => ({
          productId: i.productId,
          bags: Number(i.bags) || 0,
          qtyPerBag: Number(i.qtyPerBag) || 0,
          quantity: Math.round((Number(i.quantity) + Number.EPSILON) * 10000) / 10000,
          unitPrice: Math.round((Number(i.unitPrice) + Number.EPSILON) * 100) / 100,
        })),
      };

      const res = await orderService.create(payload);
      if (res.data?.success) {
        onSuccess && onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sky-500/20 bg-gradient-to-r from-slate-900 via-sky-950/50 to-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-sm">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Create Dispatch Invoice</h3>
              <p className="text-xs text-slate-300">Itemized billing with Bags (बोरी), Qty/Bag (kg), & auto-stock deduction</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800/60 p-2 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-5">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl p-3 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Select Customer / Party <span className="text-rose-500">*</span>
              </label>
              <select
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                required
              >
                <option value="">-- Choose Party --</option>
                {parties.map((p) => {
                  const cleanPh = p.phone ? p.phone.replace(/\D/g, '').slice(-10) : '';
                  return (
                    <option key={p._id} value={p._id}>
                      {p.name} {cleanPh ? `(📞 +91 ${cleanPh})` : ''} {p.gstin ? `[GST: ${p.gstin}]` : ''}
                    </option>
                  );
                })}
              </select>
              {partyId && (() => {
                const sel = parties.find((p) => p._id === partyId);
                if (!sel) return null;
                const ph = sel.phone ? sel.phone.replace(/\D/g, '').slice(-10) : '';
                return (
                  <div className="mt-1.5 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-xs flex items-center justify-between">
                    <span className="font-bold text-sky-900 dark:text-sky-200">
                      Customer Contact: <span className="font-mono text-sky-600 dark:text-sky-400 font-extrabold">{ph ? `+91 ${ph}` : 'No phone registered'}</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">GST: {sel.gstin || 'Unregistered'}</span>
                  </div>
                );
              })()}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Order / Dispatch Date</label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                required
              />
            </div>
          </div>

          {/* Item Breakdown Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-sky-500" />
                <span>Items, Bags (बोरी) & Quantity Breakdown</span>
              </label>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center space-x-1 text-xs text-sky-600 dark:text-sky-400 hover:text-sky-500 font-bold bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/50 px-2.5 py-1 rounded-lg border border-sky-200 dark:border-sky-800 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Item Row</span>
              </button>
            </div>

            {/* Desktop Table Header */}
            <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2 border border-slate-200 dark:border-slate-700/60">
              <div className="col-span-4">Item / Product Name</div>
              <div className="col-span-2 text-center">Bags / Pcs (बोरी)</div>
              <div className="col-span-2 text-center">Qty / Bag (kg)</div>
              <div className="col-span-2 text-center">Total Wt / Qty</div>
              <div className="col-span-2 text-right pr-6">Rate (₹) & Amount</div>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 items-center transition hover:border-sky-500/40">
                  {/* Product Selection */}
                  <div className="sm:col-span-4">
                    <label className="block sm:hidden text-[10px] font-bold text-slate-500 uppercase mb-0.5">Product</label>
                    <select
                      value={item.productId}
                      onChange={(e) => handleProductSelect(idx, e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      required
                    >
                      <option value="">-- Select Product --</option>
                      {availableProducts.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.productName} (Stock: {p.stockQuantity} {p.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bags / Pcs */}
                  <div className="sm:col-span-2">
                    <label className="block sm:hidden text-[10px] font-bold text-slate-500 uppercase mb-0.5">Bags / Pcs (बोरी)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Bags"
                        value={item.bags}
                        onChange={(e) => handleItemChange(idx, 'bags', e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-2.5 py-2 pr-9 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono text-center"
                      />
                      <span className="absolute right-2 top-2 text-[10px] text-slate-400 pointer-events-none font-sans">bags</span>
                    </div>
                  </div>

                  {/* Qty / Bag (kg) */}
                  <div className="sm:col-span-2">
                    <label className="block sm:hidden text-[10px] font-bold text-slate-500 uppercase mb-0.5">Qty / Bag (kg)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="kg/bag"
                        value={item.qtyPerBag}
                        onChange={(e) => handleItemChange(idx, 'qtyPerBag', e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-2.5 py-2 pr-11 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono text-center"
                      />
                      <span className="absolute right-2 top-2 text-[10px] text-slate-400 pointer-events-none font-sans">kg/bag</span>
                    </div>
                  </div>

                  {/* Total Weight / Quantity */}
                  <div className="sm:col-span-2">
                    <label className="block sm:hidden text-[10px] font-bold text-slate-500 uppercase mb-0.5">Total Quantity / Weight</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0.0001"
                        step="any"
                        placeholder="Total Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-2.5 py-2 pr-7 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono font-bold text-center"
                        required
                      />
                      <span className="absolute right-2 top-2 text-[10px] text-sky-500 font-bold pointer-events-none">{item.unit || 'Kg'}</span>
                    </div>
                  </div>

                  {/* Rate, Line Subtotal & Delete */}
                  <div className="sm:col-span-2 flex items-center space-x-1.5">
                    <div className="flex-1">
                      <label className="block sm:hidden text-[10px] font-bold text-slate-500 uppercase mb-0.5">Rate (₹)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="Rate ₹"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-2 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                        required
                      />
                    </div>
                    <div className="text-right font-black text-xs text-slate-900 dark:text-white font-mono min-w-[65px] pt-4 sm:pt-0">
                      {formatCurrency(Math.round(((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) + Number.EPSILON) * 100) / 100)}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition pt-4 sm:pt-1.5"
                      title="Remove row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Bags & Weight Breakdown Summary Banner */}
            <div className="mt-3 flex flex-wrap items-center justify-between px-4 py-2.5 bg-gradient-to-r from-sky-50 to-indigo-50/50 dark:from-sky-950/30 dark:to-indigo-950/20 rounded-2xl border border-sky-200 dark:border-sky-800/50 text-xs">
              <div className="flex items-center space-x-4 flex-wrap gap-y-1">
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  Total Bags: <strong className="text-sky-600 dark:text-sky-400 font-mono text-sm">{totalBags} Bags (बोरी)</strong>
                </span>
                <span className="text-slate-400 hidden sm:inline">•</span>
                <span className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-indigo-500 inline" />
                  Total Weight: <strong className="text-indigo-600 dark:text-indigo-400 font-mono text-sm">{totalWeight} kg</strong>
                </span>
              </div>
              <div className="font-extrabold text-slate-900 dark:text-white">
                Goods Value: <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm">{formatCurrency(subtotal)}</span>
              </div>
            </div>
          </div>

          {/* Tax & Total Calculation */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center space-x-2">
                <span>GST Tax Rate (%)</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-lg px-2 py-0.5 font-mono"
                />
              </div>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{formatCurrency(taxAmount)}</span>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between text-sm font-extrabold text-slate-900 dark:text-white">
              <span>Total Bill Amount</span>
              <span className="text-sky-600 dark:text-sky-400 text-base font-mono font-black">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Dispatch Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Dispatch & Delivery Remarks</label>
            <input
              type="text"
              placeholder="e.g. Shipped via Transport Co. Vehicle No. MH04AB1234"
              value={dispatchNotes}
              onChange={(e) => setDispatchNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-lg shadow-sky-600/30 transition border border-sky-400/30 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Generate Invoice & Deduct Stock</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrderModal;
