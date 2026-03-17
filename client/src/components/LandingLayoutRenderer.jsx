import React from 'react';
import axios from 'axios';
import './LandingLayoutRenderer.css';

const defaultTextStyle = {
  fontSize: 18,
  fontWeight: 600,
  color: '#0f172a',
  align: 'left',
};


const resolveMediaUrl = (rawUrl) => {
  const url = String(rawUrl || '').trim();
  if (!url) return '';
  if (/^data:/i.test(url) || /^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return `${window.location.protocol}${url}`;

  const base = String(axios.defaults.baseURL || import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

  if (url.startsWith('/api/')) return url;
  if (url.startsWith('/')) return base ? `${base}${url}` : url;
  return base ? `${base}/${url}` : url;
};

const getBlockStyle = (block) => ({
  left: block.x || 0,
  top: block.y || 0,
  width: block.width || 200,
  height: block.height || 60,
  zIndex: block.zIndex || 0,
});

const renderTextBlock = (block) => {
  const style = { ...defaultTextStyle, ...(block.style || {}) };
  return (
    <div
      className="landing-block-text"
      style={{
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        color: style.color,
        textAlign: style.align || 'left',
      }}
    >
      {block.text || 'Text block'}
    </div>
  );
};

const renderButtonBlock = (block, isEditor) => {
  const style = {
    background: '#2563eb',
    color: '#fff',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    ...(block.style || {}),
  };
  const content = (
    <div
      className="landing-block-button"
      style={{
        background: style.background,
        color: style.color,
        borderRadius: style.borderRadius,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
      }}
    >
      {block.text || 'Button'}
    </div>
  );

  if (isEditor) return content;

  return (
    <a href={block.url || '#'} className="landing-block-anchor">
      {content}
    </a>
  );
};

const renderImageBlock = (block) => {
  if (!block.src) {
    return (
      <div className="landing-block-image-placeholder">
        <i className="fas fa-image" />
        <span>Add image URL</span>
      </div>
    );
  }

  return <img src={resolveMediaUrl(block.src)} alt={block.alt || 'Landing'} className="landing-block-image" />;
};

const renderCardBlock = (block) => {
  const accent = block.accent || '#2563eb';
  return (
    <div className="landing-block-card" style={{ borderTopColor: accent }}>
      {block.imageUrl ? (
        <img src={resolveMediaUrl(block.imageUrl)} alt={block.title || 'Card'} className="landing-block-card-image" />
      ) : (
        <div className="landing-block-card-icon" style={{ background: `${accent}18`, color: accent }}>
          <i className="fas fa-user-graduate" />
        </div>
      )}
      <h4>{block.title || 'Card Title'}</h4>
      {block.subtitle ? <p className="landing-card-subtitle">{block.subtitle}</p> : null}
      {block.body ? <p className="landing-card-body">{block.body}</p> : null}
    </div>
  );
};

const renderBoxBlock = (block) => {
  const style = block.style || {};
  return (
    <div
      className="landing-block-box"
      style={{
        background: style.background || '#ffffff',
        borderRadius: style.borderRadius || 16,
        borderColor: style.borderColor || '#dbeafe',
      }}
    />
  );
};

const renderBlockInner = (block, isEditor) => {
  switch (block.type) {
    case 'button':
      return renderButtonBlock(block, isEditor);
    case 'image':
      return renderImageBlock(block);
    case 'card':
      return renderCardBlock(block);
    case 'box':
      return renderBoxBlock(block);
    case 'text':
    default:
      return renderTextBlock(block);
  }
};

const LandingLayoutRenderer = ({
  config,
  className = '',
  editable = false,
  selectedBlockId = null,
  onSelectBlock,
  onBlockMouseDown,
  onResizeHandleMouseDown,
  showGrid = false,
  canvasClassName = '',
  scale = 1,
  showResizeHandles = false,
  guideLines = [],
}) => {
  if (!config) return null;

  const canvas = config.canvas || {};
  const blocks = Array.isArray(config.blocks) ? [...config.blocks].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)) : [];

  return (
    <div className={`landing-layout-shell ${className}`.trim()}>
      <div
        className={`landing-layout-canvas ${showGrid ? 'show-grid' : ''} ${canvasClassName}`.trim()}
        style={{
          width: canvas.width || 1200,
          height: canvas.height || 800,
          background: canvas.background || '#fff',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {Array.isArray(guideLines)
          ? guideLines.map((guide, idx) => (
              <div
                key={`${guide.type}-${guide.position}-${idx}`}
                className={`landing-guide-line ${guide.type === 'vertical' ? 'vertical' : 'horizontal'}`}
                style={guide.type === 'vertical' ? { left: guide.position } : { top: guide.position }}
              />
            ))
          : null}
        {blocks.map((block) => (
          <div
            key={block.id}
            className={`landing-layout-block ${editable ? 'editable' : ''} ${selectedBlockId === block.id ? 'selected' : ''}`.trim()}
            style={getBlockStyle(block)}
            onMouseDown={editable ? (e) => onBlockMouseDown?.(e, block.id) : undefined}
            onClick={editable ? (e) => { e.stopPropagation(); onSelectBlock?.(block.id); } : undefined}
          >
            {renderBlockInner(block, editable)}
            {editable && showResizeHandles && selectedBlockId === block.id ? (
              <>
                {['n', 'e', 's', 'w', 'nw', 'ne', 'sw', 'se'].map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    className={`landing-resize-handle handle-${dir}`}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      onResizeHandleMouseDown?.(e, block.id, dir);
                    }}
                    aria-label={`Resize ${dir}`}
                  />
                ))}
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LandingLayoutRenderer;
