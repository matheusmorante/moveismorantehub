import { describe, it, expect, vi } from 'vitest';

global.fetch = vi.fn().mockImplementation(() => Promise.reject(new Error('Offline unit test')));

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock('../../../../mobile/src/services/supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [] }),
          maybeSingle: () => Promise.resolve({ data: null }),
          limit: () => Promise.resolve({ data: [] }),
        }),
      }),
    }),
  },
}));

import { processFinancialInput, extractMultipleFinancialFacts } from '../../../../mobile/src/services/financialAiAssistantService';

describe('Bateria de Regressão — Distinção Fato Financeiro vs Movimentação Realizada (unrealizedFactsAndBinding.test.ts)', () => {
  it('TESTE A — "Tenho uma conta de luz de 200 e uma conta de internet de 100." -> ZERO movimentações realizadas', () => {
    const res = processFinancialInput('Tenho uma conta de luz de 200 e uma conta de internet de 100.', '2026-09-06');

    expect(res.isRealized).toBe(false);
    expect(res.draft?.batchDraftsList).toBeNull();
    expect(res.draft?.questionToUser).toContain('luz de R$ 200,00 e internet de R$ 100,00');
  });

  it('TESTE B — "Tenho que pagar luz de 200 e internet de 100." -> ZERO movimentações realizadas', () => {
    const res = processFinancialInput('Tenho que pagar luz de 200 e internet de 100.', '2026-09-06');

    expect(res.isRealized).toBe(false);
    expect(res.draft?.batchDraftsList).toBeNull();
  });

  it('TESTE C — "Paguei luz de 200 e internet de 100." -> 2 saídas realizadas', () => {
    const res = processFinancialInput('Paguei luz de 200 e internet de 100.', '2026-09-06');

    expect(res.isRealized).toBe(true);
    expect(res.draft?.batchDraftsList).toBeDefined();
    expect(res.draft?.batchDraftsList?.length).toBe(2);

    expect(res.draft?.batchDraftsList?.[0].amount).toBe(200);
    expect(res.draft?.batchDraftsList?.[0].description).toContain('luz');

    expect(res.draft?.batchDraftsList?.[1].amount).toBe(100);
    expect(res.draft?.batchDraftsList?.[1].description).toContain('internet');
  });

  it('TESTE D — "Acabei de pagar luz de 200 e internet de 100." -> 2 saídas realizadas', () => {
    const res = processFinancialInput('Acabei de pagar luz de 200 e internet de 100.', '2026-09-06');

    expect(res.isRealized).toBe(true);
    expect(res.draft?.batchDraftsList?.length).toBe(2);
  });

  it('TESTE E — "Tenho luz de 200 e internet de 100." -> "Paguei as duas." -> 2 saídas usando valores anteriores', () => {
    const turn1 = processFinancialInput('Tenho luz de 200 e internet de 100.', '2026-09-06');
    expect(turn1.isRealized).toBe(false);

    const turn2 = processFinancialInput('Paguei as duas.', '2026-09-06', { rememberedUnrealizedFacts: turn1.rememberedFacts });

    expect(turn2.isRealized).toBe(true);
    expect(turn2.draft?.batchDraftsList?.length).toBe(2);
    expect(turn2.draft?.batchDraftsList?.[0].amount).toBe(200);
    expect(turn2.draft?.batchDraftsList?.[1].amount).toBe(100);
  });

  it('TESTE F — "Tenho luz de 200 e internet de 100." -> "Paguei só a luz." -> somente luz 200', () => {
    const turn1 = processFinancialInput('Tenho luz de 200 e internet de 100.', '2026-09-06');
    expect(turn1.isRealized).toBe(false);

    const turn2 = processFinancialInput('Paguei só a luz.', '2026-09-06', { rememberedUnrealizedFacts: turn1.rememberedFacts });

    expect(turn2.isRealized).toBe(true);
    expect(turn2.draft?.amount).toBe(200);
    expect(turn2.draft?.description).toContain('luz');
    expect(turn2.draft?.batchDraftsList).toBeNull();
  });

  it('TESTE G — "Paguei internet de 100 e luz de 200." -> Internet 100; Luz 200', () => {
    const facts = extractMultipleFinancialFacts('Paguei internet de 100 e luz de 200.', '2026-09-06');

    expect(facts.length).toBe(2);
    expect(facts[0].description).toContain('internet');
    expect(facts[0].amount).toBe(100);

    expect(facts[1].description).toContain('luz');
    expect(facts[1].amount).toBe(200);
  });

  it('TESTE H — "Paguei 200 de luz e 100 de internet." -> Luz 200; Internet 100', () => {
    const facts = extractMultipleFinancialFacts('Paguei 200 de luz e 100 de internet.', '2026-09-06');

    expect(facts.length).toBe(2);
    expect(facts[0].description).toContain('luz');
    expect(facts[0].amount).toBe(200);

    expect(facts[1].description).toContain('internet');
    expect(facts[1].amount).toBe(100);
  });

  it('TESTE I — "Tenho uma conta de luz de 200 e quanto de internet de 100." -> ASR noise tolerada, ZERO saídas', () => {
    const res = processFinancialInput('Tenho uma conta de luz de 200 e quanto de internet de 100.', '2026-09-06');

    expect(res.isRealized).toBe(false);
    expect(res.draft?.batchDraftsList).toBeNull();
    expect(res.draft?.questionToUser).not.toContain('Qual foi o valor');
    expect(res.draft?.questionToUser).toContain('luz de R$ 200,00 e internet de R$ 100,00');
  });
});
