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

export const formatPDFNumber = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatPDFCurrency = (amount) => {
  return `Rs. ${formatPDFNumber(amount)}`;
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
    .map((item, idx) => {
      const bagInfo = item.bags > 0 ? ` [${item.bags} Bags @ ${item.qtyPerBag || ''}kg/bag = ${item.quantity} kg]` : ` [${item.quantity} ${item.unit || 'Kg'}]`;
      return `   ${idx + 1}. *${item.productName || item.product?.productName || 'Item'}*${bagInfo} @ ₹${item.unitPrice} = *₹${item.subtotal || item.quantity * item.unitPrice}*`;
    })
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

  // 1. Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 32, 'F');

  const titleText = safeCompanyName.toUpperCase();
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(titleText.length > 28 ? 12 : 15);
  doc.text(titleText, 14, 14);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('Date-wise B2B Passbook & Split Payment Ledger Statement', 14, 22);

  doc.setTextColor(56, 189, 248); // sky-400
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('CONFIDENTIAL B2B STATEMENT', 196, 14, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  const genDateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.text(`Generated: ${genDateStr}`, 196, 22, { align: 'right' });

  // 2. Party Profile Info Box (Left Card)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 36, 105, 35, 2.5, 2.5, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  const partyDisplayName = (party?.name || 'N/A').toUpperCase();
  doc.text(`Party: ${partyDisplayName}`, 18, 43.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const ledgerPh = party?.phone ? `+91 ${String(party.phone).replace(/\D/g, '').slice(-10)}` : 'N/A';
  doc.text(`GSTIN: ${party?.gstin || 'N/A'}  |  Phone: ${ledgerPh}`, 18, 50.5);

  const cleanAddr = party?.address ? String(party.address).trim() : 'N/A';
  const splitAddr = doc.splitTextToSize(`Address: ${cleanAddr}`, 97);
  doc.text(splitAddr[0] || 'Address: N/A', 18, 57.5);

  doc.setTextColor(100, 116, 139);
  doc.text(`Statement Period: ${startDate || 'Beginning'} to ${endDate || 'Present'}`, 18, 64.5);

  // 3. Balance Metrics Summary Box (Right Card)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(123, 36, 73, 35, 2.5, 2.5, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.text('Opening Balance:', 127, 43);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatPDFCurrency(openingBalance), 192, 43, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Total Sales (Debit):', 127, 49);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatPDFCurrency(totalDebit), 192, 49, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Total Paid (Credit):', 127, 55);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // emerald-600
  doc.text(formatPDFCurrency(totalCredit), 192, 55, { align: 'right' });

  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.line(127, 58, 192, 58);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(closingBalance > 0 ? 220 : 16, closingBalance > 0 ? 38 : 185, closingBalance > 0 ? 38 : 129);
  doc.text('Outstanding Balance:', 127, 64.5);
  doc.text(formatPDFCurrency(closingBalance), 192, 64.5, { align: 'right' });

  // 4. Passbook Table
  const tableData = (ledger || []).map((row) => {
    let cleanType = 'Payment Received';
    if (row.type === 'DISPATCH' || String(row.type).toUpperCase().includes('DISPATCH') || String(row.type).toUpperCase().includes('SALE')) {
      cleanType = 'Outward Dispatch';
    } else if (String(row.type).toUpperCase().includes('ADJUSTMENT')) {
      cleanType = 'Adjustment';
    }

    return [
      row.date ? new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
      cleanType,
      row.refNo || '-',
      row.debit > 0 ? formatPDFNumber(row.debit) : '-',
      row.credit > 0 ? formatPDFNumber(row.credit) : '-',
      formatPDFNumber(row.remainingBalance || 0),
      row.notes || '-',
    ];
  });

  doc.autoTable({
    startY: 76,
    margin: { left: 14, right: 14 },
    head: [['Date', 'Transaction Type', 'Ref / Invoice #', 'Debit (Rs.)', 'Credit (Rs.)', 'Balance (Rs.)', 'Mode / Notes']],
    body: tableData,
    foot: [['Total', '', '', formatPDFNumber(totalDebit), formatPDFNumber(totalCredit), formatPDFNumber(closingBalance), '']],
    theme: 'grid',
    headStyles: {
      fillColor: [14, 116, 144], // cyan-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 1.8,
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 24, halign: 'left' },
      2: { cellWidth: 30, halign: 'left' },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 40, halign: 'left' },
    },
  });

  // Footer Signature & Notice
  const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 180) + 12;
  if (finalY < 275) {
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
  doc.text(`STATUS: ${order.paymentStatus || 'UNPAID'}`, 196, 16, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  const invDateStr = order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
  doc.text(`Invoice Date: ${invDateStr}`, 196, 24, { align: 'right' });

  // Customer Party Details Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 42, 182, 32, 2.5, 2.5, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(`BILLED TO: ${order.party?.name || 'Customer Party'}`, 18, 50);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const invoicePh = order.party?.phone ? `+91 ${String(order.party.phone).replace(/\D/g, '').slice(-10)}` : 'N/A';
  doc.text(`GSTIN: ${order.party?.gstin || 'N/A'}  |  Phone: ${invoicePh}`, 18, 57);
  doc.text(`Address: ${order.party?.address || 'N/A'}`, 18, 64);

  // Items Table
  const hasBags = (order.items || []).some((it) => it.bags > 0);
  const tableHeaders = hasBags
    ? [['#', 'Item / Goods Description', 'Bags', 'Qty/Bag', 'Total Wt', 'Rate (Rs.)', 'Amount (Rs.)']]
    : [['#', 'Item / Goods Description', 'Quantity & UOM', 'Unit Rate (Rs.)', 'Subtotal (Rs.)']];

  const tableItems = (order.items || []).map((item, idx) => {
    if (hasBags) {
      return [
        idx + 1,
        item.productName || item.product?.productName || 'Goods Item',
        item.bags > 0 ? `${item.bags} Bags` : '-',
        item.qtyPerBag > 0 ? `${item.qtyPerBag} kg` : '-',
        `${item.quantity} ${item.unit || 'Kg'}`,
        formatPDFNumber(item.unitPrice),
        formatPDFNumber(item.subtotal || item.quantity * item.unitPrice),
      ];
    }
    return [
      idx + 1,
      item.productName || item.product?.productName || 'Goods Item',
      `${item.quantity} ${item.unit || 'Pcs'}`,
      formatPDFNumber(item.unitPrice),
      formatPDFNumber(item.subtotal || item.quantity * item.unitPrice),
    ];
  });

  doc.autoTable({
    startY: 80,
    margin: { left: 14, right: 14 },
    head: tableHeaders,
    body: tableItems,
    theme: 'grid',
    headStyles: {
      fillColor: [14, 116, 144], // cyan-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: 2.2,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    columnStyles: hasBags
      ? {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 'auto', halign: 'left' },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 24, halign: 'center' },
          5: { cellWidth: 26, halign: 'right' },
          6: { cellWidth: 30, halign: 'right' },
        }
      : {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 'auto', halign: 'left' },
          2: { cellWidth: 32, halign: 'center' },
          3: { cellWidth: 32, halign: 'right' },
          4: { cellWidth: 38, halign: 'right' },
        },
  });

  // Financial Breakdown Box & UPI QR Section
  const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 160) + 8;

  // Payment UPI Box (Left side)
  if (upiId) {
    doc.setFillColor(236, 254, 255); // cyan-50
    doc.setDrawColor(186, 230, 253);
    doc.roundedRect(14, finalY, 92, 38, 2.5, 2.5, 'FD');
    doc.setTextColor(14, 116, 144);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('PAY VIA UPI / ONLINE', 18, finalY + 8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8);
    doc.text(`Official UPI ID: ${upiId}`, 18, finalY + 16);
    doc.text(`Accepted: GPay, PhonePe, Paytm, BHIM UPI`, 18, finalY + 22);
    doc.text(`Scan QR code on screen or send to UPI VPA above.`, 18, finalY + 28);
  }

  // Calculation Box (Right side)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(110, finalY, 86, 38, 2.5, 2.5, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Subtotal Amount:`, 114, finalY + 8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatPDFCurrency(order.subtotalAmount), 192, finalY + 8, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`GST Tax (${order.taxRate || 18}%):`, 114, finalY + 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatPDFCurrency(order.taxAmount), 192, finalY + 16, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(114, finalY + 20, 192, finalY + 20);

  doc.setFontSize(9.5);
  doc.setTextColor(2, 132, 199);
  doc.text(`Total Bill Amount:`, 114, finalY + 26);
  doc.text(formatPDFCurrency(order.totalAmount), 192, finalY + 26, { align: 'right' });

  doc.setFontSize(9);
  doc.setTextColor(220, 38, 38);
  doc.text(`Balance Due:`, 114, finalY + 34);
  doc.text(formatPDFCurrency(order.balanceDue), 192, finalY + 34, { align: 'right' });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`Issued by: ${safeCompanyName} | Computer Generated B2B Tax Invoice Bill.`, 14, 280);

  doc.save(`Invoice_${order.orderNumber}_${Date.now()}.pdf`);
};

