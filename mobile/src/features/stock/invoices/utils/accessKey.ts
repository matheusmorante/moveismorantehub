import { ACCESS_KEY_PATTERN, normalizeFiscalIdentifier } from '../../../../../../shared-utils/fiscalIdentifiers';
export const extractNfeAccessKey = (value: string): string | null => {
  const key = normalizeFiscalIdentifier(value);
  if (ACCESS_KEY_PATTERN.test(key)) return key;
  return value.toUpperCase().match(/(?:^|[^A-Z0-9])([0-9]{6}[A-Z0-9]{12}[0-9]{26})(?:[^A-Z0-9]|$)/)?.[1] ?? null;
};
