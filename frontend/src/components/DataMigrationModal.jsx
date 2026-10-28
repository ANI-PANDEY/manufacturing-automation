import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  Search,
  Sparkles,
  ArrowRight,
  Info,
  Maximize2,
  Minimize2,
  Plus,
  Users,
  ShoppingBag,
  Boxes,
  Layers,
  Database,
  Check,
  ClipboardPaste,
  HelpCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { partyService, orderService, inventoryService, migrationService } from '../services/api';
import { formatCurrency } from '../utils/exportUtils';
import HistoricalBillsMigrationGrid from './HistoricalBillsMigrationGrid';

const MODULES = [
  {
    id: 'parties',
    label: 'Parties & Opening Balances',
    labelHi: 'ग्राहक/सप्लायर व पुराना बकाया',
    icon: Users,
    color: 'from-sky-500 to-blue-600',
    badgeColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    description: 'Import customers and vendors along with their previous pending balance (purana hisab / opening balance).',
  },
  {
    id: 'products',
    label: 'Finished Goods / Products',
    labelHi: 'तैयार माल व ओपनिंग स्टॉक',
    icon: Boxes,
    color: 'from-indigo-500 to-purple-600',
    badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    description: 'Import your product catalog with selling prices, units, and warehouse opening stock.',
  },
  {
    id: 'rawMaterials',
    label: 'Raw Materials & Vendor Batches',
    labelHi: 'कच्चा माल व स्टॉक बैच',
    icon: Layers,
    color: 'from-amber-500 to-orange-600',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    description: 'Import inward raw materials, current stock quantities, unit purchase costs, and supplier names.',
  },
  {
    id: 'orders',
    label: 'Historical Bills & Orders',
    labelHi: 'पुराने सेल्स बिल व बकाया',
    icon: ShoppingBag,
    color: 'from-emerald-500 to-teal-600',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    description: 'Import past manual bills or invoices with past dates, total bill amounts, old payments received, and due balance.',
  },
];

