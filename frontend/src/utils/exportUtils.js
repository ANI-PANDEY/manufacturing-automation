import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(num);
};

export const generateUPIPaymentURL = (upiId, companyName = '', amount = 0) => {
  if (!upiId) return '';
  const cleanUpi = upiId.trim();
  const cleanName = encodeURIComponent(companyName.trim() || 'Enterprise');
  const numAmount = Number(amount) || 0;
  return `upi://pay?pa=${encodeURIComponent(cleanUpi)}&pn=${cleanName}&am=${numAmount}&cu=INR`;
};

export const getUPIQRCodeImageURL = (upiId, companyName = '', amount = 0, size = 200) => {
  const upiUrl = generateUPIPaymentURL(upiId, companyName, amount);
  if (!upiUrl) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(upiUrl)}`;
};

export const shareInvoiceOnWhatsApp = (order, companyName = 'Manufacturing ERP Enterprise', upiId = '') => {
  if (!order) return;
  
  const customerName = order.party?.name || 'Customer';
  const rawPhone = order.party?.phone || '';
  let cleanPhone = rawPhone.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }

  const itemsList = (order.items || [])
    .map((item, idx) => `   ${idx + 1}. *${item.productName || item.product?.productName || 'Item'}* - ${item.quantity} ${item.unit || 'Pcs'} @ ₹${item.unitPrice} = *₹${item.subtotal || item.quantity * item.unitPrice}*`)
    .join('\n');

  let upiText = '';
  if (upiId && order.balanceDue > 0) {
    upiText = `\n\n⚡ *PAY VIA UPI (GPay / PhonePe / Paytm):*\nUPI ID: \`${upiId}\`\nAmount Due: *₹${order.balanceDue}*`;
  }

  const customer10Ph = order.party?.phone ? String(order.party.phone).replace(/\D/g, '').slice(-10) : '';

  const message = 
`🧾 *TAX INVOICE BILL* from *${companyName}*
----------------------------------------
*Invoice No:* ${order.orderNumber}
*Date:* ${new Date(order.orderDate).toLocaleDateString('en-IN')}
*Billed To:* ${customerName}${customer10Ph ? `\n*Phone:* +91 ${customer10Ph}` : ''}

📦 *ITEMS SUMMARY:*
${itemsList}

----------------------------------------
*Total Bill Amount:* ₹${order.totalAmount}
*Amount Paid:* ₹${order.paidAmount}
🔴 *BALANCE DUE:* *₹${order.balanceDue}*
----------------------------------------${upiText}

Thank you for your business! 🙏`;

  const waUrl = cleanPhone 
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

  window.open(waUrl, '_blank');
};

export const shareLedgerOnWhatsApp = (ledgerData, companyName = 'Manufacturing ERP Enterprise', upiId = '') => {
  if (!ledgerData || !ledgerData.party) return;

  const party = ledgerData.party;
  const rawPhone = party.phone || '';
  let cleanPhone = rawPhone.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }

  let upiText = '';
  if (upiId && ledgerData.closingBalance > 0) {
    upiText = `\n\n⚡ *PAYMENT REMINDER VIA UPI:*\nOfficial UPI VPA: \`${upiId}\`\nPay Outstanding: *₹${ledgerData.closingBalance}*`;
  }

  const message = 
`📖 *ACCOUNT LEDGER STATEMENT*
Issued by: *${companyName}*
----------------------------------------
*Customer / Party:* ${party.name}
*GSTIN:* ${party.gstin || 'N/A'}
*Phone:* ${party.phone || 'N/A'}

📊 *ACCOUNT SUMMARY:*
• Opening Balance: ₹${ledgerData.openingBalance || 0}
• Total Sales / Billing (Debit): ₹${ledgerData.totalDebit || 0}
• Total Paid / Receipts (Credit): ₹${ledgerData.totalCredit || 0}
----------------------------------------
🔴 *CURRENT OUTSTANDING BALANCE:* *₹${ledgerData.closingBalance || 0}*
----------------------------------------${upiText}

Please review your statement. Thank you! 🙏`;

  const waUrl = cleanPhone 
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

  window.open(waUrl, '_blank');
};

