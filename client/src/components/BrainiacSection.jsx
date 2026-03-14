import React from 'react';

const DEFAULT_BRAINIAC = {
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

const resolveImageUrl = (rawUrl) => {
  const url = String(rawUrl || '').trim();
  if (!url) return '';
  if (/^data:/i.test(url) || /^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) {
    const base = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
    return base ? `${base}${url}` : url;
  }
  return url;
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
                    src={resolveImageUrl(tutor.imageUrl)}
                    alt={tutor.name}
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
