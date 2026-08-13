import { createServerClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";

/* ========================================================================== */
/*  SM-2 SPACED REPETITION ENGINE                                             */
/* ========================================================================== */

/**
 * Calculates the next review parameters based on a modified SM-2 algorithm.
 * @param {string} rating 'again', 'hard', 'good', 'easy'
 * @param {object} card The current flashcard data
 * @returns {object} { interval_days, ease_factor, repetitions, lapses, next_review_at }
 */
export function calculateNextReview(rating, card) {
  let { interval_days = 0, ease_factor = 2.5, repetitions = 0, lapses = 0 } = card;

  let newInterval;
  let newEase = ease_factor;
  let newRepetitions = repetitions;
  let newLapses = lapses;

  switch (rating) {
    case 'again':
      newRepetitions = 0;
      newInterval = 0; // Due immediately or next day
      newEase = Math.max(1.3, ease_factor - 0.2);
      newLapses += 1;
      break;
    case 'hard':
      newRepetitions = Math.max(1, repetitions);
      newInterval = interval_days === 0 ? 1 : interval_days * 1.2;
      newEase = Math.max(1.3, ease_factor - 0.15);
      break;
    case 'good':
      newRepetitions += 1;
      if (repetitions === 0) newInterval = 1;
      else if (repetitions === 1) newInterval = 6;
      else newInterval = interval_days * ease_factor;
      break;
    case 'easy':
      newRepetitions += 1;
      if (repetitions === 0) newInterval = 4;
      else if (repetitions === 1) newInterval = 10;
      else newInterval = interval_days * ease_factor * 1.3;
      newEase += 0.15;
      break;
    default:
      throw new Error(`Unknown rating: ${rating}`);
  }

  // Calculate next review date
  const nextReviewDate = new Date();
  if (newInterval > 0) {
    nextReviewDate.setDate(nextReviewDate.getDate() + Math.round(newInterval));
  } else {
    // If 'again', it's due today but we can add 10 minutes to push it to the back of the queue
    nextReviewDate.setMinutes(nextReviewDate.getMinutes() + 10);
  }

  return {
    interval_days: Math.round(newInterval * 10) / 10,
    ease_factor: Math.round(newEase * 100) / 100,
    repetitions: newRepetitions,
    lapses: newLapses,
    next_review_at: nextReviewDate.toISOString()
  };
}

/* ========================================================================== */
/*  DATA FETCHING & MUTATION                                                  */
/* ========================================================================== */

// Get all decks for the user with counts
export async function getDecks() {
  const user = await getAuthUser();
  const supabase = await createServerClient();

  const { data: decks, error } = await supabase
    .from('ib_flashcard_decks')
    .select(`
      *,
      flashcards:ib_flashcards(id, next_review_at)
    `)
    .eq('user_id', user.id)
    .order('last_reviewed_at', { ascending: false, nullsFirst: false });

  if (error) {
    console.error(error);
    return [];
  }

  const now = new Date();
  
  return decks.map(deck => {
    const totalCards = deck.flashcards.length;
    const dueCards = deck.flashcards.filter(c => new Date(c.next_review_at) <= now).length;
    
    // We remove the flashcards array from the result to save bandwidth
    const { flashcards, ...rest } = deck;
    return {
      ...rest,
      total_cards: totalCards,
      due_cards: dueCards
    };
  });
}

export async function getDeckDetails(deckId) {
  const user = await getAuthUser();
  const supabase = await createServerClient();

  const { data: deck, error } = await supabase
    .from('ib_flashcard_decks')
    .select('*')
    .eq('id', deckId)
    .eq('user_id', user.id)
    .single();

  if (error) return null;

  const { data: cards } = await supabase
    .from('ib_flashcards')
    .select(`
      id, front, back, card_type, difficulty_level, note_id, next_review_at, ease_factor, repetitions,
      ib_notes(title)
    `)
    .eq('deck_id', deckId)
    .order('created_at', { ascending: false });

  const now = new Date();
  let dueCount = 0;
  let masteredCount = 0;
  
  const mappedCards = (cards || []).map(c => {
    const isDue = new Date(c.next_review_at) <= now;
    if (isDue) dueCount++;
    if (c.repetitions > 4 && c.ease_factor >= 2.5) masteredCount++;
    return c;
  });

  return {
    ...deck,
    cards: mappedCards,
    total_cards: mappedCards.length,
    due_cards: dueCount,
    mastery_percentage: mappedCards.length > 0 ? Math.round((masteredCount / mappedCards.length) * 100) : 0
  };
}

// Generate smart review session
export async function generateSmartReviewSession() {
  const user = await getAuthUser();
  const supabase = await createServerClient();
  const now = new Date().toISOString();

  // 1. Get due cards across all decks (either next_review_at is due OR priority_date is due)
  const { data: dueCards } = await supabase
    .from('ib_flashcards')
    .select('*, ib_flashcard_decks(title)')
    .eq('user_id', user.id)
    .or(`next_review_at.lte.${now},priority_date.lte.${now}`)
    .order('priority_date', { ascending: false, nullsFirst: false })
    .order('next_review_at', { ascending: true })
    .limit(30); // Max 30 for a session

  if (!dueCards || dueCards.length === 0) return [];
  return dueCards;
}

export async function getDeckReviewSession(deckId) {
  const user = await getAuthUser();
  const supabase = await createServerClient();
  const now = new Date().toISOString();

  const { data: cards } = await supabase
    .from('ib_flashcards')
    .select('*, ib_flashcard_decks(title)')
    .eq('user_id', user.id)
    .eq('deck_id', deckId)
    .or(`next_review_at.lte.${now},priority_date.lte.${now}`)
    .order('priority_date', { ascending: false, nullsFirst: false })
    .order('next_review_at', { ascending: true });

  return cards || [];
}

// Perform a review
export async function submitCardReview(cardId, rating, durationMs = 0) {
  const user = await getAuthUser();
  const supabase = await createServerClient();

  // 1. Fetch current card
  const { data: card, error: fetchErr } = await supabase
    .from('ib_flashcards')
    .select('*')
    .eq('id', cardId)
    .eq('user_id', user.id)
    .single();

  if (fetchErr || !card) throw new Error("Card not found");

  // 2. Calculate next SM-2 params
  const reviewResult = calculateNextReview(rating, card);

  // 3. Update the card
  const { error: updateErr } = await supabase
    .from('ib_flashcards')
    .update({
      ...reviewResult,
      last_reviewed_at: new Date().toISOString()
    })
    .eq('id', cardId);

  if (updateErr) throw updateErr;

  // 4. Log the review
  await supabase.from('ib_flashcard_reviews').insert({
    user_id: user.id,
    card_id: cardId,
    rating: rating,
    review_duration_ms: durationMs,
    previous_interval: card.interval_days,
    new_interval: reviewResult.interval_days,
    previous_ease: card.ease_factor,
    new_ease: reviewResult.ease_factor
  });

  // 5. Update deck last_reviewed_at
  if (card.deck_id) {
    await supabase.from('ib_flashcard_decks')
      .update({ last_reviewed_at: new Date().toISOString() })
      .eq('id', card.deck_id);
  }

  // 6. Record Activity / Streak
  await recordActivityAndStreak(user.id, supabase);

  return { success: true, result: reviewResult };
}

// General Stats
export async function getFlashcardStats() {
  const user = await getAuthUser();
  const supabase = await createServerClient();
  const now = new Date();

  const { data: cards } = await supabase
    .from('ib_flashcards')
    .select('id, repetitions, ease_factor, next_review_at')
    .eq('user_id', user.id);

  if (!cards) return { total: 0, due: 0, mastered: 0, retention: 0 };

  let due = 0;
  let mastered = 0;
  
  cards.forEach(c => {
    if (new Date(c.next_review_at) <= now) due++;
    if (c.repetitions > 4 && c.ease_factor >= 2.5) mastered++;
  });

  // Calculate True Retention based on 30-day trailing reviews
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: reviews } = await supabase
    .from('ib_flashcard_reviews')
    .select('rating, reviewed_at')
    .eq('user_id', user.id)
    .gte('reviewed_at', thirtyDaysAgo.toISOString())
    .order('reviewed_at', { ascending: false });

  let retention = 0;
  if (reviews && reviews.length > 0) {
    // Weigh recent reviews slightly higher by looking at the last 50 vs all 30 days, 
    // but for simplicity, True Retention = (Passed / Total)
    const passedReviews = reviews.filter(r => ['hard', 'good', 'easy'].includes(r.rating)).length;
    retention = Math.round((passedReviews / reviews.length) * 100);
  }

  // Also fetch the current streak to return it for the UI
  const { data: profile } = await supabase
    .from('ib_flashcard_profiles')
    .select('current_streak, ai_generation_enabled')
    .eq('user_id', user.id)
    .single();

  return {
    total: cards.length,
    due,
    mastered,
    retention,
    streak: profile?.current_streak || 0,
    aiEnabled: profile?.ai_generation_enabled || false
  };
}

