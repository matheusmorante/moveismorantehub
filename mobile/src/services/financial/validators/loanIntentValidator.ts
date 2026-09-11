import type { ParsedFinancialIntent } from '../financialTypes';
import { isBankFinancialInstitution } from '../bankKeywords';

export interface LoanValidationResult {
  handled: boolean;
  result?: ParsedFinancialIntent;
}

/**
 * Aplica as regras de negócio de empréstimos e formas de recebimento.
 * Extraído para manter alta coesão e respeito ao princípio de responsabilidade única.
 */
export function applyLoanValidationRules(
  result: ParsedFinancialIntent
): LoanValidationResult {
  const isLoan = Boolean(
    result.isLoan ||
    (result.categoryName && /empréstimo|emprestimo/i.test(result.categoryName)) ||
    (result.description && /empréstimo|emprestimo|emprestado|emprestei/i.test(result.description))
  );

  if (!isLoan) {
    return { handled: false };
  }

  result.isLoan = true;
  if (!result.categoryName) result.categoryName = 'Empréstimos';
  if (!result.type) result.type = 'income';

  const creditorRaw = (result.creditor || result.supplier || result.counterparty || '').trim();
  const lowerCreditor = creditorRaw.toLowerCase();
  const lowerDesc = (result.description || '').toLowerCase();

  const isBank =
    isBankFinancialInstitution(lowerCreditor) ||
    lowerDesc.includes('do banco') ||
    lowerDesc.includes('no banco') ||
    lowerDesc.includes('do itau') ||
    lowerDesc.includes('do itaú') ||
    lowerDesc.includes('pelo banco') ||
    lowerDesc.includes('da financeira');

  const isPersonOrOther =
    !isBank &&
    creditorRaw.length > 0 &&
    !['banco', 'financeira', 'cooperativa', 'empréstimo', 'emprestimo'].includes(lowerCreditor);

  if (isBank) {
    result.creditorType = 'FINANCIAL_INSTITUTION';
    if (!result.creditor || result.creditor === 'Empréstimo' || result.creditor === 'Empréstimos') {
      const match = lowerDesc.match(/(?:do|no|na|pelo|da)?\s*(banco(?:\s+[a-z0-9]+)?|itaú|itau|bradesco|santander|nubank|caixa|inter|sicoob|sicredi|safra|btg|c6|financeira|cooperativa)/i);
      result.creditor = match ? match[1].charAt(0).toUpperCase() + match[1].slice(1) : (creditorRaw || 'Banco');
    }
    result.supplier = result.creditor;
    result.counterparty = result.creditor;
  } else if (isPersonOrOther) {
    result.creditorType = 'PERSON_OR_OTHER';
    result.creditor = creditorRaw;
    result.supplier = creditorRaw;
    result.counterparty = creditorRaw;
  } else {
    result.creditorType = 'UNKNOWN';
  }

  // A) Se o credor for UNKNOWN: perguntar primeiro "De quem foi o empréstimo?"
  if (result.creditorType === 'UNKNOWN') {
    if (!result.missingFields) result.missingFields = [];
    if (!result.missingFields.includes('creditor')) result.missingFields.push('creditor');
    result.isReadyForConfirmation = false;
    result.questionToUser = 'De quem foi o empréstimo?';
    return { handled: true, result };
  }

  // B) Se for FINANCIAL_INSTITUTION: inferência autorizada 'Transferência bancária' se paymentMethod for UNKNOWN/ausente
  if (result.creditorType === 'FINANCIAL_INSTITUTION') {
    const hasExplicitPayment = Boolean(
      result.paymentMethod &&
      result.paymentMethod !== 'UNKNOWN' &&
      result.paymentMethod !== 'UNKNOWN_BY_USER' &&
      result.paymentMethod.trim() !== ''
    );

    if (!hasExplicitPayment) {
      result.paymentMethod = 'Transferência bancária';
    }
  }

  // C) Se for PERSON_OR_OTHER: NÃO infere. Se paymentMethod for UNKNOWN, pergunta como recebeu.
  if (result.creditorType === 'PERSON_OR_OTHER') {
    const hasExplicitPayment = Boolean(
      result.paymentMethod &&
      result.paymentMethod !== 'UNKNOWN' &&
      result.paymentMethod !== 'UNKNOWN_BY_USER' &&
      result.paymentMethod.trim() !== ''
    );

    if (!hasExplicitPayment) {
      result.paymentMethod = 'UNKNOWN';
      if (!result.missingFields) result.missingFields = [];
      if (!result.missingFields.includes('paymentMethod')) result.missingFields.push('paymentMethod');
      result.isReadyForConfirmation = false;
      const amt = result.amount || result.totalAmount;
      const formattedAmount = amt
        ? `R$ ${amt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : '';
      result.questionToUser = formattedAmount
        ? `Como você recebeu os ${formattedAmount} do ${result.creditor}?`
        : `Qual foi a forma de recebimento do empréstimo de ${result.creditor}?`;
      return { handled: true, result };
    }
  }

  return { handled: false, result };
}
