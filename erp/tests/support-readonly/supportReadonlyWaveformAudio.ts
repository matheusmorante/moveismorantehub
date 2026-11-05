import { Buffer } from 'node:buffer';

export const createWaveformWav = () => {
  const sampleRate = 8_000;
  const sampleCount = sampleRate * 10;
  const wav = Buffer.alloc(44 + sampleCount);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + sampleCount, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate, 28);
  wav.writeUInt16LE(1, 32);
  wav.writeUInt16LE(8, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(sampleCount, 40);
  for (let index = 0; index < sampleCount; index += 1) {
    const seconds = index / sampleRate;
    const amplitude = seconds < 3 ? 0 : seconds < 6 ? 0.2 : 0.8;
    const sample = amplitude === 0 ? 128 : Math.round(128 + 127 * amplitude * Math.sin(2 * Math.PI * 220 * seconds));
    wav[44 + index] = sample;
  }
  return wav;
};
