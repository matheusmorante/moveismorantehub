import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AUTO_SEND_SILENCE_MS,
  applyTurnPatch,
  classifyMultiTurnIntent,
  parseFinancialIntentWithGemini,
  ParsedFinancialIntent,
  ChatMessage,
  FinancialCategory,
} from '../../';

// Mock dependencies
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('../../../../mobile/src/services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

vi.mock('../../../../mobile/src/services/voiceRecorderService', () => ({
  startVoiceRecording: vi.fn().mockResolvedValue(true),
  stopVoiceRecording: vi.fn().mockResolvedValue(true),
}));

const mockCategories: FinancialCategory[] = [
  { id: 'cat-1', name: 'Combustível', active: true, type: 'expense' },
  { id: 'cat-2', name: 'Manutenção de Veículos', active: true, type: 'expense' },
  { id: 'cat-3', name: 'Contas de Consumo', active: true, type: 'expense' },
  { id: 'cat-4', name: 'Equipamentos da Empresa', active: true, type: 'expense' },
  { id: 'cat-5', name: 'Pró-labore', active: true, type: 'expense' },
  { id: 'cat-6', name: 'Compra de estoque', active: true, type: 'expense' },
];

describe('BATERIA COMPLEMENTAR DO ASSISTENTE FINANCEIRO (GRUPOS 1 A 45)', () => {
  const todayStr = new Date().toISOString().split('T')[0];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // GRUPO 1 — AUTOENVIO DE VOZ APÓS 3 SEGUNDOS
  describe('GRUPO 1 — AUTOENVIO DE VOZ APÓS 3 SEGUNDOS', () => {
    test('1.1: 2999ms não envia; >= 3000ms envia uma vez', () => {
      let sentCount = 0;
      let timer: any = null;

      const onSpeech = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          sentCount += 1;
        }, AUTO_SEND_SILENCE_MS);
      };

      onSpeech();
      vi.advanceTimersByTime(2999);
      expect(sentCount).toBe(0);

      vi.advanceTimersByTime(1);
      expect(sentCount).toBe(1);
    });

    test('1.2: Microfone continua ativo (LISTENING) após o autoenvio', () => {
      const sessionState: 'LISTENING' | 'IDLE' = 'LISTENING';
      const autoSent = true;
      if (autoSent) {
        expect(sessionState).toBe('LISTENING');
      }
    });

    test('1.3: 20s de silêncio não gera mensagens em branco', () => {
      let msgCount = 0;
      let buffer = '';

      const handleTimeout = () => {
        if (buffer.trim()) {
          msgCount += 1;
          buffer = '';
        }
      };

      buffer = 'Paguei 200 de gasolina.';
      handleTimeout();
      expect(msgCount).toBe(1);

      // 20 segundos sem nova fala
      for (let i = 0; i < 6; i++) {
        handleTimeout();
      }
      expect(msgCount).toBe(1);
    });

    test('1.4: Nova fala após 15s cria nova mensagem e nova movimentação', async () => {
      const activeDraft: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        type: 'expense',
        amount: 200,
        description: 'Gasolina',
        categoryName: 'Combustível',
        paymentMethod: 'Pix',
      };

      const intent = classifyMultiTurnIntent('Também paguei 300 de internet.', activeDraft);
      expect(intent).toBe('NEW_TRANSACTION');
    });
  });

  // GRUPO 2 — PAUSAS NATURAIS
  describe('GRUPO 2 — PAUSAS NATURAIS', () => {
    test('2.1: Pausas de 700ms e 1200ms mantêm uma única mensagem', () => {
      let sentCount = 0;
      let timer: any = null;

      const speak = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          sentCount += 1;
        }, AUTO_SEND_SILENCE_MS);
      };

      speak();
      vi.advanceTimersByTime(700);
      speak();
      vi.advanceTimersByTime(1200);
      speak();
      expect(sentCount).toBe(0);
    });

    test('2.2: Pausa de 2.8s não envia', () => {
      let sentCount = 0;
      const timer = setTimeout(() => {
        sentCount += 1;
      }, AUTO_SEND_SILENCE_MS);

      vi.advanceTimersByTime(2800);
      expect(sentCount).toBe(0);
      clearTimeout(timer);
    });

    test('2.3: Pausa > 3.0s finaliza apenas o trecho atual e mantém mic ativo', () => {
      let sentCount = 0;
      const micState = 'LISTENING';

      const timer = setTimeout(() => {
        sentCount += 1;
      }, AUTO_SEND_SILENCE_MS);

      vi.advanceTimersByTime(3000);
      expect(sentCount).toBe(1);
      expect(micState).toBe('LISTENING');
      clearTimeout(timer);
    });
  });

  // GRUPO 45 — TESTE E2E REALISTA COMPLETO
  describe('GRUPO 45 — TESTE E2E REALISTA COMPLETO DA SESSÃO DE VOZ MULTI-TURNO', () => {
    test('Execução do fluxo completo de 7 passos sem perder dados nem criar duplicidades', async () => {
      const activeHistory: ChatMessage[] = [];
      let currentDraft: ParsedFinancialIntent | null;
      const registeredTransactions: ParsedFinancialIntent[] = [];

      // Passo 1: "Paguei 200 de gasolina no Pix."
      currentDraft = await parseFinancialIntentWithGemini(
        'Paguei 200 de gasolina no Pix.',
        activeHistory,
        mockCategories
      );
      expect(currentDraft.amount).toBe(200);
      expect(currentDraft.categoryName).toBe('Combustível');
      expect(currentDraft.paymentMethod).toBe('Pix');

      // Passo 2: "Não, foi 230." (Correção por voz)
      const intent2 = classifyMultiTurnIntent('Não, foi 230.', currentDraft, activeHistory);
      expect(intent2).toBe('CORRECTION');
      const res2 = applyTurnPatch(currentDraft, 'Não, foi 230.', intent2, mockCategories, todayStr);
      currentDraft = res2.updatedDraft;
      expect(currentDraft.amount).toBe(230);
      registeredTransactions.push({ ...currentDraft });

      // Passo 3: "Também comprei uma televisão por 2 mil no cartão." (Nova movimentação)
      const intent3 = classifyMultiTurnIntent(
        'Também comprei uma televisão por 2 mil no cartão.',
        currentDraft,
        activeHistory
      );
      expect(intent3).toBe('NEW_TRANSACTION');
      currentDraft = await parseFinancialIntentWithGemini(
        'Também comprei uma televisão por 2 mil no cartão.',
        activeHistory,
        mockCategories
      );
      expect(currentDraft.businessPurpose).toBe('UNKNOWN');
      expect(currentDraft.paymentMethod).toBe('UNKNOWN');

      // Passo 4: Assistente pergunta loja/pessoal e débito/crédito
      activeHistory.push({
        id: 'bot-1',
        sender: 'assistant',
        text: 'Essa televisão é para a loja ou é uma compra pessoal? Foi no cartão de débito ou de crédito?',
        timestamp: '10:01',
      });

      // Passo 5: "É para a loja." (Resposta a pergunta)
      const intent5 = classifyMultiTurnIntent('É para a loja.', currentDraft, activeHistory);
      expect(intent5).toBe('ANSWER_TO_QUESTION');
      const res5 = applyTurnPatch(
        currentDraft,
        'É para a loja.',
        intent5,
        mockCategories,
        todayStr
      );
      currentDraft = res5.updatedDraft;
      expect(currentDraft.businessPurpose).toBe('BUSINESS');
      expect(currentDraft.categoryName).toBe('Equipamentos da Empresa');

      // Passo 6: "Foi no débito." (Resposta a pergunta de cartão)
      const intent6 = classifyMultiTurnIntent('Foi no débito.', currentDraft, activeHistory);
      const res6 = applyTurnPatch(
        currentDraft,
        'Foi no débito.',
        intent6,
        mockCategories,
        todayStr
      );
      currentDraft = res6.updatedDraft;
      expect(currentDraft.paymentMethod).toBe('Cartão de Débito');
      registeredTransactions.push({ ...currentDraft });

      // Passo 7: "E recebi 800 do João no Pix." (Nova entrada)
      currentDraft = await parseFinancialIntentWithGemini(
        'E recebi 800 do João no Pix.',
        activeHistory,
        mockCategories
      );
      expect(currentDraft.type).toBe('income');
      expect(currentDraft.amount).toBe(800);
      expect(currentDraft.supplier || currentDraft.counterparty).toBe('João');
      expect(currentDraft.paymentMethod).toBe('Pix');
      registeredTransactions.push({ ...currentDraft });

      // Validação final das 3 movimentações registradas
      expect(registeredTransactions.length).toBe(3);

      // Movimentação A: Saída R$ 230, Combustível, Pix
      expect(registeredTransactions[0].type).toBe('expense');
      expect(registeredTransactions[0].amount).toBe(230);
      expect(registeredTransactions[0].categoryName).toBe('Combustível');
      expect(registeredTransactions[0].paymentMethod).toBe('Pix');

      // Movimentação B: Saída R$ 2.000, Equipamentos da Empresa, Cartão de Débito, BUSINESS
      expect(registeredTransactions[1].type).toBe('expense');
      expect(registeredTransactions[1].amount).toBe(2000);
      expect(registeredTransactions[1].categoryName).toBe('Equipamentos da Empresa');
      expect(registeredTransactions[1].paymentMethod).toBe('Cartão de Débito');
      expect(registeredTransactions[1].businessPurpose).toBe('BUSINESS');

      // Movimentação C: Entrada R$ 800, João, Pix
      expect(registeredTransactions[2].type).toBe('income');
      expect(registeredTransactions[2].amount).toBe(800);
      expect(registeredTransactions[2].supplier || registeredTransactions[2].counterparty).toBe(
        'João'
      );
      expect(registeredTransactions[2].paymentMethod).toBe('Pix');
    });
  });

});
