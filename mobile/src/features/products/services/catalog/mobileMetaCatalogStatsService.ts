import type { MetaCatalogStats } from '../../../../../../shared-utils/metaCatalogStats';
import { withTimeout } from '../../../../../../shared-utils/core/withTimeout';
import { supabase } from '../../../../services/supabaseClient';

const META_CATALOG_STATS_TIMEOUT_MS = 15_000;

/** Lê o resumo de publicação do catálogo sem executar sincronizações externas. */
export async function fetchMobileMetaCatalogStats(): Promise<MetaCatalogStats> {
  const result = await withTimeout(
    Promise.resolve(supabase.rpc('get_meta_catalog_stats')),
    META_CATALOG_STATS_TIMEOUT_MS,
    null,
    'mobile:meta-catalog-stats'
  );

  if (!result) throw new Error('A consulta do resumo do Catálogo Meta excedeu o tempo limite.');
  if (result.error) throw result.error;

  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row || typeof row !== 'object') {
    throw new Error('A resposta das estatísticas do catálogo está vazia.');
  }

  const stats = row as Record<string, unknown>;
  return {
    publishedSimple: Number(stats.published_simple ?? 0),
    publishedVariations: Number(stats.published_variations ?? 0),
    notPublished: Number(stats.not_published ?? 0),
  };
}
