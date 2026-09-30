/** Fields confirmed in the emission form; never commercial values or product writes. */
import { CSOSN_CODES } from './fiscalIcmsGroups';
export type FiscalItemSelection = {
  ncm: string;
  cfop: string;
  origem: string;
  cest: string;
  csosn: string;
};
export type FiscalItemSelections = Record<string, FiscalItemSelection>;
const csosns = new Set<string>(CSOSN_CODES);
const fields = ['ncm', 'cfop', 'origem', 'cest', 'csosn'] as const;

/** Reject malformed values verbatim: no trimming, padding, coercion or fallback. */
export function parseFiscalItemSelections(value: unknown): FiscalItemSelections {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Seleções fiscais dos itens inválidas.');
  const entries = Object.entries(value);
  if (entries.length > 990) throw new Error('Limite de 990 itens fiscais excedido.');
  return Object.fromEntries(entries.map(([key, raw]) => {
    if (!/^[1-9]\d{0,2}$/.test(key) || Number(key) > 990 || !raw ||
        typeof raw !== 'object' || Array.isArray(raw))
      throw new Error('Seleção fiscal referencia item inválido.');
    const item = raw as Record<string, unknown>;
    if (Object.keys(item).length !== fields.length ||
        fields.some((field) => typeof item[field] !== 'string') ||
        !/^\d{8}$/.test(item.ncm as string) ||
        !/^[567]\d{3}$/.test(item.cfop as string) ||
        !/^[0-8]$/.test(item.origem as string) ||
        !/^(?:\d{7})?$/.test(item.cest as string) ||
        !csosns.has(item.csosn as string))
      throw new Error(`NCM, CFOP, origem, CEST ou CSOSN inválido no item ${key}.`);
    return [key, Object.fromEntries(fields.map((field) => [field, item[field]])) as FiscalItemSelection];
  }));
}

export function fiscalSelectionsEqual(a: unknown, b: unknown): boolean {
  const canonical = (value: unknown) => Object.entries(parseFiscalItemSelections(value))
    .sort(([left], [right]) => Number(left) - Number(right));
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}
