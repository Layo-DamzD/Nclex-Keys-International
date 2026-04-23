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
        <p className="mt-3">Loading assessment settings...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>Assessment Settings</h2>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: '0.95rem' }}>
            Configure how assessments are generated and proctored for students
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

      {/* Assessment Structure */}
      <div className="card mb-3" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div className="card-header" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderRadius: '12px 12px 0 0' }}>
          <h5 style={{ margin: 0, fontWeight: 700, color: '#334155' }}>
            <i className="fas fa-clipboard-list" style={{ marginRight: '8px', color: '#3b82f6' }}></i>
            Assessment Structure
          </h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-4 mb-3">
              <label className="form-label" style={{ fontWeight: 600 }}>Total Questions</label>
              <input type="number" className="form-control" min={10} max={300}
                value={config?.totalQuestions ?? 150}
                onChange={e => handleChange('totalQuestions', Number(e.target.value))} />
              <small className="text-muted">Total questions in the assessment</small>
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label" style={{ fontWeight: 600 }}>Min Case Studies</label>
              <input type="number" className="form-control" min={0} max={200}
                value={config?.minCaseStudies ?? 40}
                onChange={e => handleChange('minCaseStudies', Number(e.target.value))} />
              <small className="text-muted">Minimum case studies to include</small>
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label" style={{ fontWeight: 600 }}>Passing Score (%)</label>
              <input type="number" className="form-control" min={0} max={100}
                value={config?.passingScore ?? 70}
                onChange={e => handleChange('passingScore', Number(e.target.value))} />
              <small className="text-muted">Percentage required to pass</small>
            </div>
          </div>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label" style={{ fontWeight: 600 }}>Duration (minutes)</label>
              <input type="number" className="form-control" min={10} max={600}
                value={config?.assessmentDuration ?? 180}
                onChange={e => handleChange('assessmentDuration', Number(e.target.value))} />
              <small className="text-muted">Time limit for the assessment</small>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label" style={{ fontWeight: 600 }}>Max Attempts per Student</label>
              <input type="number" className="form-control" min={0} max={99}
                value={config?.maxAttempts ?? 1}
                onChange={e => handleChange('maxAttempts', Number(e.target.value))} />
              <small className="text-muted">0 = unlimited attempts</small>
            </div>
          </div>
        </div>
      </div>

      {/* Proctoring Settings */}
      <div className="card mb-3" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div className="card-header" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderRadius: '12px 12px 0 0' }}>
          <h5 style={{ margin: 0, fontWeight: 700, color: '#334155' }}>
            <i className="fas fa-video" style={{ marginRight: '8px', color: '#ef4444' }}></i>
            Proctoring Settings
          </h5>
        </div>
        <div className="card-body">
          <div className="form-check form-switch mb-3" style={{ padding: '10px 0' }}>
            <input className="form-check-input" type="checkbox" role="switch" id="assessmentProctored"
              style={{ width: '3em', height: '1.5em', cursor: 'pointer' }}
              checked={config?.assessmentProctored ?? false}
              onChange={() => handleToggle('assessmentProctored')} />
            <label className="form-check-label" htmlFor="assessmentProctored" style={{ marginLeft: '8px', fontWeight: 600, cursor: 'pointer' }}>
              Require proctoring for assessments
            </label>
            <div style={{ marginLeft: '42px', fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
              Students must pass camera, microphone and fullscreen checks before starting
            </div>
          </div>
          <div className="form-check form-switch mb-3" style={{ padding: '10px 0' }}>
            <input className="form-check-input" type="checkbox" role="switch" id="caseStudyProctored"
              style={{ width: '3em', height: '1.5em', cursor: 'pointer' }}
              checked={config?.caseStudyProctored ?? false}
              onChange={() => handleToggle('caseStudyProctored')} />
            <label className="form-check-label" htmlFor="caseStudyProctored" style={{ marginLeft: '8px', fontWeight: 600, cursor: 'pointer' }}>
              Require proctoring for case studies
            </label>
            <div style={{ marginLeft: '42px', fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
              Apply proctoring requirements specifically to case study questions
            </div>
          </div>
        </div>
      </div>

      {/* CAT Engine Settings */}
      <div className="card mb-3" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div className="card-header" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderRadius: '12px 12px 0 0' }}>
          <h5 style={{ margin: 0, fontWeight: 700, color: '#334155' }}>
            <i className="fas fa-brain" style={{ marginRight: '8px', color: '#8b5cf6' }}></i>
            CAT (Computer Adaptive Test) Engine
          </h5>
        </div>
        <div className="card-body">
          <div className="form-check form-switch mb-3" style={{ padding: '10px 0' }}>
            <input className="form-check-input" type="checkbox" role="switch" id="catEnabled"
              style={{ width: '3em', height: '1.5em', cursor: 'pointer' }}
              checked={config?.catEnabled ?? false}
              onChange={() => handleToggle('catEnabled')} />
            <label className="form-check-label" htmlFor="catEnabled" style={{ marginLeft: '8px', fontWeight: 600, cursor: 'pointer' }}>
              Enable CAT adaptive algorithm
            </label>
            <div style={{ marginLeft: '42px', fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
              When enabled, questions adapt to student ability using IRT. When disabled, questions are randomly selected.
            </div>
          </div>

          {config?.catEnabled && (
            <div style={{ marginTop: '16px' }}>
              {/* ── Core CAT parameters ── */}
              <div className="row" style={{ padding: '16px', background: '#f1f5f9', borderRadius: '8px' }}>
                <p style={{ fontWeight: 600, color: '#334155', marginBottom: '12px' }}>
                  <i className="fas fa-cog" style={{ marginRight: '6px' }}></i>Core Parameters
                </p>
                <div className="col-md-4 mb-3">
                  <label className="form-label" style={{ fontWeight: 600 }}>Min Items</label>
                  <input type="number" className="form-control" min={15} max={150}
                    value={config?.catMinItems ?? 85}
                    onChange={e => handleChange('catMinItems', Number(e.target.value))} />
                  <small className="text-muted">Cannot stop before this (NCLEX: 85)</small>
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label" style={{ fontWeight: 600 }}>Max Items</label>
                  <input type="number" className="form-control" min={50} max={300}
                    value={config?.catMaxItems ?? 150}
                    onChange={e => handleChange('catMaxItems', Number(e.target.value))} />
                  <small className="text-muted">Must stop at this (NCLEX: 150)</small>
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label" style={{ fontWeight: 600 }}>Passing Standard (&#952;)</label>
                  <input type="number" className="form-control" min={-3} max={3} step={0.1}
                    value={config?.catPassingStandard ?? 0}
                    onChange={e => handleChange('catPassingStandard', Number(e.target.value))} />
                  <small className="text-muted">Ability threshold (0 = medium)</small>
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label" style={{ fontWeight: 600 }}>Confidence Threshold</label>
                  <input type="number" className="form-control" min={0.5} max={0.999} step={0.01}
                    value={config?.catConfidenceLevel ?? 0.95}
                    onChange={e => handleChange('catConfidenceLevel', Number(e.target.value))} />
                  <small className="text-muted">Default: 0.95 (95% CI)</small>
                </div>
              </div>

              {/* ── Theta adjustment ── */}
              <div className="row mt-3" style={{ padding: '16px', background: '#fefce8', borderRadius: '8px', border: '1px solid #fde68a' }}>
                <p style={{ fontWeight: 600, color: '#92400e', marginBottom: '12px' }}>
                  <i className="fas fa-sliders-h" style={{ marginRight: '6px' }}></i>Theta Adjustment
                </p>
                <div className="col-md-6 mb-3">
                  <label className="form-label" style={{ fontWeight: 600 }}>Initial Adjustment</label>
                  <input type="number" className="form-control" min={0.05} max={1.0} step={0.05}
                    value={config?.catInitialAdjustment ?? 0.3}
                    onChange={e => handleChange('catInitialAdjustment', Number(e.target.value))} />
                  <small className="text-muted">How much theta shifts early in the test (higher = faster adaptation)</small>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label" style={{ fontWeight: 600 }}>Min Adjustment</label>
                  <input type="number" className="form-control" min={0.01} max={0.5} step={0.01}
                    value={config?.catMinAdjustment ?? 0.05}
                    onChange={e => handleChange('catMinAdjustment', Number(e.target.value))} />
                  <small className="text-muted">Minimum theta shift toward end of test (finer tuning)</small>
                </div>
              </div>

              {/* ── Borderline & SE decay ── */}
              <div className="row mt-3" style={{ padding: '16px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <p style={{ fontWeight: 600, color: '#991b1b', marginBottom: '12px' }}>
                  <i className="fas fa-exclamation-triangle" style={{ marginRight: '6px' }}></i>Borderline Candidate Behaviour
                </p>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '12px' }}>
                  When a candidate's theta is within the threshold of the passing standard,
                  the engine slows adjustment and SE reduction — pushing the test toward
                  the maximum number of questions (real NCLEX behaviour).
                </p>
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
          )}
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
            Choose which question types to include when generating a random assessment (not applicable when CAT is enabled)
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
