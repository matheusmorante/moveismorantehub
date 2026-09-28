import { describe, expect, it } from 'vitest';
import { resolveNfeSequenceSettings } from '../nfeSequenceSettings';

describe('outbound invoice sequence settings', () => {
  it('keeps homologation series and counters separate from production', () => {
    const settings = {
      nfeSerie: '1',
      nfeNextNumber: 700,
      nfceNextNumber: 710,
      nfeHomologationSerie: '900',
      nfeHomologationNextNumber: 100,
      nfceHomologationNextNumber: 200,
    };

    expect(resolveNfeSequenceSettings(settings, '55', 1)).toEqual({
      series: '1',
      minimumNumber: 700,
    });
    expect(resolveNfeSequenceSettings(settings, '65', 1)).toEqual({
      series: '1',
      minimumNumber: 710,
    });
    expect(resolveNfeSequenceSettings(settings, '55', 2)).toEqual({
      series: '900',
      minimumNumber: 100,
    });
    expect(resolveNfeSequenceSettings(settings, '65', 2)).toEqual({
      series: '900',
      minimumNumber: 200,
    });
  });

  it('uses isolated safe defaults when homologation settings are absent', () => {
    expect(resolveNfeSequenceSettings({}, '55', 2)).toEqual({ series: '900', minimumNumber: 700 });
  });
});
