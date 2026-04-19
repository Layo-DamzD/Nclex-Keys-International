/**
 * Canonical NCLEX question categories and subcategories.
 * This is the SINGLE source of truth for both admin and student views.
 * Any DB question whose category/subcategory doesn't match will be
 * mapped here via the alias maps below.
 *
 * Categories and subcategories are arranged alphabetically.
 */

// ── Canonical categories (same as client/src/constants/Categories.jsx) ──
const CATEGORIES = {
  "Adult Health": [
    "Acid\u2013Base Balance",
    "Blood Disorders & Transfusion Reactions",
    "Burns",
    "Cardiovascular",
    "Chronic Illness",
    "Diagnostic Tests & Procedures",
    "Emergency Conditions (Adult)",
    "Endocrine",
    "Eye Disorders",
    "Fluid & Electrolytes",
    "Gastrointestinal",
    "Hepatic & Biliary",
    "Hematology",
    "Immune Disorders",
    "Infectious Diseases",
    "Integumentary",
    "Mobility & Immobility Complications",
    "Musculoskeletal",
    "Neurological",
    "Nutrition in Adult Health",
    "Oncology",
    "Organ Transplant",
    "Pain Management",
    "Palliative Care",
    "Perioperative / Surgical Care",
    "Postoperative Care",
    "Preoperative Care",
    "Rehabilitation",
    "Renal & Urinary",
    "Reproductive",
    "Respiratory",
    "Sepsis",
    "Shock",
    "Sleep Disorders"
  ],

  "Critical Care": [
    "ABG Interpretation",
    "Acid\u2013Base Disorders",
    "Airway Management",
    "Cardiac ICU",
    "Electrolyte Emergencies",
    "Hemodynamic Monitoring",
    "ICU Medications",
    "ICU Monitoring & Equipment",
    "Lines & Tubes",
    "Massive Transfusion",
    "Mechanical Ventilation",
    "Multi-Organ Failure",
    "Neurological ICU",
    "Nutrition in Critical Care (Enteral/TPN ICU)",
    "Renal ICU",
    "Respiratory Failure / ARDS",
    "Resuscitation / Code Blue",
    "Sedation & Paralytics",
    "Sepsis & Septic Shock",
    "Shock States",
    "Temperature Management",
    "Trauma & Emergency Care",
    "Withdrawal of Care / End-of-Life ICU"
  ],

  "Dosage Calculations": [
    "Basic Dosage Calculations",
    "Body Surface Area (BSA) Calculations",
    "Concentration Calculations",
    "Critical Care Drip Calculations",
    "Dimensional Analysis Calculations",
    "Dosage by Age Calculations",
    "Drop Factor Calculations",
    "Formula Method Calculations",
    "Heparin Dose Calculations",
    "Insulin Dose Calculations",
    "Intake & Output Calculations",
    "IV Drip Rate Calculations",
    "IV Flow Rate Calculations",
    "IV Infusion Time Calculations",
    "Liquid Medication Calculations",
    "Medication Reconstitution",
    "Parenteral Nutrition Calculations",
    "Pediatric Dosage Calculations",
    "Percentage Solution Calculations",
    "Ratio & Proportion Calculations",
    "Safe Dose Range Calculations",
    "Tablet / Capsule Calculations",
    "Titration Calculations",
    "Unit Conversions",
    "Weight-Based Dosing"
  ],

  "EKG/Cardiac Monitoring": [
    "ACLS Rhythms",
    "Atrial Fibrillation",
    "Atrial Flutter",
    "Asystole",
    "Artifact Recognition",
    "Axis Deviation",
    "Cardioversion",
    "Cardiac Resynchronization Therapy",
    "Continuous Cardiac Monitoring",
    "Defibrillation",
    "ECG Basics",
    "ECG Interpretation",
    "ECG Intervals",
    "First-Degree AV Block",
    "Heart Rate Calculation",
    "Hypercalcemia ECG Changes",
    "Hyperkalemia ECG Changes",
    "Hypocalcemia ECG Changes",
    "Hypokalemia ECG Changes",
    "Idioventricular Rhythm",
    "Implantable Cardioverter Defibrillator",
    "Lethal Rhythms",
    "Myocardial Infarction",
    "Myocardial Injury",
    "Myocardial Ischemia",
    "Pacemaker Malfunction",
    "Pacemaker Rhythms",
    "Permanent Pacemaker",
    "Premature Atrial Contractions",
    "Premature Ventricular Contractions",
    "Pulseless Electrical Activity",
    "Second-Degree AV Block Type I",
    "Second-Degree AV Block Type II",
    "Shockable vs Non-Shockable Rhythms",
    "Sinus Bradycardia",
    "Sinus Rhythm",
    "Sinus Tachycardia",
    "ST Depression",
    "ST Elevation",
    "Supraventricular Tachycardia",
    "T Wave Changes",
    "Telemetry Monitoring",
    "Temporary Pacing",
    "Third-Degree AV Block",
    "Ventricular Fibrillation",
    "Ventricular Tachycardia"
  ],

  "Emergency Nursing": [
    "Airway Emergencies",
    "Anaphylaxis",
    "Bleeding / Hemorrhage",
    "Burns Emergency",
    "Cardiac Emergencies",
    "Cardioversion",
    "Chest tube",
    "Defibrillation",
    "Disaster Nursing",
    "Drowning",
    "Emergency Procedures",
    "Environmental Emergencies",
    "Head Injury / Spinal Injury",
    "Heat stroke",
    "Hypothermia",
    "Insect bites",
    "Intubation",
    "Mass Casualty Incidents",
    "Myocardial Infarction Emergency",
    "Obstetric Emergencies",
    "Overdose",
    "Pediatric Emergencies",
    "Poisoning",
    "Primary Survey (ABCDE)",
    "Rapid Response / Code Blue",
    "Respiratory Emergencies",
    "Seizures / Status Epilepticus",
    "Shock Emergency",
    "Snake bites",
    "Stroke Emergency",
    "Trauma",
    "Triage"
  ],

  "Fundamentals": [
    "Admission, Transfer & Discharge",
    "Assistive Devices",
    "Basic Care & Comfort",
    "Blood Transfusion",
    "Communication & Therapeutic Communication",
    "Cultural Considerations",
    "Delegation",
    "Documentation",
    "Elimination",
    "End-of-Life Care",
    "Enteral Feeding",
    "Ethical Issues",
    "Foley Catheter Care",
    "Hygiene",
    "Infection Control",
    "Intraoperative Care",
    "IV Therapy",
    "Isolation Precautions",
    "Legal Issues",
    "Medication Administration",
    "Mobility & Positioning",
    "Nutrition",
    "Ostomy Care",
    "Oxygen Therapy",
    "Pain Management",
    "Palliative Care Basics",
    "Parenteral Nutrition (TPN)",
    "Patient Education",
    "Perioperative Care",
    "Postoperative Care",
    "Preoperative Care",
    "Prioritization",
    "Restraints",
    "Safety & Fall Prevention",
    "Specimen Collection",
    "Sterile Technique",
    "Vital Signs",
    "Wound Care"
  ],

  "Health Promotion & Maintenance": [
    "Aging Process",
    "Alcohol & Substance Use Prevention",
    "Chronic Disease Prevention",
    "Community Health Promotion",
    "Developmental Milestones",
    "Environmental Health",
    "Exercise & Physical Activity",
    "Family Planning & Contraception",
    "Follow-Up Care & Compliance",
    "Genetic Screening & Counseling",
    "Geriatric Health Promotion",
    "Growth & Development",
    "Health Education Programs",
    "Health Screening",
    "Immunizations",
    "Infection Prevention",
    "Injury Prevention",
    "Lifestyle Modification",
    "Men\u2019s Health Screening",
    "Newborn Care Education",
    "Nutrition & Diet Education",
    "Occupational Health",
    "Patient Education",
    "Physical Assessment Across Lifespan",
    "Postpartum Education",
    "Prenatal Care",
    "Prenatal Education",
    "Preventive Care",
    "Risk Factor Reduction",
    "Safety Education",
    "Self-Examination Teaching",
    "Sexual Health Education",
    "Sleep Hygiene",
    "Smoking Cessation",
    "Stress Management",
    "Weight Management",
    "Women\u2019s Health Screening"
  ],

  "Lab Values & Diagnostics": [
    "ABG Analysis",
    "Allergy Testing",
    "Amniocentesis",
    "Blood Glucose Tests",
    "Bone Marrow Biopsy",
    "Bronchoscopy",
    "Cardiac Catheterization",
    "Cardiac Diagnostics",
    "Cardiac Enzymes",
    "Coagulation Studies",
    "Colonoscopy",
    "CSF Analysis",
    "CT Scan",
    "Diagnostic Imaging",
    "Drug Levels / Therapeutic Drug Monitoring",
    "ECG",
    "Echocardiogram",
    "EEG",
    "EMG",
    "Electrolyte Labs",
    "Endocrine Labs",
    "Endoscopy",
    "Fetal Diagnostic Tests",
    "GI Diagnostic Tests",
    "Glucose Tolerance Test",
    "Hearing Tests",
    "Hematology Labs",
    "ICP Monitoring",
    "Infection & Culture Tests",
    "Lipid Profile",
    "Liver Function Tests",
    "Lumbar Puncture",
    "MRI",
    "Neurological Diagnostic Tests",
    "Nuclear Medicine Tests",
    "Paracentesis",
    "Postoperative Monitoring Tests",
    "Preoperative Diagnostic Tests",
    "Pregnancy Tests",
    "Pulmonary Function Tests",
    "Renal Diagnostic Tests",
    "Renal Function Tests",
    "Sleep Studies",
    "Specimen Collection & Handling",
    "Sputum Tests",
    "Stress Test",
    "Stool Tests",
    "Thoracentesis",
    "Tumor Markers",
    "Ultrasound",
    "Urinalysis",
    "Vision Tests",
    "X-Ray"
  ],

  "Leadership & Management": [
    "Advance Directives",
    "Advocacy",
    "Assignment",
    "Budgeting & Finance Basics",
    "Case Management",
    "Chain of Command",
    "Change Management",
    "Communication in Management",
    "Conflict Resolution",
    "Delegation",
    "Delegation to LPN",
    "Delegation to UAP",
    "Disaster Management",
    "Documentation & Legal Responsibility",
    "Ethical Dilemmas",
    "Ethical Principles (Autonomy, Beneficence, Justice, etc.)",
    "Evaluation & Performance Appraisal",
    "Informed Consent",
    "Incident Reports",
    "Leadership Styles",
    "Legal Issues in Nursing",
    "Management Principles",
    "Patient Safety",
    "Performance Improvement",
    "Policy & Procedures",
    "Prioritization",
    "Professional Accountability",
    "Quality Improvement",
    "Resource Management",
    "Risk Management",
    "Scope of Practice",
    "Staffing & Scheduling",
    "Supervision",
    "Teamwork & Collaboration",
    "Time Management",
    "Triage (Management Role)",
    "Utilization Review",
    "Workplace Violence & Safety"
  ],

  "Maternal & Newborn Health": [
    "Fetal Monitoring",
    "High-Risk Pregnancy",
    "Intrapartum Complications",
    "Labor & Delivery",
    "Medications in Obstetrics",
    "Newborn Assessment",
    "Newborn Care",
    "Newborn Complications",
    "Obstetric Emergencies",
    "Obstetric Procedures",
    "Pain Management in Labor",
    "Patient Education (Pregnancy / Postpartum / Newborn)",
    "Postpartum Care",
    "Postpartum Complications",
    "Prenatal Assessment",
    "Prenatal Care",
    "Prenatal Labs & Diagnostics",
    "Pregnancy Complications",
    "Pregnancy Discomforts",
    "Stages of Labor"
  ],

  "Mental Health": [
    "Abuse & Neglect",
    "ADHD",
    "Anger Management",
    "Anxiety Disorders",
    "Antidepressants",
    "Antipsychotics",
    "Anxiolytics",
    "Autism Spectrum Disorder",
    "Behavioral Therapy",
    "Bipolar Disorder",
    "Cognitive Disorders",
    "Community Mental Health",
    "Conduct & Oppositional Disorders",
    "Coping & Defense Mechanisms",
    "Crisis Intervention",
    "Cultural Considerations in Mental Health",
    "Delirium",
    "Dementia / Alzheimer\u2019s",
    "Depression",
    "Developmental Disorders",
    "Dissociative Disorders",
    "Eating Disorders",
    "Electroconvulsive Therapy (ECT)",
    "Family Therapy",
    "Group Therapy",
    "Grief & Loss",
    "Legal & Ethical Issues in Psychiatry",
    "Mental Health Assessment",
    "Mood Stabilizers",
    "Obsessive\u2013Compulsive Disorder",
    "Patient Rights",
    "Personality Disorders",
    "Psychiatric Emergencies",
    "Psychopharmacology",
    "Restraints & Seclusion",
    "Schizophrenia & Psychotic Disorders",
    "Sedatives & Hypnotics",
    "Sexual Disorders / Gender Issues",
    "Sleep Disorders",
    "Somatic Symptom Disorders",
    "Stress Management",
    "Substance Use & Addiction",
    "Suicide & Self-Harm",
    "Therapeutic Communication",
    "Trauma & Stress Disorders (PTSD)"
  ],

  "Pediatrics": [
    "Chronic Illness in Children",
    "Congenital Disorders",
    "Developmental Milestones",
    "Family-Centered Care",
    "Growth & Development",
    "Immunizations",
    "Pediatric Abuse & Neglect",
    "Pediatric Assessment",
    "Pediatric Cardiac",
    "Pediatric Emergencies",
    "Pediatric Endocrine",
    "Pediatric Fluid & Electrolytes",
    "Pediatric Gastrointestinal",
    "Pediatric Hematology",
    "Pediatric Infectious Diseases",
    "Pediatric Medication Administration",
    "Pediatric Neurological",
    "Pediatric Nutrition",
    "Pediatric Oncology",
    "Pediatric Pain Management",
    "Pediatric Procedures & Postoperative Care",
    "Pediatric Renal & Urinary",
    "Pediatric Respiratory",
    "Pediatric Safety & Injury Prevention",
    "Pediatric Vital Signs"
  ],

  "Pharmacology": [
    "Anti-Inflammatory Drugs",
    "Antibiotics",
    "Anticoagulants",
    "Antidepressants",
    "Antidotes",
    "Antifungals",
    "Antiplatelets",
    "Antiparasitic Drugs",
    "Antipsychotics",
    "Antiseizure Drugs",
    "Antituberculosis Drugs",
    "Antivirals",
    "Cardiovascular Drugs",
    "Drug Toxicity",
    "Emergency Drugs",
    "Electrolyte Replacement Medications",
    "Endocrine Drugs",
    "Gastrointestinal Drugs",
    "Hematologic Drugs",
    "Immunizations / Vaccines",
    "Immunosuppressants",
    "IV Therapy & Parenteral Medications",
    "Medication Administration & Safety",
    "Medication Calculations",
    "Mood Stabilizers",
    "Neurological Drugs",
    "Obstetric & Gynecologic Drugs",
    "Oncology Drugs (Chemotherapy)",
    "Pain Medications (Analgesics)",
    "Pediatric Drugs",
    "Psychiatric Drugs",
    "Respiratory Drugs",
    "Sedatives & Hypnotics",
    "Thrombolytics"
  ]
};

