import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import LandingLayoutRenderer from '../LandingLayoutRenderer';
import './LandingPageEditor.css';

const PAGE_OPTIONS = [
  { key: 'home', label: 'Home Landing Page' },
  { key: 'brainiac', label: 'Meet Our Brainiacs' },
];

const GRID_SIZE = 8;
const SNAP_THRESHOLD = 6;
const HISTORY_LIMIT = 40;
const MIN_BLOCK_WIDTH = 40;
const MIN_BLOCK_HEIGHT = 30;

const clone = (value) => JSON.parse(JSON.stringify(value));

const createBlock = (type) => {
  const id = `${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  if (type === 'button') {
    return {
      id,
      type: 'button',
      x: 80,
      y: 80,
      width: 220,
      height: 56,
      zIndex: 1,
      text: 'Click Me',
      url: '/',
      style: { background: '#2563eb', color: '#ffffff', borderRadius: 12, fontSize: 16, fontWeight: 700 },
    };
  }
  if (type === 'image') {
    return {
      id,
      type: 'image',
      x: 80,
      y: 80,
      width: 320,
      height: 220,
      zIndex: 1,
      src: '',
      alt: 'Image',
    };
  }
  if (type === 'video') {
    return {
      id,
      type: 'video',
      x: 80,
      y: 80,
      width: 400,
      height: 225,
      zIndex: 1,
      videoUrl: '',
      videoType: 'url', // 'url' or 'upload'
      autoplay: false,
      controls: true,
    };
  }
  if (type === 'card') {
    return {
      id,
      type: 'card',
      x: 80,
      y: 80,
      width: 320,
      height: 240,
      zIndex: 1,
      title: 'New Card',
      subtitle: 'Subtitle',
      body: 'Add description here.',
      accent: '#2563eb',
      imageUrl: '',
    };
  }
  if (type === 'box') {
    return {
      id,
      type: 'box',
      x: 60,
      y: 60,
      width: 340,
      height: 180,
      zIndex: 0,
      style: { background: '#ffffff', borderRadius: 20, borderColor: '#dbeafe' },
    };
  }
  return {
    id,
    type: 'text',
    x: 80,
    y: 80,
    width: 380,
    height: 80,
    zIndex: 2,
    text: 'Edit this text',
    style: { fontSize: 28, fontWeight: 700, color: '#0f172a', align: 'left' },
  };
};

const numberOr = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundToGrid = (value) => Math.round(value / GRID_SIZE) * GRID_SIZE;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const formatAxiosError = (err, fallback) => {
  const status = err?.response?.status;
  const message = err?.response?.data?.message;
  if (status) return `${status}: ${message || fallback}`;
  return err?.message || fallback;
};

const findGuide = (targets, refs) => {
  let best = null;
  targets.forEach((target) => {
    refs.forEach((ref) => {
      const diff = Math.abs(target.value - ref);
      if (diff > SNAP_THRESHOLD) return;
      if (!best || diff < best.diff) best = { ...target, ref, diff };
    });
  });
  return best;
};

const buildRefs = (blocks, activeId, canvas) => {
  const xRefs = [0, Math.round((canvas?.width || 0) / 2), canvas?.width || 0];
  const yRefs = [0, Math.round((canvas?.height || 0) / 2), canvas?.height || 0];
  (blocks || []).forEach((block) => {
    if (block.id === activeId) return;
    xRefs.push(Math.round(block.x || 0));
    xRefs.push(Math.round((block.x || 0) + (block.width || 0) / 2));
    xRefs.push(Math.round((block.x || 0) + (block.width || 0)));
    yRefs.push(Math.round(block.y || 0));
    yRefs.push(Math.round((block.y || 0) + (block.height || 0) / 2));
    yRefs.push(Math.round((block.y || 0) + (block.height || 0)));
  });
  return { xRefs, yRefs };
};

const LandingPageEditor = () => {
  const [pageKey, setPageKey] = useState('home');
  const [config, setConfig] = useState(null);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [hasSavedConfig, setHasSavedConfig] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);
  const [scale, setScale] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [guideLines, setGuideLines] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const viewportRef = useRef(null);
  const configRef = useRef(null);

  const token = sessionStorage.getItem('adminToken');

  const selectedBlock = useMemo(
    () => config?.blocks?.find((block) => block.id === selectedBlockId) || null,
    [config, selectedBlockId]
  );

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const pushUndoSnapshot = (snapshot) => {
    if (!snapshot) return;
    setUndoStack((prev) => [...prev.slice(-(HISTORY_LIMIT - 1)), clone(snapshot)]);
    setRedoStack([]);
  };

  const commitConfig = (nextConfig, { recordHistory = true } = {}) => {
    const current = configRef.current;
    if (recordHistory && current) pushUndoSnapshot(current);
    setConfig(nextConfig);
    setStatus('');
    setError('');
  };

  const mutateConfig = (mutator, options) => {
    const current = configRef.current;
    if (!current) return;
    const nextConfig = mutator(clone(current));
    commitConfig(nextConfig, options);
  };

  const clearInteractionGuides = () => setGuideLines([]);

  const loadPageConfig = async (nextPageKey) => {
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
      setConfig(clone(res.data.config));
      setHasSavedConfig(Boolean(res.data.hasSavedConfig));
      setSelectedBlockId(res.data.config?.blocks?.[0]?.id || null);
      setUndoStack([]);
      setRedoStack([]);
      setGuideLines([]);
    } catch (err) {
      console.error('Failed to load landing page config:', err);
      const message = formatAxiosError(err, 'Failed to load landing page editor data');
      setError(
        err?.response?.status === 404
          ? `${message} (restart backend so the new landing routes are loaded)`
          : message
      );
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
    loadPageConfig(pageKey);
  }, [pageKey, token]);

  useEffect(() => {
    const updateScale = () => {
      if (!viewportRef.current || !config?.canvas?.width) return;
      const width = viewportRef.current.clientWidth - 24;
      const nextScale = Math.min(1, width / config.canvas.width);
      setScale(nextScale > 0 ? nextScale : 1);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [config]);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e) => {
      setConfig((prev) => {
        if (!prev) return prev;
        const refs = buildRefs(prev.blocks, dragging.id, prev.canvas);
        return {
          ...prev,
          blocks: prev.blocks.map((block) => {
            if (block.id !== dragging.id) return block;
            let nextX = dragging.startBlockX + (e.clientX - dragging.startMouseX) / dragging.scale;
            let nextY = dragging.startBlockY + (e.clientY - dragging.startMouseY) / dragging.scale;

            if (dragging.snapToGrid) {
              nextX = roundToGrid(nextX);
              nextY = roundToGrid(nextY);
            }

            const xGuide = findGuide(
              [
                { edge: 'left', value: nextX },
                { edge: 'center', value: nextX + (block.width || 0) / 2 },
                { edge: 'right', value: nextX + (block.width || 0) },
              ],
              refs.xRefs
            );
            const yGuide = findGuide(
              [
                { edge: 'top', value: nextY },
                { edge: 'middle', value: nextY + (block.height || 0) / 2 },
                { edge: 'bottom', value: nextY + (block.height || 0) },
              ],
              refs.yRefs
            );

            const guides = [];
            if (xGuide) {
              if (xGuide.edge === 'left') nextX = xGuide.ref;
              if (xGuide.edge === 'center') nextX = xGuide.ref - (block.width || 0) / 2;
              if (xGuide.edge === 'right') nextX = xGuide.ref - (block.width || 0);
              guides.push({ type: 'vertical', position: xGuide.ref });
            }
            if (yGuide) {
              if (yGuide.edge === 'top') nextY = yGuide.ref;
              if (yGuide.edge === 'middle') nextY = yGuide.ref - (block.height || 0) / 2;
              if (yGuide.edge === 'bottom') nextY = yGuide.ref - (block.height || 0);
              guides.push({ type: 'horizontal', position: yGuide.ref });
            }

            setGuideLines(guides);
            return {
              ...block,
              x: Math.round(clamp(nextX, 0, (prev.canvas?.width || 1200) - (block.width || 0))),
              y: Math.round(clamp(nextY, 0, (prev.canvas?.height || 900) - (block.height || 0))),
            };
          }),
        };
      });
    };

    const onUp = () => {
      setDragging(null);
      clearInteractionGuides();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  useEffect(() => {
    if (!resizing) return;

    const onMove = (e) => {
      setConfig((prev) => {
        if (!prev) return prev;
        const refs = buildRefs(prev.blocks, resizing.id, prev.canvas);

        return {
          ...prev,
          blocks: prev.blocks.map((block) => {
            if (block.id !== resizing.id) return block;

            let nextX = resizing.startX;
            let nextY = resizing.startY;
            let nextW = resizing.startWidth;
            let nextH = resizing.startHeight;
            const dx = (e.clientX - resizing.startMouseX) / resizing.scale;
            const dy = (e.clientY - resizing.startMouseY) / resizing.scale;

            if (resizing.dir.includes('e')) nextW = resizing.startWidth + dx;
            if (resizing.dir.includes('s')) nextH = resizing.startHeight + dy;
            if (resizing.dir.includes('w')) {
              nextX = resizing.startX + dx;
              nextW = resizing.startWidth - dx;
            }
            if (resizing.dir.includes('n')) {
              nextY = resizing.startY + dy;
              nextH = resizing.startHeight - dy;
            }

            if (resizing.snapToGrid) {
              if (resizing.dir.includes('w') || resizing.dir.includes('e')) {
                const right = nextX + nextW;
                if (resizing.dir.includes('w')) {
                  nextX = roundToGrid(nextX);
                  nextW = right - nextX;
                } else {
                  nextW = roundToGrid(nextX + nextW) - nextX;
                }
              }
              if (resizing.dir.includes('n') || resizing.dir.includes('s')) {
                const bottom = nextY + nextH;
                if (resizing.dir.includes('n')) {
                  nextY = roundToGrid(nextY);
                  nextH = bottom - nextY;
                } else {
                  nextH = roundToGrid(nextY + nextH) - nextY;
                }
              }
            }

            nextW = Math.max(MIN_BLOCK_WIDTH, nextW);
            nextH = Math.max(MIN_BLOCK_HEIGHT, nextH);

            // Basic alignment guides on the moving edges during resize
            const xTargets = [];
            if (resizing.dir.includes('w')) xTargets.push({ edge: 'left', value: nextX });
            if (resizing.dir.includes('e')) xTargets.push({ edge: 'right', value: nextX + nextW });
            const yTargets = [];
            if (resizing.dir.includes('n')) yTargets.push({ edge: 'top', value: nextY });
            if (resizing.dir.includes('s')) yTargets.push({ edge: 'bottom', value: nextY + nextH });
            const xGuide = xTargets.length ? findGuide(xTargets, refs.xRefs) : null;
            const yGuide = yTargets.length ? findGuide(yTargets, refs.yRefs) : null;
            const guides = [];

            if (xGuide) {
              if (xGuide.edge === 'left') {
                const right = nextX + nextW;
                nextX = xGuide.ref;
                nextW = right - nextX;
              } else if (xGuide.edge === 'right') {
                nextW = xGuide.ref - nextX;
              }
              guides.push({ type: 'vertical', position: xGuide.ref });
            }

            if (yGuide) {
              if (yGuide.edge === 'top') {
                const bottom = nextY + nextH;
                nextY = yGuide.ref;
                nextH = bottom - nextY;
              } else if (yGuide.edge === 'bottom') {
                nextH = yGuide.ref - nextY;
              }
              guides.push({ type: 'horizontal', position: yGuide.ref });
            }

            nextW = Math.max(MIN_BLOCK_WIDTH, nextW);
            nextH = Math.max(MIN_BLOCK_HEIGHT, nextH);

            nextX = clamp(nextX, 0, (prev.canvas?.width || 1200) - MIN_BLOCK_WIDTH);
            nextY = clamp(nextY, 0, (prev.canvas?.height || 900) - MIN_BLOCK_HEIGHT);
            if (nextX + nextW > (prev.canvas?.width || 1200)) nextW = (prev.canvas?.width || 1200) - nextX;
            if (nextY + nextH > (prev.canvas?.height || 900)) nextH = (prev.canvas?.height || 900) - nextY;

            setGuideLines(guides);

            return {
              ...block,
              x: Math.round(nextX),
              y: Math.round(nextY),
              width: Math.round(Math.max(MIN_BLOCK_WIDTH, nextW)),
              height: Math.round(Math.max(MIN_BLOCK_HEIGHT, nextH)),
            };
          }),
        };
      });
    };

    const onUp = () => {
      setResizing(null);
      clearInteractionGuides();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizing]);

  const updateCanvas = (key, value) => {
    mutateConfig((draft) => {
      draft.canvas = {
        ...(draft.canvas || {}),
        [key]: value,
      };
      return draft;
    });
  };

  const updateBlock = (blockId, updater) => {
    mutateConfig((draft) => {
      draft.blocks = draft.blocks.map((block) =>
        block.id === blockId ? (typeof updater === 'function' ? updater(block) : { ...block, ...updater }) : block
      );
      return draft;
    });
  };

  const updateBlockStyle = (blockId, key, value) => {
    updateBlock(blockId, (block) => ({
      ...block,
      style: {
        ...(block.style || {}),
        [key]: value,
      },
    }));
  };

  const addBlock = (type) => {
    const newBlock = createBlock(type);
    mutateConfig((draft) => {
      draft.blocks.push(newBlock);
      return draft;
    });
    setSelectedBlockId(newBlock.id);
  };

  const duplicateBlock = () => {
    if (!selectedBlock) return;
    const copy = clone(selectedBlock);
    copy.id = `${copy.type}-${Date.now()}`;
    copy.x = (copy.x || 0) + 20;
    copy.y = (copy.y || 0) + 20;
    mutateConfig((draft) => {
      draft.blocks.push(copy);
      return draft;
    });
    setSelectedBlockId(copy.id);
  };

  const deleteBlock = () => {
    if (!selectedBlock) return;
    const targetId = selectedBlock.id;
    mutateConfig((draft) => {
      draft.blocks = draft.blocks.filter((block) => block.id !== targetId);
      return draft;
    });
    setSelectedBlockId(null);
  };

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    setError('');
    setStatus('');
    try {
      await axios.put(`/api/admin/landing-page/${pageKey}`, config, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHasSavedConfig(true);
      setStatus('Saved successfully');
    } catch (err) {
      console.error('Failed to save landing page:', err);
      setError(formatAxiosError(err, 'Failed to save landing page'));
    } finally {
      setSaving(false);
    }
  };

  const resetFromServer = () => {
    loadPageConfig(pageKey);
  };

  const handleUndo = () => {
    const current = configRef.current;
    if (!current) return;
    setUndoStack((prev) => {
      if (!prev.length) return prev;
      const previous = prev[prev.length - 1];
      setRedoStack((redoPrev) => [...redoPrev.slice(-(HISTORY_LIMIT - 1)), clone(current)]);
      setConfig(clone(previous));
      clearInteractionGuides();
      return prev.slice(0, -1);
    });
  };

  const handleRedo = () => {
    const current = configRef.current;
    if (!current) return;
    setRedoStack((prev) => {
      if (!prev.length) return prev;
      const next = prev[prev.length - 1];
      setUndoStack((undoPrev) => [...undoPrev.slice(-(HISTORY_LIMIT - 1)), clone(current)]);
      setConfig(clone(next));
      clearInteractionGuides();
      return prev.slice(0, -1);
    });
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      const typing = ['input', 'textarea', 'select'].includes(tag);
      if (typing && !(e.ctrlKey || e.metaKey)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))
      ) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const handleBlockMouseDown = (e, blockId) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const current = configRef.current;
    const block = current?.blocks?.find((item) => item.id === blockId);
    if (!block) return;
    pushUndoSnapshot(current);
    setSelectedBlockId(blockId);
    clearInteractionGuides();
    setDragging({
      id: blockId,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startBlockX: block.x || 0,
      startBlockY: block.y || 0,
      scale,
      snapToGrid,
    });
  };

  const handleResizeHandleMouseDown = (e, blockId, dir) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const current = configRef.current;
    const block = current?.blocks?.find((item) => item.id === blockId);
    if (!block) return;
    pushUndoSnapshot(current);
    setSelectedBlockId(blockId);
    clearInteractionGuides();
    setResizing({
      id: blockId,
      dir,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: block.x || 0,
      startY: block.y || 0,
      startWidth: block.width || 0,
      startHeight: block.height || 0,
      scale,
      snapToGrid,
    });
  };

  if (loading) {
    return <div className="landing-editor-loading">Loading landing page editor...</div>;
  }

  if (error && !config) {
    return (
      <div className="landing-editor-error">
        <div>{error}</div>
        <div className="landing-editor-error-help">
          If you just added this feature, restart the backend server so the new routes load.
        </div>
        <button type="button" className="btn btn-secondary" onClick={resetFromServer}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="landing-editor">
      <div className="landing-editor-toolbar form-card">
        <div className="landing-editor-toolbar-left">
          <h2>Landing Page Studio</h2>
          <p>Super-admin free-drag editor for Home and Meet Our Brainiacs.</p>
        </div>
        <div className="landing-editor-toolbar-actions">
          <select
            className="landing-editor-select"
            value={pageKey}
            onChange={(e) => setPageKey(e.target.value)}
          >
            {PAGE_OPTIONS.map((page) => (
              <option key={page.key} value={page.key}>
                {page.label}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-secondary" onClick={resetFromServer}>
            <i className="fas fa-rotate-left" /> Reload
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleUndo} disabled={!undoStack.length}>
            <i className="fas fa-rotate-left" /> Undo
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleRedo} disabled={!redoStack.length}>
            <i className="fas fa-rotate-right" /> Redo
          </button>
          <button type="button" className="btn btn-primary" onClick={saveConfig} disabled={saving}>
            <i className="fas fa-save" /> {saving ? 'Saving...' : 'Save / Publish'}
          </button>
        </div>
      </div>

      {error ? <div className="landing-editor-inline-error">{error}</div> : null}
      {status ? <div className="landing-editor-inline-success">{status}</div> : null}

      <div className="landing-editor-grid">
        <aside className="landing-editor-panel form-card">
          <div className="landing-editor-panel-section">
            <div className="landing-editor-panel-header">
              <h3>Canvas</h3>
              <label className="landing-editor-checkbox">
                <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
                Grid
              </label>
            </div>
            <label className="landing-editor-checkbox landing-editor-checkbox-stack">
              <input type="checkbox" checked={snapToGrid} onChange={(e) => setSnapToGrid(e.target.checked)} />
              Snap to grid + alignment guides
            </label>
            <div className="landing-editor-field-grid">
              <label>
                Width
                <input
                  type="number"
                  value={config?.canvas?.width || 1200}
                  onChange={(e) => updateCanvas('width', Math.max(320, numberOr(e.target.value, 1200)))}
                />
              </label>
              <label>
                Height
                <input
                  type="number"
                  value={config?.canvas?.height || 900}
                  onChange={(e) => updateCanvas('height', Math.max(400, numberOr(e.target.value, 900)))}
                />
              </label>
            </div>
            <label>
              Background
              <textarea
                rows={2}
                value={config?.canvas?.background || '#ffffff'}
                onChange={(e) => updateCanvas('background', e.target.value)}
                placeholder="e.g. #ffffff or linear-gradient(...)"
              />
            </label>
            <div className="landing-editor-meta">
              {hasSavedConfig ? 'Saved layout exists for this page.' : 'Using template layout until you save.'}
              <br />
              Drag blocks. Use the blue dots on a selected block to resize.
            </div>
          </div>

          <div className="landing-editor-panel-section">
            <h3>Add Block</h3>
            <div className="landing-editor-add-grid">
              <button type="button" onClick={() => addBlock('text')}>
                <i className="fas fa-font" /> Text
              </button>
              <button type="button" onClick={() => addBlock('button')}>
                <i className="fas fa-link" /> Button
              </button>
              <button type="button" onClick={() => addBlock('image')}>
                <i className="fas fa-image" /> Image
              </button>
              <button type="button" onClick={() => addBlock('video')}>
                <i className="fas fa-video" /> Video
              </button>
              <button type="button" onClick={() => addBlock('card')}>
                <i className="fas fa-id-card" /> Card
              </button>
              <button type="button" onClick={() => addBlock('box')}>
                <i className="fas fa-square" /> Box
              </button>
            </div>
          </div>

          <div className="landing-editor-panel-section">
            <div className="landing-editor-panel-header">
              <h3>Layers</h3>
              <span>{config?.blocks?.length || 0}</span>
            </div>
            <div className="landing-editor-layers">
              {[...(config?.blocks || [])]
                .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
                .map((block) => (
                  <button
                    type="button"
                    key={block.id}
                    className={`landing-editor-layer ${selectedBlockId === block.id ? 'active' : ''}`}
                    onClick={() => setSelectedBlockId(block.id)}
                  >
                    <div>
                      <strong>{block.type}</strong>
                      <small>{block.id}</small>
                    </div>
                    <span>z{block.zIndex || 0}</span>
                  </button>
                ))}
            </div>
          </div>
        </aside>

        <section className="landing-editor-canvas-panel form-card">
          <div className="landing-editor-canvas-header">
            <div>
              <h3>Live Preview Canvas</h3>
              <p>Drag blocks directly on the canvas to position them (Canva-style).</p>
            </div>
            <a
              href={pageKey === 'home' ? '/' : '/brainiac'}
              target="_blank"
              rel="noreferrer"
              className="landing-editor-preview-link"
            >
              Open Public Page <i className="fas fa-up-right-from-square" />
            </a>
          </div>
          <div className="landing-editor-canvas-viewport" ref={viewportRef} onMouseDown={() => setSelectedBlockId(null)}>
            {config ? (
              <div
                className="landing-editor-canvas-scale-wrap"
                style={{
                  width: (config.canvas?.width || 1200) * scale,
                  height: (config.canvas?.height || 900) * scale,
                }}
              >
                <LandingLayoutRenderer
                  config={config}
                  editable
                  selectedBlockId={selectedBlockId}
                  onSelectBlock={setSelectedBlockId}
                  onBlockMouseDown={handleBlockMouseDown}
                  onResizeHandleMouseDown={handleResizeHandleMouseDown}
                  showGrid={showGrid}
                  canvasClassName="landing-editor-canvas"
                  scale={scale}
                  showResizeHandles
                  guideLines={guideLines}
                />
              </div>
            ) : null}
          </div>
        </section>

        <aside className="landing-editor-panel form-card">
          <div className="landing-editor-panel-section">
            <div className="landing-editor-panel-header">
              <h3>Selected Block</h3>
              {selectedBlock ? (
                <div className="landing-editor-selected-actions">
                  <button type="button" onClick={duplicateBlock} title="Duplicate">
                    <i className="fas fa-copy" />
                  </button>
                  <button type="button" onClick={deleteBlock} title="Delete" className="danger">
                    <i className="fas fa-trash" />
                  </button>
                </div>
              ) : null}
            </div>

            {!selectedBlock ? (
              <div className="landing-editor-empty-select">
                Click a block on the canvas to edit it.
              </div>
            ) : (
              <>
                <label>
                  Type
                  <input value={selectedBlock.type} disabled />
                </label>
                <div className="landing-editor-field-grid">
                  <label>
                    X
                    <input
                      type="number"
                      value={selectedBlock.x || 0}
                      onChange={(e) => updateBlock(selectedBlock.id, { x: Math.max(0, numberOr(e.target.value, 0)) })}
                    />
                  </label>
                  <label>
                    Y
                    <input
                      type="number"
                      value={selectedBlock.y || 0}
                      onChange={(e) => updateBlock(selectedBlock.id, { y: Math.max(0, numberOr(e.target.value, 0)) })}
                    />
                  </label>
                  <label>
                    W
                    <input
                      type="number"
                      value={selectedBlock.width || 0}
                      onChange={(e) => updateBlock(selectedBlock.id, { width: Math.max(40, numberOr(e.target.value, 120)) })}
                    />
                  </label>
                  <label>
                    H
                    <input
                      type="number"
                      value={selectedBlock.height || 0}
                      onChange={(e) => updateBlock(selectedBlock.id, { height: Math.max(30, numberOr(e.target.value, 60)) })}
                    />
                  </label>
                </div>
                <label>
                  Layer (z-index)
                  <input
                    type="number"
                    value={selectedBlock.zIndex || 0}
                    onChange={(e) => updateBlock(selectedBlock.id, { zIndex: numberOr(e.target.value, 0) })}
                  />
                </label>

                {selectedBlock.type === 'text' ? (
                  <>
                    <label>
                      Text
                      <textarea
                        rows={4}
                        value={selectedBlock.text || ''}
                        onChange={(e) => updateBlock(selectedBlock.id, { text: e.target.value })}
                      />
                    </label>
                    <div className="landing-editor-field-grid">
                      <label>
                        Font Size
                        <input
                          type="number"
                          value={selectedBlock.style?.fontSize || 18}
                          onChange={(e) => updateBlockStyle(selectedBlock.id, 'fontSize', Math.max(10, numberOr(e.target.value, 18)))}
                        />
                      </label>
                      <label>
                        Weight
                        <input
                          type="number"
                          value={selectedBlock.style?.fontWeight || 600}
                          onChange={(e) => updateBlockStyle(selectedBlock.id, 'fontWeight', numberOr(e.target.value, 600))}
                        />
                      </label>
                    </div>
                    <div className="landing-editor-field-grid">
                      <label>
                        Color
                        <input
                          value={selectedBlock.style?.color || '#0f172a'}
                          onChange={(e) => updateBlockStyle(selectedBlock.id, 'color', e.target.value)}
                        />
                      </label>
                      <label>
                        Align
                        <select
                          value={selectedBlock.style?.align || 'left'}
                          onChange={(e) => updateBlockStyle(selectedBlock.id, 'align', e.target.value)}
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </label>
                    </div>
                  </>
                ) : null}

                {selectedBlock.type === 'button' ? (
                  <>
                    <label>
                      Button Text
                      <input
                        value={selectedBlock.text || ''}
                        onChange={(e) => updateBlock(selectedBlock.id, { text: e.target.value })}
                      />
                    </label>
                    <label>
                      URL
                      <input
                        value={selectedBlock.url || ''}
                        onChange={(e) => updateBlock(selectedBlock.id, { url: e.target.value })}
                        placeholder="/brainiac or https://..."
                      />
                    </label>
                    <div className="landing-editor-field-grid">
                      <label>
                        Background
                        <input
                          value={selectedBlock.style?.background || '#2563eb'}
                          onChange={(e) => updateBlockStyle(selectedBlock.id, 'background', e.target.value)}
                        />
                      </label>
                      <label>
                        Text Color
                        <input
                          value={selectedBlock.style?.color || '#ffffff'}
                          onChange={(e) => updateBlockStyle(selectedBlock.id, 'color', e.target.value)}
                        />
                      </label>
                      <label>
                        Radius
                        <input
                          type="number"
                          value={selectedBlock.style?.borderRadius || 10}
                          onChange={(e) => updateBlockStyle(selectedBlock.id, 'borderRadius', numberOr(e.target.value, 10))}
                        />
                      </label>
                      <label>
                        Font Size
                        <input
                          type="number"
                          value={selectedBlock.style?.fontSize || 15}
                          onChange={(e) => updateBlockStyle(selectedBlock.id, 'fontSize', numberOr(e.target.value, 15))}
                        />
                      </label>
                    </div>
                  </>
                ) : null}

                {selectedBlock.type === 'image' ? (
                  <>
                    <label>
                      Image URL (or upload below)
                      <input
                        value={selectedBlock.src || ''}
                        onChange={(e) => updateBlock(selectedBlock.id, { src: e.target.value })}
                        placeholder="/images/logo.png or https://..."
                      />
                    </label>
                    <label>
                      Upload Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const formData = new FormData();
                            formData.append('file', file);
                            const token = sessionStorage.getItem('adminToken');
                            const res = await axios.post('/api/admin/content/upload', formData, {
                              headers: {
                                Authorization: `Bearer ${token}`,
                                'Content-Type': 'multipart/form-data',
                              },
                            });
                            const uploadedUrl = res?.data?.fileUrl;
                            if (uploadedUrl) {
                              updateBlock(selectedBlock.id, { src: uploadedUrl });
                            }
                          } catch (err) {
                            alert('Failed to upload image: ' + (err.response?.data?.message || err.message));
                          }
                        }}
                      />
                    </label>
                    {selectedBlock.src && (
                      <div style={{ marginTop: '8px' }}>
                        <img 
                          src={selectedBlock.src} 
                          alt="Preview" 
                          style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        />
                      </div>
                    )}
                    <label>
                      Alt Text
                      <input
                        value={selectedBlock.alt || ''}
                        onChange={(e) => updateBlock(selectedBlock.id, { alt: e.target.value })}
                      />
                    </label>
                  </>
                ) : null}

                {selectedBlock.type === 'card' ? (
                  <>
                    <label>
                      Title
                      <input
                        value={selectedBlock.title || ''}
                        onChange={(e) => updateBlock(selectedBlock.id, { title: e.target.value })}
                      />
                    </label>
                    <label>
                      Subtitle
                      <input
                        value={selectedBlock.subtitle || ''}
                        onChange={(e) => updateBlock(selectedBlock.id, { subtitle: e.target.value })}
                      />
                    </label>
                    <label>
                      Body
                      <textarea
                        rows={4}
                        value={selectedBlock.body || ''}
                        onChange={(e) => updateBlock(selectedBlock.id, { body: e.target.value })}
                      />
                    </label>
                    <div className="landing-editor-field-grid">
                      <label>
                        Accent
                        <input
                          value={selectedBlock.accent || '#2563eb'}
                          onChange={(e) => updateBlock(selectedBlock.id, { accent: e.target.value })}
                        />
                      </label>
                    </div>
                    <label>
                      Card Image URL (or upload below)
                      <input
                        value={selectedBlock.imageUrl || ''}
                        onChange={(e) => updateBlock(selectedBlock.id, { imageUrl: e.target.value })}
                        placeholder="/images/photo.jpg or https://..."
                      />
                    </label>
                    <label>
                      Upload Card Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const formData = new FormData();
                            formData.append('file', file);
                            const token = sessionStorage.getItem('adminToken');
                            const res = await axios.post('/api/admin/content/upload', formData, {
                              headers: {
                                Authorization: `Bearer ${token}`,
                                'Content-Type': 'multipart/form-data',
                              },
                            });
                            const uploadedUrl = res?.data?.fileUrl;
                            if (uploadedUrl) {
                              updateBlock(selectedBlock.id, { imageUrl: uploadedUrl });
                            }
                          } catch (err) {
                            alert('Failed to upload image: ' + (err.response?.data?.message || err.message));
                          }
                        }}
                      />
                    </label>
                    {selectedBlock.imageUrl && (
                      <div style={{ marginTop: '8px' }}>
                        <img 
                          src={selectedBlock.imageUrl} 
                          alt="Card preview" 
                          style={{ maxWidth: '100%', maxHeight: '100px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        />
                      </div>
                    )}
                  </>
                ) : null}

                {selectedBlock.type === 'video' ? (
                  <>
                    <label>
                      Video URL (YouTube, Vimeo, or direct video link)
                      <input
                        value={selectedBlock.videoUrl || ''}
                        onChange={(e) => updateBlock(selectedBlock.id, { videoUrl: e.target.value })}
                        placeholder="https://youtube.com/watch?v=... or https://..."
                      />
                    </label>
                    <label>
                      Or Upload Video File
                      <input
                        type="file"
                        accept="video/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const formData = new FormData();
                            formData.append('file', file);
                            const token = sessionStorage.getItem('adminToken');
                            const res = await axios.post('/api/admin/content/upload', formData, {
                              headers: {
                                Authorization: `Bearer ${token}`,
                                'Content-Type': 'multipart/form-data',
                              },
                            });
                            const uploadedUrl = res?.data?.fileUrl;
                            if (uploadedUrl) {
                              updateBlock(selectedBlock.id, { videoUrl: uploadedUrl, videoType: 'upload' });
                            }
                          } catch (err) {
                            alert('Failed to upload video: ' + (err.response?.data?.message || err.message));
                          }
                        }}
                      />
                    </label>
                    {selectedBlock.videoUrl && (
                      <div style={{ marginTop: '8px', padding: '8px', background: '#f1f5f9', borderRadius: '8px' }}>
                        <small style={{ color: '#64748b', wordBreak: 'break-all' }}>
                          <i className="fas fa-video me-1"></i>
                          {selectedBlock.videoUrl.length > 50 ? selectedBlock.videoUrl.substring(0, 50) + '...' : selectedBlock.videoUrl}
                        </small>
                      </div>
                    )}
                    <div className="landing-editor-field-grid" style={{ marginTop: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedBlock.autoplay || false}
                          onChange={(e) => updateBlock(selectedBlock.id, { autoplay: e.target.checked })}
                          style={{ width: 'auto' }}
                        />
                        Autoplay
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedBlock.controls !== false}
                          onChange={(e) => updateBlock(selectedBlock.id, { controls: e.target.checked })}
                          style={{ width: 'auto' }}
                        />
                        Show Controls
                      </label>
                    </div>
                  </>
                ) : null}

                {selectedBlock.type === 'box' ? (
                  <div className="landing-editor-field-grid">
                    <label>
                      Fill
                      <input
                        value={selectedBlock.style?.background || '#ffffff'}
                        onChange={(e) => updateBlockStyle(selectedBlock.id, 'background', e.target.value)}
                      />
                    </label>
                    <label>
                      Border
                      <input
                        value={selectedBlock.style?.borderColor || '#dbeafe'}
                        onChange={(e) => updateBlockStyle(selectedBlock.id, 'borderColor', e.target.value)}
                      />
                    </label>
                    <label>
                      Radius
                      <input
                        type="number"
                        value={selectedBlock.style?.borderRadius || 16}
                        onChange={(e) => updateBlockStyle(selectedBlock.id, 'borderRadius', numberOr(e.target.value, 16))}
                      />
                    </label>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default LandingPageEditor;
