import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

// ─── Constants ──────────────────────────────────────────────────────────
const SUBJECT_CATEGORIES = [
  "Adult Health", "Critical Care", "Dosage Calculations", "EKG/Cardiac Monitoring",
  "Emergency Nursing", "Fundamentals", "Health Promotion & Maintenance",
  "Lab Values & Diagnostics", "Leadership & Management", "Maternal & Newborn Health",
  "Mental Health", "Pediatrics", "Pharmacology"
];

const PerformanceAnalysis = () => {
  const [loading, setLoading] = useState(true);
  const [allAnswers, setAllAnswers] = useState([]);
  const [bankBySubject, setBankBySubject] = useState({});
  const [bankByLesson, setBankByLesson] = useState({});
  const [bankByClientNeed, setBankByClientNeed] = useState({});
  const [bankByClientNeedSub, setBankByClientNeedSub] = useState({});
  const [totalQuestionBank, setTotalQuestionBank] = useState(0);
  const [usedQuestionCount, setUsedQuestionCount] = useState(0);
  const [stats, setStats] = useState({ totalTests: 0, averageScore: 0, bestScore: 0 });

  // Dropdown selections
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedLesson, setSelectedLesson] = useState('all');
  const [selectedClientNeed, setSelectedClientNeed] = useState('all');
  const [selectedClientNeedSub, setSelectedClientNeedSub] = useState('all');

  // Available lessons based on selected subject
  const availableLessons = useMemo(() => {
    if (selectedSubject === 'all') {
      return Object.keys(bankByLesson).sort();
    }
    // Get lessons from CATEGORIES for the selected subject
    const lessonSet = new Set();
    allAnswers.forEach(a => {
      if (a.category === selectedSubject || a.category?.includes(selectedSubject)) {
        if (a.subcategory) lessonSet.add(a.subcategory);
      }
    });
    return [...lessonSet].sort();
  }, [selectedSubject, bankByLesson, allAnswers]);

  // Available client need subcategories based on selected client need
  const availableClientNeedSubs = useMemo(() => {
    if (selectedClientNeed === 'all') {
      return Object.keys(bankByClientNeedSub).sort();
    }
    const subSet = new Set();
    allAnswers.forEach(a => {
      if (a.clientNeed === selectedClientNeed || a.clientNeed?.includes(selectedClientNeed)) {
        if (a.clientNeedSubcategory) subSet.add(a.clientNeedSubcategory);
      }
    });
    return [...subSet].sort();
  }, [selectedClientNeed, bankByClientNeedSub, allAnswers]);

  // Reset dependent dropdowns
  useEffect(() => { setSelectedLesson('all'); }, [selectedSubject]);
  useEffect(() => { setSelectedClientNeedSub('all'); }, [selectedClientNeed]);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/student/performance-detailed', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = response.data;
        setAllAnswers(data.allAnswers || []);
        setBankBySubject(data.bankBySubject || {});
        setBankByLesson(data.bankByLesson || {});
        setBankByClientNeed(data.bankByClientNeed || {});
        setBankByClientNeedSub(data.bankByClientNeedSub || {});
        setTotalQuestionBank(data.totalQuestionBank || 0);
        setUsedQuestionCount(data.usedQuestionCount || 0);
        setStats(data.stats || { totalTests: 0, averageScore: 0, bestScore: 0 });
      } catch (error) {
        console.error('Error fetching performance data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPerformance();
  }, []);

  // ── Compute corrected questions ──
  // A "corrected" question was incorrect on first attempt, then correct on a later attempt
  const correctedSet = useMemo(() => {
    const questionHistory = {};
    // Sort answers by testDate ascending
    const sorted = [...allAnswers].sort((a, b) => new Date(a.testDate) - new Date(b.testDate));
    for (const ans of sorted) {
      const qid = String(ans.questionId);
      if (!questionHistory[qid]) {
        questionHistory[qid] = { firstCorrect: ans.isCorrect === true, wasIncorrect: ans.isCorrect === false };
      } else if (questionHistory[qid].wasIncorrect && ans.isCorrect === true) {
        questionHistory[qid].corrected = true;
      }
    }
    const corrected = new Set();
    for (const [qid, info] of Object.entries(questionHistory)) {
      if (info.corrected) corrected.add(qid);
      else if (info.firstCorrect) corrected.add(qid + '_first');
    }
    return corrected;
  }, [allAnswers]);

  // ── Global stats ──
  const globalStats = useMemo(() => {
    const total = allAnswers.length;
    const correct = allAnswers.filter(a => a.isCorrect === true).length;
    const incorrect = allAnswers.filter(a => a.isCorrect === false).length;
    const corrected = allAnswers.filter(a => correctedSet.has(String(a.questionId))).length;
    const correctedFirst = allAnswers.filter(a => correctedSet.has(String(a.questionId) + '_first') && a.isCorrect === true).length;
    return { total, correct, incorrect, corrected, correctedFirst };
  }, [allAnswers, correctedSet]);

  // ── Subject filter stats ──
  const subjectFilteredStats = useMemo(() => {
    let filtered = allAnswers;
    if (selectedSubject !== 'all') {
      filtered = allAnswers.filter(a => a.category === selectedSubject);
    }
    const total = filtered.length;
    const correct = filtered.filter(a => a.isCorrect === true).length;
    const incorrect = filtered.filter(a => a.isCorrect === false).length;
    const corrected = filtered.filter(a => correctedSet.has(String(a.questionId))).length;

    // Bank stats
    let bankTotal = 0, bankUsed = 0;
    if (selectedSubject !== 'all' && bankBySubject[selectedSubject]) {
      bankTotal = bankBySubject[selectedSubject].total;
      bankUsed = bankBySubject[selectedSubject].used;
    } else {
      bankTotal = totalQuestionBank;
      bankUsed = usedQuestionCount;
    }

    return { total, correct, incorrect, corrected, bankTotal, bankUsed };
  }, [allAnswers, selectedSubject, correctedSet, bankBySubject, totalQuestionBank, usedQuestionCount]);

  // ── Lesson filter stats ──
  const lessonFilteredStats = useMemo(() => {
    let filtered = allAnswers;
    if (selectedLesson !== 'all') {
      filtered = allAnswers.filter(a => a.subcategory === selectedLesson);
    }
    const total = filtered.length;
    const correct = filtered.filter(a => a.isCorrect === true).length;
    const incorrect = filtered.filter(a => a.isCorrect === false).length;
    const corrected = filtered.filter(a => correctedSet.has(String(a.questionId))).length;

    let bankTotal = 0, bankUsed = 0;
    if (selectedLesson !== 'all' && bankByLesson[selectedLesson]) {
      bankTotal = bankByLesson[selectedLesson].total;
      bankUsed = bankByLesson[selectedLesson].used;
    } else {
      bankTotal = totalQuestionBank;
      bankUsed = usedQuestionCount;
    }

    return { total, correct, incorrect, corrected, bankTotal, bankUsed };
  }, [allAnswers, selectedLesson, correctedSet, bankByLesson, totalQuestionBank, usedQuestionCount]);

  // ── Client Need filter stats ──
  const clientNeedFilteredStats = useMemo(() => {
    let filtered = allAnswers;
    if (selectedClientNeed !== 'all') {
      filtered = allAnswers.filter(a => a.clientNeed === selectedClientNeed);
    }
    const total = filtered.length;
    const correct = filtered.filter(a => a.isCorrect === true).length;
    const incorrect = filtered.filter(a => a.isCorrect === false).length;
    const corrected = filtered.filter(a => correctedSet.has(String(a.questionId))).length;

    let bankTotal = 0, bankUsed = 0;
    if (selectedClientNeed !== 'all' && bankByClientNeed[selectedClientNeed]) {
      bankTotal = bankByClientNeed[selectedClientNeed].total;
      bankUsed = bankByClientNeed[selectedClientNeed].used;
    } else {
      bankTotal = Object.values(bankByClientNeed).reduce((s, v) => s + v.total, 0);
      bankUsed = Object.values(bankByClientNeed).reduce((s, v) => s + v.used, 0);
    }

    return { total, correct, incorrect, corrected, bankTotal, bankUsed };
  }, [allAnswers, selectedClientNeed, correctedSet, bankByClientNeed]);

  // ── Client Need Sub filter stats ──
  const clientNeedSubFilteredStats = useMemo(() => {
    let filtered = allAnswers;
    if (selectedClientNeedSub !== 'all') {
      filtered = allAnswers.filter(a => a.clientNeedSubcategory === selectedClientNeedSub);
    }
    const total = filtered.length;
    const correct = filtered.filter(a => a.isCorrect === true).length;
    const incorrect = filtered.filter(a => a.isCorrect === false).length;
    const corrected = filtered.filter(a => correctedSet.has(String(a.questionId))).length;

    let bankTotal = 0, bankUsed = 0;
    if (selectedClientNeedSub !== 'all' && bankByClientNeedSub[selectedClientNeedSub]) {
      bankTotal = bankByClientNeedSub[selectedClientNeedSub].total;
      bankUsed = bankByClientNeedSub[selectedClientNeedSub].used;
    } else {
      bankTotal = Object.values(bankByClientNeedSub).reduce((s, v) => s + v.total, 0);
      bankUsed = Object.values(bankByClientNeedSub).reduce((s, v) => s + v.used, 0);
    }

    return { total, correct, incorrect, corrected, bankTotal, bankUsed };
  }, [allAnswers, selectedClientNeedSub, correctedSet, bankByClientNeedSub]);

  // ── Chart configs ──
  const chartBaseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 10,
        cornerRadius: 8,
        titleFont: { size: 13, weight: '600' },
        bodyFont: { size: 12 }
      }
    },
    cutout: '72%',
    borderWidth: 0,
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 20px', color: '#94a3b8' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Loading performance data...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '0', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* ─── Section Title ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#e2e8f0' }}>Statistics</h3>
        <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{globalStats.total} Questions</span>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          ROW 1: Usage + Questions Overview
      ════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* ── Usage Chart ── */}
        <div style={cardStyle}>
          <div style={sectionTitleRow}>
            <span style={sectionTitle}>Usage</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: 130, height: 130, flexShrink: 0 }}>
              <Doughnut
                data={{
                  labels: ['Used', 'Unused'],
                  datasets: [{
                    data: [usedQuestionCount, totalQuestionBank - usedQuestionCount],
                    backgroundColor: ['#8b5cf6', '#334155'],
                    borderWidth: 0,
                    cutout: '72%',
                  }]
                }}
                options={chartBaseOptions}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <StatRow label="Total Questions" value={totalQuestionBank} color="#e2e8f0" />
              <StatRow label="Used Questions" value={usedQuestionCount} badgeColor="#8b5cf6" />
              <StatRow label="Unused Questions" value={totalQuestionBank - usedQuestionCount} badgeColor="#64748b" />
            </div>
          </div>
        </div>

        {/* ── Questions Chart ── */}
        <div style={cardStyle}>
          <div style={sectionTitleRow}>
            <span style={sectionTitle}>Questions</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: 130, height: 130, flexShrink: 0 }}>
              <Doughnut
                data={{
                  labels: ['Correct', 'Incorrect'],
                  datasets: [{
                    data: [globalStats.correct, globalStats.incorrect],
                    backgroundColor: ['#22c55e', '#f97316'],
                    borderWidth: 0,
                    cutout: '72%',
                  }]
                }}
                options={chartBaseOptions}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <StatRow label="Total Correct" value={globalStats.correct} badgeColor="#22c55e" />
              <StatRow label="Total Incorrect" value={globalStats.incorrect} badgeColor="#f97316" />
              <StatRow label="Total Corrected" value={globalStats.corrected} badgeColor="#3b82f6" />
              <StatRow label="Corrected on First Attempt" value={globalStats.correctedFirst} badgeColor="#64748b" />
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          ROW 2: Subjects + Lessons
      ════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* ── Subjects Statistics ── */}
        <div style={cardStyle}>
          <div style={{ ...sectionTitleRow, marginBottom: '12px' }}>
            <span style={sectionTitle}>Subjects Statistics</span>
          </div>
          <CustomSelect
            value={selectedSubject}
            onChange={setSelectedSubject}
            options={[
              { value: 'all', label: 'All Subjects' },
              ...SUBJECT_CATEGORIES.filter(s => bankBySubject[s]).map(s => ({
                value: s,
                label: `${s} (${bankBySubject[s]?.total || 0})`
              }))
            ]}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '16px' }}>
            <div style={{ width: 130, height: 130, flexShrink: 0 }}>
              <Doughnut
                data={{
                  labels: ['Correct', 'Incorrect'],
                  datasets: [{
                    data: [subjectFilteredStats.correct, subjectFilteredStats.incorrect],
                    backgroundColor: ['#22c55e', '#f97316'],
                    borderWidth: 0,
                    cutout: '72%',
                  }]
                }}
                options={chartBaseOptions}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <StatRow label="Total Questions" value={subjectFilteredStats.bankTotal} />
              <StatRow label="Used Questions" value={subjectFilteredStats.bankUsed} badgeColor="#8b5cf6" />
              <StatRow label="Correct Questions" value={subjectFilteredStats.correct} badgeColor="#22c55e" />
              <StatRow label="Incorrect Questions" value={subjectFilteredStats.incorrect} badgeColor="#f97316" />
              <StatRow label="Corrected Questions" value={subjectFilteredStats.corrected} badgeColor="#3b82f6" />
            </div>
          </div>
        </div>

        {/* ── Lessons Statistics ── */}
        <div style={cardStyle}>
          <div style={{ ...sectionTitleRow, marginBottom: '12px' }}>
            <span style={sectionTitle}>Lessons Statistics</span>
          </div>
          <CustomSelect
            value={selectedLesson}
            onChange={setSelectedLesson}
            options={[
              { value: 'all', label: 'All Lessons' },
              ...availableLessons.map(l => ({
                value: l,
                label: `${l} (${bankByLesson[l]?.total || 0})`
              }))
            ]}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '16px' }}>
            <div style={{ width: 130, height: 130, flexShrink: 0 }}>
              <Doughnut
                data={{
                  labels: ['Correct', 'Incorrect'],
                  datasets: [{
                    data: [lessonFilteredStats.correct, lessonFilteredStats.incorrect],
                    backgroundColor: ['#22c55e', '#f97316'],
                    borderWidth: 0,
                    cutout: '72%',
                  }]
                }}
                options={chartBaseOptions}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <StatRow label="Total Questions" value={lessonFilteredStats.bankTotal} />
              <StatRow label="Used Questions" value={lessonFilteredStats.bankUsed} badgeColor="#8b5cf6" />
              <StatRow label="Correct Questions" value={lessonFilteredStats.correct} badgeColor="#22c55e" />
              <StatRow label="Incorrect Questions" value={lessonFilteredStats.incorrect} badgeColor="#f97316" />
              <StatRow label="Corrected Questions" value={lessonFilteredStats.corrected} badgeColor="#3b82f6" />
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          ROW 3: Client Need Areas + Subcategory
      ════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* ── Client Need Areas Statistics ── */}
        <div style={cardStyle}>
          <div style={{ ...sectionTitleRow, marginBottom: '12px' }}>
            <span style={sectionTitle}>Client Need Areas Statistics</span>
          </div>
          <CustomSelect
            value={selectedClientNeed}
            onChange={setSelectedClientNeed}
            options={[
              { value: 'all', label: 'All Client Need Areas' },
              ...Object.keys(bankByClientNeed).sort().map(cn => ({
                value: cn,
                label: `${cn} (${bankByClientNeed[cn]?.total || 0})`
              }))
            ]}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '16px' }}>
            <div style={{ width: 130, height: 130, flexShrink: 0 }}>
              <Doughnut
                data={{
                  labels: ['Correct', 'Incorrect'],
                  datasets: [{
                    data: [clientNeedFilteredStats.correct, clientNeedFilteredStats.incorrect],
                    backgroundColor: ['#22c55e', '#f97316'],
                    borderWidth: 0,
                    cutout: '72%',
                  }]
                }}
                options={chartBaseOptions}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <StatRow label="Total Questions" value={clientNeedFilteredStats.bankTotal} />
              <StatRow label="Used Questions" value={clientNeedFilteredStats.bankUsed} badgeColor="#8b5cf6" />
              <StatRow label="Correct Questions" value={clientNeedFilteredStats.correct} badgeColor="#22c55e" />
              <StatRow label="Incorrect Questions" value={clientNeedFilteredStats.incorrect} badgeColor="#f97316" />
              <StatRow label="Corrected Questions" value={clientNeedFilteredStats.corrected} badgeColor="#3b82f6" />
            </div>
          </div>
        </div>

        {/* ── Subcategory Statistics ── */}
        <div style={cardStyle}>
          <div style={{ ...sectionTitleRow, marginBottom: '12px' }}>
            <span style={sectionTitle}>Subcategory Statistics</span>
          </div>
          <CustomSelect
            value={selectedClientNeedSub}
            onChange={setSelectedClientNeedSub}
            options={[
              { value: 'all', label: 'All Subcategories' },
              ...availableClientNeedSubs.map(sub => ({
                value: sub,
                label: `${sub} (${bankByClientNeedSub[sub]?.total || 0})`
              }))
            ]}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '16px' }}>
            <div style={{ width: 130, height: 130, flexShrink: 0 }}>
              <Doughnut
                data={{
                  labels: ['Correct', 'Incorrect'],
                  datasets: [{
                    data: [clientNeedSubFilteredStats.correct, clientNeedSubFilteredStats.incorrect],
                    backgroundColor: ['#22c55e', '#f97316'],
                    borderWidth: 0,
                    cutout: '72%',
                  }]
                }}
                options={chartBaseOptions}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <StatRow label="Total Questions" value={clientNeedSubFilteredStats.bankTotal} />
              <StatRow label="Used Questions" value={clientNeedSubFilteredStats.bankUsed} badgeColor="#8b5cf6" />
              <StatRow label="Correct Questions" value={clientNeedSubFilteredStats.correct} badgeColor="#22c55e" />
              <StatRow label="Incorrect Questions" value={clientNeedSubFilteredStats.incorrect} badgeColor="#f97316" />
              <StatRow label="Corrected Questions" value={clientNeedSubFilteredStats.corrected} badgeColor="#3b82f6" />
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          SUMMARY ROW: Total Tests / Average / Best / Answered
      ════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <SummaryCard label="Total Tests" value={stats.totalTests} />
        <SummaryCard label="Average Score" value={`${stats.averageScore}%`} />
        <SummaryCard label="Best Score" value={`${stats.bestScore}%`} />
        <SummaryCard label="Questions Answered" value={globalStats.total} />
      </div>
    </div>
  );
};

