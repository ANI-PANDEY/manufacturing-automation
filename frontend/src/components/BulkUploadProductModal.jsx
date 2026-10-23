import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Trash2,
  RefreshCw,
  Search,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
  Maximize2,
  Minimize2,
  FileCode,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { inventoryService } from '../services/api';
import { formatCurrency } from '../utils/exportUtils';
import { extractProductsFromPdf } from '../utils/pdfParser';

const BulkUploadProductModal = ({ isOpen, onClose, existingProducts = [], onSuccess }) => {
  const [activeTab, setActiveTab] = useState('file'); // 'file' or 'paste'
  const [isFullScreen, setIsFullScreen] = useState(true); // Full modal by default as requested
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [updateStock, setUpdateStock] = useState(true);
  const [pastedText, setPastedText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Header normalization helper
  const normalizeKey = (key) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

  const mapRowFields = (row) => {
    let productName = '';
    let sku = '';
    let unitPrice = null;
    let unit = 'Pieces';
    let category = 'Finished Goods';
    let stockQuantity = 0;
    let minStockLevel = 10;

    Object.keys(row).forEach((k) => {
      const norm = normalizeKey(k);
      const val = row[k];

      if (['productname', 'itemname', 'product', 'item', 'name', 'title', 'description'].includes(norm)) {
        if (!productName && val) productName = String(val).trim();
      } else if (['sku', 'itemcode', 'productcode', 'code', 'barcode'].includes(norm)) {
        if (!sku && val) sku = String(val).trim().toUpperCase();
      } else if (['unitprice', 'price', 'rate', 'sellingprice', 'mrp', 'unitrate', 'cost', 'amount'].includes(norm)) {
        if (unitPrice === null && val !== undefined && val !== '') {
          const num = Number(String(val).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) unitPrice = num;
        }
      } else if (['unit', 'uom', 'measure'].includes(norm)) {
        if (val) unit = String(val).trim();
      } else if (['category', 'group', 'department', 'sector'].includes(norm)) {
        if (val) category = String(val).trim();
      } else if (['stockquantity', 'stock', 'qty', 'quantity', 'openingstock'].includes(norm)) {
        if (val !== undefined && val !== '') {
          const num = Number(String(val).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) stockQuantity = num;
        }
      } else if (['minstocklevel', 'minstock', 'alertlevel', 'minimumstock'].includes(norm)) {
        if (val !== undefined && val !== '') {
          const num = Number(String(val).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) minStockLevel = num;
        }
      }
    });

    return {
      productName,
      sku: sku || (productName ? `SKU-${productName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'PROD'}-${Math.floor(1000 + Math.random() * 9000)}` : ''),
      unitPrice,
      unit,
      category,
      stockQuantity,
      minStockLevel,
    };
  };

  const processRawData = (rawList, sourceName = '', type = 'file') => {
    setErrorMsg('');

    if (!rawList || rawList.length === 0) {
      setErrorMsg('No readable product records found in this file.');
      return;
    }

    const processed = [];

    rawList.forEach((raw, idx) => {
      const mapped = mapRowFields(raw);
      if (!mapped.productName && mapped.unitPrice === null) {
        return;
      }

      // Check against existing products by SKU or Name
      const skuMatch = mapped.sku ? existingProducts.find((p) => p.sku?.toUpperCase() === mapped.sku?.toUpperCase()) : null;
      const nameMatch = existingProducts.find(
        (p) => p.productName?.toLowerCase().trim() === mapped.productName?.toLowerCase().trim()
      );
      const existing = skuMatch || nameMatch;

      const isValid = Boolean(mapped.productName && mapped.unitPrice !== null && !isNaN(mapped.unitPrice) && mapped.unitPrice >= 0);

      processed.push({
        id: `row_${idx}_${Date.now()}`,
        productName: mapped.productName || 'Unnamed Item',
        sku: mapped.sku,
        category: mapped.category,
        unit: mapped.unit,
        unitPrice: mapped.unitPrice !== null ? mapped.unitPrice : 0,
        stockQuantity: mapped.stockQuantity,
        minStockLevel: mapped.minStockLevel,
        actionType: existing ? 'UPDATE' : 'NEW',
        existingItem: existing,
        oldPrice: existing ? existing.unitPrice : null,
        isValid,
        error: !mapped.productName
          ? 'Missing Product Name'
          : mapped.unitPrice === null || isNaN(mapped.unitPrice)
          ? 'Invalid Unit Price / Rate'
          : null,
      });
    });

    if (processed.length === 0) {
      setErrorMsg('No valid product rows could be detected. Please check columns or use the sample template.');
      return;
    }

    setParsedRows(processed);
    setFileName(sourceName);
    setFileType(type);
  };

  const handleProcessFile = async (file) => {
    if (!file) return;
    setErrorMsg('');

    const lowerName = file.name.toLowerCase();

    // 1. PDF File Support
    if (lowerName.endsWith('.pdf')) {
      try {
        setIsExtractingPdf(true);
        const arrayBuffer = await file.arrayBuffer();
        const extracted = await extractProductsFromPdf(arrayBuffer);
        setIsExtractingPdf(false);

        if (!extracted || extracted.length === 0) {
          setErrorMsg(
            'Could not extract tabular product items from this PDF file. Try copying the text and using the "Paste Text / Price List" tab.'
          );
          return;
        }

        processRawData(extracted, file.name, 'pdf');
      } catch (pdfErr) {
        setIsExtractingPdf(false);
        console.error('PDF Read error:', pdfErr);
        setErrorMsg(`PDF extraction failed: ${pdfErr.message}. If the PDF is scanned or an image, please use CSV or paste text.`);
      }
      return;
    }

    // 2. CSV & Excel (.xlsx, .xls, .tsv, .txt)
    const isBinary = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: isBinary ? 'binary' : 'string' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        processRawData(json, file.name, lowerName.endsWith('.csv') ? 'csv' : 'excel');
      } catch (err) {
        console.error('File parsing error:', err);
        setErrorMsg(`Failed to parse file: ${err.message}. Please upload a valid CSV, Excel, or PDF file.`);
      }
    };

    if (isBinary) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  // Paste text parsing
  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      setErrorMsg('Please paste some product lines or price list text first.');
      return;
    }

    try {
      const lines = pastedText.trim().split(/\r?\n/).filter(Boolean);
      if (lines.length === 0) return;

      const firstLine = lines[0];
      let delimiter = '\t';
      if (firstLine.includes('\t')) delimiter = '\t';
      else if (firstLine.includes(',')) delimiter = ',';
      else if (firstLine.includes(';')) delimiter = ';';
      else if (firstLine.includes('|')) delimiter = '|';

      const rows = lines.map((line) => line.split(delimiter).map((p) => p.trim()));

      const headerCandidates = rows[0].map((h) => normalizeKey(h));
      const hasHeader = headerCandidates.some((c) =>
        ['productname', 'itemname', 'name', 'product', 'rate', 'price', 'unitprice', 'sku'].includes(c)
      );

      let dataObjects = [];

      if (hasHeader && rows.length > 1) {
        const headers = rows[0];
        for (let i = 1; i < rows.length; i++) {
          const rowObj = {};
          headers.forEach((h, colIdx) => {
            rowObj[h] = rows[i][colIdx] || '';
          });
          dataObjects.push(rowObj);
        }
      } else {
        dataObjects = rows.map((cols) => ({
          productName: cols[0] || '',
          sku: cols[1] || '',
          unitPrice: cols[2] || '',
          unit: cols[3] || 'Pieces',
          category: cols[4] || 'Finished Goods',
          stockQuantity: cols[5] || '0',
        }));
      }

      processRawData(dataObjects, 'Pasted Price List', 'paste');
    } catch (err) {
      setErrorMsg(`Failed to parse text: ${err.message}`);
    }
  };

  const handleDownloadSample = (format = 'xlsx') => {
    const sampleData = [
      {
        'Product Name': 'Structural Steel Rod 12mm',
        SKU: 'SSR-12MM',
        'Unit Price': 72.5,
        Unit: 'Kg',
        Category: 'Steel & Metals',
        'Stock Quantity': 250,
        'Min Stock Level': 20,
      },
      {
        'Product Name': 'Cotton Twill Fabric 240 GSM',
        SKU: 'CTF-240',
        'Unit Price': 185.0,
        Unit: 'Meters',
        Category: 'Textile',
        'Stock Quantity': 120,
        'Min Stock Level': 15,
      },
      {
        'Product Name': 'Paracetamol 500mg Strip',
        SKU: 'PCM-500',
        'Unit Price': 28.0,
        Unit: 'Strips',
        Category: 'Pharmaceuticals',
        'Stock Quantity': 500,
        'Min Stock Level': 50,
      },
      {
        'Product Name': 'Galvanized Fastener Bolts M8',
        SKU: 'GFB-M8',
        'Unit Price': 4.75,
        Unit: 'Pieces',
        Category: 'Fasteners & Hardware',
        'Stock Quantity': 2000,
        'Min Stock Level': 200,
      },
      {
        'Product Name': 'Premium Cotton Denim Blue 14oz',
        SKU: 'PCD-14OZ',
        'Unit Price': 310.0,
        Unit: 'Meters',
        Category: 'Textile',
        'Stock Quantity': 80,
        'Min Stock Level': 10,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Product_Catalog_Sample');

    if (format === 'csv') {
      XLSX.writeFile(wb, 'product_listing_and_rate_template.csv');
    } else {
      XLSX.writeFile(wb, 'product_listing_and_rate_template.xlsx');
    }
  };

  const handleRemoveRow = (id) => {
    setParsedRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleClear = () => {
    setParsedRows([]);
    setFileName('');
    setFileType('');
    setPastedText('');
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Immediate import and transfer directly into the software
  const handleConfirmImport = async () => {
    const validItems = parsedRows.filter((r) => r.isValid);
    if (validItems.length === 0) {
      setErrorMsg('No valid product rows found to import.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      const payload = validItems.map((item) => ({
        productName: item.productName,
        sku: item.sku,
        category: item.category,
        unit: item.unit,
        unitPrice: item.unitPrice,
        stockQuantity: item.stockQuantity,
        minStockLevel: item.minStockLevel,
      }));

      const res = await inventoryService.bulkUploadProducts({
        products: payload,
        updateStock,
      });

      if (res.data?.success) {
        // Hand off data directly to software and immediately close the dialog
        if (onSuccess) {
          onSuccess({
            createdCount: res.data.summary?.createdCount || 0,
            updatedCount: res.data.summary?.updatedCount || 0,
            totalReceived: res.data.summary?.totalReceived || validItems.length,
            fileName: fileName || 'Uploaded File',
            message: res.data.message,
            importedSkus: payload.map((p) => p.sku?.toUpperCase()),
          });
        }
        onClose();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to bulk import products');
      setLoading(false);
    }
  };

  const newCount = parsedRows.filter((r) => r.actionType === 'NEW' && r.isValid).length;
  const updateCount = parsedRows.filter((r) => r.actionType === 'UPDATE' && r.isValid).length;

  const filteredRows = parsedRows.filter((r) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.productName.toLowerCase().includes(q) ||
      r.sku.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn ${
        isFullScreen ? 'p-0' : ''
      }`}
    >
      <div
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ${
          isFullScreen
            ? 'w-screen h-screen rounded-none max-w-none max-h-none'
            : 'w-full max-w-6xl h-[94vh] rounded-3xl'
        }`}
      >
        {/* Header with vibrant indigo/purple gradient & Fullscreen controls */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center backdrop-blur-md shadow-lg shrink-0">
              <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                  Bulk Product Listing & Rate Updater
                </h3>
                <span className="bg-white/20 backdrop-blur-md text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full border border-white/30 text-white">
                  CSV • EXCEL • PDF
                </span>
              </div>
              <p className="text-xs text-blue-100 font-medium hidden sm:block">
                Upload your supplier PDF quotation, CSV or Excel file to auto-create items and update rates directly into software
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Toggle Full Screen */}
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              title={isFullScreen ? 'Restore Window Size' : 'Expand Full Screen'}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition border border-white/20 flex items-center gap-1 text-xs font-bold"
            >
              {isFullScreen ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span className="hidden md:inline">Window</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span className="hidden md:inline">Full Screen</span>
                </>
              )}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition border border-white/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Subheader / Tab navigation */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-4 sm:px-6 py-2.5 gap-3 shrink-0">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('file')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'file'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload File (CSV, Excel, PDF)
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'paste'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Paste Text / Price List
            </button>
          </div>

          {/* Download Sample Template Actions */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
              Sample Formats:
            </span>
            <button
              onClick={() => handleDownloadSample('xlsx')}
              className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              title="Download sample Excel template"
            >
              <Download className="w-3 h-3" /> .XLSX Sample
            </button>
            <button
              onClick={() => handleDownloadSample('csv')}
              className="px-2.5 py-1.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:bg-sky-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              title="Download sample CSV template"
            >
              <Download className="w-3 h-3" /> .CSV Sample
            </button>
          </div>
        </div>

        {/* Modal Main Content Area (Spacious & Full Height) */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col space-y-4 bg-slate-50/50 dark:bg-slate-950/60">
          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2 animate-fadeIn shrink-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* PDF Extracting Loading Indicator */}
          {isExtractingPdf && (
            <div className="p-8 rounded-3xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-center space-y-3 animate-fadeIn my-auto">
              <RefreshCw className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto" />
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Reading & Extracting Products from PDF Price List...
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Parsing tables, line items, and product rates from PDF document
              </p>
            </div>
          )}

          {/* Upload or Paste Section (Shown when no items parsed yet) */}
          {parsedRows.length === 0 && !isExtractingPdf && (
            <div className="flex-1 flex flex-col justify-center">
              {activeTab === 'file' ? (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-3xl p-10 sm:p-16 text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center my-auto ${
                    dragActive
                      ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
                      : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-slate-800/60 bg-white dark:bg-slate-900/60'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv, .xlsx, .xls, .tsv, .txt, .pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition">
                    <Upload className="w-10 h-10" />
                  </div>
                  <h4 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                    Click to browse or drop your CSV, Excel, or PDF file here
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-lg mx-auto">
                    Supports <span className="font-bold text-indigo-600 dark:text-indigo-400">CSV, Excel (.xlsx, .xls)</span> and <span className="font-bold text-indigo-600 dark:text-indigo-400">PDF Price Lists / Quotations</span> directly.
                  </p>

                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full font-semibold">
                      Auto-Detects Product Name & SKU
                    </span>
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full font-semibold">
                      Auto-Updates Existing Rates
                    </span>
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full font-semibold">
                      Auto-Creates New Products
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 my-auto">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      Paste Copied Table Rows from PDF Quotation or Excel
                    </label>
                    <span className="text-[11px] text-slate-400">Supports Tab, Comma, or Pipe separated</span>
                  </div>

                  <textarea
                    rows={8}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Example:&#10;Steel Reinforcement Bar 12mm, SRB-12, 75.50, Kg, Steel & Metals, 100&#10;Cotton Denim Fabric 14oz, CDF-14, 280.00, Meters, Textile, 50"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleParsePastedText}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md transition flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" /> Parse Pasted Lines
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Full Expansive Parsed Rows Preview Table */}
          {parsedRows.length > 0 && !isExtractingPdf && (
            <div className="flex-1 flex flex-col space-y-4 min-h-0 animate-fadeIn">
              {/* Metrics Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3 shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Items Found</span>
                    <span className="text-base font-extrabold text-slate-800 dark:text-slate-100 font-mono">
                      {parsedRows.length}
                    </span>
                  </div>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex items-center space-x-3 shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                      New To Add
                    </span>
                    <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                      +{newCount} Products
                    </span>
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800/60 flex items-center space-x-3 shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">
                      Rates To Update
                    </span>
                    <span className="text-base font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                      {updateCount} Existing
                    </span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                  <div className="truncate mr-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Source File</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                      {fileName || 'Pasted Data'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClear}
                    title="Upload different file"
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Table Filter Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filter products, SKU, or category..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={updateStock}
                      onChange={(e) => setUpdateStock(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>Update stock quantities from file</span>
                  </label>
                </div>
              </div>

              {/* Full-Height Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm flex-1 min-h-[300px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase text-[10px] font-black tracking-wider sticky top-0 backdrop-blur-md z-10 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4 font-mono">SKU Code</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Unit</th>
                      <th className="py-3 px-4 text-right">Price / Rate (₹)</th>
                      <th className="py-3 px-4 text-center">Stock</th>
                      <th className="py-3 px-4 text-center">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${
                          !row.isValid ? 'bg-rose-50/60 dark:bg-rose-950/20' : ''
                        }`}
                      >
                        <td className="py-2.5 px-4">
                          {row.actionType === 'NEW' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/50">
                              <Sparkles className="w-2.5 h-2.5" /> NEW ITEM
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800/50">
                              <RefreshCw className="w-2.5 h-2.5" /> RATE UPDATE
                            </span>
                          )}
                          {!row.isValid && (
                            <span className="block text-[10px] text-rose-500 font-semibold mt-0.5">
                              {row.error}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-100">
                          {row.productName}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-500 dark:text-slate-400 text-xs">
                          {row.sku}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 font-semibold">
                          {row.category}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                          {row.unit}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold">
                          {row.actionType === 'UPDATE' ? (
                            <div>
                              <span className="text-[10px] text-slate-400 line-through mr-1.5">
                                {formatCurrency(row.oldPrice)}
                              </span>
                              <span className="text-amber-600 dark:text-amber-400 font-black text-sm">
                                {formatCurrency(row.unitPrice)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">
                              {formatCurrency(row.unitPrice)}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                          {row.stockQuantity > 0 ? row.stockQuantity : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions: Saves & Automatically Loads Directly into Software */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
          <div>
            {parsedRows.length > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Clicking confirm will load <span className="font-bold text-slate-800 dark:text-slate-200">{newCount + updateCount} items</span> directly into your software inventory catalog.
              </p>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>

            {parsedRows.length > 0 && (
              <button
                type="button"
                disabled={loading || newCount + updateCount === 0}
                onClick={handleConfirmImport}
                className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-500/25 transition active:scale-95 flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Loading Into Software...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Import Into Software ({newCount + updateCount} Products)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkUploadProductModal;
