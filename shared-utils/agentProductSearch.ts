import { buildPostgrestAccentInsensitiveOrFilter } from './searchText';
import { normalizeSearchTerm } from './productText';

const PRODUCT_SEARCH_COLUMNS = [
  'name',
  'title',
  'description',
  'code',
  'sku',
  'brand',
  'line',
  'category',
] as const;

export const normalizeAgentProductSearchTerm = (value: string): string =>
  normalizeSearchTerm(value)
    .replace(/\bapra\b/g, 'para')
    .replace(/\bparapias?\b/g, 'para pia')
    .replace(/\b(?:para|pra)\s*pias?\b/g, 'para pia')
    .replace(/\bpias\b/g, 'pia')
    .replace(/\bbalcoes\b/g, 'balcao')
    // Common typo in quick customer messages: "bacoes" for "balcões".
    .replace(/\bbacoes\b/g, 'balcao')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeWords = (value: string): string[] =>
  normalizeAgentProductSearchTerm(value).split(/\s+/).filter(Boolean);

export const hasSinkBaseCabinetIntent = (value: string): boolean => {
  const words = new Set(normalizeWords(value));
  return words.has('balcao') && words.has('pia');
};

/**
 * Builds a server-side, accent-insensitive AND-of-words filter for agent catalog
 * searches. When the customer names a sink base cabinet, both purpose words must
 * occur in the product name/title; a matching model name alone is insufficient.
 */
export const buildAgentProductSearchFilter = (
  value: string,
  variationParentIds: readonly string[] = [],
  columns: { search: readonly string[]; name: readonly string[] } = { search: PRODUCT_SEARCH_COLUMNS, name: ['name', 'title'] }
): string => {
  const search = normalizeAgentProductSearchTerm(value);
  if (!search) return '';

  const validParentIds = variationParentIds.filter((id) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  );

  if (hasSinkBaseCabinetIntent(search)) {
    const nameTypeFilter = [
      buildPostgrestAccentInsensitiveOrFilter(columns.name, 'balcao'),
      buildPostgrestAccentInsensitiveOrFilter(columns.name, 'pia'),
    ];
    const qualifiers = normalizeWords(search).filter((word) => !['balcao', 'para', 'pia'].includes(word));
    const qualifierFilter = qualifiers.length
      ? buildPostgrestAccentInsensitiveOrFilter(columns.search, qualifiers.join(' '))
      : '';
    const qualifierMatch = qualifierFilter && validParentIds.length
      ? `or(${qualifierFilter},${validParentIds.map((id) => `id.eq.${id}`).join(',')})`
      : qualifierFilter;

    // A broad sink-base request only needs the two product-name terms. Searching
    // those terms again across every catalog field duplicates large Unicode
    // regexes in the PostgREST URL and can exceed the gateway's request limit.
    return `and(${[
      ...nameTypeFilter.map((filter) => `or(${filter})`),
      ...(qualifierMatch ? [qualifierMatch] : []),
    ].join(',')})`;
  }

  const textFilter = buildPostgrestAccentInsensitiveOrFilter(columns.search, search);
  const matchingProducts = validParentIds.length
    ? `or(${textFilter},${validParentIds.map((id) => `id.eq.${id}`).join(',')})`
    : textFilter;
  return matchingProducts;
};

export type AgentProductMatchKind = 'corresponding' | 'alternative' | 'incompatible';

/** Classifies a candidate using explicit terms, without an invented relevance score. */
export const classifyAgentProductMatch = (
  product: {
    name?: string | null;
    title?: string | null;
    description?: string | null;
    code?: string | null;
    sku?: string | null;
    brand?: string | null;
    line?: string | null;
    category?: string | null;
  },
  query: string
): AgentProductMatchKind => {
  const name = normalizeSearchTerm(`${product.name || ''} ${product.title || ''}`);
  if (
    hasSinkBaseCabinetIntent(query) &&
    (!name.includes('balcao') || !name.includes('pia'))
  ) {
    return 'incompatible';
  }

  const searchable = normalizeSearchTerm(
    [
      product.name,
      product.title,
      product.description,
      product.code,
      product.sku,
      product.brand,
      product.line,
      product.category,
    ].filter(Boolean).join(' ')
  );
  const allTermsMatch = normalizeWords(query).every((word) => searchable.includes(word));
  if (allTermsMatch) return 'corresponding';

  // A same-type product may be offered only as an explicitly labelled alternative.
  return hasSinkBaseCabinetIntent(query) ? 'alternative' : 'incompatible';
};
