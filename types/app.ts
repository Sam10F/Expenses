import type { Database } from './supabase'

// ============================================================
// Raw DB row types
// ============================================================
export type Group    = Database['public']['Tables']['groups']['Row']
export type Member   = Database['public']['Tables']['members']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Expense  = Database['public']['Tables']['expenses']['Row']
export type ExpenseSplit = Database['public']['Tables']['expense_splits']['Row']

// ============================================================
// Insert types
// ============================================================
export type GroupInsert    = Database['public']['Tables']['groups']['Insert']
export type MemberInsert   = Database['public']['Tables']['members']['Insert']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type ExpenseInsert  = Database['public']['Tables']['expenses']['Insert']
export type SplitInsert    = Database['public']['Tables']['expense_splits']['Insert']

// ============================================================
// Derived / enriched types
// ============================================================

/** Group with computed stats */
export interface GroupWithStats extends Group {
  memberCount:  number
  expenseCount: number
  totalAmount:  number
}

/** Member with computed net balance */
export interface MemberWithBalance extends Member {
  /** Positive = this member is owed money; negative = owes money */
  balance: number
}

/** Category with spending stats */
export interface CategoryWithStats extends Category {
  totalAmount: number
  percentage:  number
}

/** Expense split enriched with member data */
export interface SplitWithMember extends ExpenseSplit {
  member: Member
}

/** Expense enriched with related data */
export interface ExpenseWithDetails extends Expense {
  paidByMember: Member
  category:     Category | null
  splits:       SplitWithMember[]
}

/** A suggested settlement transaction */
export interface Settlement {
  from:   Member
  to:     Member
  amount: number
}

/** Values to pre-fill when opening the expense modal from a settlement row */
export interface ExpensePrefill {
  title:          string
  amount:         number
  paid_by:        string // member ID of the payer (settlement "from")
  only_member_id: string // only this member included in split (settlement "to")
}

// ============================================================
// Form / payload types
// ============================================================

export interface CreateGroupPayload {
  name:        string
  description: string
  color:       string
  members:     string[] // member names
}

export interface UpdateGroupPayload {
  name?:        string
  description?: string
  color?:       string
}

export interface CreateExpensePayload {
  title:       string
  amount:      number
  date:        string  // ISO date string YYYY-MM-DD
  paid_by:     string  // member ID
  category_id: string  // category ID
  splits: Array<{
    member_id:   string
    amount:      number
    is_included: boolean
  }>
}

export interface UpdateExpensePayload extends CreateExpensePayload {
  id: string
}

export interface CreateCategoryPayload {
  name:  string
  color: string
  icon:  string
}

export interface AddMemberPayload {
  name: string
}

// ============================================================
// Color / icon constants
// ============================================================

export const GROUP_COLORS = [
  'indigo', 'amber', 'emerald', 'rose', 'sky', 'violet', 'orange',
] as const

export type GroupColor = typeof GROUP_COLORS[number]

export const CATEGORY_COLORS = [
  'indigo', 'amber', 'emerald', 'rose', 'sky', 'violet', 'orange', 'teal', 'pink', 'slate',
] as const

export type CategoryColor = typeof CATEGORY_COLORS[number]

export const CATEGORY_ICONS = [
  'general', 'food', 'home', 'transport', 'travel', 'entertainment',
  'shopping', 'health', 'education', 'utilities', 'drinks', 'work',
  'sports', 'gifts', 'tech',
] as const

export type CategoryIcon = typeof CATEGORY_ICONS[number]
