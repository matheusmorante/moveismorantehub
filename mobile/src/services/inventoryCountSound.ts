import { Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

const INVENTORY_COUNT_SOUND = require('../../assets/inventory_count.mp3');
let activePlayer: AudioPlayer | null = null;

/** Reproduz o bipe somente depois que uma contagem foi aceita e persistida. */
export const playInventoryCountSound = async () => {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
      shouldRouteThroughEarpiece: false,
    }).catch(() => {});

    activePlayer?.release();
    activePlayer = createAudioPlayer(INVENTORY_COUNT_SOUND);
    activePlayer.volume = 1;
    activePlayer.addListener('playbackStatusUpdate', status => {
      if (status.isLoaded && status.didJustFinish) {
        activePlayer?.release();
        activePlayer = null;
      }
    });
    activePlayer.play();
  } catch (error) {
    // O som é feedback; nunca deve impedir a contagem já salva.
    if (Platform.OS !== 'web') console.warn('[Inventory] Não foi possível reproduzir o bipe:', error);
  }
};
