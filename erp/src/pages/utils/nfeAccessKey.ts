import { ACCESS_KEY_PATTERN, hasValidAccessKeyDigit, isValidCnpj, normalizeFiscalIdentifier } from '../../../../shared-utils/fiscalIdentifiers.js';

export const normalizeNfeAccessKey = normalizeFiscalIdentifier;

export type NfeAccessKeyValidation = {
  valid: boolean;
  normalized: string;
  reason?: 'missing' | 'length' | 'non_numeric' | 'model' | 'check_digit';
};

export function validateNfeAccessKey(value: unknown): NfeAccessKeyValidation {
  const raw = String(value || '').trim();
  const normalized = normalizeNfeAccessKey(raw);
  if (!raw) return { valid: false, normalized, reason: 'missing' };
  if (normalized.length !== 44) return { valid: false, normalized, reason: 'length' };
  if (!ACCESS_KEY_PATTERN.test(normalized)) return { valid: false, normalized, reason: 'non_numeric' };
  if (normalized.slice(20, 22) !== '55') return { valid: false, normalized, reason: 'model' };
  return isValidCnpj(normalized.slice(6, 20)) && hasValidAccessKeyDigit(normalized)
    ? { valid: true, normalized }
    : { valid: false, normalized, reason: 'check_digit' };
}
