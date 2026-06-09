import React from 'react';

/**
 * RationaleContent — renders rationale text with inline image embedding
 * and markdown-style formatting.
 *
 * Supported formatting:
 *   **bold**, *italic*, ~~strikethrough~~, <u>underline</u>
 *   # Heading, ## Sub-heading
 *   - Bullet list items
 *   1. Numbered list items
 *   | Table | Header |
 *   --- (horizontal rule)
 *   `inline code`
 *   {{image_url}} inline images
 *
 * Props:
 *   text       – the rationale string
 *   style      – optional style object for the wrapper
 *   className  – optional className for the wrapper
 *   imgStyle   – optional style object for images
 *   label      – optional label (e.g. "Rationale:" shown before the text)
 */
const RationaleContent = ({ text, style, className, imgStyle, label }) => {
  if (!text) return null;

  // First split by {{...}} image patterns, then parse markdown in text parts
  const rawParts = text.split(/(\{\{[^}]+\}\})/g);

  const allParts = label
    ? [{ type: 'text', value: label + ' ' }, ...rawParts.map(classifyPart).filter(Boolean)]
    : rawParts.map(classifyPart).filter(Boolean);

  return (
    <div className={className} style={{ lineHeight: 1.65, fontSize: '0.9rem', color: '#334155', ...style }}>
      {allParts.map((part, i) => {
        if (part.type === 'image') {
          return <RationaleInlineImage key={i} src={part.value} extraStyle={imgStyle} />;
        }
        if (i === 0 && label && part.value.startsWith(label)) {
          return <span key={i}><strong style={{ color: '#1e293b' }}>{label}</strong>{renderMarkdownInline(part.value.slice(label.length))}</span>;
        }
        return <React.Fragment key={i}>{renderBlock(part.value)}</React.Fragment>;
      })}
    </div>
  );
};

function classifyPart(part) {
  const match = part.match(/^\{\{(.+?)\}\}$/);
  if (match) {
    const url = match[1].trim();
    return url ? { type: 'image', value: url } : null;
  }
  return { type: 'text', value: part };
}

/**
 * renderBlock — splits text into blocks (paragraphs, tables, lists, headings, hr)
 * and renders each with appropriate JSX.
 */
function renderBlock(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Horizontal rule: --- or ***
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Heading: ## Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2].trim();
      blocks.push({ type: 'heading', level, content });
      i++;
      continue;
    }

    // Table: | ... | with |---| separator
    if (line.startsWith('|') && line.endsWith('|') && i + 1 < lines.length && /^\|[\s\-:|]+\|$/.test(lines[i + 1])) {
      const headerCells = parseTableRow(line);
      i += 2; // skip header + separator
      const bodyRows = [];
      while (i < lines.length && lines[i].startsWith('|') && lines[i].endsWith('|')) {
        bodyRows.push(parseTableRow(lines[i]));
        i++;
      }
      blocks.push({ type: 'table', headers: headerCells, rows: bodyRows });
      continue;
    }

    // Bullet list: - item or * item
    if (/^[\s]*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[\s]*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*[-*]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Numbered list: 1. item
    if (/^[\s]*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[\s]*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Regular paragraph — collect consecutive non-empty, non-special lines
    const paraLines = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^#{1,3}\s/.test(lines[i]) && !/^[-*]\s/.test(lines[i]) && !/^\d+\.\s/.test(lines[i]) && !/^\|/.test(lines[i]) && !/^(-{3,}|\*{3,})\s*$/.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'p', content: paraLines.join('\n') });
  }

  return blocks.map((block, idx) => renderBlockElement(block, idx));
}

