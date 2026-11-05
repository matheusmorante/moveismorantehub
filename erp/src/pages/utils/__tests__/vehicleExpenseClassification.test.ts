import { describe, test, expect, vi } from 'vitest';

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
        limit: () => Promise.resolve({ data: [] }),
      }),
      insert: () => ({
        select: () =>
          Object.assign(Promise.resolve({ data: [{ id: 'tx-123' }], error: null }), {
            single: () => Promise.resolve({ data: { id: 'tx-123' }, error: null }),
          }),
      }),
    }),
  },
}));

import { parseFinancialIntentWithGemini } from '../../';

const mockCategories: Array<{ id: string; name: string; type: 'income' | 'expense' }> = [
  { id: 'cat-1', name: 'Combustível', type: 'expense' },
  { id: 'cat-2', name: 'Manutenção de Veículos', type: 'expense' },
  { id: 'cat-3', name: 'Contas de Consumo', type: 'expense' },
  { id: 'cat-4', name: 'Equipamentos da Empresa', type: 'expense' },
  { id: 'cat-5', name: 'Pró-labore', type: 'expense' },
  { id: 'cat-6', name: 'Compra de estoque', type: 'expense' },
  { id: 'cat-7', name: 'Frete', type: 'expense' },
  { id: 'cat-8', name: 'Alimentação', type: 'expense' },
  { id: 'cat-9', name: 'Vendas', type: 'income' },
  { id: 'cat-10', name: 'Outras receitas', type: 'income' },
  { id: 'cat-11', name: 'Empréstimos', type: 'income' },
];