export const exportHistoricalBillToPDF = (billData, companyName = 'Manufacturing ERP Enterprise') => {
  if (!billData) return;
  const doc = new jsPDF('p', 'mm', 'a4');
  const safeCompanyName = (typeof companyName === 'string' && companyName.trim()) ? companyName.trim() : 'Manufacturing ERP Enterprise';

  const party = billData.party || billData.partyId || {};
  const items = billData.items || [];
  const billNumber = billData.billNumber || billData.orderNumber || 'HIST-BILL';
  const billDate = billData.date ? new Date(billData.date) : new Date();
  const formattedDate = billDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const totalBags = items.reduce((sum, it) => sum + (Number(it.bags) || 0), 0);
  const totalWeight = Math.round((items.reduce((sum, it) => sum + (Number(it.totalWeight) || 0), 0) + Number.EPSILON) * 100) / 100;
  const subTotal = Number(billData.subTotal || billData.totalAmount || 0);
  const paymentReceived = Number(billData.paymentReceived || billData.paidAmount || 0);
  const balanceDue = Number(billData.balanceDue !== undefined ? billData.balanceDue : subTotal - paymentReceived);
  const paymentStatus = billData.paymentStatus || (balanceDue <= 0 ? 'PAID' : paymentReceived > 0 ? 'PARTIAL' : 'UNPAID');

  // Top Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(safeCompanyName.toUpperCase(), 14, 16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('ORIGINAL TAX INVOICE / REGISTER BILL', 14, 24);
  doc.text(`Bill Ref #: ${billNumber}`, 14, 30);

  doc.setTextColor(56, 189, 248);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`STATUS: ${paymentStatus}`, 196, 16, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text(`Date of Issue: ${formattedDate}`, 196, 24, { align: 'right' });

  // Party Details Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 42, 182, 32, 2.5, 2.5, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(`BILLED TO: ${party.name || 'Valued Customer'}`, 18, 50);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const partyPh = party.phone ? `+91 ${String(party.phone).replace(/\D/g, '').slice(-10)}` : 'N/A';
  doc.text(`GSTIN: ${party.gstin || 'N/A'}  |  Phone: ${partyPh}`, 18, 57);
  doc.text(`Address: ${party.address || 'N/A'}`, 18, 64);

  // Table
  const tableHeaders = [['#', 'Particulars / Description', 'Bags', 'Qty/Bag', 'Total Wt', 'Rate (Rs.)', 'Amount (Rs.)']];
  const tableItems = items.map((it, idx) => [
    idx + 1,
    it.description || 'Goods Item',
    it.bags > 0 ? `${it.bags} Bags` : '-',
    it.qtyPerBag > 0 ? `${it.qtyPerBag} kg` : '-',
    `${it.totalWeight || it.quantity || 0} kg`,
    formatPDFNumber(it.rate || it.unitPrice || 0),
    formatPDFNumber(it.amount || it.subtotal || 0),
  ]);

  doc.autoTable({
    startY: 78,
    margin: { left: 14, right: 14 },
    head: tableHeaders,
    body: tableItems,
    theme: 'grid',
    headStyles: {
      fillColor: [14, 116, 144], // cyan-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: 2.2,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 24, halign: 'center' },
      5: { cellWidth: 26, halign: 'right' },
      6: { cellWidth: 30, halign: 'right' },
    },
  });

  const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 160) + 8;

  // Notes Box (Left)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, finalY, 92, 38, 2.5, 2.5, 'FD');

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('NOTES & REGISTER REMARKS', 18, finalY + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const splitNotes = doc.splitTextToSize(billData.notes || 'Goods dispatched in good condition as per historical pen-and-paper register.', 84);
  doc.text(splitNotes, 18, finalY + 16);
  doc.setTextColor(148, 163, 184);
  doc.text(`Total Qty: ${totalBags > 0 ? `${totalBags} Bags / ` : ''}${totalWeight} kg`, 18, finalY + 32);

  // Financial Breakdown Box (Right)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(110, finalY, 86, 38, 2.5, 2.5, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal Amount:', 114, finalY + 8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatPDFCurrency(subTotal), 192, finalY + 8, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Payment Received:', 114, finalY + 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(`(-) ${formatPDFCurrency(paymentReceived)}`, 192, finalY + 16, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(114, finalY + 20, 192, finalY + 20);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(balanceDue > 0 ? 220 : 16, balanceDue > 0 ? 38 : 185, balanceDue > 0 ? 38 : 129);
  doc.text('Balance Due:', 114, finalY + 28);
  doc.text(formatPDFCurrency(balanceDue), 192, finalY + 28, { align: 'right' });

  // Signatures
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.text('Customer Acceptance Signature', 20, 260);
  doc.line(20, 256, 75, 256);

  doc.text(`For ${safeCompanyName} (Auth Signatory)`, 135, 260);
  doc.line(135, 256, 192, 256);

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Computer-generated B2B Invoice Statement. Issued by ${safeCompanyName}`, 14, 280);

  doc.save(`Bill_${billNumber}_${Date.now()}.pdf`);
};