function renderBlockElement(block, key) {
  switch (block.type) {
    case 'hr':
      return <hr key={key} style={{ border: 'none', borderTop: '2px solid #e2e8f0', margin: '12px 0' }} />;

    case 'heading': {
      const sizes = { 1: '1.1rem', 2: '1rem', 3: '0.95rem' };
      const weights = { 1: 700, 2: 700, 3: 600 };
      return (
        <div key={key} style={{
          fontSize: sizes[block.level] || '1rem',
          fontWeight: weights[block.level] || 600,
          color: '#1e293b',
          marginTop: '10px',
          marginBottom: '4px',
        }}>
          {renderMarkdownInline(block.content)}
        </div>
      );
    }

    case 'table':
      return (
        <div key={key} style={{ overflowX: 'auto', margin: '8px 0' }}>
          <table style={{
            borderCollapse: 'collapse',
            width: '100%',
            fontSize: '0.85rem',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
          }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {block.headers.map((cell, ci) => (
                  <th key={ci} style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: '#1e293b',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.82rem',
                  }}>
                    {renderMarkdownInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{
                      padding: '6px 12px',
                      border: '1px solid #e2e8f0',
                      color: '#334155',
                    }}>
                      {renderMarkdownInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'ul':
      return (
        <ul key={key} style={{
          margin: '6px 0',
          paddingLeft: '22px',
          listStyleType: 'disc',
        }}>
          {block.items.map((item, ii) => (
            <li key={ii} style={{ marginBottom: '3px', lineHeight: 1.55 }}>
              {renderMarkdownInline(item)}
            </li>
          ))}
        </ul>
      );

    case 'ol':
      return (
        <ol key={key} style={{
          margin: '6px 0',
          paddingLeft: '22px',
          listStyleType: 'decimal',
        }}>
          {block.items.map((item, ii) => (
            <li key={ii} style={{ marginBottom: '3px', lineHeight: 1.55 }}>
              {renderMarkdownInline(item)}
            </li>
          ))}
        </ol>
      );

    case 'p':
    default:
      return (
        <p key={key} style={{ margin: '4px 0', lineHeight: 1.65 }}>
          {renderMarkdownInline(block.content)}
        </p>
      );
  }
}

/**
 * renderMarkdownInline — handles inline formatting:
 * **bold**, *italic*, ~~strikethrough~~, <u>underline</u>, `code`
 */
function renderMarkdownInline(text) {
  if (!text) return null;

  // Tokenize inline elements
  const tokens = tokenizeInline(text);

  return tokens.map((token, i) => {
    switch (token.type) {
      case 'bold':
        return <strong key={i} style={{ fontWeight: 700, color: '#1e293b' }}>{token.content}</strong>;
      case 'italic':
        return <em key={i}>{token.content}</em>;
      case 'strikethrough':
        return <s key={i} style={{ textDecoration: 'line-through', color: '#64748b' }}>{token.content}</s>;
      case 'underline':
        return <u key={i} style={{ textDecoration: 'underline' }}>{token.content}</u>;
      case 'code':
        return <code key={i} style={{
          background: '#f1f5f9',
          padding: '1px 6px',
          borderRadius: '4px',
          fontSize: '0.85em',
          fontFamily: 'monospace',
          color: '#dc2626',
          border: '1px solid #e2e8f0',
        }}>{token.content}</code>;
      case 'text':
      default:
        return <span key={i}>{token.content}</span>;
    }
  });
}

/**
 * Tokenize inline markdown into typed tokens.
 * Handles: **bold**, *italic*, ~~strike~~, <u>underline</u>, `code`
 */
function tokenizeInline(text) {
  const tokens = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Try each pattern in order of precedence

    // **bold**
    let match = remaining.match(/^\*\*(.+?)\*\*/);
    if (match) {
      tokens.push({ type: 'bold', content: match[1] });
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // ~~strikethrough~~
    match = remaining.match(/^~~(.+?)~~/);
    if (match) {
      tokens.push({ type: 'strikethrough', content: match[1] });
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // *italic* (but not **)
    match = remaining.match(/^\*([^*]+?)\*/);
    if (match) {
      tokens.push({ type: 'italic', content: match[1] });
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // <u>underline</u>
    match = remaining.match(/^<u>(.+?)<\/u>/);
    if (match) {
      tokens.push({ type: 'underline', content: match[1] });
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // `code`
    match = remaining.match(/^`([^`]+?)`/);
    if (match) {
      tokens.push({ type: 'code', content: match[1] });
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Plain text — consume until next special character
    const nextSpecial = remaining.search(/\*\*|~~|\*|<u>|<\/u>|`/);
    if (nextSpecial === -1) {
      tokens.push({ type: 'text', content: remaining });
      break;
    }
    if (nextSpecial > 0) {
      tokens.push({ type: 'text', content: remaining.slice(0, nextSpecial) });
      remaining = remaining.slice(nextSpecial);
    } else {
      // Unmatched special character, treat as text
      tokens.push({ type: 'text', content: remaining[0] });
      remaining = remaining.slice(1);
    }
  }

  return tokens;
}

function parseTableRow(line) {
  return line.split('|').slice(1, -1).map(cell => cell.trim());
}

/**
 * Inline image component with click-to-enlarge overlay
 */
const RationaleInlineImage = ({ src, extraStyle }) => {
  const [enlarged, setEnlarged] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);

  const resolvedSrc = React.useMemo(() => {
    const value = String(src || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    if (/^data:/i.test(value)) return value;
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
