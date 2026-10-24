import { describe, expect, it } from 'vitest';
import { createAudioWaveform } from '../components/chat/bubble/messageAudioWaveform';

describe('forma de onda do áudio recebido', () => {
  it('representa as amplitudes reais por trecho e combina canais', () => {
    const left = new Float32Array([0, 0, 0.25, 0.25, 1, 1, 0.5, 0.5]);
    const right = new Float32Array([0, 0, 0.25, 0.25, 1, 1, 0.5, 0.5]);

    const waveform = createAudioWaveform([left, right], 4);

    expect(waveform).toHaveLength(4);
    expect(waveform[0]).toBe(4);
    expect(waveform[2]).toBe(26);
    expect(waveform[1]).toBeLessThan(waveform[3]);
  });

  it('retorna uma forma estável para áudio silencioso ou dados vazios', () => {
    expect(createAudioWaveform([new Float32Array(8)], 4)).toEqual([4, 4, 4, 4]);
    expect(createAudioWaveform([], 4)).toEqual([4, 4, 4, 4]);
    expect(createAudioWaveform([], 0)).toEqual([]);
  });
});
