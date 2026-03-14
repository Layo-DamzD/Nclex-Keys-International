const LandingPageConfig = require('../models/LandingPageConfig');
const PublicTestLead = require('../models/PublicTestLead');
const { sendPublicTestLeadEmail } = require('../services/emailService');

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
        subheading: 'Strategic, intensive coaching that transforms NCLEX preparation into confident success.',
        cards: [
          {
            icon: 'fa-bullseye',
            title: 'Strategic Coaching',
            text: 'Intensive, results-driven coaching that meticulously decodes NCLEX exam logic.',
          },
          {
            icon: 'fa-chalkboard-user',
            title: 'Expert Mentorship',
            text: 'Learn from RNs and experienced educators with 25+ years of clinical practice.',
          },
          {
            icon: 'fa-award',
            title: 'Proven Success',
            text: 'Over 100 aspiring nurses successfully guided to NCLEX licensure with confidence.',
          },
          {
            icon: 'fa-book-open',
            title: 'Comprehensive Content',
            text: 'High-quality learning materials designed for immediate professional success.',
          },
          {
            icon: 'fa-circle-check',
            title: 'Confidence Building',
            text: 'Transform from anxious test taker to confident, competent clinician.',
          },
          {
            icon: 'fa-users',
            title: 'Global Engagement',
            text: 'Strategic collaboration and support for nursing professionals worldwide.',
          },
          {
            icon: 'fa-gears',
            title: 'Customised Study Plan',
            text: 'Personalized preparation roadmap focused on your weak areas and exam goals.',
          },
        ],
        missionVision: {
          heading: 'Our Mission & Vision',
          cards: [
            {
              icon: 'fa-bullseye',
              title: 'Mission',
              text: 'NCLEX KEYS is dedicated to empowering future nurses by providing intensive, results-driven coaching and strategic mentorship.',
            },
            {
              icon: 'fa-people-arrows',
              title: 'Vision',
              text: 'To be the globally recognized premier standard for strategic NCLEX preparation, transforming aspiring nurses into confident, licensed clinicians.',
            },
          ],
        },
      },
      testimonials: {
        heading: 'Success Stories',
        subheading: 'Hear from our graduates who passed NCLEX',
        items: [],
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


const getFullCountryName = (value = '', locale = 'en') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.length !== 2) return raw;
  try {
    const names = new Intl.DisplayNames([locale], { type: 'region' });
    return names.of(raw.toUpperCase()) || raw;
  } catch {
    return raw;
  }
};

const resolveClientIp = (req) => {
  const forwarded = String(req.headers['x-forwarded-for'] || '').trim();
  if (forwarded) return forwarded.split(',')[0].trim();
  return String(req.ip || req.socket?.remoteAddress || '').trim();
};

const createPublicTestLead = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim();
    const attempted = Number(req.body?.attempted || 0);
    const total = Number(req.body?.total || 0);
    const score = Number(req.body?.score || 0);
    const percent = Number(req.body?.percentage || 0);
    const browserLocation = req.body?.browserLocation && typeof req.body.browserLocation === 'object'
      ? req.body.browserLocation
      : null;
    const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    const ip = resolveClientIp(req);
    const countryRaw =
      String(req.body?.countryName || '').trim()
      || String(req.headers['cf-ipcountry'] || '').trim()
      || String(req.headers['x-vercel-ip-country'] || '').trim()
      || 'Unknown';
    const country = getFullCountryName(countryRaw);
    const region = String(req.headers['x-vercel-ip-country-region'] || '').trim() || '';
    const city = String(req.headers['x-vercel-ip-city'] || '').trim() || '';
    const ua = String(req.get('user-agent') || '').trim();

    const locationLine = browserLocation?.latitude && browserLocation?.longitude
      ? `${browserLocation.latitude}, ${browserLocation.longitude}`
      : [city, region, country].filter(Boolean).join(', ') || 'Unknown';

    await PublicTestLead.create({
      name,
      email: String(email).toLowerCase(),
      attempted,
      total,
      score,
      percentage: percent,
      answers,
      ip: ip || 'Unknown',
      location: locationLine,
      device: ua || 'Unknown',
      browserLocation
    });

    const emailResult = await sendPublicTestLeadEmail({
      name,
      email,
      ip: ip || 'Unknown',
      location: locationLine
    });

    if (!emailResult?.sent) {
      console.warn('Public test lead email was not sent:', emailResult?.reason || 'unknown_reason');
    }

    return res.json({ success: true, emailSent: Boolean(emailResult?.sent) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getLandingPageConfig,
  saveLandingPageConfig,
  getPublicLandingPageConfig,
  createPublicTestLead,
};
