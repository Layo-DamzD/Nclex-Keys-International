import React from 'react';
import axios from 'axios';

const DEFAULT_BRAINIAC = {
  header: {
    title: 'Meet Our Brainiacs',
    subtitle: 'Meet the tutors guiding your NCLEX success.',
  },  tutors: [],
};

const resolveImageCandidates = (rawUrl) => {
  const url = String(rawUrl || '').trim();
  if (!url) return [];
  if (/^data:/i.test(url) || /^https?:\/\//i.test(url)) return [url];
  if (url.startsWith('//')) return [`${window.location.protocol}${url}`];

  const base = String(axios.defaults.baseURL || import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
  const origin = typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '';
  const candidates = [];
  const pushUnique = (value) => { if (value && !candidates.includes(value)) candidates.push(value); };

  if (url.startsWith('/')) {
    pushUnique(base ? `${base}${url}` : url);
    pushUnique(origin ? `${origin}${url}` : '');
    pushUnique(url);
  } else {
    pushUnique(base ? `${base}/${url}` : url);
    pushUnique(origin ? `${origin}/${url}` : '');
    pushUnique(url);
  }

  const uploadMatch = url.match(/(?:^|\/)api\/uploads\/([^/?#]+)/i) || url.match(/(?:^|\/)uploads\/([^/?#]+)/i);
  if (uploadMatch?.[1]) {
    pushUnique(origin ? `${origin}/api/uploads/${uploadMatch[1]}` : '');
    pushUnique(base ? `${base}/api/uploads/${uploadMatch[1]}` : '');
  }

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
    if (currentIndex + 1 >= candidates.length) return;
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
                    data-fallback-index="0"
                    onError={handleImageFallback}
                    style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', marginBottom: 16 }}
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
