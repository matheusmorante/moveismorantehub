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
    const allVariants = new Set(bases.flatMap((item) => [item, ...(accentVariants.get(item) || [])]));
    // `imatch` and the UI highlighter are case-insensitive; retain uppercase only
    // when it has no equivalent lowercase entry in this character class.
    const variants = Array.from(allVariants).filter((character) => {
      const lower = character.toLowerCase();
      return lower === character || !allVariants.has(lower);
    });
    return `[${variants.join('')}]`;
  }).join('');
};

const quotePostgrestValue = (value: string) =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/** Returns a quoted PostgREST `imatch` value for one text column. */
export const buildPostgrestAccentInsensitivePattern = (
  value: string,
  mode: AccentInsensitiveMatchMode = 'contains',
  options: { includeYAndIEquivalence?: boolean } = {}
): string => {
  const regex = buildAccentInsensitiveRegex(value, options);
  if (!regex) return '';
  return quotePostgrestValue(mode === 'exact' ? `^${regex}$` : `.*${regex}.*`);
};

/** Builds a literal regex requiring every word in any order. */
export const buildAccentInsensitiveWordsRegex = (value: string): string => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return `.*${buildAccentInsensitiveRegex(words[0])}.*`;
  return `^${words.map((word) => `(?=.*${buildAccentInsensitiveRegex(word)})`).join('')}.*`;
};

/** Quotes the regex for use within a PostgREST OR expression. */
export const buildPostgrestAccentInsensitiveWordsPattern = (value: string): string => {
  const regex = buildAccentInsensitiveWordsRegex(value);
  return regex ? quotePostgrestValue(regex) : '';
};

/** Builds PostgREST OR conditions for accent-insensitive text search across columns. */
export const buildPostgrestAccentInsensitiveOrFilter = (
  columns: readonly string[],
  value: string,
  mode: AccentInsensitiveMatchMode = 'contains',
  options: { includeYAndIEquivalence?: boolean } = {}
): string => {
  const words = mode === 'exact' ? [value] : value.trim().split(/\s+/).filter(Boolean);
  const filters = words.map((word) => {
    const pattern = buildPostgrestAccentInsensitivePattern(word, mode, options);
    return pattern ? columns.map((column) => `${column}.imatch.${pattern}`).join(',') : '';
  }).filter(Boolean);
  if (filters.length <= 1) return filters[0] || '';
  return `and(${filters.map((filter) => `or(${filter})`).join(',')})`;
};

/** Compact regex for database fields that are already unaccented. */
export const buildNormalizedWordsRegex = (value: string): string => {
  const words = normalizeSearchTerm(value).split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  if (words.length === 1) return `.*${escapeRegex(words[0])}.*`;
  return `^${words.map((word) => `(?=.*${escapeRegex(word)})`).join('')}.*`;
};

/** Matches an already loaded value using the same folding used by ERP and mobile. */
export const matchesSearchText = (
  value: string | number | null | undefined,
  query: string | number | null | undefined
): boolean => {
  const words = normalizeSearchTerm(String(query ?? '')).split(/\s+/).filter(Boolean);
  const normalizedValue = normalizeSearchTerm(String(value ?? ''));
  return words.every((word) => normalizedValue.includes(word));
};