// ── Category alias map ──────────────────────────────────────────
const CATEGORY_ALIASES = {
  // Shorthand / abbreviation mappings
  "Adult": "Adult Health",
  "Med-Surg": "Adult Health",
  "MedSurg": "Adult Health",
  "Medical Surgical": "Adult Health",
  "Medical-Surgical": "Adult Health",
  "Maternal": "Maternal & Newborn Health",
  "Maternal Newborn Health": "Maternal & Newborn Health",
  "Maternal Newborn": "Maternal & Newborn Health",
  "Maternal/Newborn": "Maternal & Newborn Health",
  "Newborn": "Maternal & Newborn Health",
  "OB": "Maternal & Newborn Health",
  "OB/Maternal": "Maternal & Newborn Health",
  "Mental": "Mental Health",
  "Leadership": "Leadership & Management",
  "Management of Care": "Leadership & Management",
  "Emergency": "Emergency Nursing",
  "Critical": "Critical Care",
  "Fundamental": "Fundamentals",
  "Pediatric": "Pediatrics",
  "Pharm": "Pharmacology",
  "Pharma": "Pharmacology",
  "Dosage": "Dosage Calculations",
  "EKG": "EKG/Cardiac Monitoring",
  "ECG Interpretation": "EKG/Cardiac Monitoring",
  "Lab": "Lab Values & Diagnostics",
  "Lab Values": "Lab Values & Diagnostics",
  "Health Promotion": "Health Promotion & Maintenance",
  "Health Promotion and Maintenance": "Health Promotion & Maintenance",
  "Child Health": "Pediatrics",
  "Child": "Pediatrics"
};

