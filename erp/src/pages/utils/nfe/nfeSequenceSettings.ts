type FiscalSequenceSettings = {
  nfeSerie?: string;
  nfeNextNumber?: number;
  nfceNextNumber?: number;
  nfeHomologationSerie?: string;
  nfeHomologationNextNumber?: number;
  nfceHomologationNextNumber?: number;
};

export function resolveNfeSequenceSettings(
  settings: FiscalSequenceSettings,
  model: '55' | '65',
  environment: 1 | 2
) {
  if (environment === 2) {
    return {
      series: settings.nfeHomologationSerie || '900',
      minimumNumber: Number(
        model === '65'
          ? (settings.nfceHomologationNextNumber ?? 700)
          : (settings.nfeHomologationNextNumber ?? 700)
      ),
    };
  }

  return {
    series: settings.nfeSerie || '1',
    minimumNumber: Number(
      model === '65' ? (settings.nfceNextNumber ?? 700) : (settings.nfeNextNumber ?? 700)
    ),
  };
}
