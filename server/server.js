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

// ============================================================
// MAINTENANCE MODE — set to false to disable, true to block entire API
// ============================================================
const MAINTENANCE_MODE = false;

// Maintenance middleware — blocks everything
app.use((req, res, next) => {
  if (MAINTENANCE_MODE) {
    return res.status(403).json({
      error: '403',
      message: 'This service is temporarily unavailable. Please contact the developer.'
    });
  }
  next();
});

// Middleware
app.use(cors());
// Allow very large request payloads so long rationales and rich uploads are not truncated.
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));
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

// Serve images stored in MongoDB (PUBLIC endpoint - accessible without auth)
app.get('/api/images/:imageId', async (req, res) => {
  try {
    const Image = require('./models/Image');
    const { imageId } = req.params;

    const image = await Image.findOne({ imageId }).lean();

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Set proper headers
    res.set('Content-Type', image.mimeType);
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.set('X-Content-Type-Options', 'nosniff');

    // Decode base64 and send
    const buffer = Buffer.from(image.data, 'base64');
    res.send(buffer);
  } catch (error) {
    console.error('Image serve error:', error);
    res.status(500).json({ message: 'Error serving image' });
  }
});

// List all images (for admin management)
app.get('/api/images', async (req, res) => {
  try {
    const Image = require('./models/Image');
    const { category, limit = 50, page = 1 } = req.query;

    const filter = {};
    if (category) filter.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const images = await Image.find(filter)
      .select('imageId filename mimeType size category createdAt')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Image.countDocuments(filter);

    res.json({
      images,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Image list error:', error);
    res.status(500).json({ message: 'Error listing images' });
  }
});

// Delete an image by imageId
app.delete('/api/images/:imageId', async (req, res) => {
  try {
    const Image = require('./models/Image');
    const { imageId } = req.params;

    const result = await Image.deleteOne({ imageId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Image not found' });
    }

    res.json({ message: 'Image deleted successfully', imageId });
  } catch (error) {
    console.error('Image delete error:', error);
    res.status(500).json({ message: 'Error deleting image' });
  }
});

// Debug endpoint to test landing page config query
app.get('/api/debug/landing-config', async (req, res) => {
  try {
    const LandingPageConfig = require('./models/LandingPageConfig');
    console.log('[Debug] Starting landing config query...');
    const startTime = Date.now();
    
    const doc = await LandingPageConfig.findOne({ pageKey: 'home' })
      .lean()
      .maxTimeMS(5000)
      .catch(err => {
        console.error('[Debug] Query error:', err.message);
        return null;
      });
    
    const elapsed = Date.now() - startTime;
    console.log('[Debug] Query completed in', elapsed, 'ms');
    
    res.json({
      success: true,
      elapsed: elapsed + 'ms',
      found: !!doc,
      hasConfig: !!doc?.config,
      configMode: doc?.config?.mode || null,
      programCardsCount: doc?.config?.sections?.program?.cards?.length || 0,
      testimonialsCount: doc?.config?.sections?.testimonials?.items?.length || 0
    });
  } catch (error) {
    console.error('[Debug] Error:', error);
    res.status(500).json({ error: error.message });
  }
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
