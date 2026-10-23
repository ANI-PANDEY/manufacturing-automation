import React, { useState, useEffect } from 'react';
import { X, PackagePlus, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { inventoryService } from '../services/api';
import { useIndustry } from '../context/IndustryContext';

const InwardMaterialModal = ({ isOpen, onClose, parties = [], onSuccess }) => {
  const { activePreset } = useIndustry();

  const [materialName, setMaterialName] = useState('');
  const [category, setCategory] = useState(activePreset.categories[0] || 'General');
  const [vendorId, setVendorId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [unit, setUnit] = useState(activePreset.defaultUnits[0] || 'Kg');
  const [customUnit, setCustomUnit] = useState('');
  const [quantityInStock, setQuantityInStock] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setBatchNumber(`BATCH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
      if (activePreset.defaultUnits?.length) {
        setUnit(activePreset.defaultUnits[0]);
      }
      if (activePreset.categories?.length) {
        setCategory(activePreset.categories[0]);
      }
    }
  }, [isOpen, activePreset]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!materialName || !vendorId || !quantityInStock || !unitPrice) {
      setError('Please fill in all mandatory fields');
      return;
    }

    const finalUnit = unit === 'OTHER' ? (customUnit.trim() || 'Units') : unit;
    const finalBatch = batchNumber.trim() || `BATCH-${Date.now().toString().slice(-6)}`;

    try {
      setLoading(true);
      const res = await inventoryService.inwardRawMaterial({
        materialName,
        category,
        vendorId,
        batchNumber: finalBatch,
        unit: finalUnit,
        quantityInStock: Number(quantityInStock),
        unitPrice: Number(unitPrice),
        notes,
      });

      if (res.data?.success) {
        onSuccess && onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to record inward material');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/20 bg-gradient-to-r from-slate-900 via-purple-950/50 to-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-sm">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>{activePreset.inwardButtonLabel} Entry</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 font-mono px-2 py-0.5 rounded-full border border-purple-500/30">
                  {activePreset.badge}
                </span>
              </h3>
              <p className="text-xs text-slate-300">Receive stock batches from vendors & update inventory</p>
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-4">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl p-3 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {activePreset.rawMaterialLabel.split(' ')[0]} Item Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Cold Rolled Coil / Raw Denim Fabric / API Solvent"
              value={materialName}
              onChange={(e) => setMaterialName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Vendor / Supplier <span className="text-rose-500">*</span>
              </label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">-- Choose Vendor --</option>
                {parties.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Batch / Lot Number</label>
              <input
                type="text"
                placeholder="e.g. BATCH-2026-101"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2.5 uppercase font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Unit of Measure</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-2.5 py-2 focus:outline-none"
              >
                {activePreset.defaultUnits.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
                <option value="OTHER">Custom...</option>
              </select>
            </div>

            {unit === 'OTHER' && (
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Custom Unit</label>
                <input
                  type="text"
                  placeholder="e.g. Barrel, Box"
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Quantity <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 500"
                value={quantityInStock}
                onChange={(e) => setQuantityInStock(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2 focus:outline-none font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Purchase Rate (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 620"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2 focus:outline-none font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Quality Inspection & Notes</label>
            <input
              type="text"
              placeholder="e.g. Quality inspection passed"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3.5 py-2 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
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
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold transition disabled:opacity-50 shadow-lg shadow-purple-600/30"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Record Inward Stock</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InwardMaterialModal;
