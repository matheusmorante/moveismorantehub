import type { SupplierProductSummary } from './inboundSupplierProductContext';
import type { InboundProductCandidate } from '../../aiService/aiInboundProductSuggestions';

import {
  extractFeatures,
  levenshteinDistance,
  normalizeProductName,
  tokenSimilarity,
} from './inboundProductTextSimilarity';
import type { ExtractedFeatures } from './inboundProductTextSimilarity';

export {
  extractFeatures,
  levenshteinDistance,
  normalizeProductName,
  tokenSimilarity,
};
export type { ExtractedFeatures };

const GENERIC_TERMS = new Set([
  'guarda_roupa',
  'roupeiro',
  'balcao',
  'mesa',
  'cadeira',
  'cabeceira',
  'armario',
  'estante',
  'painel',
  'rack',
  'cama',
  'colchao',
  'sofa',
  'poltrona',
  'cozinha',
  'quarto',
  'sala',
  'mdf',
  'mdp',
  'madeira',
  'aco',
  'vidro',
  'espelho',
  'branco',
  'preto',
  'cinza',
  'off',
  'white',
  'doripel',
  'madesa',
  'kappesberg',
  'itatiaia',
  'g',
  'roupa', // 'g' can be abbreviation for guarda
]);

export class InboundDeterministicScorerContext {
  idf: Map<string, number> = new Map();
  totalDocs: number = 0;

  // Cache the normalized forms and features of the catalog
  catalogCache: Array<{
    productId: string;
    variationId?: string;
    displayName: string;
    norm: string;
    features: ExtractedFeatures;
  }> = [];

  constructor(products: SupplierProductSummary[]) {
    const df = new Map<string, number>();
    let docCount = 0;

    const indexFeatures = (features: ExtractedFeatures) => {
      const uniqueTerms = new Set([...features.tokens, ...features.ngrams]);
      uniqueTerms.forEach((t) => df.set(t, (df.get(t) || 0) + 1));
      docCount++;
    };

    products.forEach((p) => {
      const pNorm = normalizeProductName(p.name);
      const pFeatures = extractFeatures(pNorm);

      if (p.variations && p.variations.length > 0) {
        p.variations.forEach((v) => {
          const displayName = `${p.name} ${v.name}`;
          const vNorm = normalizeProductName(displayName);
          const vFeatures = extractFeatures(vNorm);

          this.catalogCache.push({
            productId: p.id,
            variationId: v.id,
            displayName,
            norm: vNorm,
            features: vFeatures,
          });
          indexFeatures(vFeatures);
        });
      } else {
        this.catalogCache.push({
          productId: p.id,
          variationId: undefined,
          displayName: p.name,
          norm: pNorm,
          features: pFeatures,
        });
        indexFeatures(pFeatures);
      }
    });

    this.totalDocs = docCount;
    const effectiveTotal = Math.max(20, this.totalDocs);
    df.forEach((count, term) => {
      if (GENERIC_TERMS.has(term)) {
        this.idf.set(term, 1.1); // Always common
      } else {
        this.idf.set(term, 1 + Math.log10(effectiveTotal / count));
      }
    });
  }

  getTokenWeight(token: string): number {
    if (GENERIC_TERMS.has(token)) return 1.1;
    return this.idf.get(token) ?? 1 + Math.log10(Math.max(20, this.totalDocs) / 1);
  }
}

export interface DeterministicScoringResult {
  candidates: InboundProductCandidate[];
  isConclusive: boolean;
  topCandidate?: InboundProductCandidate;
}

