-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (linked to auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Customer costs (Admin only)
CREATE TABLE customer_costs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount BIGINT NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Phí dịch vụ',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NTP Contracts (Nhà Thầu Phụ)
CREATE TABLE ntp_contracts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  ntp_name TEXT NOT NULL,
  contract_amount BIGINT NOT NULL DEFAULT 0,
  received_amount BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NTP Expenses
CREATE TABLE ntp_expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  ntp_contract_id UUID REFERENCES ntp_contracts(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'Phát sinh',
  description TEXT NOT NULL,
  planned_amount BIGINT NOT NULL DEFAULT 0,
  actual_amount BIGINT NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'completed')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- P/L Entries
CREATE TABLE pl_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  revenue BIGINT NOT NULL DEFAULT 0,
  cost BIGINT NOT NULL DEFAULT 0,
  note TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Other Commitments
CREATE TABLE other_commitments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL DEFAULT 'Khác',
  description TEXT NOT NULL,
  amount BIGINT NOT NULL DEFAULT 0,
  paid_amount BIGINT NOT NULL DEFAULT 0,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ntp_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ntp_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pl_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE other_commitments ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Profiles: users can read all, update own
CREATE POLICY "profiles_read_all" ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Projects: authenticated users can read all, admin can write
CREATE POLICY "projects_read_all" ON projects FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "projects_insert_admin" ON projects FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "projects_update_admin" ON projects FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "projects_delete_admin" ON projects FOR DELETE USING (get_user_role() = 'admin');

-- Customer costs: ADMIN ONLY
CREATE POLICY "customer_costs_admin_only" ON customer_costs FOR ALL USING (get_user_role() = 'admin');

-- NTP Contracts: authenticated users read, admin write
CREATE POLICY "ntp_contracts_read" ON ntp_contracts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ntp_contracts_write" ON ntp_contracts FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "ntp_contracts_update" ON ntp_contracts FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "ntp_contracts_delete" ON ntp_contracts FOR DELETE USING (get_user_role() = 'admin');

-- NTP Expenses: authenticated users read, admin write
CREATE POLICY "ntp_expenses_read" ON ntp_expenses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ntp_expenses_write" ON ntp_expenses FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "ntp_expenses_update" ON ntp_expenses FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "ntp_expenses_delete" ON ntp_expenses FOR DELETE USING (get_user_role() = 'admin');

-- P/L Entries
CREATE POLICY "pl_entries_read" ON pl_entries FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "pl_entries_write" ON pl_entries FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "pl_entries_update" ON pl_entries FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "pl_entries_delete" ON pl_entries FOR DELETE USING (get_user_role() = 'admin');

-- Other commitments
CREATE POLICY "other_commitments_read" ON other_commitments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "other_commitments_write" ON other_commitments FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "other_commitments_update" ON other_commitments FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "other_commitments_delete" ON other_commitments FOR DELETE USING (get_user_role() = 'admin');

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
