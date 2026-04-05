/**
 * Migration Script: Remap existing question categories/subcategories
 * to match the new CATEGORIES.jsx structure.
 *
 * Usage:
 *   cd server
 *   node migrate-categories.js
 *
 * Safe mode (dry-run, no changes):
 *   node migrate-categories.js --dry-run
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('./models/Question');

// ── New categories from Categories.jsx ──────────────────────────────
const NEW_CATEGORIES = {
  "Adult Health": [
    "Acid Base Balance", "Audio/Visual", "Cardiovascular System",
    "Electrolyte Imbalance", "Endocrine", "Gastrointestinal",
    "Genitourinary", "Hematological", "Immunology", "Musculoskeletal",
    "Neurological", "Oncology", "Prioritization", "Reproductive Health",
    "Respiratory", "Skills and Procedures", "Substance Abuse"
  ],
  "Child Health": [
    "Acid Base Balance", "Audio/Visual", "Cardiovascular System",
    "Drug Administration", "Endocrine", "Fluid and Electrolyte Imbalance",
    "Gastrointestinal", "Genitourinary", "Growth and Development",
    "Hematological", "Immunization", "Immunology", "Infection Control",
    "Infectious Disease", "Integumentary", "Multisystem",
    "Musculoskeletal", "Neurological", "Nutrition", "Oncology",
    "Prioritization", "Respiratory", "Safety", "Skills and Procedures"
  ],
  "Critical Care": [
    "Critical Care", "Prioritization"
  ],
  "Fundamentals": [
    "Basic Care and Comfort", "Drug Administration", "Ethical/Legal",
    "Fluid and Electrolyte Imbalance", "Infection Control",
    "Infection Prevention", "Nutrition", "Prioritization",
    "Safety", "Skills and Procedures"
  ],
  "Leadership & Management": [
    "Delegation", "Management of Care", "Prioritization"
  ],
  "Maternal & Newborn Health": [
    "Antepartum", "Intrapartum", "Maternal Newborn", "Postpartum",
    "Prioritization", "Reproductive Health"
  ],
  "Mental Health": [
    "Anxiety Disorders", "Cognitive Disorders", "Coping Mechanisms",
    "Defence Mechanism", "Eating Disorder", "Ethical/Legal", "Grief",
    "Mood Disorders", "Neurodevelopmental Disorder", "Personality Disorder",
    "Prioritization", "Psychiatric Medications", "Psychotic Disorders",
    "Skills and Procedures", "Sleep Disorders", "Substance Abuse",
    "Therapeutic Communication"
  ],
  "Pharmacology": [
    "Anxiety Disorders", "Audio/Visual", "Cardiovascular System",
    "Cognitive Disorders", "Coping Mechanisms", "Defence Mechanism",
    "Drug Administration", "Eating Disorder", "Endocrine", "Ethical/Legal",
    "Gastrointestinal", "Genitourinary", "Grief", "Hematological",
    "Herbal Remedies", "Immunology", "Multisystem", "Mood Disorders",
    "Musculoskeletal", "Neurodevelopmental Disorder", "Neurological",
    "Nutrition", "Personality Disorder", "Prioritization",
    "Psychiatric Medications", "Psychotic Disorders", "Respiratory",
    "Safety", "Skills and Procedures", "Sleep Disorders", "Substance Abuse",
    "Therapeutic Communication", "Visual"
  ]
};

// Build lookup sets for fast matching
const ALL_CATEGORIES = Object.keys(NEW_CATEGORIES);
const SUBCATEGORIES_BY_CATEGORY = NEW_CATEGORIES;

// Normalize a string for comparison
const normalize = (str) => String(str || '')
  .trim()
  .toLowerCase()
  .replace(/['']/g, '')
  .replace(/\s+/g, ' ')
  .replace(/[(),.-]/g, ' ')
  .replace(/\band\b/g, '&')
  .replace(/\s*&\s*/g, '&')
  .replace(/\s*\/\s*/g, '/')
  .trim();

// ── Fuzzy matching ───────────────────────────────────────────────────
const findBestCategory = (dbCategory) => {
  const norm = normalize(dbCategory);
  if (!norm) return null;

  // Exact match (after normalization)
  for (const cat of ALL_CATEGORIES) {
    if (normalize(cat) === norm) return cat;
  }

  // Prefix match (either direction)
  for (const cat of ALL_CATEGORIES) {
    const catNorm = normalize(cat);
    if (catNorm.startsWith(norm) || norm.startsWith(catNorm)) return cat;
  }

  // Word overlap — at least one key word matches
  const dbWords = norm.split(/\s+/);
  for (const cat of ALL_CATEGORIES) {
    const catWords = normalize(cat).split(/\s+/);
    const overlap = dbWords.filter(w => catWords.some(cw => cw === w || cw.startsWith(w) || w.startsWith(cw)));
    if (overlap.length >= 1 && overlap.length >= Math.max(1, Math.floor(dbWords.length * 0.5))) {
      return cat;
    }
  }

  return null;
};

