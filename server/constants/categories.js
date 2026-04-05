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
    "Antibiotics",
    "Cardiovascular Drugs",
    "Drug Toxicity",
    "Emergency Drugs",
    "Electrolyte Replacement Medications",
    "Endocrine Drugs",
    "Gastrointestinal Drugs",
    "Hematologic Drugs",
    "Immunosuppressants",
    "Immunizations / Vaccines",
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
// Maps DB category names that differ from the canonical CATEGORIES keys.
// Add entries here whenever the admin uploads questions with non-standard
// category names.
const CATEGORY_ALIASES = {
  // Old category name mappings
  "Adult Health": "Fundamentals",
  "Child Health": "Pediatrics",
  "Mental Health": "Pharmacology",
  "Maternal & Newborn Health": "Fundamentals",
  "Maternal Newborn Health": "Fundamentals",
  "Leadership & Management": "Fundamentals",
  "Management of Care": "Fundamentals",

  // Shorthand / abbreviation mappings
  "Emergency": "Emergency Nursing",
  "Critical": "Critical Care",
  "Fundamental": "Fundamentals",
  "Pediatric": "Pediatrics",
  "Pharm": "Pharmacology",
  "Pharma": "Pharmacology",
  "Mental": "Pharmacology",
  "OB": "Fundamentals",
  "Maternal": "Fundamentals",
  "Newborn": "Pediatrics",
  "OB/Maternal": "Fundamentals",
  "Leadership": "Fundamentals",
  "Case Studies": "Fundamentals",
  "Adult": "Fundamentals",
  "Child": "Pediatrics"
};

// ── Subcategory alias map ───────────────────────────────────────
// Maps DB subcategory names to canonical names within their category.
// These are checked after the category is matched.
const SUBCATEGORY_ALIASES = {
  // Fundamentals subcategory aliases
  "Basic Care and Comfort": "Basic Care & Comfort",
  "Basic Care": "Basic Care & Comfort",
  "Comfort": "Basic Care & Comfort",
  "Drug Administration": "Medication Administration",
  "Fluid and Electrolyte Imbalance": "Electrolyte Emergencies",
  "Fluids and Electrolytes": "Electrolyte Emergencies",
  "Fluid and Electrolytes": "Electrolyte Emergencies",
  "Infection Prevention": "Infection Control",
  "Infection Prevention and Control": "Infection Control",
  "Safety": "Safety & Fall Prevention",
  "Skills and Procedures": "Perioperative Care",

  // Pediatrics subcategory aliases
  "Growth and Development": "Growth & Development",
  "Growth": "Growth & Development",
  "Development": "Developmental Milestones",
  "Fluids & Electrolytes": "Pediatric Fluid & Electrolytes",
  "Immunization": "Immunizations",
  "Drug Administration": "Pediatric Medication Administration",

  // Pharmacology subcategory aliases
  "Psychiatric Medications": "Psychiatric Drugs",
  "Psych Meds": "Psychiatric Drugs",
  "Herbal Remedies": "Medication Administration & Safety",

  // Critical Care subcategory aliases
  "Prioritization": "Shock States",

  // Emergency Nursing subcategory aliases
  "Heat Stroke": "Heat stroke",
  "Snake Bites": "Snake bites",
  "Insect Bites": "Insect bites"
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
// canonicalCategoryLower → canonical category name
const categoryLookup = {};
Object.keys(CATEGORIES).forEach(cat => {
  categoryLookup[normalize(cat)] = cat;
});

// For each category, build a lookup of its subcategories
// (canonicalCategoryLower, subcategoryLower) → canonical subcategory name
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

  // No match — return null
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

  // 3. Normalized match within this category
  const catNorm = normalize(canonicalCategory);
  const subNorm = normalize(raw);
  const key = `${catNorm}|||${subNorm}`;
  if (subcategoryLookup[key]) return subcategoryLookup[key];

  // 4. Starts-with fuzzy match within this category
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

  // No match — return null
  return null;
}

// ── NCLEX Client Needs categories (same as client/src/constants/ClientNeeds.jsx) ──
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
 * Normalise a client-need name exactly the same way the frontend does
 * (see client/src/components/TestCustomization.jsx  →  normalizeKey).
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

// Build a lookup: normalizedKey → canonical name for every predefined CN category
const clientNeedLookup = {};
NCLEX_CLIENT_NEEDS_CATEGORIES.forEach(cn => {
  clientNeedLookup[normalizeClientNeedKey(cn)] = cn;
});

/**
 * Match a raw DB clientNeed / clientNeedSubcategory value to one of the
 * 16 predefined NCLEX Client Needs categories.
 * Returns the canonical category name or null.
 */
function matchClientNeedCategory(rawValue) {
  if (!rawValue) return null;
  const raw = String(rawValue).trim();
  if (!raw) return null;

  // 1. Exact normalised match
  const norm = normalizeClientNeedKey(raw);
  if (clientNeedLookup[norm]) return clientNeedLookup[norm];

  // 2. Starts-with match
  for (const [normCn, canonical] of Object.entries(clientNeedLookup)) {
    if (normCn.startsWith(norm) || norm.startsWith(normCn)) return canonical;
  }

  // 3. Word-overlap match (≥2 significant words)
  const rawWords = norm.split(' ').filter(w => w.length > 2);
  for (const [normCn, canonical] of Object.entries(clientNeedLookup)) {
    const cnWords = normCn.split(' ');
    const overlap = rawWords.filter(w => cnWords.some(cw => cw === w || cw.startsWith(w) || w.startsWith(cw))).length;
    if (overlap >= 2) return canonical;
  }

  return null;
}

/**
 * Check whether a question qualifies as a "client need" question.
 * Returns the set of matched canonical names (may be empty).
 */
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

/**
 * Get the canonical categories with their subcategories,
 * plus any extra subcategories found in DB data that aren't in the canonical list.
 */
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
