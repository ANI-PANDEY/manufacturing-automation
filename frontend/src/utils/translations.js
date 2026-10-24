export const translations = {
  en: {
    // Brand & Header
    appTitle: 'StackPulse ERP',
    appSubtitle: 'Enterprise Manufacturing & Split Payment Reconciliation System',
    overviewDashboard: 'Overview Dashboard',
    partyLedger: 'Party Passbook Ledger',
    partyDirectory: 'Party & Client Directory',
    dispatchInvoices: 'Dispatch Invoices',
    inventoryStock: 'Inventory & Stock',
    reconcileBadge: 'Reconcile',

    // Actions & Buttons
    receivePayment: 'Receive Payment',
    createDispatch: 'New Dispatch',
    inwardStock: 'Inward Stock',
    exportPdf: 'Export PDF',
    exportExcel: 'Export Excel',
    addParty: '+ Add New Party',
    addProduct: '+ Add Finished Product',
    viewLedger: 'View Ledger',
    payBalance: 'Pay Balance',
    cancel: 'Cancel',

    // Summary Metrics
    totalOutstandingDue: 'Total Outstanding Due',
    b2bDispatchOrders: 'B2B Dispatch Orders',
    activeParties: 'Active Parties',
    inventoryProducts: 'Inventory & Products',
    openingBalance: 'Opening Balance',
    totalDispatchesDebit: 'Total Dispatches (Debit)',
    totalPaymentsCredit: 'Total Payments (Credit)',
    closingOutstandingDue: 'Closing Outstanding Due',

    // Table Columns
    paymentValueDate: 'Payment / Value Date',
    transactionType: 'Transaction Type',
    refInvoiceNo: 'Ref / Invoice #',
    debitRs: 'Debit (₹)',
    creditRs: 'Credit (₹)',
    remainingBalanceRs: 'Remaining Balance (₹)',
    status: 'Status',
    modeNotes: 'Mode / Notes',

    // Statuses
    statusUnpaid: 'UNPAID',
    statusPartial: 'PARTIAL',
    statusPaid: 'PAID',
    statusReconciled: 'RECONCILED',

    // Receive Payment Modal
    modalReceiveTitle: 'Receive Customer Payment',
    modalReceiveDesc: 'Record full or partial payment & update passbook',
    selectCustomerLabel: '1. Select Customer / Party',
    beforePayment: 'Before Payment',
    payingNow: 'Paying Now',
    remainingDue: 'Remaining Due',
    paymentDateLabel: '2. Payment Date (Value Date)',
    amountReceivedLabel: '3. Amount Received (₹)',
    paymentModeLabel: 'Payment Mode',
    refNumberLabel: 'Reference / UTR / Cheque No.',
    settlementMethodLabel: '4. How should this payment settle pending invoices?',
    fifoRecommended: 'FIFO Auto-Reconcile',
    fifoDesc: 'Auto-settles oldest unpaid invoices first. Easiest for routine payments.',
    specificInvoice: 'Specific Invoice',
    specificInvoiceDesc: 'Pick a specific invoice number to apply this payment against.',
    paymentRemarks: 'Payment Remarks / Notes (Optional)',
    savePaymentBtn: 'Save & Reconcile Payment',

    // Quick Guide
    quickGuideTitle: 'How to Use StackPulse ERP',
    quickGuideSubtitle: '4 simple steps to manage stock, orders, and customer payment passbooks',
    step1Title: 'Add B2B Parties',
    step1Desc: 'Register your customers and vendor suppliers with GSTIN & credit limits.',
    step2Title: 'Inward Stock',
    step2Desc: 'Record raw material batches (Kg, MT, Pcs) received from vendors.',
    step3Title: 'Dispatch Order',
    step3Desc: 'Create sales invoices with GST tax. Stock is auto-deducted.',
    step4Title: 'Receive Payment',
    step4Desc: 'Record split/partial payments. Reconcile date-wise passbook ledger.',
  },

  hi: {
    // Brand & Header
    appTitle: 'StackPulse ईआरपी',
    appSubtitle: 'मैन्युफैक्चरिंग एवं पार्ट पेमेंट हिसाब प्रणाली',
    overviewDashboard: 'ओवरव्यू डैशबोर्ड',
    partyLedger: 'पार्टी पासबुक लेजर (खाता)',
    partyDirectory: 'पार्टी व ग्राहक सूची',
    dispatchInvoices: 'डिस्पैच चालान व बिल',
    inventoryStock: 'स्टॉक व इन्वेंट्री',
    reconcileBadge: 'हिसाब मिलाएं',

    // Actions & Buttons
    receivePayment: 'भुगतान प्राप्त करें',
    createDispatch: 'नया डिस्पैच चालान',
    inwardStock: 'कच्चा माल आवक',
    exportPdf: 'पीडीएफ डाउनलोड',
    exportExcel: 'एक्सेल डाउनलोड',
    addParty: '+ नई पार्टी जोड़ें',
    addProduct: '+ नया तैयार माल जोड़ें',
    viewLedger: 'खाता देखें',
    payBalance: 'बकाया चुकाएं',
    cancel: 'रद्द करें',

    // Summary Metrics
    totalOutstandingDue: 'कुल बकाया राशि',
    b2bDispatchOrders: 'बी2बी डिस्पैच आर्डर',
    activeParties: 'सक्रिय पार्टियां',
    inventoryProducts: 'कुल स्टॉक व उत्पाद',
    openingBalance: 'शुरुआती बैलेंस (ओपनिंग)',
    totalDispatchesDebit: 'कुल बिक्री/डिस्पैच (डेबिट)',
    totalPaymentsCredit: 'कुल प्राप्त भुगतान (क्रेडिट)',
    closingOutstandingDue: 'अंतिम बकाया शेष (क्लोजिंग)',

    // Table Columns
    paymentValueDate: 'भुगतान / वैल्यू तारीख',
    transactionType: 'लेन-देन प्रकार',
    refInvoiceNo: 'रेफरेंस / चालान संख्या',
    debitRs: 'डेबिट / बिक्री (₹)',
    creditRs: 'क्रेडिट / जमा (₹)',
    remainingBalanceRs: 'शेष बकाया (₹)',
    status: 'स्थिति (स्टेटस)',
    modeNotes: 'माध्यम व विवरण',

    // Statuses
    statusUnpaid: 'अदत्त (बाकी)',
    statusPartial: 'आंशिक जमा',
    statusPaid: 'पूर्ण चुकता',
    statusReconciled: 'हिसाब मिलान',

    // Receive Payment Modal
    modalReceiveTitle: 'ग्राहक से भुगतान प्राप्त करें',
    modalReceiveDesc: 'पूरा या आंशिक भुगतान दर्ज करें और खाता अपडेट करें',
    selectCustomerLabel: '1. पार्टी या ग्राहक चुनें',
    beforePayment: 'भुगतान से पहले',
    payingNow: 'अभी जमा राशि',
    remainingDue: 'शेष बकाया',
    paymentDateLabel: '2. भुगतान की तारीख (वैल्यू डेट)',
    amountReceivedLabel: '3. प्राप्त राशि (₹)',
    paymentModeLabel: 'भुगतान का माध्यम',
    refNumberLabel: 'यूटीआर / चेक / रेफरेंस नंबर',
    settlementMethodLabel: '4. यह भुगतान पुराने बिलों का हिसाब कैसे चुकता करे?',
    fifoRecommended: 'पुराने बिल पहले चुकता करें (FIFO)',
    fifoDesc: 'सबसे पुराने बाकी बिलों को पहले स्वचालित रूप से चुकाता है।',
    specificInvoice: 'विशिष्ट बिल नंबर चुनें',
    specificInvoiceDesc: 'किसी खास बिल नंबर को चुनकर भुगतान दर्ज करें।',
    paymentRemarks: 'भुगतान विवरण / टिप्पणी (ऐच्छिक)',
    savePaymentBtn: 'भुगतान सहेजें व हिसाब मिलाएं',

    // Quick Guide
    quickGuideTitle: 'ईआरपी सॉफ्टवेयर का उपयोग कैसे करें',
    quickGuideSubtitle: 'स्टॉक, बिल और ग्राहक पासबुक खाता प्रबंधित करने के 4 आसान चरण',
    step1Title: '1. पार्टी जोड़ें',
    step1Desc: 'अपने ग्राहकों और सप्लायरों को जीएसटी नंबर के साथ पंजीकृत करें।',
    step2Title: '2. कच्चा माल आवक',
    step2Desc: 'सप्लायर से प्राप्त कच्चे माल का स्टॉक दर्ज करें।',
    step3Title: '3. नया चालान / बिल',
    step3Desc: 'जीएसटी बिल बनाएं। स्टॉक अपने आप कम हो जाएगा।',
    step4Title: '4. भुगतान प्राप्त करें',
    step4Desc: 'पार्ट पेमेंट जमा करें और तारीख-वार पासबुक लेजर मिलाएं।',
  },

  hi_en: {
    // Brand & Header
    appTitle: 'StackPulse ERP',
    appSubtitle: 'Manufacturing aur Split Payment Reconciliation System',
    overviewDashboard: 'Overview Dashboard',
    partyLedger: 'Party Passbook Ledger (Khata)',
    partyDirectory: 'Party & Customer List',
    dispatchInvoices: 'Dispatch Invoices aur Bill',
    inventoryStock: 'Stock aur Inventory',
    reconcileBadge: 'Hisab Milayein',

    // Actions & Buttons
    receivePayment: 'Payment Receive Karein',
    createDispatch: 'Naya Dispatch Bill',
    inwardStock: 'Kachha Maal Inward',
    exportPdf: 'PDF Download',
    exportExcel: 'Excel Download',
    addParty: '+ Nayi Party Jodein',
    addProduct: '+ Naya Taiyar Maal Jodein',
    viewLedger: 'Khata Dekhein',
    payBalance: 'Bakaya Chukaaein',
    cancel: 'Cancel',

    // Summary Metrics
    totalOutstandingDue: 'Total Bakaya Rashi',
    b2bDispatchOrders: 'B2B Dispatch Orders',
    activeParties: 'Active Parties',
    inventoryProducts: 'Total Stock aur Products',
    openingBalance: 'Opening Balance',
    totalDispatchesDebit: 'Total Sales/Dispatch (Debit)',
    totalPaymentsCredit: 'Total Received Payment (Credit)',
    closingOutstandingDue: 'Closing Bakaya Rashi',

    // Table Columns
    paymentValueDate: 'Payment / Value Tareekh',
    transactionType: 'Transaction Type',
    refInvoiceNo: 'Ref / Invoice Number',
    debitRs: 'Debit / Sales (₹)',
    creditRs: 'Credit / Jamaa (₹)',
    remainingBalanceRs: 'Shesh Bakaya (₹)',
    status: 'Status',
    modeNotes: 'Payment Mode & Notes',

    // Statuses
    statusUnpaid: 'UNPAID (Baaki)',
    statusPartial: 'PARTIAL (Aanshik Jamaa)',
    statusPaid: 'PAID (Poora Chukaaya)',
    statusReconciled: 'RECONCILED (Hisab Milaa)',

    // Receive Payment Modal
    modalReceiveTitle: 'Customer Se Payment Receive Karein',
    modalReceiveDesc: 'Poora ya partial payment darj karein aur khata update karein',
    selectCustomerLabel: '1. Customer ya Party Chunein',
    beforePayment: 'Payment Se Pehle',
    payingNow: 'Abhi Jamaa Rashi',
    remainingDue: 'Shesh Bakaya',
    paymentDateLabel: '2. Payment Tareekh (Value Date)',
    amountReceivedLabel: '3. Receive Hui Rashi (₹)',
    paymentModeLabel: 'Payment Mode / Tareeqa',
    refNumberLabel: 'UTR / Cheque / Ref Number',
    settlementMethodLabel: '4. Yeh payment purane bills ka hisab kaise chukaaye?',
    fifoRecommended: 'Purane Bills Pehle Chukaayein (FIFO)',
    fifoDesc: 'Subse purane baaki bills ko pehle auto-settle karta hai.',
    specificInvoice: 'Specific Invoice Number',
    specificInvoiceDesc: 'Kisi khas invoice number ko chunkar payment darj karein.',
    paymentRemarks: 'Payment Notes / Remark (Optional)',
    savePaymentBtn: 'Payment Save & Hisab Milayein',

    // Quick Guide
    quickGuideTitle: 'ERP Software Ka Use Kaise Karein',
    quickGuideSubtitle: 'Stock, bills aur customer passbook khata manage karne ke 4 aasan tarike',
    step1Title: '1. Party Jodein',
    step1Desc: 'Apne customers aur vendors ko GSTIN ke sath register karein.',
    step2Title: '2. Kachha Maal Inward',
    step2Desc: 'Vendors se receive hua kachha maal stock darj karein.',
    step3Title: '3. Naya Invoice Bill',
    step3Desc: 'GST sales bill banayein. Stock auto deduct ho jayega.',
    step4Title: '4. Payment Receive Karein',
    step4Desc: 'Part payment jama karein aur date-wise passbook khata milayein.',
  },
};

export const getTranslation = (lang = 'en', key) => {
  const currentLangDict = translations[lang] || translations.en;
  return currentLangDict[key] || translations.en[key] || key;
};
