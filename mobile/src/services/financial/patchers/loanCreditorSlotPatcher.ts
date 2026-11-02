import type { ParsedFinancialIntent } from '../financialTypes';
import { validateParsedIntent } from '../financialIntentValidator';
import { isBankFinancialInstitution } from '../bankKeywords';

export const tryPatchLoanCreditorSlots = (
  text: string,
  activeDraft: ParsedFinancialIntent,
  draft: ParsedFinancialIntent,
  todayStr: string
): ParsedFinancialIntent | null => {
  // 0.5. Slot filling para Credor de Empréstimo (ex: "Do banco", "Do Itaú", "Do Matheus", "Do João")
  const isCreditorMissing =
    activeDraft.missingFields?.includes('creditor') ||
    (activeDraft.questionToUser && activeDraft.questionToUser.includes('De quem foi'));
  if (
    isCreditorMissing ||
    (draft.isLoan && (!draft.creditor || draft.creditorType === 'UNKNOWN'))
  ) {
    const isBankAnswer = isBankFinancialInstitution(text);

    let detectedCreditor: string | null = null;
    let detectedType: 'FINANCIAL_INSTITUTION' | 'PERSON_OR_OTHER' = 'PERSON_OR_OTHER';

    if (isBankAnswer) {
      detectedType = 'FINANCIAL_INSTITUTION';
      const match = text.match(
        /(?:do|da|no|na|pelo)?\s*(banco(?:\s+[a-z0-9]+)?|itaú|itau|bradesco|santander|nubank|caixa|inter|sicoob|sicredi|safra|btg|c6|financeira|cooperativa)/i
      );
      detectedCreditor = match ? match[1].charAt(0).toUpperCase() + match[1].slice(1) : 'Banco';
    } else {
      const match = text.match(
        /(?:do|da|de|pelo|com|foi\s+o|foi\s+a|foi)?\s*([a-zA-ZáàâãéèêíïóôõöúçñA-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+)/i
      );
      if (match) {
        let raw = match[1];
        if (raw.toLowerCase() === 'foi' || raw.toLowerCase() === 'o' || raw.toLowerCase() === 'a') {
          const secondMatch = text.match(
            /(?:foi\s+o|foi\s+a|foi|é\s+o|é\s+a|é)\s+([a-zA-ZáàâãéèêíïóôõöúçñA-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+)/i
          );
          if (secondMatch) raw = secondMatch[1];
        }
        const stopWords = [
          'uma',
          'um',
          'empréstimo',
          'emprestimo',
          'dinheiro',
          'pix',
          'banco',
          'é',
          'foi',
          'o',
          'a',
          'categoria',
        ];
        if (!stopWords.includes(raw.toLowerCase())) {
          detectedCreditor = raw.charAt(0).toUpperCase() + raw.slice(1);
          detectedType = 'PERSON_OR_OTHER';
        }
      }
    }

    if (detectedCreditor) {
      draft.creditor = detectedCreditor;
      draft.supplier = detectedCreditor;
      draft.counterparty = detectedCreditor;
      draft.creditorType = detectedType;
      draft.missingFields = (draft.missingFields || []).filter((f) => f !== 'creditor');

      if (
        detectedType === 'FINANCIAL_INSTITUTION' &&
        (!draft.paymentMethod || draft.paymentMethod === 'UNKNOWN')
      ) {
        draft.paymentMethod = 'Transferência bancária';
      }

      return validateParsedIntent(draft, todayStr);
    }
  }

  return null;
};
