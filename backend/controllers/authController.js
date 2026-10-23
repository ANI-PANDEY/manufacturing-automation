const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const store = require('../utils/inMemoryStore');

// Helper to hash password with salt using native Node crypto
const hashPassword = (password, salt) => {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
};

// Helper to generate salt
const generateSalt = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Initialize in-memory users list on store if not present
if (!store.users) {
  const defaultSalt = 'defaultsalt123';
  store.users = [
    {
      _id: 'usr_admin_default',
      name: 'System Administrator',
      email: 'admin@manufacturer.com',
      passwordHash: hashPassword('admin123', defaultSalt),
      salt: defaultSalt,
      role: 'ADMIN',
      companyName: 'Manufacturing ERP Enterprise',
      createdAt: new Date(),
    },
  ];
}

// Generate simple secure session token
const generateSessionToken = (user) => {
  const userId = user._id || user.id || 'usr_admin_default';
  const payload = `${userId}:${user.email}:${user.role}:${Date.now()}`;
  return (
    crypto.createHmac('sha256', process.env.JWT_SECRET || 'erp_secret_key_2026').update(payload).digest('hex') +
    '.' +
    Buffer.from(
      JSON.stringify({
        id: userId,
        email: user.email,
        name: user.name,
        role: user.role,
        companyName: user.companyName || 'Manufacturing ERP Enterprise',
      })
    ).toString('base64')
  );
};

// Decode user payload from session token
const getUserFromToken = (token) => {
  try {
    if (!token || !token.includes('.')) return null;
    const parts = token.split('.');
    const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
    return JSON.parse(payloadJson);
  } catch (err) {
    return null;
  }
};

// Automatically seed default admin account if database is empty and assign unassociated records to admin
const ensureDefaultAdmin = async () => {
  try {
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    if (isDbConnected) {
      let admin = await User.findOne({ email: 'admin@manufacturer.com' });
      if (!admin) {
        console.log('[Auth]: No admin found in DB. Auto-seeding default Admin account...');
        const salt = generateSalt();
        const passwordHash = hashPassword('admin123', salt);
        admin = await User.create({
          name: 'System Administrator',
          email: 'admin@manufacturer.com',
          passwordHash,
          salt,
          role: 'ADMIN',
          companyName: 'Manufacturing ERP Enterprise',
        });
        console.log('[Auth]: Default Admin user created in DB -> admin@manufacturer.com');
      }

      // Assign any legacy unassociated records to the default admin so new users get a clean 0 start
      if (admin) {
        const Party = require('../models/Party');
        const Product = require('../models/Product');
        const RawMaterial = require('../models/RawMaterial');
        const Order = require('../models/Order');
        const PaymentTransaction = require('../models/PaymentTransaction');

        const unassignedFilter = { $or: [{ user: { $exists: false } }, { user: null }] };
        await Party.updateMany(unassignedFilter, { user: admin._id });
        await Product.updateMany(unassignedFilter, { user: admin._id });
        await RawMaterial.updateMany(unassignedFilter, { user: admin._id });
        await Order.updateMany(unassignedFilter, { user: admin._id });
        await PaymentTransaction.updateMany(unassignedFilter, { user: admin._id });

        return admin;
      }
    }
    return null;
  } catch (err) {
    console.warn('[Auth Warning]: DB check skipped:', err.message);
    return null;
  }
};

// Login Controller
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;

    let user = null;

    if (isDbConnected) {
      await ensureDefaultAdmin();
      user = await User.findOne({ email: cleanEmail });
    }

    // Fallback to in-memory store if DB not connected or user not in DB
    if (!user) {
      user = store.users.find((u) => u.email.toLowerCase() === cleanEmail);
    }

    // Emergency direct check for default admin credentials
    if (!user && cleanEmail === 'admin@manufacturer.com' && password === 'admin123') {
      user = store.users[0];
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User account not found.',
      });
    }

    const computedHash = hashPassword(password, user.salt);
    if (computedHash !== user.passwordHash) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password combination.',
      });
    }

    const token = generateSessionToken(user);

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyName: user.companyName,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Login server error' });
  }
};

// Register Controller
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, companyName } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;

    let existingUser = null;
    if (isDbConnected) {
      existingUser = await User.findOne({ email: cleanEmail });
    } else {
      existingUser = store.users.find((u) => u.email.toLowerCase() === cleanEmail);
    }

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);

    const userPayload = {
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      salt,
      role: role || 'ADMIN',
      companyName: companyName || 'Manufacturing ERP Enterprise',
    };

    let newUserObj = null;

    if (isDbConnected) {
      const createdUser = await User.create(userPayload);
      newUserObj = createdUser.toObject();
    } else {
      newUserObj = {
        _id: `usr_${Date.now()}`,
        ...userPayload,
        createdAt: new Date(),
      };
    }
    // Always keep in memory store updated as well
    store.users.push(newUserObj);

    const token = generateSessionToken(newUserObj);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: newUserObj._id,
        name: newUserObj.name,
        email: newUserObj.email,
        role: newUserObj.role,
        companyName: newUserObj.companyName,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Registration server error' });
  }
};

// Get Me Controller
exports.getMe = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized, no token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = getUserFromToken(token);

    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session token' });
    }

    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;

    let user = null;
    if (isDbConnected) {
      user = await User.findById(decoded.id).select('-passwordHash -salt');
    }

    if (!user) {
      user = store.users.find((u) => u._id === decoded.id || u.email === decoded.email);
    }

    if (!user) {
      return res.json({
        success: true,
        user: decoded,
      });
    }

    return res.json({
      success: true,
      user: {
        id: user._id || decoded.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyName: user.companyName,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Profile / Company Name Controller
exports.updateProfile = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized, no token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = getUserFromToken(token);

    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session token' });
    }

    const { companyName, name } = req.body;
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;

    let user = null;
    if (isDbConnected) {
      user = await User.findById(decoded.id);
      if (user) {
        if (companyName !== undefined) user.companyName = companyName;
        if (name !== undefined) user.name = name;
        await user.save();
      }
    }

    // Update in-memory store as well
    const memUser = store.users.find((u) => u._id === decoded.id || u.email === decoded.email);
    if (memUser) {
      if (companyName !== undefined) memUser.companyName = companyName;
      if (name !== undefined) memUser.name = name;
    }

    const updatedUserObj = {
      id: user ? user._id : (memUser ? memUser._id : decoded.id),
      name: user ? user.name : (memUser ? memUser.name : (name || decoded.name)),
      email: user ? user.email : (memUser ? memUser.email : decoded.email),
      role: user ? user.role : (memUser ? memUser.role : decoded.role),
      companyName: user ? user.companyName : (memUser ? memUser.companyName : (companyName || 'Manufacturing ERP Enterprise')),
    };

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUserObj,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Error updating profile' });
  }
};

exports.ensureDefaultAdmin = ensureDefaultAdmin;
exports.getUserFromToken = getUserFromToken;

