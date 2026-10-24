require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connStr = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/manufacturing_erp';
    const isAtlas = connStr.includes('mongodb+srv://') || connStr.includes('mongodb.net');
    
    console.log(`[MongoDB]: Connecting to ${isAtlas ? 'MongoDB Atlas Cluster' : 'Local MongoDB'}...`);

    const conn = await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`[MongoDB Connected]: ${conn.connection.host} (Database: ${conn.connection.name})`);
    return conn;
  } catch (error) {
    console.warn(`[MongoDB Warning]: Could not connect to configured MongoDB (${error.message}).`);
    
    // On hosted cloud production (like Render), fail explicitly if DB unreachable
    if (process.env.NODE_ENV === 'production' && (process.env.RENDER || process.env.VERCEL) && process.env.MONGO_URI) {
      console.error('[MongoDB Error]: Production database connection failed. Please verify Atlas network access / IP whitelist and credentials.');
      throw error;
    }

    console.warn('[MongoDB Fallback]: Starting In-Memory MongoDB Replica Set for seamless local execution...');
    try {
      const { MongoMemoryReplSet } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
      const mongoUri = mongoServer.getUri();
      const conn = await mongoose.connect(mongoUri);
      console.log(`[In-Memory MongoDB Connected]: ${conn.connection.host}`);
      return conn;
    } catch (memError) {
      console.error(`[In-Memory MongoDB Error]: ${memError.message}`);
      return null;
    }
  }
};

module.exports = connectDB;

