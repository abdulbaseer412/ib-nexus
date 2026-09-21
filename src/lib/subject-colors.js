export const SUBJECT_COLOR_MAP = {
  "Biology": "bio",
  "Chemistry": "chem",
  "Physics": "phys",
  "Mathematics": "math",
  "Mathematics: Analysis and Approaches": "math",
  "Mathematics: Applications and Interpretation": "math",
  "Economics": "econ",
  "Business Management": "bus",
  "Business": "bus",
  "English": "eng",
  "English A: Literature": "eng",
  "English A: Language and Literature": "eng",
  "History": "hist",
  "Geography": "geog",
  "Theory of Knowledge": "tok",
  "TOK": "tok",
  "Computer Science": "cs"
};

/**
 * Returns the color theme name (e.g. "bio", "chem") for a given subject.
 * Defaults to "blue" (using brand accent) if no match.
 */
export function getSubjectColorTheme(subjectName) {
  if (!subjectName) return "brand";
  
  // Exact match
  if (SUBJECT_COLOR_MAP[subjectName]) {
    return SUBJECT_COLOR_MAP[subjectName];
  }
  
  // Partial match fallback
  const name = subjectName.toLowerCase();
  if (name.includes("bio")) return "bio";
  if (name.includes("chem")) return "chem";
  if (name.includes("phys")) return "phys";
  if (name.includes("math")) return "math";
  if (name.includes("econ")) return "econ";
  if (name.includes("bus")) return "bus";
  if (name.includes("eng")) return "eng";
  if (name.includes("hist")) return "hist";
  if (name.includes("geog")) return "geog";
  if (name.includes("tok")) return "tok";
  if (name.includes("comp") || name.includes("cs")) return "cs";
  
  return "brand";
}

/**
 * Returns Tailwind classes for a solid colored badge
 */
export function getSubjectBadgeClasses(subjectName) {
  const theme = getSubjectColorTheme(subjectName);
  if (theme === "brand") return "bg-accent/10 text-accent border border-accent/20";
  return `bg-subject-${theme}-soft text-subject-${theme} border border-subject-${theme}/20`;
}

/**
 * Returns Tailwind classes for a subtle colored icon wrapper
 */
export function getSubjectIconClasses(subjectName) {
  const theme = getSubjectColorTheme(subjectName);
  if (theme === "brand") return "bg-accent/10 text-accent";
  return `bg-subject-${theme}-soft text-subject-${theme}`;
}

/**
 * Returns text color class
 */
export function getSubjectTextClass(subjectName) {
  const theme = getSubjectColorTheme(subjectName);
  if (theme === "brand") return "text-accent";
  return `text-subject-${theme}`;
}

/**
 * Returns solid background color class
 */
export function getSubjectBgClass(subjectName) {
  const theme = getSubjectColorTheme(subjectName);
  if (theme === "brand") return "bg-accent";
  return `bg-subject-${theme}`;
}

/**
 * Returns border color class
 */
export function getSubjectBorderClass(subjectName) {
  const theme = getSubjectColorTheme(subjectName);
  if (theme === "brand") return "border-accent";
  return `border-subject-${theme}`;
}
