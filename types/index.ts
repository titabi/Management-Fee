export type UserRole = 'admin' | 'member'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
}

export type ProjectStatus = 'active' | 'completed' | 'paused'

export interface Project {
  id: string
  name: string
  code: string
  client_name: string
  status: ProjectStatus
  created_at: string
  created_by: string | null
}

export interface CustomerCost {
  id: string
  project_id: string
  description: string
  amount: number
  category: string
  date: string
  note: string | null
  created_at: string
}

export type NccItemStatus = 'pending' | 'active' | 'completed'

export interface NCCItem {
  id: string
  project_id: string
  name: string
  contract_amount: number
  received_amount: number
  status: NccItemStatus
  note: string | null
  created_at: string
}

// Alias for backward compat within components
export type NccItem = NCCItem

export type NtpExpenseCategory = 'Phát sinh' | 'Mua vật tư' | 'Thuê CTV' | 'Thuê thợ' | 'Khác'
export type NtpExpenseStatus = 'planned' | 'completed'

export interface NtpExpense {
  id: string
  project_id: string
  ncc_item_id: string | null
  category: string
  description: string
  planned_amount: number
  actual_amount: number
  date: string
  status: NtpExpenseStatus
  note: string | null
  created_at: string
}

export interface PLSummary {
  id: string
  project_id: string
  contract_value: number
  p11_profit: number
  excel_file_name: string | null
  note: string | null
  updated_at: string
}

// Alias
export type PlSummary = PLSummary

export type CommitmentType = 'Chi phí hãng' | 'Phí môi giới' | 'Khác'
export type CommitmentStatus = 'pending' | 'paid'

export interface OtherCommitment {
  id: string
  project_id: string
  type: string
  description: string
  amount: number
  paid_amount: number
  due_date: string | null
  status: CommitmentStatus
  note: string | null
  created_at: string
}

export interface ProjectSummary {
  totalFromNcc: number
  totalPlanned: number
  totalSpent: number
  balance: number
}
