import { AiGateway } from '@/services/aiGateway/AiGateway';

/**
 * Cache em memória para embeddings já calculados nesta sessão
 */
const embeddingMemoryCache = new Map<string, number[]>();

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA.length || !vecB.length || vecA.length !== vecB.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function getOrComputeEmbedding(text: string): Promise<number[] | null> {
  const clean = (text || '').trim().toLocaleLowerCase('pt-BR');
  if (!clean || clean.length < 3) return null;

  if (embeddingMemoryCache.has(clean)) {
    return embeddingMemoryCache.get(clean)!;
  }

  try {
    const res = await AiGateway.requestEmbedding(clean, 'inbound_invoices');
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      embeddingMemoryCache.set(clean, res.data);
      return res.data;
    }
  } catch (err) {
    console.warn('[inboundEmbeddingService] Falha ao gerar embedding, usando fallback textual:', err);
  }

  return null;
}
