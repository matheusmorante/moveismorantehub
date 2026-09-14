import { describe, it, expect, vi } from 'vitest';
import { rankAndScoreCandidates } from '../inboundHybridProductScorer';
import { extractProductFeatures, computeFeatureMatchScore } from '../inboundTextSimilarity';
import type { SupplierProductSummary } from '../inboundSupplierProductContext';
import type { InboundInvoiceItem } from '../inboundNfeTypes';

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
  isTestEnvironment: false,
}));

describe('inboundTextSimilarity', () => {
  it('extrai portas, gavetas, cores e largura corretamente de texto de NF', () => {
    const text = 'ROUPEIRO 6P 2G ATHENAS BRANCO MOVAL 120CM';
    const features = extractProductFeatures(text);

    expect(features.doors).toBe(6);
    expect(features.drawers).toBe(2);
    expect(features.widthCm).toBe(120);
    expect(features.detectedColors).toContain('branco');
  });

  it('calcula pontuação e divergências entre NF e produto', () => {
    const nf = extractProductFeatures('ROUPEIRO 6P 2G ATHENAS BRANCO');
    const prod = extractProductFeatures('Guarda Roupa Athenas 6 Portas 2 Gavetas Branco Moval');

    const result = computeFeatureMatchScore(nf, prod);
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.divergences).toHaveLength(0);
    expect(result.matches.some(m => m.includes('Portas coincidente'))).toBe(true);
  });
});

describe('inboundHybridProductScorer', () => {
  const sampleProducts: SupplierProductSummary[] = [
    {
      id: 'prod-athenas-branco',
      name: 'Guarda Roupa Athenas 6 Portas 2 Gavetas Moval',
      variations: [
        { id: 'var-branco', name: 'Guarda Roupa Athenas 6 Portas 2 Gavetas Branco', attributes: { Cor: 'Branco' } },
        { id: 'var-freijo', name: 'Guarda Roupa Athenas 6 Portas 2 Gavetas Freijó', attributes: { Cor: 'Freijó' } },
      ],
    },
    {
      id: 'prod-madrid',
      name: 'Roupeiro Madrid 4 Portas 3 Gavetas Nature',
      variations: [],
    },
  ];

  it('prioriza e conclui com 99% quando houver código exato de fornecedor', async () => {
    const item: InboundInvoiceItem = {
      itemNumber: 1,
      productCode: 'ATHENAS-6P-BR',
      productDescription: 'ROUPEIRO ATHENAS-6P-BR 6P 2G ATHENAS BRANCO',
      quantity: 1,
      unitPrice: 500,
      totalPrice: 500,
      ncm: '94035000',
      cfop: '5102',
      unit: 'UN',
      matchedProductId: null,
      matchedVariationId: null,
      status: 'pending'
    };

    const productsWithCode: SupplierProductSummary[] = [
      {
        id: 'prod-athenas-branco',
        name: 'Guarda Roupa Athenas 6 Portas 2 Gavetas Moval ATHENAS-6P-BR',
        variations: [
          { id: 'var-branco', name: 'Guarda Roupa Athenas 6 Portas 2 Gavetas Branco ATHENAS-6P-BR', attributes: { Cor: 'Branco' } },
        ],
      }
    ];

    const result = await rankAndScoreCandidates(item, productsWithCode);
    expect(result.isConclusive).toBe(true);
    expect(result.topCandidate?.confidence).toBe(99);
    expect(result.topCandidate?.productId).toBe('prod-athenas-branco');
  });

  it('ranqueia corretamente por similaridade de atributos e palavras-chave', async () => {
    const item: InboundInvoiceItem = {
      itemNumber: 1,
      productCode: 'MOV-1234',
      productDescription: 'ROUPEIRO 6P 2G ATHENAS BRANCO MOVAL',
      quantity: 1,
      unitPrice: 500,
      totalPrice: 500,
      ncm: '94035000',
      cfop: '5102',
      unit: 'UN',
      matchedProductId: null,
      matchedVariationId: null,
      status: 'pending'
    };

    const result = await rankAndScoreCandidates(item, sampleProducts);
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.topCandidate?.productId).toBe('prod-athenas-branco');
    expect(result.topCandidate?.variationId).toBe('var-branco');
    expect(result.topCandidate?.confidence).toBeGreaterThanOrEqual(80);
  });
});
