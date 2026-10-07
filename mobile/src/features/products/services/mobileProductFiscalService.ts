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
  readonly active: boolean;
  readonly start_date: string | null;
  readonly end_date: string | null;
}

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
    max_results: 10,
  });
  if (error) throw error;
  return data ?? [];
};

export const fetchMobileNcmCatalogEntry = async (
  code: string
): Promise<MobileNcmCatalogEntry | null> => {
  const { data, error } = await supabase
    .from('ncms')
    .select('code, official_description, active, start_date, end_date')
    .eq('code', code)
    .maybeSingle();
  return error ? null : data;
};
