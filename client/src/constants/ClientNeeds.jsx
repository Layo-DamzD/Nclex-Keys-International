// NCLEX Client Needs Framework
// This is the official NCLEX test plan categorization

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

// Flattened list of all client needs categories and subcategories
export const clientNeedsList = Object.keys(CLIENT_NEEDS);

// Get all subcategories as a flat list
export const allClientNeedSubcategories = Object.values(CLIENT_NEEDS).flat();

// Helper to get subcategories for a specific client need
export const getSubcategories = (clientNeed) => {
  return CLIENT_NEEDS[clientNeed] || [];
};

export default CLIENT_NEEDS;
