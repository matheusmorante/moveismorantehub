export const normalizeNfeAccessKey = (value: unknown) => String(value || '').replace(/\D/g, '');

export type NfeAccessKeyValidation = { valid: boolean; normalized: string; reason?: 'missing' | 'length' | 'non_numeric' | 'model' | 'check_digit' };

export function validateNfeAccessKey(value: unknown): NfeAccessKeyValidation {
  const raw = String(value || '').trim();
  const normalized = normalizeNfeAccessKey(raw);
  if (!raw) return { valid: false, normalized, reason: 'missing' };
  if (normalized.length !== 44) return { valid: false, normalized, reason: 'length' };
  if (/[^\d\s.\-\/]/.test(raw)) return { valid: false, normalized, reason: 'non_numeric' };
  if (normalized.slice(20, 22) !== '55') return { valid: false, normalized, reason: 'model' };
  const weights = [4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((total, weight, index) => total + Number(normalized[index]) * weight, 0);
  const expected = 11 - (sum % 11);
  const digit = expected >= 10 ? 0 : expected;
  return Number(normalized[43]) === digit ? { valid: true, normalized } : { valid: false, normalized, reason: 'check_digit' };
}
