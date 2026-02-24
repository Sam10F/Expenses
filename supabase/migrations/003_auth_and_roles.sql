-- ============================================================
-- Expenses App — Auth, Roles & Invitations
-- ============================================================

-- profiles: links Supabase auth.users to usernames
-- (username is what users see; the underlying auth email is synthetic and never shown)
CREATE TABLE profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT        UNIQUE NOT NULL
                         CHECK (length(username) >= 3 AND length(username) <= 20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Server uses service_role key (bypasses RLS). These policies protect client-direct access.
CREATE POLICY "profiles_select"      ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own"  ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own"  ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- ============================================================
-- Extend members with user_id + role
-- ============================================================

ALTER TABLE members
  ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN role    TEXT NOT NULL DEFAULT 'user'
                     CHECK (role IN ('admin', 'user', 'watcher'));

CREATE INDEX idx_members_user_id ON members(user_id);

-- ============================================================
-- Extend expenses with created_by (for user-role permission checks)
-- ============================================================

ALTER TABLE expenses
  ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================================
-- Invitations
-- ============================================================

CREATE TABLE invitations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  invited_by      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_user_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT        NOT NULL DEFAULT 'user'
                              CHECK (role IN ('user', 'watcher')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, invited_user_id)
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_invitations_invited_user_id ON invitations(invited_user_id);
CREATE INDEX idx_invitations_group_id        ON invitations(group_id);

-- Invited user and the inviter can read the invitation.
CREATE POLICY "invitations_select" ON invitations FOR SELECT TO authenticated
  USING (invited_user_id = auth.uid() OR invited_by = auth.uid());

-- Admin (invited_by) can create invitations.
CREATE POLICY "invitations_insert" ON invitations FOR INSERT TO authenticated
  WITH CHECK (invited_by = auth.uid());

-- Invited user can update (accept/decline).
CREATE POLICY "invitations_update" ON invitations FOR UPDATE TO authenticated
  USING (invited_user_id = auth.uid());

-- Inviter (admin) can delete/cancel.
CREATE POLICY "invitations_delete" ON invitations FOR DELETE TO authenticated
  USING (invited_by = auth.uid());

-- ============================================================
-- Remove Phase 1 permissive anon policies
-- Server routes use service_role key (bypasses RLS); client never calls DB directly.
-- ============================================================

DROP POLICY "public_all" ON groups;
DROP POLICY "public_all" ON members;
DROP POLICY "public_all" ON categories;
DROP POLICY "public_all" ON expenses;
DROP POLICY "public_all" ON expense_splits;
