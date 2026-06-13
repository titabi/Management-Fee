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

export type NtpContractStatus = 'pending' | 'active' | 'completed'

export interface NtpContract {
  id: string
  project_id: string
  ntp_name: string
  contract_amount: number
  received_amount: number
  status: NtpContractStatus
  date: string
  note: string | null
  created_at: string
}

export type NtpExpenseCategory = 'Phát sinh' | 'Mua vật tư' | 'Thuê CTV' | 'Thuê thợ' | 'Khác'
export type NtpExpenseStatus = 'planned' | 'completed'

export interface NtpExpense {
  id: string
  project_id: string
  ntp_contract_id: string | null
  category: string
  description: string
  planned_amount: number
  actual_amount: number
  date: string
  status: NtpExpenseStatus
  note: string | null
  created_at: string
}

export interface PlEntry {
  id: string
  project_id: string
  category: string
  revenue: number
  cost: number
  note: string | null
  date: string
  created_at: string
}

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
  totalFromNtp: number
  totalPlanned: number
  totalSpent: number
  balance: number
}
