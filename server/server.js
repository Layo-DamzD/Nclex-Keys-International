const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure real client IP is preserved behind reverse proxies (Render/Vercel/Nginx)
app.set('trust proxy', true);

// Middleware
app.use(cors());
// Allow very large request payloads so long rationales and rich uploads are not truncated.
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
const logger = require('./middleware/Logger');
app.use(logger);

// MongoDB connection
console.log('🔍 MONGO_URI:', process.env.MONGO_URI);
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

  app.get('/api/test', async (req, res) => {
  try {
    // Test database connection
    const mongoose = require('mongoose');
    const dbState = mongoose.connection.readyState;
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    res.json({ 
      message: 'Server is running', 
      db: states[dbState] || 'unknown',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/student', require('./routes/studentRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/content', require('./routes/contentRoutes'));
app.use('/api/admin/case-studies', require('./routes/caseStudyRoutes'));
app.use('/api/admin/tests', require('./routes/testRoutes'));
app.use('/api/admin/analytics', require('./routes/analyticsRoutes'));
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Friendly body-size error so frontend sees the real cause.
app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request too large. Reduce image size or use file upload URL mode.' });
  }
  return next(err);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
