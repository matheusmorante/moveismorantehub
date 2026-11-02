import { normalizeSearchTerm, removeAccents } from './productText';

export { normalizeSearchTerm } from './productText';

const latinRanges = [
  [0x00c0, 0x024f],
  [0x1e00, 0x1eff],
  [0xa720, 0xa7ff],
  [0xab30, 0xab6f],
] as const;

const buildAccentVariants = (): Map<string, string[]> => {
  const variants = new Map<string, Set<string>>();
  for (const [start, end] of latinRanges) {
    for (let codePoint = start; codePoint <= end; codePoint += 1) {
      const character = String.fromCodePoint(codePoint);
      const base = removeAccents(character).toLowerCase();
      if (!/^[a-z]$/.test(base) || base === character.toLowerCase()) continue;
      const values = variants.get(base) ?? new Set<string>();
      values.add(character);
      variants.set(base, values);
    }
  }
  return new Map(Array.from(variants, ([base, values]) => [base, Array.from(values)]));
};

const accentVariants = buildAccentVariants();
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export type AccentInsensitiveMatchMode = 'contains' | 'exact';

/** Builds a literal POSIX regex that matches text with or without Latin diacritics. */
export const buildAccentInsensitiveRegex = (
  value: string,
  options: { includeYAndIEquivalence?: boolean } = {}
): string => {
  const normalized = normalizeSearchTerm(value);
  if (!normalized) return '';

  return Array.from(normalized, (character) => {
    const base = character.toLowerCase();
    if (!/^[a-z]$/.test(base)) return escapeRegex(character);

    const bases = options.includeYAndIEquivalence && (base === 'i' || base === 'y')
      ? ['i', 'y']
      : [base];
    const variants = Array.from(new Set(bases.flatMap((item) => [item, ...(accentVariants.get(item) || [])])));
    return `[${variants.join('')}]`;
  }).join('');
};

const quotePostgrestValue = (value: string) =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/** Returns a quoted PostgREST `imatch` value for one text column. */
export const buildPostgrestAccentInsensitivePattern = (
  value: string,
  mode: AccentInsensitiveMatchMode = 'contains'
): string => {
  const regex = buildAccentInsensitiveRegex(value);
  if (!regex) return '';
  return quotePostgrestValue(mode === 'exact' ? `^${regex}$` : `.*${regex}.*`);
};

/** Builds PostgREST OR conditions for accent-insensitive text search across columns. */
export const buildPostgrestAccentInsensitiveOrFilter = (
  columns: readonly string[],
  value: string,
  mode: AccentInsensitiveMatchMode = 'contains'
): string => {
  const pattern = buildPostgrestAccentInsensitivePattern(value, mode);
  if (!pattern) return '';
  return columns.map((column) => `${column}.imatch.${pattern}`).join(',');
};

/** Matches an already loaded value using the same folding used by ERP and mobile. */
export const matchesSearchText = (
  value: string | number | null | undefined,
  query: string | number | null | undefined
): boolean => {
  const normalizedQuery = normalizeSearchTerm(String(query ?? ''));
  return !normalizedQuery || normalizeSearchTerm(String(value ?? '')).includes(normalizedQuery);
};
