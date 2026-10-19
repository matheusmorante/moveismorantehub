/** Shared configuration stored inside settings.fiscalDefaults; no second CFOP master table. */
export interface FiscalCfopConfiguration {
  returnCfop?: string;
  inverseCfopMappings?: Record<string, string>;
}

/**
 * Mapeamento canônico e validado de CFOP de saída para CFOP de entrada correspondente.
 * Respeita operação interna (5xxx -> 1xxx) vs interestadual (6xxx -> 2xxx),
 * mercadoria de terceiros vs produção própria vs ST.
 */
export const OUTBOUND_TO_INBOUND_CFOP_MAP: Readonly<Record<string, string>> = {
  // --- Operações internas (5xxx -> 1xxx) ---
  '5102': '1202', // Venda mercadoria adquirida/recebida terceiros -> Devolução/estorno venda mercadoria terceiros
  '5104': '1202', // Venda fora do estabelecimento -> Devolução/estorno venda terceiros
  '5101': '1201', // Venda produção do estabelecimento -> Devolução/estorno venda produção
  '5405': '1411', // Venda mercadoria terceiros com ST -> Devolução venda com ST
  '5403': '1411', // Venda mercadoria terceiros com ST substituto -> Devolução venda com ST
  '5152': '1202', // Transferência de mercadoria adquirida de terceiros
  '5910': '1910', // Remessa bonificação/doação/brinde -> Entrada bonificação/doação/brinde
  '5912': '1913', // Remessa demonstração -> Retorno demonstração
  '5914': '1913', // Remessa exposição/feira -> Retorno exposição/feira
  '5915': '1916', // Remessa conserto/reparo -> Retorno conserto/reparo
  '5949': '1949', // Outra saída não especificada -> Outra entrada não especificada

  // --- Operações interestaduais (6xxx -> 2xxx) ---
  '6102': '2202', // Venda mercadoria terceiros fora do Estado -> Devolução venda terceiros fora do Estado
  '6108': '2202', // Venda mercadoria terceiros a não contribuinte fora do Estado -> Devolução venda terceiros fora do Estado
  '6101': '2201', // Venda produção do estabelecimento fora do Estado -> Devolução venda produção fora do Estado
  '6107': '2201', // Venda produção a não contribuinte fora do Estado -> Devolução venda produção fora do Estado
  '6404': '2411', // Venda com ST retido anteriormente fora do Estado -> Devolução venda com ST fora do Estado
  '6403': '2411', // Venda com ST substituto fora do Estado -> Devolução venda com ST fora do Estado
  '6152': '2202', // Transferência interestadual
  '6910': '2910', // Remessa bonificação interestadual -> Entrada bonificação interestadual
  '6912': '2913', // Remessa demonstração interestadual -> Retorno demonstração interestadual
  '6914': '2913', // Remessa exposição interestadual -> Retorno exposição interestadual
  '6915': '2916', // Remessa conserto interestadual -> Retorno conserto interestadual
  '6949': '2949', // Outra saída interestadual -> Outra entrada interestadual
};

/**
 * Mapeamento canônico de saída para CFOP de estorno fiscal de entrada (finNFe=3, NF-e de Ajuste).
 * Conforme MOC NF-e Regra de Validação 328 e RICMS/PR art. 298:
 * Notas de ajuste/estorno (finNFe=3) não podem utilizar CFOPs de devolução (1.2xx / 2.2xx).
 * Devem utilizar 1949 (operações internas) ou 2949 (operações interestaduais).
 */
export const OUTBOUND_TO_ESTORNO_INBOUND_CFOP_MAP: Readonly<Record<string, string>> = {
  // Operações internas (5xxx -> 1949): Estorno de venda/saída conforme art. 298 RICMS/PR
  '5101': '1949',
  '5102': '1949',
  '5104': '1949',
  '5403': '1949',
  '5405': '1949',
  '5152': '1949',
  '5910': '1949',
  '5912': '1949',
  '5914': '1949',
  '5915': '1949',
  '5949': '1949',

  // Operações interestaduais (6xxx -> 2949): Estorno de saída interestadual
  '6101': '2949',
  '6102': '2949',
  '6107': '2949',
  '6108': '2949',
  '6403': '2949',
  '6404': '2949',
  '6152': '2949',
  '6910': '2949',
  '6912': '2949',
  '6914': '2949',
  '6915': '2949',
  '6949': '2949',
};

export const ESTORNO_FALLBACK_CFOPS = ['5949', '6949', '7949'] as const;

export const DEFAULT_RETURN_CFOP = '1202';

export function normalizeCfop(value: unknown): string | null {
  const code = String(value || '').replace(/\D/g, '');
  return /^\d{4}$/.test(code) ? code : null;
}

export function originalItemCfop(productXml: string): string | null {
  return normalizeCfop(productXml.match(/<(?:\w+:)?CFOP>(\d{4})<\/(?:\w+:)?CFOP>/i)?.[1]);
}

/**
 * Determina o CFOP de entrada correspondente ao estorno da operação original (finNFe=3).
 * Prioriza mapeamento específico em configurações; caso ausente, aplica o mapa de estorno (1949/2949),
 * evitando a Rejeição 328 da SEFAZ (que proíbe CFOPs de devolução em notas de ajuste).
 * Retorna null quando não houver correspondência legal válida (não utiliza CFOP genérico).
 */
export function suggestEstornoCfop(
  originalCfop: string | null,
  config?: FiscalCfopConfiguration
): string | null {
  if (!originalCfop || !/^[56]\d{3}$/.test(originalCfop)) return null;
  const requiredEntryPrefix = originalCfop[0] === '5' ? '1' : '2';

  const configured = config?.inverseCfopMappings?.[originalCfop];
  if (configured !== undefined) {
    const normalized = normalizeCfop(configured);
    return normalized?.startsWith(requiredEntryPrefix) ? normalized : null;
  }

  const canonical = OUTBOUND_TO_ESTORNO_INBOUND_CFOP_MAP[originalCfop];
  if (canonical?.startsWith(requiredEntryPrefix)) return canonical;

  return null;
}

export function getEstornoCfopOptions(
  originalCfop: string | null,
  config?: FiscalCfopConfiguration
): Array<{ value: string; label: string }> {
  const inverse = suggestEstornoCfop(originalCfop, config);
  if (inverse) {
    return [
      {
        value: inverse,
        label: `${inverse.slice(0, 1)}.${inverse.slice(1)} · Estorno fiscal (art. 298)`,
      },
    ];
  }

  // Não utilizar CFOP genérico como alternativa quando não há correspondência fiscal válida
  return [];
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
