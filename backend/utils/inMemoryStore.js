const { round2 } = require('./mathUtils');

class InMemoryStore {
  constructor() {
    this.parties = [
      {
        _id: 'p_apex_101',
        name: 'Apex Steel & Alloys Pvt Ltd',
        type: 'BOTH',
        phone: '+91 98201 12345',
        email: 'accounts@apexsteel.com',
        address: 'Plot 42, Industrial Zone 1, Mumbai, MH 400093',
        gstin: '27AAACA1234A1Z5',
        creditLimit: 1000000,
        currentBalance: 377000, // 477900 - 100000 = 377900 -> 377000
        status: 'ACTIVE',
        createdAt: new Date('2026-08-01'),
      },
      {
        _id: 'p_titan_102',
        name: 'Titan Industrial Components',
        type: 'CUSTOMER',
        phone: '+91 98790 54321',
        email: 'purchasing@titanind.com',
        address: 'GIDC Estate, Phase II, Ahmedabad, GJ 382445',
        gstin: '24BBBCT9876B1Z2',
        creditLimit: 750000,
        currentBalance: 160480,
        status: 'ACTIVE',
        createdAt: new Date('2026-08-02'),
      },
      {
        _id: 'p_global_103',
        name: 'Global Precision Machining Ltd',
        type: 'VENDOR',
        phone: '+91 91100 88990',
        email: 'sales@globalprecision.com',
        address: 'Okhla Industrial Area Phase III, New Delhi 110020',
        gstin: '07CCCPG5432C1Z8',
        creditLimit: 500000,
        currentBalance: 0,
        status: 'ACTIVE',
        createdAt: new Date('2026-08-03'),
      },
    ];

    this.products = [
      {
        _id: 'prod_pipe_01',
        productName: 'Heavy Duty Steel Pipes 50mm',
        sku: 'ST-PIPE-50',
        category: 'Steel Tubes',
        unit: 'Pieces',
        stockQuantity: 250,
        unitPrice: 1500,
        minStockLevel: 20,
        createdAt: new Date('2026-08-01'),
      },
      {
        _id: 'prod_sheet_02',
        productName: 'Aluminum Sheets 2mm Grade 6061',
        sku: 'AL-SHEET-2M',
        category: 'Aluminum Sheets',
        unit: 'Metric Ton',
        stockQuantity: 45,
        unitPrice: 85000,
        minStockLevel: 5,
        createdAt: new Date('2026-08-01'),
      },
      {
        _id: 'prod_rod_03',
        productName: 'Industrial Copper Rods 10mm',
        sku: 'CU-ROD-10',
        category: 'Copper Components',
        unit: 'Kg',
        stockQuantity: 1200,
        unitPrice: 680,
        minStockLevel: 100,
        createdAt: new Date('2026-08-01'),
      },
    ];

    this.rawMaterials = [
      {
        _id: 'rm_cr_01',
        materialName: 'Cold Rolled Coil Grade CR-1',
        category: 'Coils & Sheets',
        vendor: 'p_global_103',
        batchNumber: 'BATCH-2026-081',
        unit: 'Metric Ton',
        quantityInStock: 35,
        unitPrice: 62000,
        receivedDate: new Date('2026-07-20'),
        notes: 'Passed quality check & hardness test',
        createdAt: new Date('2026-07-20'),
      },
      {
        _id: 'rm_brass_02',
        materialName: 'Brass Billets Grade A',
        category: 'Non-Ferrous Metals',
        vendor: 'p_apex_101',
        batchNumber: 'BATCH-2026-092',
        unit: 'Kg',
        quantityInStock: 500,
        unitPrice: 480,
        receivedDate: new Date('2026-07-25'),
        notes: 'Inward for custom brass forging project',
        createdAt: new Date('2026-07-25'),
      },
    ];

    this.orders = [
      {
        _id: 'ord_101',
        orderNumber: 'INV-2026-0801',
        party: 'p_apex_101',
        orderDate: new Date('2026-08-01'),
        items: [
          {
            product: 'prod_pipe_01',
            productName: 'Heavy Duty Steel Pipes 50mm',
            quantity: 100,
            unitPrice: 1500,
            unit: 'Pieces',
            subtotal: 150000,
          },
        ],
        subtotalAmount: 150000,
        taxRate: 18,
        taxAmount: 27000,
        totalAmount: 177000,
        paidAmount: 100000,
        balanceDue: 77000,
        paymentStatus: 'PARTIAL',
        dispatchNotes: 'Batch #1 shipped via Blue Dart Logistics',
        createdAt: new Date('2026-08-01'),
      },
      {
        _id: 'ord_102',
        orderNumber: 'INV-2026-0810',
        party: 'p_apex_101',
        orderDate: new Date('2026-08-10'),
        items: [
          {
            product: 'prod_sheet_02',
            productName: 'Aluminum Sheets 2mm Grade 6061',
            quantity: 3,
            unitPrice: 85000,
            unit: 'Metric Ton',
            subtotal: 255000,
          },
        ],
        subtotalAmount: 255000,
        taxRate: 18,
        taxAmount: 45900,
        totalAmount: 300900,
        paidAmount: 0,
        balanceDue: 300900,
        paymentStatus: 'UNPAID',
        dispatchNotes: 'Delivered directly to client Factory #2',
        createdAt: new Date('2026-08-10'),
      },
      {
        _id: 'ord_103',
        orderNumber: 'INV-2026-0805',
        party: 'p_titan_102',
        orderDate: new Date('2026-08-05'),
        items: [
          {
            product: 'prod_rod_03',
            productName: 'Industrial Copper Rods 10mm',
            quantity: 200,
            unitPrice: 680,
            unit: 'Kg',
            subtotal: 136000,
          },
        ],
        subtotalAmount: 136000,
        taxRate: 18,
        taxAmount: 24480,
        totalAmount: 160480,
        paidAmount: 0,
        balanceDue: 160480,
        paymentStatus: 'UNPAID',
        dispatchNotes: 'Express transport delivery',
        createdAt: new Date('2026-08-05'),
      },
    ];

    this.payments = [
      {
        _id: 'pay_101',
        receiptNumber: 'RCP-2026-0001',
        party: 'p_apex_101',
        paymentDate: new Date('2026-08-05'),
        entryDate: new Date('2026-08-05'),
        amountPaid: 50000,
        paymentMode: 'BANK_TRANSFER',
        referenceNo: 'NEFT-HDFC-98231',
        allocationType: 'FIFO',
        allocations: [{ order: 'ord_101', orderNumber: 'INV-2026-0801', amountAllocated: 50000 }],
        notes: 'Initial 1st installment payment received',
        createdAt: new Date('2026-08-05'),
      },
      {
        _id: 'pay_102',
        receiptNumber: 'RCP-2026-0002',
        party: 'p_apex_101',
        paymentDate: new Date('2026-08-12'),
        entryDate: new Date('2026-08-12'),
        amountPaid: 50000,
        paymentMode: 'UPI',
        referenceNo: 'UPI-ICICI-44321',
        allocationType: 'FIFO',
        allocations: [{ order: 'ord_101', orderNumber: 'INV-2026-0801', amountAllocated: 50000 }],
        notes: 'Second partial payment received via UPI',
        createdAt: new Date('2026-08-12'),
      },
    ];

    // Initialize in-memory users array
    const crypto = require('crypto');
    const adminSalt = 'admin_default_salt_2026';
    const adminHash = crypto.createHmac('sha256', adminSalt).update('admin123').digest('hex');
    const adminSecurityHash = crypto.createHmac('sha256', adminSalt).update('1234').digest('hex');

    this.users = [
      {
        _id: 'usr_admin_default',
        name: 'StackPulse Administrator',
        email: 'admin@stackpulse.com',
        passwordHash: adminHash,
        salt: adminSalt,
        securityCodeHash: adminSecurityHash,
        role: 'ADMIN',
        companyName: 'StackPulse Enterprise',
      },
    ];

    // Isolate initial demo records to default admin
    this.parties.forEach((p) => (p.user = 'usr_admin_default'));
    this.products.forEach((p) => (p.user = 'usr_admin_default'));
    this.rawMaterials.forEach((rm) => (rm.user = 'usr_admin_default'));
    this.orders.forEach((o) => (o.user = 'usr_admin_default'));
    this.payments.forEach((pay) => (pay.user = 'usr_admin_default'));
  }
}

const store = new InMemoryStore();
module.exports = store;
