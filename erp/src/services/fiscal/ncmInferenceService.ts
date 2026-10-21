import { ncmService, type NcmSearchResult } from './ncmService';
import {
  normalizeNcmSearchText,
  resolveSemanticNcmCode,
  type SemanticNcmFacts,
} from '../../../../shared-utils/ncmClassification';

export type NcmInferenceFacts = SemanticNcmFacts;

export interface NcmInferenceResult {
  code: string;
  description: string;
  source: 'semantic_rule' | 'catalog_search' | 'fallback';
}

export { resolveSemanticNcmCode, normalizeNcmSearchText };

function isCurrentCatalogEntry(
  entry: Awaited<ReturnType<typeof ncmService.getCatalogEntry>>,
  today: string
): entry is NonNullable<typeof entry> {
  return Boolean(
    entry?.active &&
      entry.is_active &&
      (!entry.start_date || entry.start_date <= today) &&
      (!entry.end_date || entry.end_date >= today)
  );
}

/**
 * Motor central de inferência de NCM para um produto (criação ou emissão de nota fiscal).
 *
 * 1. Aplica regra semântica para móveis e itens com base no título/descrição/material.
 * 2. Valida se o NCM semântico está ativo e vigente na base local de NCMs.
 * 3. Se não houver regra semântica correspondente ou se o código não estiver ativo,
 *    executa busca dinâmica no catálogo de NCMs (abrangendo TODAS as categorias).
 * 4. Retorna a sugestão validada ou null.
 */
export async function inferNcmFromProductFacts(
  facts: NcmInferenceFacts
): Promise<NcmInferenceResult | null> {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  // 1. Tenta regra semântica de alta precisão
  const semanticCode = resolveSemanticNcmCode(facts);
  if (semanticCode) {
    try {
      const entry = await ncmService.getCatalogEntry(semanticCode);
      if (entry && isCurrentCatalogEntry(entry, today)) {
        return {
          code: entry.code,
          description: entry.official_description,
          source: 'semantic_rule',
        };
      }
    } catch {
      // Se falhar ao consultar o catálogo, tenta a busca geral abaixo
    }
  }

  // 2. Busca dinâmica no catálogo de NCMs para todas as outras categorias
  const searchCandidates: string[] = [];
  const primaryTitle = facts.title || facts.name || '';
  let titlePhrase = '';
  if (primaryTitle) {
    const clean = normalizeNcmSearchText(primaryTitle);
    searchCandidates.push(clean);
    const words = clean.split(/\s+/).filter((w) => w.length > 2);
    if (words.length >= 2) {
      titlePhrase = `${words[0]} ${words[1]}`;
      searchCandidates.push(titlePhrase);
    }
  }
  if (facts.category) {
    const cleanCat = normalizeNcmSearchText(facts.category);
    if (cleanCat) searchCandidates.push(cleanCat);
  }
  const cleanMaterial = normalizeNcmSearchText(facts.material || '');
  if (cleanMaterial && titlePhrase) searchCandidates.push(`${titlePhrase} ${cleanMaterial}`);
  if (facts.description) {
    const cleanDesc = normalizeNcmSearchText(facts.description);
    const descWords = cleanDesc.split(/\s+/).filter((w) => w.length > 2);
    if (descWords.length >= 2) searchCandidates.push(`${descWords[0]} ${descWords[1]}`);
  }

  const terms = Array.from(new Set(searchCandidates.filter((t) => t.length >= 2))).slice(0, 5);
  const candidatesByCode = new Map<string, { candidate: NcmSearchResult; score: number }>();

  const searches = await Promise.allSettled(terms.map((term) => ncmService.searchNcms(term, 10)));
  searches.forEach((search) => {
    if (search.status !== 'fulfilled') return;
    for (const candidate of search.value || []) {
      const existing = candidatesByCode.get(candidate.code);
      candidatesByCode.set(candidate.code, {
        candidate,
        score: (existing?.score || 0) + candidate.rank,
      });
    }
  });

  const rankedCandidates = [...candidatesByCode.values()]
    .sort((left, right) => right.score - left.score)
    .slice(0, 15);
  for (const { candidate } of rankedCandidates) {
    try {
      const entry = await ncmService.getCatalogEntry(candidate.code);
      if (entry && isCurrentCatalogEntry(entry, today)) {
        return {
          code: entry.code,
          description: entry.official_description,
          source: 'catalog_search',
        };
      }
    } catch {
      // Não retorna candidato cuja atividade ou vigência não foi confirmada.
    }
  }

  // 3. Fallback seguro se identificou como móvel geral mas catálogo estava indisponível
  if (semanticCode) {
    return {
      code: semanticCode,
      description: 'Móveis e complementos',
      source: 'fallback',
    };
  }

  return null;
}
