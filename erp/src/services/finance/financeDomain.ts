import type {
  AccountPayable,
  AccountReceivable,
  FinancialCategory,
  FinancialTransaction,
  ResultNature,
} from '@/pages/types/finance.type';

export const FINANCE_LIST_PAGE_SIZE = 500;

export interface FinancialTransactionPageFilters {
  type?: 'income' | 'expense' | 'all';
  categoryId?: string;
  paymentMethod?: string;
  accountId?: string;
  createdBy?: string;
  search?: string;
}

export interface FinancialTransactionPage {
  rows: FinancialTransaction[];
  total_count: number;
  income_total: number;
  expense_total: number;
}

export interface FinancePayablesPage {
  items: AccountPayable[];
  total_count: number;
}

export interface FinanceReceivablesPage {
  items: AccountReceivable[];
  total_count: number;
}

export type PayableCategoryOption = Pick<FinancialCategory, 'id' | 'name' | 'parent_id'>;

export interface FinanceDashboardAccountSummary {
  pendingTotal: number;
  overdueTotal: number;
  total: number;
  count: number;
}

export interface FinanceDashboardForecastSummary {
  payables: FinanceDashboardAccountSummary;
  receivables: FinanceDashboardAccountSummary;
}

export type OrderableCategory = { id: string; name: string; parent_id?: string | null };

export const throwFinancialWriteError = (error: unknown, status?: number): never => {
  const code = (error as { code?: string } | null)?.code;
  // SQL/PostgREST validation errors are distinct from a lost/malformed reply.
  // Cardinality errors after RETURNING also cannot acknowledge a write.
  if (status === 0 || !code || !/^(?:[0-9A-Z]{5}|PGRST\d{3})$/.test(code)
    || code === 'PGRST116' || code === '40003' || code.startsWith('08')) throw { uncertain: true };
  throw error;
};

export const confirmedFinancialRow = <T extends { id: string }>(data: unknown, expectedId?: string): T => {
  if (!data || typeof data !== 'object' || !('id' in data) || typeof data.id !== 'string'
    || !data.id || (expectedId !== undefined && data.id !== expectedId)) throw { uncertain: true };
  return data as T;
};

export const orderFinancialCategories = <T extends OrderableCategory>(list: T[]): T[] => {
  const compare = (a: T, b: T) => {
    const isAOther = a.name.trim().toLowerCase().startsWith('outra');
    const isBOther = b.name.trim().toLowerCase().startsWith('outra');
    if (isAOther && !isBOther) return 1;
    if (!isAOther && isBOther) return -1;
    return a.name.localeCompare(b.name, 'pt-BR');
  };
  const roots = list.filter((category) => !category.parent_id).sort(compare);
  const ordered = roots.flatMap((root) => [
    root,
    ...list.filter((category) => category.parent_id === root.id).sort(compare),
  ]);
  const placed = new Set(ordered.map((category) => category.id));
  return [...ordered, ...list.filter((category) => !placed.has(category.id)).sort(compare)];
};

export const parseSummaryNumber = (value: unknown): number => {
  const parsed = typeof value === 'number' || typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) throw { uncertain: true };
  return parsed;
};

export const parseSummaryCount = (value: unknown): number => {
  const parsed = parseSummaryNumber(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw { uncertain: true };
  return parsed;
};

export const fetchAllFinancePages = async <T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>
): Promise<T[]> => {
  const rows: T[] = [];
  for (let from = 0; ; from += FINANCE_LIST_PAGE_SIZE) {
    const { data, error } = await buildQuery(from, from + FINANCE_LIST_PAGE_SIZE - 1);
    if (error) throw error;
    const page = Array.isArray(data) ? (data as T[]) : [];
    rows.push(...page);
    if (page.length < FINANCE_LIST_PAGE_SIZE) return rows;
  }
};

export function determineResultNature(
  categoryName?: string | null,
  type?: 'income' | 'expense'
): ResultNature {
  if (!categoryName) {
    return type === 'income' ? 'RECEITA' : 'DESPESA';
  }

  const nameLower = categoryName.toLowerCase().trim();

  if (
    nameLower.includes('aporte') ||
    nameLower.includes('empréstimo') ||
    nameLower.includes('emprestimo') ||
    nameLower.includes('financiamento') ||
    nameLower.includes('saldo inicial') ||
    nameLower.includes('devolução') ||
    nameLower.includes('devolucao') ||
    nameLower.includes('retirada de sócio') ||
    nameLower.includes('distribuição de lucros') ||
    nameLower.includes('distribuicao de lucros') ||
    nameLower.includes('amortização') ||
    nameLower.includes('amortizacao') ||
    nameLower.includes('compra de estoque') ||
    nameLower.includes('compra de mercadoria') ||
    nameLower.includes('compra de mercadorias')
  ) {
    return 'NAO_AFETA_RESULTADO';
  }

  return type === 'income' ? 'RECEITA' : 'DESPESA';
}
