/**
 * Authoritative IB Curriculum Level Definitions
 * Identifies whether a subject supports HL & SL, is SL-Only, or has No Level (Core / MYP).
 */

// Subjects that are strictly SL-only in the IB Diploma Programme curriculum
const DP_SL_ONLY_PATTERNS = [
  "ab initio", // All ab initio languages are beginner courses, strictly SL only
  "literature and performance",
  "literature & performance",
  "world religions",
];

// DP Core components have no HL/SL levels
const DP_CORE_PATTERNS = [
  "theory of knowledge",
  "tok",
  "extended essay",
  "ee",
  "creativity, activity, service",
  "creativity, activity",
  "cas",
];

/**
 * Returns an array of supported levels for a subject:
 * - ["SL", "HL"] for subjects supporting both
 * - ["SL"] for SL-only subjects
 * - [] for MYP subjects or DP Core (no level)
 */
export function getSubjectSupportedLevels(subjectName = "", program = "dp") {
  if (!subjectName) return [];
  const normalizedProg = (program || "dp").toLowerCase();
  
  // MYP (Middle Years Programme) subjects do not have HL or SL
  if (normalizedProg === "myp") return [];

  const lower = subjectName.toLowerCase().trim();

  // DP Core has no level
  if (DP_CORE_PATTERNS.some((p) => lower.includes(p) || lower === p)) {
    return [];
  }

  // SL-only check
  if (DP_SL_ONLY_PATTERNS.some((p) => lower.includes(p))) {
    return ["SL"];
  }

  // Standard DP academic courses support both HL and SL
  return ["SL", "HL"];
}

/**
 * Returns true if the subject is strictly Standard Level only
 */
export function isSLOnlySubject(subjectName = "", program = "dp") {
  const levels = getSubjectSupportedLevels(subjectName, program);
  return levels.length === 1 && levels[0] === "SL";
}

/**
 * Returns true if the subject has course levels (HL or SL)
 */
export function hasSubjectLevels(subjectName = "", program = "dp") {
  const levels = getSubjectSupportedLevels(subjectName, program);
  return levels.length > 0;
}

/**
 * Returns a human-friendly level tag or note
 */
export function getSubjectLevelNote(subjectName = "", program = "dp") {
  if ((program || "dp").toLowerCase() === "myp") return "Middle Years Course";
  if (isSLOnlySubject(subjectName, program)) return "Standard Level Only";
  if (!hasSubjectLevels(subjectName, program)) return "DP Core Component";
  return "HL & SL Available";
}

export const CANONICAL_DP_SUBJECTS = [
  { id: "dp-1", program: "dp", category: "Group 1 & 2: Languages", name: "English A Lit" },
  { id: "dp-2", program: "dp", category: "Group 1 & 2: Languages", name: "English A Lang & Lit" },
  { id: "dp-3", program: "dp", category: "Group 1 & 2: Languages", name: "Spanish B" },
  { id: "dp-4", program: "dp", category: "Group 1 & 2: Languages", name: "French B" },
  { id: "dp-5", program: "dp", category: "Group 1 & 2: Languages", name: "Mandarin B" },
  { id: "dp-6", program: "dp", category: "Group 1 & 2: Languages", name: "German B" },
  { id: "dp-7", program: "dp", category: "Group 1 & 2: Languages", name: "German ab initio" },
  { id: "dp-8", program: "dp", category: "Group 1 & 2: Languages", name: "Urdu" },
  { id: "dp-9", program: "dp", category: "Group 3: Individuals & Societies", name: "History" },
  { id: "dp-10", program: "dp", category: "Group 3: Individuals & Societies", name: "Geography" },
  { id: "dp-11", program: "dp", category: "Group 3: Individuals & Societies", name: "Economics" },
  { id: "dp-12", program: "dp", category: "Group 3: Individuals & Societies", name: "Business Management" },
  { id: "dp-13", program: "dp", category: "Group 3: Individuals & Societies", name: "Psychology" },
  { id: "dp-14", program: "dp", category: "Group 3: Individuals & Societies", name: "Global Politics" },
  { id: "dp-15", program: "dp", category: "Group 4: Sciences", name: "Biology" },
  { id: "dp-16", program: "dp", category: "Group 4: Sciences", name: "Chemistry" },
  { id: "dp-17", program: "dp", category: "Group 4: Sciences", name: "Physics" },
  { id: "dp-18", program: "dp", category: "Group 4: Sciences", name: "Computer Science" },
  { id: "dp-19", program: "dp", category: "Group 4: Sciences", name: "ESS" },
  { id: "dp-20", program: "dp", category: "Group 5: Mathematics", name: "Mathematics AA" },
  { id: "dp-21", program: "dp", category: "Group 5: Mathematics", name: "Mathematics AI" },
];

