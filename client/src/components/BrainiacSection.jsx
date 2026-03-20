import React from 'react';
import axios from 'axios';

const DEFAULT_BRAINIAC = {
  header: {
    title: 'Meet Our Brainiacs',
    subtitle: 'Meet the tutors guiding your NCLEX success.',
  },  tutors: [],
};

const resolveImageCandidates = (rawUrl) => {
  const url = String(rawUrl || '').trim().replace(/\\/g, '/');
  if (!url) return [];

  const base = String(axios.defaults.baseURL || import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
  const origin = typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '';
  const candidates = [];
  const pushUnique = (value) => { if (value && !candidates.includes(value)) candidates.push(value); };
  const stripTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');

  const buildUploadVariants = (value) => {
    const normalized = String(value || '').replace(/\\/g, '/');
    const markerIndex = normalized.toLowerCase().indexOf('/uploads/');
    if (markerIndex === -1) return;

    const uploadSuffix = normalized.slice(markerIndex + '/uploads/'.length).replace(/^\/+/, '');
    if (!uploadSuffix) return;

    const safeOrigin = stripTrailingSlash(origin);
    const safeBase = stripTrailingSlash(base);

    pushUnique(safeOrigin ? `${safeOrigin}/api/uploads/${uploadSuffix}` : '');
    pushUnique(safeOrigin ? `${safeOrigin}/uploads/${uploadSuffix}` : '');
    pushUnique(safeBase ? `${safeBase}/api/uploads/${uploadSuffix}` : '');
    pushUnique(safeBase ? `${safeBase}/uploads/${uploadSuffix}` : '');
  };

  const convertGoogleDriveUrl = (value) => {
    const raw = String(value || '');
    const idMatch = raw.match(/(?:\/d\/|id=)([a-zA-Z0-9_-]{10,})/);
    if (!idMatch?.[1]) return '';
    return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
  };

  if (/^data:/i.test(url)) {
    pushUnique(url);
    return candidates;
  }

  if (/^https?:\/\//i.test(url)) {
    pushUnique(url);
    pushUnique(url.replace(/^http:\/\//i, 'https://'));
    try {
      const parsed = new URL(url);
      const safeOrigin = stripTrailingSlash(origin);
      if (parsed.pathname.includes('/uploads/')) {
        buildUploadVariants(parsed.pathname);
        pushUnique(`${origin}${parsed.pathname}`);
        pushUnique(`${base}${parsed.pathname}`);
      }
      if (safeOrigin && parsed.hostname === window.location.hostname) {
        pushUnique(`${safeOrigin}${parsed.pathname}${parsed.search || ''}`);
      }
    } catch {
      // ignore parse failures
    }
    pushUnique(convertGoogleDriveUrl(url));
  } else if (url.startsWith('//')) {
    pushUnique(`${window.location.protocol}${url}`);
  } else if (url.startsWith('/')) {
    pushUnique(origin ? `${origin}${url}` : '');
    pushUnique(base ? `${base}${url}` : '');
    if (!url.startsWith('/api/')) {
      pushUnique(origin ? `${origin}/api${url}` : '');
      pushUnique(base ? `${base}/api${url}` : '');
    }
    pushUnique(url);
  } else {
    pushUnique(origin ? `${origin}/${url}` : '');
    pushUnique(base ? `${base}/${url}` : '');
    pushUnique(origin ? `${origin}/api/${url}` : '');
    pushUnique(base ? `${base}/api/${url}` : '');
    pushUnique(url);
  }

  buildUploadVariants(url);

  return candidates.filter(Boolean);
};

const BrainiacSection = ({
  content = {},
  className = '',
  onSelectHeader,
  selectedHeader = false,
  onSelectTutor,
  selectedTutorIndex = -1,
  editorMode = false,
}) => {
  const header = { ...DEFAULT_BRAINIAC.header, ...(content.header || {}) };
  const tutors = Array.isArray(content.tutors) && content.tutors.length ? content.tutors : DEFAULT_BRAINIAC.tutors;

  const handleImageFallback = (event) => {
    const target = event.currentTarget;
    const raw = target.getAttribute('data-raw-src') || '';
    const currentIndex = Number(target.getAttribute('data-fallback-index') || '0');
    const candidates = resolveImageCandidates(raw);
    if (currentIndex + 1 >= candidates.length) {
      const fallbackName = encodeURIComponent(target.getAttribute('data-fallback-name') || 'Tutor');
      target.src = `https://ui-avatars.com/api/?name=${fallbackName}&background=E2E8F0&color=1E293B&size=256&rounded=true`;
      target.onerror = null;
      return;
    }
    target.setAttribute('data-fallback-index', String(currentIndex + 1));
    target.src = candidates[currentIndex + 1];
  };

  return (
    <div className={className}>
      <div
        className={`brainiac-editor-selectable ${editorMode && selectedHeader ? 'selected' : ''}`}
        onClick={editorMode ? onSelectHeader : undefined}
      >
        <h1 className="text-center mb-4">{header.title}</h1>
        <p className="text-center lead mb-5">{header.subtitle}</p>
      </div>

      <div className="row">
        {tutors.map((tutor, index) => (
          <div className="col-md-4 mb-4" key={tutor.id || index}>
            <div
              className={`card brainiac-editor-selectable ${editorMode && selectedTutorIndex === index ? 'selected' : ''}`}
              onClick={editorMode ? () => onSelectTutor?.(index) : undefined}
            >
              <div className="card-body text-center">
                {tutor.imageUrl ? (
                  <img
                    src={resolveImageCandidates(tutor.imageUrl)[0] || ''}
                    alt={tutor.name}
                    data-raw-src={tutor.imageUrl || ''}
                    data-fallback-name={tutor.name || 'Tutor'}
                    data-fallback-index="0"
                    onError={handleImageFallback}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    style={{
                      width: '100%',
                      maxWidth: tutor.imageDisplayMode === 'circle' ? 90 : 260,
                      height: tutor.imageDisplayMode === 'circle' ? 90 : 'auto',
                      borderRadius: tutor.imageDisplayMode === 'circle' ? '50%' : 12,
                      objectFit: 'cover',
                      marginBottom: 16
                    }}
                  />
                ) : (
                  <i className={`fas ${tutor.iconClass || 'fa-user'} fa-4x mb-3 ${tutor.colorClass || 'text-primary'}`}></i>
                )}
                <h5>{tutor.name}</h5>
                <p className="text-muted">{tutor.role}</p>
                <p>{tutor.bio}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BrainiacSection;
export { DEFAULT_BRAINIAC };
