import * as Speech from 'expo-speech';

let preferredVoiceId: string | null | undefined;

const scoreVoice = (voice: Speech.Voice): number => {
  const descriptor = `${voice.identifier} ${voice.name}`.toLowerCase();
  let score = 0;

  if (voice.language.toLowerCase().startsWith('pt-br')) score += 100;
  if (descriptor.includes('google')) score += 40;
  if (/female|feminina|mulher|x-afb/.test(descriptor)) score += 30;
  if (voice.quality === Speech.VoiceQuality.Enhanced) score += 10;

  return score;
};

export const getPreferredNavigationVoice = async (): Promise<string | undefined> => {
  if (preferredVoiceId !== undefined) return preferredVoiceId || undefined;

  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const candidates = voices.filter((voice) => voice.language.toLowerCase().startsWith('pt-br'));
    const selected = candidates.sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
    preferredVoiceId = selected?.identifier || null;
  } catch {
    preferredVoiceId = null;
  }

  return preferredVoiceId || undefined;
};

export const speakWithNavigationVoice = async (text: string, options: Speech.SpeechOptions) => {
  const voice = await getPreferredNavigationVoice();
  Speech.speak(text, voice ? { ...options, voice } : options);
};
