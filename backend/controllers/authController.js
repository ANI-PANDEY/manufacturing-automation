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

// Helper to normalize username or email with @stackpulse.com domain
const normalizeEmail = (input) => {
  if (!input) return '';
  let clean = String(input).toLowerCase().trim();
  if (!clean.includes('@')) {
    clean = `${clean}@stackpulse.com`;
  }
  return clean;
};

// Initialize in-memory users list on store if not present
if (!store.users) {
  const defaultSalt = 'defaultsalt123';
  store.users = [
    {
      _id: 'usr_admin_default',
      name: 'StackPulse Administrator',
      email: 'admin@stackpulse.com',
      passwordHash: hashPassword('admin123', defaultSalt),
      salt: defaultSalt,
      securityCodeHash: hashPassword('1234', defaultSalt),
      role: 'ADMIN',
      companyName: 'StackPulse Enterprise',
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
        companyName: user.companyName || 'StackPulse Enterprise',
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
      // Migrate any legacy manufacturer admin account to StackPulse admin and purge manufacturer records
      const legacyAdmin = await User.findOne({ email: 'admin@manufacturer.com' });
      let admin = await User.findOne({ email: 'admin@stackpulse.com' });

      if (legacyAdmin && admin) {
        const Party = require('../models/Party');
        const Product = require('../models/Product');
        const RawMaterial = require('../models/RawMaterial');
        const Order = require('../models/Order');
        const PaymentTransaction = require('../models/PaymentTransaction');

        await Party.updateMany({ user: legacyAdmin._id }, { user: admin._id });
        await Product.updateMany({ user: legacyAdmin._id }, { user: admin._id });
        await RawMaterial.updateMany({ user: legacyAdmin._id }, { user: admin._id });
        await Order.updateMany({ user: legacyAdmin._id }, { user: admin._id });
        await PaymentTransaction.updateMany({ user: legacyAdmin._id }, { user: admin._id });

        await User.deleteMany({ email: 'admin@manufacturer.com' });
        console.log('[Auth]: Legacy admin@manufacturer.com purged from DB.');
      } else if (legacyAdmin && !admin) {
        legacyAdmin.email = 'admin@stackpulse.com';
        legacyAdmin.name = 'StackPulse Administrator';
        legacyAdmin.companyName = 'StackPulse Enterprise';
        await legacyAdmin.save();
        admin = legacyAdmin;
        console.log('[Auth]: Legacy admin@manufacturer.com converted to admin@stackpulse.com.');
      }

      // Purge any other leftover @manufacturer.com accounts
      await User.deleteMany({ email: /@manufacturer\.com$/i });
      if (!admin) {
        console.log('[Auth]: No admin found in DB. Auto-seeding default StackPulse Admin account...');
        const salt = generateSalt();
        const passwordHash = hashPassword('admin123', salt);
        const securityCodeHash = hashPassword('1234', salt);
        admin = await User.create({
          name: 'StackPulse Administrator',
          email: 'admin@stackpulse.com',
          passwordHash,
          salt,
          securityCodeHash,
          role: 'ADMIN',
          companyName: 'StackPulse Enterprise',
        });
        console.log('[Auth]: Default StackPulse Admin user created in DB -> admin@stackpulse.com');
      } else if (!admin.securityCodeHash) {
        admin.securityCodeHash = hashPassword('1234', admin.salt);
        await admin.save();
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
        message: 'Please provide both email/username and password',
      });
    }

    const cleanEmail = normalizeEmail(email);

    // Explicitly reject any legacy manufacturer domain
    if (cleanEmail === 'admin@manufacturer.com' || cleanEmail.endsWith('@manufacturer.com')) {
      return res.status(401).json({
        success: false,
        message: 'The manufacturer account has been removed. Please log in with admin@stackpulse.com (or username "admin").',
      });
    }

    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;

    let user = null;

    if (isDbConnected) {
      user = await User.findOne({ email: cleanEmail });
    }

    // Fallback to in-memory store if DB not connected or user not in DB
    if (!user && Array.isArray(store.users)) {
      user = store.users.find((u) => u.email.toLowerCase() === cleanEmail);
    }

    // Direct check for default admin credentials if DB user was not loaded
    if (!user && cleanEmail === 'admin@stackpulse.com' && password === 'admin123') {
      user = Array.isArray(store.users) ? store.users[0] : null;
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
    const { name, email, password, role, companyName, secretCode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    const cleanEmail = normalizeEmail(email);
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;

    let existingUser = null;
    if (isDbConnected) {
      existingUser = await User.findOne({ email: cleanEmail });
    } else if (Array.isArray(store.users)) {
      existingUser = store.users.find((u) => u.email.toLowerCase() === cleanEmail);
    }

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: `An account with ${cleanEmail} already exists. Please sign in.`,
      });
    }

    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);

    // Hash secret recovery code (defaults to '1234' if omitted)
    const cleanSecretCode = (secretCode && String(secretCode).trim()) ? String(secretCode).trim().toLowerCase() : '1234';
    const securityCodeHash = hashPassword(cleanSecretCode, salt);

    const userPayload = {
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      salt,
      securityCodeHash,
      role: role || 'ADMIN',
      companyName: companyName || 'StackPulse Enterprise',
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
    if (Array.isArray(store.users)) {
      store.users.push(newUserObj);
    }

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

// Reset Password Controller with Secret Code
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, secretCode, newPassword } = req.body;

    if (!email || !secretCode || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, Secret Recovery Code, and New Password are required',
      });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 4 characters long',
      });
    }

    const cleanEmail = normalizeEmail(email);
    const cleanSecretCode = String(secretCode).trim().toLowerCase();

    // Reject legacy manufacturer domain
    if (cleanEmail === 'admin@manufacturer.com' || cleanEmail.endsWith('@manufacturer.com')) {
      return res.status(400).json({
        success: false,
        message: 'The manufacturer domain has been removed. Please reset password using admin@stackpulse.com (or username "admin").',
      });
    }

    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;

    let user = null;

    if (isDbConnected) {
      user = await User.findOne({ email: cleanEmail });
    } else if (Array.isArray(store.users)) {
      user = store.users.find((u) => u.email.toLowerCase() === cleanEmail);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `No account found with '${cleanEmail}'. Please verify your username/email.`,
      });
    }

    const computedSecretHash = hashPassword(cleanSecretCode, user.salt);

    let isSecretValid = false;
    if (user.securityCodeHash && user.securityCodeHash === computedSecretHash) {
      isSecretValid = true;
    } else if (user.securityCode && String(user.securityCode).toLowerCase().trim() === cleanSecretCode) {
      isSecretValid = true;
    } else if (!user.securityCodeHash && (cleanSecretCode === '1234' || cleanSecretCode === 'admin123')) {
      isSecretValid = true;
    }

    if (!isSecretValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Secret Recovery Code. Please enter the correct code.',
      });
    }

    const newSalt = generateSalt();
    const newPasswordHash = hashPassword(newPassword, newSalt);
    const newSecurityCodeHash = hashPassword(cleanSecretCode, newSalt);

    if (isDbConnected && typeof user.save === 'function') {
      user.salt = newSalt;
      user.passwordHash = newPasswordHash;
      user.securityCodeHash = newSecurityCodeHash;
      await user.save();
    }

    if (Array.isArray(store.users)) {
      const memUser = store.users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (memUser) {
        memUser.salt = newSalt;
        memUser.passwordHash = newPasswordHash;
        memUser.securityCodeHash = newSecurityCodeHash;
      }
    }

    return res.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Error resetting password' });
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

