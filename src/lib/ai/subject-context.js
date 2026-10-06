/**
 * Subject Context Utility for AI Tutor
 *
 * Loads user's enrolled subjects from their profile and provides
 * context formatting for Gemini system instructions.
 * Uses the canonical IB subject system from ib_subjects table.
 */

/**
 * Extract user's enrolled subjects from profile data.
 * The profile.subjects field is a JSONB array set during onboarding.
 * Each entry can be:
 *   - a string like "Biology HL"
 *   - an object like { name: "Biology", level: "HL", category: "Group 4: Sciences" }
 *
 * Returns a normalized array of { name, level, category, displayName }
 */
export function getUserSubjects(profile) {
  if (!profile?.subjects || !Array.isArray(profile.subjects)) return [];

  return profile.subjects
    .map((s) => {
      if (typeof s === "string") {
        // Parse "Biology HL" or "Mathematics: Analysis & Approaches (AA) SL"
        const levelMatch = s.match(/\s+(HL|SL)$/i);
        const level = levelMatch ? levelMatch[1].toUpperCase() : null;
        const name = level ? s.replace(/\s+(HL|SL)$/i, "").trim() : s.trim();
        return {
          name,
          level,
          category: null,
          displayName: level ? `${name} ${level}` : name,
        };
      }

      if (typeof s === "object" && s !== null) {
        const name = s.name || s.subject || "";
        const level = s.level ? s.level.toUpperCase() : null;
        return {
          name,
          level,
          category: s.category || s.group || null,
          displayName: level ? `${name} ${level}` : name,
        };
      }

      return null;
    })
    .filter(Boolean);
}

/**
 * Get the user's IB programme label from profile.
 * Returns "DP" or "MYP" or null.
 */
export function getUserProgramme(profile) {
  const prog = profile?.ib_program || profile?.programme || "";
  const p = String(prog).toLowerCase();
  if (p.includes("dp")) return "DP";
  if (p.includes("myp")) return "MYP";
  return prog ? prog.toUpperCase() : null;
}

/**
 * Build subject context string for AI system instructions.
 */
export function buildSubjectContext(profile, selectedSubject) {
  const programme = getUserProgramme(profile);
  const subjects = getUserSubjects(profile);
  const examSession = profile?.exam_session || null;

  let context = "";

  if (programme) {
    context += `\n- IB Programme: ${programme}`;
  }

  if (examSession) {
    context += `\n- Exam Session: ${examSession}`;
  }

  if (subjects.length > 0) {
    context += `\n- Enrolled Subjects: ${subjects.map((s) => s.displayName).join(", ")}`;
  }

  if (selectedSubject && selectedSubject !== "All subjects") {
    // Find the matching subject for level info
    const match = subjects.find(
      (s) =>
        s.name.toLowerCase() === selectedSubject.toLowerCase() ||
        s.displayName.toLowerCase() === selectedSubject.toLowerCase()
    );

    if (match) {
      context += `\n- Current Subject Focus: ${match.displayName}`;
      if (match.level) {
        context += ` (${match.level} level)`;
      }
    } else {
      context += `\n- Current Subject Focus: ${selectedSubject}`;
    }
  }

  return context;
}

/**
 * Format user subjects into grouped display data for the SubjectPicker UI.
 * Returns { mySubjects: [...], otherSubjects: [...] }
 */
export function formatSubjectsForPicker(profile, allSubjects = []) {
  const userSubjects = getUserSubjects(profile);
  const programme = getUserProgramme(profile);

  const userSubjectNames = new Set(
    userSubjects.map((s) => s.name.toLowerCase())
  );

  // Filter canonical subjects for the user's programme
  const programSubjects = allSubjects.filter(
    (s) =>
      !programme ||
      s.program?.toLowerCase() === programme.toLowerCase()
  );

  const otherSubjects = programSubjects
    .filter((s) => !userSubjectNames.has(s.name.toLowerCase()))
    .map((s) => ({
      name: s.name,
      level: null,
      category: s.category,
      displayName: s.name,
      isUserSubject: false,
    }));

  return {
    mySubjects: userSubjects.map((s) => ({ ...s, isUserSubject: true })),
    otherSubjects,
    programme,
  };
}
