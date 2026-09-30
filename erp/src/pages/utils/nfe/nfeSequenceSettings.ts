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
  const series = validateContributorNfeSeries(
    environment === 2 ? (settings.nfeHomologationSerie || '1') : (settings.nfeSerie || '1')
  );
  if (environment === 2) {
    return {
      series,
      minimumNumber: Number(
        model === '65'
          ? (settings.nfceHomologationNextNumber ?? 700)
          : (settings.nfeHomologationNextNumber ?? 700)
      ),
    };
  }

  return {
    series,
    minimumNumber: Number(
      model === '65' ? (settings.nfceNextNumber ?? 700) : (settings.nfeNextNumber ?? 700)
    ),
  };
}

/** MOC 7 Anexo I, B07/B26-10: aplicativo do contribuinte CNPJ, procEmi=0. */
export function validateContributorNfeSeries(value: unknown): string {
  const series = typeof value === 'string' ? value.trim() : '';
  if (!/^\d{1,3}$/.test(series) || Number(series) > 889)
    throw new Error('A série deste emissor deve estar entre 0 e 889. A série 900 é reservada à emissão avulsa pelo Fisco. Corrija a série nas configurações fiscais.');
  return String(Number(series));
}
