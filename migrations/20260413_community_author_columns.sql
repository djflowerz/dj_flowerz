-- Add author columns to community_posts so we don't need a D1 users JOIN
-- (Users live in Supabase/R2, not D1)
ALTER TABLE community_posts ADD COLUMN author_name TEXT DEFAULT '';
ALTER TABLE community_posts ADD COLUMN author_avatar TEXT DEFAULT '';
ALTER TABLE community_posts ADD COLUMN author_role TEXT DEFAULT 'user';

-- Add author columns to community_comments
ALTER TABLE community_comments ADD COLUMN author_name TEXT DEFAULT '';
ALTER TABLE community_comments ADD COLUMN author_avatar TEXT DEFAULT '';

-- Add following_name / following_avatar to follows for quick display
ALTER TABLE community_follows ADD COLUMN following_name TEXT DEFAULT '';
ALTER TABLE community_follows ADD COLUMN following_avatar TEXT DEFAULT '';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_posts_user ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_community_posts_marketplace ON community_posts(is_marketplace);
CREATE INDEX IF NOT EXISTS idx_community_likes_post ON community_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_community_likes_user ON community_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_follows_follower ON community_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_community_follows_following ON community_follows(following_id);
