export const MAX_FISCAL_NUMBER = 999999999;
export const DEFAULT_NFE_NUMBER = 102;
export const DEFAULT_NFCE_NUMBER = 600;

export type FiscalNumberConflict = {
  previousNumber: number;
  nextNumber: number | null;
};

export function isFiscalNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) &&
    value >= 1 && value <= MAX_FISCAL_NUMBER;
}

export function fiscalNumberConflict(number: number): FiscalNumberConflict {
  if (!isFiscalNumber(number)) throw new Error('Número fiscal inválido.');
  return { previousNumber: number, nextNumber: number < MAX_FISCAL_NUMBER ? number + 1 : null };
}

export function parseFiscalNumberConflict(value: unknown): FiscalNumberConflict | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const conflict = value as FiscalNumberConflict;
  if (!isFiscalNumber(conflict.previousNumber)) return undefined;
  const expected = fiscalNumberConflict(conflict.previousNumber);
  return conflict.nextNumber === expected.nextNumber ? expected : undefined;
}

/** MOC 7.0 Anexo I, 2B08-10: same issuer/model/series/number, different access key. */
export function isDifferentKeyNumberConflict(cStat: string, reason: string, ownKey: string): boolean {
  if (cStat !== '539' || !/^\d{44}$/.test(ownKey)) return false;
  const otherKey = reason.match(/\[chNFe:\s*(\d{44})\]/)?.[1];
  return Boolean(otherKey && otherKey !== ownKey && otherKey.slice(0, 2) === ownKey.slice(0, 2) &&
    otherKey.slice(6, 34) === ownKey.slice(6, 34));
}
