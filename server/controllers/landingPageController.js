const LandingPageConfig = require('../models/LandingPageConfig');

const isValidPageKey = (pageKey) => ['home', 'brainiac'].includes(pageKey);
const cloneStructured = (value) => JSON.parse(JSON.stringify(value));

const getDefaultConfig = (pageKey) => {
  if (pageKey === 'brainiac') {
    return {
      mode: 'structured',
      header: {
        title: 'Meet Our Brainiacs',
        subtitle: 'Coming soon - Our expert tutors will be displayed here!',
      },
      tutors: [
        {
          id: 'brainiac-1',
          name: 'Dr. Sarah Johnson',
          role: 'PhD, Nursing Education',
          bio: 'Specializes in Pharmacology and Critical Care',
          iconClass: 'fa-user-graduate',
          colorClass: 'text-primary',
          imageUrl: '',
        },
        {
          id: 'brainiac-2',
          name: 'Prof. Michael Chen',
          role: 'MSN, RN',
          bio: 'Expert in Medical-Surgical Nursing',
          iconClass: 'fa-user-md',
          colorClass: 'text-success',
          imageUrl: '',
        },
        {
          id: 'brainiac-3',
          name: 'Dr. Amanda Rodriguez',
          role: 'DNP, APRN',
          bio: 'Pediatric and Maternal-Child Health Specialist',
          iconClass: 'fa-user-nurse',
          colorClass: 'text-info',
          imageUrl: '',
        },
      ],
    };
  }

  return {
    mode: 'structured',
    sectionOrder: ['hero', 'stats', 'program', 'testimonials'],
    sections: {
      hero: {
        badgeText: '97% First-Time Pass Rate',
        titleBefore: 'Unlock Your ',
        titleHighlight: 'NCLEX Success',
        titleAfter: ' with Expert Coaching',
        description:
          'NCLEX KEYS International provides comprehensive training for nursing graduates to pass the NCLEX-RN/PN exams with confidence. Join thousands of successful nurses.',
        features: [
          'Personalized Study Plans',
          '10,000+ Practice Questions',
          'Live Virtual Classes',
        ],
        ctaText: 'Get Started',
        ctaUrl: '/signup',
        videoUrl: 'https://www.youtube.com/embed/7ILVwUsfrAc',
        gradientStart: '#0d6efd',
        gradientEnd: '#6f42c1',
      },
      stats: {
        items: [
          { label: 'Nurses Trained', target: 2500, suffix: '+' },
          { label: 'Pass Rate', target: 97, suffix: '%' },
          { label: 'Practice Questions', target: 10000, suffix: '+' },
          { label: 'Tutor Support', value: '24/7' },
        ],
      },
      program: {
        heading: 'Why Choose NCLEX KEYS?',
        subheading: 'Comprehensive NCLEX preparation designed for international nurses',
        cards: [
          {
            icon: 'fa-user-md',
            title: 'Expert Instructors',
            text: 'Learn from NCLEX specialists with 10+ years of teaching experience and clinical practice.',
          },
          {
            icon: 'fa-laptop-house',
            title: 'Live Virtual Classes',
            text: 'Interactive online sessions with real-time Q&A. Attend from anywhere in the world.',
          },
          {
            icon: 'fa-file-alt',
            title: 'Custom Study Plans',
            text: 'Personalized learning path based on your strengths and weaknesses analysis.',
          },
        ],
      },
      testimonials: {
        heading: 'Success Stories',
        subheading: 'Hear from our graduates who passed NCLEX',
        items: [
          {
            id: 1,
            name: 'Maria Santos',
            role: 'Passed NCLEX-RN, 2023',
            text: 'NCLEX KEYS gave me the confidence I needed. The mock exams were exactly like the real test. Passed in 75 questions!',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
            rating: 5,
          },
          {
            id: 2,
            name: 'John Adebayo',
            role: 'Passed NCLEX-PN, 2023',
            text: 'As an international nurse, the cultural adaptation tips were invaluable. The instructors understood our unique challenges.',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
            rating: 4.5,
          },
          {
            id: 3,
            name: 'Sarah Chen',
            role: 'Passed NCLEX-RN, 2024',
            text: 'The personalized study plan identified my weak areas. 24/7 tutor support was amazing when I needed last-minute help.',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
            rating: 5,
          },
        ],
      },
      footer: {
        brandLinkUrl: '/',
        companyBlurb:
          'Empowering international nurses to achieve NCLEX success through comprehensive training programs.',
        socialLinks: {
          facebook: 'https://facebook.com/yourpage',
          x: 'https://x.com/yourpage',
          linkedin: 'https://linkedin.com/company/yourpage',
          youtube: 'https://youtube.com/yourpage',
        },
        contact: {
          email: 'nclexkeysintl.academy@gmail.com',
          phone: '07037367480',
        },
        legal: {
          copyrightText: '© 2026 NCLEX KEYS International. All rights reserved.',
          privacyUrl: '/documents/privacy-policy.pdf',
          termsUrl: '/documents/terms-of-service.pdf',
        },
      },
    },
  };
};

