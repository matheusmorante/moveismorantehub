import { describe, expect, it, vi } from 'vitest';

vi.mock('../financialAiAssistantService', () => ({ fallbackHeuristicParser: vi.fn() }));

import { extractMultipleFinancialFacts, processFinancialInput } from './financialIntentValidator';

const spokenMessage = 'eu fiz um pagamento de uma conta de luz no pics e uma conta de internet no débito é r$ 200 e r$ 300';

describe('extração determinística de múltiplos pagamentos', () => {
  it('preserva ordem, valores e formas de pagamento quando os valores vêm no final', () => {
    const facts = extractMultipleFinancialFacts(spokenMessage, '2026-09-06');

    expect(facts).toHaveLength(2);
    expect(facts[0]).toMatchObject({ description: 'Pagamento de conta de luz', amount: 200, paymentMethod: 'Pix' });
    expect(facts[1]).toMatchObject({ description: 'Pagamento de internet', amount: 300, paymentMethod: 'Cartão de Débito' });
  });

  it('produz um lote, sem cair no rascunho genérico que pergunta o valor', () => {
    const result = processFinancialInput(spokenMessage, '2026-09-06').draft;

    expect(result?.batchDraftsList).toHaveLength(2);
    expect(result?.missingFields).not.toContain('amount');
    expect(result?.questionToUser).not.toMatch(/qual foi o valor/i);
  });
});