const DataMigrationModal = ({
  isOpen,
  onClose,
  initialModule = 'parties',
  existingParties = [],
  onSuccess,
}) => {
  const [activeModule, setActiveModule] = useState(initialModule);
  const [inputMode, setInputMode] = useState(initialModule === 'orders' ? 'itemized' : 'file'); // 'itemized', 'file' or 'manual'
  const [partiesList, setPartiesList] = useState(existingParties || []);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successReport, setSuccessReport] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (initialModule) {
      setActiveModule(initialModule);
      if (initialModule === 'orders') {
        setInputMode('itemized');
      }
    }
  }, [initialModule]);

  useEffect(() => {
    if (existingParties && existingParties.length > 0) {
      setPartiesList(existingParties);
    } else {
      const fetchFn = partyService.getAll || partyService.getParties;
      if (typeof fetchFn === 'function') {
        fetchFn()
          .then((res) => {
            if (res.data?.parties) {
              setPartiesList(res.data.parties);
            }
          })
          .catch(() => {});
      }
    }
  }, [existingParties]);

  // Reset module rows on module switch
  const handleSwitchModule = (modId) => {
    setActiveModule(modId);
    if (modId === 'orders') {
      setInputMode('itemized');
    } else if (inputMode === 'itemized') {
      setInputMode('file');
    }
    setFileName('');
    setParsedRows([]);
    setErrorMsg('');
    setSuccessReport(null);
  };

  if (!isOpen) return null;

  // Header normalization helper for fuzzy column matching (supports Hindi Devanagari & English)
  const cleanKey = (key) =>
    String(key || '')
      .toLowerCase()
      .replace(/[^\w\d\u0900-\u097F]/g, '');

  // ==========================================
  // Sample Excel Template Generator
  // ==========================================
  const handleDownloadTemplate = () => {
    let data = [];
    let filename = '';

    if (activeModule === 'parties') {
      filename = 'Parties_Opening_Balances_Template.xlsx';
      data = [
        {
          'Party Name (पार्टी का नाम)': 'Gupta Steel Traders',
          'Type (CUSTOMER / VENDOR / BOTH)': 'CUSTOMER',
          'Phone / Mobile': '9820112345',
          'Opening Balance / पुराना बकाया (₹)': 45000,
          'Balance Type (RECEIVABLE / PAYABLE)': 'RECEIVABLE',
          'GSTIN (जीएसटी नंबर)': '27AAACA1234A1Z5',
          'Address (पता)': 'Plot 12, Industrial Area, Mumbai',
          'Credit Limit (₹)': 500000,
        },
        {
          'Party Name (पार्टी का नाम)': 'Apex Alloys & Forging Ltd',
          'Type (CUSTOMER / VENDOR / BOTH)': 'BOTH',
          'Phone / Mobile': '9879054321',
          'Opening Balance / पुराना बकाया (₹)': 120000,
          'Balance Type (RECEIVABLE / PAYABLE)': 'RECEIVABLE',
          'GSTIN (जीएसटी नंबर)': '24BBBCT9876B1Z2',
          'Address (पता)': 'GIDC Estate, Ahmedabad',
          'Credit Limit (₹)': 1000000,
        },
        {
          'Party Name (पार्टी का नाम)': 'National Metal Suppliers',
          'Type (CUSTOMER / VENDOR / BOTH)': 'VENDOR',
          'Phone / Mobile': '9110088990',
          'Opening Balance / पुराना बकाया (₹)': 35000,
          'Balance Type (RECEIVABLE / PAYABLE)': 'PAYABLE',
          'GSTIN (जीएसटी नंबर)': '07CCCPG5432C1Z8',
          'Address (पता)': 'Okhla Phase III, New Delhi',
          'Credit Limit (₹)': 500000,
        },
      ];
    } else if (activeModule === 'products') {
      filename = 'Finished_Products_Opening_Stock_Template.xlsx';
      data = [
        {
          'Product Name (उत्पाद का नाम)': 'Heavy Duty Steel Pipe 50mm',
          'SKU / Code': 'ST-PIPE-50',
          'Selling Unit Price / दर (₹)': 1500,
          'Opening Stock / स्टॉक': 250,
          'Unit (Pieces / Kg / Ton)': 'Pieces',
          'Category (श्रेणी)': 'Steel Tubes',
          'Min Stock Alert Level': 20,
        },
        {
          'Product Name (उत्पाद का नाम)': 'Aluminum Sheet 2mm Grade 6061',
          'SKU / Code': 'AL-SHEET-2M',
          'Selling Unit Price / दर (₹)': 85000,
          'Opening Stock / स्टॉक': 45,
          'Unit (Pieces / Kg / Ton)': 'Metric Ton',
          'Category (श्रेणी)': 'Aluminum Sheets',
          'Min Stock Alert Level': 5,
        },
        {
          'Product Name (उत्पाद का नाम)': 'Industrial Copper Rod 10mm',
          'SKU / Code': 'CU-ROD-10',
          'Selling Unit Price / दर (₹)': 680,
          'Opening Stock / स्टॉक': 1200,
          'Unit (Pieces / Kg / Ton)': 'Kg',
          'Category (श्रेणी)': 'Copper Components',
          'Min Stock Alert Level': 100,
        },
      ];
    } else if (activeModule === 'rawMaterials') {
      filename = 'Raw_Materials_Inventory_Template.xlsx';
      data = [
        {
          'Raw Material Name (कच्चा माल)': 'Cold Rolled Coil Grade CR-1',
          'Category (श्रेणी)': 'Coils & Sheets',
          'Vendor / Supplier Name': 'Apex Steel & Alloys Pvt Ltd',
          'Batch Number / लॉट नंबर': 'BATCH-OLD-2026-01',
          'Quantity In Stock (मात्रा)': 35,
          'Unit (Kg / Ton / Meter)': 'Metric Ton',
          'Purchase Unit Cost / खरीद दर (₹)': 62000,
          'Notes': 'Stock verified from physical godown inspection',
        },
        {
          'Raw Material Name (कच्चा माल)': 'Brass Billets Grade A',
          'Category (श्रेणी)': 'Non-Ferrous Metals',
          'Vendor / Supplier Name': 'National Metal Suppliers',
          'Batch Number / लॉट नंबर': 'BATCH-OLD-2026-02',
          'Quantity In Stock (मात्रा)': 500,
          'Unit (Kg / Ton / Meter)': 'Kg',
          'Purchase Unit Cost / खरीद दर (₹)': 480,
          'Notes': 'Old inward batch',
        },
      ];
    } else if (activeModule === 'orders') {
      filename = 'Historical_Bills_Past_Invoices_Template.xlsx';
      data = [
        {
          'Invoice / Bill Number (बिल संख्या)': 'BILL-2025-014',
          'Bill Date (बिल तारीख YYYY-MM-DD)': '2025-11-15',
          'Customer / Party Name (ग्राहक का नाम)': 'Gupta Steel Traders',
          'Total Bill Amount / कुल राशि (₹)': 150000,
          'Old Paid Amount / प्राप्त राशि (₹)': 50000,
          'Item Description / विवरण': 'Past order: Steel Pipes 50mm (100 Pcs)',
          'Dispatch Notes / टिप्पणी': 'Delivered via transport prior to software launch',
        },
        {
          'Invoice / Bill Number (बिल संख्या)': 'BILL-2025-019',
          'Bill Date (बिल तारीख YYYY-MM-DD)': '2025-12-05',
          'Customer / Party Name (ग्राहक का नाम)': 'Apex Alloys & Forging Ltd',
          'Total Bill Amount / कुल राशि (₹)': 300000,
          'Old Paid Amount / प्राप्त राशि (₹)': 300000,
          'Item Description / विवरण': 'Aluminum Sheets Grade 6061',
          'Dispatch Notes / टिप्पणी': 'Fully paid bill from old financial quarter',
        },
        {
          'Invoice / Bill Number (बिल संख्या)': 'BILL-2026-004',
          'Bill Date (बिल तारीख YYYY-MM-DD)': '2026-01-20',
          'Customer / Party Name (ग्राहक का नाम)': 'Titan Industrial Components',
          'Total Bill Amount / कुल राशि (₹)': 160480,
          'Old Paid Amount / प्राप्त राशि (₹)': 0,
          'Item Description / विवरण': 'Copper Rods 10mm (200 Kg)',
          'Dispatch Notes / टिप्पणी': 'Unpaid pending bill carried forward',
        },
      ];
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, filename);
  };

  // ==========================================
  // Row Mapping & Normalization
  // ==========================================
  const mapRowData = (row, modId) => {
    // Helper to sanitize phone strictly to 10 digits
    const sanitizePhone10 = (raw) => {
      if (!raw) return '';
      let clean = String(raw).replace(/\D/g, '');
      if (clean.length === 12 && clean.startsWith('91')) clean = clean.slice(2);
      else if (clean.length === 11 && clean.startsWith('0')) clean = clean.slice(1);
      return clean.slice(-10);
    };

    const keys = Array.isArray(row) ? [] : Object.keys(row || {});

    if (modId === 'parties') {
      let name = '';
      let type = 'CUSTOMER';
      let phone = '';
      let email = '';
      let address = '';
      let gstin = '';
      let openingBalance = 0;
      let openingBalanceType = 'RECEIVABLE';
      let creditLimit = 500000;

      if (Array.isArray(row)) {
        // Positional array row (when sheet had no headers or raw list)
        row.forEach((cell) => {
          const s = String(cell || '').trim();
          if (!s) return;
          const digits = s.replace(/\D/g, '');

          if ((digits.length === 10 || (digits.length === 12 && digits.startsWith('91'))) && !phone) {
            phone = sanitizePhone10(digits);
          } else if (/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(s) && !gstin) {
            gstin = s.toUpperCase();
          } else if (s.includes('@') && !email) {
            email = s.toLowerCase();
          } else if (/^[0-9]+(\.[0-9]+)?$/.test(s.replace(/,/g, '')) && name && !openingBalance) {
            openingBalance = Number(s.replace(/,/g, ''));
          } else if (!name && !/^\d+$/.test(s)) {
            name = s;
          } else if (name && !address) {
            address = s;
          }
        });
      } else {
        // Object format with column keys
        const keys = Object.keys(row);
        keys.forEach((k) => {
          const rawKey = String(k || '').toLowerCase();
          const norm = cleanKey(k);
          const val = row[k];
          if (!val && val !== 0) return;

          // Match Party / Customer Name
          if (
            /party|customer|client|ledger|particulars|firm|company|buyer|account|grahak|vyapari|khatedar|नाम|ग्राहक|पार्टी|खाता|लेजर|फर्म/i.test(
              rawKey
            ) ||
            norm === 'name' ||
            norm.endsWith('name') ||
            norm.startsWith('name')
          ) {
            if (!name && typeof val === 'string' && val.trim()) {
              name = String(val).trim();
            }
          }
          // Match Phone / Mobile
          else if (/phone|mobile|contact|tel|cell|whatsapp|mob|sampark|फोन|मोबाइल|नंबर|संपर्क/i.test(rawKey)) {
            if (!phone) {
              phone = sanitizePhone10(val);
            }
          }
          // Match Opening Balance
          else if (
            /balance|opening|due|bakaya|baki|hisab|outstanding|amount|purana|debit|credit|dr|cr|बकाया|बाकी|ओपनिंग|बैलेंस|हिसाब|राशि/i.test(
              rawKey
            )
          ) {
            const num = Number(String(val).replace(/[^0-9.-]/g, ''));
            if (!isNaN(num) && num !== 0) openingBalance = num;
          }
          // Match Balance Type (Receivable vs Payable)
          else if (/type|baltype|drcr|crdr|debitcredit|देना|लेना/i.test(rawKey)) {
            const t = String(val).toUpperCase();
            if (t.includes('PAY') || t.includes('CR') || t.includes('CREDIT') || t.includes('DENA')) {
              openingBalanceType = 'PAYABLE';
            } else {
              openingBalanceType = 'RECEIVABLE';
            }
          }
          // Match Party Role (Customer vs Vendor)
          else if (/role|partytype|vendcust/i.test(rawKey)) {
            const t = String(val).toUpperCase();
            if (t.includes('VEN') || t.includes('SUPP')) type = 'VENDOR';
            else if (t.includes('BOTH')) type = 'BOTH';
            else type = 'CUSTOMER';
          }
          // Match GSTIN
          else if (/gst|gstin|जीएसटी/i.test(rawKey)) {
            if (!gstin) gstin = String(val).trim().toUpperCase();
          }
          // Match Email
          else if (/email|mail/i.test(rawKey)) {
            if (!email) email = String(val).trim().toLowerCase();
          }
          // Match Address
          else if (/address|city|location|pata|shahar|state|पता|शहर/i.test(rawKey)) {
            if (!address) address = String(val).trim();
          }
        });

        // Smart Fallback if name was not matched by headers
        if (!name) {
          for (const k of keys) {
            const v = String(row[k] || '').trim();
            if (v && !/^\d+$/.test(v) && !v.includes('@') && v.length >= 2 && !/balance|amount|phone|mobile|date/i.test(k)) {
              name = v;
              break;
            }
          }
        }

        // Smart Fallback if phone was not matched
        if (!phone) {
          for (const k of keys) {
            const digits = String(row[k] || '').replace(/\D/g, '');
            if (digits.length === 10 || (digits.length === 12 && digits.startsWith('91'))) {
              phone = sanitizePhone10(digits);
              break;
            }
          }
        }
      }

      phone = sanitizePhone10(phone);

      return {
        id: `row_${Math.random()}`,
        name: name ? name.trim() : '',
        type,
        phone,
        email,
        address,
        gstin,
        openingBalance: Math.abs(Number(openingBalance) || 0),
        openingBalanceType,
        creditLimit: Number(creditLimit) || 500000,
        isValid: Boolean(name && name.trim()),
        error: !name || !name.trim() ? 'Party Name is required (नाम जरूरी है)' : null,
      };
    }

    if (modId === 'products') {
      let productName = '';
      let sku = '';
      let unitPrice = 0;
      let stockQuantity = 0;
      let unit = 'Pieces';
      let category = 'Finished Goods';
      let minStockLevel = 10;

      keys.forEach((k) => {
        const norm = cleanKey(k);
        const val = row[k];
        if (!val && val !== 0) return;

        if (['productname', 'product', 'itemname', 'item', 'name', 'title'].some((p) => norm.includes(p))) {
          if (!productName) productName = String(val).trim();
        } else if (['sku', 'itemcode', 'code', 'barcode'].some((p) => norm.includes(p))) {
          if (!sku) sku = String(val).trim().toUpperCase();
        } else if (['price', 'rate', 'unitprice', 'sellingprice', 'cost', 'mrp'].some((p) => norm.includes(p))) {
          const num = Number(String(val).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) unitPrice = num;
        } else if (['stock', 'qty', 'quantity', 'openingstock'].some((p) => norm.includes(p))) {
          const num = Number(String(val).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) stockQuantity = num;
        } else if (['unit', 'uom', 'measure'].some((p) => norm.includes(p))) {
          if (val) unit = String(val).trim();
        } else if (['category', 'group', 'sector'].some((p) => norm.includes(p))) {
          if (val) category = String(val).trim();
        } else if (['minstock', 'alertlevel', 'minimum'].some((p) => norm.includes(p))) {
          const num = Number(String(val).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) minStockLevel = num;
        }
      });

      if (!sku && productName) {
        sku = `SKU-${productName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'PROD'}-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      return {
        id: `row_${Math.random()}`,
        productName,
        sku,
        unitPrice,
        stockQuantity,
        unit,
        category,
        minStockLevel,
        isValid: Boolean(productName && unitPrice >= 0),
        error: !productName ? 'Product Name is required' : unitPrice < 0 ? 'Price must be >= 0' : null,
      };
    }

    if (modId === 'rawMaterials') {
      let materialName = '';
      let category = 'Steel & Metals';
      let vendorName = '';
      let batchNumber = '';
      let quantityInStock = 0;
      let unit = 'Kg';
      let unitPrice = 0;
      let notes = 'Historical stock inward';

      keys.forEach((k) => {
        const norm = cleanKey(k);
        const val = row[k];
        if (!val && val !== 0) return;

        if (['materialname', 'material', 'rawmaterial', 'item', 'name'].some((p) => norm.includes(p))) {
          if (!materialName) materialName = String(val).trim();
        } else if (['vendor', 'supplier', 'party', 'vendorname'].some((p) => norm.includes(p))) {
          if (!vendorName) vendorName = String(val).trim();
        } else if (['batch', 'batchno', 'batchnumber', 'lot'].some((p) => norm.includes(p))) {
          if (!batchNumber) batchNumber = String(val).trim().toUpperCase();
        } else if (['qty', 'quantity', 'stock', 'quantityinstock'].some((p) => norm.includes(p))) {
          const num = Number(String(val).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) quantityInStock = num;
        } else if (['price', 'rate', 'cost', 'unitprice', 'purchaseprice'].some((p) => norm.includes(p))) {
          const num = Number(String(val).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) unitPrice = num;
        } else if (['unit', 'uom', 'measure'].some((p) => norm.includes(p))) {
          if (val) unit = String(val).trim();
        } else if (['category', 'group'].some((p) => norm.includes(p))) {
          if (val) category = String(val).trim();
        } else if (['note', 'notes', 'remarks'].some((p) => norm.includes(p))) {
          if (val) notes = String(val).trim();
        }
      });

      if (!batchNumber) {
        batchNumber = `BATCH-OLD-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;
      }

      return {
        id: `row_${Math.random()}`,
        materialName,
        category,
        vendorName,
        batchNumber,
        quantityInStock,
        unit,
        unitPrice,
        notes,
        isValid: Boolean(materialName && quantityInStock > 0),
        error: !materialName ? 'Material Name is required' : quantityInStock <= 0 ? 'Quantity must be > 0' : null,
      };
    }

    if (modId === 'orders') {
      let orderNumber = '';
      let orderDate = new Date().toISOString().split('T')[0];
      let partyName = '';
      let totalAmount = 0;
      let paidAmount = 0;
      let itemDescription = 'Historical Dispatch Invoice';
      let dispatchNotes = 'Imported from old register / Excel';

      keys.forEach((k) => {
        const norm = cleanKey(k);
        const val = row[k];
        if (!val && val !== 0) return;

        if (['invoiceno', 'invoicenumber', 'billno', 'billnumber', 'orderno', 'ordernumber'].some((p) => norm.includes(p))) {
          if (!orderNumber) orderNumber = String(val).trim().toUpperCase();
        } else if (['date', 'billdate', 'invoicedate', 'orderdate'].some((p) => norm.includes(p))) {
          if (val) {
            const parsed = new Date(val);
            if (!isNaN(parsed.getTime())) {
              orderDate = parsed.toISOString().split('T')[0];
            }
          }
        } else if (['party', 'customer', 'customername', 'partyname', 'client'].some((p) => norm.includes(p))) {
          if (!partyName) partyName = String(val).trim();
        } else if (['totalamount', 'billamount', 'amount', 'total', 'grandtotal'].some((p) => norm.includes(p))) {
          const num = Number(String(val).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) totalAmount = num;
        } else if (['paidamount', 'paid', 'received', 'receivedamount', 'jama'].some((p) => norm.includes(p))) {
          const num = Number(String(val).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) paidAmount = num;
        } else if (['item', 'description', 'items', 'itemdescription', 'goods'].some((p) => norm.includes(p))) {
          if (val) itemDescription = String(val).trim();
        } else if (['note', 'notes', 'remarks', 'dispatchnotes'].some((p) => norm.includes(p))) {
          if (val) dispatchNotes = String(val).trim();
        }
      });

      if (!orderNumber) {
        orderNumber = `HIST-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      }

      const balanceDue = Math.max(totalAmount - paidAmount, 0);

      return {
        id: `row_${Math.random()}`,
        orderNumber,
        orderDate,
        partyName,
        totalAmount,
        paidAmount,
        balanceDue,
        itemDescription,
        dispatchNotes,
        isValid: Boolean(partyName && totalAmount > 0),
        error: !partyName ? 'Customer/Party Name is required' : totalAmount <= 0 ? 'Total Bill Amount must be > 0' : null,
      };
    }

    return { id: `row_${Math.random()}`, ...row, isValid: true };
  };

  // ==========================================
  // File Upload & Parsing (XLSX / XLS / CSV)
  // ==========================================
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg('');
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target.result;
        const data = new Uint8Array(buffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });

        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          setErrorMsg('No sheets found in the uploaded spreadsheet.');
          setLoading(false);
          return;
        }

        // 1. Scan sheets to find the first sheet with actual data rows
        let bestSheetName = wb.SheetNames[0];
        let bestMatrix = [];

        for (const sName of wb.SheetNames) {
          const wsCandidate = wb.Sheets[sName];
          if (!wsCandidate || !wsCandidate['!ref']) continue;
          const matrix = XLSX.utils.sheet_to_json(wsCandidate, { header: 1, defval: '' });
          const hasContent = matrix.some((r) => Array.isArray(r) && r.some((c) => String(c).trim() !== ''));
          if (hasContent) {
            bestSheetName = sName;
            bestMatrix = matrix;
            break;
          }
        }

        if (bestMatrix.length === 0) {
          const ws = wb.Sheets[bestSheetName];
          bestMatrix = ws ? XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) : [];
        }

        // Filter out completely blank rows
        const nonEmptyRows = bestMatrix
          .map((row, originalIndex) => ({ row, originalIndex }))
          .filter(({ row }) => Array.isArray(row) && row.some((c) => String(c).trim() !== ''));

        if (nonEmptyRows.length === 0) {
          setErrorMsg(`Spreadsheet (${bestSheetName}) contains no readable data rows.`);
          setLoading(false);
          return;
        }

        // 2. Intelligent Header Row Finder
        // Real-world Excel sheets often have title banners, company names, or merged cells in rows 1-3.
        // We scan the first 25 non-empty rows for common business headers across English & Hindi.
        const headerKeywords = [
          'party', 'customer', 'client', 'ledger', 'particulars', 'buyer', 'firm', 'company', 'name',
          'phone', 'mobile', 'contact', 'cell', 'tel', 'whatsapp', 'sampark',
          'balance', 'opening', 'due', 'bakaya', 'baki', 'outstanding', 'amount', 'dr', 'cr',
          'address', 'city', 'location', 'pata', 'state', 'gst', 'gstin', 'email', 'mail',
          'product', 'item', 'material', 'sku', 'price', 'rate', 'stock', 'qty', 'quantity', 'unit',
          'order', 'bill', 'invoice', 'sr', 'sno', 'no',
          // Hindi & Devanagari synonyms
          'नाम', 'ग्राहक', 'पार्टी', 'मोबाइल', 'फोन', 'नंबर', 'संपर्क', 'बकाया', 'बाकी', 'बैलेंस', 'हिसाब', 'राशि', 'पता', 'शहर', 'जीएसटी'
        ];

        let bestHeaderIdx = -1;
        let maxMatchCount = 0;

        for (let i = 0; i < Math.min(25, nonEmptyRows.length); i++) {
          const row = nonEmptyRows[i].row;
          let matchCount = 0;
          for (const cell of row) {
            const str = String(cell || '').trim().toLowerCase();
            if (!str) continue;
            if (headerKeywords.some((kw) => str.includes(kw))) {
              matchCount++;
            }
          }
          if (matchCount > maxMatchCount && matchCount >= 2) {
            maxMatchCount = matchCount;
            bestHeaderIdx = i;
          }
        }

        let rowsToMap = [];

        if (bestHeaderIdx !== -1) {
          // Detected header row at bestHeaderIdx
          const headerCells = nonEmptyRows[bestHeaderIdx].row.map((h, colIdx) => {
            const s = String(h || '').trim();
            return s || `Col_${colIdx + 1}`;
          });

          // All subsequent rows are data rows
          const dataSlice = nonEmptyRows.slice(bestHeaderIdx + 1);
          rowsToMap = dataSlice.map(({ row }) => {
            const obj = {};
            headerCells.forEach((colName, cIdx) => {
              obj[colName] = row[cIdx] !== undefined ? row[cIdx] : '';
            });
            // Also store row array for positional fallback
            obj._rawCells = row;
            return obj;
          });
        } else {
          // Fallback: If no keywords matched, check if row 0 looks like string headers
          const firstRow = nonEmptyRows[0].row;
          const isRow0Header =
            firstRow.length >= 2 &&
            firstRow.every((c) => typeof c === 'string' && !/^\d+$/.test(c.trim()) && c.trim().length > 0);

          if (isRow0Header && nonEmptyRows.length > 1) {
            const headerCells = firstRow.map((h, colIdx) => String(h || '').trim() || `Col_${colIdx + 1}`);
            rowsToMap = nonEmptyRows.slice(1).map(({ row }) => {
              const obj = {};
              headerCells.forEach((colName, cIdx) => {
                obj[colName] = row[cIdx] !== undefined ? row[cIdx] : '';
              });
              obj._rawCells = row;
              return obj;
            });
          } else {
            // Raw positional data: Pass the array rows directly into mapRowData
            rowsToMap = nonEmptyRows.map(({ row }) => row);
          }
        }

        // Map and normalize each row
        const mapped = rowsToMap
          .map((r) => mapRowData(r, activeModule))
          .filter((r) => {
            // Filter out empty rows or footer totals
            if (activeModule === 'parties') {
              return Boolean(r.name?.trim() || r.phone?.trim() || r.openingBalance);
            }
            if (activeModule === 'products') {
              return Boolean(r.productName?.trim() || r.unitPrice || r.stockQuantity);
            }
            if (activeModule === 'rawMaterials') {
              return Boolean(r.materialName?.trim() || r.quantityInStock);
            }
            if (activeModule === 'orders') {
              return Boolean(r.partyName?.trim() || r.totalAmount);
            }
            return true;
          });

        if (!mapped || mapped.length === 0) {
          setErrorMsg(
            'Spreadsheet parsed, but no valid records were detected. Please ensure your sheet includes Party/Customer Name or Phone.'
          );
          setLoading(false);
          return;
        }

        setParsedRows(mapped);
      } catch (err) {
        console.error('File parsing error:', err);
        setErrorMsg('Failed to parse spreadsheet file: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg('Error reading file from disk.');
      setLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Drag and drop handlers
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
      const file = e.dataTransfer.files[0];
      const fakeEvent = { target: { files: [file] } };
      handleFileUpload(fakeEvent);
    }
  };

  // ==========================================
  // Manual Grid Mode Helpers
  // ==========================================
  const handleAddManualRow = () => {
    let emptyRow = {};
    if (activeModule === 'parties') {
      emptyRow = {
        id: `row_${Date.now()}_${Math.random()}`,
        name: '',
        type: 'CUSTOMER',
        phone: '',
        openingBalance: 0,
        openingBalanceType: 'RECEIVABLE',
        gstin: '',
        address: '',
        creditLimit: 500000,
        isValid: false,
        error: 'Party name required',
      };
    } else if (activeModule === 'products') {
      emptyRow = {
        id: `row_${Date.now()}_${Math.random()}`,
        productName: '',
        sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        unitPrice: 0,
        stockQuantity: 0,
        unit: 'Pieces',
        category: 'Finished Goods',
        minStockLevel: 10,
        isValid: false,
        error: 'Product name required',
      };
    } else if (activeModule === 'rawMaterials') {
      emptyRow = {
        id: `row_${Date.now()}_${Math.random()}`,
        materialName: '',
        category: 'Steel & Metals',
        vendorName: '',
        batchNumber: `BATCH-OLD-${Date.now().toString().slice(-4)}`,
        quantityInStock: 0,
        unit: 'Kg',
        unitPrice: 0,
        notes: '',
        isValid: false,
        error: 'Material name required',
      };
    } else if (activeModule === 'orders') {
      emptyRow = {
        id: `row_${Date.now()}_${Math.random()}`,
        orderNumber: `HIST-${Date.now().toString().slice(-5)}`,
        orderDate: new Date().toISOString().split('T')[0],
        partyName: '',
        totalAmount: 0,
        paidAmount: 0,
        balanceDue: 0,
        itemDescription: 'Previous manual bill',
        dispatchNotes: '',
        isValid: false,
        error: 'Party name required',
      };
    }
    setParsedRows((prev) => [...prev, emptyRow]);
  };

  const handleUpdateRowField = (rowId, field, value) => {
    setParsedRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const finalValue = field === 'phone' ? String(value || '').replace(/\D/g, '').slice(0, 10) : value;
        const updated = { ...r, [field]: finalValue };

        // Re-validate row
        if (activeModule === 'parties') {
          if (!updated.name?.trim()) {
            updated.isValid = false;
            updated.error = 'Party Name required';
          } else if (updated.phone && updated.phone.length !== 10) {
            updated.isValid = false;
            updated.error = 'Phone number must be exactly 10 digits';
          } else {
            updated.isValid = true;
            updated.error = null;
          }
        } else if (activeModule === 'products') {
          updated.isValid = Boolean(updated.productName?.trim() && Number(updated.unitPrice) >= 0);
          updated.error = !updated.isValid ? 'Valid name and price required' : null;
        } else if (activeModule === 'rawMaterials') {
          updated.isValid = Boolean(updated.materialName?.trim() && Number(updated.quantityInStock) > 0);
          updated.error = !updated.isValid ? 'Valid name and qty > 0 required' : null;
        } else if (activeModule === 'orders') {
          const tot = Number(updated.totalAmount) || 0;
          const pd = Number(updated.paidAmount) || 0;
          updated.balanceDue = Math.max(tot - pd, 0);
          updated.isValid = Boolean(updated.partyName?.trim() && tot > 0);
          updated.error = !updated.isValid ? 'Customer name and total > 0 required' : null;
        }

        return updated;
      })
    );
  };

  const handleDeleteRow = (rowId) => {
    setParsedRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleClearAllRows = () => {
    setParsedRows([]);
    setFileName('');
    setErrorMsg('');
  };

  // ==========================================
  // Execution: Submit Bulk Data to Backend
  // ==========================================
  const handleImportSubmit = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setErrorMsg('No valid rows found to import. Please add at least 1 valid record.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      let res = null;

      if (activeModule === 'parties') {
        res = await migrationService.importParties({ parties: validRows });
      } else if (activeModule === 'products') {
        res = await migrationService.importProducts({ products: validRows, updateStock: true });
      } else if (activeModule === 'rawMaterials') {
        res = await migrationService.importRawMaterials({ rawMaterials: validRows });
      } else if (activeModule === 'orders') {
        res = await migrationService.importOrders({ orders: validRows, adjustPartyBalance: true });
      }

      if (res?.data?.success) {
        setSuccessReport({
          message: res.data.message || 'Data successfully migrated into ERP!',
          stats: res.data.stats || { created: validRows.length },
          module: activeModule,
        });
        setParsedRows([]);
        setFileName('');
        onSuccess && onSuccess();
      } else {
        setErrorMsg(res?.data?.message || 'Failed to complete migration.');
      }
    } catch (err) {
      console.error('Migration submit error:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Error executing migration.');
    } finally {
      setLoading(false);
    }
  };

  const validRowCount = parsedRows.filter((r) => r.isValid).length;
  const invalidRowCount = parsedRows.length - validRowCount;

  // Filtered rows for search in table
  const displayedRows = parsedRows.filter((r) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    const str = JSON.stringify(r).toLowerCase();
    return str.includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col transition-all duration-200 overflow-hidden ${
          isFullScreen ? 'w-full h-full max-w-none max-h-none rounded-none' : 'w-full max-w-6xl max-h-[92vh]'
        }`}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-600/25">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Data Migration & Old Records Import
                </h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  पुरानी डेटा एंट्री
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transition smoothly from manual registers or Excel without losing opening balances or past bills
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFullScreen((prev) => !prev)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Module Category Selector Tabs */}
        <div className="px-6 pt-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pb-3">
            {MODULES.map((m) => {
              const Icon = m.icon;
              const isSelected = activeModule === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => handleSwitchModule(m.id)}
                  className={`flex items-center space-x-2.5 p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-slate-900 to-indigo-950 text-white border-indigo-500 shadow-lg shadow-indigo-600/20'
                      : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                      {m.label}
                    </p>
                    <p className={`text-[10px] truncate ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {m.labelHi}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-Header: Mode Toggle & Sample Template Download */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Entry Method:</span>
            <div className="bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-xl flex items-center text-xs font-bold">
              {activeModule === 'orders' && (
                <button
                  onClick={() => setInputMode('itemized')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                    inputMode === 'itemized'
                      ? 'bg-emerald-600 text-white shadow-sm font-black'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Itemized Register (Bags, Wt, Rate)</span>
                </button>
              )}
              <button
                onClick={() => setInputMode('file')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                  inputMode === 'file'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Excel / CSV</span>
              </button>
              <button
                onClick={() => {
                  setInputMode('manual');
                  if (parsedRows.length === 0) handleAddManualRow();
                }}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                  inputMode === 'manual'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Manual Summary Grid</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold px-3 py-1.5 rounded-xl transition shadow-sm"
              title="Download pre-formatted Excel template with sample data"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Excel Template (सैंपल फॉर्मेट)</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {/* Success Banner */}
          {successReport && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 flex items-start space-x-3.5 animate-fadeIn">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-emerald-800 dark:text-emerald-200">
                  {successReport.message}
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Records have been saved to your business ledger. You can inspect passbook statements, dispatches, and inventory right away.
                </p>
                <div className="pt-2 flex items-center space-x-3">
                  <button
                    onClick={() => setSuccessReport(null)}
                    className="text-xs font-bold text-emerald-800 dark:text-emerald-200 underline hover:no-underline"
                  >
                    + Import more records
                  </button>
                  <button
                    onClick={onClose}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1 rounded-lg transition"
                  >
                    Done & View ERP
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-center space-x-3 text-rose-700 dark:text-rose-300 text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Active Itemized Register Mode for Historical Bills & Orders */}
          {activeModule === 'orders' && inputMode === 'itemized' && (
            <HistoricalBillsMigrationGrid
              parties={partiesList}
              onSuccess={() => {
                onSuccess && onSuccess();
              }}
            />
          )}

          {/* Mode 1: File Upload Drag & Drop */}
          {inputMode === 'file' && parsedRows.length === 0 && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[1.01]'
                  : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500/70 bg-slate-50/50 dark:bg-slate-900/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-500/20 shadow-md">
                <FileSpreadsheet className="w-8 h-8" />
              </div>

              <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1">
                Drag & Drop your Excel (.xlsx, .xls) or CSV sheet here
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
                Click here to browse your files. Auto-detects columns: Party Name, Phone, Opening Balance, Old Bills, Stock, etc.
              </p>

              <div className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/25 transition">
                <Upload className="w-4 h-4" />
                <span>Browse File from Computer</span>
              </div>
            </div>
          )}

          {/* Mode 2 or Parsed Rows Table Preview */}
          {inputMode !== 'itemized' && (parsedRows.length > 0 || inputMode === 'manual') && (
            <div className="space-y-4">
              {/* Row Stats & Search Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                    Preview Data ({parsedRows.length} rows)
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {validRowCount} Ready to Import
                  </span>
                  {invalidRowCount > 0 && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                      {invalidRowCount} Needs Correction
                    </span>
                  )}
                  {fileName && (
                    <span className="text-xs font-mono text-slate-400 truncate max-w-[200px]" title={fileName}>
                      📄 {fileName}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter rows..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    onClick={handleAddManualRow}
                    className="inline-flex items-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 text-xs font-bold px-3 py-1.5 rounded-xl transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Row</span>
                  </button>

                  <button
                    onClick={handleClearAllRows}
                    className="inline-flex items-center space-x-1 text-slate-400 hover:text-rose-600 text-xs font-bold px-2 py-1.5 rounded-lg transition"
                    title="Clear All Rows"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {/* Interactive Grid Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm max-h-[50vh] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  {/* Table Headers */}
                  <thead className="bg-slate-100 dark:bg-slate-800/80 sticky top-0 z-10 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      {activeModule === 'parties' && (
                        <>
                          <th className="py-2.5 px-3">Party Name *</th>
                          <th className="py-2.5 px-3 w-28">Type</th>
                          <th className="py-2.5 px-3 w-36">Phone (10 Digits)</th>
                          <th className="py-2.5 px-3 w-36">Opening Bal (₹)</th>
                          <th className="py-2.5 px-3 w-32">Bal Type</th>
                          <th className="py-2.5 px-3 w-36">GSTIN</th>
                          <th className="py-2.5 px-3">Address</th>
                        </>
                      )}

                      {activeModule === 'products' && (
                        <>
                          <th className="py-2.5 px-3">Product Name *</th>
                          <th className="py-2.5 px-3 w-32">SKU / Code</th>
                          <th className="py-2.5 px-3 w-28">Price (₹) *</th>
                          <th className="py-2.5 px-3 w-28">Stock Qty</th>
                          <th className="py-2.5 px-3 w-24">Unit</th>
                          <th className="py-2.5 px-3 w-32">Category</th>
                        </>
                      )}

                      {activeModule === 'rawMaterials' && (
                        <>
                          <th className="py-2.5 px-3">Raw Material *</th>
                          <th className="py-2.5 px-3 w-32">Category</th>
                          <th className="py-2.5 px-3 w-36">Vendor / Supplier</th>
                          <th className="py-2.5 px-3 w-32">Batch #</th>
                          <th className="py-2.5 px-3 w-28">Stock Qty *</th>
                          <th className="py-2.5 px-3 w-24">Unit</th>
                          <th className="py-2.5 px-3 w-28">Cost (₹)</th>
                        </>
                      )}

                      {activeModule === 'orders' && (
                        <>
                          <th className="py-2.5 px-3 w-32">Bill #</th>
                          <th className="py-2.5 px-3 w-28">Bill Date</th>
                          <th className="py-2.5 px-3">Customer Name *</th>
                          <th className="py-2.5 px-3 w-32">Bill Total (₹) *</th>
                          <th className="py-2.5 px-3 w-32">Old Paid (₹)</th>
                          <th className="py-2.5 px-3 w-32">Balance Due (₹)</th>
                          <th className="py-2.5 px-3">Item Description</th>
                        </>
                      )}
                      <th className="py-2.5 px-3 w-12 text-center">Action</th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                          No rows to show. Click "+ Add Row" or upload an Excel file to get started.
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map((r, idx) => (
                        <tr
                          key={r.id || idx}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                            !r.isValid ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-center text-slate-400 font-mono text-[10px]">
                            {r.isValid ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                            ) : (
                              <span title={r.error} className="text-rose-500 font-bold">
                                !
                              </span>
                            )}
                          </td>

                          {/* Parties Fields */}
                          {activeModule === 'parties' && (
                            <>
                              <td className="py-1.5 px-2">
                                <input
                                  type="text"
                                  value={r.name || ''}
                                  onChange={(e) => handleUpdateRowField(r.id, 'name', e.target.value)}
                                  placeholder="Party Name"
                                  className="w-full px-2 py-1 rounded bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                                />
                              </td>
                              <td className="py-1.5 px-2">
                                <select
                                  value={r.type || 'CUSTOMER'}
                                  onChange={(e) => handleUpdateRowField(r.id, 'type', e.target.value)}
                                  className="w-full px-2 py-1 rounded bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                                >
                                  <option value="CUSTOMER">CUSTOMER</option>
                                  <option value="VENDOR">VENDOR</option>
                                  <option value="BOTH">BOTH</option>
                                </select>
                              </td>
                              <td className="py-1.5 px-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 select-none">
                                    +91
                                  </span>
                                  <input
                                    type="tel"
                                    inputMode="numeric"
                                    maxLength={10}
                                    value={r.phone || ''}
                                    onChange={(e) => {
                                      const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                                      handleUpdateRowField(r.id, 'phone', clean);
                                    }}
                                    placeholder="10 Digits"
                                    className="w-full px-1.5 py-1 rounded font-mono text-xs bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                                  />
                                </div>
                              </td>
                              <td className="py-1.5 px-2">
                                <input
                                  type="number"
                                  value={r.openingBalance !== undefined ? r.openingBalance : ''}
                                  onChange={(e) => handleUpdateRowField(r.id, 'openingBalance', Number(e.target.value))}
                                  placeholder="0.00"
                                  className="w-full px-2 py-1 rounded font-mono font-bold text-right bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                                />
                              </td>
                              <td className="py-1.5 px-2">
                                <select
                                  value={r.openingBalanceType || 'RECEIVABLE'}
                                  onChange={(e) => handleUpdateRowField(r.id, 'openingBalanceType', e.target.value)}
                                  className="w-full px-2 py-1 rounded text-[11px] font-bold bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                                >
                                  <option value="RECEIVABLE">Receivable (लेना है)</option>
                                  <option value="PAYABLE">Payable (देना है)</option>
                                </select>
                              </td>
                              <td className="py-1.5 px-2">
                                <input
                                  type="text"
                                  value={r.gstin || ''}
                                  onChange={(e) => handleUpdateRowField(r.id, 'gstin', e.target.value.toUpperCase())}
                                  placeholder="GSTIN"
                                  className="w-full px-2 py-1 rounded font-mono uppercase bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                                />
                              </td>
                              <td className="py-1.5 px-2">
                                <input
                                  type="text"
                                  value={r.address || ''}
                                  onChange={(e) => handleUpdateRowField(r.id, 'address', e.target.value)}
                                  placeholder="City, State"
                                  className="w-full px-2 py-1 rounded bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none truncate"
                                />
                              </td>
                            </>
                          )}

                          {/* Products Fields */}
                          {activeModule === 'products' && (
                            <>
                              <td className="py-1.5 px-2">
                                <input
                                  type="text"
                                  value={r.productName || ''}
                                  onChange={(e) => handleUpdateRowField(r.id, 'productName', e.target.value)}
                                  placeholder="Product Name"
                                  className="w-full px-2 py-1 rounded bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                                />
                              </td>
                              <td className="py-1.5 px-2">
                                <input
                                  type="text"
                                  value={r.sku || ''}
                                  onChange={(e) => handleUpdateRowField(r.id, 'sku', e.target.value.toUpperCase())}
                                  placeholder="SKU"
                                  className="w-full px-2 py-1 rounded font-mono uppercase bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                                />
                              </td>
                              <td className="py-1.5 px-2">
                                <input
                                  type="number"
                                  value={r.unitPrice !== undefined ? r.unitPrice : ''}
                                  onChange={(e) => handleUpdateRowField(r.id, 'unitPrice', Number(e.target.value))}
                                  placeholder="Rate"
                                  className="w-full px-2 py-1 rounded font-mono font-bold text-right bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                                />
                              </td>
                              <td className="py-1.5 px-2">
                                <input
                                  type="number"
                                  value={r.stockQuantity !== undefined ? r.stockQuantity : ''}
                                  onChange={(e) => handleUpdateRowField(r.id, 'stockQuantity', Number(e.target.value))}
                                  placeholder="Stock"
                                  className="w-full px-2 py-1 rounded font-mono text-right bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                                />
                              </td>
                              <td className="py-1.5 px-2">
                                <input
                                  type="text"
                                  value={r.unit || 'Pieces'}
                                  onChange={(e) => handleUpdateRowField(r.id, 'unit', e.target.value)}
                                  placeholder="Unit"
                                  className="w-full px-2 py-1 rounded bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                                />
                              </td>
                              <td className="py-1.5 px-2">
                                <input
                                  type="text"
                                  value={r.category || 'Finished Goods'}
                                  onChange={(e) => handleUpdateRowField(r.id, 'category', e.target.value)}
                                  placeholder="Category"
                                  className="w-full px-2 py-1 rounded bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                                />
                              </td>
                            </>
                          )}

                          {/* Raw Materials Fields */}
                          {activeModule === 'rawMaterials' && (
                            <>
                              <td className="py-1.5 px-2">
                                <input
                                  type="text"
                                  value={r.materialName || ''}
                                  onChange={(e) => handleUpdateRowField(r.id, 'materialName', e.target.value)}
                                  placeholder="Raw Material Name"
                                  className="w-full px-2 py-1 rounded bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                                />
                              </td>
                              <td className="py-1.5 px-2">
                                <input
                                  type="text"
                                  value={r.category || 'Steel & Metals'}
                                  onChange={(e) => handleUpdateRowField(r.id, 'category', e.target.value)}
                                  placeholder="Category"
                                  className="w-full px-2 py-1 rounded bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                                />
                              </td>
                              <td className="py-1.5 px-2">
                                <input
                                  type="text"
                                  value={r.vendorName || ''}
                                  onChange={(e) => handleUpdateRowField(r.id, 'vendorName', e.target.value)}
                                  placeholder="Vendor Name"
                                  className="w-full px-2 py-1 rounded bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                                />
                              </td>
                              <td className="py-1.5 px-2">
                                <input
                                  type="text"
                                  value={r.batchNumber || ''}
                                  onChange={(e) => handleUpdateRowField(r.id, 'batchNumber', e.target.value.toUpperCase())}
                                  placeholder="Batch #"
                                  className="w-full px-2 py-1 rounded font-mono uppercase bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                                />
                              </td>
                              <td className="py-1.5 px-2">
                                <input
                                  type="number"
                                  value={r.quantityInStock !== undefined ? r.quantityInStock : ''}
                                  onChange={(e) => handleUpdateRowField(r.id, 'quantityInStock', Number(e.target.value))}
                                  placeholder="Qty"
                                  className="w-full px-2 py-1 rounded font-mono font-bold text-right bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                                />
                              </td>
                              <td className="py-1.5 px-2">
                                <input
                                  type="text"
                                  value={r.unit || 'Kg'}
                                  onChange={(e) => handleUpdateRowField(r.id, 'unit', e.target.value)}
                                  placeholder="Unit"
                                  className="w-full px-2 py-1 rounded bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                                />
                              </td>
                              <td className="py-1.5 px-2">
                                <input
                                  type="number"
                                  value={r.unitPrice !== undefined ? r.unitPrice : ''}
                                  onChange={(e) => handleUpdateRowField(r.id, 'unitPrice', Number(e.target.value))}
                                  placeholder="Cost"
                                  className="w-full px-2 py-1 rounded font-mono text-right bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                                />
                              </td>
                            </>
                          )}

                          {/* Orders Fields */}
                          {activeModule === 'orders' && (
                            <>
                              <td className="py-1.5 px-2">
                                <input
                                  type="text"
                                  value={r.orderNumber || ''}
                                  onChange={(e) => handleUpdateRowField(r.id, 'orderNumber', e.target.value.toUpperCase())}
                                  placeholder="Bill #"
                                  className="w-full px-2 py-1 rounded font-mono font-bold uppercase bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                                />
                              </td>
                              <td className="py-1.5 px-2">
                                <input
                                  type="date"
                                  value={r.orderDate || ''}
                                  onChange={(e) => handleUpdateRowField(r.id, 'orderDate', e.target.value)}
                                  className="w-full px-1.5 py-1 rounded text-[11px] bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                                />
                              </td>
                              <td className="py-1.5 px-2">
                                <input
                                  type="text"
                                  value={r.partyName || ''}
                                  onChange={(e) => handleUpdateRowField(r.id, 'partyName', e.target.value)}
                                  placeholder="Customer Name"
                                  className="w-full px-2 py-1 rounded bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                                />
                              </td>
                              <td className="py-1.5 px-2">
                                <input
                                  type="number"
                                  value={r.totalAmount !== undefined ? r.totalAmount : ''}
                                  onChange={(e) => handleUpdateRowField(r.id, 'totalAmount', Number(e.target.value))}
                                  placeholder="Total"
                                  className="w-full px-2 py-1 rounded font-mono font-bold text-right bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                                />
                              </td>
                              <td className="py-1.5 px-2">
                                <input
                                  type="number"
                                  value={r.paidAmount !== undefined ? r.paidAmount : ''}
                                  onChange={(e) => handleUpdateRowField(r.id, 'paidAmount', Number(e.target.value))}
                                  placeholder="Paid"
                                  className="w-full px-2 py-1 rounded font-mono text-emerald-600 dark:text-emerald-400 font-bold text-right bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                                />
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                                {formatCurrency(r.balanceDue || 0)}
                              </td>
                              <td className="py-1.5 px-2">
                                <input
                                  type="text"
                                  value={r.itemDescription || ''}
                                  onChange={(e) => handleUpdateRowField(r.id, 'itemDescription', e.target.value)}
                                  placeholder="Item details..."
                                  className="w-full px-2 py-1 rounded bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none truncate"
                                />
                              </td>
                            </>
                          )}

                          {/* Delete Row Action */}
                          <td className="py-1.5 px-2 text-center">
                            <button
                              onClick={() => handleDeleteRow(r.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title="Delete Row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer & Submit Button */}
        {!(activeModule === 'orders' && inputMode === 'itemized') && (
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
              <Info className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>
                {activeModule === 'parties' && 'Opening balances will be initialized in party accounts and shown in their passbook ledger.'}
                {activeModule === 'products' && 'Product catalog and opening warehouse stock will be updated.'}
                {activeModule === 'rawMaterials' && 'Raw material inward batches will be linked with supplier records.'}
                {activeModule === 'orders' && 'Historical sales bills and due balances will be registered in ledger passbooks.'}
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={handleImportSubmit}
                disabled={loading || validRowCount === 0}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Migrating Data into ERP...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Import {validRowCount} Record(s) into Software (दर्ज करें)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataMigrationModal;
