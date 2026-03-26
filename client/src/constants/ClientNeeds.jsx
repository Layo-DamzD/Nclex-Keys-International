// NCLEX Client Needs Framework
// This is the official NCLEX test plan categorization
// Used for both student test creation and admin question categorization

export const CLIENT_NEEDS = {
  "Safe and Effective Care Environment": [
    "Management of Care",
    "Safety and Infection Control"
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

  "Physiological Integrity": [
    "Basic Care and Comfort",
    "Pharmacological and Parenteral Therapies",
    "Reduction of Risk Potential",
    "Physiological Adaptation"
  ]
};

// Extended subcategories for more detailed categorization
// Used by admin when uploading questions
export const CLIENT_NEEDS_EXTENDED = {
  "Management of Care": [
    "Advance Directives",
    "Advocacy",
    "Collaboration with Interdisciplinary Team",
    "Delegation",
    "Establishing Priorities",
    "Ethical Practice",
    "Informed Consent",
    "Legal Rights and Responsibilities",
    "Performance Improvement",
    "Referrals",
    "Resource Management",
    "Staff Education",
    "Supervision"
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

  "Physiological Adaptation": [
    "Alterations in Body Systems",
    "Fluid and Electrolyte Imbalances",
    "Hemodynamics",
    "Illness Management",
    "Medical Emergencies",
    "Pathophysiology",
    "Radiation Therapy",
    "Unexpected Response to Therapies"
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
