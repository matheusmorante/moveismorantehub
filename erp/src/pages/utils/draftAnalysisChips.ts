import type { ParsedFinancialIntent } from '../../../../mobile/src/services/financial/financialTypes';

export interface DraftAnalysisChip {
  id: string;
  key: string;
  label: string;
  type: 'income' | 'expense' | 'neutral' | 'pending' | 'loan';
  priority: number;
}

const formatDateLabel = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const lower = dateStr.toLowerCase().trim();
  if (lower === 'hoje' || lower === 'today') return 'Hoje';
  if (lower === 'amanhã' || lower === 'amanha') return 'Amanhã';
  if (lower === 'ontem') return 'Ontem';

  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${d}/${m}/${y}`;
  }

  return dateStr;
};

export const buildDraftAnalysisChips = (
  draft?: ParsedFinancialIntent | null
): DraftAnalysisChip[] => {
  if (!draft) return [];

  if (draft.batchDraftsList && draft.batchDraftsList.length >= 2) {
    const chips: DraftAnalysisChip[] = [];
    draft.batchDraftsList.forEach((item, idx) => {
      const typeText = item.type === 'expense' ? 'Saída' : 'Entrada';
      const amtText = item.amount ? `R$ ${item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Valor a definir';
      chips.push({
        id: `batch_${idx}`,
        key: `batch_${idx}`,
        label: `#${idx + 1} ${typeText} ${amtText} — ${item.description || 'Movimentação'}`,
        type: item.type === 'expense' ? 'expense' : 'income',
        priority: idx + 1,
      });
    });
    return chips;
  }

  const chips: DraftAnalysisChip[] = [];

  // 1. Tipo da Movimentação (Entrada / Saída)
  if (draft.type === 'expense') {
    chips.push({
      id: 'type',
      key: 'type',
      label: 'Saída',
      type: 'expense',
      priority: 1,
    });
  } else if (draft.type === 'income') {
    chips.push({
      id: 'type',
      key: 'type',
      label: 'Entrada',
      type: 'income',
      priority: 1,
    });
  } else if (draft.amount || draft.supplier || draft.counterparty) {
    chips.push({
      id: 'type',
      key: 'type',
      label: 'Tipo: Não informado',
      type: 'pending',
      priority: 1,
    });
  }

  // 2. Valor
  const val = draft.totalAmount || draft.amount;
  if (val && val > 0) {
    const formatted = val.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const label = draft.isEstimated
      ? `Valor: R$ ${formatted} (Estimativa)`
      : `Valor: R$ ${formatted}`;

    chips.push({
      id: 'amount',
      key: 'amount',
      label,
      type: draft.isEstimated ? 'pending' : 'neutral',
      priority: 2,
    });
  }

  // 3. Contraparte / Credor (Para / De / Credor)
  if (draft.isLoan && (draft.creditor || draft.counterparty)) {
    chips.push({
      id: 'counterparty',
      key: 'counterparty',
      label: `Credor: ${draft.creditor || draft.counterparty}`,
      type: 'loan',
      priority: 3,
    });
  } else if (draft.supplier || draft.counterparty) {
    const name = draft.supplier || draft.counterparty;
    let label = `Pessoa/Empresa: ${name}`;
    if (draft.type === 'expense') label = `Para: ${name}`;
    else if (draft.type === 'income') label = `De: ${name}`;

    chips.push({
      id: 'counterparty',
      key: 'counterparty',
      label,
      type: 'neutral',
      priority: 3,
    });
  }

  // 4. Categoria
  if (draft.businessPurpose === 'UNKNOWN' || draft.categoryName === 'UNKNOWN') {
    const descLower = (draft.description || '').toLowerCase();
    let expenseLabel = 'A identificar';
    if (/luz|energia/i.test(descLower)) expenseLabel = 'Energia elétrica';
    else if (/água|agua|sanepar/i.test(descLower)) expenseLabel = 'Água / Saneamento';
    else if (/internet|telefone/i.test(descLower)) expenseLabel = 'Internet / Telefone';
    else if (/aluguel|condomínio/i.test(descLower)) expenseLabel = 'Aluguel / Imóvel';

    chips.push({
      id: 'category',
      key: 'category',
      label: `Despesa: ${expenseLabel}`,
      type: 'pending',
      priority: 4,
    });
  } else if (draft.categoryName) {
    const isLoanCategory = draft.isLoan || draft.categoryName.toLowerCase().includes('empréstimo') || draft.categoryName.toLowerCase().includes('emprestimo');
    chips.push({
      id: 'category',
      key: 'category',
      label: isLoanCategory ? `Natureza: ${draft.categoryName}` : `Categoria: ${draft.categoryName}`,
      type: isLoanCategory ? 'loan' : 'neutral',
      priority: 4,
    });
  }

  // 5. Descrição
  if (draft.description) {
    chips.push({
      id: 'description',
      key: 'description',
      label: `Descrição: ${draft.description}`,
      type: 'neutral',
      priority: 5,
    });
  }

  // 6. Forma de Pagamento / Recebimento
  const isIncome = draft.type === 'income';
  const pmtLabel = isIncome ? 'Recebimento' : 'Pagamento';

  if (draft.paymentMethod && draft.paymentMethod !== 'UNKNOWN') {
    chips.push({
      id: 'paymentMethod',
      key: 'paymentMethod',
      label: `${pmtLabel}: ${draft.paymentMethod}`,
      type: 'neutral',
      priority: 6,
    });
  } else if (
    draft.missingFields?.includes('paymentMethod') ||
    draft.paymentMethod === 'UNKNOWN'
  ) {
    chips.push({
      id: 'paymentMethod',
      key: 'paymentMethod',
      label: `${pmtLabel}: Não informado`,
      type: 'pending',
      priority: 6,
    });
  }

  // 7. Conta Financeira
  if (draft.accountName) {
    chips.push({
      id: 'account',
      key: 'account',
      label: `Conta: ${draft.accountName}`,
      type: 'neutral',
      priority: 7,
    });
  }

  // 8. Data
  const dateStr = draft.date || draft.dueDate;
  if (dateStr) {
    chips.push({
      id: 'date',
      key: 'date',
      label: `Data: ${formatDateLabel(dateStr)}`,
      type: 'neutral',
      priority: 8,
    });
  }

  return chips.sort((a, b) => a.priority - b.priority);
};
