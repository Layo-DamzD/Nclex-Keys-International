import React from 'react';

/**
 * RationaleContent — renders rationale text with inline image embedding.
 *
 * Supports the {{image_url}} syntax inside rationale text:
 *   "Here is the explanation {{https://example.com/img.png}} and more text."
 *
 * Each {{url}} is replaced with an <img> tag that auto-sizes and
 * has click-to-enlarge support.
 *
 * Props:
 *   text       – the rationale string (may contain {{url}} tokens)
 *   style      – optional style object for the wrapper
 *   className  – optional className for the wrapper
 *   imgStyle   – optional style object for images
 *   label      – optional label (e.g. "Rationale:" shown before the text)
 */
const RationaleContent = ({ text, style, className, imgStyle, label }) => {
  if (!text) return null;

  // Split text by {{...}} patterns — captures URLs inside double curly braces
  const parts = text.split(/(\{\{[^}]+\}\})/g);

  // Prepend label as a text part if provided
  const allParts = label ? [{ type: 'text', value: label + ' ' }, ...parts.map(p => {
    const match = p.match(/^\{\{(.+?)\}\}$/);
    if (match) {
      const url = match[1].trim();
      return url ? { type: 'image', value: url } : null;
    }
    return { type: 'text', value: p };
  }).filter(Boolean)] : parts.map(p => {
    const match = p.match(/^\{\{(.+?)\}\}$/);
    if (match) {
      const url = match[1].trim();
      return url ? { type: 'image', value: url } : null;
    }
    return { type: 'text', value: p };
  }).filter(Boolean);

  return (
    <div className={className} style={{ whiteSpace: 'pre-line', ...style }}>
      {allParts.map((part, i) => {
        if (part.type === 'image') {
          return <RationaleInlineImage key={i} src={part.value} extraStyle={imgStyle} />;
        }
        if (i === 0 && label && part.value.startsWith(label)) {
          // Render label as strong
          return <span key={i}><strong>{label}</strong>{part.value.slice(label.length)}</span>;
        }
        return <span key={i}>{part.value}</span>;
      })}
    </div>
  );
};

/**
 * Inline image component with click-to-enlarge overlay
 */
const RationaleInlineImage = ({ src, extraStyle }) => {
  const [enlarged, setEnlarged] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);

  // Resolve URL candidates (same logic as TestReviewExamView)
  const resolvedSrc = React.useMemo(() => {
    const value = String(src || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    if (/^data:/i.test(value)) return value;
    // Relative path — prepend origin
    const origin = window.location.origin.replace(/\/+$/, '');
    return value.startsWith('/') ? `${origin}${value}` : value;
  }, [src]);

  if (imgError) {
    return (
      <span style={{ color: '#ef4444', fontSize: '0.85rem', fontStyle: 'italic' }}>
        [Image failed to load]
      </span>
    );
  }

  return (
    <React.Fragment>
      <img
        src={resolvedSrc}
        alt="Rationale image"
        onClick={() => setEnlarged(true)}
        style={{
          maxWidth: '100%',
          maxHeight: '200px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          cursor: 'pointer',
          objectFit: 'contain',
          margin: '4px 0',
          display: 'inline-block',
          verticalAlign: 'middle',
          ...extraStyle,
        }}
        onError={() => setImgError(true)}
      />
      {enlarged && (
        <div
          onClick={() => setEnlarged(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            cursor: 'pointer',
          }}
        >
          <img
            src={resolvedSrc}
            alt="Rationale image (enlarged)"
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              borderRadius: '12px',
              objectFit: 'contain',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '20px',
              right: '30px',
              color: '#fff',
              fontSize: '1.5rem',
              cursor: 'pointer',
            }}
          >
            x
          </div>
        </div>
      )}
    </React.Fragment>
  );
};

export default RationaleContent;
