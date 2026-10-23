import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { orderService, inventoryService } from '../services/api';
import { formatCurrency } from '../utils/exportUtils';

const CreateOrderModal = ({ isOpen, onClose, parties = [], onSuccess }) => {
  const [partyId, setPartyId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [taxRate, setTaxRate] = useState(18);
  const [dispatchNotes, setDispatchNotes] = useState('');

  const [availableProducts, setAvailableProducts] = useState([]);
  const [items, setItems] = useState([
    { productId: '', quantity: 1, unitPrice: 0, unit: 'Pieces' },
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
      newItems[index].unit = prod.unit || 'Pieces';
    }
    setItems(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItemRow = () => {
    setItems([...items, { productId: '', quantity: 1, unitPrice: 0, unit: 'Pieces' }]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Live total calculation
  const subtotal = items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0) * (Number(curr.unitPrice) || 0), 0);
  const taxAmount = (subtotal * Number(taxRate)) / 100;
  const totalAmount = subtotal + taxAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!partyId) {
      setError('Please select a Party/Customer');
      return;
    }

    const invalidItem = items.find((i) => !i.productId || i.quantity <= 0);
    if (invalidItem) {
      setError('Please select a valid product and quantity (> 0) for all rows');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        partyId,
        orderDate,
        taxRate: Number(taxRate),
        dispatchNotes,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sky-500/20 bg-gradient-to-r from-slate-900 via-sky-950/50 to-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-sm">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Create Dispatch Invoice</h3>
              <p className="text-xs text-slate-300">Generate B2B order & update stock automatically</p>
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
                {parties.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.gstin || 'No GSTIN'})
                  </option>
                ))}
              </select>
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
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">Items & Finished Goods</label>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center space-x-1 text-xs text-sky-600 dark:text-sky-400 hover:text-sky-500 font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Item Row</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex-1">
                    <select
                      value={item.productId}
                      onChange={(e) => handleProductSelect(idx, e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      required
                    >
                      <option value="">-- Select Product --</option>
                      {availableProducts.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.productName} (Stock: {p.stockQuantity} {p.unit}) - {formatCurrency(p.unitPrice)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-24">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                      required
                    />
                  </div>

                  <div className="w-28">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Rate ₹"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                      required
                    />
                  </div>

                  <div className="w-28 text-right font-black text-xs text-slate-900 dark:text-white pr-2 font-mono">
                    {formatCurrency((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItemRow(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
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
