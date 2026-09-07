export type ResultNature = 'RECEITA' | 'DESPESA' | 'NAO_AFETA_RESULTADO';

export interface FinancialCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
  movement_type?: 'income' | 'expense';
  result_nature?: ResultNature;
}

export interface FinancialTransaction {
  id: string;
  type: 'income' | 'expense'; // income = ENTRADA, expense = SAÍDA
  amount: number;
  date: string;
  transaction_time?: string | null;
  description: string;
  payment_method: string;
  category_id?: string | null;
  category_name?: string | null;
  result_nature?: ResultNature;
  account_id?: string | null;
  counterparty?: string | null;
  collaborator_id?: string | null;
  collaborator_name?: string | null;
  purpose?: string | null;
  vehicle_id?: string | null;
  due_date?: string | null;
  due_day?: number | null;
  is_recurring?: boolean | null;
  installments_total?: number | null;
  installment_number?: number | null;
  notes?: string | null;
  origin: 'MANUAL' | 'AI_ASSISTANT' | 'SALE_ORDER' | 'PURCHASE_ORDER' | 'PAYABLE_PAYMENT' | 'INITIAL_BALANCE' | 'IMPORT' | 'SYSTEM';
  created_by?: string | null;
  status: 'ACTIVE' | 'PENDING' | 'PAID' | 'REVERSED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
}

export interface MonthlySummary {
  income: number;   // Total de Entradas Efetivas
  expense: number;  // Total de Saídas Efetivas
  balance: number;  // Saldo Financeiro de Caixa
}

export interface CashFlowReport {
  initialBalance: number;
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
  finalBalance: number;
}

export interface IncomeStatementReport {
  grossRevenue: number;     // Receitas efetivas
  cmv: number;              // Custo da Mercadoria Vendida
  grossMargin: number;      // Receitas - CMV
  operatingExpenses: number;// Despesas operacionais e financeiras
  netResult: number;        // Resultado Líquido
  marginPercent: number;    // % Lucratividade
}

export interface MonthlyEvolutionItem {
  monthName: string;
  monthIndex: number;
  revenue: number;
  cmv: number;
  grossMargin: number;
  expenses: number;
  result: number;
  marginPercent: number;
}

export interface TransactionFilterOptions {
  type?: 'income' | 'expense' | 'all';
  categoryId?: string;
  paymentMethod?: string;
  createdBy?: string;
  collaboratorId?: string;
  searchQuery?: string;
}

export interface ConfirmDraftResult {
  success: boolean;
  recordId?: string;
  transactionIds?: string[];
  payableIds?: string[];
  error?: string;
}
