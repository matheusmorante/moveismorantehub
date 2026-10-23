import { supabase } from '../../../services/supabaseClient';

export interface MobileProductFiscalDefaults {
  readonly ncm?: string;
  readonly cest?: string;
  readonly cst?: string;
  readonly cfop?: string;
  readonly origem?: string;
  readonly icmsPercent?: number | string;
  readonly pisCst?: string;
  readonly cofinsCst?: string;
}

export interface MobileNcmCatalogEntry {
  readonly code: string;
  readonly official_description: string;
  readonly internal_description?: string | null;
  readonly active: boolean;
  readonly is_active?: boolean;
  readonly start_date: string | null;
  readonly end_date: string | null;
}

const GENERIC_EXAMPLE_WORDS = new Set([
  'a', 'aco', 'as', 'com', 'da', 'das', 'de', 'dos', 'do', 'e', 'em', 'estofada', 'estofado',
  'inox', 'madeira', 'madeiras', 'mdf', 'mdp', 'metal', 'metalica', 'metalico', 'metalicos',
  'moveis', 'movel', 'na', 'nas', 'no', 'nos', 'o', 'os', 'outras', 'outros', 'para', 'plastico',
  'plasticos',
]);

const getExampleCategory = (term: string) => {
  const words = term
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const firstSpecificWord = words.find((word) => !GENERIC_EXAMPLE_WORDS.has(word));
  return firstSpecificWord || words[0] || term.toLocaleLowerCase('pt-BR');
};

const summarizeInternalDescriptions = (aliases: any[], priorityTerm?: string | null) => {
  const ordered = [...aliases].sort(
    (left, right) => Number(right.weight || 0) - Number(left.weight || 0) ||
      String(right.term || '').length - String(left.term || '').length ||
      String(left.term || '').localeCompare(String(right.term || ''), 'pt-BR')
  );
  if (priorityTerm) {
    const matchingIndex = ordered.findIndex(({ term }) => term === priorityTerm);
    if (matchingIndex > 0) ordered.unshift(...ordered.splice(matchingIndex, 1));
  }

  const examples: string[] = [];
  const seenTerms = new Set<string>();
  const seenCategories = new Set<string>();
  for (const alias of ordered) {
    const term = String(alias.term || '').trim();
    const normalizedTerm = term.toLocaleLowerCase('pt-BR');
    const category = getExampleCategory(term);
    if (!normalizedTerm || seenTerms.has(normalizedTerm) || seenCategories.has(category)) continue;
    seenTerms.add(normalizedTerm);
    seenCategories.add(category);
    examples.push(term);
    if (examples.length === 3) break;
  }

  if (!examples.length) return null;
  const categoryCount = new Set(ordered.map(({ term }) => getExampleCategory(String(term || ''))).filter(Boolean)).size;
  return `${examples.join('; ')}${seenCategories.size < categoryCount ? '; entre outros' : ''}`;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const getNumericValue = (value: unknown): number | string | undefined =>
  typeof value === 'number' || typeof value === 'string' ? value : undefined;

export const fetchMobileProductFiscalDefaults = async (): Promise<
  MobileProductFiscalDefaults | undefined
> => {
  const { data, error } = await supabase
    .from('settings')
    .select('data')
    .eq('id', 'app')
    .maybeSingle();

  if (error) throw error;
  const settings = data?.data;
  if (!isRecord(settings) || !isRecord(settings.fiscalDefaults)) return undefined;

  const defaults = settings.fiscalDefaults;
  return {
    ncm: getString(defaults.ncm),
    cest: getString(defaults.cest),
    cst: getString(defaults.cst),
    cfop: getString(defaults.cfop),
    origem: getString(defaults.origem),
    icmsPercent: getNumericValue(defaults.icmsPercent),
    pisCst: getString(defaults.pisCst),
    cofinsCst: getString(defaults.cofinsCst),
  };
};

export const searchMobileNcms = async (query: string) => {
  const { data, error } = await supabase.rpc('search_ncms', {
    search_term: query,
    max_results: 100,
  });
  if (error) throw error;
  const candidates = data ?? [];
  const codes = [...new Set(candidates.map((entry: any) => entry.code).filter(Boolean))];
  if (!codes.length) return candidates;
  const { data: usableNcms, error: catalogError } = await supabase
    .from('ncms')
    .select('code')
    .in('code', codes)
    .eq('active', true)
    .eq('is_active', true);
  if (catalogError) throw catalogError;
  const usableCodes = new Set((usableNcms || []).map((entry: any) => String(entry.code)));
  const topCandidates = candidates
    .filter((entry: any) => usableCodes.has(String(entry.code)))
    .sort((left: any, right: any) => Number(right.rank || 0) - Number(left.rank || 0))
    .slice(0, 10);
  const usableCodesForAliases = [...new Set(topCandidates.map((entry: any) => String(entry.code)))];
  if (!usableCodesForAliases.length) return [];
  const { data: aliases, error: aliasesError } = await supabase
    .from('ncm_aliases')
    .select('ncm_code, term, weight')
    .in('ncm_code', usableCodesForAliases)
    .eq('active', true);
  if (aliasesError) return topCandidates;
  const aliasesByCode = new Map<string, any[]>();
  for (const alias of aliases || []) {
    const items = aliasesByCode.get(String(alias.ncm_code)) || [];
    items.push(alias);
    aliasesByCode.set(String(alias.ncm_code), items);
  }
  return topCandidates.map((entry: any) => ({
    ...entry,
    internal_description:
      entry.internal_description ||
      summarizeInternalDescriptions(aliasesByCode.get(String(entry.code)) || [], entry.alias_match),
  }));
};

export const fetchMobileNcmCatalogEntry = async (
  code: string
): Promise<MobileNcmCatalogEntry | null> => {
  const { data, error } = await supabase
    .from('ncms')
    .select('code, official_description, active, is_active, start_date, end_date')
    .eq('code', code)
    .maybeSingle();
  if (error || !data) return null;
  const { data: aliases } = await supabase
    .from('ncm_aliases')
    .select('term, weight')
    .eq('ncm_code', code)
    .eq('active', true);
  return {
    ...data,
    internal_description: summarizeInternalDescriptions(aliases || []),
  };
};
