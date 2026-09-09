import { Audio } from 'expo-av';
import { supabase } from './supabaseClient';
import { ensureSharedSummaryAudio } from './deliverySummaryAudioGenerationService';
import { DeliverySummaryRecord } from './deliverySummaryService';
import { speakTextWithFallback, stopSpeech as stopNativeSpeech, pauseSpeech as pauseNativeSpeech, resumeSpeech as resumeNativeSpeech } from './navigationVoiceService';
import {
  DEFAULT_VOICE_CONFIG,
  generateAudioCacheKey,
  getCachedAudioRecord,
  getPlayableAudioUrl,
  getOrCreateAudioWithDeduplication,
  normalizeSummaryText,
  saveAudioRecordToCache,
} from './deliveryAudioCacheService';

let activeSound: Audio.Sound | null = null;
const audioBase64Cache = new Map<string, string>(); // cache quente durante a sessão

export interface AudioPlaybackCallbacks {
  onStart?: () => void;
  onProgress?: (currentTimeSec: number, totalDurationSec: number) => void;
  onDone?: () => void;
  onError?: (err: any) => void;
}

export const stopGeminiAudio = async () => {
  try {
    await stopNativeSpeech();
    if (activeSound) {
      await activeSound.stopAsync().catch(() => {});
      await activeSound.unloadAsync().catch(() => {});
      activeSound = null;
    }
  } catch (e) {
    console.warn('[GeminiAudio] Erro ao parar áudio:', e);
  }
};

export const pauseGeminiAudio = async () => {
  try {
    if (activeSound) {
      await activeSound.pauseAsync();
    } else {
      await pauseNativeSpeech();
    }
  } catch (e) {
    console.warn('[GeminiAudio] Erro ao pausar áudio:', e);
  }
};

export const resumeGeminiAudio = async () => {
  try {
    if (activeSound) {
      await activeSound.playAsync();
    } else {
      await resumeNativeSpeech();
    }
  } catch (e) {
    console.warn('[GeminiAudio] Erro ao retomar áudio:', e);
  }
};

export const seekGeminiAudio = async (seconds: number) => {
  try {
    if (activeSound) {
      await activeSound.setPositionAsync(Math.max(0, Math.floor(seconds * 1000)));
    }
  } catch (e) {
    console.warn('[GeminiAudio] Erro no seek de áudio:', e);
  }
};

/**
 * Sintetiza o áudio com voz ultrarrealista do Google AI Studio / Google Cloud Neural2 TTS.
 * Se a API Key não tiver acesso ou a cota expirar, retorna success: false para fallback gracioso.
 */
function pcmToWavBase64(pcmBase64: string, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): string {
  try {
    const rawStr = typeof atob !== 'undefined' ? atob(pcmBase64) : Buffer.from(pcmBase64, 'base64').toString('binary');
    const pcmLen = rawStr.length;
    const buffer = new ArrayBuffer(44 + pcmLen);
    const view = new DataView(buffer);

    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + pcmLen, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // Raw PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, pcmLen, true);

    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < pcmLen; i++) {
      bytes[44 + i] = rawStr.charCodeAt(i);
    }

    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
  } catch {
    return pcmBase64;
  }
}

/**
 * Sintetiza áudio via modelos oficiais de áudio do Gemini (gemini-2.0-flash com fallback para gemini-1.5-flash).
 */
