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

import {
  parseFinancialIntentWithGemini,
  trySlotFillingFallback,
  ParsedFinancialIntent,
} from '../../../../../mobile/src/services/financialAiAssistantService';
import { FinancialCategory } from '../../../../../mobile/src/services/mobileFinanceService';

const mockCategories: FinancialCategory[] = [
  { id: '1', name: 'Compra de estoque', type: 'expense' },
  { id: '2', name: 'Combustível', type: 'expense' },
  { id: '3', name: 'Frete', type: 'expense' },
  { id: '4', name: 'Outras receitas', type: 'income' },
];

describe('Regras Obrigatórias de Forma de Pagamento e Recebimento no Assistente Financeiro', () => {
  describe('6. DESPESA EMPRESARIAL x GASTO PESSOAL / PRÓ-LABORE (SEÇÃO 15)', () => {
    test('TESTE 1: "Paguei R$ 237,89 de luz no Pix." -> perguntar loja ou pessoal, não confirmar Contas de Consumo ainda', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Paguei R$ 237,89 de luz no Pix.',
        [],
        mockCategories
      );

      expect(draft.amount).toBe(237.89);
      expect(draft.type).toBe('expense');
      expect(draft.paymentMethod).toBe('Pix');
      expect(draft.businessPurpose).toBe('UNKNOWN');
      expect(draft.categoryName).toBe('UNKNOWN');
      expect(draft.missingFields).toContain('businessPurpose');
      expect(draft.isReadyForConfirmation).toBe(false);
      expect(draft.questionToUser).toMatch(/essa conta de luz é da loja ou é uma conta pessoal\?/i);
    });

    test('TESTE 2: "Paguei R$ 237,89 da luz da loja no Pix." -> Contas de Consumo, não perguntar', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Paguei R$ 237,89 da luz da loja no Pix.',
        [],
        mockCategories
      );

      expect(draft.amount).toBe(237.89);
      expect(draft.type).toBe('expense');
      expect(draft.paymentMethod).toBe('Pix');
      expect(draft.businessPurpose).toBe('BUSINESS');
      expect(draft.categoryName).toBe('Contas de Consumo');
      expect(draft.missingFields).not.toContain('businessPurpose');
      expect(draft.isReadyForConfirmation).toBe(true);
    });

    test('TESTE 3: "Paguei R$ 237,89 da luz da minha casa no Pix." -> Pró-labore / gasto pessoal', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Paguei R$ 237,89 da luz da minha casa no Pix.',
        [],
        mockCategories
      );

      expect(draft.amount).toBe(237.89);
      expect(draft.type).toBe('expense');
      expect(draft.paymentMethod).toBe('Pix');
      expect(draft.businessPurpose).toBe('PERSONAL');
      expect(draft.categoryName).toBe('Pró-labore');
      expect(draft.categoryName).not.toBe('Contas de Consumo');
      expect(draft.isReadyForConfirmation).toBe(true);
    });

    test('TESTE 4: "Abasteci R$ 250 de gasolina no Pix." -> NÃO Pró-labore, categoria Combustível', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Abasteci R$ 250 de gasolina no Pix.',
        [],
        mockCategories
      );

      expect(draft.amount).toBe(250);
      expect(draft.type).toBe('expense');
      expect(draft.paymentMethod).toBe('Pix');
      expect(draft.categoryName).toBe('Combustível');
      expect(draft.categoryName).not.toBe('Pró-labore');
      expect(draft.businessPurpose).toBe('BUSINESS');
      expect(draft.isReadyForConfirmation).toBe(true);
    });

    test('TESTE 5: "Paguei R$ 800 da manutenção do carro." -> NÃO Pró-labore, categoria Manutenção de Veículos', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Paguei R$ 800 da manutenção do carro.',
        [],
        mockCategories
      );

      expect(draft.amount).toBe(800);
      expect(draft.type).toBe('expense');
      expect(draft.categoryName).toBe('Manutenção de Veículos');
      expect(draft.categoryName).not.toBe('Pró-labore');
      expect(draft.businessPurpose).toBe('BUSINESS');
    });

    test('TESTE 6: "Paguei R$ 180 da internet da loja." -> despesa empresarial (Contas de Consumo)', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Paguei R$ 180 da internet da loja.',
        [],
        mockCategories
      );

      expect(draft.amount).toBe(180);
      expect(draft.type).toBe('expense');
      expect(draft.businessPurpose).toBe('BUSINESS');
      expect(draft.categoryName).toBe('Contas de Consumo');
    });

    test('TESTE 7: "Paguei R$ 180 da internet da minha casa." -> gasto pessoal / Pró-labore', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Paguei R$ 180 da internet da minha casa.',
        [],
        mockCategories
      );

      expect(draft.amount).toBe(180);
      expect(draft.type).toBe('expense');
      expect(draft.businessPurpose).toBe('PERSONAL');
      expect(draft.categoryName).toBe('Pró-labore');
    });

    test('TESTE 8: Resposta incremental: "Paguei R$ 237,89 de luz no Pix." -> "Da loja." -> PATCH businessPurpose = BUSINESS & category = Contas de Consumo', async () => {
      const draft1 = await parseFinancialIntentWithGemini(
        'Paguei R$ 237,89 de luz no Pix.',
        [],
        mockCategories
      );

      expect(draft1.businessPurpose).toBe('UNKNOWN');
      expect(draft1.isReadyForConfirmation).toBe(false);

      const draft2 = trySlotFillingFallback('Da loja.', draft1, '2026-09-06');
      expect(draft2).not.toBeNull();
      expect(draft2?.amount).toBe(237.89);
      expect(draft2?.paymentMethod).toBe('Pix');
      expect(draft2?.businessPurpose).toBe('BUSINESS');
      expect(draft2?.categoryName).toBe('Contas de Consumo');
      expect(draft2?.isReadyForConfirmation).toBe(true);
    });

    test('TESTE 9: Resposta incremental: "Paguei R$ 237,89 de luz no Pix." -> "É da minha casa." -> PATCH businessPurpose = PERSONAL & category = Pró-labore', async () => {
      const draft1 = await parseFinancialIntentWithGemini(
        'Paguei R$ 237,89 de luz no Pix.',
        [],
        mockCategories
      );

      expect(draft1.businessPurpose).toBe('UNKNOWN');
      expect(draft1.isReadyForConfirmation).toBe(false);

      const draft2 = trySlotFillingFallback('É da minha casa.', draft1, '2026-09-06');
      expect(draft2).not.toBeNull();
      expect(draft2?.amount).toBe(237.89);
      expect(draft2?.paymentMethod).toBe('Pix');
      expect(draft2?.businessPurpose).toBe('PERSONAL');
      expect(draft2?.categoryName).toBe('Pró-labore');
      expect(draft2?.isReadyForConfirmation).toBe(true);
    });
  });

  describe('9. DESTINO DO GASTO (LOJA vs PESSOAL) E CATEGORIAS DE VEÍCULO', () => {
    test('9.1. "Comprei uma televisão de R$ 2.000 no Pix." -> Pergunta destino ("essa televisão é para a loja ou é uma compra pessoal?")', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Comprei uma televisão de R$ 2.000 no Pix.',
        [],
        mockCategories
      );
      expect(draft.amount).toBe(2000);
      expect(draft.paymentMethod).toBe('Pix');
      expect(draft.businessPurpose).toBe('UNKNOWN');
      expect(draft.missingFields).toContain('businessPurpose');
      expect(draft.isReadyForConfirmation).toBe(false);
      expect(draft.questionToUser).toMatch(
        /essa televisão é para a loja ou é uma compra pessoal\?/i
      );
    });

    test('9.2. Resposta "é para a loja" após pergunta de televisão -> BUSINESS, Categoria Equipamentos da Empresa', async () => {
      const activeDraft: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        type: 'expense',
        amount: 2000,
        description: 'Comprei uma televisão de R$ 2.000 no Pix.',
        paymentMethod: 'Pix',
        businessPurpose: 'UNKNOWN',
        missingFields: ['businessPurpose'],
        questionToUser: 'Essa televisão é para a loja ou é uma compra pessoal?',
        confidence: 0.9,
        isReadyForConfirmation: false,
      };

      const patched = trySlotFillingFallback('é para a loja', activeDraft, '2026-09-06');
      expect(patched?.businessPurpose).toBe('BUSINESS');
      expect(patched?.categoryName).toBe('Equipamentos da Empresa');
      expect(patched?.isReadyForConfirmation).toBe(true);
    });

    test('9.3. Resposta "é pessoal" após pergunta de televisão -> PERSONAL, Categoria Pró-labore', async () => {
      const activeDraft: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        type: 'expense',
        amount: 2000,
        description: 'Comprei uma televisão de R$ 2.000 no Pix.',
        paymentMethod: 'Pix',
        businessPurpose: 'UNKNOWN',
        missingFields: ['businessPurpose'],
        questionToUser: 'Essa televisão é para a loja ou é uma compra pessoal?',
        confidence: 0.9,
        isReadyForConfirmation: false,
      };

      const patched = trySlotFillingFallback('é pessoal', activeDraft, '2026-09-06');
      expect(patched?.businessPurpose).toBe('PERSONAL');
      expect(patched?.categoryName).toBe('Pró-labore');
      expect(patched?.isReadyForConfirmation).toBe(true);
    });

    test('9.4. "Comprei uma geladeira por R$ 2.500 no Pix." -> Pergunta destino ("essa geladeira é para a loja ou é uma compra pessoal?")', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Comprei uma geladeira por R$ 2.500 no Pix.',
        [],
        mockCategories
      );
      expect(draft.amount).toBe(2500);
      expect(draft.paymentMethod).toBe('Pix');
      expect(draft.businessPurpose).toBe('UNKNOWN');
      expect(draft.missingFields).toContain('businessPurpose');
      expect(draft.isReadyForConfirmation).toBe(false);
      expect(draft.questionToUser).toMatch(
        /essa geladeira é para a loja ou é uma compra pessoal\?/i
      );
    });

    test('9.5. Exceção de Combustível: "Abasteci 200 reais de gasolina no Pix." -> Categoria Combustível, BUSINESS, Sem pergunta loja x pessoal', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Abasteci 200 reais de gasolina no Pix.',
        [],
        mockCategories
      );
      expect(draft.amount).toBe(200);
      expect(draft.categoryName).toBe('Combustível');
      expect(draft.businessPurpose).toBe('BUSINESS');
      expect(draft.missingFields).not.toContain('businessPurpose');
      expect(draft.isReadyForConfirmation).toBe(true);
    });

    test('9.6. Exceção de Manutenção: "Troquei o óleo e deu 300 reais no Pix." -> Categoria Manutenção de Veículos, BUSINESS', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Troquei o óleo e deu 300 reais no Pix.',
        [],
        mockCategories
      );
      expect(draft.amount).toBe(300);
      expect(draft.categoryName).toBe('Manutenção de Veículos');
      expect(draft.businessPurpose).toBe('BUSINESS');
      expect(draft.missingFields).not.toContain('businessPurpose');
      expect(draft.isReadyForConfirmation).toBe(true);
    });

    test('9.7. Exceção de Pneus: "Comprei dois pneus por 900 reais no Pix." -> Categoria Manutenção de Veículos, BUSINESS', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Comprei dois pneus por 900 reais no Pix.',
        [],
        mockCategories
      );
      expect(draft.amount).toBe(900);
      expect(draft.categoryName).toBe('Manutenção de Veículos');
      expect(draft.businessPurpose).toBe('BUSINESS');
      expect(draft.isReadyForConfirmation).toBe(true);
    });
  });
});
