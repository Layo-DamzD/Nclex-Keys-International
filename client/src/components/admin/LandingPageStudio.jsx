import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Hero from '../Hero';
import Stats from '../Stats';
import Program from '../Program';
import Testimonials from '../Testimonials';
import Footer from '../Footer';
import BrainiacSection, { DEFAULT_BRAINIAC } from '../BrainiacSection';
import { resolveMediaUrl, withCacheBust } from '../../utils/landingMedia';
import { resolveMediaCandidates } from '../../utils/imageUpload';
import './LandingPageEditor.css';
import './LandingPageStudio.css';

// Image fallback handler for resolving image URLs when the primary URL fails
const handleImageFallback = (event) => {
  const target = event.currentTarget;
  const raw = target.getAttribute('data-raw-src') || '';
  const currentIndex = Number(target.getAttribute('data-fallback-index') || '0');
  const candidates = resolveMediaCandidates(raw);
  if (currentIndex + 1 >= candidates.length) {
    target.style.display = 'none';
    target.onerror = null;
    return;
  }
  target.setAttribute('data-fallback-index', String(currentIndex + 1));
  target.src = candidates[currentIndex + 1];
};

const HOME_ORDER_DEFAULT = ['hero', 'stats', 'program', 'testimonials'];

const DEFAULT_HOME_CONFIG = {
  mode: 'structured',
  sectionOrder: HOME_ORDER_DEFAULT,
  sections: {
    hero: {
      badgeText: '97% First-Time Pass Rate',
      titleBefore: 'Unlock Your ',
      titleHighlight: 'NCLEX Success',
      titleHighlightColor: '#86efac',
      titleAfter: ' with Expert Coaching',
      description:
        'NCLEX KEYS International provides comprehensive training for nursing graduates to pass the NCLEX-RN/PN exams with confidence. Join thousands of successful nurses.',
      features: ['Personalized Study Plans', '10,000+ Practice Questions', 'Live Virtual Classes'],
      ctaText: 'Get Started',
      ctaUrl: '/signup',
      videoUrl: 'https://www.youtube.com/embed/7ILVwUsfrAc',
      gradientStart: '#0d6efd',
      gradientEnd: '#6f42c1',
    },
    stats: {
      items: [
        { label: 'Nurses Trained', target: 2500, suffix: '+', color: '#0d6efd' },
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
          title: 'Customized Study Plan',
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
        phone: '+2347037367480',
      },
      legal: {
        copyrightText: '© 2026 NCLEX KEYS International. All rights reserved.',
        privacyUrl: '/documents/privacy-policy.pdf',
        termsUrl: '/documents/terms-of-service.pdf',
      },
    },
  },
};

const DEFAULT_BRAINIAC_CONFIG = {
  mode: 'structured',
  ...DEFAULT_BRAINIAC,
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const getFallbackConfig = (pageKey) =>
  clone(pageKey === 'brainiac' ? DEFAULT_BRAINIAC_CONFIG : DEFAULT_HOME_CONFIG);

const coerceStructuredConfig = (pageKey, incoming) => {
  const base = getFallbackConfig(pageKey);
  if (!incoming || incoming.mode !== 'structured') return base;

  if (pageKey === 'brainiac') {
    return {
      ...base,
      ...clone(incoming),
      mode: 'structured',
      header: { ...(base.header || {}), ...(incoming.header || {}) },
      tutors: (Array.isArray(incoming.tutors) ? clone(incoming.tutors) : clone(base.tutors || [])).map((tutor) => ({
        ...tutor,
        imageDisplayMode: tutor?.imageDisplayMode === 'circle' ? 'circle' : 'full',
      })),
    };
  }

  const incomingSections = incoming.sections || {};
  const baseSections = base.sections || {};

  return {
    ...base,
    ...clone(incoming),
    mode: 'structured',
    sectionOrder:
      Array.isArray(incoming.sectionOrder) && incoming.sectionOrder.length
        ? clone(incoming.sectionOrder)
        : clone(base.sectionOrder || HOME_ORDER_DEFAULT),
    sections: {
      ...baseSections,
      ...clone(incomingSections),
      hero: { ...(baseSections.hero || {}), ...(incomingSections.hero || {}) },
      stats: {
        ...(baseSections.stats || {}),
        ...(incomingSections.stats || {}),
        items:
          Array.isArray(incomingSections.stats?.items) && incomingSections.stats.items.length
            ? clone(incomingSections.stats.items)
            : clone(baseSections.stats?.items || []),
      },
      program: {
        ...(baseSections.program || {}),
        ...(incomingSections.program || {}),
        cards:
          Array.isArray(incomingSections.program?.cards) && incomingSections.program.cards.length
            ? clone(incomingSections.program.cards)
            : clone(baseSections.program?.cards || []),
      },
      testimonials: {
        ...(baseSections.testimonials || {}),
        ...(incomingSections.testimonials || {}),
        items:
          Array.isArray(incomingSections.testimonials?.items)
            ? clone(incomingSections.testimonials.items).map((item) => ({
                ...item,
                imageDisplayMode:
                  item?.imageDisplayMode
                  || (item?.imageWithCaption ? 'imageWithCaption' : item?.imageOnly ? 'imageOnly' : 'standard'),
              }))
            : clone(baseSections.testimonials?.items || []),
      },
      footer: {
        ...(baseSections.footer || {}),
        ...(incomingSections.footer || {}),
        socialLinks: {
          ...(baseSections.footer?.socialLinks || {}),
          ...(incomingSections.footer?.socialLinks || {}),
        },
        contact: {
          ...(baseSections.footer?.contact || {}),
          ...(incomingSections.footer?.contact || {}),
        },
        legal: {
          ...(baseSections.footer?.legal || {}),
          ...(incomingSections.footer?.legal || {}),
        },
      },
    },
  };
};

const parseLines = (value) =>
  String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });


