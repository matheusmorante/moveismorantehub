import * as Speech from 'expo-speech';

let preferredVoiceId: string | null | undefined;
let preferredGeminiVoiceId: string | null | undefined;
let isExplicitlyStopped = false;

const MALE_VOICE_REGEX = /male|homem|menino|-pta-|-ptf-|-ptm-|ricardo|felipe|daniel|marcio|paulo|mario/i;
const FEMALE_VOICE_REGEX = /female|feminina|mulher|menina|-ptd-|-jab-|-ptc-|-yef-|-afb-|luciana|francisca|helena|vitoria|marcia|spraktal|aoede|gemini/i;

const scoreVoice = (voice: Speech.Voice, isGemini: boolean): number => {
  const descriptor = `${voice.identifier} ${voice.name}`.toLowerCase();
  const lang = voice.language.toLowerCase();
  let score = 0;

  // 1. Prioridade para Português do Brasil
  if (lang.includes('pt-br') || lang.includes('pt_br')) score += 200;
  else if (lang.startsWith('pt')) score += 50;
  else return -5000;

  // 2. Trava Rígida de Gênero: Penalizar voz masculina e Bonificar voz feminina
  if (MALE_VOICE_REGEX.test(descriptor)) {
    score -= 2000;
  }

  if (FEMALE_VOICE_REGEX.test(descriptor)) {
    score += 1000;
  }

  if (isGemini) {
    if (descriptor.includes('google') || descriptor.includes('gemini') || descriptor.includes('wavenet') || descriptor.includes('neural')) {
      score += 500;
    }
    if (voice.quality === Speech.VoiceQuality.Enhanced) {
      score += 300;
    }
  }

  return score;
};

export const getPreferredNavigationVoice = async (engine: 'gemini' | 'native' = 'native'): Promise<string | undefined> => {
  if (engine === 'gemini' && preferredGeminiVoiceId !== undefined) {
    return preferredGeminiVoiceId || undefined;
  }
  if (engine === 'native' && preferredVoiceId !== undefined) {
    return preferredVoiceId || undefined;
  }

  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const candidates = voices.filter((voice) => voice.language.toLowerCase().startsWith('pt'));

    if (candidates.length > 0) {
      const sorted = candidates.sort((a, b) => scoreVoice(b, engine === 'gemini') - scoreVoice(a, engine === 'gemini'));
      const best = sorted[0];
      if (best && scoreVoice(best, engine === 'gemini') > 0) {
        if (engine === 'gemini') preferredGeminiVoiceId = best.identifier;
        else preferredVoiceId = best.identifier;
      } else {
        if (engine === 'gemini') preferredGeminiVoiceId = null;
        else preferredVoiceId = null;
      }
    }
  } catch {
    if (engine === 'gemini') preferredGeminiVoiceId = null;
    else preferredVoiceId = null;
  }

  return engine === 'gemini' ? (preferredGeminiVoiceId || undefined) : (preferredVoiceId || undefined);
};

export const stopSpeech = async () => {
  isExplicitlyStopped = true;
  try {
    await Speech.stop();
  } catch {}
};

export const pauseSpeech = async () => {
  try {
    await Speech.pause();
  } catch {}
};

export const resumeSpeech = async () => {
  isExplicitlyStopped = false;
  try {
    await Speech.resume();
  } catch {}
};

export const speakTextWithFallback = async (
  text: string,
  options: {
    engine?: 'gemini' | 'native';
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onDone?: () => void;
    onError?: (err: any) => void;
  } = {}
) => {
  try {
    isExplicitlyStopped = false;
    await Speech.stop();

    const cleanText = text.trim();
    if (!cleanText) {
      options.onDone?.();
      return;
    }

    const engineMode = options.engine || 'native';
    const voice = await getPreferredNavigationVoice(engineMode);

    // Voz Gemini IA usa afinação e cadência conversacionais diferenciadas (pitch: 1.08, rate: 0.90)
    const pitch = engineMode === 'gemini' ? (options.pitch ?? 1.08) : (options.pitch ?? 1.0);
    const rate = engineMode === 'gemini' ? (options.rate ?? 0.90) : (options.rate ?? 1.0);

    Speech.speak(cleanText, {
      language: 'pt-BR',
      voice: voice || undefined,
      rate,
      pitch,
      onStart: () => {
        if (!isExplicitlyStopped) {
          options.onStart?.();
        }
      },
      onDone: () => {
        if (!isExplicitlyStopped) {
          options.onDone?.();
        }
      },
      onError: (err) => {
        if (isExplicitlyStopped) return;
        console.warn('[Speech] Erro na reprodução de voz:', err);
        options.onError?.(err);
      },
    });
  } catch (err) {
    if (!isExplicitlyStopped) {
      console.error('[Speech] Erro na execução da síntese de voz:', err);
      options.onError?.(err);
    }
  }
};

export const speakWithNavigationVoice = async (text: string, options: Speech.SpeechOptions) => {
  await speakTextWithFallback(text, {
    engine: 'native',
    rate: options.rate,
    pitch: options.pitch,
    onDone: options.onDone as any,
    onError: options.onError as any,
  });
};