describe('BATERIA DE TESTES DAS ÚLTIMAS REGRAS DO ASSISTENTE FINANCEIRO', () => {
  // GRUPO 11 — COMBUSTÍVEL
  describe('GRUPO 11 — COMBUSTÍVEL', () => {
    test('TESTE 11.1: "Abasteci R$ 200 de gasolina no Pix."', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Abasteci R$ 200 de gasolina no Pix.',
        [],
        mockCategories
      );
      expect(draft.categoryName).toBe('Combustível');
      expect(draft.businessPurpose).toBe('BUSINESS');
      expect(draft.missingFields).not.toContain('businessPurpose');
      expect(draft.isReadyForConfirmation).toBe(true);
    });

    test('TESTE 11.2: "Coloquei R$ 300 de diesel no Pix."', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Coloquei R$ 300 de diesel no Pix.',
        [],
        mockCategories
      );
      expect(draft.categoryName).toBe('Combustível');
      expect(draft.businessPurpose).toBe('BUSINESS');
    });

    test('TESTE 11.3: "Abasteci no posto e deu R$ 250 no Pix."', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Abasteci no posto e deu R$ 250 no Pix.',
        [],
        mockCategories
      );
      expect(draft.categoryName).toBe('Combustível');
      expect(draft.paymentMethod).toBe('Pix');
    });

    test('TESTE 11.4: "Paguei R$ 180 de etanol no Pix."', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Paguei R$ 180 de etanol no Pix.',
        [],
        mockCategories
      );
      expect(draft.categoryName).toBe('Combustível');
    });
  });

  // GRUPO 12 — MANUTENÇÃO DE VEÍCULOS
  describe('GRUPO 12 — MANUTENÇÃO DE VEÍCULOS', () => {
    test('TESTE 12.1: "Troquei o óleo do carro, deu R$ 300 no Pix."', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Troquei o óleo do carro, deu R$ 300 no Pix.',
        [],
        mockCategories
      );
      expect(draft.categoryName).toBe('Manutenção de Veículos');
      expect(draft.businessPurpose).toBe('BUSINESS');
    });

    test('TESTE 12.2: "Paguei R$ 1.200 na oficina no Pix."', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Paguei R$ 1.200 na oficina no Pix.',
        [],
        mockCategories
      );
      expect(draft.categoryName).toBe('Manutenção de Veículos');
    });

    test('TESTE 12.3: "Comprei dois pneus por R$ 900 no Pix."', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Comprei dois pneus por R$ 900 no Pix.',
        [],
        mockCategories
      );
      expect(draft.categoryName).toBe('Manutenção de Veículos');
    });

    test('TESTE 12.4: "Troquei a bateria do carro, R$ 450 no Pix."', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Troquei a bateria do carro, R$ 450 no Pix.',
        [],
        mockCategories
      );
      expect(draft.categoryName).toBe('Manutenção de Veículos');
    });

    test('TESTE 12.5: "Fiz alinhamento e balanceamento, deu R$ 180 no Pix."', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Fiz alinhamento e balanceamento, deu R$ 180 no Pix.',
        [],
        mockCategories
      );
      expect(draft.categoryName).toBe('Manutenção de Veículos');
    });

    test('TESTE 12.6: "Paguei a revisão do carro, R$ 500 no Pix."', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Paguei a revisão do carro, R$ 500 no Pix.',
        [],
        mockCategories
      );
      expect(draft.categoryName).toBe('Manutenção de Veículos');
    });
  });

  // GRUPO 13 — CATEGORIAS DE VEÍCULO DEVEM SER SEPARADAS
  describe('GRUPO 13 — CATEGORIAS DE VEÍCULO SEPARADAS', () => {
    test('Validar que Combustível e Manutenção de Veículos retornam categorias distintas', async () => {
      const draftComb = await parseFinancialIntentWithGemini(
        'Abasteci R$ 200 de gasolina no Pix.',
        [],
        mockCategories
      );
      const draftManut = await parseFinancialIntentWithGemini(
        'Troquei o óleo e deu R$ 300 no Pix.',
        [],
        mockCategories
      );

      expect(draftComb.categoryName).toBe('Combustível');
      expect(draftManut.categoryName).toBe('Manutenção de Veículos');
      expect(draftComb.categoryName).not.toBe(draftManut.categoryName);

      const catComb = mockCategories.find((c) => c.name === draftComb.categoryName);
      const catManut = mockCategories.find((c) => c.name === draftManut.categoryName);
      expect(catComb?.id).not.toBe(catManut?.id);
    });
  });

  // GRUPO 14 — FRASES MISTAS DE VEÍCULO
  describe('GRUPO 14 — FRASES MISTAS DE VEÍCULO', () => {
    test('"Abasteci R$ 200 e paguei R$ 300 da troca de óleo no Pix." -> 2 drafts independentes', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Abasteci 200 e paguei 300 de troca de óleo no Pix.',
        [],
        mockCategories
      );
      expect(draft.batchDraftsList).not.toBeNull();
      expect(draft.batchDraftsList?.length).toBe(2);

      const d1 = draft.batchDraftsList![0];
      const d2 = draft.batchDraftsList![1];

      expect(d1.categoryName).toBe('Combustível');
      expect(d1.amount).toBe(200);

      expect(d2.categoryName).toBe('Manutenção de Veículos');
      expect(d2.amount).toBe(300);
    });
  });

  // GRUPO 15 — NÃO INVENTAR FORMA DE PAGAMENTO
  describe('GRUPO 15 — NÃO INVENTAR FORMA DE PAGAMENTO', () => {
    test('"Abasteci R$ 200." -> paymentMethod = UNKNOWN', async () => {
      const draft = await parseFinancialIntentWithGemini('Abasteci R$ 200.', [], mockCategories);
      expect(draft.categoryName).toBe('Combustível');
      expect(draft.paymentMethod).toBe('UNKNOWN');
      expect(draft.missingFields).toContain('paymentMethod');
      expect(draft.isReadyForConfirmation).toBe(false);
    });

    test('"Paguei R$ 500 na oficina." -> paymentMethod = UNKNOWN', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Paguei R$ 500 na oficina.',
        [],
        mockCategories
      );
      expect(draft.categoryName).toBe('Manutenção de Veículos');
      expect(draft.paymentMethod).toBe('UNKNOWN');
      expect(draft.isReadyForConfirmation).toBe(false);
    });
  });

});
