import { describe, it, expect, vi } from 'vitest';

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
      }),
    }),
  },
}));

import { processFinancialInput, extractMultipleFinancialFacts } from '../../../../mobile/src/services/financialAiAssistantService';
import { AiHybridDispatcher } from '../../services/aiGateway/core/AiHybridDispatcher';

describe('Bateria de Comportamento Humano e Linguagem Real (humanLanguageBattery.test.ts)', () => {
  const TODAY = '2026-09-06';

  describe('1. Linguagem Compacta e Gírias Financeiras', () => {
    it('"200 luz pix" -> Saída R$ 200,00, Luz, Pix', () => {
      const res = processFinancialInput('200 luz pix', TODAY);
      expect(res.draft?.amount).toBe(200);
      expect(res.draft?.description?.toLowerCase()).toContain('luz');
      expect(res.draft?.paymentMethod).toBe('Pix');
    });

    it('"paguei 200 conto de luz" -> Saída R$ 200,00, Luz', () => {
      const res = processFinancialInput('paguei 200 conto de luz', TODAY);
      expect(res.draft?.amount).toBe(200);
      expect(res.draft?.description?.toLowerCase()).toContain('luz');
      expect(res.isRealized).toBe(true);
    });

    it('"foi 200 da luz" -> Saída R$ 200,00, Luz', () => {
      const res = processFinancialInput('foi 200 da luz', TODAY);
      expect(res.draft?.amount).toBe(200);
      expect(res.draft?.description?.toLowerCase()).toContain('luz');
    });

    it('"internet deu 99,90" -> Saída R$ 99,90, Internet', () => {
      const res = processFinancialInput('internet deu 99,90', TODAY);
      expect(res.draft?.amount).toBe(99.90);
      expect(res.draft?.description?.toLowerCase()).toContain('internet');
    });

    it('"ontem saiu 450 pro frete" -> Saída R$ 450,00, Frete', () => {
      const res = processFinancialInput('ontem saiu 450 pro frete', TODAY);
      expect(res.draft?.amount).toBe(450);
      expect(res.draft?.type).toBe('expense');
      expect(res.draft?.description?.toLowerCase()).toContain('frete');
    });

    it('"paguei pro joão 300 da montagem" -> Saída R$ 300,00, Montagem', () => {
      const res = processFinancialInput('paguei pro joão 300 da montagem', TODAY);
      expect(res.draft?.amount).toBe(300);
      expect(res.draft?.description?.toLowerCase()).toContain('montagem');
    });

    it('"entrou 2 mil daquele sofá" -> Entrada R$ 2.000,00', () => {
      const res = processFinancialInput('entrou 2 mil daquele sofá', TODAY);
      expect(res.draft?.amount).toBe(2000);
      expect(res.draft?.type).toBe('income');
    });
  });

  describe('2. Múltiplas Movimentações em Mensagem Única com Linguagem Coloquial', () => {
    it('"recebi 500 no pix e gastei 80 de gasolina" -> 2 movimentações (1 entrada + 1 saída)', () => {
      const res = processFinancialInput('recebi 500 no pix e gastei 80 de gasolina', TODAY);
      expect(res.draft?.batchDraftsList).toBeDefined();
      expect(res.draft?.batchDraftsList?.length).toBe(2);

      const items = res.draft?.batchDraftsList!;
      expect(items[0].type).toBe('income');
      expect(items[0].amount).toBe(500);

      expect(items[1].type).toBe('expense');
      expect(items[1].amount).toBe(80);
      expect(items[1].description?.toLowerCase()).toContain('combustível');
    });
  });

  describe('3. Fast-Path Híbrido (< 20ms)', () => {
    it('Responde instantaneamente via LOCAL_FAST_PATH para caso financeiro claro', async () => {
      const result = await AiHybridDispatcher.dispatchIntent('paguei 80 de combustível no pix');
      expect(result.source).toBe('LOCAL_FAST_PATH');
      expect(result.intent).toBe('create_transaction');
      expect(result.data.amount).toBe(80);
      expect(result.data.payment_method).toBe('Pix');
      expect(result.e2eLatencyMs).toBeLessThan(50);
    });

    it('Ajusta valor diretamente pelo fast-path em caso de correção', async () => {
      const initialData = { type: 'expense', amount: 200, description: 'Combustível' };
      const result = await AiHybridDispatcher.dispatchIntent('não era 200, era 180', initialData);

      expect(result.source).toBe('LOCAL_FAST_PATH');
      expect(result.data.amount).toBe(180);
    });
  });
});
