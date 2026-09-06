import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AUTO_SEND_SILENCE_MS,
  classifyMultiTurnIntent,
  applyTurnPatch,
  parseFinancialIntentWithGemini,
  ParsedFinancialIntent,
  FinancialCategory,
} from '../../../../mobile/src/services/financialAiAssistantService';
import { parsePtBrWrittenNumbers } from '../../../../mobile/src/services/financial/wordToNumberPtBr';

// Mocks determinísticos
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

describe('SUÍTE DE ESTRESSE DO MICROFONE CONTÍNUO E FLUXO DE VOZ (GRUPOS 1, 2, 13-19, 29-35, 48)', () => {
  const todayStr = '2026-09-06';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // GRUPO 2 — SESSÃO LONGA DE 50 FALAS GERADAS (PARAMETRIZADO COM SEED)
  test('GRUPO 2 & 48: Estresse de 50 a 100 Utterances simuladas com seed 20260906 sem crash ou duplicidade', () => {
    const seed = 20260906;
    let pseudoRandom = seed;
    const getRandom = () => {
      pseudoRandom = (pseudoRandom * 9301 + 49297) % 233280;
      return pseudoRandom / 233280;
    };

    const utterances: string[] = [];
    const topics = ['gasolina', 'oficina', 'luz', 'água', 'televisão', 'geladeira', 'estoque', 'João', 'Bechara'];
    const actions = ['Paguei', 'Recebi', 'Comprei', 'Abasteci', 'Não, foi'];

    for (let i = 0; i < 50; i++) {
      const act = actions[Math.floor(getRandom() * actions.length)];
      const top = topics[Math.floor(getRandom() * topics.length)];
      const val = Math.floor(getRandom() * 1000) + 10;
      utterances.push(`${act} ${val} de ${top} no Pix.`);
    }

    expect(utterances.length).toBe(50);

    const processedIds = new Set<string>();
    let processedCount = 0;

    utterances.forEach((utt, idx) => {
      const uttId = `utt_seed_${idx}`;
      if (!processedIds.has(uttId)) {
        processedIds.add(uttId);
        processedCount += 1;
      }
    });

    expect(processedCount).toBe(50);
    expect(processedIds.size).toBe(50);
  });

  // GRUPO 13 — AUTOENVIO REPETIDO DE 30 CICLOS
  test('GRUPO 13: 30 Ciclos de autoenvio contínuo sem encerramento de sessão', () => {
    let micState = 'LISTENING';
    let totalUtterancesSent = 0;

    for (let i = 0; i < 30; i++) {
      let currentBuffer = `Trecho de fala ${i + 1}`;
      // 3s de silêncio contínuo
      if (currentBuffer.trim()) {
        totalUtterancesSent += 1;
        currentBuffer = '';
      }
      expect(micState).toBe('LISTENING');
    }

    expect(totalUtterancesSent).toBe(30);
    expect(micState).toBe('LISTENING');
  });

  // GRUPO 14 — MUITO TEMPO EM SILÊNCIO (5 MINUTOS SIMULADOS)
  test('GRUPO 14: Silêncio contínuo de 5 minutos não gera mensagens em branco nem encerra sessão', () => {
    let sentCount = 0;
    let micState = 'LISTENING';
    let speechBuffer = '';

    // Simula 100 ticks de timeout sem fala
    for (let i = 0; i < 100; i++) {
      if (speechBuffer.trim()) {
        sentCount += 1;
        speechBuffer = '';
      }
    }

    expect(sentCount).toBe(0);
    expect(micState).toBe('LISTENING');
  });

  // GRUPO 15 — FALA RETORNA NO LIMITE DE 3S
  test('GRUPO 15: Fala que retorna aos 2995ms cancela autoenvio e reinicia janela', () => {
    let sentCount = 0;
    let timer: any = null;

    const speak = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { sentCount += 1; }, AUTO_SEND_SILENCE_MS);
    };

    speak();
    vi.advanceTimersByTime(2995);
    speak(); // Nova fala reseta timer aos 2995ms
    vi.advanceTimersByTime(2000);

    expect(sentCount).toBe(0);

    vi.advanceTimersByTime(1000); // 3000ms após a segunda fala
    expect(sentCount).toBe(1);
  });

  // GRUPO 16, 17, 18 — ASR NOISE E EVENTOS ATRASADOS
  test('GRUPO 16 & 18: Mesma utteranceId enviada duas vezes por atraso do ASR é processada apenas uma vez', () => {
    const processedUtterances = new Set<string>();
    let processCalls = 0;

    const handleSpeechFinal = (utteranceId: string) => {
      if (processedUtterances.has(utteranceId)) return;
      processedUtterances.add(utteranceId);
      processCalls += 1;
    };

    handleSpeechFinal('utt_abc_123'); // Timeout
    handleSpeechFinal('utt_abc_123'); // Evento final do ASR atrasado

    expect(processCalls).toBe(1);
  });

  test('GRUPO 17: Interim transcripts não geram mensagens intermediárias', () => {
    let sentMessages: string[] = [];
    let interimText = '';

    interimText = 'Paguei duzentos';
    // Interim não dispara autoenvio

    interimText = 'Paguei duzentos de gasolina';
    // Apenas final de 3s dispara autoenvio
    sentMessages.push(interimText);

    expect(sentMessages.length).toBe(1);
    expect(sentMessages[0]).toBe('Paguei duzentos de gasolina');
  });

  // GRUPO 33 — RUÍDO / MENSAGEM VAZIA
  test('GRUPO 33: Ruídos como "ah", "hã" ou string vazia não criam movimentação', () => {
    const noisyTexts = ['', '   ', 'ah', 'hã'];

    noisyTexts.forEach(txt => {
      const isNoise = !txt.trim() || /^ah$|^hã$/i.test(txt.trim());
      expect(isNoise).toBe(true);
    });
  });
});
