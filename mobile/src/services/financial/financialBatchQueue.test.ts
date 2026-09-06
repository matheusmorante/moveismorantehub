import { describe, expect, it } from 'vitest';
import type { ParsedFinancialIntent } from '../financialAiAssistantService';
import { advanceFinancialBatch } from './financialBatchQueue';

const draft = (description: string, amount: number, ready = false): ParsedFinancialIntent => ({
  type: 'expense', amount, description, missingFields: ready ? [] : ['businessPurpose'],
  questionToUser: ready ? 'Confere?' : `A conta de ${description} é da loja ou pessoal?`,
  confidence: 0.9, isReadyForConfirmation: ready, validationStatus: ready ? 'ready' : 'needs_input',
});

describe('fila de movimentações financeiras', () => {
  it('remove somente a primeira concluída e promove a próxima sem perder dados', () => {
    const luz = draft('luz', 200, true);
    const internet = draft('internet', 300);
    const parent = { ...luz, batchDraftsList: [luz, internet] };
    const next = advanceFinancialBatch(parent);

    expect(next?.batchDraftsList).toEqual([internet]);
    expect(next).toMatchObject({ description: 'internet', amount: 300, questionToUser: 'A conta de internet é da loja ou pessoal?' });
  });

  it('encerra a fila somente depois da última movimentação', () => {
    const luz = draft('luz', 200, true);
    expect(advanceFinancialBatch({ ...luz, batchDraftsList: [luz] })).toBeNull();
  });
});
