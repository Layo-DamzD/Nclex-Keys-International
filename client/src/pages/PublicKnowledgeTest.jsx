import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import useLandingPageContent from '../hooks/useLandingPageContent';

const RESULT_CONTACT_NUMBER = '+2347037367480';
const RESULT_CONTACT_WA_LINK = `https://wa.me/${RESULT_CONTACT_NUMBER.replace(/\D/g, '')}`;

const RAW_QUESTIONS = [
  {
    type: 'multiple-choice',
    category: 'Adult Health',
    subcategory: 'Cardiovascular',
    questionText: 'Which finding in a client with heart failure requires immediate intervention?',
    options: ['Weight gain of 1 lb overnight', 'Crackles in both lungs', 'Blood pressure 130/80', 'Heart rate 88'],
    correctAnswer: 'Crackles in both lungs',
    rationale: 'Pulmonary crackles suggest fluid overload and possible pulmonary edema.',
  },
  {
    type: 'multiple-choice',
    category: 'Adult Health',
    subcategory: 'Neurologic',
    questionText:
      'A client with increased intracranial pressure develops bradycardia, hypertension, and irregular respirations. What does this indicate?',
    options: ['Cushing triad', 'Neurogenic shock', 'Stroke recovery', 'Hypovolemia'],
    correctAnswer: 'Cushing triad',
    rationale: 'Cushing triad indicates severe ICP and impending brain herniation.',
  },
  {
    type: 'multiple-choice',
    category: 'Adult Health',
    subcategory: 'Endocrine',
    questionText: 'Which finding indicates diabetic ketoacidosis?',
    options: ['Blood glucose 90 mg/dL', 'Kussmaul respirations', 'Bradycardia', 'Hypothermia'],
    correctAnswer: 'Kussmaul respirations',
    rationale: 'Kussmaul respirations compensate for metabolic acidosis.',
  },
  {
    type: 'multiple-choice',
    category: 'Adult Health',
    subcategory: 'Respiratory',
    questionText: 'Which assessment finding suggests pulmonary embolism?',
    options: ['Gradual cough', 'Sudden dyspnea', 'Bradycardia', 'Productive sputum'],
    correctAnswer: 'Sudden dyspnea',
    rationale: 'Pulmonary embolism often presents with sudden dyspnea.',
  },
  {
    type: 'multiple-choice',
    category: 'Maternal & Newborn Health',
    subcategory: 'Antepartum',
    questionText: 'Which finding suggests placental abruption?',
    options: ['Painless bleeding', 'Rigid abdomen', 'Soft uterus', 'No pain'],
    correctAnswer: 'Rigid abdomen',
    rationale: 'Placental abruption causes painful bleeding and uterine rigidity.',
  },
  {
    type: 'sata',
    category: 'Adult Health',
    subcategory: 'Electrolytes',
    questionText: 'Which findings indicate hyperkalemia? Select all that apply.',
    options: ['Peaked T waves', 'Muscle weakness', 'U waves', 'Bradycardia'],
    correctAnswer: 'Peaked T waves;Muscle weakness;Bradycardia',
    rationale: 'Hyperkalemia causes peaked T waves and muscle weakness.',
  },
  {
    type: 'sata',
    category: 'Adult Health',
    subcategory: 'Respiratory',
    questionText: 'Which findings suggest respiratory distress? Select all that apply.',
    options: ['Tachypnea', 'Nasal flaring', 'Oxygen saturation 88%', 'Stable breathing'],
    correctAnswer: 'Tachypnea;Nasal flaring;Oxygen saturation 88%',
    rationale: 'These findings show increased work of breathing.',
  },
  {
    type: 'sata',
    category: 'Fundamentals',
    subcategory: 'Infection Control',
    questionText: 'Which diseases require airborne precautions? Select all that apply.',
    options: ['Tuberculosis', 'Measles', 'MRSA', 'Varicella'],
    correctAnswer: 'Tuberculosis;Measles;Varicella',
    rationale: 'Airborne pathogens spread via droplet nuclei.',
  },
  {
    type: 'sata',
    category: 'Pharmacology',
    subcategory: 'Medication Safety',
    questionText: 'Which medications increase risk of digoxin toxicity? Select all that apply.',
    options: ['Furosemide', 'Verapamil', 'Potassium supplements', 'Quinidine'],
    correctAnswer: 'Furosemide;Verapamil;Quinidine',
    rationale: 'These drugs increase digoxin levels or hypokalemia risk.',
  },
  {
    type: 'sata',
    category: 'Child Health',
    subcategory: 'Growth & Development',
    questionText: 'Which behaviors are expected in a 2-year-old child? Select all that apply.',
    options: ['Parallel play', 'Temper tantrums', 'Sharing toys easily', 'Walking independently'],
    correctAnswer: 'Parallel play;Temper tantrums;Walking independently',
    rationale: 'Typical toddler behaviors.',
  },
  {
    type: 'fill-blank',
    category: 'Pharmacology',
    subcategory: 'Dosage Calculation',
    questionText:
      'The provider orders heparin 18 units/kg/hr for a patient weighing 70 kg. Enter the dose in units per hour.',
    options: [],
    correctAnswer: '1260',
    rationale: '18 x 70 = 1260 units/hr.',
  },
  {
    type: 'fill-blank',
    category: 'Pharmacology',
    subcategory: 'Dosage Calculation',
    questionText: 'A medication order reads 5 mg/kg for a patient weighing 60 kg. Enter the total dose in mg.',
    options: [],
    correctAnswer: '300',
    rationale: '5 x 60 = 300 mg.',
  },
  {
    type: 'fill-blank',
    category: 'Pharmacology',
    subcategory: 'IV Calculation',
    questionText: 'An IV infusion of 1000 mL is ordered over 8 hours. Enter the infusion rate in mL/hr.',
    options: [],
    correctAnswer: '125',
    rationale: '1000 / 8 = 125 mL/hr.',
  },
  {
    type: 'multiple-choice',
    category: 'Leadership & Management',
    subcategory: 'Delegation',
    questionText: 'Which task can an RN delegate to a UAP?',
    options: ['Assess pain', 'Administer IV medication', 'Ambulate stable patient', 'Provide teaching'],
    correctAnswer: 'Ambulate stable patient',
    rationale: 'Ambulating stable clients can be delegated to UAP.',
  },
  {
    type: 'multiple-choice',
    category: 'Adult Health',
    subcategory: 'GI',
    questionText: 'Which finding indicates peritonitis?',
    options: ['Soft abdomen', 'Rigid abdomen', 'Normal bowel sounds', 'Increased appetite'],
    correctAnswer: 'Rigid abdomen',
    rationale: 'Peritonitis causes a board-like abdomen.',
  },
  {
    type: 'multiple-choice',
    category: 'Adult Health',
    subcategory: 'Hematology',
    questionText: 'Which finding suggests anemia?',
    options: ['Fatigue', 'Hypertension', 'Hyperactivity', 'Normal oxygen'],
    correctAnswer: 'Fatigue',
    rationale: 'Reduced oxygen delivery causes fatigue.',
  },
  {
    type: 'multiple-choice',
    category: 'Mental Health',
    subcategory: 'Crisis',
    questionText: 'Which statement requires immediate intervention?',
    options: ['I feel sad today', 'Life is difficult', 'I plan to kill myself tonight', 'I am tired'],
    correctAnswer: 'I plan to kill myself tonight',
    rationale: 'A suicide plan requires immediate intervention.',
  },
  {
    type: 'multiple-choice',
    category: 'Adult Health',
    subcategory: 'Shock',
    questionText: 'Which sign indicates septic shock?',
    options: ['Warm flushed skin', 'Bradycardia', 'Cold dry skin', 'Slow breathing'],
    correctAnswer: 'Warm flushed skin',
    rationale: 'Early septic shock causes vasodilation and warm skin.',
  },
  {
    type: 'multiple-choice',
    category: 'Adult Health',
    subcategory: 'Respiratory',
    questionText: 'Which finding indicates ARDS?',
    options: ['Clear lungs', 'Bilateral infiltrates', 'Normal oxygen', 'Bradycardia'],
    correctAnswer: 'Bilateral infiltrates',
    rationale: 'ARDS shows bilateral infiltrates on imaging.',
  },
  {
    type: 'multiple-choice',
    category: 'Child Health',
    subcategory: 'Respiratory',
    questionText: 'Which disease causes a barking cough in children?',
    options: ['Asthma', 'Croup', 'Pneumonia', 'Bronchiolitis'],
    correctAnswer: 'Croup',
    rationale: 'Croup produces a barking cough.',
  },
  {
    type: 'multiple-choice',
    category: 'Adult Health',
    subcategory: 'Electrolytes',
    questionText: 'Which ECG change indicates hypokalemia?',
    options: ['Peaked T waves', 'U waves', 'Wide QRS', 'Flat P wave'],
    correctAnswer: 'U waves',
    rationale: 'Hypokalemia produces U waves.',
  },
  {
    type: 'multiple-choice',
    category: 'Adult Health',
    subcategory: 'Renal',
    questionText: 'Which finding suggests acute kidney injury?',
    options: ['Urine output 60 mL/hr', 'Urine output 10 mL/hr', 'Clear urine', 'Normal creatinine'],
    correctAnswer: 'Urine output 10 mL/hr',
    rationale: 'Oliguria suggests kidney injury.',
  },
  {
    type: 'sata',
    category: 'Maternal & Newborn Health',
    subcategory: 'Complications',
    questionText: 'Which findings suggest preeclampsia? Select all that apply.',
    options: ['Hypertension', 'Proteinuria', 'Headache', 'Hypoglycemia'],
    correctAnswer: 'Hypertension;Proteinuria;Headache',
    rationale: 'Classic signs of preeclampsia.',
  },
];

