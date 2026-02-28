const SystemLog = require('../models/SystemLog');

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
        ip: req.ip,
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