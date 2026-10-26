import { Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

const INVENTORY_COUNT_SOUND = require('../../assets/inventory_count.mp3');
let activePlayer: AudioPlayer | null = null;
const BEEP_GAP_MS = 100;

/** Reproduz o bipe somente depois que uma contagem foi aceita e persistida. */
export const playInventoryCountSound = async () => {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
      shouldRouteThroughEarpiece: false,
    }).catch(() => {});

    activePlayer?.release();
    const player = createAudioPlayer(INVENTORY_COUNT_SOUND, { updateInterval: 50 });
    activePlayer = player;
    player.volume = 1;
    await new Promise<void>((resolve) => {
      let subscription: { remove: () => void } | null = null;
      let finished = false;
      let fallback: ReturnType<typeof setTimeout>;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(fallback);
        subscription?.remove();
        if (activePlayer === player) activePlayer = null;
        player.release();
        resolve();
      };
      fallback = setTimeout(finish, 10000);
      subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (status.isLoaded && status.didJustFinish) finish();
      });
      try {
        player.play();
      } catch (error) {
        finish();
        throw error;
      }
    });
    await new Promise((resolve) => setTimeout(resolve, BEEP_GAP_MS));
  } catch (error) {
    // O som é feedback; nunca deve impedir a contagem já salva.
    if (Platform.OS !== 'web')
      console.warn('[Inventory] Não foi possível reproduzir o bipe:', error);
  }
};