const normalizeQuestions = (rows) =>
  rows.map((row, idx) => ({
    ...row,
    id: idx + 1,
    options: Array.isArray(row.options) ? row.options : [],
    correctAnswer:
      row.type === 'sata'
        ? String(row.correctAnswer || '')
            .split(';')
            .map((v) => v.trim())
            .filter(Boolean)
        : String(row.correctAnswer || '').trim(),
  }));

const shuffleArray = (items) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const isAnswered = (question, answerValue) => {
  if (question.type === 'sata') return Array.isArray(answerValue) && answerValue.length > 0;
  return String(answerValue || '').trim() !== '';
};

const PublicKnowledgeTest = () => {
  const { config, hasSavedConfig, loading } = useLandingPageContent('home');
  const questions = useMemo(() => shuffleArray(normalizeQuestions(RAW_QUESTIONS)), []);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const current = questions[currentIndex];

  const answeredCount = useMemo(
    () =>
      questions.reduce((count, q) => (isAnswered(q, answers[q.id]) ? count + 1 : count), 0),
    [answers, questions]
  );

  const onPickOption = (question, option) => {
    if (submitted) return;
    if (question.type === 'sata') {
      const existing = Array.isArray(answers[question.id]) ? answers[question.id] : [];
      const next = existing.includes(option)
        ? existing.filter((item) => item !== option)
        : [...existing, option];
      setAnswers((prev) => ({ ...prev, [question.id]: next }));
      return;
    }
    setAnswers((prev) => ({ ...prev, [question.id]: option }));
  };

  const onFillBlank = (question, value) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  };

  const onSubmit = () => {
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const blockEvent = (event) => {
      event.preventDefault();
    };

    const blockShortcuts = (event) => {
      const key = String(event.key || '').toLowerCase();
      const isMod = event.ctrlKey || event.metaKey;
      if (!isMod) return;
      if (['c', 'x', 'a', 'u', 's', 'p'].includes(key)) {
        event.preventDefault();
      }
    };

    document.addEventListener('copy', blockEvent);
    document.addEventListener('cut', blockEvent);
    document.addEventListener('contextmenu', blockEvent);
    document.addEventListener('keydown', blockShortcuts);

    return () => {
      document.removeEventListener('copy', blockEvent);
      document.removeEventListener('cut', blockEvent);
      document.removeEventListener('contextmenu', blockEvent);
      document.removeEventListener('keydown', blockShortcuts);
    };
  }, []);

  return (
    <>
      <Navbar />
      <main className="public-test-page public-test-no-copy" onDragStart={(e) => e.preventDefault()}>
        <div className="container public-test-wrap">
          <div className="public-test-header">
            <h1>Test Your Knowledge</h1>
            <p>Practice with {questions.length} hard NCLEX questions.</p>
          </div>

          {submitted ? (
            <section className="public-test-lock-card">
              <h2>Test Submitted</h2>
              <p>
                Your responses have been recorded.
                {' '}
                <strong>
                  To view your result, message this WhatsApp number:
                  {' '}
                  <a href={RESULT_CONTACT_WA_LINK} target="_blank" rel="noreferrer">
                    {RESULT_CONTACT_NUMBER}
                  </a>
                </strong>
              </p>
              <p className="small text-muted mb-0">
                Attempted {answeredCount} of {questions.length} questions.
              </p>
            </section>
          ) : (
            <section className="public-test-card">
              <div className="public-test-meta">
                <span>
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span>{current.category} / {current.subcategory}</span>
                <span>Answered: {answeredCount}/{questions.length}</span>
              </div>

              <h2 className="public-test-question">{current.questionText}</h2>

              {(current.type === 'multiple-choice' || current.type === 'sata') && (
                <div className="public-test-options">
                  {current.options.map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    const selected = current.type === 'sata'
                      ? Array.isArray(answers[current.id]) && answers[current.id].includes(opt)
                      : answers[current.id] === opt;
                    return (
                      <button
                        type="button"
                        key={`${current.id}-${letter}`}
                        className={`public-test-option ${selected ? 'selected' : ''}`}
                        onClick={() => onPickOption(current, opt)}
                      >
                        <span className="public-test-option-letter">{letter}</span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {current.type === 'fill-blank' && (
                <div className="public-test-fill">
                  <label htmlFor={`fill-${current.id}`}>Enter your answer:</label>
                  <input
                    id={`fill-${current.id}`}
                    type="text"
                    className="form-control"
                    value={answers[current.id] || ''}
                    onChange={(e) => onFillBlank(current, e.target.value)}
                    placeholder="Type answer here"
                  />
                </div>
              )}

              <div className="public-test-actions">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                >
                  Previous
                </button>
                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  >
                    Next
                  </button>
                ) : (
                  <button type="button" className="btn btn-success" onClick={onSubmit}>
                    Submit Test
                  </button>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
      {!loading && <Footer content={hasSavedConfig && config?.mode === 'structured' ? config?.sections?.footer : undefined} />}
    </>
  );
};

export default PublicKnowledgeTest;
