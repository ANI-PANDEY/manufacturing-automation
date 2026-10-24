const mongoose = require('mongoose');
const { getUserFromToken } = require('../controllers/authController');

/**
 * Authentication Middleware
 * Validates JWT session token and scopes requests to the authenticated user.
 */
const protect = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
    }

    // Support offline fallback token for admin
    if (token === 'offline_token_admin_2026') {
      req.user = {
        id: 'usr_admin_default',
        email: 'admin@stackpulse.com',
        role: 'ADMIN',
        name: 'StackPulse Administrator',
      };
      req.userId = 'usr_admin_default';
      req.isDemoAdmin = true;
      req.userFilter = { $or: [{ user: req.userId }, { user: { $exists: false } }] };
      return next();
    }

    const decoded = getUserFromToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session. Please log in again.',
      });
    }

    req.user = decoded;
    req.userId = decoded.id;

    const isDemoAdmin =
      decoded.email === 'admin@stackpulse.com' ||
      decoded.email === 'admin@manufacturer.com' ||
      decoded.id === 'usr_admin_default';
    req.isDemoAdmin = isDemoAdmin;

    if (isDemoAdmin) {
      // Demo admin can see demo/seed data or data assigned to them
      req.userFilter = {
        $or: [
          { user: decoded.id },
          ...(mongoose.Types.ObjectId.isValid(decoded.id) ? [{ user: new mongoose.Types.ObjectId(decoded.id) }] : []),
          { user: { $exists: false } },
          { user: null },
        ],
      };
    } else {
      // Every other user strictly sees only their own data (starts completely empty/zero)
      req.userFilter = {
        user: mongoose.Types.ObjectId.isValid(decoded.id)
          ? new mongoose.Types.ObjectId(decoded.id)
          : decoded.id,
      };
    }

    next();
  } catch (error) {
    console.error('[Auth Middleware Error]:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed: ' + error.message,
    });
  }
};

module.exports = { protect };
