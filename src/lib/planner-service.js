// src/lib/planner-service.js

/**
 * Planner Service – wraps Supabase calls for Goals, Tasks, Sessions, Deadlines, Preferences.
 * All functions use the server‑side Supabase client (SSR) and respect RLS via auth.uid().
 */

import { createServerClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { formatISO, addMinutes, startOfDay, endOfDay } from "date-fns";
import { utcToZonedTime, zonedTimeToUtc } from "date-fns-tz";

// ---------- Helper: get userId ----------
async function getUserId() {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthenticated");
  return user.id;
}

// ---------- Goals ----------
export async function getGoals() {
  const userId = await getUserId();
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("planner_goals")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return data;
}

export async function createGoal(goal) {
  const userId = await getUserId();
  const supabase = await createServerClient();
  const payload = { ...goal, user_id: userId };
  const { data, error } = await supabase.from("planner_goals").insert(payload).single();
  if (error) throw error;
  return data;
}

export async function updateGoal(id, updates) {
  const userId = await getUserId();
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("planner_goals")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteGoal(id) {
  const userId = await getUserId();
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("planner_goals")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  return true;
}

// ---------- Tasks ----------
export async function getTasks() {
  const userId = await getUserId();
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("planner_tasks")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return data;
}

export async function createTask(task) {
  const userId = await getUserId();
  const supabase = await createServerClient();
  const payload = { ...task, user_id: userId };
  const { data, error } = await supabase.from("planner_tasks").insert(payload).single();
  if (error) throw error;
  return data;
}

export async function updateTask(id, updates) {
  const userId = await getUserId();
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("planner_tasks")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTask(id) {
  const userId = await getUserId();
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("planner_tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  return true;
}

// ---------- Sessions ----------
export async function getSessions(date = new Date()) {
  const userId = await getUserId();
  const supabase = await createServerClient();
  const start = formatISO(startOfDay(date));
  const end = formatISO(endOfDay(date));
  const { data, error } = await supabase
    .from("planner_sessions")
    .select("*")
    .eq("user_id", userId)
    .gte("scheduled_start", start)
    .lte("scheduled_start", end);
  if (error) throw error;
  return data;
}

export async function createSession(session) {
  const userId = await getUserId();
  const supabase = await createServerClient();
  const payload = { ...session, user_id: userId };
  const { data, error } = await supabase.from("planner_sessions").insert(payload).single();
  if (error) throw error;
  return data;
}

export async function updateSession(id, updates) {
  const userId = await getUserId();
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("planner_sessions")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSession(id) {
  const userId = await getUserId();
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("planner_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  return true;
}

// ---------- Deadlines ----------
export async function getDeadlines() {
  const userId = await getUserId();
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("planner_deadlines")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return data;
}

export async function createDeadline(deadline) {
  const userId = await getUserId();
  const supabase = await createServerClient();
  const payload = { ...deadline, user_id: userId };
  const { data, error } = await supabase.from("planner_deadlines").insert(payload).single();
  if (error) throw error;
  return data;
}

export async function updateDeadline(id, updates) {
  const userId = await getUserId();
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("planner_deadlines")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDeadline(id) {
  const userId = await getUserId();
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("planner_deadlines")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  return true;
}

// ---------- Preferences ----------
export async function getPreferences() {
  const userId = await getUserId();
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("planner_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error && error.message !== "Row not found") throw error;
  return data || {};
}

export async function updatePreferences(prefs) {
  const userId = await getUserId();
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("planner_preferences")
    .upsert({ user_id: userId, ...prefs }, { onConflict: "user_id" })
    .single();
  if (error) throw error;
  return data;
}

// ---------- Utility Helpers ----------
/**
 * Calculates a deterministic priority score for a task based on multiple factors.
 * Higher score = higher priority for Next Best Action.
 */
export function calculatePriorityScore(task, context) {
  const now = new Date();
  let score = 0;

  // 1. Deadline urgency (days until due)
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

  // 3. Task priority field (if exists)
  if (task.priority) {
    const prioMap = { low: 10, medium: 20, high: 30 };
    score += prioMap[task.priority] || 0;
  }

  // 4. Goal importance (type weighting)
  if (task.goal_id) {
    const goal = context.goals?.find(g => g.id === task.goal_id);
    if (goal) {
      const typeWeight = {
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
      score += typeWeight;
    }
  }

  // 5. Due flashcards linked via subject/topic
  if (task.subject_id) {
    const dueCards = context.flashcards?.filter(c => c.deck?.subject === task.subject_id && new Date(c.next_review_at) <= now);
    if (dueCards?.length) {
      score += dueCards.length * 5;
    }
  }

  // 6. Weak topics – placeholder (requires notes analysis, not implemented here)
  if (context.weakTopics?.includes(task.subject_id)) {
    score += 15;
  }

  // 7. Available study time (if today already full, lower score)
  if (task.estimated_duration) {
    const allocated = context.todaysAllocatedMinutes || 0;
    const remaining = (context.preferences?.daily_max_minutes || 300) - allocated;
    if (remaining < task.estimated_duration) {
      score -= 10;
    }
  }

  // 8. Missed‑task history (penalize repeated misses)
  if (task.missed_count && task.missed_count > 0) {
    score -= task.missed_count * 5;
  }

  return Math.max(0, Math.round(score));
}

/**
 * Returns the list of 15‑minute slots that are free for a given date.
 * Break preferences are taken from planner_preferences.
 */
export async function availableSlots(date = new Date()) {
  const userId = await getUserId();
  const supabase = await createServerClient();
  const pref = await getPreferences();
  const breakMins = pref.break_minutes ?? 10;
  const start = startOfDay(date);
  const end = endOfDay(date);

  const { data: sessions, error } = await supabase
    .from("planner_sessions")
    .select("scheduled_start, scheduled_end")
    .eq("user_id", userId)
    .gte("scheduled_start", formatISO(start))
    .lte("scheduled_start", formatISO(end));
  if (error) throw error;

  const occupied = new Set();
  sessions?.forEach(s => {
    const sStart = new Date(s.scheduled_start);
    const sEnd = new Date(s.scheduled_end);
    for (let t = sStart; t < sEnd; t = addMinutes(t, 15)) {
      occupied.add(t.getTime());
    }
  });

  const slots = [];
  let cursor = new Date(start);
  cursor.setHours(8, 0, 0, 0);
  const limit = new Date(start);
  limit.setHours(22, 0, 0, 0);
  while (cursor < limit) {
    if (!occupied.has(cursor.getTime())) {
      slots.push(new Date(cursor));
    }
    cursor = addMinutes(cursor, 15);
  }
  return slots;
}

/**
 * Aggregates context needed for scoring: goals, deadlines, flashcards, preferences, weak topics.
 */
export async function aggregateContext() {
  const userId = await getUserId();
  const supabase = await createServerClient();
  const [goalsRes, tasksRes, deadlinesRes, prefsRes] = await Promise.all([
    supabase.from("planner_goals").select("*").eq("user_id", userId),
    supabase.from("planner_tasks").select("*").eq("user_id", userId),
    supabase.from("planner_deadlines").select("*").eq("user_id", userId),
    supabase.from("planner_preferences").select("*").eq("user_id", userId).single(),
  ]);

  const { data: dueCards } = await supabase
    .from("ib_flashcards")
    .select("id, deck_id, next_review_at, difficulty_level")
    .eq("user_id", userId)
    .lte("next_review_at", new Date().toISOString());

  const weakTopics = [];

  return {
    goals: goalsRes.data,
    tasks: tasksRes.data,
    deadlines: deadlinesRes.data,
    preferences: prefsRes.data,
    flashcards: dueCards,
    weakTopics,
  };
}
