// NCLEX Client Needs Framework
// Includes NCSBN Clinical Judgment Measurement Model (CJMM) categories
// Used for both student test creation and admin question categorization

// The 16 NCLEX Client Needs Categories used for test creation
// These are the primary categories students select when creating tests
export const NCLEX_CLIENT_NEEDS_CATEGORIES = [
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

// Main categories structure with subcategories
export const CLIENT_NEEDS = {
  "Analyze Cues": [
    "Data Collection",
    "Assessment Findings",
    "Laboratory and Diagnostic Results",
    "Client History",
    "Physical Examination",
    "Vital Signs Interpretation"
  ],

  "Basic Care and Comfort": [
    "Alternative and Complementary Therapies",
    "Assistive Devices",
    "Elimination",
    "Mobility/Immobility",
    "Non-Pharmacological Comfort Interventions",
    "Nutrition and Oral Hydration",
    "Palliative Care",
    "Personal Hygiene",
    "Rest and Sleep"
  ],

  "Clinical Judgment": [
    "Clinical Decision Making",
    "Cognitive Processing",
    "Critical Thinking",
    "Nursing Knowledge Application",
    "Pattern Recognition",
    "Prioritization",
    "Problem Solving"
  ],

  "Coordinated Care": [
    "Advance Directives",
    "Advocacy",
    "Care Coordination",
    "Collaboration with Interdisciplinary Team",
    "Continuity of Care",
    "Delegation",
    "Discharge Planning",
    "Ethical Practice",
    "Informed Consent",
    "Legal Rights and Responsibilities",
    "Referrals",
    "Resource Management",
    "Staff Education",
    "Supervision"
  ],

  "Evaluate Outcomes": [
    "Evaluating Effectiveness of Interventions",
    "Comparing Outcomes with Expected Results",
    "Reassessing Client Condition",
    "Modifying the Plan of Care",
    "Documenting Client Responses",
    "Identifying Unmet Outcomes"
  ],

  "Health Promotion and Maintenance": [
    "Aging Process",
    "Ante/Intra/Postpartum and Newborn Care",
    "Developmental Stages and Transitions",
    "Health Promotion/Disease Prevention",
    "Health Screening",
    "High Risk Behaviors",
    "Immunizations",
    "Lifestyle Choices",
    "Physical Assessment Techniques",
    "Self-Care"
  ],

  "Management of Care": [
    "Case Management",
    "Client Rights",
    "Concepts of Management",
    "Confidentiality",
    "Consultation",
    "Documentation",
    "Establishing Priorities",
    "Information Technology",
    "Performance Improvement",
    "Quality Improvement",
    "Time Management"
  ],

  "Pharmacological and Parenteral Therapies": [
    "Adverse Effects/Contraindications/Side Effects/Interactions",
    "Blood and Blood Products",
    "Calculation of Dosages",
    "Central Venous Access Devices",
    "Administration",
    "Expected Actions/Outcomes",
    "Medication Administration",
    "Parenteral/Intravenous Therapies",
    "Pharmacological Pain Management",
    "Total Parenteral Nutrition"
  ],

  "Physiological Adaptation": [
    "Alterations in Body Systems",
    "Fluid and Electrolyte Imbalances",
    "Hemodynamics",
    "Illness Management",
    "Medical Emergencies",
    "Pathophysiology",
    "Radiation Therapy",
    "Unexpected Response to Therapies"
  ],

  "Prioritization of Care": [
    "Airway Breathing Circulation",
    "Maslow's Hierarchy of Needs",
    "ABC Priority Framework",
    "Acute vs Chronic Conditions",
    "Unstable vs Stable Clients",
    "Life-Threatening Conditions",
    "Time-Critical Interventions"
  ],

  "Prioritize Hypotheses": [
    "Generating Nursing Diagnoses",
    "Ranking Potential Problems",
    "Identifying Primary vs Secondary Problems",
    "Comparing Competing Hypotheses",
    "Evidence-Based Reasoning",
    "Clinical Significance Assessment",
    "Risk vs Actual Problems"
  ],

  "Psychosocial Integrity": [
    "Abuse/Neglect",
    "Behavioral Interventions",
    "Chemical and Other Dependencies",
    "Coping Mechanisms",
    "Crisis Intervention",
    "Cultural Awareness",
    "End of Life Care",
    "Grief and Loss",
    "Mental Health Concepts",
    "Religious and Spiritual Influences on Health",
    "Sensory/Perceptual Alterations",
    "Situational Role Changes",
    "Stress Management",
    "Support Systems",
    "Therapeutic Communication",
    "Therapeutic Environment"
  ],

  "Recognize Cues": [
    "Identifying Significant Data",
    "Distinguishing Relevant from Irrelevant Cues",
    "Recognizing Patterns in Client Data",
    "Identifying Changes in Client Status",
    "Clustering Related Assessment Findings",
    "Recognizing Complications and Emergencies"
  ],

  "Reduction of Risk Potential": [
    "Changes/Abnormalities in Vital Signs",
    "Diagnostic Tests",
    "Laboratory Values",
    "Potential for Alterations in Body Systems",
    "Potential for Complications of Diagnostic Tests/Treatments/Procedures",
    "Potential for Complications from Surgical Procedures",
    "System Specific Assessments",
    "Therapeutic Procedures"
  ],

  "Safety and Infection Control": [
    "Accident/Error/Injury Prevention",
    "Emergency Response Plan",
    "Ergonomic Principles",
    "Handling Hazardous and Infectious Materials",
    "Home Safety",
    "Medical and Surgical Asepsis",
    "Protective Precautions",
    "Reporting of Incident/Event/Irregular Occurrence",
    "Security Plan",
    "Standard Precautions/Transmission-Based Precautions",
    "Use of Restraints/Safety Devices"
  ],

  "Take Actions": [
    "Implementing Nursing Interventions",
    "Medication Administration Actions",
    "Client Education and Health Teaching",
    "Coordinating Care Activities",
    "Emergency Interventions",
    "Delegating and Supervising Care",
    "Therapeutic Procedures"
  ]
};

// Extended subcategories for more detailed categorization
// Used by admin when uploading questions
export const CLIENT_NEEDS_EXTENDED = {
  "Analyze Cues": [
    "Data Collection",
    "Assessment Findings",
    "Laboratory and Diagnostic Results",
    "Client History",
    "Physical Examination",
    "Vital Signs Interpretation"
  ],

  "Basic Care and Comfort": [
    "Alternative and Complementary Therapies",
    "Assistive Devices",
    "Elimination",
    "Mobility/Immobility",
    "Non-Pharmacological Comfort Interventions",
    "Nutrition and Oral Hydration",
    "Palliative Care",
    "Personal Hygiene",
    "Rest and Sleep"
  ],

  "Clinical Judgment": [
    "Clinical Decision Making",
    "Cognitive Processing",
    "Critical Thinking",
    "Nursing Knowledge Application",
    "Pattern Recognition",
    "Prioritization",
    "Problem Solving"
  ],

  "Coordinated Care": [
    "Advance Directives",
    "Advocacy",
    "Care Coordination",
    "Collaboration with Interdisciplinary Team",
    "Continuity of Care",
    "Delegation",
    "Discharge Planning",
    "Ethical Practice",
    "Informed Consent",
    "Legal Rights and Responsibilities",
    "Referrals",
    "Resource Management",
    "Staff Education",
    "Supervision"
  ],

  "Evaluate Outcomes": [
    "Evaluating Effectiveness of Interventions",
    "Comparing Outcomes with Expected Results",
    "Reassessing Client Condition",
    "Modifying the Plan of Care",
    "Documenting Client Responses",
    "Identifying Unmet Outcomes"
  ],

  "Health Promotion and Maintenance": [
    "Aging Process",
    "Ante/Intra/Postpartum and Newborn Care",
    "Developmental Stages and Transitions",
    "Health Promotion/Disease Prevention",
    "Health Screening",
    "High Risk Behaviors",
    "Immunizations",
    "Lifestyle Choices",
    "Physical Assessment Techniques",
    "Self-Care"
  ],

  "Management of Care": [
    "Case Management",
    "Client Rights",
    "Concepts of Management",
    "Confidentiality",
    "Consultation",
    "Documentation",
    "Establishing Priorities",
    "Information Technology",
    "Performance Improvement",
    "Quality Improvement",
    "Time Management"
  ],

  "Pharmacological and Parenteral Therapies": [
    "Adverse Effects/Contraindications/Side Effects/Interactions",
    "Blood and Blood Products",
    "Calculation of Dosages",
    "Central Venous Access Devices",
    "Administration",
    "Expected Actions/Outcomes",
    "Medication Administration",
    "Parenteral/Intravenous Therapies",
    "Pharmacological Pain Management",
    "Total Parenteral Nutrition"
  ],

  "Physiological Adaptation": [
    "Alterations in Body Systems",
    "Fluid and Electrolyte Imbalances",
    "Hemodynamics",
    "Illness Management",
    "Medical Emergencies",
    "Pathophysiology",
    "Radiation Therapy",
    "Unexpected Response to Therapies"
  ],

  "Prioritization of Care": [
    "Airway Breathing Circulation",
    "Maslow's Hierarchy of Needs",
    "ABC Priority Framework",
    "Acute vs Chronic Conditions",
    "Unstable vs Stable Clients",
    "Life-Threatening Conditions",
    "Time-Critical Interventions"
  ],

  "Prioritize Hypotheses": [
    "Generating Nursing Diagnoses",
    "Ranking Potential Problems",
    "Identifying Primary vs Secondary Problems",
    "Comparing Competing Hypotheses",
    "Evidence-Based Reasoning",
    "Clinical Significance Assessment",
    "Risk vs Actual Problems"
  ],

  "Psychosocial Integrity": [
    "Abuse/Neglect",
    "Behavioral Interventions",
    "Chemical and Other Dependencies",
    "Coping Mechanisms",
    "Crisis Intervention",
    "Cultural Awareness",
    "End of Life Care",
    "Grief and Loss",
    "Mental Health Concepts",
    "Religious and Spiritual Influences on Health",
    "Sensory/Perceptual Alterations",
    "Situational Role Changes",
    "Stress Management",
    "Support Systems",
    "Therapeutic Communication",
    "Therapeutic Environment"
  ],

  "Recognize Cues": [
    "Identifying Significant Data",
    "Distinguishing Relevant from Irrelevant Cues",
    "Recognizing Patterns in Client Data",
    "Identifying Changes in Client Status",
    "Clustering Related Assessment Findings",
    "Recognizing Complications and Emergencies"
  ],

  "Reduction of Risk Potential": [
    "Changes/Abnormalities in Vital Signs",
    "Diagnostic Tests",
    "Laboratory Values",
    "Potential for Alterations in Body Systems",
    "Potential for Complications of Diagnostic Tests/Treatments/Procedures",
    "Potential for Complications from Surgical Procedures",
    "System Specific Assessments",
    "Therapeutic Procedures"
  ],

  "Safety and Infection Control": [
    "Accident/Error/Injury Prevention",
    "Emergency Response Plan",
    "Ergonomic Principles",
    "Handling Hazardous and Infectious Materials",
    "Home Safety",
    "Medical and Surgical Asepsis",
    "Protective Precautions",
    "Reporting of Incident/Event/Irregular Occurrence",
    "Security Plan",
    "Standard Precautions/Transmission-Based Precautions",
    "Use of Restraints/Safety Devices"
  ],

  "Take Actions": [
    "Implementing Nursing Interventions",
    "Medication Administration Actions",
    "Client Education and Health Teaching",
    "Coordinating Care Activities",
    "Emergency Interventions",
    "Delegating and Supervising Care",
    "Therapeutic Procedures"
  ]
};

// Flattened list of all client needs categories and subcategories
export const clientNeedsList = Object.keys(CLIENT_NEEDS);

// Get all subcategories as a flat list
export const allClientNeedSubcategories = Object.values(CLIENT_NEEDS).flat();

// Get all extended subcategories as a flat list
export const allExtendedSubcategories = Object.values(CLIENT_NEEDS_EXTENDED).flat();

// Helper to get subcategories for a specific client need
export const getSubcategories = (clientNeed) => {
  return CLIENT_NEEDS[clientNeed] || [];
};

// Helper to get extended subcategories for a specific subcategory
export const getExtendedSubcategories = (subcategory) => {
  return CLIENT_NEEDS_EXTENDED[subcategory] || [];
};

// Get all client needs with their subcategories formatted for dropdown
export const getClientNeedsOptions = () => {
  const options = [];
  Object.entries(CLIENT_NEEDS).forEach(([clientNeed, subcategories]) => {
    options.push({
      value: clientNeed,
      label: clientNeed,
      isMainCategory: true
    });
    subcategories.forEach(sub => {
      options.push({
        value: sub,
        label: `  └ ${sub}`,
        parentCategory: clientNeed,
        isMainCategory: false
      });
    });
  });
  return options;
};

// Get client needs for admin question upload
export const getClientNeedsForAdmin = () => {
  const result = [];
  Object.entries(CLIENT_NEEDS).forEach(([clientNeed, subcategories]) => {
    const subcatsWithExtended = subcategories.map(sub => ({
      name: sub,
      extended: CLIENT_NEEDS_EXTENDED[sub] || []
    }));
    result.push({
      name: clientNeed,
      subcategories: subcatsWithExtended
    });
  });
  return result;
};

export default CLIENT_NEEDS;
