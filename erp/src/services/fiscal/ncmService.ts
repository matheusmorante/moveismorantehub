import { supabase } from '@/pages/utils/supabaseConfig';
import {
  inferNcmFromProductFacts,
  type NcmInferenceFacts,
  type NcmInferenceResult,
} from './ncmInferenceService';

export interface NcmSearchResult {
  code: string;
  official_description: string;
  internal_description?: string | null;
  alias_match: string | null;
  rank: number;
}

interface NcmAlias {
  ncm_code: string;
  term: string;
  weight: number | null;
}

const GENERIC_EXAMPLE_WORDS = new Set([
  'a', 'aco', 'as', 'com', 'da', 'das', 'de', 'dos', 'do', 'e', 'em', 'estofada', 'estofado',
  'inox', 'madeira', 'madeiras', 'mdf', 'mdp', 'metal', 'metalica', 'metalico', 'metalicos',
  'moveis', 'movel', 'na', 'nas', 'no', 'nos', 'o', 'os', 'outras', 'outros', 'para', 'plastico',
  'plasticos',
]);

function getExampleCategory(term: string): string {
  const words = term
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const firstSpecificWord = words.find((word) => !GENERIC_EXAMPLE_WORDS.has(word));
  if (!firstSpecificWord) return words[0] || term.toLocaleLowerCase('pt-BR');
  return firstSpecificWord;
}

function summarizeInternalDescription(
  aliases: NcmAlias[],
  priorityTerm?: string | null
): string | null {
  const ordered = [...aliases].sort(
    (left, right) =>
      (right.weight ?? 0) - (left.weight ?? 0) ||
      right.term.length - left.term.length ||
      left.term.localeCompare(right.term, 'pt-BR')
  );
  if (priorityTerm) {
    const matchingIndex = ordered.findIndex(({ term }) => term === priorityTerm);
    if (matchingIndex > 0) ordered.unshift(...ordered.splice(matchingIndex, 1));
  }

  const seenTerms = new Set<string>();
  const seenCategories = new Set<string>();
  const examples: string[] = [];
  for (const { term } of ordered) {
    const normalizedTerm = term.trim().toLocaleLowerCase('pt-BR');
    const category = getExampleCategory(term);
    if (!normalizedTerm || seenTerms.has(normalizedTerm) || seenCategories.has(category)) continue;
    seenTerms.add(normalizedTerm);
    seenCategories.add(category);
    examples.push(term.trim());
    if (examples.length === 3) break;
  }

  if (examples.length === 0) return null;
  const categoryCount = new Set(ordered.map(({ term }) => getExampleCategory(term))).size;
  return `${examples.join('; ')}${seenCategories.size < categoryCount ? '; entre outros' : ''}`;
}

export type { NcmInferenceFacts, NcmInferenceResult };
export { inferNcmFromProductFacts };

export interface NcmShortlistParams {
  title?: string;
  category?: string;
  description?: string;
  material?: string;
}

class NcmService {
  private async getInternalAliases(codes: string[]): Promise<Map<string, NcmAlias[]>> {
    if (codes.length === 0) return new Map();
    const { data, error } = await supabase
      .from('ncm_aliases')
      .select('ncm_code, term, weight')
      .in('ncm_code', codes)
      .eq('active', true);

    if (error) {
      console.error('Erro ao carregar exemplos internos de NCM:', error);
      return new Map();
    }

    const aliasesByCode = new Map<string, NcmAlias[]>();
    for (const alias of (data || []) as NcmAlias[]) {
      if (!alias?.ncm_code || !alias.term) continue;
      const aliases = aliasesByCode.get(alias.ncm_code) || [];
      aliases.push(alias);
      aliasesByCode.set(alias.ncm_code, aliases);
    }
    return aliasesByCode;
  }

  /**
   * Inferência inteligente e determinística de NCM baseada no título/descrição/categoria/material,
   * validada contra o catálogo de NCMs vigentes e ativos na loja.
   */
  async inferProductNcm(params: NcmInferenceFacts): Promise<NcmInferenceResult | null> {
    return inferNcmFromProductFacts(params);
  }

