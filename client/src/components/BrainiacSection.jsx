import React from 'react';
import { resolveMediaCandidates } from '../utils/imageUpload';

const DEFAULT_BRAINIAC = {
  header: {
    title: 'Meet Our Brainiacs',
    subtitle: 'Meet the tutors guiding your NCLEX success.',
  },  tutors: [],
};

// Use shared utility for consistent image URL resolution
const resolveImageCandidates = (rawUrl) => resolveMediaCandidates(rawUrl);

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
