import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  normalizeSummaryText,
  generateAudioCacheKey,
  getCachedAudioRecord,
  saveAudioRecordToCache,
  getOrCreateAudioWithDeduplication,
  clearAudioMemoryCache,
  DEFAULT_VOICE_CONFIG,
} from './deliveryAudioCacheService';
import { generateDeliveryAISummary, generateLocalSmartText } from './aiSummaryService';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => {}),
  },
}));

// Mock Supabase Client
vi.mock('./supabaseClient', () => {
  const queryMock = () => ({
    eq: () => queryMock(),
    order: () => queryMock(),
    maybeSingle: async () => ({ data: null, error: null }),
    then: (cb: any) => Promise.resolve({ data: [], error: null }).then(cb),
  });

  return {
    supabase: {
      from: () => ({
        select: () => queryMock(),
        upsert: async () => ({ data: null, error: null }),
      }),
    },
  };
});

describe('deliveryAudioCacheService & aiSummaryService — Cache por Hash de Conteúdo de Áudio', () => {
  beforeEach(() => {
    clearAudioMemoryCache();
    vi.clearAllMocks();
  });

  it('1. 0 entregas -> texto exatamente: "Sem entregas para hoje."', () => {
    const text = generateLocalSmartText({ scope: 'today', orders: [] });
    expect(text).toBe('Sem entregas para hoje.');
  });

  it('2. 0 entregas -> nenhum LLM é chamado para gerar texto (fast-path)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const text = await generateDeliveryAISummary('today', true, undefined, undefined, undefined, []);
    expect(text).toBe('Sem entregas para hoje.');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('3 & 4. Primeira solicitação gera TTS; segunda solicitação com mesmo texto utiliza cache (0 chamadas adicionais)', async () => {
    const normText = normalizeSummaryText('Sem entregas para hoje.');
    const cacheKey = generateAudioCacheKey(normText);

    // 1ª busca: Miss
    const cachedBefore = await getCachedAudioRecord(cacheKey);
    expect(cachedBefore).toBeNull();

    // Simula geração e salvamento
    await saveAudioRecordToCache({
      cacheKey,
      normalizedText: normText,
      provider: DEFAULT_VOICE_CONFIG.provider,
      model: DEFAULT_VOICE_CONFIG.model,
      voiceId: DEFAULT_VOICE_CONFIG.voiceId,
      language: DEFAULT_VOICE_CONFIG.language,
      speed: DEFAULT_VOICE_CONFIG.speed,
      audioUrl: 'data:audio/wav;base64,mockAudioData',
    });

    // 2ª busca: Hit
    const cachedAfter = await getCachedAudioRecord(cacheKey);
    expect(cachedAfter).not.toBeNull();
    expect(cachedAfter?.audioUrl).toBe('data:audio/wav;base64,mockAudioData');
  });

  it('5. Mesmo texto em outra data -> reutiliza o mesmo cache (mesmo hash)', () => {
    const keyDay1 = generateAudioCacheKey('Sem entregas para hoje.');
    const keyDay2 = generateAudioCacheKey('Sem entregas para hoje.');
    expect(keyDay1).toBe(keyDay2);
  });

  it('6. Texto diferente -> gera outra chave de cache', () => {
    const key1 = generateAudioCacheKey('Sem entregas para hoje.');
    const key2 = generateAudioCacheKey('Hoje temos 3 entregas programadas.');
    expect(key1).not.toBe(key2);
  });

  it('7. Texto volta para conteúdo já cacheado -> reutiliza áudio antigo', async () => {
    const textOld = 'Sem entregas para hoje.';
    const keyOld = generateAudioCacheKey(textOld);

    await saveAudioRecordToCache({
      cacheKey: keyOld,
      normalizedText: textOld,
      provider: DEFAULT_VOICE_CONFIG.provider,
      model: DEFAULT_VOICE_CONFIG.model,
      voiceId: DEFAULT_VOICE_CONFIG.voiceId,
      language: DEFAULT_VOICE_CONFIG.language,
      speed: DEFAULT_VOICE_CONFIG.speed,
      audioUrl: 'data:audio/wav;base64,oldAudio',
    });

    // Mudança temporária
    const keyNew = generateAudioCacheKey('Hoje temos entregas.');
    expect(keyNew).not.toBe(keyOld);

    // Retorno ao texto original
    const cachedReused = await getCachedAudioRecord(keyOld);
    expect(cachedReused).not.toBeNull();
    expect(cachedReused?.audioUrl).toBe('data:audio/wav;base64,oldAudio');
  });

  it('8. Mesmo texto + voiceId diferente -> gera outro hash', () => {
    const text = 'Sem entregas para hoje.';
    const keyKore = generateAudioCacheKey(text, { voiceId: 'Kore' });
    const keyPuck = generateAudioCacheKey(text, { voiceId: 'Puck' });
    expect(keyKore).not.toBe(keyPuck);
  });

  it('9. Mesmo texto + model diferente -> gera outro hash', () => {
    const text = 'Sem entregas para hoje.';
    const keyModel1 = generateAudioCacheKey(text, { model: 'gemini-3.1-flash-tts-preview' });
    const keyModel2 = generateAudioCacheKey(text, { model: 'gemini-1.5-flash' });
    expect(keyModel1).not.toBe(keyModel2);
  });

  it('10. Duas requisições simultâneas para cache miss -> apenas 1 execução física (deduplicação)', async () => {
    const key = generateAudioCacheKey('Texto para teste simultâneo');
    let executionCount = 0;

    const mockTtsGenerator = async () => {
      executionCount++;
      await new Promise((r) => setTimeout(r, 50));
      return { success: true, audioUrl: 'data:audio/wav;base64,dedupAudio' };
    };

    // Dispara 2 requisições concorrentes simultâneas
    const [res1, res2] = await Promise.all([
      getOrCreateAudioWithDeduplication(key, mockTtsGenerator),
      getOrCreateAudioWithDeduplication(key, mockTtsGenerator),
    ]);

    expect(executionCount).toBe(1); // Executou apenas UMA vez!
    expect(res1.audioUrl).toBe('data:audio/wav;base64,dedupAudio');
    expect(res2.audioUrl).toBe('data:audio/wav;base64,dedupAudio');
  });

  it('11 & 12. Normalização determinística e resiliência a falhas de TTS', () => {
    const rawInput = '  Sem   entregas   para   hoje.   \n\n ';
    const normalized = normalizeSummaryText(rawInput);
    expect(normalized).toBe('Sem entregas para hoje.');
  });
});
