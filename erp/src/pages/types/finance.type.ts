export type TransactionType = 'income' | 'expense';
export type PaymentStatus = 'pending' | 'paid' | 'cancelled' | 'overdue';
export type ResultNature = 'RECEITA' | 'DESPESA' | 'NAO_AFETA_RESULTADO';

export interface FinancialCategory {
  id: string;
  name: string;
  type: TransactionType;
  parent_id?: string | null;
  result_nature?: ResultNature;
  created_at?: string;
  updated_at?: string;
}

export interface AccountPayable {
  id: string;
  description: string;
  amount: number;
  due_date: string; // ISO date
  status: PaymentStatus;
  category_id?: string;
  supplier_name?: string;
  payment_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AccountReceivable {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: PaymentStatus;
  category_id?: string;
  customer_name?: string;
  order_id?: string;
  payment_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FinancialTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  payment_method: string;
  category_id?: string;
  category_name?: string | null;
  result_nature?: ResultNature;
  purpose?: 'BUSINESS' | 'PERSONAL' | 'PERSONAL_PARTNER' | null;
  transaction_time?: string | null;
  account_id?: string | null;
  counterparty?: string | null;
  collaborator_id?: string | null;
  collaborator_name?: string | null;
  vehicle_id?: string | null;
  due_date?: string | null;
  due_day?: number | null;
  is_recurring?: boolean | null;
  installments_total?: number | null;
  installment_number?: number | null;
  origin?: 'MANUAL' | 'AI_ASSISTANT' | 'SALE_ORDER' | 'PURCHASE_ORDER' | 'PAYABLE_PAYMENT' | 'INITIAL_BALANCE' | 'IMPORT' | 'SYSTEM';
  created_by?: string | null;
  status?: 'ACTIVE' | 'PENDING' | 'PAID' | 'REVERSED' | 'CANCELLED';
  idempotency_key?: string;
  payable_id?: string;
  receivable_id?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RecurringExpense {
  id: string;
  description: string;
  amount: number;
  category_id?: string;
  frequency: 'monthly' | 'yearly';
  due_day: number;
  start_date: string;
  end_date?: string;
  active: boolean;
  last_processed_date?: string;
  created_at?: string;
  updated_at?: string;
}
