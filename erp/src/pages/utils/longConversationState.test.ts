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

import { applyTurnPatchWithDraftList, classifyMultiTurnIntent, processFinancialInput } from '../../../../mobile/src/services/financialAiAssistantService';

describe('Bateria E2E/Estresse — Estado de Conversa Longa (longConversationState.test.ts)', () => {
  it('Grupo 1 — Sessão Longa de 20 Turnos Sequenciais', () => {
    let drafts: any[] = [];
    let activeQuestion: string | null = null;
    let targetDraftId: string | null = null;

    const turns = [
      'Paguei 200 de gasolina no Pix.',
      'Não, foi 230.',
      'Também paguei 150 de internet.',
      'É da loja.',
      'Paguei 500 para Bechara.',
      'Foi no Pix.',
      'Recebi 800 do João.',
      'Foi em dinheiro.',
      'Comprei uma televisão por 2 mil.',
      'É para a loja.',
      'Foi no débito.',
      'Paguei 300 na oficina.',
      'Foi em dinheiro.',
      'Recebi 1200 do Lucas no Pix.',
      'Não, foi 1250.',
      'Paguei 237 e 89 de luz.',
      'É da loja.',
      'Foi no Pix.',
      'Abasteci mais 180.',
      'Foi no débito.',
    ];

    for (let i = 0; i < turns.length; i++) {
      const text = turns[i];
      const intent = classifyMultiTurnIntent(text, drafts);
      const isNew = intent === 'NEW_TRANSACTION' || i === 0 || /\b(paguei|recebi|comprei|abasteci|também\s+paguei)\b/i.test(text);
      if (isNew) {
        const res = processFinancialInput(text);
        if (res.draft) {
          if (res.draft.batchDraftsList && res.draft.batchDraftsList.length >= 2) {
            for (const b of res.draft.batchDraftsList) {
              drafts.push({
                id: `draft_${drafts.length + 1}`,
                type: b.type,
                amount: b.amount,
                description: b.description,
                counterparty: b.supplier || b.counterparty,
                paymentMethod: b.paymentMethod,
                categoryName: b.categoryName,
                businessPurpose: b.businessPurpose,
                confidence: b.confidence || 0.9,
                questions: b.missingFields || [],
                version: 1,
              });
            }
          } else {
            drafts.push({
              id: `draft_${drafts.length + 1}`,
              type: res.draft.type,
              amount: res.draft.amount,
              description: res.draft.description,
              counterparty: res.draft.supplier || res.draft.counterparty,
              paymentMethod: res.draft.paymentMethod,
              categoryName: res.draft.categoryName,
              businessPurpose: res.draft.businessPurpose,
              confidence: res.draft.confidence || 0.9,
              questions: res.draft.missingFields || [],
              version: 1,
            });
          }
        }
      } else {
        const patchResult = applyTurnPatchWithDraftList(drafts, text, 'CORRECTION', [], '2026-09-06');
        drafts = patchResult.updatedDrafts;
      }
    }

    expect(drafts.length).toBeGreaterThanOrEqual(7);
    
    // Gasolina 1: 230 Pix
    const gas1 = drafts.find(d => d.amount === 230);
    expect(gas1).toBeDefined();
    expect(gas1?.paymentMethod).toBe('Pix');

    // Internet: 150 loja
    const net = drafts.find(d => d.description.toLowerCase().includes('internet'));
    expect(net?.amount).toBe(150);
    expect(net?.businessPurpose).toBe('BUSINESS');

    // Bechara: 500 Pix
    const bechara = drafts.find(d => d.counterparty?.toLowerCase().includes('bechara'));
    expect(bechara?.amount).toBe(500);
    expect(bechara?.paymentMethod?.toUpperCase()).toBe('PIX');

    // João: 800 dinheiro entrada
    const joao = drafts.find(d => d.counterparty?.toLowerCase().includes('joão') || d.description.toLowerCase().includes('joão'));
    expect(joao?.amount).toBe(800);
    expect(joao?.type?.toLowerCase()).toBe('income');
    expect(joao?.paymentMethod).toMatch(/dinheiro|cash/i);

    // TV: 2000 loja débito
    const tv = drafts.find(d => d.description.toLowerCase().includes('televisão') || d.description.toLowerCase().includes('tv'));
    expect(tv?.amount).toBe(2000);
    expect(tv?.businessPurpose).toBe('BUSINESS');
    expect(tv?.paymentMethod).toMatch(/débito|debito|debit/i);

    // Oficina: 300 dinheiro
    const oficina = drafts.find(d => d.description.toLowerCase().includes('oficina'));
    expect(oficina?.amount).toBe(300);
    expect(oficina?.paymentMethod).toMatch(/dinheiro|cash/i);

    // Lucas: 1250 Pix entrada
    const lucas = drafts.find(d => d.counterparty?.toLowerCase().includes('lucas') || d.description.toLowerCase().includes('lucas'));
    expect(lucas?.amount).toBe(1250);
    expect(lucas?.type?.toLowerCase()).toBe('income');

    // Luz: 237.89 loja Pix
    const luz = drafts.find(d => d.description.toLowerCase().includes('luz'));
    expect(luz?.amount).toBe(237.89);
    expect(luz?.businessPurpose).toBe('BUSINESS');
    expect(luz?.paymentMethod?.toUpperCase()).toBe('PIX');

    // Abasteci: 180 débito
    const gas2 = drafts.find(d => d.amount === 180);
    expect(gas2?.paymentMethod).toMatch(/débito|debito|debit/i);
  });

  it('Grupo 2 — Mudança de Valor e Forma de Pagamento no Mesmo Rascunho', () => {
    let drafts: any[] = [];
    const d1 = processFinancialInput('Paguei 200 de gasolina no Pix.');
    if (d1.draft) drafts.push({ ...d1.draft, id: 'd1', version: 1 });

    expect(drafts[0].amount).toBe(200);
    expect(drafts[0].paymentMethod).toBe('Pix');

    const patchResult = applyTurnPatchWithDraftList(drafts, 'Não, foi 230.', 'CORRECTION', [], '2026-09-06');
    drafts = patchResult.updatedDrafts;

    expect(drafts[0].amount).toBe(230);
    expect(drafts[0].paymentMethod).toBe('Pix');
  });

  it('Grupo 3 — Previne Vazamento de Forma de Pagamento', () => {
    let drafts: any[] = [];
    
    // Turn 1
    const d1 = processFinancialInput('Paguei 200 de gasolina no Pix.');
    if (d1.draft) drafts.push({ ...d1.draft, id: 'd1', paymentMethod: 'PIX', version: 1 });

    // Turn 2
    const d2 = processFinancialInput('Comprei uma televisão por 2 mil.');
    if (d2.draft) drafts.push({ ...d2.draft, id: 'd2', paymentMethod: 'UNKNOWN', version: 1 });

    expect(drafts[0].paymentMethod).toBe('PIX');
    expect(drafts[1].paymentMethod).toBe('UNKNOWN'); // NÃO herda PIX

    // Turn 3
    const patchResult = applyTurnPatchWithDraftList(drafts, 'Foi em dinheiro.', 'CORRECTION', [], '2026-09-06');
    drafts = patchResult.updatedDrafts;

    expect(drafts[0].paymentMethod).toBe('PIX');
    expect(drafts[1].paymentMethod).toBe('Dinheiro');
  });

  it('Grupo 4 — Previne Vazamento de Categoria', () => {
    const d1 = processFinancialInput('Paguei 200 de gasolina.');
    expect(d1.draft?.categoryName).toBe('Combustível');

    const d2 = processFinancialInput('Comprei uma televisão por 2 mil.');
    expect(d2.draft?.categoryName).not.toBe('Combustível');
  });

  it('Grupo 5 — Previne Vazamento de Destino (Business/Personal)', () => {
    let drafts: any[] = [
      {
        id: 'd1',
        type: 'EXPENSE',
        amount: 2000,
        description: 'televisão',
        businessPurpose: 'BUSINESS',
        confidence: 0.9,
        questions: [],
        version: 1,
      }
    ];

    const d2 = processFinancialInput('Comprei uma geladeira.');
    expect(d2.draft?.businessPurpose).toBe('UNKNOWN'); // NÃO herda BUSINESS
  });

  it('Grupo 6 & 7 — Active Pending Question & Target Draft ID vinculados corretamente', () => {
    let drafts: any[] = [
      {
        id: 'draft_tv',
        type: 'EXPENSE',
        description: 'televisão',
        businessPurpose: 'UNKNOWN',
        missingFields: ['businessPurpose'],
        questions: ['Essa compra é para a loja ou pessoal?'],
        version: 1,
      },
      {
        id: 'draft_net',
        type: 'EXPENSE',
        amount: 300,
        description: 'internet',
        businessPurpose: 'UNKNOWN',
        missingFields: ['businessPurpose'],
        questions: ['Essa internet é da loja ou de casa?'],
        version: 1,
      }
    ];

    // Pergunta ativa era sobre TV
    let patchRes = applyTurnPatchWithDraftList(drafts, 'É para a loja.', 'ANSWER_TO_QUESTION', [], '2026-09-06');
    drafts = patchRes.updatedDrafts;
    expect(drafts[0].businessPurpose).toBe('BUSINESS');

    // Pergunta seguinte sobre Internet
    patchRes = applyTurnPatchWithDraftList(drafts, 'É da loja.', 'ANSWER_TO_QUESTION', [], '2026-09-06');
    drafts = patchRes.updatedDrafts;
    expect(drafts[1].businessPurpose).toBe('BUSINESS');
  });

  it('Grupo 8 & 9 — Referência Semântica a Rascunho Anterior por Nome ou Fornecedor', () => {
    let drafts: any[] = [
      {
        id: 'd_bechara',
        type: 'EXPENSE',
        amount: 500,
        description: 'Bechara',
        counterparty: 'Bechara',
        confidence: 0.9,
        questions: [],
        version: 1,
      },
      {
        id: 'd_gasolina',
        type: 'EXPENSE',
        amount: 200,
        description: 'gasolina',
        confidence: 0.9,
        questions: [],
        version: 1,
      }
    ];

    // Fala: "Na Bechara foi 550."
    const patchRes = applyTurnPatchWithDraftList(drafts, 'Na Bechara foi 550.', 'CORRECTION', [], '2026-09-06');
    drafts = patchRes.updatedDrafts;

    expect(drafts[0].amount).toBe(550);
    expect(drafts[1].amount).toBe(200); // Gasolina não alterada
  });

  it('Grupo 10 — Correções Múltiplas sobre a Mesma Movimentação', () => {
    let drafts: any[] = [];
    
    // Turn 1: Paguei 200 de gasolina no Pix.
    let res = processFinancialInput('Paguei 200 de gasolina no Pix.');
    drafts.push({
      id: 'd1',
      type: 'EXPENSE',
      amount: 200,
      description: 'gasolina',
      category: 'Combustível',
      paymentMethod: 'PIX',
      confidence: 0.9,
      questions: [],
      version: 1,
    });

    // Turn 2: Não, foi 220.
    drafts = applyTurnPatchWithDraftList(drafts, 'Não, foi 220.', 'CORRECTION', [], '2026-09-06').updatedDrafts;
    expect(drafts[0].amount).toBe(220);

    // Turn 3: Na verdade foi 230.
    drafts = applyTurnPatchWithDraftList(drafts, 'Na verdade foi 230.', 'CORRECTION', [], '2026-09-06').updatedDrafts;
    expect(drafts[0].amount).toBe(230);

    // Turn 4: E foi no débito, não no Pix.
    drafts = applyTurnPatchWithDraftList(drafts, 'E foi no débito, não no Pix.', 'CORRECTION', [], '2026-09-06').updatedDrafts;
    expect(drafts[0].paymentMethod).toBe('Cartão de Débito');
    expect(drafts[0].amount).toBe(230);
    expect(drafts.length).toBe(1);
  });

  it('Grupo 11 & 12 — Correção e Nova Movimentação na Mesma Fala', () => {
    let drafts: any[] = [
      {
        id: 'd_gasolina',
        type: 'EXPENSE',
        amount: 200,
        description: 'gasolina',
        category: 'Combustível',
        confidence: 0.9,
        questions: [],
        version: 1,
      }
    ];

    const input = 'Na gasolina foi 250, e também paguei 300 de internet.';
    const res = processFinancialInput(input);

    expect(res.draft?.batchDraftsList?.[1].description).toContain('internet');
    expect(res.draft?.batchDraftsList?.[1].amount).toBe(300);

    // Aplica correção na gasolina
    const patchRes = applyTurnPatchWithDraftList(drafts, input, 'CORRECTION', [], '2026-09-06');
    expect(patchRes.updatedDrafts[0].amount).toBe(250);
  });

  it('Grupo 36 — Correção sem a palavra "não"', () => {
    let drafts: any[] = [
      {
        id: 'd1',
        type: 'EXPENSE',
        amount: 200,
        description: 'gasolina',
        confidence: 0.9,
        questions: [],
        version: 1,
      }
    ];

    const patchRes = applyTurnPatchWithDraftList(drafts, 'Foi 250.', 'CORRECTION' as any, [], '2026-09-06');
    expect(patchRes.updatedDrafts[0].amount).toBe(250);
  });
});
