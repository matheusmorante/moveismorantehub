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
        select: () => Object.assign(
          Promise.resolve({ data: [{ id: 'tx-123' }], error: null }),
          { single: () => Promise.resolve({ data: { id: 'tx-123' }, error: null }) }
        ),
      }),
    }),
  },
}));

import type { ParsedFinancialIntent } from '../../../../mobile/src/services/financialAiAssistantService';
import {
  parseFinancialIntentWithGemini,
  fallbackHeuristicParser,
} from '../../../../mobile/src/services/financialAiAssistantService';
import { validateParsedIntent } from '../../../../mobile/src/services/financial/financialIntentValidator';
import { trySlotFillingFallback } from '../../../../mobile/src/services/financial/financialSlotFilling';
import { buildDraftAnalysisChips } from './draftAnalysisChips';

const mockCategories = [
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
  // GRUPO 1 — TRANSAÇÃO ÚNICA
  describe('GRUPO 1 — TRANSAÇÃO ÚNICA', () => {
    test('TESTE 1.1: "Paguei R$ 1.000 para a Bechara hoje no Pix."', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei R$ 1.000 para a Bechara hoje no Pix.', [], mockCategories);
      expect(draft.type).toBe('expense');
      expect(draft.amount).toBe(1000);
      expect(draft.supplier).toBe('Bechara');
      expect(draft.paymentMethod).toBe('Pix');
      expect(draft.date).toBeDefined();
      expect(draft.installmentList).toBeFalsy();
      expect(draft.batchDraftsList).toBeFalsy();
    });

    test('TESTE 1.2: "Recebi R$ 800 do João no Pix."', async () => {
      const draft = await parseFinancialIntentWithGemini('Recebi R$ 800 do João no Pix.', [], mockCategories);
      expect(draft.type).toBe('income');
      expect(draft.amount).toBe(800);
      expect(draft.counterparty).toBe('João');
      expect(draft.paymentMethod).toBe('Pix');
      expect(draft.batchDraftsList).toBeFalsy();
    });
  });

  // GRUPO 2 — PARCELAMENTO NÃO GERA TRANSAÇÕES
  describe('GRUPO 2 — PARCELAMENTO NÃO GERA TRANSAÇÕES', () => {
    test('TESTE 2.1: "Fiz uma compra de R$ 10.000 em 10 vezes."', async () => {
      const draft = await parseFinancialIntentWithGemini('Fiz uma compra de R$ 10.000 em 10 vezes.', [], mockCategories);
      expect(draft.amount).toBeNull();
      expect(draft.isReadyForConfirmation).toBe(false);
      expect(draft.batchDraftsList).toBeFalsy();
    });

    test('TESTE 2.2: "Comprei uma televisão de R$ 6.000 em 6 vezes."', async () => {
      const draft = await parseFinancialIntentWithGemini('Comprei uma televisão de R$ 6.000 em 6 vezes.', [], mockCategories);
      expect(draft.amount).toBeNull();
      expect(draft.isReadyForConfirmation).toBe(false);
    });

    test('TESTE 2.3: "Tenho 8 parcelas de R$ 500 para pagar."', async () => {
      const draft = await parseFinancialIntentWithGemini('Tenho 8 parcelas de R$ 500 para pagar.', [], mockCategories);
      expect(draft.amount).toBeNull();
      expect(draft.isReadyForConfirmation).toBe(false);
    });
  });

  // GRUPO 3 — PAGAMENTO DE PARCELA = UMA TRANSAÇÃO
  describe('GRUPO 3 — PAGAMENTO DE PARCELA = UMA TRANSAÇÃO', () => {
    test('TESTE 3.1: "Paguei uma parcela da Bechara de R$ 1.000 no Pix."', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei uma parcela da Bechara de R$ 1.000 no Pix.', [], mockCategories);
      expect(draft.type).toBe('expense');
      expect(draft.amount).toBe(1000);
      expect(draft.supplier).toBe('Bechara');
      expect(draft.paymentMethod).toBe('Pix');
      expect(draft.description).toMatch(/parcela/i);
      expect(draft.installmentList).toBeFalsy();
    });

    test('TESTE 3.2: "Paguei a terceira parcela da Bechara, R$ 1.000."', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei a terceira parcela da Bechara, R$ 1.000.', [], mockCategories);
      expect(draft.type).toBe('expense');
      expect(draft.amount).toBe(1000);
      expect(draft.description).toMatch(/3ª parcela/i);
      expect(draft.installmentList).toBeFalsy();
    });

    test('TESTE 3.3: "Recebi a segunda parcela do João, R$ 800 no Pix."', async () => {
      const draft = await parseFinancialIntentWithGemini('Recebi a segunda parcela do João, R$ 800 no Pix.', [], mockCategories);
      expect(draft.type).toBe('income');
      expect(draft.amount).toBe(800);
      expect(draft.counterparty).toBe('João');
      expect(draft.paymentMethod).toBe('Pix');
      expect(draft.description).toMatch(/2ª parcela/i);
    });
  });

  // GRUPO 4 — RECORRÊNCIA NÃO GERA TRANSAÇÕES
  describe('GRUPO 4 — RECORRÊNCIA NÃO GERA TRANSAÇÕES', () => {
    test('TESTE 4.1: "Pago R$ 2.000 de aluguel todo mês."', async () => {
      const draft = await parseFinancialIntentWithGemini('Pago R$ 2.000 de aluguel todo mês.', [], mockCategories);
      expect(draft.amount).toBeNull();
      expect(draft.isReadyForConfirmation).toBe(false);
    });

    test('TESTE 4.2: "Todo mês pago 300 de internet."', async () => {
      const draft = await parseFinancialIntentWithGemini('Todo mês pago 300 de internet.', [], mockCategories);
      expect(draft.amount).toBeNull();
      expect(draft.isReadyForConfirmation).toBe(false);
    });

    test('TESTE 4.3: "Paguei R$ 2.000 do aluguel deste mês."', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei R$ 2.000 do aluguel deste mês.', [], mockCategories);
      expect(draft.type).toBe('expense');
      expect(draft.amount).toBe(2000);
    });
  });

  // GRUPO 5 — FUTURO NÃO É REALIZADO
  describe('GRUPO 5 — FUTURO NÃO É REALIZADO', () => {
    test('TESTE 5.1: "Vou pagar R$ 1.000 amanhã."', async () => {
      const draft = await parseFinancialIntentWithGemini('Vou pagar R$ 1.000 amanhã.', [], mockCategories);
      expect(draft.amount).toBeNull();
      expect(draft.isReadyForConfirmation).toBe(false);
    });

    test('TESTE 5.2: "Tenho que pagar R$ 3.000 para a Bechara semana que vem."', async () => {
      const draft = await parseFinancialIntentWithGemini('Tenho que pagar R$ 3.000 para a Bechara semana que vem.', [], mockCategories);
      expect(draft.amount).toBeNull();
      expect(draft.isReadyForConfirmation).toBe(false);
    });

    test('TESTE 5.3: "Acabei de pagar R$ 3.000 para a Bechara." vs "Vou pagar"', async () => {
      const realizado = await parseFinancialIntentWithGemini('Acabei de pagar R$ 3.000 para a Bechara.', [], mockCategories);
      expect(realizado.amount).toBe(3000);

      const futuro = await parseFinancialIntentWithGemini('Vou pagar R$ 3.000 para a Bechara.', [], mockCategories);
      expect(futuro.amount).toBeNull();
    });
  });

  // GRUPO 6 — GELADEIRA / DESTINO DA COMPRA
  describe('GRUPO 6 — GELADEIRA / DESTINO DA COMPRA', () => {
    test('TESTE 6.1: "Comprei uma geladeira por R$ 2.500 no Pix." -> Pergunta destino', async () => {
      const draft = await parseFinancialIntentWithGemini('Comprei uma geladeira por R$ 2.500 no Pix.', [], mockCategories);
      expect(draft.amount).toBe(2500);
      expect(draft.paymentMethod).toBe('Pix');
      expect(draft.businessPurpose).toBe('UNKNOWN');
      expect(draft.isReadyForConfirmation).toBe(false);
      expect(draft.questionToUser).toMatch(/essa geladeira é para a loja ou é uma compra pessoal\?/i);
    });

    test('TESTE 6.2: "Comprei uma geladeira para a loja por R$ 2.500 no Pix." -> BUSINESS', async () => {
      const draft = await parseFinancialIntentWithGemini('Comprei uma geladeira para a loja por R$ 2.500 no Pix.', [], mockCategories);
      expect(draft.businessPurpose).toBe('BUSINESS');
      expect(draft.categoryName).toBe('Equipamentos da Empresa');
      expect(draft.isReadyForConfirmation).toBe(true);
    });

    test('TESTE 6.3: "Comprei uma geladeira para minha casa por R$ 2.500." -> PERSONAL / Pró-labore', async () => {
      const draft = await parseFinancialIntentWithGemini('Comprei uma geladeira para minha casa por R$ 2.500 no Pix.', [], mockCategories);
      expect(draft.businessPurpose).toBe('PERSONAL');
      expect(draft.categoryName).toBe('Pró-labore');
      expect(draft.isReadyForConfirmation).toBe(true);
    });
  });

  // GRUPO 7 — TELEVISÃO E ELETRÔNICOS
  describe('GRUPO 7 — TELEVISÃO E ELETRÔNICOS', () => {
    test('TESTE 7.1: "Comprei uma televisão de R$ 3.000 no Pix." -> Pergunta destino', async () => {
      const draft = await parseFinancialIntentWithGemini('Comprei uma televisão de R$ 3.000 no Pix.', [], mockCategories);
      expect(draft.businessPurpose).toBe('UNKNOWN');
      expect(draft.questionToUser).toMatch(/essa televisão é para a loja ou é uma compra pessoal\?/i);
    });

    test('TESTE 7.2: "Comprei uma TV para colocar na loja, deu R$ 3.000 no Pix." -> BUSINESS', async () => {
      const draft = await parseFinancialIntentWithGemini('Comprei uma TV para colocar na loja, deu R$ 3.000 no Pix.', [], mockCategories);
      expect(draft.businessPurpose).toBe('BUSINESS');
      expect(draft.categoryName).toBe('Equipamentos da Empresa');
    });

    test('TESTE 7.3: "Comprei uma televisão para minha casa, deu R$ 3.000 no Pix." -> PERSONAL / Pró-labore', async () => {
      const draft = await parseFinancialIntentWithGemini('Comprei uma televisão para minha casa, deu R$ 3.000 no Pix.', [], mockCategories);
      expect(draft.businessPurpose).toBe('PERSONAL');
      expect(draft.categoryName).toBe('Pró-labore');
    });

    test('TESTE 7.4: "Comprei um notebook por R$ 4.000 no Pix." -> Pergunta destino', async () => {
      const draft = await parseFinancialIntentWithGemini('Comprei um notebook por R$ 4.000 no Pix.', [], mockCategories);
      expect(draft.businessPurpose).toBe('UNKNOWN');
      expect(draft.questionToUser).toMatch(/esse notebook é para a loja ou é uma compra pessoal\?/i);
    });

    test('TESTE 7.5: "Comprei um notebook para o caixa da loja por R$ 4.000 no Pix." -> BUSINESS', async () => {
      const draft = await parseFinancialIntentWithGemini('Comprei um notebook para o caixa da loja por R$ 4.000 no Pix.', [], mockCategories);
      expect(draft.businessPurpose).toBe('BUSINESS');
      expect(draft.categoryName).toBe('Equipamentos da Empresa');
    });

    test('TESTE 7.6: "Comprei um celular para mim por R$ 2.000 no Pix." -> PERSONAL / Pró-labore', async () => {
      const draft = await parseFinancialIntentWithGemini('Comprei um celular para mim por R$ 2.000 no Pix.', [], mockCategories);
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

    items.forEach(item => {
      test(`"Comprei ${item.article} ${item.name} por R$ 1.000 no Pix." -> Pergunta destino`, async () => {
        const draft = await parseFinancialIntentWithGemini(`Comprei ${item.article} ${item.name} por R$ 1.000 no Pix.`, [], mockCategories);
        expect(draft.businessPurpose).toBe('UNKNOWN');
        expect(draft.questionToUser).toMatch(/loja ou é uma compra pessoal\?/i);
      });
    });
  });

  // GRUPO 9 — CONTA DE LUZ
  describe('GRUPO 9 — CONTA DE LUZ', () => {
    test('TESTE 9.1: "Acabei de pagar uma luz, é 237 e 89 centavos, foi no Pix."', async () => {
      const draft = await parseFinancialIntentWithGemini('Acabei de pagar uma luz, é 237 e 89 centavos, foi no Pix.', [], mockCategories);
      expect(draft.amount).toBe(237.89);
      expect(draft.paymentMethod).toBe('Pix');
      expect(draft.businessPurpose).toBe('UNKNOWN');
      expect(draft.questionToUser).toMatch(/essa conta de luz é da loja ou é uma conta pessoal\?/i);
    });

    test('TESTE 9.2: Responder "É da loja."', async () => {
      const activeDraft: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        type: 'expense',
        amount: 237.89,
        description: 'Conta de luz',
        paymentMethod: 'Pix',
        businessPurpose: 'UNKNOWN',
        missingFields: ['businessPurpose'],
        questionToUser: 'Essa conta de luz é da loja ou é uma conta pessoal?',
        confidence: 0.9,
        isReadyForConfirmation: false,
      };

      const patched = trySlotFillingFallback('É da loja.', activeDraft, '2026-09-06');
      expect(patched?.amount).toBe(237.89);
      expect(patched?.paymentMethod).toBe('Pix');
      expect(patched?.businessPurpose).toBe('BUSINESS');
      expect(patched?.categoryName).toBe('Contas de Consumo');
      expect(patched?.isReadyForConfirmation).toBe(true);
    });

    test('TESTE 9.3: Responder "É da minha casa."', async () => {
      const activeDraft: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        type: 'expense',
        amount: 237.89,
        description: 'Conta de luz',
        paymentMethod: 'Pix',
        businessPurpose: 'UNKNOWN',
        missingFields: ['businessPurpose'],
        questionToUser: 'Essa conta de luz é da loja ou é uma conta pessoal?',
        confidence: 0.9,
        isReadyForConfirmation: false,
      };

      const patched = trySlotFillingFallback('É da minha casa.', activeDraft, '2026-09-06');
      expect(patched?.amount).toBe(237.89);
      expect(patched?.paymentMethod).toBe('Pix');
      expect(patched?.businessPurpose).toBe('PERSONAL');
      expect(patched?.categoryName).toBe('Pró-labore');
      expect(patched?.isReadyForConfirmation).toBe(true);
    });
  });

  // GRUPO 10 — ÁGUA / INTERNET / TELEFONE
  describe('GRUPO 10 — ÁGUA / INTERNET / TELEFONE', () => {
    test('"Paguei a água R$ 80 no Pix." -> Pergunta destino', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei a água R$ 80 no Pix.', [], mockCategories);
      expect(draft.businessPurpose).toBe('UNKNOWN');
      expect(draft.questionToUser).toMatch(/loja ou é uma conta pessoal\?/i);
    });

    test('"Paguei a internet da loja R$ 150 no Pix." -> BUSINESS', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei a internet da loja R$ 150 no Pix.', [], mockCategories);
      expect(draft.businessPurpose).toBe('BUSINESS');
      expect(draft.categoryName).toBe('Contas de Consumo');
    });

    test('"Paguei a internet de casa R$ 150 no Pix." -> PERSONAL / Pró-labore', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei a internet de casa R$ 150 no Pix.', [], mockCategories);
      expect(draft.businessPurpose).toBe('PERSONAL');
      expect(draft.categoryName).toBe('Pró-labore');
    });
  });

  // GRUPO 11 — COMBUSTÍVEL
  describe('GRUPO 11 — COMBUSTÍVEL', () => {
    test('TESTE 11.1: "Abasteci R$ 200 de gasolina no Pix."', async () => {
      const draft = await parseFinancialIntentWithGemini('Abasteci R$ 200 de gasolina no Pix.', [], mockCategories);
      expect(draft.categoryName).toBe('Combustível');
      expect(draft.businessPurpose).toBe('BUSINESS');
      expect(draft.missingFields).not.toContain('businessPurpose');
      expect(draft.isReadyForConfirmation).toBe(true);
    });

    test('TESTE 11.2: "Coloquei R$ 300 de diesel no Pix."', async () => {
      const draft = await parseFinancialIntentWithGemini('Coloquei R$ 300 de diesel no Pix.', [], mockCategories);
      expect(draft.categoryName).toBe('Combustível');
      expect(draft.businessPurpose).toBe('BUSINESS');
    });

    test('TESTE 11.3: "Abasteci no posto e deu R$ 250 no Pix."', async () => {
      const draft = await parseFinancialIntentWithGemini('Abasteci no posto e deu R$ 250 no Pix.', [], mockCategories);
      expect(draft.categoryName).toBe('Combustível');
      expect(draft.paymentMethod).toBe('Pix');
    });

    test('TESTE 11.4: "Paguei R$ 180 de etanol no Pix."', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei R$ 180 de etanol no Pix.', [], mockCategories);
      expect(draft.categoryName).toBe('Combustível');
    });
  });

  // GRUPO 12 — MANUTENÇÃO DE VEÍCULOS
  describe('GRUPO 12 — MANUTENÇÃO DE VEÍCULOS', () => {
    test('TESTE 12.1: "Troquei o óleo do carro, deu R$ 300 no Pix."', async () => {
      const draft = await parseFinancialIntentWithGemini('Troquei o óleo do carro, deu R$ 300 no Pix.', [], mockCategories);
      expect(draft.categoryName).toBe('Manutenção de Veículos');
      expect(draft.businessPurpose).toBe('BUSINESS');
    });

    test('TESTE 12.2: "Paguei R$ 1.200 na oficina no Pix."', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei R$ 1.200 na oficina no Pix.', [], mockCategories);
      expect(draft.categoryName).toBe('Manutenção de Veículos');
    });

    test('TESTE 12.3: "Comprei dois pneus por R$ 900 no Pix."', async () => {
      const draft = await parseFinancialIntentWithGemini('Comprei dois pneus por R$ 900 no Pix.', [], mockCategories);
      expect(draft.categoryName).toBe('Manutenção de Veículos');
    });

    test('TESTE 12.4: "Troquei a bateria do carro, R$ 450 no Pix."', async () => {
      const draft = await parseFinancialIntentWithGemini('Troquei a bateria do carro, R$ 450 no Pix.', [], mockCategories);
      expect(draft.categoryName).toBe('Manutenção de Veículos');
    });

    test('TESTE 12.5: "Fiz alinhamento e balanceamento, deu R$ 180 no Pix."', async () => {
      const draft = await parseFinancialIntentWithGemini('Fiz alinhamento e balanceamento, deu R$ 180 no Pix.', [], mockCategories);
      expect(draft.categoryName).toBe('Manutenção de Veículos');
    });

    test('TESTE 12.6: "Paguei a revisão do carro, R$ 500 no Pix."', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei a revisão do carro, R$ 500 no Pix.', [], mockCategories);
      expect(draft.categoryName).toBe('Manutenção de Veículos');
    });
  });

  // GRUPO 13 — CATEGORIAS DE VEÍCULO DEVEM SER SEPARADAS
  describe('GRUPO 13 — CATEGORIAS DE VEÍCULO SEPARADAS', () => {
    test('Validar que Combustível e Manutenção de Veículos retornam categorias distintas', async () => {
      const draftComb = await parseFinancialIntentWithGemini('Abasteci R$ 200 de gasolina no Pix.', [], mockCategories);
      const draftManut = await parseFinancialIntentWithGemini('Troquei o óleo e deu R$ 300 no Pix.', [], mockCategories);

      expect(draftComb.categoryName).toBe('Combustível');
      expect(draftManut.categoryName).toBe('Manutenção de Veículos');
      expect(draftComb.categoryName).not.toBe(draftManut.categoryName);

      const catComb = mockCategories.find(c => c.name === draftComb.categoryName);
      const catManut = mockCategories.find(c => c.name === draftManut.categoryName);
      expect(catComb?.id).not.toBe(catManut?.id);
    });
  });

  // GRUPO 14 — FRASES MISTAS DE VEÍCULO
  describe('GRUPO 14 — FRASES MISTAS DE VEÍCULO', () => {
    test('"Abasteci R$ 200 e paguei R$ 300 da troca de óleo no Pix." -> 2 drafts independentes', async () => {
      const draft = await parseFinancialIntentWithGemini('Abasteci 200 e paguei 300 de troca de óleo no Pix.', [], mockCategories);
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
      const draft = await parseFinancialIntentWithGemini('Paguei R$ 500 na oficina.', [], mockCategories);
      expect(draft.categoryName).toBe('Manutenção de Veículos');
      expect(draft.paymentMethod).toBe('UNKNOWN');
      expect(draft.isReadyForConfirmation).toBe(false);
    });
  });

  // GRUPO 16 — VALORES E CENTAVOS
  describe('GRUPO 16 — VALORES E CENTAVOS', () => {
    test('"237 e 89 centavos" -> 237.89', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei 237 e 89 centavos no Pix.', [], mockCategories);
      expect(draft.amount).toBe(237.89);
    });

    test('"duzentos e trinta e sete reais e oitenta e nove centavos" -> 237.89', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei duzentos e trinta e sete reais e oitenta e nove centavos no Pix.', [], mockCategories);
      expect(draft.amount).toBe(237.89);
    });

    test('"20 mil" -> 20000', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei 20 mil no Pix.', [], mockCategories);
      expect(draft.amount).toBe(20000);
    });

    test('"vinte mil" -> 20000', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei vinte mil no Pix.', [], mockCategories);
      expect(draft.amount).toBe(20000);
    });

    test('"2,5 mil" -> 2500', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei 2,5 mil no Pix.', [], mockCategories);
      expect(draft.amount).toBe(2500);
    });

    test('"89 centavos" -> 0.89', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei 89 centavos no Pix.', [], mockCategories);
      expect(draft.amount).toBe(0.89);
    });
  });

  // GRUPO 17 — PATCH DO DRAFT
  describe('GRUPO 17 — PATCH DO DRAFT', () => {
    test('Preservar amount e objeto ao responder o destino', () => {
      const activeDraft: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        type: 'expense',
        amount: 2500,
        description: 'Comprei uma geladeira por R$ 2.500 no Pix.',
        paymentMethod: 'Pix',
        businessPurpose: 'UNKNOWN',
        missingFields: ['businessPurpose'],
        questionToUser: 'Essa geladeira é para a loja ou é uma compra pessoal?',
        confidence: 0.9,
        isReadyForConfirmation: false,
      };

      const patched = trySlotFillingFallback('É para a loja.', activeDraft, '2026-09-06');
      expect(patched?.amount).toBe(2500);
      expect(patched?.paymentMethod).toBe('Pix');
      expect(patched?.businessPurpose).toBe('BUSINESS');
      expect(patched?.categoryName).toBe('Equipamentos da Empresa');
      expect(patched?.isReadyForConfirmation).toBe(true);
    });
  });

  // GRUPO 18 — CORREÇÕES DO USUÁRIO
  describe('GRUPO 18 — CORREÇÕES DO USUÁRIO', () => {
    test('Correção de destino: "Não, é para a loja." substitui pessoal', () => {
      const activeDraft: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        type: 'expense',
        amount: 2000,
        description: 'Comprei uma TV de R$ 2.000 para casa no Pix.',
        paymentMethod: 'Pix',
        businessPurpose: 'PERSONAL',
        categoryName: 'Pró-labore',
        missingFields: [],
        confidence: 0.9,
        isReadyForConfirmation: true,
      };

      const patched = trySlotFillingFallback('Não, é para a loja.', activeDraft, '2026-09-06');
      expect(patched?.businessPurpose).toBe('BUSINESS');
      expect(patched?.categoryName).toBe('Equipamentos da Empresa');
    });

    test('Correção de valor: "Na verdade foi 237,89."', () => {
      const activeDraft: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        type: 'expense',
        amount: 200,
        description: 'Abasteci 200 no Pix.',
        paymentMethod: 'Pix',
        categoryName: 'Combustível',
        businessPurpose: 'BUSINESS',
        missingFields: [],
        confidence: 0.9,
        isReadyForConfirmation: true,
      };

      const patched = trySlotFillingFallback('Na verdade foi 237,89.', activeDraft, '2026-09-06');
      expect(patched?.amount).toBe(237.89);
      expect(patched?.categoryName).toBe('Combustível');
    });
  });

  // GRUPO 19 — LABELS DA ANÁLISE EM TEMPO REAL
  describe('GRUPO 19 — LABELS DA ANÁLISE EM TEMPO REAL', () => {
    test('Geladeira com destino UNKNOWN exibe chip de categoria pendente A identificar', () => {
      const draft: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        type: 'expense',
        amount: 2500,
        description: 'Geladeira',
        paymentMethod: 'Pix',
        businessPurpose: 'UNKNOWN',
        categoryName: 'UNKNOWN',
        missingFields: ['businessPurpose'],
        confidence: 0.9,
        isReadyForConfirmation: false,
      };

      const chips = buildDraftAnalysisChips(draft);
      const catChip = chips.find(c => c.key === 'category');
      expect(catChip).toBeDefined();
      expect(catChip?.type).toBe('pending');
      expect(catChip?.label).toBe('Despesa: A identificar');
    });

    test('Combustível exibe diretamente chip de Categoria: Combustível', () => {
      const draft: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        type: 'expense',
        amount: 200,
        description: 'Gasolina',
        paymentMethod: 'Pix',
        businessPurpose: 'BUSINESS',
        categoryName: 'Combustível',
        missingFields: [],
        confidence: 0.9,
        isReadyForConfirmation: true,
      };

      const chips = buildDraftAnalysisChips(draft);
      const catChip = chips.find(c => c.key === 'category');
      expect(catChip).toBeDefined();
      expect(catChip?.label).toBe('Categoria: Combustível');
    });
  });

  // GRUPO 20 — NÃO CRIAR CATEGORIAS INVENTADAS
  describe('GRUPO 20 — NÃO CRIAR CATEGORIAS INVENTADAS', () => {
    test('Utiliza categorias oficiais sem nomes inventados', async () => {
      const draftGasolina = await parseFinancialIntentWithGemini('Abasteci 150 no Pix.', [], mockCategories);
      expect(draftGasolina.categoryName).toBe('Combustível');
      expect(draftGasolina.categoryName).not.toBe('Automóveis');
      expect(draftGasolina.categoryName).not.toBe('Carro');

      const draftOficina = await parseFinancialIntentWithGemini('Paguei 400 na oficina no Pix.', [], mockCategories);
      expect(draftOficina.categoryName).toBe('Manutenção de Veículos');
      expect(draftOficina.categoryName).not.toBe('Despesas automotivas');
    });
  });

  // GRUPO 21 — TESTES ADVERSARIAIS
  describe('GRUPO 21 — TESTES ADVERSARIAIS', () => {
    test('"Coloquei gasolina no meu carro." -> Combustível BUSINESS (mesmo com "meu carro")', async () => {
      const draft = await parseFinancialIntentWithGemini('Coloquei gasolina no meu carro R$ 200 no Pix.', [], mockCategories);
      expect(draft.categoryName).toBe('Combustível');
      expect(draft.businessPurpose).toBe('BUSINESS');
    });

    test('"Levei meu carro na oficina." -> Manutenção de Veículos BUSINESS', async () => {
      const draft = await parseFinancialIntentWithGemini('Levei meu carro na oficina deu 500 no Pix.', [], mockCategories);
      expect(draft.categoryName).toBe('Manutenção de Veículos');
      expect(draft.businessPurpose).toBe('BUSINESS');
    });
  });

  // GRUPO 22 — MÚLTIPLAS MOVIMENTAÇÕES
  describe('GRUPO 22 — MÚLTIPLAS MOVIMENTAÇÕES DÚBIAS E NÃO DÚBIAS', () => {
    test('"Paguei R$ 200 de gasolina e R$ 2.500 numa geladeira no Pix." -> Pergunta refere-se apenas à geladeira', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei R$ 200 de gasolina e R$ 2.500 numa geladeira no Pix.', [], mockCategories);
      expect(draft.batchDraftsList).not.toBeNull();
      expect(draft.batchDraftsList?.length).toBe(2);

      const d1 = draft.batchDraftsList![0];
      const d2 = draft.batchDraftsList![1];

      expect(d1.categoryName).toBe('Combustível');
      expect(d1.businessPurpose).toBe('BUSINESS');

      expect(d2.businessPurpose).toBe('UNKNOWN');
      expect(d2.questionToUser).toMatch(/essa geladeira é para a loja ou é uma compra pessoal\?/i);
    });
  });

  // GRUPO 23 — INVARIANTES (A a J)
  describe('GRUPO 23 — INVARIANTES A a J', () => {
    test('INVARIANTE A: Nenhuma frase de parcelamento gera N transações automaticamente', async () => {
      const draft = await parseFinancialIntentWithGemini('Comprei em 10x de R$ 500.', [], mockCategories);
      expect(draft.installmentList).toBeFalsy();
      expect(draft.amount).toBeNull();
    });

    test('INVARIANTE B: Nenhuma recorrência gera transações futuras', async () => {
      const draft = await parseFinancialIntentWithGemini('Pago R$ 1.500 todo mês.', [], mockCategories);
      expect(draft.amount).toBeNull();
    });

    test('INVARIANTE C: "Paguei uma parcela" gera no máximo 1 movimentação', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei uma parcela da Bechara R$ 500 no Pix.', [], mockCategories);
      expect(draft.amount).toBe(500);
      expect(draft.installmentList).toBeFalsy();
    });

    test('INVARIANTE D: Gasto potencialmente pessoal/empresarial não recebe categoria empresarial definitiva sem contexto', async () => {
      const draft = await parseFinancialIntentWithGemini('Comprei um ar-condicionado por R$ 3.000 no Pix.', [], mockCategories);
      expect(draft.businessPurpose).toBe('UNKNOWN');
    });

    test('INVARIANTE E: Combustível nunca é classificado como Pró-labore', async () => {
      const draft = await parseFinancialIntentWithGemini('Gasolina do meu carro R$ 150 no Pix.', [], mockCategories);
      expect(draft.categoryName).toBe('Combustível');
      expect(draft.businessPurpose).toBe('BUSINESS');
    });

    test('INVARIANTE F: Manutenção de veículo nunca é classificada como Pró-labore', async () => {
      const draft = await parseFinancialIntentWithGemini('Troca de óleo do meu carro R$ 250 no Pix.', [], mockCategories);
      expect(draft.categoryName).toBe('Manutenção de Veículos');
      expect(draft.businessPurpose).toBe('BUSINESS');
    });

    test('INVARIANTE G: Combustível e Manutenção de Veículos possuem categorias distintas', () => {
      const c1 = mockCategories.find(c => c.name === 'Combustível');
      const c2 = mockCategories.find(c => c.name === 'Manutenção de Veículos');
      expect(c1?.id).not.toBe(c2?.id);
    });

    test('INVARIANTE H: Campo já conhecido não desaparece em patch de draft', () => {
      const active: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        type: 'expense',
        amount: 2500,
        description: 'Geladeira',
        paymentMethod: 'Pix',
        businessPurpose: 'UNKNOWN',
        missingFields: ['businessPurpose'],
        isReadyForConfirmation: false,
      };

      const patched = trySlotFillingFallback('É para a loja', active, '2026-09-06');
      expect(patched?.amount).toBe(2500);
      expect(patched?.paymentMethod).toBe('Pix');
    });

    test('INVARIANTE I: Forma de pagamento não informada permanece UNKNOWN', async () => {
      const draft = await parseFinancialIntentWithGemini('Abasteci 100.', [], mockCategories);
      expect(draft.paymentMethod).toBe('UNKNOWN');
    });

    test('INVARIANTE J: Movimentação futura/intenção não entra como realizada', async () => {
      const draft = await parseFinancialIntentWithGemini('Vou pagar 500 amanhã.', [], mockCategories);
      expect(draft.amount).toBeNull();
      expect(draft.isReadyForConfirmation).toBe(false);
    });
  });

  // RODADA EXTRA DE REGRESSÃO — CASOS DE BORDA (15 TESTES)
  describe('RODADA EXTRA DE REGRESSÃO — CASOS DE BORDA', () => {
    test('1. "Comprei uma TV." -> perguntar loja ou pessoal', async () => {
      const draft = await parseFinancialIntentWithGemini('Comprei uma TV.', [], mockCategories);
      expect(draft.businessPurpose).toBe('UNKNOWN');
      expect(draft.questionToUser).toMatch(/loja ou é uma compra pessoal\?/i);
    });

    test('2. "Comprei uma TV pra sala." -> ainda ambíguo, perguntar loja ou casa', async () => {
      const draft = await parseFinancialIntentWithGemini('Comprei uma TV pra sala.', [], mockCategories);
      expect(draft.businessPurpose).toBe('UNKNOWN');
      expect(draft.questionToUser).toMatch(/loja ou é uma compra pessoal\?/i);
    });

    test('3. "Comprei uma televisão para a sala de espera da loja." -> BUSINESS, Equipamentos da Empresa', async () => {
      const draft = await parseFinancialIntentWithGemini('Comprei uma televisão para a sala de espera da loja R$ 2.000 no Pix.', [], mockCategories);
      expect(draft.businessPurpose).toBe('BUSINESS');
      expect(draft.categoryName).toBe('Equipamentos da Empresa');
    });

    test('4. "Comprei uma geladeira pra cozinha." -> ainda ambíguo, perguntar', async () => {
      const draft = await parseFinancialIntentWithGemini('Comprei uma geladeira pra cozinha.', [], mockCategories);
      expect(draft.businessPurpose).toBe('UNKNOWN');
      expect(draft.questionToUser).toMatch(/loja ou é uma compra pessoal\?/i);
    });

    test('5. "Comprei uma geladeira pra cozinha da loja." -> BUSINESS', async () => {
      const draft = await parseFinancialIntentWithGemini('Comprei uma geladeira pra cozinha da loja R$ 2.500 no Pix.', [], mockCategories);
      expect(draft.businessPurpose).toBe('BUSINESS');
      expect(draft.categoryName).toBe('Equipamentos da Empresa');
    });

    test('6. "Comprei uma geladeira pra minha mãe." -> PERSONAL / Pró-labore', async () => {
      const draft = await parseFinancialIntentWithGemini('Comprei uma geladeira pra minha mãe R$ 2.500 no Pix.', [], mockCategories);
      expect(draft.businessPurpose).toBe('PERSONAL');
      expect(draft.categoryName).toBe('Pró-labore');
    });

    test('7. "Abasteci meu carro com R$ 200." -> Combustível, BUSINESS, NÃO Pró-labore', async () => {
      const draft = await parseFinancialIntentWithGemini('Abasteci meu carro com R$ 200 no Pix.', [], mockCategories);
      expect(draft.categoryName).toBe('Combustível');
      expect(draft.businessPurpose).toBe('BUSINESS');
    });

    test('8. "Troquei os pneus do meu carro." -> Manutenção de Veículos, BUSINESS', async () => {
      const draft = await parseFinancialIntentWithGemini('Troquei os pneus do meu carro R$ 900 no Pix.', [], mockCategories);
      expect(draft.categoryName).toBe('Manutenção de Veículos');
      expect(draft.businessPurpose).toBe('BUSINESS');
    });

    test('9. "Comprei gasolina e uma televisão." -> dois drafts (gasolina BUSINESS, televisão UNKNOWN)', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei 200 de gasolina e 2.000 numa televisão no Pix.', [], mockCategories);
      expect(draft.batchDraftsList?.length).toBe(2);
      const d1 = draft.batchDraftsList![0];
      const d2 = draft.batchDraftsList![1];
      expect(d1.categoryName).toBe('Combustível');
      expect(d1.businessPurpose).toBe('BUSINESS');
      expect(d2.businessPurpose).toBe('UNKNOWN');
      expect(draft.questionToUser).toMatch(/televisão/i);
    });

    test('10. "Comprei uma TV R$ 2.000 no Pix" -> "É pessoal" -> "Não, falei errado, é pra loja" -> corrige para BUSINESS', () => {
      const draft1: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        type: 'expense',
        amount: 2000,
        description: 'Comprei uma TV de R$ 2.000 no Pix.',
        paymentMethod: 'Pix',
        businessPurpose: 'PERSONAL',
        categoryName: 'Pró-labore',
        missingFields: [],
        isReadyForConfirmation: true,
      };

      const patched = trySlotFillingFallback('Não, falei errado, é pra loja.', draft1, '2026-09-06');
      expect(patched?.businessPurpose).toBe('BUSINESS');
      expect(patched?.categoryName).toBe('Equipamentos da Empresa');
      expect(patched?.amount).toBe(2000);
      expect(patched?.paymentMethod).toBe('Pix');
    });

    test('11. "Comprei uma geladeira por dois mil e quinhentos no Pix." -> R$ 2.500,00, pergunta destino', async () => {
      const draft = await parseFinancialIntentWithGemini('Comprei uma geladeira por dois mil e quinhentos no Pix.', [], mockCategories);
      expect(draft.amount).toBe(2500);
      expect(draft.paymentMethod).toBe('Pix');
      expect(draft.businessPurpose).toBe('UNKNOWN');
    });

    test('12. "Troquei o óleo, deu 237 e 89 centavos." -> R$ 237.89, Manutenção de Veículos, BUSINESS', async () => {
      const draft = await parseFinancialIntentWithGemini('Troquei o óleo, deu 237 e 89 centavos no Pix.', [], mockCategories);
      expect(draft.amount).toBe(237.89);
      expect(draft.categoryName).toBe('Manutenção de Veículos');
      expect(draft.businessPurpose).toBe('BUSINESS');
    });

    test('13. "Abasteci 200." -> Combustível, paymentMethod UNKNOWN', async () => {
      const draft = await parseFinancialIntentWithGemini('Abasteci 200.', [], mockCategories);
      expect(draft.categoryName).toBe('Combustível');
      expect(draft.paymentMethod).toBe('UNKNOWN');
      expect(draft.missingFields).toContain('paymentMethod');
    });

    test('14. "Comprei uma televisão no cartão." -> pergunta loja/pessoal + débito/crédito', async () => {
      const draft = await parseFinancialIntentWithGemini('Comprei uma televisão no cartão por 2000.', [], mockCategories);
      expect(draft.businessPurpose).toBe('UNKNOWN');
      expect(draft.paymentMethod).toBe('UNKNOWN');
    });

    test('15. "Comprei uma TV para a loja no cartão de débito por 2000." -> BUSINESS, Equipamentos da Empresa, Débito', async () => {
      const draft = await parseFinancialIntentWithGemini('Comprei uma TV para a loja no cartão de débito por 2000.', [], mockCategories);
      expect(draft.businessPurpose).toBe('BUSINESS');
      expect(draft.categoryName).toBe('Equipamentos da Empresa');
      expect(draft.paymentMethod).toBe('Cartão de Débito');
      expect(draft.isReadyForConfirmation).toBe(true);
    });
  });
});

