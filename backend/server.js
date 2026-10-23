const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Root test route
app.get('/', (req, res) => {
  res.json({ message: "Backend is running successfully!" });
});

// Connect Database & Ensure Initial Data
const seedData = require('./seed.js');
const { ensureDefaultAdmin } = require('./controllers/authController');

connectDB().then(async () => {
  try {
    const Party = require('./models/Party');
    const partyCount = await Party.countDocuments();
    if (partyCount === 0) {
      console.log('[Database Seed]: Seeding initial manufacturing ERP data...');
      await seedData();
    }
    // Ensure default admin user is seeded once DB is ready
    await ensureDefaultAdmin();
  } catch (err) {
    console.warn('[Database Seed Warning]:', err.message);
  }
});


// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/parties', require('./routes/partyRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
  const host = mongoose.connection ? mongoose.connection.host : null;
  res.json({
    status: 'OK',
    service: 'Manufacturing ERP API',
    database: {
      connected: isDbConnected,
      host: host,
      name: mongoose.connection ? mongoose.connection.name : null,
      type: host && host.includes('mongodb.net') ? 'MongoDB Atlas (Cloud)' : 'Local / In-Memory',
    },
    timestamp: new Date().toISOString(),
  });
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('[API Error]:', err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`==================================================`);
    console.log(`🚀 Manufacturing ERP Backend API Server Running`);
    console.log(`📍 Endpoint: http://localhost:${port}`);
    console.log(`==================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const nextPort = Number(port) + 1;
      console.warn(`[Port Conflict]: Port ${port} is in use, retrying on port ${nextPort}...`);
      startServer(nextPort);
    } else {
      console.error('[Server Error]:', err);
    }
  });
};

const PORT = process.env.PORT || 5000;
startServer(PORT);

