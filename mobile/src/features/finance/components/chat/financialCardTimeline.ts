import type { ParsedFinancialIntent } from '../../../../services/financialAiAssistantService';
import type { CardVisualState } from '../TransactionPreviewCard';

export interface FinancialCardTimelineEntry {
  id: string;
  afterMessageId: string;
  timestamp: string;
  intent: ParsedFinancialIntent;
  cardState: CardVisualState;
}

interface AppendTimelineCardInput {
  id: string;
  afterMessageId: string;
  timestamp: string;
  intent: ParsedFinancialIntent;
  cardState: CardVisualState;
}

export function appendFinancialTimelineCard(
  current: FinancialCardTimelineEntry[],
  input: AppendTimelineCardInput,
): FinancialCardTimelineEntry[] {
  return [
    ...current,
    {
      ...input,
      intent: JSON.parse(JSON.stringify(input.intent)),
    },
  ];
}

export function updateFinancialTimelineCardState(
  current: FinancialCardTimelineEntry[],
  cardId: string | null,
  cardState: CardVisualState,
): FinancialCardTimelineEntry[] {
  if (!cardId) return current;
  return current.map(card => card.id === cardId ? { ...card, cardState } : card);
}
