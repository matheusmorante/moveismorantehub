import { normalizeFiscalIdentifier } from '../../shared-utils/fiscalIdentifiers.js';

export interface FiscalXmlAuditMismatch {
  field: string;
  expected: string | number;
  actual: string | number;
}

export class FiscalXmlAuditError extends Error {
  readonly mismatches: FiscalXmlAuditMismatch[];

  constructor(mismatches: FiscalXmlAuditMismatch[]) {
    const detail = mismatches
      .map(({ field, expected, actual }) => `${field}: esperado ${expected}; encontrado ${actual}`)
      .join('\n');
    super(`O XML assinado diverge do snapshot fiscal confirmado:\n${detail}`);
    this.name = 'FiscalXmlAuditError';
    this.mismatches = mismatches;
  }
}

export function normalizeTaxId(value: string) {
  return normalizeFiscalIdentifier(value);
}

export function addTextMismatch(
  mismatches: FiscalXmlAuditMismatch[],
  field: string,
  expected: string | undefined,
  actual: string,
  normalize?: (value: string) => string
) {
  if (expected === undefined) return;
  const wanted = normalize ? normalize(expected) : expected;
  const found = normalize ? normalize(actual) : actual;
  if (wanted !== found)
    mismatches.push({ field, expected: wanted, actual: found || '(ausente)' });
}

export function addOptionalTextMismatch(
  mismatches: FiscalXmlAuditMismatch[],
  field: string,
  expected: string | undefined,
  actual: string
) {
  if (expected === undefined || expected === '') {
    if (actual !== '') mismatches.push({ field, expected: '(ausente)', actual });
    return;
  }
  addTextMismatch(mismatches, field, expected, actual);
}

export function addNumberMismatch(
  mismatches: FiscalXmlAuditMismatch[],
  field: string,
  expected: number,
  actualText: string,
  tolerance = 0.005
) {
  const actual = actualText ? Number(actualText.replace(',', '.')) : NaN;
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance)
    mismatches.push({
      field,
      expected,
      actual: Number.isFinite(actual) ? actual : actualText || '(ausente)',
    });
}