export const exportLedgerToPDF = (ledgerData, startDate = null, endDate = null, companyName = 'Manufacturing ERP Enterprise') => {
  if (!ledgerData) return;
  const doc = new jsPDF('p', 'mm', 'a4');
  const { party, openingBalance = 0, closingBalance = 0, totalDebit = 0, totalCredit = 0, ledger = [] } = ledgerData;
  const safeCompanyName = (typeof companyName === 'string' && companyName.trim()) ? companyName.trim() : 'Manufacturing ERP Enterprise';

  // Header Background Accent
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 32, 'F');

  // Title & Subtitle
  const titleText = safeCompanyName.toUpperCase();
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(titleText.length > 28 ? 13 : 16);
  doc.text(titleText, 14, 15);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Date-wise B2B Passbook & Split Payment Ledger Statement', 14, 23);

  doc.setTextColor(2, 132, 199);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CONFIDENTIAL B2B STATEMENT', 145, 15);

  // Party Profile Info Box
  doc.setTextColor(30, 41, 59);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 38, 182, 32, 3, 3, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Party: ${party?.name || 'N/A'}`, 18, 46);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const ledgerPh = party?.phone ? `+91 ${String(party.phone).replace(/\D/g, '').slice(-10)}` : 'N/A';
  doc.text(`GSTIN: ${party?.gstin || 'N/A'} | Phone: ${ledgerPh}`, 18, 52);
  doc.text(`Address: ${party?.address || 'N/A'}`, 18, 58);
  doc.text(`Statement Period: ${startDate || 'Beginning'} to ${endDate || 'Present'}`, 18, 64);

  // Balance Metrics Summary Box
  doc.setFont('helvetica', 'bold');
  doc.text(`Opening Balance: ${formatCurrency(openingBalance)}`, 125, 46);
  doc.text(`Total Sales (Debit): ${formatCurrency(totalDebit)}`, 125, 52);
  doc.text(`Total Paid (Credit): ${formatCurrency(totalCredit)}`, 125, 58);
  
  doc.setTextColor(closingBalance > 0 ? 220 : 22, closingBalance > 0 ? 38 : 163, closingBalance > 0 ? 38 : 74);
  doc.text(`Outstanding Balance: ${formatCurrency(closingBalance)}`, 125, 64);

  // Passbook Table
  const tableData = (ledger || []).map((row) => [
    row.date ? new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
    row.type === 'DISPATCH' ? 'OUTWARD DISPATCH' : 'PAYMENT RECEIVED',
    row.refNo || '-',
    row.debit > 0 ? formatCurrency(row.debit) : '-',
    row.credit > 0 ? formatCurrency(row.credit) : '-',
    formatCurrency(row.remainingBalance || 0),
    row.notes || '-',
  ]);

  doc.autoTable({
    startY: 76,
    head: [['Date', 'Transaction Type', 'Ref / Invoice #', 'Debit (₹)', 'Credit (₹)', 'Remaining Balance', 'Mode / Notes']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [14, 116, 144], // cyan-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 32 },
      2: { cellWidth: 28 },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
      6: { cellWidth: 'auto' },
    },
  });

  // Footer Signature
  const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 180) + 15;
  if (finalY < 270) {
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Issued by: ${safeCompanyName} | Computer-generated Ledger Passbook Statement.`, 14, finalY);
  }

  doc.save(`Ledger_Statement_${party?.name ? party.name.replace(/\s+/g, '_') : 'Party'}_${Date.now()}.pdf`);
};

