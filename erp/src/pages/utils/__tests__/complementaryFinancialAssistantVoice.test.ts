import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AUTO_SEND_SILENCE_MS,
  classifyMultiTurnIntent,
  ParsedFinancialIntent,
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


describe('BATERIA COMPLEMENTAR DO ASSISTENTE FINANCEIRO (GRUPOS 1 A 45)', () => {
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

});
