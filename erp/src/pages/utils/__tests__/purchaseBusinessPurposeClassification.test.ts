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
  // GRUPO 6 — GELADEIRA / DESTINO DA COMPRA
  describe('GRUPO 6 — GELADEIRA / DESTINO DA COMPRA', () => {
    test('TESTE 6.1: "Comprei uma geladeira por R$ 2.500 no Pix." -> Pergunta destino', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Comprei uma geladeira por R$ 2.500 no Pix.',
        [],
        mockCategories
      );
      expect(draft.amount).toBe(2500);
      expect(draft.paymentMethod).toBe('Pix');
      expect(draft.businessPurpose).toBe('UNKNOWN');
      expect(draft.isReadyForConfirmation).toBe(false);
      expect(draft.questionToUser).toMatch(
        /essa geladeira é para a loja ou é uma compra pessoal\?/i
      );
    });

    test('TESTE 6.2: "Comprei uma geladeira para a loja por R$ 2.500 no Pix." -> BUSINESS', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Comprei uma geladeira para a loja por R$ 2.500 no Pix.',
        [],
        mockCategories
      );
      expect(draft.businessPurpose).toBe('BUSINESS');
      expect(draft.categoryName).toBe('Equipamentos da Empresa');
      expect(draft.isReadyForConfirmation).toBe(true);
    });

    test('TESTE 6.3: "Comprei uma geladeira para minha casa por R$ 2.500." -> PERSONAL / Pró-labore', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Comprei uma geladeira para minha casa por R$ 2.500 no Pix.',
        [],
        mockCategories
      );
      expect(draft.businessPurpose).toBe('PERSONAL');
      expect(draft.categoryName).toBe('Pró-labore');
      expect(draft.isReadyForConfirmation).toBe(true);
    });
  });

  // GRUPO 7 — TELEVISÃO E ELETRÔNICOS
  describe('GRUPO 7 — TELEVISÃO E ELETRÔNICOS', () => {
    test('TESTE 7.1: "Comprei uma televisão de R$ 3.000 no Pix." -> Pergunta destino', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Comprei uma televisão de R$ 3.000 no Pix.',
        [],
        mockCategories
      );
      expect(draft.businessPurpose).toBe('UNKNOWN');
      expect(draft.questionToUser).toMatch(
        /essa televisão é para a loja ou é uma compra pessoal\?/i
      );
    });

    test('TESTE 7.2: "Comprei uma TV para colocar na loja, deu R$ 3.000 no Pix." -> BUSINESS', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Comprei uma TV para colocar na loja, deu R$ 3.000 no Pix.',
        [],
        mockCategories
      );
      expect(draft.businessPurpose).toBe('BUSINESS');
      expect(draft.categoryName).toBe('Equipamentos da Empresa');
    });

    test('TESTE 7.3: "Comprei uma televisão para minha casa, deu R$ 3.000 no Pix." -> PERSONAL / Pró-labore', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Comprei uma televisão para minha casa, deu R$ 3.000 no Pix.',
        [],
        mockCategories
      );
      expect(draft.businessPurpose).toBe('PERSONAL');
      expect(draft.categoryName).toBe('Pró-labore');
    });

    test('TESTE 7.4: "Comprei um notebook por R$ 4.000 no Pix." -> Pergunta destino', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Comprei um notebook por R$ 4.000 no Pix.',
        [],
        mockCategories
      );
      expect(draft.businessPurpose).toBe('UNKNOWN');
      expect(draft.questionToUser).toMatch(
        /esse notebook é para a loja ou é uma compra pessoal\?/i
      );
    });

    test('TESTE 7.5: "Comprei um notebook para o caixa da loja por R$ 4.000 no Pix." -> BUSINESS', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Comprei um notebook para o caixa da loja por R$ 4.000 no Pix.',
        [],
        mockCategories
      );
      expect(draft.businessPurpose).toBe('BUSINESS');
      expect(draft.categoryName).toBe('Equipamentos da Empresa');
    });

    test('TESTE 7.6: "Comprei um celular para mim por R$ 2.000 no Pix." -> PERSONAL / Pró-labore', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Comprei um celular para mim por R$ 2.000 no Pix.',
        [],
        mockCategories
      );
      expect(draft.businessPurpose).toBe('PERSONAL');
      expect(draft.categoryName).toBe('Pró-labore');
    });
  });

  // GRUPO 8 — OUTROS ITENS AMBÍGUOS
  describe('GRUPO 8 — OUTROS ITENS AMBÍGUOS', () => {
    const items = [
      { name: 'micro-ondas', article: 'um' },
      { name: 'freezer', article: 'um' },
      { name: 'ar-condicionado', article: 'um' },
      { name: 'impressora', article: 'uma' },
      { name: 'mesa', article: 'uma' },
      { name: 'cadeira', article: 'uma' },
      { name: 'computador', article: 'um' },
      { name: 'eletrodoméstico', article: 'um' },
    ];

    items.forEach((item) => {
      test(`"Comprei ${item.article} ${item.name} por R$ 1.000 no Pix." -> Pergunta destino`, async () => {
        const draft = await parseFinancialIntentWithGemini(
          `Comprei ${item.article} ${item.name} por R$ 1.000 no Pix.`,
          [],
          mockCategories
        );
        expect(draft.businessPurpose).toBe('UNKNOWN');
        expect(draft.questionToUser).toMatch(/loja ou é uma compra pessoal\?/i);
      });
    });
  });
});