const sanitizeConfig = (input, pageKey) => {
  const config = input && typeof input === 'object' ? input : {};
  if (config.mode === 'structured') {
    // Admin-only editor payload: keep the structured page config shape.
    // We preserve unknown keys intentionally so the editor can evolve without backend rewrites.
    return {
      pageKey,
      config: cloneStructured(config),
    };
  }

  const canvas = config.canvas && typeof config.canvas === 'object' ? config.canvas : {};
  const blocks = Array.isArray(config.blocks) ? config.blocks : [];

  return {
    pageKey,
    config: {
      canvas: {
        width: Number(canvas.width) || 1200,
        height: Number(canvas.height) || 900,
        background: typeof canvas.background === 'string' ? canvas.background : '#ffffff',
      },
      blocks: blocks.map((block, idx) => ({
        ...block,
        id: String(block.id || `block-${idx + 1}`),
        type: ['text', 'button', 'image', 'card', 'box'].includes(block.type) ? block.type : 'text',
        x: Number(block.x) || 0,
        y: Number(block.y) || 0,
        width: Math.max(40, Number(block.width) || 200),
        height: Math.max(30, Number(block.height) || 60),
        zIndex: Number(block.zIndex) || 0,
      })),
    },
  };
};

const getLandingPageConfig = async (req, res) => {
  const { pageKey } = req.params;
  if (!isValidPageKey(pageKey)) {
    return res.status(400).json({ message: 'Invalid page key' });
  }

  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  try {
    const doc = await LandingPageConfig.findOne({ pageKey }).lean();
    if (!doc) {
      return res.json({
        pageKey,
        hasSavedConfig: false,
        config: getDefaultConfig(pageKey),
      });
    }

    res.json({
      pageKey,
      hasSavedConfig: true,
      config: doc.config,
      updatedAt: doc.updatedAt,
      updatedBy: doc.updatedBy || null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const saveLandingPageConfig = async (req, res) => {
  const { pageKey } = req.params;
  if (!isValidPageKey(pageKey)) {
    return res.status(400).json({ message: 'Invalid page key' });
  }

  try {
    const payload = sanitizeConfig(req.body, pageKey);
    const doc = await LandingPageConfig.findOneAndUpdate(
      { pageKey },
      { config: payload.config, updatedBy: req.user._id },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({
      message: 'Landing page saved',
      pageKey,
      hasSavedConfig: true,
      config: doc.config,
      updatedAt: doc.updatedAt,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getPublicLandingPageConfig = async (req, res) => {
  const { pageKey } = req.params;
  if (!isValidPageKey(pageKey)) {
    return res.status(400).json({ message: 'Invalid page key' });
  }

  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  try {
    const doc = await LandingPageConfig.findOne({ pageKey }).lean();
    if (!doc) {
      return res.json({ pageKey, hasSavedConfig: false, config: null });
    }
    res.json({
      pageKey,
      hasSavedConfig: true,
      config: doc.config,
      updatedAt: doc.updatedAt,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getLandingPageConfig,
  saveLandingPageConfig,
  getPublicLandingPageConfig,
};
