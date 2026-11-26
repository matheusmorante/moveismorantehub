import type { ParsedFinancialIntent } from '../extraction/financialTypes';
import { validateParsedIntent } from '../extraction/financialIntentValidator';
import {
  extractUnknownFieldsFromText,
  hasUnknownFinancialAnswerPhrase,
} from '../extraction/financialUnknownFieldExtractor';

export const tryPatchUnknownFinancialAnswer = (
  text: string,
  draft: ParsedFinancialIntent,
  todayStr: string
): ParsedFinancialIntent | null => {
  if (!hasUnknownFinancialAnswerPhrase(text)) return null;

  draft.unknownByUser = extractUnknownFieldsFromText(text, draft);
  draft.intentType = 'QUERY_OR_UPDATE';
  draft.missingFields = (draft.missingFields || []).filter(
    (field) => !draft.unknownByUser?.includes(field)
  );
  draft.questionToUser = null;

  return validateParsedIntent(draft, todayStr);
};
