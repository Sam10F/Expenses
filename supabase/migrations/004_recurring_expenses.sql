-- =====================================================
-- Migration 004: Recurring Expenses
-- Adds recurring_expenses and recurring_expense_splits
-- tables, RLS policies, pg_cron scheduling triggers,
-- and the function that materialises expenses from
-- recurring templates.
-- =====================================================

-- Enable pg_cron extension (no-op if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ---- Tables ----

CREATE TABLE IF NOT EXISTS recurring_expenses (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  title         TEXT        NOT NULL,
  amount        NUMERIC(10,2) NOT NULL,
  currency      TEXT        NOT NULL DEFAULT 'EUR',
  paid_by       UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  category_id   UUID        REFERENCES categories(id) ON DELETE SET NULL,
  frequency     TEXT        NOT NULL CHECK (frequency IN ('weekly', 'monthly')),
  day_of_week   SMALLINT    CHECK (day_of_week  BETWEEN 0 AND 6),
  day_of_month  SMALLINT    CHECK (day_of_month BETWEEN 1 AND 28),
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT frequency_day_check CHECK (
    (frequency = 'weekly'  AND day_of_week  IS NOT NULL AND day_of_month IS NULL) OR
    (frequency = 'monthly' AND day_of_month IS NOT NULL AND day_of_week  IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS recurring_expense_splits (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_expense_id UUID        NOT NULL REFERENCES recurring_expenses(id) ON DELETE CASCADE,
  member_id            UUID        NOT NULL REFERENCES members(id)            ON DELETE CASCADE,
  amount               NUMERIC(10,2) NOT NULL,
  is_included          BOOLEAN     NOT NULL DEFAULT true
);

-- ---- Indexes ----

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_group_id
  ON recurring_expenses(group_id);

CREATE INDEX IF NOT EXISTS idx_recurring_expense_splits_rid
  ON recurring_expense_splits(recurring_expense_id);

-- ---- RLS ----

ALTER TABLE recurring_expenses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expense_splits ENABLE ROW LEVEL SECURITY;

-- All group members can read recurring expenses for their groups
CREATE POLICY "recurring_expenses_select"
  ON recurring_expenses FOR SELECT TO authenticated
  USING (
    group_id IN (
      SELECT group_id FROM members WHERE user_id = auth.uid()
    )
  );

-- Only admins can insert / update / delete recurring expenses
CREATE POLICY "recurring_expenses_insert"
  ON recurring_expenses FOR INSERT TO authenticated
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM members WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "recurring_expenses_update"
  ON recurring_expenses FOR UPDATE TO authenticated
  USING (
    group_id IN (
      SELECT group_id FROM members WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM members WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "recurring_expenses_delete"
  ON recurring_expenses FOR DELETE TO authenticated
  USING (
    group_id IN (
      SELECT group_id FROM members WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Splits: read for all group members
CREATE POLICY "recurring_expense_splits_select"
  ON recurring_expense_splits FOR SELECT TO authenticated
  USING (
    recurring_expense_id IN (
      SELECT re.id FROM recurring_expenses re
      WHERE re.group_id IN (
        SELECT group_id FROM members WHERE user_id = auth.uid()
      )
    )
  );

-- Splits: write for admins only
CREATE POLICY "recurring_expense_splits_insert"
  ON recurring_expense_splits FOR INSERT TO authenticated
  WITH CHECK (
    recurring_expense_id IN (
      SELECT re.id FROM recurring_expenses re
      WHERE re.group_id IN (
        SELECT group_id FROM members WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
  );

CREATE POLICY "recurring_expense_splits_update"
  ON recurring_expense_splits FOR UPDATE TO authenticated
  USING (
    recurring_expense_id IN (
      SELECT re.id FROM recurring_expenses re
      WHERE re.group_id IN (
        SELECT group_id FROM members WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
  );

CREATE POLICY "recurring_expense_splits_delete"
  ON recurring_expense_splits FOR DELETE TO authenticated
  USING (
    recurring_expense_id IN (
      SELECT re.id FROM recurring_expenses re
      WHERE re.group_id IN (
        SELECT group_id FROM members WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
  );

-- ---- updated_at auto-maintenance ----

CREATE OR REPLACE FUNCTION update_recurring_expense_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recurring_expenses_updated_at
  BEFORE UPDATE ON recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION update_recurring_expense_updated_at();

-- ---- Function: materialise a recurring expense into actual expenses ----
-- Called by pg_cron jobs. SECURITY DEFINER so it can write expenses
-- table without a user JWT context.

CREATE OR REPLACE FUNCTION create_expense_from_recurring(recurring_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  rec recurring_expenses%ROWTYPE;
  eid UUID;
BEGIN
  SELECT * INTO rec
  FROM recurring_expenses
  WHERE id = recurring_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO expenses (
    group_id, paid_by, category_id, title, amount, currency,
    date, created_by, created_at, updated_at
  ) VALUES (
    rec.group_id, rec.paid_by, rec.category_id, rec.title, rec.amount, rec.currency,
    CURRENT_DATE, rec.created_by, now(), now()
  )
  RETURNING id INTO eid;

  INSERT INTO expense_splits (expense_id, member_id, amount, is_included)
  SELECT eid, member_id, amount, is_included
  FROM   recurring_expense_splits
  WHERE  recurring_expense_id = recurring_id;
END;
$$;

-- ---- Trigger: manage pg_cron job when a recurring expense is inserted or updated ----

CREATE OR REPLACE FUNCTION manage_recurring_expense_cron()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  job_name TEXT     := 'recurring_expense_' || NEW.id;
  schedule TEXT;
BEGIN
  -- Remove any previously scheduled job for this row (ignore if absent)
  BEGIN
    PERFORM cron.unschedule(job_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  IF NEW.is_active THEN
    IF NEW.frequency = 'weekly' THEN
      -- e.g. 0=Sun, 1=Mon … 6=Sat → "0 8 * * 1" = 08:00 every Monday
      schedule := '0 8 * * ' || NEW.day_of_week::TEXT;
    ELSE
      -- e.g. "0 8 15 * *" = 08:00 on the 15th of every month
      schedule := '0 8 ' || NEW.day_of_month::TEXT || ' * *';
    END IF;

    PERFORM cron.schedule(
      job_name,
      schedule,
      format($cmd$SELECT create_expense_from_recurring('%s'::uuid)$cmd$, NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_manage_recurring_expense_cron
  AFTER INSERT OR UPDATE ON recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION manage_recurring_expense_cron();

-- ---- Trigger: remove pg_cron job when a recurring expense is deleted ----

CREATE OR REPLACE FUNCTION cleanup_recurring_expense_cron()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('recurring_expense_' || OLD.id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_cleanup_recurring_expense_cron
  AFTER DELETE ON recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION cleanup_recurring_expense_cron();
