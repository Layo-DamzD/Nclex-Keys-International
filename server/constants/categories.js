/**
 * Canonical NCLEX question categories and subcategories.
 * This is the SINGLE source of truth for both admin and student views.
 * Any DB question whose category/subcategory doesn't match will be
 * mapped here via the alias maps below.
 */

// ── Canonical categories (same as client/src/constants/Categories.jsx) ──
const CATEGORIES = {
  "Adult Health": [
    "Acid Base Balance",
    "Audio/Visual",
    "Cardiovascular System",
    "Electrolyte Imbalance",
    "Endocrine",
    "Gastrointestinal",
    "Genitourinary",
    "Hematological",
    "Immunology",
    "Musculoskeletal",
    "Neurological",
    "Oncology",
    "Prioritization",
    "Reproductive Health",
    "Respiratory",
    "Skills and Procedures",
    "Substance Abuse"
  ],

  "Child Health": [
    "Acid Base Balance",
    "Audio/Visual",
    "Cardiovascular System",
    "Drug Administration",
    "Endocrine",
    "Fluid and Electrolyte Imbalance",
    "Gastrointestinal",
    "Genitourinary",
    "Growth and Development",
    "Hematological",
    "Immunization",
    "Immunology",
    "Infection Control",
    "Infectious Disease",
    "Integumentary",
    "Multisystem",
    "Musculoskeletal",
    "Neurological",
    "Nutrition",
    "Oncology",
    "Prioritization",
    "Respiratory",
    "Safety",
    "Skills and Procedures"
  ],

  "Critical Care": [
    "Critical Care",
    "Prioritization"
  ],

  "Fundamentals": [
    "Basic Care and Comfort",
    "Drug Administration",
    "Ethical/Legal",
    "Fluid and Electrolyte Imbalance",
    "Infection Control",
    "Infection Prevention",
    "Nutrition",
    "Prioritization",
    "Safety",
    "Skills and Procedures"
  ],

  "Leadership & Management": [
    "Delegation",
    "Management of Care",
    "Prioritization"
  ],

  "Maternal & Newborn Health": [
    "Antepartum",
    "Intrapartum",
    "Maternal Newborn",
    "Postpartum",
    "Prioritization",
    "Reproductive Health"
  ],

  "Mental Health": [
    "Anxiety Disorders",
    "Cognitive Disorders",
    "Coping Mechanisms",
    "Defence Mechanism",
    "Eating Disorder",
    "Ethical/Legal",
    "Grief",
    "Mood Disorders",
    "Neurodevelopmental Disorder",
    "Personality Disorder",
    "Prioritization",
    "Psychiatric Medications",
    "Psychotic Disorders",
    "Skills and Procedures",
    "Sleep Disorders",
    "Substance Abuse",
    "Therapeutic Communication"
  ],

  "Pharmacology": [
    "Anxiety Disorders",
    "Audio/Visual",
    "Cardiovascular System",
    "Cognitive Disorders",
    "Coping Mechanisms",
    "Defence Mechanism",
    "Drug Administration",
    "Eating Disorder",
    "Endocrine",
    "Ethical/Legal",
    "Gastrointestinal",
    "Genitourinary",
    "Grief",
    "Hematological",
    "Herbal Remedies",
    "Immunology",
    "Multisystem",
    "Mood Disorders",
    "Musculoskeletal",
    "Neurodevelopmental Disorder",
    "Neurological",
    "Nutrition",
    "Personality Disorder",
    "Prioritization",
    "Psychiatric Medications",
    "Psychotic Disorders",
    "Respiratory",
    "Safety",
    "Skills and Procedures",
    "Sleep Disorders",
    "Substance Abuse",
    "Therapeutic Communication",
    "Visual"
  ]
};

// ── Category alias map ──────────────────────────────────────────
// Maps DB category names that differ from the canonical CATEGORIES keys.
// Add entries here whenever the admin uploads questions with non-standard
// category names.
const CATEGORY_ALIASES = {
  "Management of Care": "Leadership & Management",
  "Case Studies": "Adult Health",
  "Adult": "Adult Health",
  "Child": "Child Health",
  "Mental": "Mental Health",
  "Pharm": "Pharmacology",
  "Pharma": "Pharmacology",
  "Maternal": "Maternal & Newborn Health",
  "Newborn": "Maternal & Newborn Health",
  "OB": "Maternal & Newborn Health",
  "OB/Maternal": "Maternal & Newborn Health",
  "Leadership": "Leadership & Management",
  "Fundamental": "Fundamentals",
  "Critical": "Critical Care",
};