export const exportLedgerToExcel = (ledgerData, companyName = 'Manufacturing ERP Enterprise') => {
  if (!ledgerData) return;
  const { party, openingBalance = 0, closingBalance = 0, totalDebit = 0, totalCredit = 0, ledger = [] } = ledgerData;
  const safeCompanyName = (typeof companyName === 'string' && companyName.trim()) ? companyName.trim() : 'Manufacturing ERP Enterprise';

  const rows = (ledger || []).map((item) => ({
    'Date': item.date ? new Date(item.date).toLocaleDateString('en-IN') : '-',
    'System Entry Date': item.entryDate ? new Date(item.entryDate).toLocaleDateString('en-IN') : '-',
    'Transaction Type': item.type || '-',
    'Reference / Invoice No': item.refNo || '-',
    'Debit (₹)': item.debit || 0,
    'Credit (₹)': item.credit || 0,
    'Remaining Balance (₹)': item.remainingBalance || 0,
    'Payment Mode / Notes': item.notes || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Prepend Summary Headers
  XLSX.utils.sheet_add_aoa(worksheet, [
    ['ISSUED BY (ENTERPRISE)', safeCompanyName],
    ['PARTY NAME', party?.name || 'N/A'],
    ['GSTIN', party?.gstin || 'N/A'],
    ['OPENING BALANCE (₹)', openingBalance],
    ['TOTAL DEBIT / SALES (₹)', totalDebit],
    ['TOTAL CREDIT / RECEIVED (₹)', totalCredit],
    ['CLOSING BALANCE DUE (₹)', closingBalance],
    [],
  ], { origin: 'A1' });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Party_Ledger');

  XLSX.writeFile(workbook, `Ledger_${party?.name ? party.name.replace(/\s+/g, '_') : 'Export'}.xlsx`);
};

export const exportInvoiceToPDF = (order, companyName = 'Manufacturing ERP Enterprise', upiId = '') => {
  if (!order) return;
  const doc = new jsPDF('p', 'mm', 'a4');
  const safeCompanyName = (typeof companyName === 'string' && companyName.trim()) ? companyName.trim() : 'Manufacturing ERP Enterprise';

  // Header Banner Accent
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 36, 'F');

  // Enterprise Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(safeCompanyName.toUpperCase(), 14, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('TAX INVOICE / B2B DISPATCH BILL', 14, 24);
  doc.text(`Invoice No: ${order.orderNumber}`, 14, 30);

  // Status & Date
  doc.setTextColor(56, 189, 248); // sky-400
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`STATUS: ${order.paymentStatus || 'UNPAID'}`, 140, 16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text(`Invoice Date: ${new Date(order.orderDate).toLocaleDateString('en-IN')}`, 140, 24);

  // Customer Party Details Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 42, 182, 32, 3, 3, 'F');

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`BILLED TO: ${order.party?.name || 'Customer Party'}`, 18, 50);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const invoicePh = order.party?.phone ? `+91 ${String(order.party.phone).replace(/\D/g, '').slice(-10)}` : 'N/A';
  doc.text(`GSTIN: ${order.party?.gstin || 'N/A'} | Phone: ${invoicePh}`, 18, 57);
  doc.text(`Address: ${order.party?.address || 'N/A'}`, 18, 64);

  // Items Table
  const tableItems = (order.items || []).map((item, idx) => [
    idx + 1,
    item.productName || item.product?.productName || 'Goods Item',
    `${item.quantity} ${item.unit || 'Pcs'}`,
    formatCurrency(item.unitPrice),
    formatCurrency(item.subtotal || item.quantity * item.unitPrice),
  ]);

  doc.autoTable({
    startY: 80,
    head: [['#', 'Item / Goods Description', 'Quantity & UOM', 'Unit Rate (₹)', 'Subtotal Amount (₹)']],
    body: tableItems,
    theme: 'grid',
    headStyles: {
      fillColor: [14, 116, 144], // cyan-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 32 },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 38, halign: 'right' },
    },
  });

  // Financial Breakdown Box & UPI QR Section
  const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 160) + 8;

  // Payment UPI Box (Left side)
  if (upiId) {
    doc.setFillColor(236, 254, 255); // cyan-50
    doc.roundedRect(14, finalY, 90, 38, 3, 3, 'F');
    doc.setTextColor(14, 116, 144);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('SCAN TO PAY VIA UPI / QR CODE', 18, finalY + 8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8);
    doc.text(`Official UPI ID: ${upiId}`, 18, finalY + 16);
    doc.text(`Accepted: GPay, PhonePe, Paytm, BHIM`, 18, finalY + 22);
    doc.text(`Scan QR code on screen or enter UPI VPA above.`, 18, finalY + 28);
  }

  // Calculation Box (Right side)
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(110, finalY, 86, 38, 3, 3, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Subtotal Amount:`, 114, finalY + 8);
  doc.text(formatCurrency(order.subtotalAmount), 190, finalY + 8, { align: 'right' });

  doc.text(`GST Tax (${order.taxRate || 18}%):`, 114, finalY + 16);
  doc.text(formatCurrency(order.taxAmount), 190, finalY + 16, { align: 'right' });

  doc.setFontSize(11);
  doc.setTextColor(2, 132, 199);
  doc.text(`Total Bill Amount:`, 114, finalY + 26);
  doc.text(formatCurrency(order.totalAmount), 190, finalY + 26, { align: 'right' });

  doc.setFontSize(9);
  doc.setTextColor(220, 38, 38);
  doc.text(`Balance Due:`, 114, finalY + 34);
  doc.text(formatCurrency(order.balanceDue), 190, finalY + 34, { align: 'right' });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`Issued by: ${safeCompanyName} | Computer Generated B2B Tax Invoice Bill.`, 14, 280);

  doc.save(`Invoice_${order.orderNumber}_${Date.now()}.pdf`);
};

