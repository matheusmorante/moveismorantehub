type InventoryAudioWindow = Window & { webkitAudioContext?: typeof AudioContext };
let inventoryAudioContext: AudioContext | null = null;
let nextInventoryBeepStart = 0;
const INVENTORY_BEEP_INTERVAL_SECONDS = 0.02;
const INVENTORY_BEEP_DURATION_SECONDS = 0.08;

export const prepareInventoryAudio = (): AudioContext | null => {
  try {
    const AudioContextConstructor =
      window.AudioContext || (window as InventoryAudioWindow).webkitAudioContext;
    if (!AudioContextConstructor) return null;

    inventoryAudioContext ||= new AudioContextConstructor();
    const context = inventoryAudioContext;
    if (context.state === 'suspended') void context.resume().catch(() => {});
    return context;
  } catch {
    return null;
  }
};

export const playInventoryCountBeep = (): void => {
  try {
    const context = prepareInventoryAudio();
    if (!context) return;

    const startAt = Math.max(context.currentTime, nextInventoryBeepStart);
    const endAt = startAt + INVENTORY_BEEP_DURATION_SECONDS;
    nextInventoryBeepStart = startAt + INVENTORY_BEEP_INTERVAL_SECONDS;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.setValueAtTime(880, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(0.14, startAt + 0.005);
    gain.gain.setValueAtTime(0.14, endAt - 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(startAt);
    oscillator.stop(endAt);
  } catch {
    // O áudio confirma a contagem; falhas de áudio não podem atrasá-la.
  }
};