// ── Subcategory alias map ───────────────────────────────────────
// Maps DB subcategory names to canonical names within their category.
// These are checked after the category is matched.
const SUBCATEGORY_ALIASES = {
  // Adult Health subcategory aliases
  "Cardiovascular": "Cardiovascular System",
  "Cardiovascular system": "Cardiovascular System",
  "CV": "Cardiovascular System",
  "Acid-Base Balance": "Acid Base Balance",
  "Acid base": "Acid Base Balance",
  "ABG": "Acid Base Balance",
  "GI": "Gastrointestinal",
  "GU": "Genitourinary",
  "Audio Visual": "Audio/Visual",
  "Audiovisual": "Audio/Visual",
  "Visual": "Audio/Visual",
  "Central line": "Skills and Procedures",
  "Postoperative care": "Skills and Procedures",
  "Postoperative complications": "Skills and Procedures",
  "Post-Op": "Skills and Procedures",

  // Fundamentals subcategory aliases
  "Basic Care": "Basic Care and Comfort",
  "Comfort": "Basic Care and Comfort",
  "Fluid and Electrolytes": "Fluid and Electrolyte Imbalance",
  "Fluids and Electrolytes": "Fluid and Electrolyte Imbalance",
  "F&E": "Fluid and Electrolyte Imbalance",
  "Infection Prevention and Control": "Infection Control",
  "Infection Control/Prevention": "Infection Control",

  // Leadership & Management subcategory aliases
  "Delegation & Assignment": "Delegation",
  "Assignments": "Delegation",

  // Maternal subcategory aliases
  "Antepartum/Intrapartum": "Antepartum",
  "Labor and Delivery": "Intrapartum",
  "L&D": "Intrapartum",
  "Post-partum": "Postpartum",

  // Mental Health subcategory aliases
  "Defense Mechanism": "Defence Mechanism",
  "Defense mechanism": "Defence Mechanism",
  "Therapeutic Comm": "Therapeutic Communication",
  "Psych Meds": "Psychiatric Medications",

  // Child Health subcategory aliases
  "Growth & Development": "Growth and Development",
  "Growth": "Growth and Development",
  "Development": "Growth and Development",
  "Fluids & Electrolytes": "Fluid and Electrolyte Imbalance",
};

// ── Helper: normalize a string for fuzzy comparison ─────────────
const normalize = (str) => {
  if (!str) return '';
  return String(str).trim().toLowerCase()
    .replace(/[''\u2019\u2018]/g, '')
    .replace(/&/g, 'and')
    .replace(/[\/(),.\-]/g, ' ')
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
 * Returns the canonical category name, or the original if no match found.
 */
function matchCategory(dbCategory) {
  if (!dbCategory) return 'Uncategorized';
  const raw = String(dbCategory).trim();

  // 1. Exact match (case-insensitive)
  const lowerRaw = raw.toLowerCase();
  for (const [canonical, lookup] of Object.entries(categoryLookup)) {
    if (lookup === lowerRaw) {
      // Find the original canonical key (preserving original case)
      return Object.keys(categoryLookup).find(k => categoryLookup[k] === lookup) || raw;
    }
  }
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

  // 4. Starts-with match (e.g., "Management of Care" starts matching "management of care")
  for (const [normCat, canonical] of Object.entries(categoryLookup)) {
    if (normCat.startsWith(normRaw) || normRaw.startsWith(normCat)) {
      return canonical;
    }
  }

  // 5. Contains-word match
  for (const canonical of Object.keys(CATEGORIES)) {
    const normCanonical = normalize(canonical);
    const rawWords = normRaw.split(' ');
    const matchCount = rawWords.filter(w => w.length > 2 && normCanonical.includes(w)).length;
    if (matchCount >= 2) return canonical;
  }

  // No match — return original (will show as its own category)
  return raw;
}

/**
 * Match a raw DB subcategory name to its canonical subcategory
 * within a given canonical category.
 * Returns the canonical subcategory name, or the original if no match found.
 */
function matchSubcategory(canonicalCategory, dbSubcategory) {
  if (!dbSubcategory) return 'Uncategorized';
  const raw = String(dbSubcategory).trim();
  const subs = CATEGORIES[canonicalCategory];
  if (!subs) return raw; // Category not in our list, return sub as-is

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

  // No match — return original (will show as its own subcategory under this category)
  return raw;
}

/**
 * Get the canonical categories with their subcategories,
 * plus any extra subcategories found in DB data that aren't in the canonical list.
 * Returns { [canonicalCategory]: [...subs] }
 */
function getCategoriesWithExtras(dbExtraSubs = {}) {
  const result = {};
  Object.entries(CATEGORIES).forEach(([cat, subs]) => {
    result[cat] = [...subs];
    // Add any extra DB subcategories that were mapped to this category
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
  matchCategory,
  matchSubcategory,
  getCategoriesWithExtras,
  normalize
};
