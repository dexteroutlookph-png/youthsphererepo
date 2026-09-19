BEGIN;

ALTER TABLE legal_agreements
  ADD COLUMN IF NOT EXISTS agreement_type VARCHAR(40) NOT NULL DEFAULT 'terms_and_privacy',
  ADD COLUMN IF NOT EXISTS accepted BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS share_count INTEGER NOT NULL DEFAULT 0 CHECK (share_count >= 0);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'suspended', 'restricted'));

ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS category VARCHAR(30) NOT NULL DEFAULT 'GENERAL',
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE reward_transactions
  ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(40) NOT NULL DEFAULT 'stamp',
  ADD COLUMN IF NOT EXISTS previous_stamps INTEGER,
  ADD COLUMN IF NOT EXISTS new_stamps INTEGER,
  ADD COLUMN IF NOT EXISTS previous_points INTEGER,
  ADD COLUMN IF NOT EXISTS new_points INTEGER,
  ADD COLUMN IF NOT EXISTS actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reason TEXT;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS post_shares (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS moderation_actions (
  id SERIAL PRIMARY KEY,
  moderator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('post', 'comment', 'user', 'announcement', 'reward_card')),
  target_id INTEGER NOT NULL,
  action VARCHAR(30) NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_duplicate_open
  ON reports (reporter_id, target_type, target_id)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expiry ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_post_shares_post ON post_shares(post_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status_created ON reports(status, created_at DESC);

COMMIT;