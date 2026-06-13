-- Migration 004: Redesign - add kh_budget, ncc_budget to pl_summary
ALTER TABLE pl_summary ADD COLUMN IF NOT EXISTS kh_budget BIGINT NOT NULL DEFAULT 0;
ALTER TABLE pl_summary ADD COLUMN IF NOT EXISTS ncc_budget BIGINT NOT NULL DEFAULT 0;

-- Add customer_name to customer_costs (to split per customer within project)
ALTER TABLE customer_costs ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- Simplify ntp_expenses: add single 'amount' column
ALTER TABLE ntp_expenses ADD COLUMN IF NOT EXISTS amount BIGINT NOT NULL DEFAULT 0;
-- Populate amount from existing data
UPDATE ntp_expenses SET amount = CASE WHEN status = 'completed' THEN actual_amount ELSE planned_amount END;

-- Settings table for invite code and other settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES ('invite_code', 'NTP2026') ON CONFLICT DO NOTHING;

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_admin_read" ON settings FOR SELECT USING (get_user_role() = 'admin');
CREATE POLICY "settings_admin_write" ON settings FOR ALL USING (get_user_role() = 'admin');
