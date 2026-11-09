import { describe, expect, test } from 'vitest';
import type { ParsedFinancialIntent } from '../../';
import { parseFinancialIntentWithGemini, trySlotFillingFallback } from '../../';

type FinancialCategories = Parameters<typeof parseFinancialIntentWithGemini>[2];

export function registerUtilityExpenseClassificationCases(mockCategories: FinancialCategories): void {
  // GRUPO 9 — CONTA DE LUZ
  describe('GRUPO 9 — CONTA DE LUZ', () => {
    test('TESTE 9.1: "Acabei de pagar uma luz, é 237 e 89 centavos, foi no Pix."', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Acabei de pagar uma luz, é 237 e 89 centavos, foi no Pix.',
        [],
        mockCategories
      );
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
      const draft = await parseFinancialIntentWithGemini(
        'Paguei a água R$ 80 no Pix.',
        [],
        mockCategories
      );
      expect(draft.businessPurpose).toBe('UNKNOWN');
      expect(draft.questionToUser).toMatch(/loja ou é uma conta pessoal\?/i);
    });

    test('"Paguei a internet da loja R$ 150 no Pix." -> BUSINESS', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Paguei a internet da loja R$ 150 no Pix.',
        [],
        mockCategories
      );
      expect(draft.businessPurpose).toBe('BUSINESS');
      expect(draft.categoryName).toBe('Contas de Consumo');
    });

    test('"Paguei a internet de casa R$ 150 no Pix." -> PERSONAL / Pró-labore', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Paguei a internet de casa R$ 150 no Pix.',
        [],
        mockCategories
      );
      expect(draft.businessPurpose).toBe('PERSONAL');
      expect(draft.categoryName).toBe('Pró-labore');
    });
  });
}
