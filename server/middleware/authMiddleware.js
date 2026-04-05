const jwt = require('jsonwebtoken');
const User = require('../models/user');

const STUDENT_SUBSCRIPTION_DAYS = 30;

const isStudentSubscriptionExpired = (user) => {
  if (!user || user.role !== 'student') return false;
  // Use subscriptionStartDate if available, fallback to createdAt
  const startDate = user.subscriptionStartDate ? new Date(user.subscriptionStartDate) : (user.createdAt ? new Date(user.createdAt) : null);
  if (!startDate || Number.isNaN(startDate.getTime())) return false;
  const expiry = new Date(startDate.getTime() + STUDENT_SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);
  return Date.now() > expiry.getTime();
};

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized' });
      }

      if (isStudentSubscriptionExpired(req.user) && req.user.status !== 'inactive') {
        await User.updateOne({ _id: req.user._id }, { $set: { status: 'inactive' } });
        req.user.status = 'inactive';
      }

      if (req.user.status && req.user.status !== 'active') {
        return res.status(403).json({ message: 'Your subscription has expired. Kindly renew your subscription to continue enjoying the service.' });
      }

      next();
      return;
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  return res.status(401).json({ message: 'Not authorized, no token' });
};

// Authentication-only middleware — validates token but does NOT check subscription status.
// Use for endpoints that should be accessible to all authenticated users regardless of subscription.
const authOnly = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized' });
      }

      next();
      return;
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  return res.status(401).json({ message: 'Not authorized, no token' });
};

const adminOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Admins only' });
  }
};

const superAdminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Super admin only' });
  }
};

module.exports = { protect, authOnly, adminOnly, superAdminOnly };
