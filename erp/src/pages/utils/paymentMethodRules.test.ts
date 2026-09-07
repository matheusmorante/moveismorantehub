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

import {
  parseFinancialIntentWithGemini,
  trySlotFillingFallback,
  validateParsedIntent,
  ParsedFinancialIntent,
} from '../../../../mobile/src/services/financialAiAssistantService';
import {
  confirmFinancialDraft,
  FinancialCategory,
} from '../../../../mobile/src/services/mobileFinanceService';

const mockCategories: FinancialCategory[] = [
  { id: '1', name: 'Compra de estoque', type: 'expense' },
  { id: '2', name: 'Combustível', type: 'expense' },
  { id: '3', name: 'Frete', type: 'expense' },
  { id: '4', name: 'Outras receitas', type: 'income' },
];

describe('Regras Obrigatórias de Forma de Pagamento e Recebimento no Assistente Financeiro', () => {
  describe('1. SAÍDA / DESPESAS', () => {
    test('1.1. "paguei 500 reais de frete" -> paymentMethod UNKNOWN -> pergunta forma de pagamento', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'paguei 500 reais de frete',
        [],
        mockCategories
      );

      expect(draft.amount).toBe(500);
      expect(draft.type).toBe('expense');
      expect(draft.paymentMethod).toBe('UNKNOWN');
      expect(draft.missingFields).toContain('paymentMethod');
      expect(draft.isReadyForConfirmation).toBe(false);
      expect(draft.questionToUser).toBe('Qual foi a forma de pagamento?');
    });

    test('1.2. "paguei 500 reais de frete no pix" -> Pix -> não pergunta forma de pagamento', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'paguei 500 reais de frete no pix',
        [],
        mockCategories
      );

      expect(draft.amount).toBe(500);
      expect(draft.type).toBe('expense');
      expect(draft.paymentMethod).toBe('Pix');
      expect(draft.missingFields).not.toContain('paymentMethod');
      expect(draft.isReadyForConfirmation).toBe(true);
      expect(draft.questionToUser).toBe('Confere?');
    });

    test('1.3. "comprei 10 mil de mercadoria da Bechara" -> NÃO assume boleto por padrão', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'comprei 10 mil de mercadoria da Bechara',
        [],
        mockCategories
      );

      expect(draft.amount).toBe(10000);
      expect(draft.supplier).toBe('Bechara');
      expect(draft.paymentMethod).toBe('UNKNOWN');
      expect(draft.isReadyForConfirmation).toBe(false);
      expect(draft.questionToUser).toBe('Qual foi a forma de pagamento?');
    });
  });

  describe('2. ENTRADA / RECEITAS', () => {
    test('2.1. "recebi 800 reais do cliente" -> paymentMethod UNKNOWN -> pergunta forma de recebimento', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'recebi 800 reais do cliente',
        [],
        mockCategories
      );

      expect(draft.amount).toBe(800);
      expect(draft.type).toBe('income');
      expect(draft.paymentMethod).toBe('UNKNOWN');
      expect(draft.missingFields).toContain('paymentMethod');
      expect(draft.isReadyForConfirmation).toBe(false);
      expect(draft.questionToUser).toBe('Qual foi a forma de recebimento?');
    });

    test('2.2. "recebi 800 reais em dinheiro" -> Dinheiro -> não pergunta', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'recebi 800 reais em dinheiro',
        [],
        mockCategories
      );

      expect(draft.amount).toBe(800);
      expect(draft.type).toBe('income');
      expect(draft.paymentMethod).toBe('Dinheiro');
      expect(draft.missingFields).not.toContain('paymentMethod');
      expect(draft.isReadyForConfirmation).toBe(true);
      expect(draft.questionToUser).toBe('Confere?');
    });
  });

  describe('3. CONTEXTO INCREMENTAL / RESPONDER APENAS O QUE FALTA', () => {
    test('3.1. Usuário: "Paguei 2 mil de mercadoria." -> IA: "Qual foi a forma de pagamento?" -> Usuário: "Pix." -> Preserva R$ 2.000 e categoria, define paymentMethod = Pix', async () => {
      // Passo 1: Usuário fala sem informar forma de pagamento
      const draft1 = await parseFinancialIntentWithGemini(
        'Paguei 2 mil de mercadoria.',
        [],
        mockCategories
      );

      expect(draft1.amount).toBe(2000);
      expect(draft1.paymentMethod).toBe('UNKNOWN');
      expect(draft1.isReadyForConfirmation).toBe(false);
      expect(draft1.questionToUser).toBe('Qual foi a forma de pagamento?');

      // Passo 2: Usuário responde "Pix."
      const draft2 = trySlotFillingFallback('Pix.', draft1, '2026-09-06');
      expect(draft2).not.toBeNull();

      // Valida preservação de dados
      expect(draft2?.amount).toBe(2000);
      expect(draft2?.type).toBe('expense');
      expect(draft2?.categoryName).toBe('Compra de estoque');
      expect(draft2?.paymentMethod).toBe('Pix');
      expect(draft2?.missingFields).not.toContain('paymentMethod');
      expect(draft2?.isReadyForConfirmation).toBe(true);
      expect(draft2?.questionToUser).toBe('Confere?');
    });
  });

  describe('4. VALIDAÇÃO DE DOMÍNIO / BACKEND', () => {
    test('4.1. confirmFinancialDraft rejeita confirmação quando paymentMethod for UNKNOWN', async () => {
      const draft: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        type: 'expense',
        amount: 500,
        description: 'Frete',
        categoryName: 'Frete',
        paymentMethod: 'UNKNOWN',
        missingFields: ['paymentMethod'],
        confidence: 0.8,
        isReadyForConfirmation: false,
      };

      const res = await confirmFinancialDraft(draft);
      expect(res.success).toBe(false);
      expect(res.error).toBe('Forma de pagamento é obrigatória para registrar a movimentação.');
    });

    test('4.2. confirmFinancialDraft aceita confirmação quando paymentMethod for VÁLIDO (Pix)', async () => {
      // DIV-008: businessPurpose é obrigatório — draft sem finalidade é bloqueado antes de persistir.
      // O draft válido para confirmação deve sempre incluir businessPurpose != UNKNOWN.
      const draft: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        type: 'expense',
        amount: 500,
        description: 'Frete',
        categoryName: 'Frete',
        paymentMethod: 'Pix',
        businessPurpose: 'BUSINESS',
        missingFields: [],
        confidence: 0.9,
        isReadyForConfirmation: true,
      };

      const res = await confirmFinancialDraft(draft);
      expect(res.success).toBe(true);
      expect(res.recordId).toBe('tx-123');
    });
  });

  describe('5. EMPRÉSTIMOS E FORMA DE RECEBIMENTO (SEÇÃO 11)', () => {
    test('5.1. "Peguei R$ 20.000 emprestado do banco." -> Transferência bancária (inferência autorizada)', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Peguei R$ 20.000 emprestado do banco.',
        [],
        mockCategories
      );

      expect(draft.amount).toBe(20000);
      expect(draft.type).toBe('income');
      expect(draft.isLoan).toBe(true);
      expect(draft.creditorType).toBe('FINANCIAL_INSTITUTION');
      expect(draft.paymentMethod).toBe('Transferência bancária');
      expect(draft.missingFields).not.toContain('paymentMethod');
      expect(draft.isReadyForConfirmation).toBe(true);
    });

    test('5.2. "Banco X liberou R$ 20.000 de empréstimo." -> Transferência bancária', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Banco X liberou R$ 20.000 de empréstimo.',
        [],
        mockCategories
      );

      expect(draft.amount).toBe(20000);
      expect(draft.type).toBe('income');
      expect(draft.isLoan).toBe(true);
      expect(draft.creditorType).toBe('FINANCIAL_INSTITUTION');
      expect(draft.paymentMethod).toBe('Transferência bancária');
      expect(draft.isReadyForConfirmation).toBe(true);
    });

    test('5.3. "Peguei R$ 5.000 emprestado do Matheus." -> perguntar forma de recebimento', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Peguei R$ 5.000 emprestado do Matheus.',
        [],
        mockCategories
      );

      expect(draft.amount).toBe(5000);
      expect(draft.type).toBe('income');
      expect(draft.isLoan).toBe(true);
      expect(draft.creditor).toBe('Matheus');
      expect(draft.creditorType).toBe('PERSON_OR_OTHER');
      expect(draft.paymentMethod).toBe('UNKNOWN');
      expect(draft.missingFields).toContain('paymentMethod');
      expect(draft.isReadyForConfirmation).toBe(false);
      expect(draft.questionToUser).toMatch(/como você recebeu os R\$ 5\.000,00 do Matheus\?/i);
    });

    test('5.4. "Lucas me emprestou R$ 3.000 pelo Pix." -> PIX', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Lucas me emprestou R$ 3.000 pelo Pix.',
        [],
        mockCategories
      );

      expect(draft.amount).toBe(3000);
      expect(draft.type).toBe('income');
      expect(draft.isLoan).toBe(true);
      expect(draft.creditor).toBe('Lucas');
      expect(draft.creditorType).toBe('PERSON_OR_OTHER');
      expect(draft.paymentMethod).toBe('Pix');
      expect(draft.missingFields).not.toContain('paymentMethod');
      expect(draft.isReadyForConfirmation).toBe(true);
    });

    test('5.5. "Peguei R$ 2.000 emprestado." -> perguntar de quem foi o empréstimo', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Peguei R$ 2.000 emprestado.',
        [],
        mockCategories
      );

      expect(draft.amount).toBe(2000);
      expect(draft.type).toBe('income');
      expect(draft.isLoan).toBe(true);
      expect(draft.creditorType).toBe('UNKNOWN');
      expect(draft.missingFields).toContain('creditor');
      expect(draft.isReadyForConfirmation).toBe(false);
      expect(draft.questionToUser).toBe('De quem foi o empréstimo?');
    });

    test('5.6. Usuário responde "Do banco." -> creditorType = FINANCIAL_INSTITUTION -> Transferência bancária', async () => {
      const draft1 = await parseFinancialIntentWithGemini(
        'Peguei R$ 2.000 emprestado.',
        [],
        mockCategories
      );

      expect(draft1.questionToUser).toBe('De quem foi o empréstimo?');

      const draft2 = trySlotFillingFallback('Do banco.', draft1, '2026-09-06');
      expect(draft2).not.toBeNull();
      expect(draft2?.creditorType).toBe('FINANCIAL_INSTITUTION');
      expect(draft2?.paymentMethod).toBe('Transferência bancária');
      expect(draft2?.isReadyForConfirmation).toBe(true);
    });

    test('5.7. Usuário responde "Do João." -> creditorType = PERSON_OR_OTHER -> perguntar forma de recebimento', async () => {
      const draft1 = await parseFinancialIntentWithGemini(
        'Peguei R$ 2.000 emprestado.',
        [],
        mockCategories
      );

      expect(draft1.questionToUser).toBe('De quem foi o empréstimo?');

      const draft2 = trySlotFillingFallback('Do João.', draft1, '2026-09-06');
      expect(draft2).not.toBeNull();
      expect(draft2?.creditor).toBe('João');
      expect(draft2?.creditorType).toBe('PERSON_OR_OTHER');
      expect(draft2?.paymentMethod).toBe('UNKNOWN');
      expect(draft2?.missingFields).toContain('paymentMethod');
      expect(draft2?.isReadyForConfirmation).toBe(false);
      expect(draft2?.questionToUser).toMatch(/como você recebeu os R\$ 2\.000,00 do João\?/i);
    });
  });

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

  describe('7. TESTES DE REGRAS DECIDIDAS PELO USUÁRIO (DECISION-001 A DECISION-004)', () => {
    test('DECISION-001: "Paguei 200 de luz e 150 de internet." -> gera rascunhos em lote (batchDraftsList)', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Paguei 200 de luz e 150 de internet.',
        [],
        mockCategories
      );

      expect(draft.batchDraftsList).not.toBeNull();
      expect(draft.batchDraftsList?.length).toBeGreaterThanOrEqual(2);
      expect(draft.questionToUser).toMatch(/identifiquei 2 movimentações|essas contas de luz e internet são da loja/i);
    });

    test('DECISION-002: "Paguei 500 no cartão." -> perguntar débito ou crédito (não assumir crédito)', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Paguei 500 no cartão.',
        [],
        mockCategories
      );

      expect(draft.paymentMethod).toBe('UNKNOWN');
      expect(draft.missingFields).toContain('paymentMethod');
      expect(draft.isReadyForConfirmation).toBe(false);
      expect(draft.questionToUser).toBe('Foi no cartão de débito ou de crédito?');

      const draft2 = trySlotFillingFallback('Débito.', draft, '2026-09-06');
      expect(draft2?.paymentMethod).toBe('Cartão de Débito');
      expect(draft2?.isReadyForConfirmation).toBe(true);
    });

    test('DECISION-003: "Paguei uns 500 reais." -> isEstimated = true e pergunta sobre estimativa', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Paguei uns 500 reais.',
        [],
        mockCategories
      );

      expect(draft.amount).toBe(500);
      expect(draft.isEstimated).toBe(true);
      expect(draft.isReadyForConfirmation).toBe(false);
      expect(draft.questionToUser).toMatch(/registrar R\$ 500,00 como estimativa/i);
    });

    test('DECISION-004: "Paguei duzentos e trinta e sete reais e oitenta e nove centavos no pix" -> offline parse = 237.89', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Paguei duzentos e trinta e sete reais e oitenta e nove centavos no pix.',
        [],
        mockCategories
      );

      expect(draft.amount).toBe(237.89);
      expect(draft.paymentMethod).toBe('Pix');
    });

    test('DECISION-004: "Recebi um milhão e meio" -> offline parse = 1500000', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Recebi um milhão e meio.',
        [],
        mockCategories
      );

      expect(draft.amount).toBe(1500000);
      expect(draft.type).toBe('income');
    });
  });

  describe('8. TESTES OBRIGATÓRIOS — REGRA DE TRANSAÇÃO ÚNICA REALIZADA', () => {
    test('TESTE 1: "Comprei R$ 10.000 em 10 vezes." -> ZERO saídas financeiras automáticas', async () => {
      const draft = await parseFinancialIntentWithGemini('Comprei R$ 10.000 em 10 vezes.', [], mockCategories);
      expect(draft.amount).toBeNull();
      expect(draft.isReadyForConfirmation).toBe(false);
    });

    test('TESTE 2: "Tenho 10 parcelas de R$ 1.000 para pagar." -> ZERO saídas automáticas', async () => {
      const draft = await parseFinancialIntentWithGemini('Tenho 10 parcelas de R$ 1.000 para pagar.', [], mockCategories);
      expect(draft.amount).toBeNull();
      expect(draft.isReadyForConfirmation).toBe(false);
    });

    test('TESTE 3: "Paguei uma parcela de R$ 1.000 hoje." -> UMA saída de R$ 1.000', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei uma parcela de R$ 1.000 hoje.', [], mockCategories);
      expect(draft.type).toBe('expense');
      expect(draft.amount).toBe(1000);
      expect(draft.installmentList).toBeFalsy();
    });

    test('TESTE 4: "Paguei a terceira parcela da Bechara de R$ 1.000 no Pix." -> UMA saída com descrição de 3ª parcela', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei a terceira parcela da Bechara de R$ 1.000 no Pix.', [], mockCategories);
      expect(draft.type).toBe('expense');
      expect(draft.amount).toBe(1000);
      expect(draft.supplier).toBe('Bechara');
      expect(draft.paymentMethod).toBe('Pix');
      expect(draft.description).toMatch(/3ª parcela/i);
      expect(draft.installmentList).toBeFalsy();
    });

    test('TESTE 5: "Pago R$ 2.000 de aluguel todo mês." -> ZERO movimentações automáticas', async () => {
      const draft = await parseFinancialIntentWithGemini('Pago R$ 2.000 de aluguel todo mês.', [], mockCategories);
      expect(draft.amount).toBeNull();
      expect(draft.isReadyForConfirmation).toBe(false);
    });

    test('TESTE 6: "Paguei R$ 2.000 do aluguel este mês." -> UMA saída de R$ 2.000', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei R$ 2.000 do aluguel este mês.', [], mockCategories);
      expect(draft.type).toBe('expense');
      expect(draft.amount).toBe(2000);
    });

    test('TESTE 7: "Vou pagar R$ 1.000 amanhã." -> ZERO saídas realizadas', async () => {
      const draft = await parseFinancialIntentWithGemini('Vou pagar R$ 1.000 amanhã.', [], mockCategories);
      expect(draft.amount).toBeNull();
      expect(draft.isReadyForConfirmation).toBe(false);
    });

    test('TESTE 8: "Recebi a segunda parcela do João, R$ 800 no Pix." -> UMA entrada de R$ 800', async () => {
      const draft = await parseFinancialIntentWithGemini('Recebi a segunda parcela do João, R$ 800 no Pix.', [], mockCategories);
      expect(draft.type).toBe('income');
      expect(draft.amount).toBe(800);
      expect(draft.counterparty).toBe('João');
      expect(draft.paymentMethod).toBe('Pix');
      expect(draft.description).toMatch(/2ª parcela/i);
    });

    test('TESTE 9: "Paguei 200 de luz e 150 de internet." -> DUAS movimentações em batchDrafts', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei 200 de luz e 150 de internet.', [], mockCategories);
      expect(draft.batchDraftsList).not.toBeNull();
      expect(draft.batchDraftsList?.length).toBe(2);
    });
  });

  describe('9. DESTINO DO GASTO (LOJA vs PESSOAL) E CATEGORIAS DE VEÍCULO', () => {
    test('9.1. "Comprei uma televisão de R$ 2.000 no Pix." -> Pergunta destino ("essa televisão é para a loja ou é uma compra pessoal?")', async () => {
      const draft = await parseFinancialIntentWithGemini('Comprei uma televisão de R$ 2.000 no Pix.', [], mockCategories);
      expect(draft.amount).toBe(2000);
      expect(draft.paymentMethod).toBe('Pix');
      expect(draft.businessPurpose).toBe('UNKNOWN');
      expect(draft.missingFields).toContain('businessPurpose');
      expect(draft.isReadyForConfirmation).toBe(false);
      expect(draft.questionToUser).toMatch(/essa televisão é para a loja ou é uma compra pessoal\?/i);
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
      const draft = await parseFinancialIntentWithGemini('Comprei uma geladeira por R$ 2.500 no Pix.', [], mockCategories);
      expect(draft.amount).toBe(2500);
      expect(draft.paymentMethod).toBe('Pix');
      expect(draft.businessPurpose).toBe('UNKNOWN');
      expect(draft.missingFields).toContain('businessPurpose');
      expect(draft.isReadyForConfirmation).toBe(false);
      expect(draft.questionToUser).toMatch(/essa geladeira é para a loja ou é uma compra pessoal\?/i);
    });

    test('9.5. Exceção de Combustível: "Abasteci 200 reais de gasolina no Pix." -> Categoria Combustível, BUSINESS, Sem pergunta loja x pessoal', async () => {
      const draft = await parseFinancialIntentWithGemini('Abasteci 200 reais de gasolina no Pix.', [], mockCategories);
      expect(draft.amount).toBe(200);
      expect(draft.categoryName).toBe('Combustível');
      expect(draft.businessPurpose).toBe('BUSINESS');
      expect(draft.missingFields).not.toContain('businessPurpose');
      expect(draft.isReadyForConfirmation).toBe(true);
    });

    test('9.6. Exceção de Manutenção: "Troquei o óleo e deu 300 reais no Pix." -> Categoria Manutenção de Veículos, BUSINESS', async () => {
      const draft = await parseFinancialIntentWithGemini('Troquei o óleo e deu 300 reais no Pix.', [], mockCategories);
      expect(draft.amount).toBe(300);
      expect(draft.categoryName).toBe('Manutenção de Veículos');
      expect(draft.businessPurpose).toBe('BUSINESS');
      expect(draft.missingFields).not.toContain('businessPurpose');
      expect(draft.isReadyForConfirmation).toBe(true);
    });

    test('9.7. Exceção de Pneus: "Comprei dois pneus por 900 reais no Pix." -> Categoria Manutenção de Veículos, BUSINESS', async () => {
      const draft = await parseFinancialIntentWithGemini('Comprei dois pneus por 900 reais no Pix.', [], mockCategories);
      expect(draft.amount).toBe(900);
      expect(draft.categoryName).toBe('Manutenção de Veículos');
      expect(draft.businessPurpose).toBe('BUSINESS');
      expect(draft.isReadyForConfirmation).toBe(true);
    });
  });
});



