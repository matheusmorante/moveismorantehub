import type { ParsedFinancialIntent } from './financialTypes';
import { extractMultipleFinancialFactsWithValidator } from './financialBatchFactExtractor';
import { fallbackHeuristicParser, parsePtBrNumber } from './financialTextParser';
import { isBankFinancialInstitution } from './bankKeywords';
import { applyLoanValidationRules } from './validators/loanIntentValidator';
import { applyBusinessPurposeRules } from './validators/businessPurposeValidator';
import { buildGroupedQuestion } from './financialQuestionBuilder';

export { buildGroupedQuestion };

/**
 * Validador determinístico do Backend para Intenções Financeiras.
 * O backend recalcula e valida totais, parcelas, divergências e vencimentos.
 */
export function validateParsedIntent(
  draft: ParsedFinancialIntent,
  todayStr: string = new Date().toISOString().split('T')[0]
): ParsedFinancialIntent {
  const result: ParsedFinancialIntent = JSON.parse(JSON.stringify(draft));

  if (!result.type && (result as any).movementType) {
    result.type = (result as any).movementType;
  }
  if (result.type) {
    result.type =
      result.type.toLowerCase() === 'income' || result.type.toLowerCase() === 'in'
        ? 'income'
        : 'expense';
  } else {
    result.type = 'expense';
  }

  if (
    !result.intentType ||
    result.intentType === 'INSTALLMENT' ||
    result.intentType === 'RECURRING' ||
    result.intentType === 'PAYABLE_BILL'
  ) {
    result.intentType = 'SINGLE_TRANSACTION';
  }

  if (result.batchDraftsList && result.batchDraftsList.length > 0) {
    result.isReadyForConfirmation = false;
    if (!result.questionToUser) {
      result.questionToUser = `Identifiquei ${result.batchDraftsList.length} movimentações independentes no seu pedido. Deseja confirmar os rascunhos em lote?`;
    }
    return result;
  }

  // 1. Caso especial: Vendas de produtos/serviços
  if (result.questionToUser && result.questionToUser.includes('pedidos no ERP')) {
    result.isReadyForConfirmation = false;
    return result;
  }

  // 3. Lançamento Único, Consulta ou Atualização
  if (
    result.intentType === 'QUERY_OR_UPDATE' ||
    (result.candidateAccounts && result.candidateAccounts.length > 0)
  ) {
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

  if ((result.intentType as string) === 'PAYABLE_BILL' && !result.dueDate && !result.date) {
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

  // 4. REGRA DE NEGÓCIO — EMPRÉSTIMOS E FORMA DE RECEBIMENTO
  const loanValidation = applyLoanValidationRules(result);
  if (loanValidation.handled && loanValidation.result) {
    return loanValidation.result;
  }

  // 5. REGRA DE NEGÓCIO — DESPESA EMPRESARIAL x GASTO PESSOAL / PRÓ-LABORE
  const businessPurposeValidation = applyBusinessPurposeRules(result);
  if (businessPurposeValidation.handled && businessPurposeValidation.result) {
    return businessPurposeValidation.result;
  }

  // 6. DECISION-002: Cartão Genérico -> Perguntar se foi no Débito ou no Crédito
  const lowerDesc = (result.description || '').toLowerCase();

  if (!result.paymentMethod || result.paymentMethod === 'UNKNOWN') {
    if (/\bpix\b/i.test(lowerDesc)) result.paymentMethod = 'Pix';
    else if (/débito|debito/i.test(lowerDesc)) result.paymentMethod = 'Cartão de Débito';
    else if (/crédito|credito/i.test(lowerDesc)) result.paymentMethod = 'Cartão de Crédito';
    else if (/dinheiro/i.test(lowerDesc)) result.paymentMethod = 'Dinheiro';
  }

  const isGenericCard =
    /cartão|cartao/i.test(lowerDesc) && !/débito|debito|crédito|credito|credto/i.test(lowerDesc);

  if (
    isGenericCard &&
    (result.paymentMethod === 'Cartão' ||
      result.paymentMethod === 'Cartão de Crédito' ||
      result.paymentMethod === 'UNKNOWN' ||
      !result.paymentMethod)
  ) {
    result.paymentMethod = 'UNKNOWN';
    if (!result.missingFields) result.missingFields = [];
    if (!result.missingFields.includes('paymentMethod')) result.missingFields.push('paymentMethod');
    result.isReadyForConfirmation = false;
    result.questionToUser = 'Foi no cartão de débito ou de crédito?';
    return result;
  }

  // 7. DECISION-003: Incerteza / Estimativa do Usuário
  const hasUncertainty =
    /\b(uns|pouco|acho\s+que|não\s+tenho\s+certeza|nao\s+tenho\s+certeza|talvez)\b/i.test(
      lowerDesc
    );
  if (hasUncertainty && result.isEstimated !== false) {
    result.isEstimated = true;
    result.isReadyForConfirmation = false;

    if (/\b(uns|pouco|acho\s+que)\b/i.test(lowerDesc) && result.amount) {
      const formattedAmt = `R$ ${result.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      result.questionToUser = `Você quer registrar ${formattedAmt} como estimativa ou prefere verificar o valor exato no comprovante?`;
    } else {
      result.questionToUser = `Identifiquei uma estimativa no lançamento. Deseja confirmar este valor aproximado ou informar o valor exato?`;
    }
    return result;
  } else if (!hasUncertainty) {
    result.isEstimated = false;
  }

  // 8. DECISION-001: Múltiplas Movimentações na Mesma Mensagem (batchDraftsList)
  const multipleFacts = extractMultipleFinancialFacts(result.description || '', todayStr);
  if (
    multipleFacts.length >= 2 &&
    (!result.batchDraftsList || result.batchDraftsList.length === 0)
  ) {
    result.batchDraftsList = multipleFacts;
    result.isReadyForConfirmation = false;
    const pendingQuestion = result.batchDraftsList.find(
      (d) => d.questionToUser && d.questionToUser !== 'Confere?'
    )?.questionToUser;
    result.questionToUser =
      pendingQuestion ||
      `Identifiquei ${result.batchDraftsList.length} movimentações nesta mensagem. Deseja confirmar todas?`;
    return result;
  }

  // 9. REGRA OBRIGATÓRIA FACTUAL: Forma de pagamento é obrigatória para qualquer movimentação
  const isFutureCommitment =
    /começando\s+mês\s+que\s+vem|comecando\s+mes\s+que\s+vem|vence\s+mês\s+que\s+vem|vence\s+mes\s+que\s+vem/i.test(
      result.description || ''
    );

  const hasPaymentMethod = Boolean(
    (result.paymentMethod &&
      result.paymentMethod !== 'UNKNOWN' &&
      result.paymentMethod !== 'UNKNOWN_BY_USER' &&
      result.paymentMethod.trim() !== '') ||
      (result.intentType as string) === 'INSTALLMENT' ||
      Boolean(result.installmentList?.length)
  );

  if (isFutureCommitment && (!result.installmentList || result.installmentList.length === 0)) {
    result.isReadyForConfirmation = false;
    result.questionToUser =
      'Este lançamento contém parcelas futuras. Você deseja registrar algum pagamento que já foi efetuado hoje?';
    return result;
  }

  if (!hasPaymentMethod) {
    result.paymentMethod = 'UNKNOWN';
    if (!result.missingFields) result.missingFields = [];
    if (!result.missingFields.includes('paymentMethod')) {
      result.missingFields.push('paymentMethod');
    }
    result.isReadyForConfirmation = false;
    const isIncome = result.type === 'income';
    result.questionToUser = isIncome
      ? 'Qual foi a forma de recebimento?'
      : 'Qual foi a forma de pagamento?';
    return result;
  }

  result.missingFields = (result.missingFields || []).filter(
    (f) => f !== 'paymentMethod' && f !== 'businessPurpose'
  );
  if (result.missingFields.length > 0) {
    result.isReadyForConfirmation = false;
  } else {
    result.isReadyForConfirmation = true;
    result.questionToUser = 'Confere?';
  }
  return result;
}

let globalUnrealizedFactsContext: ParsedFinancialIntent[] = [];

export function extractMultipleFinancialFacts(
  text: string,
  todayStr: string
): ParsedFinancialIntent[] {
  return extractMultipleFinancialFactsWithValidator(text, todayStr, validateParsedIntent);
}

export function processFinancialInput(
  text: string,
  todayStr = new Date().toISOString().split('T')[0],
  options?: { rememberedUnrealizedFacts?: ParsedFinancialIntent[] }
): {
  draft: ParsedFinancialIntent | null;
  isRealized?: boolean;
  rememberedFacts?: ParsedFinancialIntent[];
} {
  const lower = text.toLowerCase().trim();
  const isRealizedPayment =
    /\b(paguei|quitei|efetuei|acabei\s+de\s+pagar|paguei\s+no|paguei\s+na|baixei|recebi|transferi|caiu|entrou|paguei\s+as\s+duas|paguei\s+os\s+dois|paguei\s+tudo|fiz\s+um\s+pagamento|fiz\s+o\s+pagamento|fiz\s+pagamento|fiz\s+um\s+pix|fiz\s+pix|fiz\s+uma\s+transferência|fiz\s+uma\s+transferencia|fiz\s+transferência|fiz\s+transferencia|fiz\s+um\s+depósito|fiz\s+um\s+deposito|pagamos|realizei\s+o\s+pagamento|realizei\s+pagamento)\b/i.test(
      lower
    );

  const activeContext = options?.rememberedUnrealizedFacts || globalUnrealizedFactsContext;

  // 1. Múltiplos Fatos novos na mesma mensagem (tem prioridade absoluta sobre contexto residual)
  const multipleFacts = extractMultipleFinancialFacts(text, todayStr);
  if (multipleFacts.length >= 2) {
    if (!isRealizedPayment) {
      globalUnrealizedFactsContext = multipleFacts;
    } else {
      globalUnrealizedFactsContext = [];
    }
    const groupedQuestion = buildGroupedQuestion(multipleFacts);
    const allMissing = Array.from(new Set(multipleFacts.flatMap((d) => d.missingFields || [])));
    const mainDraft: ParsedFinancialIntent = {
      intentType: 'SINGLE_TRANSACTION',
      type: multipleFacts[0].type,
      amount: multipleFacts[0].amount,
      description: multipleFacts[0].description,
      categoryName: multipleFacts[0].categoryName,
      paymentMethod: multipleFacts[0].paymentMethod,
      businessPurpose: multipleFacts[0].businessPurpose,
      missingFields: allMissing,
      batchDraftsList: multipleFacts,
      isReadyForConfirmation: false,
      isRealized: isRealizedPayment,
      questionToUser:
        groupedQuestion ||
        `Identifiquei ${multipleFacts.length} movimentações nesta mensagem. Qual foi a forma de pagamento?`,
    };

    return { draft: mainDraft, isRealized: isRealizedPayment, rememberedFacts: multipleFacts };
  }

  // 2. Resposta de pagamento a fatos não realizados prévios
  if (isRealizedPayment && activeContext.length >= 1) {
    let targetFacts: ParsedFinancialIntent[] = [];
    const isGenericPaymentRef =
      /\b(as\s+duas|os\s+dois|tudo|ambas|ambos|paguei\s+no|paguei\s+na|foi\s+no|foi\s+na|no\s+pix|no\s+debito|no\s+débito|no\s+credito|no\s+crédito|em\s+dinheiro)\b/i.test(
        lower
      );

    if (lower.includes('luz') && !lower.includes('internet')) {
      targetFacts = activeContext.filter((f) =>
        (f.description || '').toLowerCase().includes('luz')
      );
    } else if (lower.includes('internet') && !lower.includes('luz')) {
      targetFacts = activeContext.filter((f) =>
        (f.description || '').toLowerCase().includes('internet')
      );
    } else if (isGenericPaymentRef) {
      targetFacts = activeContext;
    } else {
      // Verifica se a mensagem casa com a descrição de algum fato pendente
      targetFacts = activeContext.filter(
        (f) => f.description && lower.includes(f.description.toLowerCase())
      );
    }

    if (targetFacts.length > 0) {
      let turnPaymentMethod: string | undefined = undefined;
      if (/\b(?:pix|pics)\b/i.test(lower)) turnPaymentMethod = 'Pix';
      else if (/débito|debito/i.test(lower)) turnPaymentMethod = 'Cartão de Débito';
      else if (/crédito|credito/i.test(lower)) turnPaymentMethod = 'Cartão de Crédito';
      else if (/dinheiro/i.test(lower)) turnPaymentMethod = 'Dinheiro';

      const realizedBatch = targetFacts.map((f) =>
        validateParsedIntent(
          {
            ...f,
            paymentMethod: turnPaymentMethod || f.paymentMethod || 'UNKNOWN',
            isRealized: true,
            isReadyForConfirmation: false,
          },
          todayStr
        )
      );

      globalUnrealizedFactsContext = [];
      const pendingQuestion = buildGroupedQuestion(realizedBatch);
      const mainDraft: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        type: realizedBatch[0].type,
        amount: realizedBatch[0].amount,
        description: realizedBatch[0].description,
        categoryName: realizedBatch[0].categoryName,
        paymentMethod: realizedBatch[0].paymentMethod,
        businessPurpose: realizedBatch[0].businessPurpose,
        missingFields: Array.from(new Set(realizedBatch.flatMap((d) => d.missingFields || []))),
        batchDraftsList: realizedBatch.length >= 2 ? realizedBatch : null,
        isReadyForConfirmation: false,
        isRealized: true,
        questionToUser:
          pendingQuestion ||
          `Identifiquei ${realizedBatch.length} movimentação(ões) nesta mensagem. Deseja confirmar?`,
      };

      return { draft: mainDraft, isRealized: true };
    }
  }

  // 3. Fato Único
  const numMatch = text.match(/(?:r\$\s*)?(\d+(?:\.\d{3})?(?:,\d{1,2})?)/i);
  const amt = numMatch ? parseFloat(numMatch[1].replace(/\./g, '').replace(',', '.')) : null;

  const rawHeuristic = fallbackHeuristicParser(text, [], todayStr);
  rawHeuristic.isRealized = isRealizedPayment;
  const single = validateParsedIntent(rawHeuristic, todayStr);

  return { draft: single, isRealized: isRealizedPayment };
}
