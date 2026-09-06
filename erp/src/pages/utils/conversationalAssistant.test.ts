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
  test('TESTE 1: Multi-turn slot filling (Bechara 10k -> 4k/4k/2k -> todo dia 20)', async () => {
    const draft1 = await parseFinancialIntentWithGemini(
      'Comprei 10 mil da Bechara em três boletos',
      [],
      mockCategories
    );

    expect(draft1.supplier).toBe('Bechara');
    expect(draft1.totalAmount).toBe(10000);
    expect(draft1.installmentsCount).toBe(3);
    expect(draft1.isReadyForConfirmation).toBe(false);

    const draft2 = await parseFinancialIntentWithGemini(
      'dois de 4 mil e um de 2',
      [],
      mockCategories,
      draft1
    );

    expect(draft2.supplier).toBe('Bechara');
    expect(draft2.installmentList).toHaveLength(3);
    expect(draft2.installmentList?.[0].amount).toBe(4000);
    expect(draft2.installmentList?.[1].amount).toBe(4000);
    expect(draft2.installmentList?.[2].amount).toBe(2000);

    const draft3 = await parseFinancialIntentWithGemini(
      'todo dia 20 começando no próximo mês',
      [],
      mockCategories,
      draft2
    );

    expect(draft3.supplier).toBe('Bechara');
    expect(draft3.isReadyForConfirmation).toBe(true);
    expect(draft3.installmentList?.[0].dueDate).toContain('-10-20');
    expect(draft3.installmentList?.[1].dueDate).toContain('-11-20');
    expect(draft3.installmentList?.[2].dueDate).toContain('-12-20');
  });

  test('TESTE 2: Interpretação da frase real com hesitação', async () => {
    const activeDraft: ParsedFinancialIntent = {
      intentType: 'INSTALLMENT',
      type: 'expense',
      supplier: 'Bechara',
      totalAmount: 10000,
      installmentsCount: 3,
      installmentList: [
        { number: 1, amount: 4000, dueDate: null },
        { number: 2, amount: 4000, dueDate: null },
        { number: 3, amount: 2000, dueDate: null },
      ],
      missingFields: ['installmentDueDates'],
      confidence: 0.9,
      isReadyForConfirmation: false,
    };

    const result = await parseFinancialIntentWithGemini(
      'é todos eles são para o dia 20 do próximo mês e o primeiro boleto dia 20',
      [],
      mockCategories,
      activeDraft
    );

    expect(result.supplier).toBe('Bechara');
    expect(result.totalAmount).toBe(10000);
    expect(result.isReadyForConfirmation).toBe(true);
    expect(result.installmentList?.[0].dueDate).toContain('-10-20');
    expect(result.installmentList?.[1].dueDate).toContain('-11-20');
    expect(result.installmentList?.[2].dueDate).toContain('-12-20');
  });

  test('TESTE 3: Patch na parcela 2 ("o segundo é dia 25")', async () => {
    const activeDraft: ParsedFinancialIntent = {
      intentType: 'INSTALLMENT',
      type: 'expense',
      supplier: 'Bechara',
      totalAmount: 10000,
      installmentsCount: 3,
      installmentList: [
        { number: 1, amount: 4000, dueDate: '2026-10-20' },
        { number: 2, amount: 4000, dueDate: '2026-11-20' },
        { number: 3, amount: 2000, dueDate: '2026-12-20' },
      ],
      missingFields: [],
      confidence: 0.9,
      isReadyForConfirmation: true,
    };

    const patched = trySlotFillingFallback('o segundo é dia 25', activeDraft, '2026-09-05');

    expect(patched).not.toBeNull();
    expect(patched?.installmentList?.[0].dueDate).toBe('2026-10-20');
    expect(patched?.installmentList?.[1].dueDate).toBe('2026-11-25');
    expect(patched?.installmentList?.[2].dueDate).toBe('2026-12-20');
  });

  test('TESTE 4: Patch na parcela 1 ("não, o primeiro é dia 20 de outubro")', async () => {
    const activeDraft: ParsedFinancialIntent = {
      intentType: 'INSTALLMENT',
      type: 'expense',
      supplier: 'Bechara',
      totalAmount: 10000,
      installmentsCount: 3,
      installmentList: [
        { number: 1, amount: 4000, dueDate: null },
        { number: 2, amount: 4000, dueDate: '2026-11-20' },
        { number: 3, amount: 2000, dueDate: '2026-12-20' },
      ],
      missingFields: ['installmentDueDates'],
      confidence: 0.9,
      isReadyForConfirmation: false,
    };

    const patched = trySlotFillingFallback('não, o primeiro é dia 20 de outubro', activeDraft, '2026-09-05');

    expect(patched).not.toBeNull();
    expect(patched?.installmentList?.[0].dueDate).toBe('2026-10-20');
    expect(patched?.isReadyForConfirmation).toBe(true);
  });

  test('TESTE 5: Frase quebrada com repetição de áudio', async () => {
    const activeDraft: ParsedFinancialIntent = {
      intentType: 'INSTALLMENT',
      type: 'expense',
      supplier: 'Bechara',
      totalAmount: 10000,
      installmentsCount: 3,
      missingFields: ['installmentAmounts'],
      confidence: 0.8,
      isReadyForConfirmation: false,
    };

    const result = trySlotFillingFallback(
      'de 10 são dois boletos de são dois boletos de 4 mil e um de 2',
      activeDraft,
      '2026-09-05'
    );

    expect(result).not.toBeNull();
    expect(result?.installmentList).toHaveLength(3);
    expect(result?.installmentList?.[0].amount).toBe(4000);
    expect(result?.installmentList?.[1].amount).toBe(4000);
    expect(result?.installmentList?.[2].amount).toBe(2000);
  });

  test('TESTE 6: Validação matemática quando soma diverge do total', async () => {
    const activeDraft: ParsedFinancialIntent = {
      intentType: 'INSTALLMENT',
      type: 'expense',
      supplier: 'Bechara',
      totalAmount: 10000,
      installmentsCount: 3,
      missingFields: ['installmentAmounts'],
      confidence: 0.8,
      isReadyForConfirmation: false,
    };

    const result = trySlotFillingFallback(
      'dois boletos de 4 mil e um de 3 mil',
      activeDraft,
      '2026-09-05'
    );

    expect(result).not.toBeNull();
    expect(result?.isReadyForConfirmation).toBe(false);
    expect(result?.questionToUser).toContain('não batem');
  });

  test('TESTE 7: Operação completa real da Bechara com divergência (Total 30k vs 10k+10k+5k = 25k)', async () => {
    const intent = await parseFinancialIntentWithGemini(
      'fiz uma compra cabeceada beleza com a Bechara de uma compra de 30.000 dois boletos de 10.000 e outro de 5.000 todas para o dia 20 primeiro é para o próximo mês',
      [],
      mockCategories
    );

    expect(intent.supplier).toBe('Bechara');
    expect(intent.totalAmount).toBe(30000);
    expect(intent.installmentList).toHaveLength(3);
    expect(intent.isReadyForConfirmation).toBe(false); // Bloqueia por divergência matemática!
    expect(intent.questionToUser).toContain('não batem');
    expect(intent.questionToUser).toContain('30.000');
    expect(intent.questionToUser).toContain('25.000');
  });

  test('TESTE 8: Resposta à divergência adicionando a parcela faltante ("é outro boleto de 5 mil")', async () => {
    const draftComDivergencia: ParsedFinancialIntent = {
      intentType: 'INSTALLMENT',
      type: 'expense',
      supplier: 'Bechara',
      totalAmount: 30000,
      dueDay: 20,
      installmentsCount: 3,
      installmentList: [
        { number: 1, amount: 10000, dueDate: '2026-10-20' },
        { number: 2, amount: 10000, dueDate: '2026-11-20' },
        { number: 3, amount: 5000, dueDate: '2026-12-20' },
      ],
      missingFields: ['installmentAmounts'],
      confidence: 0.9,
      isReadyForConfirmation: false,
    };

    const draftCorrigido = await parseFinancialIntentWithGemini(
      'é outro boleto de 5 mil',
      [],
      mockCategories,
      draftComDivergencia
    );

    expect(draftCorrigido.totalAmount).toBe(30000);
    expect(draftCorrigido.installmentList).toHaveLength(4);
    expect(draftCorrigido.installmentList?.[3].amount).toBe(5000);
    expect(draftCorrigido.installmentList?.[3].dueDate).toBe('2027-01-20'); // Data consecutiva auto-calculada!
    expect(draftCorrigido.isReadyForConfirmation).toBe(true);
    expect(draftCorrigido.questionToUser).toBe('Confere?');
  });

  test('TESTE 9: Resposta à divergência corrigindo o total ("o total é 25 mil")', async () => {
    const draftComDivergencia: ParsedFinancialIntent = {
      intentType: 'INSTALLMENT',
      type: 'expense',
      supplier: 'Bechara',
      totalAmount: 30000,
      dueDay: 20,
      installmentsCount: 3,
      installmentList: [
        { number: 1, amount: 10000, dueDate: '2026-10-20' },
        { number: 2, amount: 10000, dueDate: '2026-11-20' },
        { number: 3, amount: 5000, dueDate: '2026-12-20' },
      ],
      missingFields: ['installmentAmounts'],
      confidence: 0.9,
      isReadyForConfirmation: false,
    };

    const draftCorrigido = await parseFinancialIntentWithGemini(
      'o total é 25 mil',
      [],
      mockCategories,
      draftComDivergencia
    );

    expect(draftCorrigido.totalAmount).toBe(25000);
    expect(draftCorrigido.installmentList).toHaveLength(3);
    expect(draftCorrigido.isReadyForConfirmation).toBe(true);
    expect(draftCorrigido.questionToUser).toBe('Confere?');
  });

  test('TESTE 10: Resposta à divergência com frase de correção parcial ("eu quis dizer 2 de 5.000")', async () => {
    const draftComDivergencia: ParsedFinancialIntent = {
      intentType: 'INSTALLMENT',
      type: 'expense',
      supplier: 'Bechara',
      totalAmount: 30000,
      dueDay: 20,
      installmentsCount: 3,
      installmentList: [
        { number: 1, amount: 10000, dueDate: '2026-10-20' },
        { number: 2, amount: 10000, dueDate: '2026-11-20' },
        { number: 3, amount: 5000, dueDate: '2026-12-20' },
      ],
      missingFields: ['installmentAmounts'],
      confidence: 0.9,
      isReadyForConfirmation: false,
    };

    const draftCorrigido = await parseFinancialIntentWithGemini(
      'eu quis dizer 2 de 5.000',
      [],
      mockCategories,
      draftComDivergencia
    );

    expect(draftCorrigido.supplier).toBe('Bechara');
    expect(draftCorrigido.totalAmount).toBe(30000);
    expect(draftCorrigido.installmentList).toHaveLength(4);
    expect(draftCorrigido.installmentList?.[0].amount).toBe(10000);
    expect(draftCorrigido.installmentList?.[1].amount).toBe(10000);
    expect(draftCorrigido.installmentList?.[2].amount).toBe(5000);
    expect(draftCorrigido.installmentList?.[3].amount).toBe(5000);
    expect(draftCorrigido.isReadyForConfirmation).toBe(true);
  });

  test('TESTE 11: Cálculo determinístico de datas relativas ("próximo mês") em Setembro/2026', () => {
    const draft: ParsedFinancialIntent = {
      intentType: 'INSTALLMENT',
      type: 'expense',
      supplier: 'Bechara',
      totalAmount: 30000,
      dueDay: 20,
      installmentsCount: 4,
      installmentList: [
        { number: 1, amount: 10000, dueDate: null },
        { number: 2, amount: 10000, dueDate: null },
        { number: 3, amount: 5000, dueDate: null },
        { number: 4, amount: 5000, dueDate: null },
      ],
      missingFields: [],
      confidence: 0.9,
      isReadyForConfirmation: false,
    };

    const validado = validateParsedIntent(draft, '2026-09-05');

    expect(validado.installmentList?.[0].dueDate).toBe('2026-10-20');
    expect(validado.installmentList?.[1].dueDate).toBe('2026-11-20');
    expect(validado.installmentList?.[2].dueDate).toBe('2026-12-20');
    expect(validado.installmentList?.[3].dueDate).toBe('2027-01-20'); // Virada de ano 2027-01-20!
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

  test('TESTE 17: Multi-turn de Categoria e Continuidade sem Repetição (Bechara 10k/10k/5k/5k -> compra de estoque -> dia 20)', async () => {
    // M1: Início da operação com 4 boletos
    const draft1 = await parseFinancialIntentWithGemini(
      'eu fiz eu quero registrar uma compra da Bechara boleto de dois boletos de R$ 10.000 e dois de cinco mil',
      [],
      mockCategories
    );

    expect(draft1.supplier).toBe('Bechara');
    expect(draft1.installmentList).toHaveLength(4);
    expect(draft1.totalAmount).toBe(30000);
    expect(draft1.isReadyForConfirmation).toBe(false);

    // M2: Complemento de Categoria ("é compra, compra de estoque")
    const draft2 = await parseFinancialIntentWithGemini(
      'é compra, compra de estoque',
      [],
      mockCategories,
      draft1
    );

    expect(draft2.supplier).toBe('Bechara');
    expect(draft2.categoryName).toBe('Compra de estoque');
    expect(draft2.missingFields).not.toContain('category');
    expect(draft2.questionToUser).not.toContain('categoria');
    expect(draft2.questionToUser).toContain('primeiro boleto');

    // M3: Complemento de Vencimento ("dia 20 começando mês que vem")
    const draft3 = await parseFinancialIntentWithGemini(
      'dia 20 começando mês que vem',
      [],
      mockCategories,
      draft2
    );

    expect(draft3.supplier).toBe('Bechara');
    expect(draft3.categoryName).toBe('Compra de estoque');
    expect(draft3.isReadyForConfirmation).toBe(true);
    expect(draft3.installmentList?.[0].dueDate).toContain('-20');
    expect(draft3.installmentList?.[1].dueDate).toContain('-20');
    expect(draft3.installmentList?.[2].dueDate).toContain('-20');
    expect(draft3.installmentList?.[3].dueDate).toContain('-20');
    expect(draft3.questionToUser).toBe('Confere?');
  });
});