export const generateGeminiAudioMp3 = async (
  text: string,
  scope?: DeliverySummaryRecord['scope'],
): Promise<{ success: boolean; base64Mp3?: string; audioUrl?: string; isWav?: boolean; error?: string }> => {
  const cleanText = normalizeSummaryText(text);
  if (!cleanText) return { success: false, error: 'Texto vazio' };

  if (audioBase64Cache.has(cleanText)) {
    return { success: true, base64Mp3: audioBase64Cache.get(cleanText), isWav: true };
  }

  const cacheKey = generateAudioCacheKey(cleanText, DEFAULT_VOICE_CONFIG);
  const cached = await getCachedAudioRecord(cacheKey);
  if (cached?.audioUrl) {
    const playableUrl = await getPlayableAudioUrl(cached);
    if (playableUrl && cached.audioStoragePath) {
      return { success: true, audioUrl: playableUrl, isWav: true };
    }
    const isWav = cached.audioUrl.startsWith('data:audio/wav');
    const base64 = cached.audioUrl.replace(/^data:audio\/[^;]+;base64,/, '');
    audioBase64Cache.set(cleanText, base64);
    return { success: true, base64Mp3: base64, isWav };
  }

  return getOrCreateAudioWithDeduplication(cacheKey, async () => {
    // Outra tela ou toque concorrente pode ter concluído entre a consulta e a trava.
    const cachedAfterLock = await getCachedAudioRecord(cacheKey);
    if (cachedAfterLock?.audioUrl) {
      const playableUrl = await getPlayableAudioUrl(cachedAfterLock);
      if (playableUrl && cachedAfterLock.audioStoragePath) {
        return { success: true, audioUrl: playableUrl, isWav: true };
      }
      const isWav = cachedAfterLock.audioUrl.startsWith('data:audio/wav');
      const base64 = cachedAfterLock.audioUrl.replace(/^data:audio\/[^;]+;base64,/, '');
      audioBase64Cache.set(cleanText, base64);
      return { success: true, base64Mp3: base64, isWav };
    }

    if (!scope) return { success: false, error: 'AUDIO_NOT_READY' };
    const generation = await ensureSharedSummaryAudio(scope, cleanText);
    if (generation.status !== 'READY') return { success: false, error: `AUDIO_${generation.status}` };
    const generated = await getCachedAudioRecord(cacheKey);
    if (!generated) return { success: false, error: 'AUDIO_CACHE_UNAVAILABLE' };
    const playableUrl = await getPlayableAudioUrl(generated);
    if (playableUrl && generated.audioStoragePath) return { success: true, audioUrl: playableUrl, isWav: true };
    return { success: true, base64Mp3: generated.audioUrl.replace(/^data:audio\/[^;]+;base64,/, ''), isWav: generated.audioUrl.startsWith('data:audio/wav') };
  });
};

/**
 * Reproduz o resumo por áudio.
 * Tenta primeiro a voz de estúdio da IA do Gemini (expo-av). Se indisponível, usa fallback para voz nativa.
 */
export const playSummaryAudio = async (
  text: string,
  engine: 'gemini' | 'native',
  callbacks: AudioPlaybackCallbacks,
  scope?: DeliverySummaryRecord['scope'],
): Promise<{ success: boolean; engineUsed: 'gemini' | 'native'; fallbackReason?: string }> => {
  await stopGeminiAudio();

  const cleanText = text.trim();
  if (!cleanText) {
    callbacks.onDone?.();
    return { success: true, engineUsed: engine };
  }

  let fallbackReason: string | undefined;
  if (engine === 'gemini') {
    const res = await generateGeminiAudioMp3(cleanText, scope);
    if (res.success && (res.base64Mp3 || res.audioUrl)) {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        const uri = res.audioUrl || (res.isWav ? `data:audio/wav;base64,${res.base64Mp3}` : `data:audio/mp3;base64,${res.base64Mp3}`);
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true, volume: 1.0 },
          (status) => {
            if (!status.isLoaded) return;
            if (status.isPlaying) {
              const currentSec = Math.floor((status.positionMillis || 0) / 1000);
              const durationSec = Math.floor((status.durationMillis || 1) / 1000);
              callbacks.onProgress?.(currentSec, durationSec);
            }
            if (status.didJustFinish) {
              callbacks.onDone?.();
            }
          }
        );

        activeSound = sound;
        callbacks.onStart?.();
        return { success: true, engineUsed: 'gemini' };
      } catch (audioErr) {
        console.warn('[GeminiAudio] Erro ao carregar sound no expo-av, chaveando para voz nativa:', audioErr);
      }
    } else {
      fallbackReason = res.error;
      console.info('[GeminiAudio] Ativando síntese nativa de alta fidelidade:', res.error);
    }
  }

  // Fallback para Voz Nativa do dispositivo (expo-speech)
  await speakTextWithFallback(cleanText, {
    engine: 'native',
    rate: 0.95,
    pitch: 1.0,
    onStart: () => callbacks.onStart?.(),
    onDone: () => callbacks.onDone?.(),
    onError: (e) => callbacks.onError?.(e),
  });

  return { success: true, engineUsed: 'native', fallbackReason };
};
