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

import { extractMultipleFinancialFacts, applyTurnPatchWithDraftList, processFinancialInput } from '../../../../mobile/src/services/financialAiAssistantService';

describe('Bateria de Regressão — Múltiplas Movimentações na Mesma Fala (multiFactParsing.test.ts)', () => {
  it('TESTE 1 — "Paguei 200 de luz e 100 de internet." -> 2 drafts independentes', () => {
    const text = 'Paguei 200 de luz e 100 de internet.';
    const facts = extractMultipleFinancialFacts(text, '2026-09-06');

    expect(facts.length).toBe(2);
    expect(facts[0].amount).toBe(200);
    expect(facts[0].description).toContain('luz');
    expect(facts[0].businessPurpose).toBe('UNKNOWN');

    expect(facts[1].amount).toBe(100);
    expect(facts[1].description).toContain('internet');
    expect(facts[1].businessPurpose).toBe('UNKNOWN');
  });

  it('TESTE 2 — "Paguei 200 de luz, 100 de internet e 300 de água." -> 3 drafts', () => {
    const text = 'Paguei 200 de luz, 100 de internet e 300 de água.';
    const facts = extractMultipleFinancialFacts(text, '2026-09-06');

    expect(facts.length).toBe(3);
    expect(facts[0].amount).toBe(200);
    expect(facts[1].amount).toBe(100);
    expect(facts[2].amount).toBe(300);
  });

  it('TESTE 3 — "Paguei 200 de luz e também abasteci 150." -> Draft 1: Luz UNKNOWN; Draft 2: Combustível BUSINESS', () => {
    const text = 'Paguei 200 de luz e também abasteci 150.';
    const facts = extractMultipleFinancialFacts(text, '2026-09-06');

    expect(facts.length).toBe(2);
    expect(facts[0].amount).toBe(200);
    expect(facts[0].businessPurpose).toBe('UNKNOWN');

    expect(facts[1].amount).toBe(150);
    expect(facts[1].categoryName).toBe('Combustível');
    expect(facts[1].businessPurpose).toBe('BUSINESS');
  });

  it('TESTE 4 — Patch específico: "A luz é da loja." altera apenas Luz, mantendo Internet UNKNOWN', () => {
    const facts = extractMultipleFinancialFacts('Paguei 200 de luz e 100 de internet.', '2026-09-06');
    const patchRes = applyTurnPatchWithDraftList(facts, 'A luz é da loja.', 'ANSWER_TO_QUESTION', [], '2026-09-06');

    expect(patchRes.updatedDrafts[0].businessPurpose).toBe('BUSINESS');
    expect(patchRes.updatedDrafts[1].businessPurpose).toBe('UNKNOWN');
  });

  it('TESTE 5 — Patch global: "As duas são da loja." altera Luz BUSINESS e Internet BUSINESS', () => {
    const facts = extractMultipleFinancialFacts('Paguei 200 de luz e 100 de internet.', '2026-09-06');
    const patchRes = applyTurnPatchWithDraftList(facts, 'As duas são da loja.', 'ANSWER_TO_QUESTION', [], '2026-09-06');

    expect(patchRes.updatedDrafts[0].businessPurpose).toBe('BUSINESS');
    expect(patchRes.updatedDrafts[1].businessPurpose).toBe('BUSINESS');
  });

  it('TESTE 6 — Patch combinado: "A luz é da loja e a internet é pessoal."', () => {
    const facts = extractMultipleFinancialFacts('Paguei 200 de luz e 100 de internet.', '2026-09-06');
    const patchRes = applyTurnPatchWithDraftList(facts, 'A luz é da loja e a internet é pessoal.', 'ANSWER_TO_QUESTION', [], '2026-09-06');

    expect(patchRes.updatedDrafts[0].businessPurpose).toBe('BUSINESS');
    expect(patchRes.updatedDrafts[1].businessPurpose).toBe('PERSONAL');
  });

  it('TESTE 7 — Forma de pagamento global: "Paguei 200 de luz e 100 de internet no Pix." -> ambos PIX', () => {
    const text = 'Paguei 200 de luz e 100 de internet no Pix.';
    const facts = extractMultipleFinancialFacts(text, '2026-09-06');

    expect(facts.length).toBe(2);
    expect(facts[0].paymentMethod).toBe('Pix');
    expect(facts[1].paymentMethod).toBe('Pix');
  });

  it('TESTE 8 — Forma de pagamento individual: "Paguei a luz de 200 no Pix e a internet de 100 no débito."', () => {
    const text = 'Paguei a luz de 200 no Pix e a internet de 100 no débito.';
    const facts = extractMultipleFinancialFacts(text, '2026-09-06');

    expect(facts.length).toBe(2);
    expect(facts[0].paymentMethod).toBe('Pix');
    expect(facts[1].paymentMethod).toBe('Cartão de Débito');
  });

  it('TESTE 9 — INVARIANTE: missingFields(draft[0]) NUNCA pode interromper a extração de draft[1]', () => {
    const text = 'Acabei de pagar uma conta de luz e uma conta de internet. A conta de luz foi R$ 200 e a conta de internet foi R$ 100.';
    const res = processFinancialInput(text);

    expect(res.draft?.batchDraftsList).toBeDefined();
    expect(res.draft?.batchDraftsList?.length).toBe(2);

    expect(res.draft?.batchDraftsList?.[0].amount).toBe(200);
    expect(res.draft?.batchDraftsList?.[0].description).toContain('luz');
    expect(res.draft?.batchDraftsList?.[0].businessPurpose).toBe('UNKNOWN');

    expect(res.draft?.batchDraftsList?.[1].amount).toBe(100);
    expect(res.draft?.batchDraftsList?.[1].description).toContain('internet');
    expect(res.draft?.batchDraftsList?.[1].businessPurpose).toBe('UNKNOWN');
  });
});