export async function recordActivityAndStreak(userId, supabaseClient) {
  // Try to fetch current profile
  const { data: profile, error: fetchErr } = await supabaseClient
    .from('ib_flashcard_profiles')
    .select('current_streak, best_streak, last_active_date')
    .eq('user_id', userId)
    .single();

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  if (!profile) {
    // First time activity
    await supabaseClient.from('ib_flashcard_profiles').insert({
      user_id: userId,
      current_streak: 1,
      best_streak: 1,
      last_active_date: todayStr
    });
    return;
  }

  if (profile.last_active_date === todayStr) {
    // Already active today, do nothing
    return;
  }

  const lastActive = new Date(profile.last_active_date);
  // Calculate difference in days
  // Use UTC to avoid timezone midnight shift issues
  const diffTime = Math.abs(today.getTime() - lastActive.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let newStreak = profile.current_streak;

  if (diffDays <= 2) {
    // Increment streak (1 day gap or next day)
    newStreak += 1;
  } else {
    // Reset streak
    newStreak = 1;
  }

  const bestStreak = Math.max(newStreak, profile.best_streak || 0);

  await supabaseClient.from('ib_flashcard_profiles')
    .update({
      current_streak: newStreak,
      best_streak: bestStreak,
      last_active_date: todayStr,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);
}
