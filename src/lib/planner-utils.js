// src/lib/planner-utils.js

/**
 * Client‑side utilities for the Study Planner.
 * They avoid any "next/headers" imports, so they can be used in
 * React client components (e.g., PlannerClient).
 */

/**
 * Calculates a deterministic priority score for a task based on multiple factors.
 * Mirrors the server implementation but receives all needed data via the `context`
 * argument, avoiding any direct Supabase calls.
 */
export function calculatePriorityScore(task, context) {
  const now = new Date();
  let score = 0;

  // 1. Deadline urgency
  if (task.deadline_id) {
    const deadline = context.deadlines?.find(d => d.id === task.deadline_id);
    if (deadline && deadline.due_at) {
      const due = new Date(deadline.due_at);
      const diffDays = (due - now) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 30 - diffDays) * 2;
    }
  }

  // 2. Overdue task
  if (task.status === "overdue") {
    score += 40;
  }

  // 3. Task priority field
  if (task.priority) {
    const map = { low: 10, medium: 20, high: 30 };
    score += map[task.priority] || 0;
  }

  // 4. Goal importance weighting
  if (task.goal_id) {
    const goal = context.goals?.find(g => g.id === task.goal_id);
    if (goal) {
      const weight = {
        exam: 30,
        ia: 25,
        ee: 30,
        tok: 20,
        cas: 15,
        myp_project: 20,
        personal_project: 15,
        coursework: 20,
        revision: 10,
      }[goal.type] || 0;
      score += weight;
    }
  }

  // 5. Due flashcards linked via subject
  if (task.subject_id) {
    const dueCards = context.flashcards?.filter(
      c => c.deck?.subject === task.subject_id && new Date(c.next_review_at) <= now
    );
    if (dueCards?.length) {
      score += dueCards.length * 5;
    }
  }

  // 6. Weak topics placeholder
  if (context.weakTopics?.includes(task.subject_id)) {
    score += 15;
  }

  // 7. Available study time (penalise if exceeded)
  if (task.estimated_duration) {
    const allocated = context.todaysAllocatedMinutes || 0;
    const remaining = (context.preferences?.daily_max_minutes || 300) - allocated;
    if (remaining < task.estimated_duration) {
      score -= 10;
    }
  }

  // 8. Missed‑task history penalty
  if (task.missed_count && task.missed_count > 0) {
    score -= task.missed_count * 5;
  }

  return Math.max(0, Math.round(score));
}

/**
 * Fetches all planner data via the public API routes.
 * Returns an object {goals, tasks, sessions, deadlines, preferences}.
 */
export async function fetchPlannerData() {
  const fetchJson = async (url) => {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch");
    return data;
  };

  const [goals, tasks, sessions, deadlines, preferences] = await Promise.all([
    fetchJson("/api/planner/goals").catch(() => []),
    fetchJson("/api/planner/tasks").catch(() => []),
    fetchJson("/api/planner/sessions").catch(() => []),
    fetchJson("/api/planner/deadlines").catch(() => []),
    fetchJson("/api/planner/preferences").catch(() => ({})),
  ]);
  return { goals, tasks, sessions, deadlines, preferences };
}
