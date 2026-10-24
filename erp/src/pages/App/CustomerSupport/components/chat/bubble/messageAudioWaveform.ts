const MIN_HEIGHT = 4;
const MAX_HEIGHT = 26;

export function createAudioWaveform(
  channels: readonly Float32Array[],
  barCount: number,
): number[] {
  if (!Number.isInteger(barCount) || barCount <= 0) return [];

  const frameCount = channels.reduce((maximum, channel) => Math.max(maximum, channel.length), 0);
  if (frameCount === 0) return Array.from({ length: barCount }, () => MIN_HEIGHT);

  const energies = Array.from({ length: barCount }, (_, index) => {
    const start = Math.floor(index * frameCount / barCount);
    const end = Math.max(start + 1, Math.floor((index + 1) * frameCount / barCount));
    let sumSquares = 0;
    let sampleCount = 0;

    for (const channel of channels) {
      const channelEnd = Math.min(end, channel.length);
      for (let frame = Math.min(start, channel.length); frame < channelEnd; frame += 1) {
        const sample = channel[frame] ?? 0;
        sumSquares += sample * sample;
        sampleCount += 1;
      }
    }

    return sampleCount > 0 ? Math.sqrt(sumSquares / sampleCount) : 0;
  });

  const maximumEnergy = Math.max(...energies);
  if (maximumEnergy === 0) return energies.map(() => MIN_HEIGHT);

  return energies.map((energy) => {
    const normalized = Math.sqrt(energy / maximumEnergy);
    return Math.round(MIN_HEIGHT + normalized * (MAX_HEIGHT - MIN_HEIGHT));
  });
}