const findBestSubcategory = (dbSubcategory, targetCategory) => {
  const norm = normalize(dbSubcategory);
  if (!norm) return null;

  const validSubs = SUBCATEGORIES_BY_CATEGORY[targetCategory] || [];

  // Exact match
  for (const sub of validSubs) {
    if (normalize(sub) === norm) return sub;
  }

  // Prefix match
  for (const sub of validSubs) {
    const subNorm = normalize(sub);
    if (subNorm.startsWith(norm) || norm.startsWith(subNorm)) return sub;
  }

  // Word overlap
  const dbWords = norm.split(/\s+/);
  for (const sub of validSubs) {
    const subWords = normalize(sub).split(/\s+/);
    const overlap = dbWords.filter(w => subWords.some(sw => sw === w || sw.startsWith(w) || w.startsWith(sw)));
    if (overlap.length >= 1 && overlap.length >= Math.max(1, Math.floor(dbWords.length * 0.5))) {
      return sub;
    }
  }

  // If no match found in target category, search all categories
  if (targetCategory) {
    for (const [cat, subs] of Object.entries(SUBCATEGORIES_BY_CATEGORY)) {
      if (cat === targetCategory) continue;
      for (const sub of subs) {
        if (normalize(sub) === norm) return sub;
      }
    }
  }

  return null;
};

// ── Main migration ───────────────────────────────────────────────────
async function migrate() {
  const dryRun = process.argv.includes('--dry-run');

  console.log('═══════════════════════════════════════════════');
  console.log('  NCLEX Category Migration Script');
  console.log(`  Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will update DB)'}`);
  console.log('═══════════════════════════════════════════════\n');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  // Step 1: Get all distinct category/subcategory pairs from DB
  const distinctPairs = await Question.aggregate([
    { $group: { _id: { category: '$category', subcategory: '$subcategory' }, count: { $sum: 1 } } },
    { $sort: { '_id.category': 1, '_id.subcategory': 1 } }
  ]);

  console.log(`📊 Found ${distinctPairs.length} distinct category/subcategory pairs in DB:\n`);

  // Build mapping
  const mapping = [];
  const unmapped = [];

  for (const pair of distinctPairs) {
    const dbCat = pair._id.category;
    const dbSub = pair._id.subcategory;
    const count = pair.count;

    const newCat = findBestCategory(dbCat);

    if (!newCat) {
      unmapped.push({ dbCat, dbSub, count, reason: 'No category match' });
      continue;
    }

    const newSub = findBestSubcategory(dbSub, newCat);

    if (!newSub) {
      unmapped.push({ dbCat, dbSub, count, newCat, reason: 'No subcategory match' });
      continue;
    }

    const categoryChanged = newCat !== dbCat;
    const subcategoryChanged = newSub !== dbSub;

    mapping.push({
      dbCat,
      dbSub,
      newCat,
      newSub,
      count,
      categoryChanged,
      subcategoryChanged,
      changed: categoryChanged || subcategoryChanged
    });
  }

  // Print results
  console.log('── CATEGORY MAPPINGS ──\n');
  const changedMappings = mapping.filter(m => m.changed);
  const unchangedMappings = mapping.filter(m => !m.changed);

  if (changedMappings.length > 0) {
    console.log(`✏️  Will UPDATE ${changedMappings.reduce((s, m) => s + m.count, 0)} questions (${changedMappings.length} pairs):\n`);
    for (const m of changedMappings) {
      const catStr = m.categoryChanged ? `"${m.dbCat}" → "${m.newCat}"` : `"${m.newCat}" (no change)`;
      const subStr = m.subcategoryChanged ? `"${m.dbSub}" → "${m.newSub}"` : `"${m.newSub}" (no change)`;
      console.log(`  [${m.count}Q] Category: ${catStr}`);
      console.log(`          Sub:      ${subStr}`);
      console.log();
    }
  }

  if (unchangedMappings.length > 0) {
    console.log(`✅ Already correct: ${unchangedMappings.reduce((s, m) => s + m.count, 0)} questions (${unchangedMappings.length} pairs)\n`);
  }

  if (unmapped.length > 0) {
    console.log(`⚠️  UNMAPPED (${unmapped.reduce((s, m) => s + m.count, 0)} questions, ${unmapped.length} pairs):\n`);
    for (const u of unmapped) {
      console.log(`  [${u.count}Q] Category: "${u.dbCat}" → ${u.newCat || 'NO MATCH'}`);
      console.log(`          Sub:      "${u.dbSub}" → NO MATCH (${u.reason})`);
      console.log();
    }
  }

  // Summary
  console.log('═══════════════════════════════════════════════');
  console.log(`  Total pairs:  ${distinctPairs.length}`);
  console.log(`  To update:    ${changedMappings.length} pairs (${changedMappings.reduce((s, m) => s + m.count, 0)} questions)`);
  console.log(`  Unchanged:    ${unchangedMappings.length} pairs (${unchangedMappings.reduce((s, m) => s + m.count, 0)} questions)`);
  console.log(`  Unmapped:     ${unmapped.length} pairs (${unmapped.reduce((s, m) => s + m.count, 0)} questions)`);
  console.log('═══════════════════════════════════════════════\n');

  // Execute
  if (dryRun) {
    console.log('🔍 DRY RUN COMPLETE — No changes were made to the database.');
    console.log('   Run without --dry-run to apply changes.\n');
  } else {
    if (changedMappings.length === 0) {
      console.log('✅ Nothing to update. All categories already match.\n');
    } else {
      console.log('🔄 Applying updates...\n');

      for (const m of changedMappings) {
        const result = await Question.updateMany(
          { category: m.dbCat, subcategory: m.dbSub },
          { $set: { category: m.newCat, subcategory: m.newSub } }
        );
        console.log(`  ✅ Updated ${result.modifiedCount} questions: "${m.dbCat}/${m.dbSub}" → "${m.newCat}/${m.newSub}"`);
      }

      console.log(`\n🎉 Migration complete! Updated ${changedMappings.reduce((s, m) => s + m.count, 0)} questions.`);
    }
  }

  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
