import type { ParsedFinancialIntent } from './financialTypes';

export function rebuildFinancialBatch(
  parent: ParsedFinancialIntent,
  remaining: ParsedFinancialIntent[],
): ParsedFinancialIntent | null {
  if (!remaining.length) return null;
  const current = remaining[0];
  const ready = Boolean(current.isReadyForConfirmation || current.validationStatus === 'ready');
  return {
    ...parent,
    type: current.type,
    amount: current.amount,
    description: current.description,
    categoryName: current.categoryName,
    paymentMethod: current.paymentMethod,
    businessPurpose: current.businessPurpose,
    batchDraftsList: remaining,
    missingFields: current.missingFields || [],
    questionToUser: current.questionToUser || null,
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