export const CANONICAL_MYP_SUBJECTS = [
  { id: "myp-1", program: "myp", category: "Language and Literature", name: "English Lang & Lit" },
  { id: "myp-2", program: "myp", category: "Language and Literature", name: "Spanish Lang & Lit" },
  { id: "myp-3", program: "myp", category: "Language and Literature", name: "German Lang & Lit" },
  { id: "myp-4", program: "myp", category: "Language Acquisition", name: "French" },
  { id: "myp-5", program: "myp", category: "Language Acquisition", name: "Spanish" },
  { id: "myp-6", program: "myp", category: "Language Acquisition", name: "Mandarin" },
  { id: "myp-7", program: "myp", category: "Language Acquisition", name: "German" },
  { id: "myp-8", program: "myp", category: "Individuals and Societies", name: "History" },
  { id: "myp-9", program: "myp", category: "Individuals and Societies", name: "Geography" },
  { id: "myp-10", program: "myp", category: "Individuals and Societies", name: "Integrated Humanities" },
  { id: "myp-11", program: "myp", category: "Sciences", name: "Biology" },
  { id: "myp-12", program: "myp", category: "Sciences", name: "Chemistry" },
  { id: "myp-13", program: "myp", category: "Sciences", name: "Physics" },
  { id: "myp-14", program: "myp", category: "Sciences", name: "Integrated Sciences" },
  { id: "myp-15", program: "myp", category: "Mathematics", name: "Mathematics (Standard)" },
  { id: "myp-16", program: "myp", category: "Mathematics", name: "Mathematics (Extended)" },
  { id: "myp-17", program: "myp", category: "Arts", name: "Visual Arts" },
  { id: "myp-18", program: "myp", category: "Arts", name: "Drama" },
  { id: "myp-19", program: "myp", category: "Design", name: "Design" },
  { id: "myp-20", program: "myp", category: "Physical and Health Education", name: "PHE" },
];

export function groupSubjectsByCategory(subjects = [], program = "dp") {
  const normProg = (program || "dp").toLowerCase();
  const map = {};
  subjects.forEach((s) => {
    const cat = s.category || "General";
    if (!map[cat]) map[cat] = [];
    map[cat].push(s);
  });

  const definedOrder =
    normProg === "dp"
      ? [
          "Group 1 & 2: Languages",
          "Group 1: Studies in Language & Literature",
          "Group 2: Language Acquisition",
          "Group 3: Individuals & Societies",
          "Group 4: Sciences",
          "Group 5: Mathematics",
          "Group 6: Arts",
          "Core Requirements",
        ]
      : [
          "Language and Literature",
          "Language Acquisition",
          "Individuals and Societies",
          "Sciences",
          "Mathematics",
          "Arts",
          "Design",
          "Physical and Health Education",
        ];

  const result = [];
  definedOrder.forEach((cat) => {
    if (map[cat] && map[cat].length > 0) {
      result.push({
        category: cat,
        subjects: map[cat].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
      });
      delete map[cat];
    }
  });

  Object.entries(map).forEach(([cat, items]) => {
    if (items.length > 0) {
      result.push({
        category: cat,
        subjects: items.sort((a, b) => (a.name || "").localeCompare(b.name || "")),
      });
    }
  });

  return result;
}

