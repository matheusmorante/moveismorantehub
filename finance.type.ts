export type TransactionType = 'income' | 'expense';
export type PaymentStatus = 'pending' | 'paid' | 'cancelled' | 'overdue';

export interface FinancialCategory {
  id: string;
  name: string;
  type: TransactionType;
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
