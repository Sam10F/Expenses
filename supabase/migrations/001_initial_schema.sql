-- ============================================================
-- Expenses App — Initial Schema
-- ============================================================

-- Groups
CREATE TABLE groups (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  color       TEXT        NOT NULL DEFAULT 'indigo',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Members
CREATE TABLE members (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categories
CREATE TABLE categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  color       TEXT        NOT NULL DEFAULT 'gray',
  icon        TEXT        NOT NULL DEFAULT 'general',
  is_default  BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Expenses
CREATE TABLE expenses (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID           NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  paid_by     UUID           NOT NULL REFERENCES members(id),
  category_id UUID           REFERENCES categories(id) ON DELETE SET NULL,
  title       TEXT           NOT NULL,
  amount      NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  currency    TEXT           NOT NULL DEFAULT 'EUR',
  date        DATE           NOT NULL,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- Expense splits
CREATE TABLE expense_splits (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id  UUID           NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  member_id   UUID           NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount      NUMERIC(10, 2) NOT NULL,
  is_included BOOLEAN        NOT NULL DEFAULT true,
  UNIQUE (expense_id, member_id)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_members_group_id    ON members(group_id);
CREATE INDEX idx_categories_group_id ON categories(group_id);
CREATE INDEX idx_expenses_group_id   ON expenses(group_id);
CREATE INDEX idx_expenses_paid_by    ON expenses(paid_by);
CREATE INDEX idx_splits_expense_id   ON expense_splits(expense_id);
CREATE INDEX idx_splits_member_id    ON expense_splits(member_id);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE groups          ENABLE ROW LEVEL SECURITY;
ALTER TABLE members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits  ENABLE ROW LEVEL SECURITY;

-- Phase 1: no auth — allow full anon access
-- Server routes use service_role key (bypasses RLS); client never calls DB directly
CREATE POLICY "public_all" ON groups         FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON members        FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON categories     FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON expenses       FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON expense_splits FOR ALL TO anon USING (true) WITH CHECK (true);
