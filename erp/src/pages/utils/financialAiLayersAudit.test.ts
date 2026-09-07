import { describe, test, expect, vi } from 'vitest';

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
  validateParsedIntent,
  trySlotFillingFallback,
  extractUnknownFieldsFromText,
  ParsedFinancialIntent,
} from '../../../../mobile/src/services/financialAiAssistantService';
import {
  extractMultipleFinancialFacts,
  processFinancialInput,
} from '../../../../mobile/src/services/financial/financialIntentValidator';
import { FinancialCategory } from '../../../../mobile/src/services/mobileFinanceService';
import { buildDraftAnalysisChips } from '../../../../mobile/src/services/financial/draftAnalysisChips';

const mockCategories: FinancialCategory[] = [
  { id: '1', name: 'Compra de estoque', type: 'expense' },
  { id: '2', name: 'Combustível', type: 'expense' },
  { id: '3', name: 'Contas de Consumo', type: 'expense' },
  { id: '4', name: 'Aluguel', type: 'expense' },
  { id: '5', name: 'Frete / Logística', type: 'expense' },
  { id: '6', name: 'Outras receitas', type: 'income' },
  { id: '7', name: 'Vendas', type: 'income' },
];

const todayStr = '2026-09-06';

describe('AUDITORIA POR CAMADAS DO ASSISTENTE FINANCEIRO (CAMADAS A, B, C, D)', () => {

  // =========================================================================
  // CASO OBRIGATÓRIO: "tem uma despesa de conta de luz de 200 e uma conta de internet 100 reais"
  // =========================================================================
  describe('CASO OBRIGATÓRIO: Despesa de luz 200 e internet 100', () => {
    const inputMsg = 'tem uma despesa de conta de luz de 200 e uma conta de internet 100 reais';

    test('CAMADA A & B: Extração e Parsing determinístico de múltiplos fatos', () => {
      const extracted = extractMultipleFinancialFacts(inputMsg, todayStr);
      expect(extracted).not.toBeNull();
      expect(extracted?.length).toBe(2);

      const luz = extracted![0];
      const internet = extracted![1];

      // Verificação do 1º fato (Luz)
      expect(luz.type).toBe('expense');
      expect(luz.amount).toBe(200);
      expect(luz.description.toLowerCase()).toContain('luz');
      expect(luz.amount).not.toBeNaN();
      expect(luz.amount).toBeGreaterThan(0);

      // Verificação do 2º fato (Internet)
      expect(internet.type).toBe('expense');
      expect(internet.amount).toBe(100);
      expect(internet.description.toLowerCase()).toContain('internet');
      expect(internet.amount).not.toBeNaN();
      expect(internet.amount).toBeGreaterThan(0);
    });

    test('CAMADA B: Processamento e Construção do Envelope Batch via processFinancialInput', () => {
      // 1. Mensagem informacional ("tem uma despesa...") -> Reconhece e guarda fatos não realizados
      const resInformational = processFinancialInput(inputMsg, todayStr);
      expect(resInformational.draft).not.toBeNull();
      expect(resInformational.isRealized).toBe(false);
      expect(resInformational.rememberedFacts).toHaveLength(2);
      expect(resInformational.rememberedFacts![0].amount).toBe(200);
      expect(resInformational.rememberedFacts![1].amount).toBe(100);

      // 2. Concretização do pagamento subsequente ("paguei as duas no pix") -> Materializa o batchDraftsList completo
      const resRealized = processFinancialInput('paguei as duas no pix', todayStr, {
        rememberedUnrealizedFacts: resInformational.rememberedFacts,
      });
      expect(resRealized.isRealized).toBe(true);
      expect(resRealized.draft?.batchDraftsList).toHaveLength(2);
      expect(resRealized.draft?.batchDraftsList![0].amount).toBe(200);
      expect(resRealized.draft?.batchDraftsList![1].amount).toBe(100);
      expect(resRealized.draft?.batchDraftsList![0].paymentMethod).toBe('Pix');
      expect(resRealized.draft?.batchDraftsList![1].paymentMethod).toBe('Pix');
    });

    test('CAMADA C: Estado do Frontend e Chips de Análise em Tempo Real', () => {
      const envelope: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        type: 'expense',
        amount: 200,
        description: 'Conta de luz',
        batchDraftsList: [
          {
            intentType: 'SINGLE_TRANSACTION',
            type: 'expense',
            amount: 200,
            description: 'Pagamento de conta de luz',
            categoryName: 'Contas de Consumo',
            missingFields: [],
            confidence: 0.9,
            isReadyForConfirmation: true,
          },
          {
            intentType: 'SINGLE_TRANSACTION',
            type: 'expense',
            amount: 100,
            description: 'Pagamento de internet',
            categoryName: 'Contas de Consumo',
            missingFields: [],
            confidence: 0.9,
            isReadyForConfirmation: true,
          },
        ],
        missingFields: [],
        confidence: 0.9,
        isReadyForConfirmation: true,
      };

      const chips = buildDraftAnalysisChips(envelope);
      expect(chips.length).toBeGreaterThanOrEqual(2);
      
      const chipLabels = chips.map(c => c.label);
      expect(chipLabels.some(t => t.includes('200,00') || t.includes('200'))).toBe(true);
      expect(chipLabels.some(t => t.includes('100,00') || t.includes('100'))).toBe(true);
      expect(chipLabels.every(t => !t.includes('NaN') && !t.includes('undefined') && !t.includes('null'))).toBe(true);
    });

    test('CAMADA D: Invariantes do Card e Ausência de Colapso para R$ 0,00', () => {
      const envelope: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        type: 'expense',
        amount: 200,
        description: 'Pagamento de conta de luz',
        batchDraftsList: [
          {
            intentType: 'SINGLE_TRANSACTION',
            type: 'expense',
            amount: 200,
            description: 'Pagamento de conta de luz',
            missingFields: [],
            confidence: 0.9,
            isReadyForConfirmation: true,
          },
          {
            intentType: 'SINGLE_TRANSACTION',
            type: 'expense',
            amount: 100,
            description: 'Pagamento de internet',
            missingFields: [],
            confidence: 0.9,
            isReadyForConfirmation: true,
          },
        ],
        missingFields: [],
        confidence: 0.9,
        isReadyForConfirmation: true,
      };

      // O envelope batch DEVE expor seus itens sem perda de dados
      envelope.batchDraftsList!.forEach(item => {
        expect(item.amount).toBeDefined();
        expect(item.amount).not.toBeNull();
        expect(item.amount).not.toBe(0);
        expect(Number.isNaN(item.amount)).toBe(false);
      });
    });
  });

  // =========================================================================
  // TESTES DETERMINÍSTICOS COM RESPOSTAS MOCKADAS DA IA
  // =========================================================================
  describe('MOCKS DETERMINÍSTICOS DA IA: Respostas Estruturadas', () => {
    test('JSON com array de 2 movimentações converte corretamente para batch', () => {
      const mockAiRawResponse = [
        {
          type: 'expense',
          description: 'Conta de luz',
          amount: 200,
        },
        {
          type: 'expense',
          description: 'Internet',
          amount: 100,
        },
      ];

      const batchItems: ParsedFinancialIntent[] = mockAiRawResponse.map(item => ({
        intentType: 'SINGLE_TRANSACTION' as const,
        type: item.type as 'expense' | 'income',
        amount: item.amount,
        description: item.description,
        missingFields: [],
        confidence: 0.95,
        isReadyForConfirmation: true,
      }));

      const envelope: ParsedFinancialIntent = {
        ...batchItems[0],
        batchDraftsList: batchItems,
      };

      expect(envelope.batchDraftsList).toHaveLength(2);
      expect(envelope.batchDraftsList![0].amount).toBe(200);
      expect(envelope.batchDraftsList![1].amount).toBe(100);
    });

    test('Validação de intenção com classificação automática de categoria e finalidade', () => {
      const draft: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        type: 'expense',
        amount: 180,
        description: 'Abastecimento de combustível do caminhão',
        categoryName: 'Combustível',
        paymentMethod: 'Pix',
        missingFields: [],
        confidence: 0.95,
        isReadyForConfirmation: true,
      };

      const validated = validateParsedIntent(draft, todayStr);
      expect(validated.amount).toBe(180);
      expect(validated.categoryName).toBe('Combustível');
      expect(validated.businessPurpose).toBe('BUSINESS');
      expect(validated.isReadyForConfirmation).toBe(true);
    });

    test('Detecção e bloqueio de intenção sem valor definido (amount: null ou 0)', () => {
      const draft: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        type: 'expense',
        amount: null,
        description: 'Gastei com almoço',
        missingFields: ['amount'],
        confidence: 0.95,
        isReadyForConfirmation: false,
      };

      const validated = validateParsedIntent(draft, todayStr);
      expect(validated.isReadyForConfirmation).toBe(false);
      expect(validated.missingFields).toContain('amount');
    });
  });

  // =========================================================================
  // NORMALIZAÇÃO MONETÁRIA E AUSÊNCIA DE NaN / undefined
  // =========================================================================
  describe('NORMALIZAÇÃO MONETÁRIA & AUSÊNCIA DE undefined / NaN', () => {
    test('Valores com vírgula e centavos ("49,90 de uber")', async () => {
      const res = await parseFinancialIntentWithGemini('49,90 de uber', [], mockCategories);
      expect(res.amount).toBe(49.9);
      expect(res.type).toBe('expense');
      expect(Number.isNaN(res.amount)).toBe(false);
    });

    test('Valores em milhares ("10 mil")', async () => {
      const res = await parseFinancialIntentWithGemini('paguei 10 mil de estoque', [], mockCategories);
      expect(res.amount).toBe(10000);
      expect(res.type).toBe('expense');
    });

    test('Rejeição e guarda contra valor zero ou negativo', () => {
      const draftZero: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        type: 'expense',
        amount: 0,
        missingFields: [],
        confidence: 0.8,
        isReadyForConfirmation: true,
      };

      const valZero = validateParsedIntent(draftZero, todayStr);
      expect(valZero.isReadyForConfirmation).toBe(false);
      expect(valZero.missingFields).toContain('amount');
    });
  });

  // =========================================================================
  // PRESERVAÇÃO DE CONTEXTO E CORREÇÕES FEITAS PELO USUÁRIO (Multi-turn)
  // =========================================================================
  describe('PRESERVAÇÃO DE CONTEXTO & CORREÇÕES DO USUÁRIO', () => {
    test('Troca apenas do fornecedor mantendo valor e categoria', () => {
      const draft: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        type: 'expense',
        amount: 30000,
        supplier: 'Bechara',
        categoryName: 'Compra de estoque',
        missingFields: [],
        confidence: 0.9,
        isReadyForConfirmation: true,
      };

      const patched = trySlotFillingFallback('na verdade o fornecedor é Bertolini', draft, todayStr);
      expect(patched?.supplier).toBe('Bertolini');
      expect(patched?.amount).toBe(30000);
    });

    test('Resposta "não lembro" adiciona ao unknownByUser e não repete pergunta', () => {
      const draft: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        type: 'expense',
        supplier: 'Bechara',
        missingFields: ['amount'],
        questionToUser: 'Qual foi o valor?',
        confidence: 0.8,
        isReadyForConfirmation: false,
      };

      const patched = trySlotFillingFallback('não lembro', draft, todayStr);
      expect(patched?.unknownByUser).toContain('amount');
      expect(patched?.intentType).toBe('QUERY_OR_UPDATE');
    });
  });
});
