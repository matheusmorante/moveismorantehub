import { describe, test, expect, vi } from 'vitest';

global.fetch = vi.fn().mockImplementation(() => Promise.reject(new Error('Offline test mock')));

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
        }),
      }),
    }),
  },
}));

import {
  parseFinancialIntentWithGemini,
  trySlotFillingFallback,
  validateParsedIntent,
  extractUnknownFieldsFromText,
  ParsedFinancialIntent,
} from '../../../../mobile/src/services/financialAiAssistantService';
import { FinancialCategory } from '../../../../mobile/src/services/mobileFinanceService';

const mockCategories: FinancialCategory[] = [
  { id: '1', name: 'Compra de estoque', type: 'expense' },
  { id: '2', name: 'Combustível', type: 'expense' },
  { id: '3', name: 'Frete / Logística', type: 'expense' },
  { id: '4', name: 'Outras receitas', type: 'income' },
  { id: '5', name: 'Vendas', type: 'income' },
];

const todayStr = '2026-09-06';

describe('BATERIA DE AUDITORIA E2E ASSISTENTE FINANCEIRO IA (TR-20260906-AUDIT)', () => {

  // GRUPO A — Criação de saída simples
  describe('GRUPO A — Criação de saída simples', () => {
    test('TC-001: paguei 180 reais de combustível hoje no pix', async () => {
      const res = await parseFinancialIntentWithGemini('paguei 180 reais de combustível hoje no pix', [], mockCategories);
      expect(res.type).toBe('expense');
      expect(res.amount).toBe(180);
      expect(res.paymentMethod).toBe('Pix');
    });

    test('TC-002: gastei 250 de frete hoje', async () => {
      const res = await parseFinancialIntentWithGemini('gastei 250 de frete hoje', [], mockCategories);
      expect(res.type).toBe('expense');
      expect(res.amount).toBe(250);
    });

    test('TC-003: paguei 500 pro fornecedor teste', async () => {
      const res = await parseFinancialIntentWithGemini('paguei 500 pro fornecedor teste', [], mockCategories);
      expect(res.type).toBe('expense');
      expect(res.amount).toBe(500);
    });

    test('TC-004: saíram 120 reais do caixa pra comprar material de limpeza', async () => {
      const res = await parseFinancialIntentWithGemini('saíram 120 reais do caixa pra comprar material de limpeza', [], mockCategories);
      expect(res.type).toBe('expense');
      expect(res.amount).toBe(120);
    });

    test('TC-005: comprei uma peça por 90 reais em dinheiro', async () => {
      const res = await parseFinancialIntentWithGemini('comprei uma peça por 90 reais em dinheiro', [], mockCategories);
      expect(res.type).toBe('expense');
      expect(res.amount).toBe(90);
      expect(res.paymentMethod).toBe('Dinheiro');
    });
  });

  // GRUPO B — Criação de entrada simples
  describe('GRUPO B — Criação de entrada simples', () => {
    test('TC-006: entrou 2500 de uma venda hoje no pix', async () => {
      const res = await parseFinancialIntentWithGemini('entrou 2500 de uma venda hoje no pix', [], mockCategories);
      expect(res.type).toBe('income');
      expect(res.amount).toBe(2500);
      expect(res.paymentMethod).toBe('Pix');
    });

    test('TC-007: recebi 800 reais do João', async () => {
      const res = await parseFinancialIntentWithGemini('recebi 800 reais do João', [], mockCategories);
      expect(res.type).toBe('income');
      expect(res.amount).toBe(800);
    });

    test('TC-008: entrou 1000 no caixa', async () => {
      const res = await parseFinancialIntentWithGemini('entrou 1000 no caixa', [], mockCategories);
      expect(res.type).toBe('income');
      expect(res.amount).toBe(1000);
    });

    test('TC-009: recebi 3500 de uma venda no cartão', async () => {
      const res = await parseFinancialIntentWithGemini('recebi 3500 de uma venda no cartão', [], mockCategories);
      expect(res.type).toBe('income');
      expect(res.amount).toBe(3500);
      expect(res.paymentMethod).toBe('UNKNOWN');
      expect(res.questionToUser).toMatch(/débito ou de crédito/i);
    });

    test('TC-010: foi recebida uma parcela de 700 hoje', async () => {
      const res = await parseFinancialIntentWithGemini('foi recebida uma parcela de 700 hoje', [], mockCategories);
      expect(res.type).toBe('income');
      expect(res.amount).toBe(700);
    });
  });

  // GRUPO C — Contas a pagar parceladas
  describe('GRUPO C — Contas a pagar parceladas', () => {
    test('TC-011: comprei 30 mil da Bechara em dois boletos de 10 mil e dois de 5 mil, todo dia 20 começando mês que vem', async () => {
      const res = await parseFinancialIntentWithGemini('comprei 30 mil da Bechara em dois boletos de 10 mil e dois de 5 mil, todo dia 20 começando mês que vem', [], mockCategories);
      expect(res.supplier).toBe('Bechara');
      expect(res.isReadyForConfirmation).toBe(false);
    });

    test('TC-012 & TC-013: Alerta de compromisso sem pagamento realizado', async () => {
      const draft12 = await parseFinancialIntentWithGemini('comprei 30 mil da Bechara em dois de 10 mil e um de 5 mil, todo dia 20', [], mockCategories);
      expect(draft12.isReadyForConfirmation).toBe(false);
      expect(draft12.supplier).toBe('Bechara');
    });

    test('TC-014: compra de 24 mil em 12 parcelas iguais todo dia 10 começando no próximo mês', async () => {
      const draft = {
        intentType: 'SINGLE_TRANSACTION' as const,
        type: 'expense' as const,
        amount: null,
        supplier: 'Bechara',
        missingFields: ['amount'],
        confidence: 0.9,
        isReadyForConfirmation: false,
      };

      const validado = validateParsedIntent(draft, todayStr);
      expect(validado.isReadyForConfirmation).toBe(false);
    });

    test('TC-015: fiz uma compra de 9999 em 3 vezes iguais', async () => {
      const draft = {
        intentType: 'SINGLE_TRANSACTION' as const,
        type: 'expense' as const,
        amount: null,
        missingFields: ['amount'],
        confidence: 0.9,
        isReadyForConfirmation: false,
      };

      const validado = validateParsedIntent(draft, todayStr);
      expect(validado.isReadyForConfirmation).toBe(false);
    });
  });

  // GRUPO D — Correções incrementais
  describe('GRUPO D — Correções incrementais', () => {
    test('TC-018: troca de fornecedor', () => {
      const draft: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        type: 'expense',
        amount: 1000,
        supplier: 'Bechara',
        missingFields: [],
        confidence: 0.9,
        isReadyForConfirmation: true,
      };

      const patched = trySlotFillingFallback('na verdade o fornecedor é Bertolini', draft, todayStr);
      expect(patched?.supplier).toBe('Bertolini');
    });

    test('TC-019: alteração de dia de vencimento para dia 25', () => {
      const draft: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        supplier: 'Bechara',
        amount: 20000,
        dueDate: '2026-10-20',
        missingFields: [],
        confidence: 0.9,
        isReadyForConfirmation: true,
      };

      const patched = trySlotFillingFallback('melhor dia 25', draft, todayStr);
      expect(patched?.dueDate || patched?.date).toMatch(/25/);
    });

    test('TC-020: alteração de valor de parcela', () => {
      const draft: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        supplier: 'Bechara',
        amount: 2000,
        missingFields: [],
        confidence: 0.9,
        isReadyForConfirmation: true,
      };

      const patched = trySlotFillingFallback('na verdade é 1500', draft, todayStr);
      expect(patched).not.toBeNull();
      expect(patched?.amount).toBe(1500);
    });
  });

  // GRUPO E — "Não lembro" / unknownByUser
  describe('GRUPO E — "Não lembro" / unknownByUser', () => {
    test('TC-025: quero editar uma compra da Bechara mas não lembro o dia, o valor nem como paguei', async () => {
      const res = await parseFinancialIntentWithGemini('quero editar uma compra da Bechara mas não lembro o dia, o valor nem como paguei', [], mockCategories);
      expect(res.intentType).toBe('QUERY_OR_UPDATE');
      expect(res.supplier).toBe('Bechara');
      expect(res.unknownByUser).toContain('date');
      expect(res.unknownByUser).toContain('paymentMethod');
      expect(res.unknownByUser).toContain('amount');
      expect(res.questionToUser).not.toContain('Qual foi o valor');
    });

    test('TC-026: resposta "não lembro" preenche unknownByUser', () => {
      const draft: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        supplier: 'Bechara',
        missingFields: ['amount'],
        questionToUser: 'Qual foi o valor dessa movimentação?',
        confidence: 0.8,
        isReadyForConfirmation: false,
      };

      const patched = trySlotFillingFallback('não lembro', draft, todayStr);
      expect(patched?.unknownByUser).toContain('amount');
      expect(patched?.intentType).toBe('QUERY_OR_UPDATE');
    });

    test('TC-027 & TC-028 & TC-029: busca sem exigir data nem valor', async () => {
      const res27 = await parseFinancialIntentWithGemini('procura aquela compra da Bechara, não lembro quanto foi', [], mockCategories);
      expect(res27.intentType).toBe('QUERY_OR_UPDATE');
      expect(res27.supplier).toBe('Bechara');

      const res28 = await parseFinancialIntentWithGemini('não sei quando foi, vê aí', [], mockCategories);
      expect(res28.intentType).toBe('QUERY_OR_UPDATE');

      const res29 = await parseFinancialIntentWithGemini('não lembro de nada além de que era da Bechara', [], mockCategories);
      expect(res29.intentType).toBe('QUERY_OR_UPDATE');
      expect(res29.supplier).toBe('Bechara');
    });
  });

  // GRUPO F & G & H — Consultas e Edição
  describe('GRUPO F, G, H — Consultas, Edição e Linguagem', () => {
    test('TC-030: qual foi a última compra da Bechara?', async () => {
      const res = await parseFinancialIntentWithGemini('qual foi a última compra da Bechara?', [], mockCategories);
      expect(res.intentType).toBe('QUERY_OR_UPDATE');
    });

    test('TC-041: quero editar a última compra da Bechara', async () => {
      const res = await parseFinancialIntentWithGemini('quero editar a última compra da Bechara', [], mockCategories);
      expect(res.intentType).toBe('QUERY_OR_UPDATE');
    });

    test('TC-061 a TC-065: Extração de valores em reais', async () => {
      expect(extractUnknownFieldsFromText('não lembro quanto foi')).toContain('amount');
      expect(extractUnknownFieldsFromText('não lembro que dia foi')).toContain('date');
      expect(extractUnknownFieldsFromText('não lembro a forma de pagamento')).toContain('paymentMethod');
    });
  });

  // GRUPO T & W — Multi-turn e ruído
  describe('GRUPO T & W — Multi-turn e ruído', () => {
    test('TC-122: fiz uma compra cabeceada com a Bechara de 30 mil', async () => {
      const res = await parseFinancialIntentWithGemini('fiz uma compra cabeceada com a Bechara de 30 mil', [], mockCategories);
      expect(res.supplier).toBe('Bechara');
      expect(res.isReadyForConfirmation).toBe(false);
    });
  });
});
