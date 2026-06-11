import React, { useRef, useState } from 'react';

/**
 * MarkdownToolbar — formatting toolbar that inserts markdown syntax at cursor
 * position in a paired <textarea>.
 *
 * Supports: Bold, Italic, Underline, Strikethrough,
 *           Bullet list, Numbered list, Heading,
 *           Table template, Horizontal rule, Code block
 *
 * Props:
 *   textareaRef  — React ref to the <textarea> element
 *   onChange     — callback(textareaRef.current.value) after each insertion
 *   style        — optional wrapper style
 */
const MarkdownToolbar = ({ textareaRef, onChange, style }) => {
  const [tableMenuOpen, setTableMenuOpen] = useState(false);
  const tableMenuRef = useRef(null);

  const insert = (before, after = '', placeholder = '') => {
    const ta = textareaRef?.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.substring(start, end);
    const text = selected || placeholder;
    const replacement = before + text + after;

    // Insert using execCommand to preserve undo history
    ta.focus();
    ta.setRangeText(replacement, start, end, 'end');

    // If no text was selected, select the placeholder so user can type over it
    if (!selected && placeholder) {
      ta.selectionStart = start + before.length;
      ta.selectionEnd = start + before.length + placeholder.length;
    }

    if (onChange) onChange(ta.value);
  };

  const insertAtLineStart = (prefix) => {
    const ta = textareaRef?.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const value = ta.value;

    // Find the beginning of the current line
    let lineStart = value.lastIndexOf('\n', start - 1) + 1;

    // Get all selected lines
    let lineEnd = value.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = value.length;

    const selectedText = value.substring(lineStart, lineEnd);
    const lines = selectedText.split('\n');
    const prefixed = lines.map(line => prefix + line).join('\n');

    ta.focus();
    ta.setRangeText(prefixed, lineStart, lineEnd, 'end');
    if (onChange) onChange(ta.value);
  };

  const insertTable = (cols) => {
    const header = Array.from({ length: cols }, (_, i) => ` Column ${i + 1} `).join('|');
    const separator = Array.from({ length: cols }, () => ' --- ').join('|');
    const row1 = Array.from({ length: cols }, (_, i) => ` Cell ${i + 1} `).join('|');
    const row2 = Array.from({ length: cols }, (_, i) => ` Cell ${cols + i + 1} `).join('|');
    const table = `\n|${header}|\n|${separator}|\n|${row1}|\n|${row2}|\n`;
    insert(table, '', '');
  };

  // Close table menu when clicking outside
  React.useEffect(() => {
    if (!tableMenuOpen) return;
    const handleClick = (e) => {
      if (tableMenuRef.current && !tableMenuRef.current.contains(e.target)) {
        setTableMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [tableMenuOpen]);

  const btnStyle = (active) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    background: active ? '#e0e7ff' : '#fff',
    color: active ? '#4338ca' : '#475569',
    cursor: 'pointer',
    fontSize: '0.82rem',
    transition: 'all 0.15s',
    flexShrink: 0,
  });

  const separatorStyle = {
    width: '1px',
    height: '24px',
    background: '#e2e8f0',
    margin: '0 4px',
    flexShrink: 0,
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        padding: '6px 8px',
        background: '#f8fafc',
        borderRadius: '8px 8px 0 0',
        border: '1px solid #e2e8f0',
        borderBottom: 'none',
        flexWrap: 'wrap',
        ...style,
      }}
    >
      {/* Bold */}
      <button type="button" style={btnStyle()} onClick={() => insert('**', '**', 'bold text')} title="Bold (Ctrl+B)">
        <strong>B</strong>
      </button>

      {/* Italic */}
      <button type="button" style={btnStyle()} onClick={() => insert('*', '*', 'italic text')} title="Italic (Ctrl+I)">
        <em>I</em>
      </button>

      {/* Underline */}
      <button type="button" style={btnStyle()} onClick={() => insert('<u>', '</u>', 'underlined text')} title="Underline">
        <u>U</u>
      </button>

      {/* Strikethrough */}
      <button type="button" style={btnStyle()} onClick={() => insert('~~', '~~', 'strikethrough')} title="Strikethrough">
        <s>S</s>
      </button>

      <div style={separatorStyle} />

      {/* Bullet List */}
      <button type="button" style={btnStyle()} onClick={() => insertAtLineStart('- ')} title="Bullet list">
        <i className="fas fa-list-ul" style={{ fontSize: '0.78rem' }}></i>
      </button>

      {/* Numbered List */}
      <button type="button" style={btnStyle()} onClick={() => insertAtLineStart('1. ')} title="Numbered list">
        <i className="fas fa-list-ol" style={{ fontSize: '0.78rem' }}></i>
      </button>

      <div style={separatorStyle} />

      {/* Heading */}
      <button type="button" style={btnStyle()} onClick={() => insert('## ', '', 'Heading')} title="Heading">
        <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>H</span>
      </button>

      {/* Table with column picker */}
      <div style={{ position: 'relative' }} ref={tableMenuRef}>
        <button
          type="button"
          style={{ ...btnStyle(tableMenuOpen), width: 'auto', padding: '0 8px', gap: '4px', display: 'inline-flex', alignItems: 'center' }}
          onClick={() => setTableMenuOpen(prev => !prev)}
          title="Insert table"
        >
          <i className="fas fa-table" style={{ fontSize: '0.78rem' }}></i>
          <i className="fas fa-caret-down" style={{ fontSize: '0.65rem', marginLeft: '2px' }}></i>
        </button>
        {tableMenuOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '4px',
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              zIndex: 100,
              padding: '6px',
              minWidth: '160px',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', padding: '2px 6px 6px', fontWeight: 600 }}>
              Number of columns
            </div>
            {[2, 3, 4, 5, 6].map((cols) => (
              <button
                key={cols}
                type="button"
                onClick={() => {
                  insertTable(cols);
                  setTableMenuOpen(false);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '6px 10px',
                  border: 'none',
                  borderRadius: '6px',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  color: '#334155',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                <i className="fas fa-table me-2" style={{ fontSize: '0.72rem', color: '#6366f1' }}></i>
                {cols} column{cols > 1 ? 's' : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={separatorStyle} />

      {/* Horizontal Rule */}
      <button type="button" style={btnStyle()} onClick={() => insert('\n---\n', '', '')} title="Horizontal line">
        <i className="fas fa-minus" style={{ fontSize: '0.78rem' }}></i>
      </button>

      {/* Code Block */}
      <button type="button" style={btnStyle()} onClick={() => insert('`', '`', 'code')} title="Inline code">
        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700 }}>&lt;/&gt;</span>
      </button>

      {/* Help tooltip */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
          <i className="fas fa-info-circle me-1"></i>Markdown supported
        </span>
      </div>
    </div>
  );
};

export default MarkdownToolbar;
