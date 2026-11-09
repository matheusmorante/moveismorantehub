export type FinancialAccountKind = 'payable' | 'receivable';

export interface AgentFinancialCategoryLike {
  id: string | number;
  name: string;
  type: string;
}

export interface CategoryValidationResult {
  valid: boolean;
  code?: string;
  error?: string;
}

export const ALLOWED_PAYMENT_METHODS: readonly string[] = [
  'PIX',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Boleto',
  'Dinheiro',
  'TED',
  'Promissória',
  'Manual',
];

const stripAccents = (str: string) =>
  str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const normalizeFinancialPaymentMethod = (method?: string | null): string => {
  if (!method || !method.trim()) return 'Manual';
  const clean = method.trim();
  const cleanNormalized = stripAccents(clean);
  const found = ALLOWED_PAYMENT_METHODS.find(
    (m) => stripAccents(m) === cleanNormalized
  );
  return found || clean;
};

export const normalizeFinancialAccountKind = (
  raw?: string | null
): FinancialAccountKind | null => {
  if (!raw) return null;
  const clean = stripAccents(String(raw).trim());
  if (
    clean === 'payable' ||
    clean === 'pagar' ||
    clean === 'a_pagar' ||
    clean === 'a pagar' ||
    clean === 'despesa' ||
    clean === 'saida'
  ) {
    return 'payable';
  }
  if (
    clean === 'receivable' ||
    clean === 'receber' ||
    clean === 'a_receber' ||
    clean === 'a receber' ||
    clean === 'receita' ||
    clean === 'entrada'
  ) {
    return 'receivable';
  }
  return null;
};

export const normalizeFinancialDate = (rawDate?: string | null): string => {
  if (rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())) {
    return rawDate.trim();
  }
  return new Date().toISOString().split('T')[0];
};

export const validateTransactionCategoryAndPurpose = (
  category: AgentFinancialCategoryLike | undefined,
  tipo: 'income' | 'expense',
  finalidade?: string
): CategoryValidationResult => {
  if (!category) {
    return {
      valid: false,
      code: 'INVALID_CATEGORY',
      error:
        'A categoria precisa ser uma categoria oficial retornada por buscarCategoriasFinanceiras.',
    };
  }

  if (category.type !== tipo) {
    return {
      valid: false,
      code: 'CATEGORY_TYPE_MISMATCH',
      error: 'A categoria informada não corresponde ao tipo da movimentação.',
    };
  }

  const isProLabore = /pr[oó]-?l[aá]bore/i.test(category.name);
  const normalizedPurpose =
    finalidade === 'PERSONAL_PARTNER' || finalidade === 'PERSONAL'
      ? 'PERSONAL_PARTNER'
      : 'BUSINESS';

  if (tipo === 'expense' && normalizedPurpose === 'PERSONAL_PARTNER' && !isProLabore) {
    return {
      valid: false,
      code: 'PERSONAL_CATEGORY_REQUIRED',
      error: 'Uso particular deve usar a categoria Pró-labore.',
    };
  }

  if (tipo === 'expense' && normalizedPurpose === 'BUSINESS' && isProLabore) {
    return {
      valid: false,
      code: 'BUSINESS_CATEGORY_REQUIRED',
      error: 'A categoria Pró-labore é exclusiva para uso particular.',
    };
  }

  return { valid: true };
};

export interface PayableInsertInput {
  descricao: string;
  valor: number;
  dataVencimento: string;
  fornecedor?: string;
  fornecedorNome?: string;
  categoriaId?: string;
  formaPagamento?: string;
  observacoes?: string;
}

export const buildPayableInsertPayload = (input: PayableInsertInput) => {
  const supplierName = (input.fornecedorNome || input.fornecedor)?.trim() || null;
  return {
    description: input.descricao.trim(),
    amount: Number(input.valor.toFixed(2)),
    due_date: input.dataVencimento,
    supplier_name: supplierName,
    category_id: input.categoriaId || null,
    payment_method: input.formaPagamento ? normalizeFinancialPaymentMethod(input.formaPagamento) : null,
    notes: input.observacoes?.trim() || null,
    status: 'pending',
  };
};

export interface PayableUpdateInput {
  descricao?: string;
  valor?: number;
  dataVencimento?: string;
  fornecedor?: string;
  fornecedorNome?: string;
  categoriaId?: string;
  formaPagamento?: string;
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled';
  observacoes?: string;
}

export const buildPayableUpdatePayload = (input: PayableUpdateInput) => {
  const updates: Record<string, any> = {};
  if (input.descricao !== undefined) updates.description = input.descricao.trim();
  if (input.valor !== undefined) updates.amount = Number(input.valor.toFixed(2));
  if (input.dataVencimento !== undefined) updates.due_date = input.dataVencimento;
  const supplier = input.fornecedorNome !== undefined ? input.fornecedorNome : input.fornecedor;
  if (supplier !== undefined) updates.supplier_name = supplier ? supplier.trim() : null;
  if (input.categoriaId !== undefined) updates.category_id = input.categoriaId || null;
  if (input.formaPagamento !== undefined) {
    updates.payment_method = input.formaPagamento ? normalizeFinancialPaymentMethod(input.formaPagamento) : null;
  }
  if (input.status !== undefined) updates.status = input.status;
  if (input.observacoes !== undefined) updates.notes = input.observacoes ? input.observacoes.trim() : null;
  return updates;
};

export interface ReceivableInsertInput {
  descricao: string;
  valor: number;
  dataVencimento: string;
  cliente?: string;
  clienteNome?: string;
  categoriaId?: string;
  formaPagamento?: string;
  observacoes?: string;
}

export const buildReceivableInsertPayload = (input: ReceivableInsertInput) => {
  const customerName = (input.clienteNome || input.cliente)?.trim() || null;
  return {
    description: input.descricao.trim(),
    amount: Number(input.valor.toFixed(2)),
    due_date: input.dataVencimento,
    customer_name: customerName,
    category_id: input.categoriaId || null,
    payment_method: input.formaPagamento ? normalizeFinancialPaymentMethod(input.formaPagamento) : null,
    notes: input.observacoes?.trim() || null,
    status: 'pending',
  };
};

export interface ReceivableUpdateInput {
  descricao?: string;
  valor?: number;
  dataVencimento?: string;
  cliente?: string;
  clienteNome?: string;
  categoriaId?: string;
  formaPagamento?: string;
  status?: 'pending' | 'received' | 'overdue' | 'cancelled';
  observacoes?: string;
}

export const buildReceivableUpdatePayload = (input: ReceivableUpdateInput) => {
  const updates: Record<string, any> = {};
  if (input.descricao !== undefined) updates.description = input.descricao.trim();
  if (input.valor !== undefined) updates.amount = Number(input.valor.toFixed(2));
  if (input.dataVencimento !== undefined) updates.due_date = input.dataVencimento;
  const customer = input.clienteNome !== undefined ? input.clienteNome : input.cliente;
  if (customer !== undefined) updates.customer_name = customer ? customer.trim() : null;
  if (input.categoriaId !== undefined) updates.category_id = input.categoriaId || null;
  if (input.formaPagamento !== undefined) {
    updates.payment_method = input.formaPagamento ? normalizeFinancialPaymentMethod(input.formaPagamento) : null;
  }
  if (input.status !== undefined) updates.status = input.status;
  if (input.observacoes !== undefined) updates.notes = input.observacoes ? input.observacoes.trim() : null;
  return updates;
};
