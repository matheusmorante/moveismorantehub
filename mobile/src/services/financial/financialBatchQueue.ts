import type { ParsedFinancialIntent } from './financialTypes';

export function rebuildFinancialBatch(
  parent: ParsedFinancialIntent,
  remaining: ParsedFinancialIntent[],
): ParsedFinancialIntent | null {
  if (!remaining.length) return null;
  const ready = remaining.every(item => item.isReadyForConfirmation || item.validationStatus === 'ready');
  return {
    ...parent,
    type: remaining[0].type,
    amount: remaining[0].amount,
    description: remaining[0].description,
    categoryName: remaining[0].categoryName,
    paymentMethod: remaining[0].paymentMethod,
    businessPurpose: remaining[0].businessPurpose,
    batchDraftsList: remaining,
    missingFields: Array.from(new Set(remaining.flatMap(item => item.missingFields || []))),
    questionToUser: remaining[0].questionToUser || null,
    isReadyForConfirmation: ready,
    validationStatus: ready ? 'ready' : 'needs_input',
  };
}

export function advanceFinancialBatch(
  parent: ParsedFinancialIntent,
  completedIndex = 0,
): ParsedFinancialIntent | null {
  const remaining = (parent.batchDraftsList || []).filter((_, index) => index !== completedIndex);
  return rebuildFinancialBatch(parent, remaining);
}
