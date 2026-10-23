require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Party = require('./models/Party');
const RawMaterial = require('./models/RawMaterial');
const Product = require('./models/Product');
const Order = require('./models/Order');
const PaymentTransaction = require('./models/PaymentTransaction');
const { ensureDefaultAdmin } = require('./controllers/authController');

const seedData = async () => {
  try {
    const conn = await connectDB();
    if (!conn) {
      console.log('Skipping MongoDB seed insertion - DB offline.');
      return;
    }

    console.log('Clearing old database records...');
    await Party.deleteMany({});
    await RawMaterial.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await PaymentTransaction.deleteMany({});

    console.log('Inserting Parties...');
    const apexSteel = await Party.create({
      name: 'Apex Steel & Alloys Pvt Ltd',
      type: 'BOTH',
      phone: '+91 98201 12345',
      email: 'accounts@apexsteel.com',
      address: 'Plot 42, Industrial Zone 1, Mumbai, Maharashtra 400093',
      gstin: '27AAACA1234A1Z5',
      creditLimit: 1000000,
      currentBalance: 0,
    });

    const titanInd = await Party.create({
      name: 'Titan Industrial Components',
      type: 'CUSTOMER',
      phone: '+91 98790 54321',
      email: 'purchasing@titanind.com',
      address: 'GIDC Estate, Phase II, Ahmedabad, Gujarat 382445',
      gstin: '24BBBCT9876B1Z2',
      creditLimit: 750000,
      currentBalance: 0,
    });

    const globalVendor = await Party.create({
      name: 'Global Precision Machining Ltd',
      type: 'VENDOR',
      phone: '+91 91100 88990',
      email: 'sales@globalprecision.com',
      address: 'Okhla Industrial Area Phase III, New Delhi 110020',
      gstin: '07CCCPG5432C1Z8',
      creditLimit: 500000,
      currentBalance: 0,
    });

    console.log('Inserting Finished Products...');
    const pipe = await Product.create({
      productName: 'Heavy Duty Steel Pipes 50mm',
      sku: 'ST-PIPE-50',
      category: 'Steel Tubes',
      unit: 'Pieces',
      stockQuantity: 250,
      unitPrice: 1500,
      minStockLevel: 20,
    });

    const sheet = await Product.create({
      productName: 'Aluminum Sheets 2mm Grade 6061',
      sku: 'AL-SHEET-2M',
      category: 'Aluminum Sheets',
      unit: 'Metric Ton',
      stockQuantity: 45,
      unitPrice: 85000,
      minStockLevel: 5,
    });

    const rod = await Product.create({
      productName: 'Industrial Copper Rods 10mm',
      sku: 'CU-ROD-10',
      category: 'Copper Components',
      unit: 'Kg',
      stockQuantity: 1200,
      unitPrice: 680,
      minStockLevel: 100,
    });

    console.log('Inserting Inward Raw Materials...');
    await RawMaterial.create({
      materialName: 'Cold Rolled Coil Grade CR-1',
      category: 'Coils & Sheets',
      vendor: globalVendor._id,
      batchNumber: 'BATCH-2026-081',
      unit: 'Metric Ton',
      quantityInStock: 35,
      unitPrice: 62000,
      receivedDate: new Date('2026-07-20'),
      notes: 'Passed quality check & hardness test',
    });

    await RawMaterial.create({
      materialName: 'Brass Billets Grade A',
      category: 'Non-Ferrous Metals',
      vendor: apexSteel._id,
      batchNumber: 'BATCH-2026-092',
      unit: 'Kg',
      quantityInStock: 500,
      unitPrice: 480,
      receivedDate: new Date('2026-07-25'),
      notes: 'Inward for custom brass forging project',
    });

    console.log('Creating Dispatch Orders & Invoices...');
    // Order 1 for Apex Steel: ₹2,00,000 Total
    const order1 = await Order.create({
      orderNumber: 'INV-2026-0801',
      party: apexSteel._id,
      orderDate: new Date('2026-08-01'),
      items: [
        {
          product: pipe._id,
          productName: pipe.productName,
          quantity: 100,
          unitPrice: 1500,
          unit: 'Pieces',
          subtotal: 150000,
        },
      ],
      subtotalAmount: 150000,
      taxRate: 18,
      taxAmount: 27000,
      totalAmount: 177000, // ₹1,77,000
      paidAmount: 0,
      balanceDue: 177000,
      paymentStatus: 'UNPAID',
      dispatchNotes: 'Batch #1 shipped via Blue Dart Logistics',
    });

    // Order 2 for Apex Steel: ₹3,50,000 Total
    const order2 = await Order.create({
      orderNumber: 'INV-2026-0810',
      party: apexSteel._id,
      orderDate: new Date('2026-08-10'),
      items: [
        {
          product: sheet._id,
          productName: sheet.productName,
          quantity: 3,
          unitPrice: 85000,
          unit: 'Metric Ton',
          subtotal: 255000,
        },
      ],
      subtotalAmount: 255000,
      taxRate: 18,
      taxAmount: 45900,
      totalAmount: 300900, // ₹3,00,900
      paidAmount: 0,
      balanceDue: 300900,
      paymentStatus: 'UNPAID',
      dispatchNotes: 'Delivered directly to client Factory #2',
    });

    // Update Apex Steel Balance: 177000 + 300900 = 477900
    apexSteel.currentBalance = 177000 + 300900;
    await apexSteel.save();

    // Order for Titan Ind
    const orderTitan = await Order.create({
      orderNumber: 'INV-2026-0805',
      party: titanInd._id,
      orderDate: new Date('2026-08-05'),
      items: [
        {
          product: rod._id,
          productName: rod.productName,
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
    });

    titanInd.currentBalance = 160480;
    await titanInd.save();

    console.log('Applying Date-wise Partial Payments...');
    // Payment 1 for Apex Steel: ₹50,000 on Date 2026-08-05
    // Allocates to Order 1 (INV-2026-0801)
    const pay1Amount = 50000;
    order1.paidAmount += pay1Amount;
    order1.balanceDue -= pay1Amount;
    order1.paymentStatus = 'PARTIAL';
    await order1.save();

    await PaymentTransaction.create({
      receiptNumber: 'RCP-2026-0001',
      party: apexSteel._id,
      paymentDate: new Date('2026-08-05'),
      entryDate: new Date('2026-08-05'),
      amountPaid: pay1Amount,
      paymentMode: 'BANK_TRANSFER',
      referenceNo: 'NEFT-HDFC-98231',
      allocationType: 'FIFO',
      allocations: [
        {
          order: order1._id,
          orderNumber: order1.orderNumber,
          amountAllocated: pay1Amount,
        },
      ],
      notes: 'Initial 1st installment payment received',
    });

    // Payment 2 for Apex Steel: ₹50,000 on Date 2026-08-12
    const pay2Amount = 50000;
    order1.paidAmount += pay2Amount;
    order1.balanceDue -= pay2Amount;
    order1.paymentStatus = 'PARTIAL';
    await order1.save();

    await PaymentTransaction.create({
      receiptNumber: 'RCP-2026-0002',
      party: apexSteel._id,
      paymentDate: new Date('2026-08-12'),
      entryDate: new Date('2026-08-12'),
      amountPaid: pay2Amount,
      paymentMode: 'UPI',
      referenceNo: 'UPI-ICICI-44321',
      allocationType: 'FIFO',
      allocations: [
        {
          order: order1._id,
          orderNumber: order1.orderNumber,
          amountAllocated: pay2Amount,
        },
      ],
      notes: 'Second partial payment received via UPI',
    });

    // Update Apex Steel current balance after ₹1,00,000 payments
    apexSteel.currentBalance = apexSteel.currentBalance - 100000;
    await apexSteel.save();

    console.log('Ensuring default Admin credentials...');
    await ensureDefaultAdmin();

    console.log('Seed process completed successfully!');
    if (require.main === module) {
      process.exit(0);
    }
  } catch (error) {
    console.error('Error seeding data:', error);
    if (require.main === module) {
      process.exit(1);
    }
  }
};

if (require.main === module) {
  seedData();
}

module.exports = seedData;

