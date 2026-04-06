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
    "Acid-Base Imbalances",
    "Acute Coronary Syndrome",
    "Acute Kidney Injury (AKI)",
    "Acute Respiratory Distress Syndrome (ARDS)",
    "Addison's Disease",
    "Anemia",
    "Aortic Aneurysm",
    "Asthma",
    "Burns",
    "Cancer (General Oncology)",
    "Cerebrovascular Accident (Stroke)",
    "Chronic Kidney Disease (CKD)",
    "Chronic Obstructive Pulmonary Disease (COPD)",
    "Cirrhosis",
    "Congestive Heart Failure (CHF)",
    "Coronary Artery Disease (CAD)",
    "Cushing's Syndrome",
    "Deep Vein Thrombosis (DVT)",
    "Dementia",
    "Diabetes Mellitus",
    "Diabetic Ketoacidosis (DKA)",
    "Dialysis",
    "Dysrhythmias",
    "Esophageal Varices",
    "Fluid Imbalance",
    "Fractures",
    "Guillain-Barre Syndrome",
    "Head Injury",
    "Heart Failure",
    "Hepatitis",
    "Hyperkalemia",
    "Hyperthyroidism",
    "Hypokalemia",
    "Hypothyroidism",
    "Liver Failure",
    "Myasthenia Gravis",
    "Myocardial Infarction (MI)",
    "Oxygen Therapy",
    "Pancreatitis",
    "Parkinson's Disease",
    "Peptic Ulcer Disease (PUD)",
    "Peripheral Arterial Disease (PAD)",
    "Pneumonia",
    "Pneumothorax",
    "Pulmonary Embolism (PE)",
    "Renal Failure",
    "Respiratory Failure",
    "Sepsis",
    "Shock",
    "Sickle Cell Disease",
    "Spinal Cord Injury",
    "Tracheostomy Care",
    "Tuberculosis (TB)",
    "Urinary Tract Infection (UTI)",
    "Wound Care"
  ],

  "Critical Care": [
    "Acute Coronary Syndrome",
    "Acute Kidney Injury",
    "Acute Respiratory Distress Syndrome (ARDS)",
    "Airway Management",
    "Arterial Blood Gas (ABG) Interpretation",
    "Arterial Lines",
    "Cardiac Arrest",
    "Cardiac Monitoring",
    "Cardiogenic Shock",
    "Central Venous Access",
    "Central Venous Pressure (CVP) Monitoring",
    "Defibrillation",
    "Endotracheal Intubation",
    "Hemodynamic Monitoring",
    "Hemorrhagic Shock",
    "Hypovolemic Shock",
    "Intra-Aortic Balloon Pump (IABP)",
    "Intracranial Pressure (ICP) Monitoring",
    "Mechanical Ventilation",
    "Multiple Organ Dysfunction Syndrome (MODS)",
    "Neurological Emergencies",
    "Non-Invasive Ventilation (BiPAP/CPAP)",
    "Post-Cardiac Arrest Care",
    "Pulmonary Artery Catheter",
    "Sedation Management",
    "Sepsis Management",
    "Septic Shock",
    "Shock Management",
    "Vasopressors",
    "Ventilator Weaning"
  ],

  "Dosage Calculations": [
    "Dimensional Analysis",
    "Drug Concentration Calculations",
    "Drug Reconstitution",
    "Flow Rate Calculations",
    "Heparin Drip Calculations",
    "Insulin Dose Calculations",
    "IV Bolus Calculations",
    "IV Infusion Calculations",
    "Loading Dose Calculations",
    "Maintenance Dose Calculations",
    "Milliequivalent (mEq) Calculations",
    "Pediatric Dosage Calculations",
    "Percentage and Ratio Calculations",
    "Unit Conversion",
    "Weight-Based Dosing"
  ],

  "EKG/Cardiac Monitoring": [
    "12-Lead ECG Interpretation",
    "Atrial Fibrillation",
    "Atrial Flutter",
    "AV Block (First Degree)",
    "AV Block (Second Degree - Type I)",
    "AV Block (Second Degree - Type II)",
    "AV Block (Third Degree)",
    "Heart Blocks",
    "Junctional Rhythms",
    "Myocardial Infarction Patterns",
    "Normal Sinus Rhythm",
    "PACs (Premature Atrial Contractions)",
    "PVCs (Premature Ventricular Contractions)",
    "ST Elevation (STEMI)",
    "Sinus Bradycardia",
    "Sinus Tachycardia",
    "Supraventricular Tachycardia (SVT)",
    "Torsades de Pointes",
    "Ventricular Fibrillation",
    "Ventricular Tachycardia"
  ],

  "Emergency Nursing": [
    "Abdominal Emergencies",
    "Allergic Reactions and Anaphylaxis",
    "Altered Mental Status",
    "Anaphylactic Shock",
    "Asthma Exacerbation",
    "Burn Emergencies",
    "Cardiac Arrest",
    "Cardiac Emergencies",
    "Carbon Monoxide Poisoning",
    "Chest Trauma",
    "Concussion",
    "Drug Overdose",
    "Fractures and Dislocations",
    "Head Trauma",
    "Heat Emergencies (Heat Stroke/Exhaustion)",
    "Hemorrhage Control",
    "Hypertensive Emergency",
    "Intubation and Airway Management",
    "Neurological Emergencies",
    "Obstetric Emergencies",
    "Penetrating Trauma",
    "Poisoning",
    "Psychiatric Emergencies",
    "Pulmonary Embolism",
    "Respiratory Emergencies",
    "Sepsis",
    "Spinal Cord Injury",
    "Stroke Assessment",
    "Triage",
    "Wound Management"
  ],

  "Fundamentals": [
    "Activity and Immobility",
    "Admission Assessment",
    "Asepsis and Infection Control",
    "Assessment Techniques",
    "Body Mechanics",
    "Bowel Elimination",
    "Communication",
    "Death and Dying",
    "Delegation to UAP",
    "Documentation",
    "Fall Prevention",
    "Foley Catheter Insertion",
    "Health Assessment",
    "Infection Control",
    "Informed Consent",
    "Injections (IM, SC, ID)",
    "Intravenous Fluid Therapy",
    "Isolation Precautions",
    "Maslow's Hierarchy of Needs",
    "Medication Administration",
    "Nurse-Patient Relationship",
    "Nutrition",
    "Oxygen Administration",
    "Pain Assessment",
    "Pain Management",
    "Patient Education",
    "Patient Identification",
    "Patient Rights",
    "Patient Safety Goals",
    "Personal Protective Equipment (PPE)",
    "Range of Motion Exercises",
    "Restraints",
    "Safety",
    "Specimen Collection",
    "Standard Precautions",
    "Surgical Asepsis",
    "Temperature Assessment",
    "Therapeutic Communication",
    "Vital Signs",
    "Wound Care"
  ],

  "Health Promotion & Maintenance": [
    "Aging Process",
    "Antepartum Care",
    "Cancer Screening",
    "Contraception",
    "Developmental Milestones",
    "Developmental Stages",
    "Diet and Exercise",
    "Disease Prevention",
    "Family Planning",
    "Growth Charts",
    "Health Promotion",
    "Immunization Schedules",
    "Immunizations",
    "Intrapartum Care",
    "Newborn Screening",
    "Nutritional Guidelines",
    "Pediatric Growth and Development",
    "Postpartum Care",
    "Pregnancy Nutrition",
    "Prenatal Care",
    "Preventive Care",
    "Reproductive Health",
    "Risk Factor Identification",
    "Self-Breast Examination",
    "Sexual Health",
    "Smoking Cessation",
    "Stress Management",
    "Testicular Self-Examination",
    "Well-Baby Visits",
    "Wellness Exams"
  ],

  "Lab Values & Diagnostics": [
    "ABG Interpretation",
    "Albumin",
    "Alkaline Phosphatase (ALP)",
    "Aspartate Aminotransferase (AST)",
    "Bilirubin",
    "Blood Culture",
    "Blood Glucose",
    "Blood Urea Nitrogen (BUN)",
    "Brain Natriuretic Peptide (BNP)",
    "Calcium",
    "Chloride",
    "Cholesterol",
    "Coagulation Studies (PT/INR/PTT)",
    "Complete Blood Count (CBC)",
    "Computed Tomography (CT)",
    "Creatine Kinase (CK)",
    "Creatinine",
    "Culture and Sensitivity",
    "D-Dimer",
    "Electrocardiogram (ECG)",
    "Electrolyte Panel",
    "Glycosylated Hemoglobin (HbA1c)",
    "Human Chorionic Gonadotropin (hCG)",
    "Lactate",
    "Lipase",
    "Lipid Panel",
    "Liver Function Tests (LFTs)",
    "Lumbar Puncture",
    "Magnetic Resonance Imaging (MRI)",
    "Mean Corpuscular Volume (MCV)",
    "Metabolic Panel",
    "Oxygen Saturation (SpO2)",
    "Potassium",
    "Prostate-Specific Antigen (PSA)",
    "Renal Function Panel",
    "Sodium",
    "Thyroid Function Tests (TSH, T3, T4)",
    "Toxicology Screen",
    "Troponin",
    "Tumor Markers",
    "Ultrasound",
    "Urinalysis",
    "Urine Culture",
    "White Blood Cell Count",
    "X-Ray Interpretation"
  ],

  "Leadership & Management": [
    "Change Management",
    "Conflict Resolution",
    "Delegation",
    "Ethical Decision Making",
    "Evidence-Based Practice",
    "Informed Consent",
    "Interdisciplinary Collaboration",
    "Legal Responsibilities",
    "Malpractice and Liability",
    "Management of Care",
    "Nurse Staffing",
    "Patient Advocacy",
    "Patient Rights",
    "Performance Improvement",
    "Quality Improvement",
    "Resource Management",
    "Risk Management",
    "Root Cause Analysis",
    "Scope of Practice",
    "Staff Development",
    "Standards of Practice",
    "Supervision",
    "Team Building",
    "Time Management",
    "Tort Law"
  ],

  "Maternal & Newborn Nursing": [
    "Antepartum Assessment",
    "Antepartum Bleeding",
    "Breastfeeding",
    "Cesarean Section (C-Section)",
    "Ectopic Pregnancy",
    "Electronic Fetal Monitoring",
    "Gestational Diabetes",
    "Gestational Hypertension",
    "Group B Streptococcus",
    "Hyperemesis Gravidarum",
    "Induction of Labor",
    "Intrapartum Care",
    "Intrapartum Complications",
    "Lochia Assessment",
    "Neonatal Resuscitation (NRP)",
    "Newborn Assessment (APGAR)",
    "Newborn Care",
    "Newborn Jaundice",
    "Non-Stress Test (NST)",
    "Obstetric Pain Management",
    "Placenta Previa",
    "Placental Abruption",
    "Postpartum Assessment",
    "Postpartum Complications",
    "Postpartum Depression",
    "Postpartum Hemorrhage",
    "Preeclampsia",
    "Premature Rupture of Membranes (PROM)",
    "Prenatal Care",
    "Preterm Labor",
    "Rh Incompatibility",
    "Rho(D) Immune Globulin",
    "Spontaneous Abortion (Miscarriage)",
    "TORCH Infections",
    "VBAC (Vaginal Birth After Cesarean)"
  ],

  "Mental Health": [
    "Alcohol Withdrawal",
    "Alzheimer's Disease",
    "Anxiety Disorders",
    "Attention Deficit Hyperactivity Disorder (ADHD)",
    "Autism Spectrum Disorder",
    "Bipolar Disorder",
    "Borderline Personality Disorder",
    "Child Abuse",
    "Cognitive Behavioral Therapy",
    "Crisis Intervention",
    "Defense Mechanisms",
    "Delirium",
    "Dementia",
    "Depression",
    "Domestic Violence",
    "Eating Disorders",
    "Elder Abuse",
    "Elevated Suicide Risk",
    "Grief and Loss",
    "Legal Issues in Mental Health",
    "Lithium Therapy",
    "Major Depressive Disorder",
    "Mania",
    "Mental Health Assessment",
    "Neuroleptic Malignant Syndrome",
    "Obsessive-Compulsive Disorder (OCD)",
    "Panic Disorder",
    "Personality Disorders",
    "Pharmacotherapy",
    "Post-Traumatic Stress Disorder (PTSD)",
    "Psychiatric Emergencies",
    "Psychiatric Medications",
    "Psychosis",
    "Schizophrenia",
    "Selective Serotonin Reuptake Inhibitors (SSRIs)",
    "Self-Harm",
    "Serotonin Syndrome",
    "Sexual Abuse",
    "Substance Abuse",
    "Suicide Assessment",
    "Suicide Prevention",
    "Therapeutic Communication",
    "Therapeutic Environment",
    "Tricyclic Antidepressants (TCAs)",
    "Violence Risk Assessment"
  ],

  "NGN Case Studies": [
    "Bow-Tie Questions",
    "Cloze (Drop-Down) Items",
    "Clustered Items",
    "Comprehensive Case Studies",
    "Drag and Drop Questions",
    "Enhanced Multiple Choice",
    "Extended Multiple Response",
    "Fill-in-the-Blank Questions",
    "Highlight Text Questions",
    "Hotspot Questions",
    "Matching Questions",
    "Multiple Response (SATA) Questions",
    "NGN Question Types",
    "NGN Scoring Methods",
    "Next Generation NCLEX Format",
    "Ordered Response Questions",
    "Partial Credit Scoring",
    "Trend Questions"
  ],

  "Pediatrics": [
    "ADHD Management",
    "Autism Spectrum Disorder",
    "Child Abuse and Neglect",
    "Child Development (Preschool)",
    "Child Development (Toddler)",
    "Congenital Heart Defects",
    "Croup (Laryngotracheobronchitis)",
    "Cystic Fibrosis",
    "Down Syndrome",
    "Failure to Thrive",
    "Hydrocephalus",
    "Immunization Schedule",
    "Intussusception",
    "Iron-Deficiency Anemia",
    "Kawasaki Disease",
    "Lead Poisoning",
    "Meningitis (Pediatric)",
    "Neonatal Care",
    "Neonatal Jaundice",
    "Nursemaid's Elbow",
    "Oral Rehydration Therapy",
    "Otitis Media",
    "Pain Assessment in Children",
    "Pediatric Asthma",
    "Pediatric Cancers (Leukemia)",
    "Pediatric Dehydration",
    "Pediatric Diabetes",
    "Pediatric Fractures",
    "Pediatric Seizures",
    "Phenylketonuria (PKU)",
    "Pyloric Stenosis",
    "Respiratory Syncytial Virus (RSV)",
    "Sickle Cell Disease (Pediatric)",
    "Sudden Infant Death Syndrome (SIDS)",
    "Wilms Tumor"
  ],

  "Pharmacology": [
    "ACE Inhibitors",
    "Acetaminophen",
    "Albuterol",
    "Aminoglycosides",
    "Analgesics",
    "Angiotensin II Receptor Blockers (ARBs)",
    "Antacids",
    "Antiarrhythmics",
    "Antibiotics",
    "Anticoagulants",
    "Anticonvulsants",
    "Antidepressants (SSRIs, SNRIs, TCAs)",
    "Antidiabetic Agents",
    "Antiemetics",
    "Antihypertensives",
    "Anti-Inflammatory Agents",
    "Antilipemics (Statins)",
    "Antineoplastics",
    "Antipsychotics",
    "Beta Blockers",
    "Benzodiazepines",
    "Bronchodilators",
    "Calcium Channel Blockers",
    "Cephalosporins",
    "Corticosteroids",
    "Coumadin (Warfarin)",
    "Diuretics",
    "Drug Interactions",
    "Drug Metabolism",
    "Fibrinolytics (Thrombolytics)",
    "Gastrointestinal Medications",
    "H2 Receptor Blockers",
    "Heparin",
    "Hypoglycemic Agents",
    "Insulin",
    "Lithium",
    "Macrolides",
    "Methotrexate",
    "Monoamine Oxidase Inhibitors (MAOIs)",
    "Morphine and Opioids",
    "Nitrates",
    "NSAIDs",
    "Opioid Antagonists",
    "Oral Contraceptives",
    "Oxytocin",
    "Penicillins",
    "Pharmacokinetics",
    "Platelet Aggregation Inhibitors",
    "Proton Pump Inhibitors (PPIs)",
    "Psychotropic Medications",
    "Sedative-Hypnotics",
    "Sulfonylureas",
    "Thyroid Medications",
    "Vaccines",
    "Vasodilators"
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
