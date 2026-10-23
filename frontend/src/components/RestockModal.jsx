import React, { useState, useEffect } from 'react';
import { X, RefreshCw, CheckCircle2, AlertCircle, PlusCircle, PackageCheck, Layers } from 'lucide-react';
import { inventoryService } from '../services/api';
import { formatCurrency } from '../utils/exportUtils';
import { useIndustry } from '../context/IndustryContext';

const RestockModal = ({
  isOpen,
  onClose,
  targetItem = null,
  itemType = 'product', // 'product' or 'raw'
  availableProducts = [],
  availableRawMaterials = [],
  onSuccess,
}) => {
  const { activePreset } = useIndustry();
  const [selectedId, setSelectedId] = useState('');
  const [type, setType] = useState('product');
  const [quantityToAdd, setQuantityToAdd] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [batchRef, setBatchRef] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccessMsg('');
      setType(itemType || 'product');
      if (targetItem) {
        setSelectedId(targetItem._id || '');
        setUnitPrice(targetItem.unitPrice || '');
      } else {
        setSelectedId('');
        setUnitPrice('');
      }
      setQuantityToAdd('');
      setBatchRef('');
      setNotes('');
    }
  }, [isOpen, targetItem, itemType]);

  if (!isOpen) return null;

  // Resolve current active item
  let activeItem = targetItem;
  if (!activeItem && selectedId) {
    if (type === 'product') {
      activeItem = availableProducts.find((p) => p._id === selectedId);
    } else {
      activeItem = availableRawMaterials.find((m) => m._id === selectedId);
    }
  }

  const currentStock = activeItem ? (type === 'product' ? activeItem.stockQuantity : activeItem.quantityInStock) : 0;
  const currentUnit = activeItem ? activeItem.unit : 'Units';
  const itemName = activeItem ? (type === 'product' ? activeItem.productName : activeItem.materialName) : '';

  const addedQtyNum = Number(quantityToAdd) || 0;
  const newCalculatedStock = Number(currentStock) + addedQtyNum;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!selectedId && !targetItem?._id) {
      setError('Please select an item to restock');
      return;
    }

    if (!quantityToAdd || Number(quantityToAdd) <= 0) {
      setError('Please enter a valid stock quantity to add (> 0)');
      return;
    }

    try {
      setLoading(true);
      const targetId = targetItem?._id || selectedId;
      let res;

      if (type === 'product') {
        res = await inventoryService.restockProduct({
          productId: targetId,
          quantityToAdd: Number(quantityToAdd),
          unitPrice: unitPrice ? Number(unitPrice) : undefined,
          notes,
        });
      } else {
        res = await inventoryService.restockRawMaterial({
          materialId: targetId,
          quantityToAdd: Number(quantityToAdd),
          unitPrice: unitPrice ? Number(unitPrice) : undefined,
          notes,
        });
      }

      if (res.data?.success) {
        setSuccessMsg(res.data.message || 'Item restocked successfully!');
        setTimeout(() => {
          onSuccess && onSuccess(res.data);
          onClose();
        }, 700);
      } else {
        setError(res.data?.message || 'Failed to restock item');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to restock item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-teal-500/20 bg-gradient-to-r from-slate-900 via-teal-950/50 to-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-sm">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Restock & Add Stock Quantity</span>
                <span className="text-[10px] bg-teal-500/20 text-teal-300 font-extrabold px-2 py-0.5 rounded-full border border-teal-500/30 uppercase">
                  {activePreset.badge}
                </span>
              </h3>
              <p className="text-xs text-slate-300">Instantly refill stock for existing products or raw items</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800/60 p-2 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-4">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl p-3 flex items-center space-x-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl p-3 flex items-center space-x-2 font-extrabold">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Item Selector if no targetItem passed */}
          {!targetItem && (
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Category Type:</label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setType('product');
                      setSelectedId('');
                    }}
                    className={`px-3 py-1 text-xs font-extrabold rounded-xl transition border ${
                      type === 'product'
                        ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-indigo-500 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {activePreset.productLabel.split(' ')[0]} Items
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setType('raw');
                      setSelectedId('');
                    }}
                    className={`px-3 py-1 text-xs font-extrabold rounded-xl transition border ${
                      type === 'raw'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-500 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {activePreset.rawMaterialLabel.split(' ')[0]} Items
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Item to Restock <span className="text-rose-500">*</span>
                </label>
                {type === 'product' ? (
                  <select
                    value={selectedId}
                    onChange={(e) => {
                      setSelectedId(e.target.value);
                      const prod = availableProducts.find((p) => p._id === e.target.value);
                      if (prod) setUnitPrice(prod.unitPrice);
                    }}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  >
                    <option value="">-- Select Product --</option>
                    {availableProducts.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.productName} (Current Stock: {p.stockQuantity} {p.unit}) - SKU: {p.sku}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedId}
                    onChange={(e) => {
                      setSelectedId(e.target.value);
                      const rm = availableRawMaterials.find((m) => m._id === e.target.value);
                      if (rm) setUnitPrice(rm.unitPrice);
                    }}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  >
                    <option value="">-- Select Material / Item --</option>
                    {availableRawMaterials.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.materialName} (Current Stock: {m.quantityInStock} {m.unit}) - Batch: {m.batchNumber}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {/* Active Item Summary Card */}
          {activeItem && (
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Target Item:</span>
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                  {type === 'product' ? `SKU: ${activeItem.sku}` : `Batch: ${activeItem.batchNumber}`}
                </span>
              </div>
              <p className="text-sm font-black text-slate-900 dark:text-white">{itemName}</p>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Current Stock</span>
                  <span className="font-black font-mono text-slate-800 dark:text-slate-200 text-sm">
                    {currentStock} {currentUnit}
                  </span>
                </div>
                <div>
                  <span className="text-teal-600 dark:text-teal-400 block text-[11px] font-bold">New Stock After Restock</span>
                  <span className="font-black font-mono text-teal-600 dark:text-teal-400 text-sm">
                    {newCalculatedStock} {currentUnit}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quantity to Add & Unit Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Restock Quantity (+{currentUnit}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 50"
                value={quantityToAdd}
                onChange={(e) => setQuantityToAdd(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Updated Unit Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 1500"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>
          </div>

          {/* Ref / Batch Details */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Inward Batch / Supplier Ref (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Supplier Invoice #8841 / Fresh Production Lot"
              value={batchRef}
              onChange={(e) => setBatchRef(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Restock Remarks / Notes</label>
            <input
              type="text"
              placeholder="e.g. Stock received in warehouse 2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-lg shadow-teal-600/30 transition disabled:opacity-50"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Confirm Restock (+{addedQtyNum} {currentUnit})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RestockModal;
