import type { ParsedFinancialIntent } from './financialTypes';

export const extractUnknownFieldsFromText = (
  text: string,
  activeDraft?: ParsedFinancialIntent | null
): string[] => {
  const lower = text.toLowerCase();
  const unknownSet = new Set<string>(activeDraft?.unknownByUser || []);

  const isGeneralUnknown =
    lower.includes('não lembro') ||
    lower.includes('nao lembro') ||
    lower.includes('sem lembrar') ||
    lower.includes('não sei') ||
    lower.includes('nao sei') ||
    lower.includes('não tenho certeza') ||
    lower.includes('nao tenho certeza') ||
    lower.includes('consulta aí') ||
    lower.includes('consulta ai') ||
    lower.includes('procura aí') ||
    lower.includes('procura ai') ||
    lower.includes('vê pra mim') ||
    lower.includes('ve pra mim');

  if (isGeneralUnknown) {
    if (
      lower.includes('dia') ||
      lower.includes('data') ||
      lower.includes('vencimento') ||
      lower.includes('quando')
    ) {
      unknownSet.add('date');
      unknownSet.add('dueDate');
    }
    if (
      lower.includes('forma') ||
      lower.includes('como paguei') ||
      lower.includes('pagamento') ||
      lower.includes('paguei')
    ) {
      unknownSet.add('paymentMethod');
    }
    if (
      lower.includes('quantia') ||
      lower.includes('valor') ||
      lower.includes('quanto') ||
      lower.includes('preço') ||
      lower.includes('preco')
    ) {
      unknownSet.add('amount');
      unknownSet.add('totalAmount');
    }

    if (unknownSet.size === 0 && activeDraft) {
      if (
        activeDraft.missingFields?.includes('amount') ||
        (activeDraft.questionToUser &&
          (activeDraft.questionToUser.includes('valor') ||
            activeDraft.questionToUser.includes('Valor')))
      ) {
        unknownSet.add('amount');
        unknownSet.add('totalAmount');
      }
      if (
        activeDraft.missingFields?.includes('dueDate') ||
        activeDraft.missingFields?.includes('date') ||
        (activeDraft.questionToUser &&
          (activeDraft.questionToUser.includes('data') ||
            activeDraft.questionToUser.includes('vencimento')))
      ) {
        unknownSet.add('date');
        unknownSet.add('dueDate');
      }
    }

    if (unknownSet.size === 0) {
      unknownSet.add('amount');
      unknownSet.add('date');
    }
  }

  return Array.from(unknownSet);
};