const LandingPageStudio = () => {
  const token = sessionStorage.getItem('adminToken');
  const [pageKey, setPageKey] = useState('home');
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [uploadingField, setUploadingField] = useState('');
  const [selectedKey, setSelectedKey] = useState('hero');
  const [selectedTutorIndex, setSelectedTutorIndex] = useState(0);

  const pageLabel = pageKey === 'brainiac' ? 'Meet Our Brainiacs' : 'Home Landing Page';
  const getPageLabel = (key) => (key === 'brainiac' ? 'Meet Our Brainiacs' : 'Home Landing Page');

  const loadConfig = async (nextPageKey) => {
    setLoading(true);
    setError('');
    setStatus('');
    try {
      const res = await axios.get(`/api/admin/landing-page/${nextPageKey}`, {
        params: { _t: Date.now() },
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });
      const nextConfig = coerceStructuredConfig(nextPageKey, res.data.config);
      setConfig(nextConfig);
      if (nextPageKey === 'home') {
        setSelectedKey(nextConfig.sectionOrder?.[0] || 'hero');
      } else {
        setSelectedKey('header');
        setSelectedTutorIndex(0);
      }
    } catch (err) {
      console.error('Landing page studio load failed:', err);
      const statusCode = err?.response?.status;
      const message = err?.response?.data?.message || err.message || 'Failed to load editor data';
      if (statusCode === 404) {
        const nextConfig = getFallbackConfig(nextPageKey);
        setConfig(nextConfig);
        setStatus(`${getPageLabel(nextPageKey)} route returned 404, so the editor loaded the current default layout instead.`);
        if (nextPageKey === 'home') {
          setSelectedKey(nextConfig.sectionOrder?.[0] || 'hero');
        } else {
          setSelectedKey('header');
          setSelectedTutorIndex(0);
        }
        return;
      }
      setError(`${statusCode ? `${statusCode}: ` : ''}${message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setError('Missing admin session. Log in again.');
      setLoading(false);
      return;
    }
    loadConfig(pageKey);
  }, [pageKey, token]);

  const mutateConfig = (mutator) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const next = clone(prev);
      mutator(next);
      return next;
    });
    setStatus('');
    setError('');
  };

  const uploadImageAsset = async ({ file, fieldKey, onUploaded, embedAsDataUrl = false }) => {
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) {
      setError('Please select an image file (jpg, png, webp, etc).');
      return;
    }

    setUploadingField(fieldKey);
    setError('');
    setStatus('');

    try {
      if (embedAsDataUrl) {
        const dataUrl = await fileToDataUrl(file);
        if (!dataUrl) {
          throw new Error('Image could not be embedded');
        }
        onUploaded(dataUrl);
        setStatus('Image uploaded successfully');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post('/api/admin/content/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const uploadedUrl = res?.data?.fileUrl;
      if (!uploadedUrl) {
        throw new Error('Upload succeeded but no file URL was returned');
      }

      onUploaded(uploadedUrl);
      setStatus('Image uploaded successfully');
    } catch (err) {
      console.error('Landing studio image upload failed:', err);
      setError(err?.response?.data?.message || err.message || 'Failed to upload image');
    } finally {
      setUploadingField('');
    }
  };

  const onImageInputChange = async (event, options) => {
    const file = event?.target?.files?.[0];
    if (event?.target) {
      event.target.value = '';
    }
    if (!file) return;
    await uploadImageAsset({ file, ...options });
  };

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    setError('');
    setStatus('');
    try {
      // Debug: Log what we're saving
      console.log('[Studio] Saving config:', {
        mode: config.mode,
        sectionOrder: config.sectionOrder,
        programCards: config.sections?.program?.cards?.length,
        testimonialsItems: config.sections?.testimonials?.items?.length
      });
      
      const response = await axios.put(`/api/admin/landing-page/${pageKey}`, config, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Debug: Log the response
      console.log('[Studio] Save response:', {
        programCards: response.data?.config?.sections?.program?.cards?.length,
        testimonialsItems: response.data?.config?.sections?.testimonials?.items?.length
      });
      
      setStatus(`${pageLabel} saved`);
    } catch (err) {
      console.error('[Studio] Save failed:', err);
      setError(err?.response?.data?.message || 'Failed to save landing page');
    } finally {
      setSaving(false);
    }
  };

  const reloadPage = () => loadConfig(pageKey);

  const homeSections = config?.sections || {};
  const homeOrder = Array.isArray(config?.sectionOrder) && config.sectionOrder.length ? config.sectionOrder : HOME_ORDER_DEFAULT;

  const selectedHomeSection = useMemo(() => {
    if (pageKey !== 'home' || !config) return null;
    return homeSections[selectedKey] || null;
  }, [pageKey, config, homeSections, selectedKey]);

  const selectedTutor = useMemo(() => {
    if (pageKey !== 'brainiac') return null;
    return config?.tutors?.[selectedTutorIndex] || null;
  }, [pageKey, config, selectedTutorIndex]);

  const moveSection = (sectionId, direction) => {
    mutateConfig((next) => {
      const order = [...(next.sectionOrder || HOME_ORDER_DEFAULT)];
      const index = order.indexOf(sectionId);
      if (index < 0) return;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= order.length) return;
      [order[index], order[targetIndex]] = [order[targetIndex], order[index]];
      next.sectionOrder = order;
    });
  };

  const addTutor = () => {
    mutateConfig((next) => {
      const tutors = Array.isArray(next.tutors) ? next.tutors : [];
      tutors.push({
        id: `brainiac-${Date.now()}`,
        name: 'New Brainiac',
        role: 'Qualification',
        bio: 'Short bio',
        iconClass: 'fa-user-graduate',
        colorClass: 'text-primary',
        imageUrl: '',
        imageDisplayMode: 'full',
      });
      next.tutors = tutors;
    });
    setSelectedKey('tutor');
    setSelectedTutorIndex((config?.tutors?.length || 0));
  };

  const removeTutor = (index) => {
    mutateConfig((next) => {
      next.tutors = (next.tutors || []).filter((_, i) => i !== index);
    });
    setSelectedTutorIndex((prev) => Math.max(0, prev - 1));
  };

  const addTestimonial = () => {
    mutateConfig((next) => {
      const items = next.sections?.testimonials?.items || [];
      items.push({
        id: Date.now(),
        name: 'New Success Story',
        role: '',
        text: '',
        avatar: '',
        imageUrl: '',
        imageOnly: false,
        imageWithCaption: false,
        imageDisplayMode: 'standard',
        rating: 5,
      });
      next.sections.testimonials.items = items;
    });
  };

  const removeTestimonial = (index) => {
    mutateConfig((next) => {
      next.sections.testimonials.items = (next.sections.testimonials.items || []).filter((_, i) => i !== index);
    });
  };

  const addProgramCard = () => {
    mutateConfig((next) => {
      const cards = next.sections?.program?.cards || [];
      cards.push({
        icon: 'fa-star',
        title: 'New Reason',
        text: 'Add another reason students should choose NCLEX KEYS.',
      });
      next.sections.program.cards = cards;
    });
  };

  const removeProgramCard = (index) => {
    mutateConfig((next) => {
      next.sections.program.cards = (next.sections.program.cards || []).filter((_, i) => i !== index);
    });
  };

  const renderHomePreview = () => (
    <div className="landing-studio-home-preview">
      {homeOrder.map((sectionId) => (
        <div
          key={sectionId}
          className={`landing-studio-preview-section ${selectedKey === sectionId ? 'selected' : ''}`}
          onClick={() => setSelectedKey(sectionId)}
        >
          <div className="landing-studio-preview-label">
            <span>{sectionId}</span>
            <div className="landing-studio-preview-label-actions">
              <button type="button" onClick={(e) => { e.stopPropagation(); moveSection(sectionId, 'up'); }}>↑</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); moveSection(sectionId, 'down'); }}>↓</button>
            </div>
          </div>
          {sectionId === 'hero' && <Hero content={homeSections.hero} />}
          {sectionId === 'stats' && <Stats content={homeSections.stats} />}
          {sectionId === 'program' && <Program content={homeSections.program} />}
          {sectionId === 'testimonials' && <Testimonials content={homeSections.testimonials} />}
        </div>
      ))}
      <div
        className={`landing-studio-preview-section ${selectedKey === 'footer' ? 'selected' : ''}`}
        onClick={() => setSelectedKey('footer')}
      >
        <div className="landing-studio-preview-label">
          <span>footer</span>
        </div>
        <Footer content={homeSections.footer} />
      </div>
    </div>
  );

  const renderBrainiacPreview = () => (
    <div className="landing-studio-brainiac-preview">
      <BrainiacSection
        content={config || {}}
        editorMode
        selectedHeader={selectedKey === 'header'}
        onSelectHeader={() => setSelectedKey('header')}
        selectedTutorIndex={selectedKey === 'tutor' ? selectedTutorIndex : -1}
        onSelectTutor={(index) => {
          setSelectedKey('tutor');
          setSelectedTutorIndex(index);
        }}
      />
    </div>
  );

  const renderHomeForm = () => {
    if (!selectedHomeSection) return <div className="landing-studio-empty">Select a section in the preview.</div>;

    if (selectedKey === 'hero') {
      const hero = selectedHomeSection;
      return (
        <div className="landing-studio-form">
          <h3>Hero Section</h3>
          <label>Badge Text<input value={hero.badgeText || ''} onChange={(e) => mutateConfig((next) => { next.sections.hero.badgeText = e.target.value; })} /></label>
          <label>Title (Before Highlight)<input value={hero.titleBefore || ''} onChange={(e) => mutateConfig((next) => { next.sections.hero.titleBefore = e.target.value; })} /></label>
          <label>Title Highlight<input value={hero.titleHighlight || ''} onChange={(e) => mutateConfig((next) => { next.sections.hero.titleHighlight = e.target.value; })} /></label>
          <label>Title Highlight Color<input type="color" value={hero.titleHighlightColor || '#86efac'} onChange={(e) => mutateConfig((next) => { next.sections.hero.titleHighlightColor = e.target.value; })} /></label>
          <label>Title (After Highlight)<input value={hero.titleAfter || ''} onChange={(e) => mutateConfig((next) => { next.sections.hero.titleAfter = e.target.value; })} /></label>
          <label>Description<textarea rows={4} value={hero.description || ''} onChange={(e) => mutateConfig((next) => { next.sections.hero.description = e.target.value; })} /></label>
          <label>Features (one per line)<textarea rows={4} value={(hero.features || []).join('\n')} onChange={(e) => mutateConfig((next) => { next.sections.hero.features = parseLines(e.target.value); })} /></label>
          <div className="landing-studio-two-col">
            <label>CTA Text<input value={hero.ctaText || ''} onChange={(e) => mutateConfig((next) => { next.sections.hero.ctaText = e.target.value; })} /></label>
            <label>CTA URL<input value={hero.ctaUrl || ''} onChange={(e) => mutateConfig((next) => { next.sections.hero.ctaUrl = e.target.value; })} /></label>
          </div>
          <label>Video URL<input value={hero.videoUrl || ''} onChange={(e) => mutateConfig((next) => { next.sections.hero.videoUrl = e.target.value; })} /></label>
          <div className="landing-studio-two-col">
            <label>Gradient Start<input value={hero.gradientStart || ''} onChange={(e) => mutateConfig((next) => { next.sections.hero.gradientStart = e.target.value; })} /></label>
            <label>Gradient End<input value={hero.gradientEnd || ''} onChange={(e) => mutateConfig((next) => { next.sections.hero.gradientEnd = e.target.value; })} /></label>
          </div>
        </div>
      );
    }

    if (selectedKey === 'stats') {
      const stats = selectedHomeSection;
      const items = Array.isArray(stats.items) ? stats.items : [];
      return (
        <div className="landing-studio-form">
          <h3>Stats Section</h3>
          {items.map((item, index) => (
            <div className="landing-studio-card" key={`${item.label}-${index}`}>
              <h4>Stat {index + 1}</h4>
              <label>Label<input value={item.label || ''} onChange={(e) => mutateConfig((next) => { next.sections.stats.items[index].label = e.target.value; })} /></label>
              <div className="landing-studio-two-col">
                <label>Target Number<input value={item.target ?? ''} onChange={(e) => mutateConfig((next) => { const val = e.target.value; next.sections.stats.items[index].target = val === '' ? undefined : Number(val); })} /></label>
                <label>Static Value<input value={item.value || ''} onChange={(e) => mutateConfig((next) => { next.sections.stats.items[index].value = e.target.value; })} /></label>
              </div>
              <div className="landing-studio-two-col">
                <label>Suffix<input value={item.suffix || ''} onChange={(e) => mutateConfig((next) => { next.sections.stats.items[index].suffix = e.target.value; })} /></label>
                <label>Color<input value={item.color || ''} onChange={(e) => mutateConfig((next) => { next.sections.stats.items[index].color = e.target.value; })} /></label>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (selectedKey === 'program') {
      const program = selectedHomeSection;
      const cards = Array.isArray(program.cards) ? program.cards : [];
      return (
        <div className="landing-studio-form">
          <div className="landing-studio-form-header">
            <h3>Program Section</h3>
            <button type="button" className="btn btn-success btn-sm" onClick={addProgramCard}>
              <i className="fas fa-plus" /> Add Reason
            </button>
          </div>
          <label>Heading<input value={program.heading || ''} onChange={(e) => mutateConfig((next) => { next.sections.program.heading = e.target.value; })} /></label>
          <label>Subheading<textarea rows={2} value={program.subheading || ''} onChange={(e) => mutateConfig((next) => { next.sections.program.subheading = e.target.value; })} /></label>
          {cards.map((card, index) => (
            <div className="landing-studio-card" key={`${card.title}-${index}`}>
              <div className="landing-studio-form-header">
                <h4>Feature Card {index + 1}</h4>
                <button
                  type="button"
                  className="landing-studio-danger-btn"
                  onClick={() => removeProgramCard(index)}
                  disabled={cards.length <= 1}
                  title={cards.length <= 1 ? 'Keep at least one reason' : 'Remove reason'}
                >
                  Remove
                </button>
              </div>
              <label>Icon (FontAwesome class suffix)<input value={card.icon || ''} onChange={(e) => mutateConfig((next) => { next.sections.program.cards[index].icon = e.target.value; })} /></label>
              <label>Title<input value={card.title || ''} onChange={(e) => mutateConfig((next) => { next.sections.program.cards[index].title = e.target.value; })} /></label>
              <label>Text<textarea rows={3} value={card.text || ''} onChange={(e) => mutateConfig((next) => { next.sections.program.cards[index].text = e.target.value; })} /></label>
            </div>
          ))}
        </div>
      );
    }

    if (selectedKey === 'testimonials') {
      const testimonials = selectedHomeSection;
      const items = Array.isArray(testimonials.items) ? testimonials.items : [];
      return (
        <div className="landing-studio-form">
          <div className="landing-studio-form-header">
            <h3>Success Stories Section</h3>
            <button type="button" className="btn btn-success btn-sm" onClick={addTestimonial}>
              <i className="fas fa-plus" /> Add Success Story
            </button>
          </div>
          <label>Heading<input value={testimonials.heading || ''} onChange={(e) => mutateConfig((next) => { next.sections.testimonials.heading = e.target.value; })} /></label>
          <label>Subheading<textarea rows={2} value={testimonials.subheading || ''} onChange={(e) => mutateConfig((next) => { next.sections.testimonials.subheading = e.target.value; })} /></label>
          {items.map((item, index) => (
            <div className="landing-studio-card" key={`${item.name}-${index}`}>
              <div className="landing-studio-form-header">
                <h4>Success Story {index + 1}</h4>
                <button type="button" className="landing-studio-danger-btn" onClick={() => removeTestimonial(index)}>
                  Remove
                </button>
              </div>
              <div className="landing-studio-checkbox-row">
                {[
                  { mode: 'imageOnly', label: 'Full image with no text' },
                  { mode: 'imageWithCaption', label: 'Full image with text' },
                  { mode: 'circleWithText', label: 'Circle image with text' },
                ].map((choice) => (
                  <label className="landing-studio-inline-checkbox" key={choice.mode}>
                    <input
                      type="radio"
                      name={`testimonial-display-mode-${index}`}
                      checked={(() => {
                        const currentMode = (item.imageDisplayMode || '').trim();
                        if (currentMode) return currentMode === choice.mode;
                        if (choice.mode === 'imageOnly') return Boolean(item.imageOnly);
                        if (choice.mode === 'imageWithCaption') return Boolean(item.imageWithCaption);
                        return !item.imageOnly && !item.imageWithCaption;
                      })()}
                      onChange={() => mutateConfig((next) => {
                        const target = next.sections.testimonials.items[index];
                        target.imageOnly = choice.mode === 'imageOnly';
                        target.imageWithCaption = choice.mode === 'imageWithCaption';
                        target.imageDisplayMode = choice.mode;
                      })}
                    />
                    <span>{choice.label}</span>
                  </label>
                ))}
              </div>
              <div className="landing-studio-upload-block">
                <div className="landing-studio-upload-row">
                  <input
                    id={`testimonial-image-upload-${index}`}
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      onImageInputChange(e, {
                        fieldKey: `testimonial-${index}`,
                        embedAsDataUrl: false,
                        onUploaded: (uploadedUrl) =>
                          mutateConfig((next) => {
                            const freshUrl = withCacheBust(uploadedUrl);
                            next.sections.testimonials.items[index].avatar = freshUrl;
                            next.sections.testimonials.items[index].imageUrl = freshUrl;
                          })
                      })
                    }
                  />
                  <label htmlFor={`testimonial-image-upload-${index}`} className="landing-studio-upload-btn">
                    <i className={`fas ${uploadingField === `testimonial-${index}` ? 'fa-spinner fa-spin' : 'fa-upload'}`} />
                    {uploadingField === `testimonial-${index}` ? 'Uploading...' : 'Upload Image'}
                  </label>
                  <button
                    type="button"
                    className="landing-studio-danger-btn"
                    onClick={() => mutateConfig((next) => {
                      next.sections.testimonials.items[index].avatar = '';
                      next.sections.testimonials.items[index].imageUrl = '';
                    })}
                    disabled={!item.avatar && !item.imageUrl}
                  >
                    Remove Image
                  </button>
                </div>
                {(item.imageUrl || item.avatar) ? (
                  <div className="landing-studio-upload-preview">
                    <img
                      src={resolveMediaUrl(item.imageUrl || item.avatar)}
                      data-raw-src={item.imageUrl || item.avatar}
                      data-fallback-index="0"
                      onError={handleImageFallback}
                      alt={item.name || `Success Story ${index + 1}`}
                    />
                  </div>
                ) : (
                  <div className="landing-studio-upload-hint">Upload an image for avatar/full-image story card.</div>
                )}
              </div>
              {!['imageOnly', 'imageWithCaption'].includes(item.imageDisplayMode || (item.imageOnly ? 'imageOnly' : 'circleWithText')) && (
              <div className="landing-studio-two-col">
                <label>Name<input value={item.name || ''} onChange={(e) => mutateConfig((next) => { next.sections.testimonials.items[index].name = e.target.value; })} /></label>
                <label>Role<input value={item.role || ''} onChange={(e) => mutateConfig((next) => { next.sections.testimonials.items[index].role = e.target.value; })} /></label>
              </div>
              )}
              {!['imageOnly', 'imageWithCaption'].includes(item.imageDisplayMode || (item.imageOnly ? 'imageOnly' : 'circleWithText')) && (
                <label>Text<textarea rows={3} value={item.text || ''} onChange={(e) => mutateConfig((next) => { next.sections.testimonials.items[index].text = e.target.value; })} /></label>
              )}
              <div className="landing-studio-two-col">
                <label>Rating<input type="number" step="0.5" min="0" max="5" value={item.rating ?? 5} onChange={(e) => mutateConfig((next) => { next.sections.testimonials.items[index].rating = Number(e.target.value); })} /></label>
                {(item.imageDisplayMode === 'imageOnly' || item.imageDisplayMode === 'imageWithCaption' || item.imageOnly) ? (
                  <label>Alt / Caption (optional)<input value={item.name || ''} onChange={(e) => mutateConfig((next) => { next.sections.testimonials.items[index].name = e.target.value; })} /></label>
                ) : (
                  <label>Image Display Mode<input value="Uploaded image" readOnly /></label>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (selectedKey === 'footer') {
      const footer = homeSections.footer || {};
      return (
        <div className="landing-studio-form">
          <h3>Footer Section</h3>
          <label>App/Home Link (logo click)<input value={footer.brandLinkUrl || ''} onChange={(e) => mutateConfig((next) => { next.sections.footer.brandLinkUrl = e.target.value; })} /></label>
          <label>Company Blurb<textarea rows={3} value={footer.companyBlurb || ''} onChange={(e) => mutateConfig((next) => { next.sections.footer.companyBlurb = e.target.value; })} /></label>

          <div className="landing-studio-card">
            <h4>Social Links</h4>
            <label>Facebook<input value={footer.socialLinks?.facebook || ''} onChange={(e) => mutateConfig((next) => { next.sections.footer.socialLinks.facebook = e.target.value; })} /></label>
            <label>X / Twitter<input value={footer.socialLinks?.x || ''} onChange={(e) => mutateConfig((next) => { next.sections.footer.socialLinks.x = e.target.value; })} /></label>
            <label>LinkedIn<input value={footer.socialLinks?.linkedin || ''} onChange={(e) => mutateConfig((next) => { next.sections.footer.socialLinks.linkedin = e.target.value; })} /></label>
            <label>YouTube<input value={footer.socialLinks?.youtube || ''} onChange={(e) => mutateConfig((next) => { next.sections.footer.socialLinks.youtube = e.target.value; })} /></label>
          </div>

          <div className="landing-studio-card">
            <h4>Contact</h4>
            <label>Email<input value={footer.contact?.email || ''} onChange={(e) => mutateConfig((next) => { next.sections.footer.contact.email = e.target.value; })} /></label>
            <label>Phone<input value={footer.contact?.phone || ''} onChange={(e) => mutateConfig((next) => { next.sections.footer.contact.phone = e.target.value; })} /></label>
          </div>

          <div className="landing-studio-card">
            <h4>Legal</h4>
            <label>Copyright Text<input value={footer.legal?.copyrightText || ''} onChange={(e) => mutateConfig((next) => { next.sections.footer.legal.copyrightText = e.target.value; })} /></label>
            <label>Privacy URL<input value={footer.legal?.privacyUrl || ''} onChange={(e) => mutateConfig((next) => { next.sections.footer.legal.privacyUrl = e.target.value; })} /></label>
            <label>Terms URL<input value={footer.legal?.termsUrl || ''} onChange={(e) => mutateConfig((next) => { next.sections.footer.legal.termsUrl = e.target.value; })} /></label>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderBrainiacForm = () => {
    if (!config) return null;

    if (selectedKey === 'header') {
      return (
        <div className="landing-studio-form">
          <h3>Brainiac Header</h3>
          <label>Title<input value={config.header?.title || ''} onChange={(e) => mutateConfig((next) => { next.header = next.header || {}; next.header.title = e.target.value; })} /></label>
          <label>Subtitle<textarea rows={3} value={config.header?.subtitle || ''} onChange={(e) => mutateConfig((next) => { next.header = next.header || {}; next.header.subtitle = e.target.value; })} /></label>
        </div>
      );
    }

    if (selectedKey === 'tutor') {
      const tutor = selectedTutor;
      if (!tutor) return <div className="landing-studio-empty">Select a tutor card.</div>;
      return (
        <div className="landing-studio-form">
          <div className="landing-studio-form-header">
            <h3>Brainiac Card {selectedTutorIndex + 1}</h3>
            <button type="button" className="landing-studio-danger-btn" onClick={() => removeTutor(selectedTutorIndex)}>
              Remove
            </button>
          </div>
          <label>Name<input value={tutor.name || ''} onChange={(e) => mutateConfig((next) => { next.tutors[selectedTutorIndex].name = e.target.value; })} /></label>
          <label>Role / Qualification<input value={tutor.role || ''} onChange={(e) => mutateConfig((next) => { next.tutors[selectedTutorIndex].role = e.target.value; })} /></label>
          <label>Bio<textarea rows={3} value={tutor.bio || ''} onChange={(e) => mutateConfig((next) => { next.tutors[selectedTutorIndex].bio = e.target.value; })} /></label>
          <div className="landing-studio-two-col">
            <label>Icon Class<input value={tutor.iconClass || ''} onChange={(e) => mutateConfig((next) => { next.tutors[selectedTutorIndex].iconClass = e.target.value; })} /></label>
            <label>Color Class<input value={tutor.colorClass || ''} onChange={(e) => mutateConfig((next) => { next.tutors[selectedTutorIndex].colorClass = e.target.value; })} /></label>
          </div>
          <label>
            Photo Shape
            <select
              value={tutor.imageDisplayMode || 'full'}
              onChange={(e) => mutateConfig((next) => { next.tutors[selectedTutorIndex].imageDisplayMode = e.target.value; })}
            >
              <option value="full">Full photo</option>
              <option value="circle">Circle photo</option>
            </select>
          </label>
          <div className="landing-studio-upload-block">
            <div className="landing-studio-upload-row">
              <input
                id={`brainiac-image-upload-${selectedTutorIndex}`}
                type="file"
                accept="image/*"
                onChange={(e) =>
                  onImageInputChange(e, {
                    fieldKey: `brainiac-${selectedTutorIndex}`,
                    onUploaded: (uploadedUrl) =>
                      mutateConfig((next) => { next.tutors[selectedTutorIndex].imageUrl = withCacheBust(uploadedUrl); })
                  })
                }
              />
              <label htmlFor={`brainiac-image-upload-${selectedTutorIndex}`} className="landing-studio-upload-btn">
                <i className={`fas ${uploadingField === `brainiac-${selectedTutorIndex}` ? 'fa-spinner fa-spin' : 'fa-upload'}`} />
                {uploadingField === `brainiac-${selectedTutorIndex}` ? 'Uploading...' : 'Upload Photo'}
              </label>
              <button
                type="button"
                className="landing-studio-danger-btn"
                onClick={() => mutateConfig((next) => { next.tutors[selectedTutorIndex].imageUrl = ''; })}
                disabled={!tutor.imageUrl}
              >
                Remove Photo
              </button>
            </div>
            {tutor.imageUrl ? (
              <div className="landing-studio-upload-preview landing-studio-upload-preview--avatar">
                <img
                  src={resolveMediaUrl(tutor.imageUrl)}
                  data-raw-src={tutor.imageUrl}
                  data-fallback-index="0"
                  onError={handleImageFallback}
                  alt={tutor.name || 'Brainiac'}
                />
              </div>
            ) : (
              <div className="landing-studio-upload-hint">Upload an image to replace the icon on this Brainiac card.</div>
            )}
          </div>
        </div>
      );
    }

    return <div className="landing-studio-empty">Select the header or a tutor card.</div>;
  };

  if (loading) return <div className="landing-editor-loading">Loading landing page studio...</div>;

  if (error && !config) {
    return (
      <div className="landing-editor-error">
        <div>{error}</div>
        <button type="button" className="btn btn-secondary" onClick={reloadPage}>Retry</button>
      </div>
    );
  }

  return (
    <div className="landing-editor landing-studio">
      <div className="landing-editor-toolbar form-card">
        <div>
          <h2>Landing Page Studio (Original Layout)</h2>
          <p>Canva-style live editing on the original page design. Click sections/cards in the preview to edit them.</p>
        </div>
        <div className="landing-editor-toolbar-actions">
          <select className="landing-editor-select" value={pageKey} onChange={(e) => setPageKey(e.target.value)}>
            <option value="home">Home Landing Page</option>
            <option value="brainiac">Meet Our Brainiacs</option>
          </select>
          <button type="button" className="btn btn-secondary" onClick={reloadPage}>
            <i className="fas fa-rotate-left" /> Reload
          </button>
          <button type="button" className="btn btn-primary" onClick={saveConfig} disabled={saving}>
            <i className="fas fa-save" /> {saving ? 'Saving...' : 'Save / Publish'}
          </button>
        </div>
      </div>

      {error ? <div className="landing-editor-inline-error">{error}</div> : null}
      {status ? <div className="landing-editor-inline-success">{status}</div> : null}

      <div className="landing-studio-grid">
        <aside className="landing-editor-panel form-card landing-studio-sidebar">
          <div className="landing-editor-panel-section">
            <h3>{pageLabel}</h3>
            <p className="landing-studio-help">
              {pageKey === 'home'
                ? 'Select a section in the preview or from the list. Use arrows to reorder sections.'
                : 'Select the header or any tutor card in the preview to edit Brainiac content.'}
            </p>
          </div>

          {pageKey === 'home' ? (
            <div className="landing-editor-panel-section">
              <h3>Sections</h3>
              <div className="landing-studio-list">
                {homeOrder.map((sectionId) => (
                  <div
                    key={sectionId}
                    className={`landing-studio-list-item ${selectedKey === sectionId ? 'active' : ''}`}
                    onClick={() => setSelectedKey(sectionId)}
                  >
                    <span>{sectionId}</span>
                    <div className="landing-studio-inline-buttons">
                      <button type="button" onClick={(e) => { e.stopPropagation(); moveSection(sectionId, 'up'); }}>↑</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); moveSection(sectionId, 'down'); }}>↓</button>
                    </div>
                  </div>
                ))}
                <div
                  className={`landing-studio-list-item ${selectedKey === 'footer' ? 'active' : ''}`}
                  onClick={() => setSelectedKey('footer')}
                >
                  <span>footer</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="landing-editor-panel-section">
              <div className="landing-studio-form-header">
                <h3>Brainiac Items</h3>
                <button type="button" className="btn btn-success btn-sm" onClick={addTutor}>
                  <i className="fas fa-plus" /> Add Card
                </button>
              </div>
              <div className="landing-studio-list">
                <button
                  type="button"
                  className={`landing-studio-list-item ${selectedKey === 'header' ? 'active' : ''}`}
                  onClick={() => setSelectedKey('header')}
                >
                  <span>Header</span>
                </button>
                {(config?.tutors || []).map((tutor, index) => (
                  <button
                    type="button"
                    key={tutor.id || index}
                    className={`landing-studio-list-item ${selectedKey === 'tutor' && selectedTutorIndex === index ? 'active' : ''}`}
                    onClick={() => { setSelectedKey('tutor'); setSelectedTutorIndex(index); }}
                  >
                    <span>{tutor.name || `Tutor ${index + 1}`}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        <section className="form-card landing-studio-preview-panel">
          <div className="landing-editor-canvas-header">
            <div>
              <h3>Live Preview (Original Layout)</h3>
              <p>Changes apply instantly. This keeps the page structure the same as your real landing pages.</p>
            </div>
          </div>
          <div className="landing-studio-preview-scroll">
            {pageKey === 'home' ? renderHomePreview() : renderBrainiacPreview()}
          </div>
        </section>

        <aside className="landing-editor-panel form-card landing-studio-properties">
          {pageKey === 'home' ? renderHomeForm() : renderBrainiacForm()}
        </aside>
      </div>
    </div>
  );
};

export default LandingPageStudio;
