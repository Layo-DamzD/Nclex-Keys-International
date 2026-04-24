import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AssessmentSettings = () => {
  const [config, setConfig] = useState(null);
  const [originalConfig, setOriginalConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/assessment-config', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data;
      setConfig(data);
      setOriginalConfig(data);
    } catch (err) {
      console.error('Failed to load assessment config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleToggle = (field) => {
    setConfig(prev => ({ ...prev, [field]: !prev[field] }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = sessionStorage.getItem('adminToken');
      await axios.put('/api/admin/assessment-config', config, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOriginalConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save assessment config:', err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (originalConfig) {
      setConfig({ ...originalConfig });
      setSaved(false);
    }
  };

  const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-3">Loading CAT engine settings...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>CAT Engine Settings</h2>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: '0.95rem' }}>
            NCLEX-style Computer Adaptive Test configuration — controls how assessments and CAT tests adapt to student ability
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {hasChanges && (
            <button type="button" className="btn btn-outline-secondary" onClick={handleReset}>
              Reset
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? 'Saving...' : (saved ? 'Saved!' : 'Save Settings')}
          </button>
        </div>
      </div>

      {/* Core CAT Parameters */}
      <div className="card mb-3" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div className="card-header" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderRadius: '12px 12px 0 0' }}>
          <h5 style={{ margin: 0, fontWeight: 700, color: '#334155' }}>
            <i className="fas fa-brain" style={{ marginRight: '8px', color: '#8b5cf6' }}></i>
            Core Parameters
          </h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-3 mb-3">
              <label className="form-label" style={{ fontWeight: 600 }}>Min Items</label>
              <input type="number" className="form-control" min={15} max={150}
                value={config?.catMinItems ?? 85}
                onChange={e => handleChange('catMinItems', Number(e.target.value))} />
              <small className="text-muted">Cannot stop before this (NCLEX: 85)</small>
            </div>
            <div className="col-md-3 mb-3">
              <label className="form-label" style={{ fontWeight: 600 }}>Max Items</label>
              <input type="number" className="form-control" min={50} max={300}
                value={config?.catMaxItems ?? 150}
                onChange={e => handleChange('catMaxItems', Number(e.target.value))} />
              <small className="text-muted">Must stop at this (NCLEX: 150)</small>
            </div>
            <div className="col-md-3 mb-3">
              <label className="form-label" style={{ fontWeight: 600 }}>Passing Standard (&#952;)</label>
              <input type="number" className="form-control" min={-3} max={3} step={0.1}
                value={config?.catPassingStandard ?? 0}
                onChange={e => handleChange('catPassingStandard', Number(e.target.value))} />
              <small className="text-muted">Ability threshold (0 = medium)</small>
            </div>
            <div className="col-md-3 mb-3">
              <label className="form-label" style={{ fontWeight: 600 }}>Confidence Threshold</label>
              <input type="number" className="form-control" min={0.5} max={0.999} step={0.01}
                value={config?.catConfidenceLevel ?? 0.95}
                onChange={e => handleChange('catConfidenceLevel', Number(e.target.value))} />
              <small className="text-muted">Default: 0.95 (95% CI)</small>
            </div>
          </div>
        </div>
      </div>

      {/* Theta Adjustment */}
      <div className="card mb-3" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div className="card-header" style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', borderRadius: '12px 12px 0 0' }}>
          <h5 style={{ margin: 0, fontWeight: 700, color: '#92400e' }}>
            <i className="fas fa-sliders-h" style={{ marginRight: '8px', color: '#d97706' }}></i>
            Theta Adjustment
          </h5>
        </div>
        <div className="card-body">
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '12px' }}>
            Controls how aggressively the engine estimates student ability. Higher initial adjustment = faster
            adaptation early on. Lower min adjustment = finer tuning toward the end of the test.
          </p>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label" style={{ fontWeight: 600 }}>Initial Adjustment</label>
              <input type="number" className="form-control" min={0.05} max={1.0} step={0.05}
                value={config?.catInitialAdjustment ?? 0.3}
                onChange={e => handleChange('catInitialAdjustment', Number(e.target.value))} />
              <small className="text-muted">Theta shift at the start (higher = faster adaptation)</small>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label" style={{ fontWeight: 600 }}>Min Adjustment</label>
              <input type="number" className="form-control" min={0.01} max={0.5} step={0.01}
                value={config?.catMinAdjustment ?? 0.05}
                onChange={e => handleChange('catMinAdjustment', Number(e.target.value))} />
              <small className="text-muted">Minimum theta shift toward end of test (finer tuning)</small>
            </div>
          </div>
        </div>
      </div>

      {/* Borderline Candidate Behaviour */}
      <div className="card mb-3" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div className="card-header" style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca', borderRadius: '12px 12px 0 0' }}>
          <h5 style={{ margin: 0, fontWeight: 700, color: '#991b1b' }}>
            <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px', color: '#ef4444' }}></i>
            Borderline Candidate Behaviour
          </h5>
        </div>
        <div className="card-body">
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '12px' }}>
            When a candidate's theta is within the threshold of the passing standard,
            the engine slows adjustment and SE reduction — pushing the test toward
            the maximum number of questions (real NCLEX behaviour).
          </p>
          <div className="row">
            <div className="col-md-4 mb-3">
              <label className="form-label" style={{ fontWeight: 600 }}>Borderline Threshold</label>
              <input type="number" className="form-control" min={0.05} max={1.0} step={0.05}
                value={config?.catBorderlineThreshold ?? 0.2}
                onChange={e => handleChange('catBorderlineThreshold', Number(e.target.value))} />
              <small className="text-muted">|theta &#8722; standard| &lt; this = borderline</small>
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label" style={{ fontWeight: 600 }}>SE Decay (Normal)</label>
              <input type="number" className="form-control" min={0.80} max={0.99} step={0.005}
                value={config?.catSeDecay ?? 0.95}
                onChange={e => handleChange('catSeDecay', Number(e.target.value))} />
              <small className="text-muted">SE multiplied by this per question</small>
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label" style={{ fontWeight: 600 }}>SE Decay (Borderline)</label>
              <input type="number" className="form-control" min={0.90} max={0.995} step={0.005}
                value={config?.catBorderlineSeDecay ?? 0.975}
                onChange={e => handleChange('catBorderlineSeDecay', Number(e.target.value))} />
              <small className="text-muted">Slower decay = more questions for borderline</small>
            </div>
          </div>
        </div>
      </div>

      {/* Scoring System */}
      <div className="card mb-3" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div className="card-header" style={{ background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', borderRadius: '12px 12px 0 0' }}>
          <h5 style={{ margin: 0, fontWeight: 700, color: '#166534' }}>
            <i className="fas fa-star-half-alt" style={{ marginRight: '8px', color: '#22c55e' }}></i>
            Scoring System
          </h5>
        </div>
        <div className="card-body">
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
            Control how answers are scored. Partial scoring gives credit for partially correct NGN answers.
            Negative scoring adds extra theta penalty for wrong answers to improve ability estimation accuracy.
          </p>

          {/* Partial Scoring Toggle */}
          <div className="form-check form-switch mb-3" style={{ padding: '10px 0' }}>
            <input className="form-check-input" type="checkbox" role="switch" id="catPartialScoring"
              style={{ width: '3em', height: '1.5em', cursor: 'pointer' }}
              checked={config?.catPartialScoring ?? true}
              onChange={() => handleToggle('catPartialScoring')} />
            <label className="form-check-label" htmlFor="catPartialScoring" style={{ marginLeft: '8px', fontWeight: 600, cursor: 'pointer' }}>
              Partial Scoring
            </label>
            <div style={{ marginLeft: '42px', fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
              Give partial credit for NGN types (case study, drag-drop, cloze, matrix, hotspot, bowtie, highlight) and SATA.
              When a student gets some answers correct but not all, theta shifts proportionally instead of a full negative.
            </div>
          </div>

          {/* Negative Scoring Toggle */}
          <div className="form-check form-switch mb-3" style={{ padding: '10px 0' }}>
            <input className="form-check-input" type="checkbox" role="switch" id="catNegativeScoring"
              style={{ width: '3em', height: '1.5em', cursor: 'pointer' }}
              checked={config?.catNegativeScoring ?? true}
              onChange={() => handleToggle('catNegativeScoring')} />
            <label className="form-check-label" htmlFor="catNegativeScoring" style={{ marginLeft: '8px', fontWeight: 600, cursor: 'pointer' }}>
              Negative Scoring
            </label>
            <div style={{ marginLeft: '42px', fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
              Apply extra theta penalty for wrong answers. Wrong MCQ/fill-blank answers get half penalty;
              NGN and SATA wrong answers get full penalty. Helps distinguish between guessing and knowledge gaps.
            </div>
          </div>

          <div className="row">
            <div className="col-md-4 mb-3">
              <label className="form-label" style={{ fontWeight: 600 }}>Negative Penalty</label>
              <input type="number" className="form-control" min={0.01} max={1.0} step={0.01}
                value={config?.catNegativePenalty ?? 0.15}
                onChange={e => handleChange('catNegativePenalty', Number(e.target.value))} />
              <small className="text-muted">Extra theta deduction for wrong answers</small>
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label" style={{ fontWeight: 600 }}>Partial Threshold</label>
              <input type="number" className="form-control" min={0.1} max={0.9} step={0.05}
                value={config?.catPartialThreshold ?? 0.6}
                onChange={e => handleChange('catPartialThreshold', Number(e.target.value))} />
              <small className="text-muted">Min proportion for positive theta shift (0.6 = 60%)</small>
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label" style={{ fontWeight: 600 }}>SATA Scoring Mode</label>
              <select className="form-select"
                value={config?.catSataScoringMode ?? 'partial_negative'}
                onChange={e => handleChange('catSataScoringMode', e.target.value)}>
                <option value="partial_negative">Partial + Negative</option>
                <option value="partial_only">Partial Only</option>
                <option value="all_or_nothing">All or Nothing</option>
              </select>
              <small className="text-muted">
                {config?.catSataScoringMode === 'partial_negative' && 'Correct picks minus wrong picks, divided by total correct'}
                {config?.catSataScoringMode === 'partial_only' && 'Score = correct picks / total correct (no penalty for wrong)'}
                {config?.catSataScoringMode === 'all_or_nothing' && 'Must pick ALL correct options and NO wrong ones for credit'}
                {!config?.catSataScoringMode && 'Correct picks minus wrong picks, divided by total correct'}
              </small>
            </div>
          </div>

          {/* Cloze Partial Scoring */}
          <div className="form-check form-switch mb-2" style={{ padding: '10px 0' }}>
            <input className="form-check-input" type="checkbox" role="switch" id="catClozePartialScoring"
              style={{ width: '3em', height: '1.5em', cursor: 'pointer' }}
              checked={config?.catClozePartialScoring ?? true}
              onChange={() => handleToggle('catClozePartialScoring')} />
            <label className="form-check-label" htmlFor="catClozePartialScoring" style={{ marginLeft: '8px', fontWeight: 600, cursor: 'pointer' }}>
              Cloze-Dropdown Partial Scoring
            </label>
            <div style={{ marginLeft: '42px', fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
              Score each blank in cloze-dropdown questions individually. Correct blanks earn credit,
              wrong blanks deduct credit (max(0, correct - wrong) / total). When off, all blanks must be correct.
            </div>
          </div>
        </div>
      </div>

      {/* Question Type Toggles */}
      <div className="card mb-3" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div className="card-header" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderRadius: '12px 12px 0 0' }}>
          <h5 style={{ margin: 0, fontWeight: 700, color: '#334155' }}>
            <i className="fas fa-puzzle-piece" style={{ marginRight: '8px', color: '#f59e0b' }}></i>
            Question Types
          </h5>
        </div>
        <div className="card-body">
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '12px' }}>
            Choose which question types are included in the CAT question pool. All types contribute to adaptive difficulty.
          </p>
          <div className="row">
            {[
              { key: 'includeMultipleChoice', label: 'Multiple Choice', icon: 'list-ol' },
              { key: 'includeSATA', label: 'SATA (Select All That Apply)', icon: 'check-double' },
              { key: 'includeFillBlank', label: 'Fill in the Blank', icon: 'pen' },
              { key: 'includeMatrix', label: 'Matrix', icon: 'th' },
              { key: 'includeDragDrop', label: 'Drag & Drop', icon: 'arrows-alt' },
              { key: 'includeHighlight', label: 'Highlight', icon: 'highlighter' },
              { key: 'includeHotspot', label: 'Hotspot', icon: 'crosshairs' },
              { key: 'includeCloze', label: 'Cloze Dropdown', icon: 'text-width' },
              { key: 'includeBowtie', label: 'Bowtie', icon: 'project-diagram' },
              { key: 'includeCaseStudy', label: 'Case Study', icon: 'file-medical' },
            ].map(qt => (
              <div key={qt.key} className="col-md-6 col-lg-4 mb-2">
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" role="switch" id={qt.key}
                    style={{ cursor: 'pointer' }}
                    checked={config?.[qt.key] ?? true}
                    onChange={() => handleToggle(qt.key)} />
                  <label className="form-check-label" htmlFor={qt.key} style={{ marginLeft: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <i className={`fas fa-${qt.icon}`} style={{ marginRight: '6px', width: '16px', color: '#64748b' }}></i>
                    {qt.label}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Last updated info */}
      {config?.updatedAt && (
        <div style={{ textAlign: 'right', color: '#94a3b8', fontSize: '0.8rem', marginTop: '8px' }}>
          Last updated: {new Date(config.updatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default AssessmentSettings;
