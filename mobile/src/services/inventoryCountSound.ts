import { Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const INVENTORY_COUNT_SOUND = require('../../assets/inventory_count.mp3');
let audioModePromise: Promise<void> | null = null;
let soundStartQueue: Promise<void> = Promise.resolve();
let nextSoundStartAt = 0;

const MIN_SOUND_START_INTERVAL_MS = 20;
const SOUND_DURATION_MS = 80;

const prepareAudioMode = () => {
  if (!audioModePromise) {
    audioModePromise = setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
      shouldRouteThroughEarpiece: false,
    }).catch((error) => {
      audioModePromise = null;
      throw error;
    });
  }
  return audioModePromise;
};

/** Prepara o áudio ao abrir o scanner para o primeiro bipe começar sem espera. */
export const prepareInventoryCountSound = (): Promise<void> =>
  prepareAudioMode().catch(() => undefined);

/** Reproduz o bipe somente depois que uma contagem foi aceita e persistida. */
export const playInventoryCountSound = (): void => {
  // A fila limita somente o início dos sons; a rotina de contagem não a aguarda.
  soundStartQueue = soundStartQueue
    .then(async () => {
      await prepareAudioMode();
      const waitMs = Math.max(0, nextSoundStartAt - Date.now());
      if (waitMs > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
      }

      const player = createAudioPlayer(INVENTORY_COUNT_SOUND, { updateInterval: 50 });
      player.volume = 1;
      try {
        player.play();
        nextSoundStartAt = Date.now() + MIN_SOUND_START_INTERVAL_MS;
        setTimeout(() => {
          try {
            player.pause();
          } catch {
            // A liberação abaixo ainda deve acontecer se o player já tiver parado.
          } finally {
            player.release();
          }
        }, SOUND_DURATION_MS);
      } catch (error) {
        player.release();
        throw error;
      }
    })
    .catch((error) => {
      // O som é feedback; nunca deve impedir a contagem já salva.
      if (Platform.OS !== 'web')
        console.warn('[Inventory] Não foi possível reproduzir o bipe:', error);
    });
};
