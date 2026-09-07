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
        }),
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
import { FinancialCategory } from '../../../../mobile/src/services/mobileFinanceService';

const mockCategories: FinancialCategory[] = [
  { id: '1', name: 'Compra de estoque', type: 'expense' },
  { id: '2', name: 'Combustível', type: 'expense' },
  { id: '3', name: 'Outras receitas', type: 'income' },
];

describe('Conversational Assistant Context & Slot Filling Tests', () => {
  test('TESTE 1: Multi-turn slot filling de transação única (Bechara -> 10k -> no Pix)', async () => {
    const draft1 = await parseFinancialIntentWithGemini(
      'Paguei 10 mil para a Bechara',
      [],
      mockCategories
    );

    expect(draft1.supplier).toBe('Bechara');
    expect(draft1.amount).toBe(10000);
    expect(draft1.isReadyForConfirmation).toBe(false);

    const draft2 = await parseFinancialIntentWithGemini(
      'no Pix',
      [],
      mockCategories,
      draft1
    );

    expect(draft2.supplier).toBe('Bechara');
    expect(draft2.amount).toBe(10000);
    expect(draft2.paymentMethod).toBe('Pix');
    expect(draft2.isReadyForConfirmation).toBe(true);
  });

  test('TESTE 2: Interpretação da frase real com hesitação de data', async () => {
    const activeDraft: ParsedFinancialIntent = {
      intentType: 'SINGLE_TRANSACTION',
      type: 'expense',
      supplier: 'Bechara',
      amount: 10000,
      paymentMethod: 'Pix',
      missingFields: ['date'],
      confidence: 0.9,
      isReadyForConfirmation: false,
    };

    const result = await parseFinancialIntentWithGemini(
      'foi ontem',
      [],
      mockCategories,
      activeDraft
    );

    expect(result.supplier).toBe('Bechara');
    expect(result.amount).toBe(10000);
    expect(result.paymentMethod).toBe('Pix');
  });

  test('TESTE 3: Patch no meio do fluxo ("o valor na verdade é 12 mil")', async () => {
    const activeDraft: ParsedFinancialIntent = {
      intentType: 'SINGLE_TRANSACTION',
      type: 'expense',
      supplier: 'Bechara',
      amount: 10000,
      paymentMethod: 'Pix',
      missingFields: [],
      confidence: 0.9,
      isReadyForConfirmation: true,
    };

    const patched = trySlotFillingFallback('o valor na verdade é 12 mil', activeDraft, '2026-09-05');

    expect(patched).not.toBeNull();
    expect(patched?.amount).toBe(12000);
  });

  test('TESTE 4: Patch na data ("não, foi no dia 20 de outubro")', async () => {
    const activeDraft: ParsedFinancialIntent = {
      intentType: 'SINGLE_TRANSACTION',
      type: 'expense',
      supplier: 'Bechara',
      amount: 10000,
      paymentMethod: 'Pix',
      missingFields: [],
      confidence: 0.9,
      isReadyForConfirmation: true,
    };

    const patched = trySlotFillingFallback('não, foi no dia 20 de outubro', activeDraft, '2026-09-05');

    expect(patched).not.toBeNull();
    expect(patched?.date || patched?.dueDate).toContain('-10-20');
    expect(patched?.isReadyForConfirmation).toBe(true);
  });

  test('TESTE 5: Frase quebrada com repetição de áudio', async () => {
    const activeDraft: ParsedFinancialIntent = {
      intentType: 'SINGLE_TRANSACTION',
      type: 'expense',
      supplier: 'Bechara',
      missingFields: ['amount'],
      confidence: 0.8,
      isReadyForConfirmation: false,
    };

    const result = trySlotFillingFallback(
      'paguei paguei 4 mil reais',
      activeDraft,
      '2026-09-05'
    );

    expect(result).not.toBeNull();
    expect(result?.amount).toBe(4000);
  });

  test('TESTE 12: Alteração de parcela ordinal ("o último boleto é dia 25")', () => {
    const draft: ParsedFinancialIntent = {
      intentType: 'INSTALLMENT',
      type: 'expense',
      supplier: 'Bechara',
      totalAmount: 30000,
      dueDay: 20,
      installmentsCount: 4,
      installmentList: [
        { number: 1, amount: 10000, dueDate: '2026-10-20' },
        { number: 2, amount: 10000, dueDate: '2026-11-20' },
        { number: 3, amount: 5000, dueDate: '2026-12-20' },
        { number: 4, amount: 5000, dueDate: '2027-01-20' },
      ],
      missingFields: [],
      confidence: 0.9,
      isReadyForConfirmation: true,
    };

    const editado = trySlotFillingFallback('o último boleto é dia 25', draft, '2026-09-05');

    expect(editado).not.toBeNull();
    expect(editado?.installmentList?.[0].dueDate).toBe('2026-10-20');
    expect(editado?.installmentList?.[1].dueDate).toBe('2026-11-20');
    expect(editado?.installmentList?.[2].dueDate).toBe('2026-12-20');
    expect(editado?.installmentList?.[3].dueDate).toBe('2027-01-25');
  });

  test('TESTE 13: Alteração de Categoria e Forma de Pagamento em draft pendente', () => {
    const draft: ParsedFinancialIntent = {
      intentType: 'INSTALLMENT',
      type: 'expense',
      supplier: 'Bechara',
      totalAmount: 30000,
      categoryName: 'Compra de estoque',
      paymentMethod: 'Boleto',
      installmentsCount: 4,
      installmentList: [
        { number: 1, amount: 10000, dueDate: '2026-10-20' },
        { number: 2, amount: 10000, dueDate: '2026-11-20' },
        { number: 3, amount: 5000, dueDate: '2026-12-20' },
        { number: 4, amount: 5000, dueDate: '2027-01-20' },
      ],
      missingFields: [],
      confidence: 0.9,
      isReadyForConfirmation: true,
    };

    const editadoCat = trySlotFillingFallback('troca a categoria para móveis para revenda', draft, '2026-09-05');
    expect(editadoCat?.categoryName).toBe('Móveis para revenda');

    const editadoPix = trySlotFillingFallback('na verdade é Pix', draft, '2026-09-05');
    expect(editadoPix?.paymentMethod).toBe('Pix');
  });

  test('TESTE 14: Resposta "não lembro" / "consulta aí" preenche unknownByUser e altera intent para QUERY_OR_UPDATE', () => {
    const draftComPerguntaValor: ParsedFinancialIntent = {
      intentType: 'SINGLE_TRANSACTION',
      type: 'expense',
      supplier: 'Bechara',
      missingFields: ['amount'],
      questionToUser: 'Qual foi o valor dessa movimentação?',
      confidence: 0.8,
      isReadyForConfirmation: false,
    };

    const result = trySlotFillingFallback('não lembro, consulta aí', draftComPerguntaValor, '2026-09-05');

    expect(result).not.toBeNull();
    expect(result?.unknownByUser).toContain('amount');
    expect(result?.intentType).toBe('QUERY_OR_UPDATE');
    expect(result?.supplier).toBe('Bechara');
  });

  test('TESTE 15: CASO OBRIGATÓRIO DE EDIÇÃO COM CAMPOS DESCONHECIDOS ("editar compra da Bechara sem lembrar dia, forma nem quantia")', async () => {
    const userPhrase = 'eu quero saber eu quero editar uma compra que eu fiz da Bechara mas não lembro que dia que é, forma de pagamento nem a quantia';

    const result = await parseFinancialIntentWithGemini(userPhrase, [], mockCategories);

    expect(result.intentType).toBe('QUERY_OR_UPDATE');
    expect(result.supplier).toBe('Bechara');
    expect(result.unknownByUser).toBeDefined();
    expect(result.unknownByUser).toContain('date');
    expect(result.unknownByUser).toContain('paymentMethod');
    expect(result.unknownByUser).toContain('amount');
    expect(result.questionToUser).not.toContain('Qual foi o valor dessa movimentação?');
    expect(result.questionToUser).not.toContain('Qual é o vencimento');
  });

  test('TESTE 16: VARIAÇÕES DE LINGUAGEM DE EDIÇÃO E CONSULTA ("procura aí", "vê as compras", "corrigir")', async () => {
    const frases = [
      'quero editar aquela compra da Bechara',
      'procura aí uma compra da Bechara',
      'vê as compras da Bechara pra mim',
      'qual foi aquela compra da Bechara?',
      'quero mudar a forma de pagamento daquela compra da Bechara',
      'quero corrigir uma compra da Bechara',
    ];

    for (const frase of frases) {
      const res = await parseFinancialIntentWithGemini(frase, [], mockCategories);
      expect(res.intentType).toBe('QUERY_OR_UPDATE');
      expect(res.questionToUser).not.toBe('Qual foi o valor dessa movimentação?');
    }
  });

  test('TESTE 17: Multi-turn de Categoria e Continuidade sem Repetição (Paguei 30 mil Bechara -> compra de estoque -> no Pix)', async () => {
    // M1: Início da operação de pagamento realizado
    const draft1 = await parseFinancialIntentWithGemini(
      'paguei 30 mil para a Bechara',
      [],
      mockCategories
    );

    expect(draft1.supplier).toBe('Bechara');
    expect(draft1.amount).toBe(30000);
    expect(draft1.isReadyForConfirmation).toBe(false);

    // M2: Complemento de Categoria ("é compra de estoque")
    const draft2 = await parseFinancialIntentWithGemini(
      'é compra de estoque',
      [],
      mockCategories,
      draft1
    );

    expect(draft2.supplier).toBe('Bechara');
    expect(draft2.categoryName).toBe('Compra de estoque');

    // M3: Complemento de Forma de Pagamento ("no Pix")
    const draft3 = await parseFinancialIntentWithGemini(
      'no Pix',
      [],
      mockCategories,
      draft2
    );

    expect(draft3.supplier).toBe('Bechara');
    expect(draft3.paymentMethod).toBe('Pix');
    expect(draft3.isReadyForConfirmation).toBe(true);
  });

  test('TESTE 17: Resposta direta "loja" para pergunta sobre conta de luz pessoal ou da loja', () => {
    const draftContaDeLuz: ParsedFinancialIntent = {
      intentType: 'SINGLE_TRANSACTION',
      type: 'expense',
      description: 'conta de luz',
      amount: 400,
      paymentMethod: undefined,
      businessPurpose: 'UNKNOWN',
      missingFields: ['businessPurpose', 'paymentMethod'],
      questionToUser: 'Essa conta de luz é da loja ou é uma conta pessoal?',
      confidence: 0.9,
      isReadyForConfirmation: false,
    };

    const resultado = trySlotFillingFallback('loja', draftContaDeLuz, '2026-09-07');

    expect(resultado).not.toBeNull();
    expect(resultado?.businessPurpose).toBe('BUSINESS');
    expect(resultado?.categoryName).toBe('Contas de Consumo');
    expect(resultado?.questionToUser).not.toMatch(/loja ou é uma conta pessoal/i);
    expect(resultado?.questionToUser).toMatch(/forma de pagamento/i);
  });
});



