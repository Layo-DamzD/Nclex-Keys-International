const jwt = require('jsonwebtoken');
const User = require('../models/user');

const STUDENT_SUBSCRIPTION_DAYS = 30;

const isStudentSubscriptionExpired = (user) => {
  if (!user || user.role !== 'student') return false;
  const createdAt = user.createdAt ? new Date(user.createdAt) : null;
  if (!createdAt || Number.isNaN(createdAt.getTime())) return false;
  const expiry = new Date(createdAt.getTime() + STUDENT_SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);
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
        return res.status(403).json({ message: 'Your subscription has expired. Please renew to continue.' });
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

module.exports = { protect, adminOnly, superAdminOnly };