  /**
   * Pesquisa NCMs no banco por código (exato ou parcial) ou texto
   * Busca tanto na descrição oficial quanto nos aliases comerciais
   */
  async searchNcms(searchTerm: string, maxResults: number = 20): Promise<NcmSearchResult[]> {
    if (!searchTerm || searchTerm.trim().length < 2) return [];

    try {
      const cleanSearchTerm = searchTerm.trim();

      const { data, error } = await supabase.rpc('search_ncms', {
        search_term: cleanSearchTerm,
        // Amplia a busca para que códigos indisponíveis não ocupem o limite antes do filtro.
        max_results: Math.max(maxResults * 10, 100),
      });

      if (error) {
        console.error('Erro ao pesquisar NCMs via RPC:', error);
        throw error;
      }

      const candidates = (data || []) as NcmSearchResult[];
      const codes = [...new Set(candidates.map(({ code }) => code))];
      if (codes.length === 0) return [];

      const { data: usableNcms, error: catalogError } = await supabase
        .from('ncms')
        .select('code')
        .in('code', codes)
        .eq('active', true)
        .eq('is_active', true);

      if (catalogError) {
        console.error('Erro ao filtrar NCMs vigentes e ativos na loja:', catalogError);
        throw catalogError;
      }

      const usableCodes = new Set((usableNcms || []).map(({ code }) => code));
      const topCandidates = candidates
        .filter(({ code }) => usableCodes.has(code))
        .sort((left, right) => right.rank - left.rank)
        .slice(0, maxResults);
      const aliasesByCode = await this.getInternalAliases(
        [...new Set(topCandidates.map(({ code }) => code))]
      );
      return topCandidates.map((candidate) => ({
        ...candidate,
        internal_description: summarizeInternalDescription(
          aliasesByCode.get(candidate.code) || [],
          candidate.alias_match
        ),
      }));
    } catch (error) {
      console.error('Erro no NcmService.searchNcms.', error);
      throw error;
    }
  }

  async getCatalogEntry(code: string): Promise<{
    code: string;
    official_description: string;
    active: boolean;
    is_active: boolean;
    start_date: string | null;
    end_date: string | null;
    internal_description?: string | null;
  } | null> {
    const normalizedCode = code.replace(/\D/g, '');
    if (normalizedCode.length !== 8) return null;
    const [{ data, error }, aliasesByCode] = await Promise.all([
      supabase
        .from('ncms')
        .select('code, official_description, active, is_active, start_date, end_date')
        .eq('code', normalizedCode)
        .maybeSingle(),
      this.getInternalAliases([normalizedCode]),
    ]);
    if (error) throw error;
    if (!data) return null;
    return {
      ...data,
      internal_description: summarizeInternalDescription(aliasesByCode.get(normalizedCode) || []),
    };
  }

  /**
   * Gera uma shortlist de candidatos plausíveis de NCM para um dado produto.
   * Combina palavras-chave do título, categoria e material.
   */
  async generateShortlist(params: NcmShortlistParams): Promise<NcmSearchResult[]> {
    const { title = '', category = '', description = '', material = '' } = params;

    // 1. Extrair termos relevantes
    const terms = new Set<string>();

    const cleanTitle = title.toLowerCase().replace(/[^a-záéíóúâêôãõç0-9 ]/g, ' ');
    if (cleanTitle) {
      // Tenta o título inteiro
      terms.add(cleanTitle);

      // Tenta primeira e segunda palavras como composição (ex: "guarda roupa", "base box")
      const words = cleanTitle.split(/\s+/).filter((w) => w.length > 2);
      if (words.length >= 2) {
        terms.add(`${words[0]} ${words[1]}`);
      }
      if (words.length >= 3) {
        terms.add(`${words[1]} ${words[2]}`);
      }
      // Adiciona palavras chave soltas
      for (const word of words) {
        terms.add(word);
      }
    }

    if (category) {
      const cleanCategory = category.toLowerCase().split('/').pop()?.trim();
      if (cleanCategory) terms.add(cleanCategory);
    }

    if (material) {
      const cleanMat = material.toLowerCase().trim();
      if (cleanMat) terms.add(cleanMat);
    }

    // Filtra "termos ruins" muito genéricos se houver outros melhores, mas no momento tenta buscar
    const searchPromises = Array.from(terms)
      .filter((t) => t.length >= 3)
      .slice(0, 5) // Limita para não fuzilar o banco
      .map((term) => this.searchNcms(term, 10));

    const results = await Promise.all(searchPromises);

    // Achatar e remover duplicatas, mantendo o maior rank
    const candidatesMap = new Map<string, NcmSearchResult>();

    for (const resList of results) {
      for (const res of resList) {
        const existing = candidatesMap.get(res.code);
        if (!existing || existing.rank < res.rank) {
          candidatesMap.set(res.code, res);
        }
      }
    }

    // Retorna os top 15 candidatos
    return Array.from(candidatesMap.values())
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 15);
  }
}

export const ncmService = new NcmService();
