-- Add is_admin to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Community posts (permanent discussions)
CREATE TABLE IF NOT EXISTS community_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_name text NOT NULL,
  author_avatar text,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL,
  post_type text DEFAULT 'discussion' CHECK (post_type IN ('discussion', 'question')),
  is_answered boolean DEFAULT false,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  helpful_count integer DEFAULT 0,
  reply_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id)
);

-- Community replies
CREATE TABLE IF NOT EXISTS community_replies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_name text NOT NULL,
  author_avatar text,
  content text NOT NULL,
  helpful_count integer DEFAULT 0,
  is_accepted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Community reactions (helpful votes)
CREATE TABLE IF NOT EXISTS community_reactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES community_replies(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id),
  UNIQUE(user_id, reply_id)
);

-- Community bookmarks
CREATE TABLE IF NOT EXISTS community_bookmarks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Community reports
CREATE TABLE IF NOT EXISTS community_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES community_replies(id) ON DELETE CASCADE,
  message_id uuid,
  reason text NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'misleading', 'harassment', 'other')),
  details text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz DEFAULT now()
);

-- Live subject rooms
CREATE TABLE IF NOT EXISTS community_rooms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subject text NOT NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Live room messages
CREATE TABLE IF NOT EXISTS community_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid REFERENCES community_rooms(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_name text NOT NULL,
  author_avatar text,
  content text NOT NULL,
  reply_to uuid REFERENCES community_messages(id) ON DELETE SET NULL,
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Room presence tracking
CREATE TABLE IF NOT EXISTS community_presence (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  room_id uuid REFERENCES community_rooms(id) ON DELETE CASCADE NOT NULL,
  user_name text NOT NULL,
  user_avatar text,
  last_seen timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, room_id)
);

-- Study groups
CREATE TABLE IF NOT EXISTS community_study_groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  subject text NOT NULL,
  topic text,
  description text,
  creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  max_members integer DEFAULT 20,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_study_group_members (
  group_id uuid REFERENCES community_study_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_status ON community_posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_category ON community_posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_author ON community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_replies_post ON community_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_messages_room ON community_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_presence_room ON community_presence(room_id);

-- Seed default rooms
INSERT INTO community_rooms (subject, name, slug, description, sort_order) VALUES
  ('Biology', 'Biology HL', 'biology-hl', 'Higher Level Biology discussion', 1),
  ('Biology', 'Biology SL', 'biology-sl', 'Standard Level Biology discussion', 2),
  ('Biology', 'Biology IA & EE', 'biology-ia-ee', 'Coursework help for Biology', 3),
  ('Chemistry', 'Chemistry HL', 'chemistry-hl', 'Higher Level Chemistry discussion', 4),
  ('Chemistry', 'Chemistry SL', 'chemistry-sl', 'Standard Level Chemistry discussion', 5),
  ('Chemistry', 'Chemistry IA & EE', 'chemistry-ia-ee', 'Coursework help for Chemistry', 6),
  ('Physics', 'Physics HL', 'physics-hl', 'Higher Level Physics discussion', 7),
  ('Physics', 'Physics SL', 'physics-sl', 'Standard Level Physics discussion', 8),
  ('Physics', 'Physics IA & EE', 'physics-ia-ee', 'Coursework help for Physics', 9),
  ('Mathematics', 'Math AA HL', 'math-aa-hl', 'Analysis and Approaches HL', 10),
  ('Mathematics', 'Math AA SL', 'math-aa-sl', 'Analysis and Approaches SL', 11),
  ('Mathematics', 'Math AI HL', 'math-ai-hl', 'Applications and Interpretation HL', 12),
  ('Mathematics', 'Math AI SL', 'math-ai-sl', 'Applications and Interpretation SL', 13),
  ('Computer Science', 'Comp Sci HL', 'cs-hl', 'Higher Level Computer Science', 14),
  ('Computer Science', 'Comp Sci SL', 'cs-sl', 'Standard Level Computer Science', 15),
  ('Economics', 'Economics HL', 'economics-hl', 'Higher Level Economics', 16),
  ('Economics', 'Economics SL', 'economics-sl', 'Standard Level Economics', 17),
  ('History', 'History HL', 'history-hl', 'Higher Level History', 18),
  ('History', 'History SL', 'history-sl', 'Standard Level History', 19),
  ('Geography', 'Geography HL', 'geography-hl', 'Higher Level Geography', 20),
  ('Geography', 'Geography SL', 'geography-sl', 'Standard Level Geography', 21),
  ('English', 'English Lit HL', 'english-lit-hl', 'English Literature HL', 22),
  ('English', 'English Lit SL', 'english-lit-sl', 'English Literature SL', 23),
  ('English', 'English Lang & Lit', 'english-lang-lit', 'English Language & Literature', 24),
  ('Languages', 'Language B HL', 'lang-b-hl', 'Language Acquisition HL', 25),
  ('Languages', 'Language B SL', 'lang-b-sl', 'Language Acquisition SL', 26),
  ('Business Management', 'Business HL', 'business-hl', 'Higher Level Business Management', 27),
  ('Business Management', 'Business SL', 'business-sl', 'Standard Level Business Management', 28),
  ('TOK', 'TOK Exhibition', 'tok-exhibition', 'Theory of Knowledge Exhibition', 29),
  ('TOK', 'TOK Essay', 'tok-essay', 'Theory of Knowledge Essay', 30),
  ('Extended Essay', 'EE General Support', 'ee-general', 'Extended Essay general advice', 31),
  ('General IB', 'IB General Chat', 'ib-general', 'General IB discussion', 32)
ON CONFLICT (slug) DO NOTHING;

-- Enable Realtime on messages table
ALTER PUBLICATION supabase_realtime ADD TABLE community_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE community_presence;