// ─── Sub-components ─────────────────────────────────────────────────────

const StatRow = ({ label, value, badgeColor }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{label}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {badgeColor && (
        <span style={{
          display: 'inline-block',
          padding: '1px 8px',
          borderRadius: '10px',
          fontSize: '0.7rem',
          fontWeight: 600,
          color: '#fff',
          backgroundColor: badgeColor,
          minWidth: '32px',
          textAlign: 'center'
        }}>
          {value > 0 && value}
        </span>
      )}
      {!badgeColor && (
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>{value}</span>
      )}
    </div>
  </div>
);

const SummaryCard = ({ label, value }) => (
  <div style={{
    background: '#1e293b',
    borderRadius: '12px',
    padding: '16px 20px',
    border: '1px solid #334155',
  }}>
    <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '6px' }}>{label}</div>
    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#e2e8f0' }}>{value}</div>
  </div>
);

const CustomSelect = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      width: '100%',
      padding: '10px 14px',
      borderRadius: '8px',
      border: '1px solid #334155',
      backgroundColor: '#0f172a',
      color: '#e2e8f0',
      fontSize: '0.85rem',
      outline: 'none',
      cursor: 'pointer',
      appearance: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 12px center',
    }}
  >
    {options.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
);

// ─── Style constants ────────────────────────────────────────────────────
const cardStyle = {
  background: '#1e293b',
  borderRadius: '14px',
  padding: '20px',
  border: '1px solid #334155',
};

const sectionTitleRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '16px',
};

const sectionTitle = {
  fontSize: '0.95rem',
  fontWeight: 600,
  color: '#e2e8f0',
};

export default PerformanceAnalysis;
