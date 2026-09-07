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

import { processFinancialInput } from '../../../../mobile/src/services/financialAiAssistantService';

describe('Bateria de Sessões Profundas Multi-Turno (deepMultiTurnSessions.test.ts)', () => {
  const TODAY = '2026-09-06';

  it('Sessão de 3 Turnos: Envio incompleto -> Correção de valor -> Confirmação', () => {
    // Turno 1: Despesa sem valor
    const t1 = processFinancialInput('paguei a gasolina hoje no pix', TODAY);
    expect(t1.draft?.description?.toLowerCase()).toContain('gasolina');

    // Turno 2: Usuário informa o valor correto
    const t2 = processFinancialInput('foi 150', TODAY);
    expect(t2.draft?.amount).toBe(150);

    // Turno 3: Confirmação
    const t3 = processFinancialInput('pode registrar', TODAY);
    expect(t3).toBeDefined();
  });

  it('Sessão de 5 Turnos: Múltiplos fatos -> Esclarecimento de loja -> Pagamento -> Ajuste -> Salvar', () => {
    // Turno 1: Fatos informados
    const t1 = processFinancialInput('tenho uma conta de luz de 200 e internet de 100', TODAY);
    expect(t1.draft?.batchDraftsList?.length).toBe(2);

    // Turno 2: Esclarecimento de destinação
    const t2 = processFinancialInput('são da loja', TODAY, { rememberedUnrealizedFacts: t1.rememberedFacts });
    expect(t2).toBeDefined();

    // Turno 3: Pagamento no Pix
    const t3 = processFinancialInput('paguei as duas no pix', TODAY, { rememberedUnrealizedFacts: t1.rememberedFacts });
    expect(t3.isRealized).toBe(true);
    expect(t3.draft?.batchDraftsList?.length).toBe(2);

    // Turno 4: Correção de um dos valores
    const t4 = processFinancialInput('a internet na verdade foi 90', TODAY);
    expect(t4.draft?.amount).toBe(90);

    // Turno 5: Confirmação final
    const t5 = processFinancialInput('confere, pode salvar', TODAY);
    expect(t5).toBeDefined();
  });

  it('Sessão de 10 Turnos: Conversa longa com desvios, dúvidas, cancelamento parcial e conclusão', () => {
    let contextFacts = undefined;

    // T1: Apresenta 2 despesas
    const t1 = processFinancialInput('gastei 50 no almoço e 30 no estacionamento', TODAY);
    contextFacts = t1.rememberedFacts;
    expect(t1.draft?.batchDraftsList?.length).toBe(2);

    // T2: Pergunta intermediária
    const t2 = processFinancialInput('qual foi o total?', TODAY);
    expect(t2).toBeDefined();

    // T3: Correção do almoço
    const t3 = processFinancialInput('o almoço foi 55 na verdade', TODAY);
    expect(t3.draft?.amount).toBe(55);

    // T4: Forma de pagamento
    const t4 = processFinancialInput('paguei no dinheiro', TODAY);
    expect(t4.draft?.paymentMethod).toBe('Dinheiro');

    // T5: Informa outra despesa adicional
    const t5 = processFinancialInput('e também 25 de café', TODAY);
    expect(t5.draft?.amount).toBe(25);

    // T6: Informa forma de pagamento do café
    const t6 = processFinancialInput('no pix', TODAY);
    expect(t6.draft?.paymentMethod).toBe('Pix');

    // T7: Pergunta se está tudo certo
    const t7 = processFinancialInput('tudo certo?', TODAY);
    expect(t7).toBeDefined();

    // T8: Confirmação dos dados
    const t8 = processFinancialInput('sim, perfeitamente', TODAY);
    expect(t8).toBeDefined();

    // T9: Adiciona observação
    const t9 = processFinancialInput('lança na conta da filial', TODAY);
    expect(t9).toBeDefined();

    // T10: Finalização
    const t10 = processFinancialInput('concluído', TODAY);
    expect(t10).toBeDefined();
  });
});
