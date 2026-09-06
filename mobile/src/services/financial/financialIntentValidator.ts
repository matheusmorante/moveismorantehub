import { ParsedFinancialIntent } from '../financialAiAssistantService';

/**
 * Validador determinístico do Backend para Intenções Financeiras.
 * O backend recalcula e valida totais, parcelas, divergências e vencimentos.
 */
export function validateParsedIntent(
  draft: ParsedFinancialIntent,
  todayStr: string
): ParsedFinancialIntent {
  const result: ParsedFinancialIntent = JSON.parse(JSON.stringify(draft));

  if (!result.intentType) result.intentType = 'SINGLE_TRANSACTION';

  // 1. Caso especial: Vendas de produtos/serviços
  if (result.questionToUser && result.questionToUser.includes('pedidos no ERP')) {
    result.isReadyForConfirmation = false;
    return result;
  }

  // 2. Operações com Parcelas / Múltiplos Boletos
  if (result.intentType === 'INSTALLMENT' || (result.installmentList && result.installmentList.length > 0)) {
    result.intentType = 'INSTALLMENT';
    const declaredTotal = result.totalAmount || result.amount || 0;

    if (result.installmentList && result.installmentList.length > 0) {
      const sum = result.installmentList.reduce((acc, item) => acc + (item.amount || 0), 0);

      // A) Validação de Divergência Matemática: Total Declarado vs Soma das Parcelas
      if (declaredTotal > 0 && Math.abs(declaredTotal - sum) > 0.01) {
        const diff = Math.abs(declaredTotal - sum);
        const formattedTotal = declaredTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const formattedSum = sum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const formattedDiff = diff.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        result.missingFields = ['installmentAmounts'];
        result.isReadyForConfirmation = false;
        result.questionToUser = `Os valores não batem:\nTotal informado: ${formattedTotal}\nBoletos informados: ${formattedSum}\nFaltam ${formattedDiff}. Faltou algum boleto ou o total correto é ${formattedSum}?`;
        return result;
      }

      // Se não havia totalAmount declarado previamente, assume a soma dos boletos
      if (!result.totalAmount && sum > 0) {
        result.totalAmount = sum;
        result.amount = sum;
      }

      // B) Auto-projeção de vencimentos consecutivos mensais se houver regra de dia (ex: dia 20) ou data inicial
      const hasMissingDates = result.installmentList.some(i => !i.dueDate);
      if (hasMissingDates) {
        let baseDay: number | null = result.dueDay || null;
        let startMonthOffset = 1; // Padrão: próximo mês
        let startYear = new Date(todayStr || Date.now()).getFullYear();

        const firstWithDate = result.installmentList.find(i => i.dueDate);
        if (firstWithDate?.dueDate) {
          const parts = firstWithDate.dueDate.split('-');
          startYear = parseInt(parts[0], 10);
          const monthIdx = parseInt(parts[1], 10) - 1;
          baseDay = parseInt(parts[2], 10);
          const currentMonth = new Date(todayStr).getMonth();
          startMonthOffset = monthIdx - currentMonth;
          if (startMonthOffset <= 0) {
            startMonthOffset = 1;
          }
        }

        if (!baseDay) {
          const dayMatch = (result.questionToUser || '').match(/dia\s*(\d{1,2})/i);
          if (dayMatch) baseDay = parseInt(dayMatch[1], 10);
        }

        if (baseDay && baseDay >= 1 && baseDay <= 31) {
          const today = new Date(todayStr || Date.now());
          const startMonth = today.getMonth() + startMonthOffset;

          result.installmentList = result.installmentList.map((item, idx) => {
            let m = startMonth + idx;
            let y = startYear;
            while (m > 11) {
              m -= 12;
              y += 1;
            }
            const formattedMonth = String(m + 1).padStart(2, '0');
            const formattedDay = String(baseDay).padStart(2, '0');
            return {
              ...item,
              dueDate: item.dueDate || `${y}-${formattedMonth}-${formattedDay}`,
            };
          });
        }
      }

      // C) Verificar se restaram parcelas sem vencimento
      const remainingMissingDates = result.installmentList.some(i => !i.dueDate);
      if (remainingMissingDates) {
        result.missingFields = ['installmentDueDates'];
        result.isReadyForConfirmation = false;
        if (!result.questionToUser || result.questionToUser.includes('Confere?')) {
          const supplierName = result.supplier || result.counterparty || 'fornecedor';
          result.questionToUser = `Qual o vencimento do primeiro boleto? Os demais vencem mensalmente na mesma data?`;
        }
        return result;
      }
    }

    // Lançamento em lote válido!
    result.missingFields = [];
    result.isReadyForConfirmation = true;
    result.questionToUser = 'Confere?';
    return result;
  }

  // 3. Lançamento Único, Consulta ou Atualização
  if (result.intentType === 'QUERY_OR_UPDATE' || (result.candidateAccounts && result.candidateAccounts.length > 0)) {
    result.missingFields = [];
    result.isReadyForConfirmation = false;
    return result;
  }

  if (!result.amount && !result.totalAmount && !result.matchedAccount) {
    if (result.unknownByUser?.includes('amount')) {
      result.missingFields = [];
      result.isReadyForConfirmation = false;
      if (!result.questionToUser) {
        result.questionToUser = `Buscando movimentações de ${result.supplier || result.counterparty || 'fornecedor'} no ERP...`;
      }
      return result;
    }

    result.missingFields = ['amount'];
    result.isReadyForConfirmation = false;
    result.questionToUser = 'Qual foi o valor dessa movimentação?';
    return result;
  }

  if (result.intentType === 'PAYABLE_BILL' && !result.dueDate && !result.date) {
    if (result.unknownByUser?.includes('dueDate') || result.unknownByUser?.includes('date')) {
      result.missingFields = [];
      result.isReadyForConfirmation = false;
      return result;
    }

    result.missingFields = ['dueDate'];
    result.isReadyForConfirmation = false;
    result.questionToUser = `Qual é o vencimento deste boleto de ${result.supplier || result.description || 'conta'}?`;
    return result;
  }

  result.missingFields = [];
  result.isReadyForConfirmation = true;
  result.questionToUser = 'Confere?';
  return result;
}
