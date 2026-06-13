-- Migration 006: Quỹ ledger (về Quỹ per-line + Sổ chi Quỹ)

-- A. "về Quỹ" per-line on each NCC and each CPKH row
ALTER TABLE ncc_items ADD COLUMN IF NOT EXISTS ve_quy BIGINT NOT NULL DEFAULT 0;
ALTER TABLE customer_costs ADD COLUMN IF NOT EXISTS ve_quy BIGINT NOT NULL DEFAULT 0;

-- B. "Sổ chi Quỹ": người nhận + loại trên other_commitments
ALTER TABLE other_commitments ADD COLUMN IF NOT EXISTS recipient TEXT;