// ── Subcategory alias map ───────────────────────────────────────
const SUBCATEGORY_ALIASES = {
  // Adult Health aliases
  "Cardiovascular System": "Cardiovascular",
  "CV": "Cardiovascular",
  "Acid-Base Balance": "Acid\u2013Base Balance",
  "Acid Base Balance": "Acid\u2013Base Balance",
  "Fluids & Electrolytes": "Fluid & Electrolytes",
  "Fluid and Electrolytes": "Fluid & Electrolytes",
  "GI": "Gastrointestinal",
  "GU": "Renal & Urinary",
  "Reproductive Health": "Reproductive",
  "Skills and Procedures": "Diagnostic Tests & Procedures",

  // Fundamentals aliases
  "Basic Care and Comfort": "Basic Care & Comfort",
  "Basic Care": "Basic Care & Comfort",
  "Comfort": "Basic Care & Comfort",
  "Drug Administration": "Medication Administration",
  "Infection Prevention": "Infection Control",
  "Infection Prevention and Control": "Infection Control",
  "Safety": "Safety & Fall Prevention",

  // Pediatrics aliases
  "Growth and Development": "Growth & Development",
  "Growth": "Growth & Development",
  "Development": "Developmental Milestones",
  "Immunization": "Immunizations",

  // Pharmacology aliases
  "Psychiatric Medications": "Psychiatric Drugs",
  "Psych Meds": "Psychiatric Drugs",

  // Mental Health aliases
  "Defence Mechanism": "Coping & Defense Mechanisms",
  "Defense Mechanism": "Coping & Defense Mechanisms",
  "Therapeutic Comm": "Therapeutic Communication",
  "Psychotic Disorders": "Schizophrenia & Psychotic Disorders",
  "Mood Disorders": "Bipolar Disorder",
  "Anxiety Disorders": "Anxiety Disorders",

  // Maternal aliases
  "Antepartum": "Prenatal Care",
  "Intrapartum": "Labor & Delivery",
  "Postpartum": "Postpartum Care",
  "Labor and Delivery": "Labor & Delivery",
  "L&D": "Labor & Delivery",

  // Leadership aliases
  "Delegation & Assignment": "Delegation",
  "Assignments": "Assignment",

  // Emergency Nursing aliases
  "Heat Stroke": "Heat stroke",
  "Snake Bites": "Snake bites",
  "Insect Bites": "Insect bites",

  // EKG aliases
  "ECG Basics": "ECG Basics",
  "12-Lead": "ECG Basics"
};

