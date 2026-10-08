/** Shared configuration stored inside settings.fiscalDefaults; no second CFOP master table. */
export interface FiscalCfopConfiguration {
  returnCfop?: string;
  inverseCfopMappings?: Record<string, string>;
}

export const ESTORNO_FALLBACK_CFOPS = ['5949', '6949', '7949'] as const;

export const DEFAULT_RETURN_CFOP = '1202';

export function normalizeCfop(value: unknown): string | null {
  const code = String(value || '').replace(/\D/g, '');
  return /^\d{4}$/.test(code) ? code : null;
}

export function originalItemCfop(productXml: string): string | null {
  return normalizeCfop(productXml.match(/<(?:\w+:)?CFOP>(\d{4})<\/(?:\w+:)?CFOP>/i)?.[1]);
}

/** No arithmetic transformation: only a configured original→inverse pair is offered. */
export function suggestEstornoCfop(
  originalCfop: string | null,
  config?: FiscalCfopConfiguration
): string | null {
  if (!originalCfop || !/^[56]\d{3}$/.test(originalCfop)) return null;
  const mapped = normalizeCfop(config?.inverseCfopMappings?.[originalCfop]);
  const requiredEntryPrefix = originalCfop[0] === '5' ? '1' : '2';
  return mapped?.startsWith(requiredEntryPrefix) ? mapped : null;
}

export function getEstornoCfopOptions(
  originalCfop: string | null,
  config?: FiscalCfopConfiguration
): Array<{ value: string; label: string }> {
  const inverse = suggestEstornoCfop(originalCfop, config);
  if (inverse) return [{ value: inverse, label: `${inverse.slice(0, 1)}.${inverse.slice(1)} · CFOP inverso configurado` }];

  return ESTORNO_FALLBACK_CFOPS.map((value) => ({
    value,
    label: `${value.slice(0, 1)}.${value.slice(1)} · outra saída não especificada`,
  }));
}

/** An absent setting gets the project default; an invalid saved setting fails closed. */
export function suggestReturnCfop(config?: FiscalCfopConfiguration): string | null {
  const saved = config?.returnCfop;
  if (saved === undefined || saved === null || saved === '') return DEFAULT_RETURN_CFOP;
  const code = normalizeCfop(saved);
  return code && /^[12]\d{3}$/.test(code) ? code : null;
}

/** Confirmed values are immutable for a fiscal attempt, even if settings change later. */
export function confirmedOperationCfop(confirmed: string | null, suggested: string | null): string {
  const code = normalizeCfop(confirmed);
  if (!code || !/^[12]\d{3}$/.test(code)) {
    throw new Error(
      suggested
        ? `Confirme o CFOP de entrada ${suggested} ou selecione outro válido antes de transmitir.`
        : 'CFOP inverso não mapeado: selecione e confirme o código por item antes de transmitir.'
    );
  }
  return code;
}
