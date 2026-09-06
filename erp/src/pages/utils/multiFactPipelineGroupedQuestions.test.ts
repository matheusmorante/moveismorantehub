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

import {
  processFinancialInput,
  applyTurnPatchWithDraftList,
} from '../../../../mobile/src/services/financialAiAssistantService';
import { buildDraftAnalysisChips } from './draftAnalysisChips';

describe('BATERIA DE REGRESSÃO — PIPELINE DE MÚLTIPLOS FATOS E PERGUNTAS AGRUPADAS', () => {

  it('TESTE 1 — Frase Real do Bug: luz R$ 100 e internet R$ 300 não perde o segundo rascunho', () => {
    const text = "eu paguei a luz né no valor de R$ 100 e paguei a internet no valor de R$ 300";
    const res = processFinancialInput(text, '2026-09-06');

    expect(res.draft).toBeDefined();
    expect(res.isRealized).toBe(true);
    expect(res.draft?.batchDraftsList).toBeDefined();
    expect(res.draft?.batchDraftsList?.length).toBe(2);

    const batch = res.draft!.batchDraftsList!;
    // Luz
    const luz = batch.find(d => d.description.toLowerCase().includes('luz'));
    expect(luz).toBeDefined();
    expect(luz?.amount).toBe(100);
    expect(luz?.isRealized).toBe(true);

    // Internet
    const internet = batch.find(d => d.description.toLowerCase().includes('internet'));
    expect(internet).toBeDefined();
    expect(internet?.amount).toBe(300);
    expect(internet?.isRealized).toBe(true);

    // Pergunta Agrupada Inteligente
    expect(res.draft?.questionToUser).toMatch(/luz e internet são da loja ou são pessoais/i);
  });

  it('TESTE 2 — Resposta Coletiva de Finalidade ("as duas são da loja")', () => {
    const text = "eu paguei a luz né no valor de R$ 100 e paguei a internet no valor de R$ 300";
    const res = processFinancialInput(text, '2026-09-06');
    let drafts = res.draft!.batchDraftsList!;

    // Usuário responde coletivamente
    const patchRes = applyTurnPatchWithDraftList(drafts, "as duas são da loja", 'ANSWER_TO_QUESTION', [], '2026-09-06');
    drafts = patchRes.updatedDrafts;

    expect(drafts[0].businessPurpose).toBe('BUSINESS');
    expect(drafts[1].businessPurpose).toBe('BUSINESS');
  });

  it('TESTE 3 — Resposta Individual de Finalidade ("a luz é da loja e a internet é pessoal")', () => {
    const text = "Paguei luz de 100 e internet de 300";
    const res = processFinancialInput(text, '2026-09-06');
    let drafts = res.draft!.batchDraftsList!;

    const patchRes = applyTurnPatchWithDraftList(drafts, "a luz é da loja e a internet é pessoal", 'ANSWER_TO_QUESTION', [], '2026-09-06');
    drafts = patchRes.updatedDrafts;

    const luz = drafts.find(d => d.description.toLowerCase().includes('luz'));
    const internet = drafts.find(d => d.description.toLowerCase().includes('internet'));

    expect(luz?.businessPurpose).toBe('BUSINESS');
    expect(internet?.businessPurpose).toBe('PERSONAL');
  });

  it('TESTE 4 — Resposta Coletiva de Forma de Pagamento ("as duas foram no Pix")', () => {
    const text = "Paguei luz de 100 e internet de 300";
    const res = processFinancialInput(text, '2026-09-06');
    let drafts = res.draft!.batchDraftsList!;

    // 1. Resposta de finalidade
    let patchRes = applyTurnPatchWithDraftList(drafts, "as duas são da loja", 'ANSWER_TO_QUESTION', [], '2026-09-06');
    drafts = patchRes.updatedDrafts;

    // 2. Resposta de forma de pagamento
    patchRes = applyTurnPatchWithDraftList(drafts, "as duas foram no Pix", 'ANSWER_TO_QUESTION', [], '2026-09-06');
    drafts = patchRes.updatedDrafts;

    expect(drafts[0].paymentMethod).toBe('Pix');
    expect(drafts[1].paymentMethod).toBe('Pix');
    expect(drafts[0].isReadyForConfirmation).toBe(true);
    expect(drafts[1].isReadyForConfirmation).toBe(true);
  });

  it('TESTE 5 — Resposta Individual de Forma de Pagamento ("a luz foi no Pix e a internet em dinheiro")', () => {
    const text = "Paguei luz de 100 e internet de 300";
    const res = processFinancialInput(text, '2026-09-06');
    let drafts = res.draft!.batchDraftsList!;

    let patchRes = applyTurnPatchWithDraftList(drafts, "as duas são da loja", 'ANSWER_TO_QUESTION', [], '2026-09-06');
    drafts = patchRes.updatedDrafts;

    patchRes = applyTurnPatchWithDraftList(drafts, "a luz foi no Pix e a internet em dinheiro", 'ANSWER_TO_QUESTION', [], '2026-09-06');
    drafts = patchRes.updatedDrafts;

    const luz = drafts.find(d => d.description.toLowerCase().includes('luz'));
    const internet = drafts.find(d => d.description.toLowerCase().includes('internet'));

    expect(luz?.paymentMethod).toBe('Pix');
    expect(internet?.paymentMethod).toBe('Dinheiro');
  });

  it('TESTE 6 — Chips de Análise em Tempo Real mostram TODAS as movimentações do lote', () => {
    const text = "eu paguei a luz né no valor de R$ 100 e paguei a internet no valor de R$ 300";
    const res = processFinancialInput(text, '2026-09-06');

    const chips = buildDraftAnalysisChips(res.draft);
    expect(chips.length).toBeGreaterThan(0);

    const textLabels = chips.map(c => c.label).join(' | ');
    expect(textLabels).toMatch(/100/);
    expect(textLabels).toMatch(/300/);
  });

  it('TESTE 7 — Três movimentações simultâneas ("Paguei luz 100, internet 300 e água 150")', () => {
    const text = "Paguei luz 100, internet 300 e água 150";
    const res = processFinancialInput(text, '2026-09-06');

    expect(res.draft?.batchDraftsList?.length).toBe(3);
    const batch = res.draft!.batchDraftsList!;

    expect(batch.find(d => d.description.toLowerCase().includes('luz'))?.amount).toBe(100);
    expect(batch.find(d => d.description.toLowerCase().includes('internet'))?.amount).toBe(300);
    expect(batch.find(d => d.description.toLowerCase().includes('água'))?.amount).toBe(150);
  });

  it('TESTE 8 — Frase Real do Novo Print com Ruído de ASR e Elipse do Verbo ("fiz um pagamento de luz 100 internet 300")', () => {
    const text = "deve é quase um eu fiz um pagamento de uma conta de luz de R$ 100 uma conta de internet de R$ 300";
    const res = processFinancialInput(text, '2026-09-06');

    expect(res.draft).toBeDefined();
    expect(res.isRealized).toBe(true);
    expect(res.draft?.batchDraftsList).toBeDefined();
    expect(res.draft?.batchDraftsList?.length).toBe(2);

    const batch = res.draft!.batchDraftsList!;
    const luz = batch.find(d => d.description.toLowerCase().includes('luz'));
    const internet = batch.find(d => d.description.toLowerCase().includes('internet'));

    expect(luz).toBeDefined();
    expect(luz?.amount).toBe(100);
    expect(luz?.isRealized).toBe(true);

    expect(internet).toBeDefined();
    expect(internet?.amount).toBe(300);
    expect(internet?.isRealized).toBe(true);
  });

  it('TESTE 9 — Elipse Verbal com 3 itens ("Eu paguei a luz de 100, internet de 300 e água de 150")', () => {
    const text = "Eu paguei a luz de 100, internet de 300 e água de 150.";
    const res = processFinancialInput(text, '2026-09-06');

    expect(res.draft?.batchDraftsList?.length).toBe(3);
    const batch = res.draft!.batchDraftsList!;
    expect(batch.find(d => d.description.toLowerCase().includes('luz'))?.amount).toBe(100);
    expect(batch.find(d => d.description.toLowerCase().includes('internet'))?.amount).toBe(300);
    expect(batch.find(d => d.description.toLowerCase().includes('água'))?.amount).toBe(150);
  });

  it('TESTE 10 — "Fiz pagamento de luz 100, internet 300, água 150"', () => {
    const text = "Fiz pagamento de luz 100, internet 300, água 150.";
    const res = processFinancialInput(text, '2026-09-06');

    expect(res.draft?.batchDraftsList?.length).toBe(3);
    expect(res.isRealized).toBe(true);
  });

  it('TESTE 11 — "Eu paguei R$ 100 de luz e R$ 300 de internet"', () => {
    const text = "Eu paguei R$ 100 de luz e R$ 300 de internet.";
    const res = processFinancialInput(text, '2026-09-06');

    expect(res.draft?.batchDraftsList?.length).toBe(2);
    const batch = res.draft!.batchDraftsList!;
    expect(batch.find(d => d.description.toLowerCase().includes('luz'))?.amount).toBe(100);
    expect(batch.find(d => d.description.toLowerCase().includes('internet'))?.amount).toBe(300);
  });

});
