const SystemLog = require('../models/SystemLog');

const normalizeIp = (raw = '') => String(raw || '').trim().replace(/^::ffff:/, '');

const resolveClientIp = (req) => {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').trim();
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0];
    if (first) return normalizeIp(first);
  }

  const realIp = String(req.headers['x-real-ip'] || '').trim();
  if (realIp) return normalizeIp(realIp);

  const cfIp = String(req.headers['cf-connecting-ip'] || '').trim();
  if (cfIp) return normalizeIp(cfIp);

  return normalizeIp(req.ip || req.socket?.remoteAddress || '');
};

const logger = async (req, res, next) => {
  // Store original end method
  const originalEnd = res.end;
  
  // Override end method to log after response
  res.end = function(...args) {
    // Log after response is sent
    if (req.user) {
      const log = new SystemLog({
        user: req.user.id,
        action: `${req.method} ${req.originalUrl}`,
        details: JSON.stringify({
          body: req.body,
          query: req.query,
          params: req.params
        }),
        ip: resolveClientIp(req),
        userAgent: req.get('User-Agent'),
        level: res.statusCode >= 400 ? 'error' : 'info'
      });
      log.save().catch(err => console.error('Logging failed:', err));
    }
    
    originalEnd.apply(res, args);
  };
  
  next();
};

module.exports = logger;
