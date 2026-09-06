import { describe, expect, it } from 'vitest';
import type { ParsedFinancialIntent } from '../../../../services/financialAiAssistantService';
import {
  appendFinancialTimelineCard,
  updateFinancialTimelineCardState,
} from './financialCardTimeline';

const intent = (description: string, ready: boolean): ParsedFinancialIntent => ({
  type: 'expense',
  amount: 100,
  description,
  missingFields: ready ? [] : ['businessPurpose'],
  questionToUser: ready ? 'Confere?' : `A conta de ${description} é da loja ou pessoal?`,
  confidence: 0.9,
  isReadyForConfirmation: ready,
  validationStatus: ready ? 'ready' : 'needs_input',
});

describe('linha do tempo de cards financeiros', () => {
  it('mantém o card incompleto e acrescenta o card atualizado após a mensagem seguinte', () => {
    const incomplete = intent('luz', false);
    const first = appendFinancialTimelineCard([], {
      id: 'card-1',
      afterMessageId: 'message-1',
      timestamp: '16:35',
      intent: incomplete,
      cardState: 'NEEDS_INPUT',
    });

    const ready = { ...incomplete, businessPurpose: 'BUSINESS' as const, isReadyForConfirmation: true };
    const timeline = appendFinancialTimelineCard(first, {
      id: 'card-2',
      afterMessageId: 'message-2',
      timestamp: '16:36',
      intent: ready,
      cardState: 'READY_TO_CONFIRM',
    });

    expect(timeline.map(item => [item.id, item.afterMessageId, item.cardState])).toEqual([
      ['card-1', 'message-1', 'NEEDS_INPUT'],
      ['card-2', 'message-2', 'READY_TO_CONFIRM'],
    ]);
    expect(timeline[0].intent.businessPurpose).toBeUndefined();
  });

  it('atualiza apenas o card ativo sem substituir os cards anteriores', () => {
    const timeline = [
      ...appendFinancialTimelineCard([], {
        id: 'card-1', afterMessageId: 'message-1', timestamp: '16:35',
        intent: intent('luz', false), cardState: 'NEEDS_INPUT',
      }),
      ...appendFinancialTimelineCard([], {
        id: 'card-2', afterMessageId: 'message-2', timestamp: '16:36',
        intent: intent('internet', true), cardState: 'READY_TO_CONFIRM',
      }),
    ];

    const saved = updateFinancialTimelineCardState(timeline, 'card-2', 'SAVED');

    expect(saved[0].cardState).toBe('NEEDS_INPUT');
    expect(saved[1].cardState).toBe('SAVED');
    expect(saved).toHaveLength(2);
  });
});