// ── Helper: normalize a string for fuzzy comparison ─────────────
const normalize = (str) => {
  if (!str) return '';
  return String(str).trim().toLowerCase()
    .replace(/[''\u2019\u2018]/g, '')
    .replace(/&/g, 'and')
    .replace(/[/(),.\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// ── Build fast lookup maps ──────────────────────────────────────
const categoryLookup = {};
Object.keys(CATEGORIES).forEach(cat => {
  categoryLookup[normalize(cat)] = cat;
});

const subcategoryLookup = {};
Object.entries(CATEGORIES).forEach(([cat, subs]) => {
  const catNorm = normalize(cat);
  subs.forEach(sub => {
    const key = `${catNorm}|||${normalize(sub)}`;
    subcategoryLookup[key] = sub;
  });
});

/**
 * Match a raw DB category name to its canonical category.
 * Returns the canonical category name, or null if no match found.
 */
function matchCategory(dbCategory) {
  if (!dbCategory) return null;
  const raw = String(dbCategory).trim();

  // 1. Exact match (case-insensitive)
  const lowerRaw = raw.toLowerCase();
  for (const canonical of Object.keys(CATEGORIES)) {
    if (canonical.toLowerCase() === lowerRaw) return canonical;
  }

  // 2. Direct alias match (case-insensitive)
  for (const [alias, canonical] of Object.entries(CATEGORY_ALIASES)) {
    if (alias.toLowerCase() === lowerRaw) return canonical;
  }

  // 3. Normalized fuzzy match
  const normRaw = normalize(raw);
  if (categoryLookup[normRaw]) {
    return Object.keys(CATEGORIES).find(cat => normalize(cat) === normRaw) || raw;
  }

  // 4. Starts-with match
  for (const [normCat] of Object.entries(categoryLookup)) {
    if (normCat.startsWith(normRaw) || normRaw.startsWith(normCat)) {
      return Object.keys(CATEGORIES).find(cat => normalize(cat) === normCat) || raw;
    }
  }

  // 5. Contains-word match
  for (const canonical of Object.keys(CATEGORIES)) {
    const normCanonical = normalize(canonical);
    const rawWords = normRaw.split(' ');
    const matchCount = rawWords.filter(w => w.length > 2 && normCanonical.includes(w)).length;
    if (matchCount >= 2) return canonical;
  }

  return null;
}

/**
 * Match a raw DB subcategory name to its canonical subcategory
 * within a given canonical category.
 * Returns the canonical subcategory name, or null if no match found.
 */
function matchSubcategory(canonicalCategory, dbSubcategory) {
  if (!dbSubcategory) return null;
  const raw = String(dbSubcategory).trim();
  const subs = CATEGORIES[canonicalCategory];
  if (!subs) return null;

  // 1. Exact match (case-insensitive)
  const lowerRaw = raw.toLowerCase();
  for (const sub of subs) {
    if (sub.toLowerCase() === lowerRaw) return sub;
  }

  // 2. Direct alias match (case-insensitive)
  for (const [alias, canonical] of Object.entries(SUBCATEGORY_ALIASES)) {
    if (alias.toLowerCase() === lowerRaw && subs.includes(canonical)) return canonical;
  }

  // 3. Normalized match
  const catNorm = normalize(canonicalCategory);
  const subNorm = normalize(raw);
  const key = `${catNorm}|||${subNorm}`;
  if (subcategoryLookup[key]) return subcategoryLookup[key];

  // 4. Starts-with fuzzy match
  for (const sub of subs) {
    const normSub = normalize(sub);
    if (normSub.startsWith(subNorm) || subNorm.startsWith(normSub)) return sub;
  }

  // 5. Contains-word match
  for (const sub of subs) {
    const normSub = normalize(sub);
    const rawWords = subNorm.split(' ');
    const matchCount = rawWords.filter(w => w.length > 2 && normSub.includes(w)).length;
    if (matchCount >= 2) return sub;
  }

  return null;
}

// ── NCLEX Client Needs categories ──
const NCLEX_CLIENT_NEEDS_CATEGORIES = [
  'Analyze Cues',
  'Basic Care and Comfort',
  'Clinical Judgment',
  'Coordinated Care',
  'Evaluate Outcomes',
  'Health Promotion and Maintenance',
  'Management of Care',
  'Pharmacological and Parenteral Therapies',
  'Physiological Adaptation',
  'Prioritization of Care',
  'Prioritize Hypotheses',
  'Psychosocial Integrity',
  'Recognize Cues',
  'Reduction of Risk Potential',
  'Safety and Infection Control',
  'Take Actions'
];

/**
 * Normalise a client-need name exactly the same way the frontend does.
 */
const normalizeClientNeedKey = (value) => {
  const base = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['\u2019\u2018]/g, '')
    .replace(/\band\b/g, '&')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s*&\s*/g, '&')
    .replace(/[(),.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return base
    .replace(/[/&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const clientNeedLookup = {};
NCLEX_CLIENT_NEEDS_CATEGORIES.forEach(cn => {
  clientNeedLookup[normalizeClientNeedKey(cn)] = cn;
});

function matchClientNeedCategory(rawValue) {
  if (!rawValue) return null;
  const raw = String(rawValue).trim();
  if (!raw) return null;

  const norm = normalizeClientNeedKey(raw);
  if (clientNeedLookup[norm]) return clientNeedLookup[norm];

  for (const [normCn, canonical] of Object.entries(clientNeedLookup)) {
    if (normCn.startsWith(norm) || norm.startsWith(normCn)) return canonical;
  }

  const rawWords = norm.split(' ').filter(w => w.length > 2);
  for (const [normCn, canonical] of Object.entries(clientNeedLookup)) {
    const cnWords = normCn.split(' ');
    const overlap = rawWords.filter(w => cnWords.some(cw => cw === w || cw.startsWith(w) || w.startsWith(cw))).length;
    if (overlap >= 2) return canonical;
  }

  return null;
}

function getClientNeedMatches(question) {
  const matched = new Set();
  const rawValues = [];
  if (question.clientNeed && String(question.clientNeed).trim()) {
    rawValues.push(String(question.clientNeed).trim());
  }
  if (question.clientNeedSubcategory && String(question.clientNeedSubcategory).trim()) {
    rawValues.push(String(question.clientNeedSubcategory).trim());
  }
  for (const rv of rawValues) {
    const m = matchClientNeedCategory(rv);
    if (m) matched.add(m);
  }
  return matched;
}

function getCategoriesWithExtras(dbExtraSubs = {}) {
  const result = {};
  Object.entries(CATEGORIES).forEach(([cat, subs]) => {
    result[cat] = [...subs];
    if (dbExtraSubs[cat]) {
      dbExtraSubs[cat].forEach(extra => {
        if (!result[cat].includes(extra)) {
          result[cat].push(extra);
        }
      });
    }
  });
  return result;
}

module.exports = {
  CATEGORIES,
  CATEGORY_ALIASES,
  SUBCATEGORY_ALIASES,
  NCLEX_CLIENT_NEEDS_CATEGORIES,
  matchCategory,
  matchSubcategory,
  matchClientNeedCategory,
  getClientNeedMatches,
  normalizeClientNeedKey,
  getCategoriesWithExtras,
  normalize
};
