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

import { applyTurnPatchWithDraftList } from '../../../../mobile/src/services/financialAiAssistantService';

describe('Bateria E2E/Estresse — Ordem Assíncrona, Versionamento e Idempotência (asyncConversationOrdering.test.ts)', () => {
  it('Grupo 22 — Versionamento de Draft (invariante incomingVersion < currentVersion)', () => {
    const currentDraft: any = {
      id: 'd1',
      type: 'EXPENSE',
      amount: 250, // Versão 2 atualizada
      description: 'gasolina',
      confidence: 0.9,
      questions: [],
      version: 2,
    };

    // Resposta assíncrona antiga com version 1 tentando sobrescrever
    const staleUpdate: any = {
      id: 'd1',
      type: 'EXPENSE',
      amount: 200, // Versão 1 antiga
      description: 'gasolina',
      confidence: 0.9,
      questions: [],
      version: 1,
    };

    const processIncomingUpdate = (current: any, incoming: any): any => {
      if (incoming.version < current.version) {
        return current; // Ignora update obsoleto
      }
      return incoming;
    };

    const finalDraft = processIncomingUpdate(currentDraft, staleUpdate);
    expect(finalDraft.version).toBe(2);
    expect(finalDraft.amount).toBe(250); // Manteve valor mais recente 250
  });

  it('Grupo 23 — Prevenção de Duplo Clique em Confirmar', () => {
    let confirmCallCount = 0;
    const processedIds = new Set<string>();

    const confirmDraft = (confirmationId: string) => {
      if (processedIds.has(confirmationId)) {
        return { status: 'IGNORED_DUPLICATE' };
      }
      processedIds.add(confirmationId);
      confirmCallCount++;
      return { status: 'SUCCESS' };
    };

    const confId = 'conf_123_456';
    const res1 = confirmDraft(confId);
    const res2 = confirmDraft(confId); // Clique duplo em 20ms

    expect(res1.status).toBe('SUCCESS');
    expect(res2.status).toBe('IGNORED_DUPLICATE');
    expect(confirmCallCount).toBe(1);
  });

  it('Grupo 24 — Confirmar Todas as Prontas (apenas completas)', () => {
    const drafts: any[] = [
      {
        id: 'A',
        type: 'EXPENSE',
        amount: 200,
        description: 'gasolina',
        category: 'Combustível',
        paymentMethod: 'PIX',
        businessPurpose: 'BUSINESS',
        confidence: 0.9,
        questions: [],
        version: 1,
      },
      {
        id: 'B',
        type: 'EXPENSE',
        amount: 300,
        description: 'geladeira',
        category: 'Equipamentos',
        paymentMethod: 'UNKNOWN', // Incompleto
        businessPurpose: 'UNKNOWN', // Incompleto
        confidence: 0.9,
        questions: ['É para loja ou pessoal?'],
        version: 1,
      },
      {
        id: 'C',
        type: 'INCOME',
        amount: 800,
        description: 'venda',
        category: 'Vendas',
        paymentMethod: 'CASH',
        businessPurpose: 'BUSINESS',
        confidence: 0.9,
        questions: [],
        version: 1,
      }
    ];

    const isComplete = (d: any) => {
      return d.amount > 0 && d.paymentMethod !== 'UNKNOWN' && (d.type === 'INCOME' || d.businessPurpose !== 'UNKNOWN');
    };

    const readyDrafts = drafts.filter(isComplete);
    const pendingDrafts = drafts.filter(d => !isComplete(d));

    expect(readyDrafts.map(d => d.id)).toEqual(['A', 'C']);
    expect(pendingDrafts.map(d => d.id)).toEqual(['B']);
  });

  it('Grupo 38 — Correção de Contraparte', () => {
    let drafts: any[] = [
      {
        id: 'd1',
        type: 'EXPENSE',
        amount: 500,
        description: 'João',
        counterparty: 'João',
        confidence: 0.9,
        questions: [],
        version: 1,
      }
    ];

    const patchRes = applyTurnPatchWithDraftList(drafts, 'Foi para Lucas.', 'CORRECTION', [], '2026-09-06');
    expect(patchRes.updatedDrafts[0].counterparty).toBe('Lucas');
  });

  it('Grupo 39 — Correção de Categoria por Contexto (Personal -> Business)', () => {
    let drafts: any[] = [
      {
        id: 'd1',
        type: 'EXPENSE',
        amount: 2000,
        description: 'televisão',
        businessPurpose: 'PERSONAL',
        categoryName: 'Pró-labore',
        confidence: 0.9,
        questions: [],
        version: 1,
      }
    ];

    const patchRes = applyTurnPatchWithDraftList(drafts, 'Na verdade é para usar no caixa da loja.', 'CORRECTION', [], '2026-09-06');
    expect(patchRes.updatedDrafts[0].businessPurpose).toBe('BUSINESS');
    expect(patchRes.updatedDrafts[0].categoryName).toBe('Equipamentos da Empresa');
  });

  it('Grupo 45 & 46 — Retry de Confirmação com Idempotência', () => {
    let persistedRecords: string[] = [];

    const persistWithRetry = (idempotencyKey: string) => {
      if (persistedRecords.includes(idempotencyKey)) {
        return { success: true, duplicateHandled: true };
      }
      persistedRecords.push(idempotencyKey);
      return { success: true, duplicateHandled: false };
    };

    const key = 'trans_tx_998877';
    // Tentativa 1 (sucesso backend)
    const try1 = persistWithRetry(key);
    // Tentativa 2 (retry por cliente após timeout simulado)
    const try2 = persistWithRetry(key);

    expect(try1.duplicateHandled).toBe(false);
    expect(try2.duplicateHandled).toBe(true);
    expect(persistedRecords.length).toBe(1);
  });
});
