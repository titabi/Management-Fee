-- Migration 002: Refactor PL and NTP to pl_summary + ncc_items

-- ─────────────────────────────────────────────
-- Create pl_summary table
-- ─────────────────────────────────────────────
CREATE TABLE pl_summary (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL UNIQUE,
  contract_value BIGINT NOT NULL DEFAULT 0,
  p11_profit BIGINT NOT NULL DEFAULT 0,
  excel_file_name TEXT,
  note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Create ncc_items table
-- ─────────────────────────────────────────────
CREATE TABLE ncc_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  contract_amount BIGINT NOT NULL DEFAULT 0,
  received_amount BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Alter ntp_expenses: add ncc_item_id, drop ntp_contract_id
-- ─────────────────────────────────────────────
ALTER TABLE ntp_expenses ADD COLUMN ncc_item_id UUID REFERENCES ncc_items(id) ON DELETE SET NULL;
ALTER TABLE ntp_expenses DROP COLUMN IF EXISTS ntp_contract_id;

-- ─────────────────────────────────────────────
-- Drop old tables
-- ─────────────────────────────────────────────
DROP TABLE IF EXISTS pl_entries;
DROP TABLE IF EXISTS ntp_contracts;

-- ─────────────────────────────────────────────
-- RLS for pl_summary
-- ─────────────────────────────────────────────
ALTER TABLE pl_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pl_summary_read" ON pl_summary FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "pl_summary_write" ON pl_summary FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "pl_summary_update" ON pl_summary FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "pl_summary_delete" ON pl_summary FOR DELETE USING (get_user_role() = 'admin');

-- ─────────────────────────────────────────────
-- RLS for ncc_items
-- ─────────────────────────────────────────────
ALTER TABLE ncc_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ncc_items_read" ON ncc_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ncc_items_write" ON ncc_items FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "ncc_items_update" ON ncc_items FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "ncc_items_delete" ON ncc_items FOR DELETE USING (get_user_role() = 'admin');
