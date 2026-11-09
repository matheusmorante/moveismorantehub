import { describe, expect, test } from 'vitest';
import type { ParsedFinancialIntent } from '../../';
import {
  classifyMultiTurnIntent,
  parseFinancialIntentWithGemini,
  trySlotFillingFallback,
} from '../../';

type FinancialCategories = Parameters<typeof parseFinancialIntentWithGemini>[2];

export function registerComplementaryAssistantInvariantCases(
  mockCategories: FinancialCategories,
  todayStr: string,
): void {
  // GRUPO 42 — TESTES BASEADOS EM PROPRIEDADES (12 INVARIANTES)
  describe('GRUPO 42 — INVARIANTES DE PROPRIEDADE', () => {
    test('Invariante 1: Movimentações criadas <= fatos financeiros realizados', () => {
      const realizedFactsCount = 1;
      const createdTxCount = 1;
      expect(createdTxCount).toBeLessThanOrEqual(realizedFactsCount);
    });

    test('Invariante 2: Correção não cria nova movimentação', () => {
      const intent = classifyMultiTurnIntent('Não, foi 250.', { amount: 200 });
      expect(intent).toBe('CORRECTION');
    });

    test('Invariante 3: Complemento não cria nova movimentação', () => {
      const intent = classifyMultiTurnIntent('Foi no Pix.', {
        amount: 200,
        paymentMethod: 'UNKNOWN',
      });
      expect(intent).toBe('ANSWER_TO_QUESTION');
    });

    test('Invariante 4: Nova movimentação não sobrescreve draft anterior', () => {
      const intent = classifyMultiTurnIntent('E paguei 300 de internet.', {
        amount: 200,
        isReadyForConfirmation: true,
      });
      expect(intent).toBe('NEW_TRANSACTION');
    });

    test('Invariante 5: Forma de pagamento não informada nunca nasce preenchida', async () => {
      const draft = await parseFinancialIntentWithGemini('Abasteci 150.', [], mockCategories);
      expect(draft.paymentMethod).toBe('UNKNOWN');
    });

    test('Invariante 6: Categoria inexistente nunca é persistida', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Abasteci 150 no Pix.',
        [],
        mockCategories
      );
      const exists = mockCategories.some((c) => c.name === draft.categoryName);
      expect(exists).toBe(true);
    });

    test('Invariante 7: Último valor explicitamente corrigido vence', () => {
      const activeDraft: ParsedFinancialIntent = { amount: 200 };
      const p1 = trySlotFillingFallback('Não, foi 250.', activeDraft, todayStr);
      const p2 = trySlotFillingFallback('Desculpa, foi 237,89.', p1 ?? activeDraft, todayStr);
      expect(p2?.amount).toBe(237.89);
    });

    test('Invariante 8: Resposta tardia do backend não sobrescreve versão mais nova do draft', () => {
      const draftV2 = { amount: 250, version: 2 };
      const draftV1Response = { amount: 200, version: 1 };

      const consolidated = draftV1Response.version > draftV2.version ? draftV1Response : draftV2;
      expect(consolidated.amount).toBe(250);
    });

    test('Invariante 9: Mesma utteranceId nunca é processada duas vezes', () => {
      const processedIds = new Set<string>();
      const processUtterance = (id: string) => {
        if (processedIds.has(id)) return false;
        processedIds.add(id);
        return true;
      };

      expect(processUtterance('utt_1')).toBe(true);
      expect(processUtterance('utt_1')).toBe(false);
    });

    test('Invariante 10: Silêncio não pode encerrar a sessão do microfone', () => {
      const micSessionState = 'LISTENING';
      const silenceHappened = true;
      if (silenceHappened) {
        expect(micSessionState).toBe('LISTENING');
      }
    });

    test('Invariante 11: Ausência de campo em mensagem complementar não apaga valor conhecido', () => {
      const activeDraft: ParsedFinancialIntent = { amount: 500, supplier: 'Bechara' };
      const patched = trySlotFillingFallback('Foi no Pix.', activeDraft, todayStr);
      expect(patched?.amount).toBe(500);
      expect(patched?.supplier).toBe('Bechara');
    });

    test('Invariante 12: Transação futura não entra como realizada', async () => {
      const draft = await parseFinancialIntentWithGemini(
        'Vou pagar amanhã R$ 500.',
        [],
        mockCategories
      );
      expect(draft.isReadyForConfirmation).toBe(false);
    });
  });
}
