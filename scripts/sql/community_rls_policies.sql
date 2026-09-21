-- Enable RLS on all community tables
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_study_group_members ENABLE ROW LEVEL SECURITY;

-- ── Posts ────────────────────────────────────────────────────────
-- Anyone can read approved posts
CREATE POLICY "Anyone can read approved posts" ON community_posts FOR SELECT USING (status = 'approved');
-- Users can read their own posts regardless of status
CREATE POLICY "Users can read their own posts" ON community_posts FOR SELECT USING (auth.uid() = author_id);
-- Admins can read all posts
CREATE POLICY "Admins can read all posts" ON community_posts FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
-- Authenticated users can insert posts (must be their own ID)
CREATE POLICY "Users can insert posts" ON community_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
-- Users can update their own posts
CREATE POLICY "Users can update their own posts" ON community_posts FOR UPDATE USING (auth.uid() = author_id);
-- Admins can update any post (for moderation)
CREATE POLICY "Admins can update any post" ON community_posts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
-- Admins can delete any post
CREATE POLICY "Admins can delete any post" ON community_posts FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ── Replies ──────────────────────────────────────────────────────
CREATE POLICY "Anyone can read replies" ON community_replies FOR SELECT USING (true);
CREATE POLICY "Users can insert replies" ON community_replies FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update own replies" ON community_replies FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Admins can delete replies" ON community_replies FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ── Reactions & Bookmarks ─────────────────────────────────────────
CREATE POLICY "Users manage own reactions" ON community_reactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own bookmarks" ON community_bookmarks FOR ALL USING (auth.uid() = user_id);

-- ── Reports ───────────────────────────────────────────────────────
CREATE POLICY "Users can insert reports" ON community_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins can view reports" ON community_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can update reports" ON community_reports FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ── Live Rooms & Messages ─────────────────────────────────────────
CREATE POLICY "Anyone can read rooms" ON community_rooms FOR SELECT USING (true);
CREATE POLICY "Anyone can read messages" ON community_messages FOR SELECT USING (true);
CREATE POLICY "Users can insert messages" ON community_messages FOR INSERT WITH CHECK (auth.uid() = author_id);

-- ── Presence ──────────────────────────────────────────────────────
CREATE POLICY "Anyone can read presence" ON community_presence FOR SELECT USING (true);
CREATE POLICY "Users manage own presence" ON community_presence FOR ALL USING (auth.uid() = user_id);

-- ── Study Groups ──────────────────────────────────────────────────
CREATE POLICY "Anyone can read study groups" ON community_study_groups FOR SELECT USING (true);
CREATE POLICY "Users can insert study groups" ON community_study_groups FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users manage own group membership" ON community_study_group_members FOR ALL USING (auth.uid() = user_id);