export function rankAndScoreDeterministic(
  nfDescription: string,
  nfCode: string | undefined,
  context: InboundDeterministicScorerContext
): DeterministicScoringResult {
  if (!nfDescription || context.catalogCache.length === 0) {
    return { candidates: [], isConclusive: false };
  }

  const nfNormCode = nfCode ? normalizeProductName(nfCode) : '';
  const nfNorm = normalizeProductName(nfDescription);
  const nfFeatures = extractFeatures(nfNorm);

  // Calculate max possible token score for normalization
  const maxTokenScore =
    nfFeatures.tokens.reduce((sum, t) => sum + context.getTokenWeight(t), 0) +
    nfFeatures.ngrams.reduce((sum, g) => sum + context.getTokenWeight(g) * 2.0, 0);

  const STRONG_IDF_THRESHOLD = 1.35; // Termos muito discriminantes (modelos)
  const nfStrongTokens = nfFeatures.tokens.filter(
    (t) => context.getTokenWeight(t) >= STRONG_IDF_THRESHOLD
  );

  const scoredEntries: Array<{
    candidate: InboundProductCandidate;
    score: number;
    isSupplierCodeMatch: boolean;
  }> = [];

  for (const cat of context.catalogCache) {
    let baseScore = 0;
    const matches: string[] = [];
    const divergences: string[] = [];

    let isSupplierCodeMatch = false;
    if (nfNormCode && cat.norm.includes(nfNormCode) && nfNormCode.length >= 3) {
      isSupplierCodeMatch = true;
      baseScore += 150; // Huge boost for supplier code
      matches.push(`Código do fornecedor (${nfCode}) presente no nome.`);
    }

    // 1. Text Similarity (Tokens & N-Grams)
    let textScore = 0;
    const matchedTokens = new Set<string>();

    for (const nfToken of nfFeatures.tokens) {
      let bestSim = 0;
      for (const catToken of cat.features.tokens) {
        const sim = tokenSimilarity(nfToken, catToken);
        if (sim > bestSim) bestSim = sim;
      }
      if (bestSim > 0) {
        textScore += context.getTokenWeight(nfToken) * bestSim;
        if (bestSim >= 0.8) matchedTokens.add(nfToken);
      }
    }

    for (const nfNgram of nfFeatures.ngrams) {
      if (cat.features.ngrams.includes(nfNgram)) {
        textScore += context.getTokenWeight(nfNgram) * 2.0; // Multiplier for sequence
        matches.push(`Termo exato: "${nfNgram}"`);
      }
    }

    const maxTextCeiling = Math.max(1, maxTokenScore * 1.0);
    const normalizedTextScore = Math.min(75, (textScore / maxTextCeiling) * 75); // Identity rules the score
    baseScore += normalizedTextScore;

    if (matchedTokens.size > 0) {
      matches.push(`Sobreposição de termos: ${Array.from(matchedTokens).slice(0, 4).join(', ')}`);
    }

    // 1.5 PENALTY FOR DIVERGENT IDENTITY (CHOQUE DE MODELOS)
    const candStrongTokens = cat.features.tokens.filter(
      (t) => context.getTokenWeight(t) >= STRONG_IDF_THRESHOLD
    );

    let nfMissedStrong = 0;
    for (const t of nfStrongTokens) {
      if (!cat.features.tokens.some((ct) => tokenSimilarity(t, ct) > 0.8)) nfMissedStrong++;
    }

    let candExtraStrong = 0;
    for (const t of candStrongTokens) {
      if (!nfFeatures.tokens.some((nft) => tokenSimilarity(t, nft) > 0.8)) candExtraStrong++;
    }

    if (nfMissedStrong > 0 && candExtraStrong > 0) {
      baseScore -= 60;
      divergences.push(
        `Choque de Identidade: Produto possui termos distintivos conflitantes com a NF.`
      );
    } else if (nfMissedStrong > 0) {
      baseScore -= 20;
      divergences.push(`Falta termo identificador da NF.`);
    }

    // 2. Attributes Score
    if (nfFeatures.doors !== undefined) {
      if (cat.features.doors !== undefined) {
        if (nfFeatures.doors === cat.features.doors) {
          baseScore += 8;
          matches.push(`${nfFeatures.doors} portas`);
        } else {
          baseScore -= 40;
          divergences.push(
            `Diferença nas portas: NF=${nfFeatures.doors} vs ERP=${cat.features.doors}`
          );
        }
      }
    }

    if (nfFeatures.drawers !== undefined) {
      if (cat.features.drawers !== undefined) {
        if (nfFeatures.drawers === cat.features.drawers) {
          baseScore += 8;
          matches.push(`${nfFeatures.drawers} gavetas`);
        } else {
          baseScore -= 40;
          divergences.push(
            `Diferença nas gavetas: NF=${nfFeatures.drawers} vs ERP=${cat.features.drawers}`
          );
        }
      }
    }

    if (nfFeatures.shelves !== undefined) {
      if (cat.features.shelves !== undefined) {
        if (nfFeatures.shelves === cat.features.shelves) {
          baseScore += 6;
          matches.push(`${nfFeatures.shelves} prateleiras`);
        } else {
          baseScore -= 35;
          divergences.push(
            `Diferença nas prateleiras: NF=${nfFeatures.shelves} vs ERP=${cat.features.shelves}`
          );
        }
      }
    }

    if (nfFeatures.colors.length > 0) {
      const commonColors = nfFeatures.colors.filter((c) => cat.features.colors.includes(c));
      if (commonColors.length > 0) {
        baseScore += 6;
        matches.push(`Cor compatível: ${commonColors.join(', ')}`);
      } else if (cat.features.colors.length > 0) {
        baseScore -= 5;
        divergences.push(
          `Diferença de cor: NF tem [${nfFeatures.colors.join(', ')}], ERP tem [${cat.features.colors.join(', ')}]`
        );
      }
    }

    // 4. Token coverage bonus
    const coverageRatio =
      nfFeatures.tokens.length > 0 ? matchedTokens.size / nfFeatures.tokens.length : 0;
    if (coverageRatio >= 0.8) {
      baseScore += 10;
    } else if (coverageRatio >= 0.6) {
      baseScore += 5;
    }

    // Clamp the confidence score to 0-99 max (100 is reserved for perfect deterministic match)
    let confidence = Math.max(0, Math.min(99, Math.round(baseScore)));

    if (isSupplierCodeMatch) {
      confidence = 99;
    }

    scoredEntries.push({
      candidate: {
        productId: cat.productId,
        variationId: cat.variationId,
        displayName: cat.displayName,
        confidence,
        reason: matches.join('; ') || 'Compatibilidade geral.',
        matches,
        divergences,
      },
      score: baseScore,
      isSupplierCodeMatch,
    });
  }

  scoredEntries.sort((a, b) => b.score - a.score);

  // Filter duplicates and only keep scores >= THRESHOLD (60)
  const THRESHOLD = 60;
  const seen = new Set<string>();
  const topCandidates: InboundProductCandidate[] = [];

  for (const entry of scoredEntries) {
    if (entry.candidate.confidence < THRESHOLD) continue;

    const key = `${entry.candidate.productId}:${entry.candidate.variationId || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      topCandidates.push(entry.candidate);
    }
    if (topCandidates.length >= 3) break;
  }

  const first = topCandidates[0];
  const second = topCandidates[1];

  const isConclusive = Boolean(
    first &&
      (first.confidence >= 95 ||
        (first.confidence >= 85 && (!second || first.confidence - second.confidence >= 15)))
  );

  return {
    candidates: topCandidates,
    isConclusive,
    topCandidate: first,
  };
}
