import { describe, expect, it } from 'vitest';
import { resolveNfeSequenceSettings, validateContributorNfeSeries } from '../nfeSequenceSettings';

describe('outbound invoice sequence settings', () => {
  it('keeps homologation series and counters separate from production', () => {
    const settings = {
      nfeSerie: '1',
      nfeNextNumber: 700,
      nfceNextNumber: 710,
      nfeHomologationSerie: '2',
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
      series: '2',
      minimumNumber: 100,
    });
    expect(resolveNfeSequenceSettings(settings, '65', 2)).toEqual({
      series: '2',
      minimumNumber: 200,
    });
  });

  it('uses isolated safe defaults when homologation settings are absent', () => {
    expect(resolveNfeSequenceSettings({}, '55', 2)).toEqual({ series: '1', minimumNumber: 700 });
    expect(resolveNfeSequenceSettings({ nfeSerie: '2', nfeNextNumber: 9000 }, '55', 2))
      .toEqual({ series: '1', minimumNumber: 700 });
  });

  it.each(['0', '1', '889', '001', ' 2 '])('accepts contributor CNPJ series %s', (series) => {
    expect(validateContributorNfeSeries(series)).toBe(String(Number(series)));
  });
  it.each(['890', '899', '900', '909', '919', '920', '969', '999', '1000', '-1', '1.5', '', 'abc'])('rejects reserved or malformed series %s', (series) => {
      expect(() => validateContributorNfeSeries(series)).toThrow('entre 0 e 889');
    });
  it.each([1, 2] as const)('does not silently replace explicitly configured series 900 in environment %s', (environment) => {
    expect(() => resolveNfeSequenceSettings({ nfeSerie: '900', nfeHomologationSerie: '900' }, '55', environment))
      .toThrow('emissão avulsa pelo Fisco');
  });
});
