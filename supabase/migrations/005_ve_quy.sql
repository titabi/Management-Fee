-- Add "về Quỹ" (returned-to-fund) tracking values per project
ALTER TABLE pl_summary ADD COLUMN IF NOT EXISTS kh_ve_quy BIGINT NOT NULL DEFAULT 0;
ALTER TABLE pl_summary ADD COLUMN IF NOT EXISTS ncc_ve_quy BIGINT NOT NULL DEFAULT 0;
