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
  extractLocalSemanticDelta,
  hasSignificantSemanticChange,
  parseIncrementalDraftDelta,
  consolidateFinalFinancialIntent,
  ParsedFinancialIntent,
} from '../../../../mobile/src/services/financialAiAssistantService';
import { FinancialCategory } from '../../../../mobile/src/services/mobileFinanceService';

const mockCategories: FinancialCategory[] = [
  { id: '1', name: 'Compra de mercadoria', type: 'expense', active: true },
  { id: '2', name: 'Combustível', type: 'expense', active: true },
  { id: '3', name: 'Outras receitas', type: 'income', active: true },
];

describe('Incremental Voice Processing & Semantic Debounce Architecture', () => {
  test('1. Extração local de delta semântico em tempo real', () => {
    const delta1 = extractLocalSemanticDelta('Comprei da Bechara');
    expect(delta1.supplier).toBe('Bechara');

    const delta2 = extractLocalSemanticDelta('Comprei 10 mil da Bechara em 3 boletos no PIX');
    expect(delta2.supplier).toBe('Bechara');
    expect(delta2.amount).toBe(10000);
    expect(delta2.installmentsCount).toBe(3);
    expect(delta2.paymentMethod).toBe('PIX');
  });

  test('2. Detecção de mudança semântica significativa (Threshold de Debounce)', () => {
    const prev = 'Comprei';
    const same = 'Comprei a';
    const significantSupplier = 'Comprei da Bechara';
    const significantAmount = 'Comprei 10 mil';

    expect(hasSignificantSemanticChange(prev, same)).toBe(false);
    expect(hasSignificantSemanticChange(prev, significantSupplier)).toBe(true);
    expect(hasSignificantSemanticChange(prev, significantAmount)).toBe(true);
  });

  test('3. Atualização incremental silenciosa de rascunho (Draft + Delta)', async () => {
    const initialDraft: ParsedFinancialIntent = {
      intentType: 'INSTALLMENT',
      type: 'expense',
      supplier: 'Bechara',
      totalAmount: 10000,
      missingFields: ['installmentAmounts'],
      confidence: 0.8,
      isReadyForConfirmation: false,
    };

    const updated = await parseIncrementalDraftDelta(
      'dois de 4 mil e um de 2',
      initialDraft,
      mockCategories
    );

    expect(updated.supplier).toBe('Bechara');
    expect(updated.totalAmount).toBe(10000);
    expect(updated.installmentList).toHaveLength(3);
    expect(updated.installmentList?.[0].amount).toBe(4000);
    expect(updated.installmentList?.[1].amount).toBe(4000);
    expect(updated.installmentList?.[2].amount).toBe(2000);
  });

  test('4. Consolidação final ao encerrar a gravação de voz', async () => {
    const accumulatedDraft: ParsedFinancialIntent = {
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

    const finalResult = await consolidateFinalFinancialIntent(
      'é todos eles são para o dia 20 do próximo mês e o primeiro boleto dia 20',
      accumulatedDraft,
      [],
      mockCategories
    );

    expect(finalResult.supplier).toBe('Bechara');
    expect(finalResult.totalAmount).toBe(10000);
    expect(finalResult.isReadyForConfirmation).toBe(true);
    expect(finalResult.installmentList?.[0].dueDate).toContain('-10-20');
    expect(finalResult.installmentList?.[1].dueDate).toContain('-11-20');
    expect(finalResult.installmentList?.[2].dueDate).toContain('-12-20');
  });
});
