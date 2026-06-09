import React from 'react';

/**
 * OptionContent — renders option text with inline {{url}} image embedding.
 *
 * Supports the {{image_url}} syntax inside option text:
 *   "Some text {{https://example.com/img.png}} more text."
 *
 * Each {{url}} is replaced with an <img> tag that auto-sizes.
 * Also renders optionImages array items (from device upload / URL paste).
 *
 * Props:
 *   text         – the option string (may contain {{url}} tokens)
 *   optionImage  – optional: the optionImages[idx] value from device upload
 *   style        – optional style object for text spans
 *   imgMaxHeight – max height for inline images (default: 120px)
 *   imgStyle     – optional extra style for images
 */
const OptionContent = ({ text, optionImage, style, imgMaxHeight = 120, imgStyle }) => {
  if (!text && !optionImage) return null;

  // Resolve URL candidates
  const resolveUrl = (value) => {
    const v = String(value || '').trim();
    if (!v) return '';
    if (/^https?:\/\//i.test(v)) return v;
    if (/^data:/i.test(v)) return v;
    const origin = window.location.origin.replace(/\/+$/, '');
    return v.startsWith('/') ? `${origin}${v}` : v;
  };

  // Parse {{url}} tokens from text
  const parseParts = (str) => {
    if (!str) return [];
    return str.split(/(\{\{[^}]+\}\})/g).map((part, i) => {
      const match = part.match(/^\{\{(.+?)\}\}$/);
      if (match) {
        const url = match[1].trim();
        return url ? { key: i, type: 'image', src: resolveUrl(url) } : null;
      }
      return part.trim() ? { key: i, type: 'text', value: part } : null;
    }).filter(Boolean);
  };

  const parts = parseParts(text);

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start', verticalAlign: 'middle' }}>
      {/* Text parts with inline {{url}} images */}
      {parts.length > 0 && (
        <span style={style}>
          {parts.map((part) => {
            if (part.type === 'image') {
              return <InlineOptionImage key={part.key} src={part.src} maxHeight={imgMaxHeight} extraStyle={imgStyle} />;
            }
            return <span key={part.key}>{part.value}</span>;
          })}
        </span>
      )}
      {/* Standalone optionImage from device upload */}
      {optionImage && (
        <InlineOptionImage src={resolveUrl(optionImage)} maxHeight={imgMaxHeight} extraStyle={imgStyle} />
      )}
    </span>
  );
};

const InlineOptionImage = ({ src, maxHeight, extraStyle }) => {
  const [imgError, setImgError] = React.useState(false);

  if (imgError || !src) return null;

  return (
    <img
      src={src}
      alt="Option image"
      onError={() => setImgError(true)}
      style={{
        maxWidth: '100%',
        maxHeight: `${maxHeight}px`,
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
        ...extraStyle,
      }}
    />
  );
};

export default OptionContent;
