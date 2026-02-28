const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: String,
  details: String,
  ip: String,
  userAgent: String,
  level: { type: String, enum: ['info', 'warning', 'error'], default: 'info' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SystemLog', systemLogSchema);