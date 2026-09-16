import type { SupplierProductSummary } from './inboundSupplierProductContext';
import type { InboundInvoiceItem } from '../types/inboundNfeTypes';
import type { InboundProductCandidate } from '../../aiService/aiInboundProductSuggestions';
import { extractProductFeatures, computeFeatureMatchScore, normalize } from '../utils/inboundTextSimilarity';
import { cosineSimilarity, getOrComputeEmbedding } from './inboundEmbeddingService';

export interface ScoredCandidate {
  candidate: InboundProductCandidate;
  totalScore: number;
  isSupplierCodeMatch: boolean;
}

export interface HybridScoringResult {
  candidates: InboundProductCandidate[];
  isConclusive: boolean;
  topCandidate?: InboundProductCandidate;
}

export async function rankAndScoreCandidates(
  item: InboundInvoiceItem,
  products: SupplierProductSummary[],
  options?: { enableEmbeddings?: boolean }
): Promise<HybridScoringResult> {
  if (!products || products.length === 0) {
    return { candidates: [], isConclusive: false };
  }

  const nfDesc = item.productDescription || '';
  const nfCode = normalize(item.productCode || '');
  const nfFeatures = extractProductFeatures(nfDesc);

  let nfEmbedding: number[] | null = null;
  if (options?.enableEmbeddings) {
    nfEmbedding = await getOrComputeEmbedding(nfDesc);
  }

  const scoredEntries: ScoredCandidate[] = [];

  for (const product of products) {
    const candidatesToEvaluate = product.variations.length > 0
      ? product.variations.map(v => ({ variationId: v.id, name: v.name, attributes: v.attributes }))
      : [{ variationId: undefined, name: product.name, attributes: {} }];

    for (const v of candidatesToEvaluate) {
      const targetName = v.name || product.name;
      const targetNorm = normalize(targetName);
      const targetFeatures = extractProductFeatures(targetName);

      // 1. Código exato do fornecedor (prioridade máxima)
      const isSupplierCodeMatch = Boolean(nfCode && targetNorm.includes(nfCode));

      // 2. Pontuação de atributos e similaridade de nome
      const { score: featScore, matches, divergences } = computeFeatureMatchScore(nfFeatures, targetFeatures);

      // 3. Similaridade de Embedding (Gemini Embedding 2)
      let embeddingBonus = 0;
      if (nfEmbedding) {
        const prodEmbedding = await getOrComputeEmbedding(targetName);
        if (prodEmbedding) {
          const sim = cosineSimilarity(nfEmbedding, prodEmbedding);
          if (sim > 0.70) {
            embeddingBonus = Math.round((sim - 0.70) * 100); // Até 30 pontos extras
            matches.push(`Similaridade semântica de embedding: ${(sim * 100).toFixed(0)}%`);
          }
        }
      }

      // Cálculo da pontuação total e confiança
      let totalScore = featScore + embeddingBonus;
      if (isSupplierCodeMatch) totalScore += 1000;

      // Normalizar para confiança de 60 a 99
      let confidence = Math.min(99, Math.max(60, Math.round(55 + (totalScore / 1.5))));
      if (isSupplierCodeMatch) confidence = 99;

      const reason = isSupplierCodeMatch
        ? `Código do fornecedor (${item.productCode}) coincidente no cadastro.`
        : matches.slice(0, 3).join('; ') || 'Compatibilidade por termos do produto.';

      scoredEntries.push({
        candidate: {
          productId: product.id,
          variationId: v.variationId,
          displayName: targetName,
          confidence,
          reason,
          matches,
          divergences
        },
        totalScore,
        isSupplierCodeMatch
      });
    }
  }

  // Ordenar por score decrescente
  scoredEntries.sort((a, b) => b.totalScore - a.totalScore);

  // Filtrar duplicatas de mesmo productId + variationId
  const seen = new Set<string>();
  const topCandidates: InboundProductCandidate[] = [];

  for (const entry of scoredEntries) {
    const key = `${entry.candidate.productId}:${entry.candidate.variationId || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      topCandidates.push(entry.candidate);
    }
    if (topCandidates.length >= 3) break;
  }

  if (topCandidates.length === 0) {
    return { candidates: [], isConclusive: false };
  }

  const first = topCandidates[0];
  const second = topCandidates[1];

  // Determinar se é conclusivo (não precisa mandar para LLM):
  // 1. Código do fornecedor idêntico
  // 2. Confiança >= 88% e distância maior que 15% para o segundo colocado
  const isConclusive = Boolean(
    first.confidence >= 98 ||
    (first.confidence >= 88 && (!second || (first.confidence - second.confidence >= 15)))
  );

  return {
    candidates: topCandidates,
    isConclusive,
    topCandidate: first
  };
}
