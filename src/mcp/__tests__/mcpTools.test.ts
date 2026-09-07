import { describe, it, expect, vi } from 'vitest';
import {
  ALL_MCP_TOOLS,
  buildPostPromptContextTool,
  getCampaignPromptsTool,
  getCampaignTool,
  getGeneratedPostReferencesTool,
  getPostGenerationContextTool,
  getProductImagesTool,
  getProductTool,
  getStoreAssetsTool,
  searchProductsTool,
} from '../tools/index.js';
import { mcpProductService } from '../services/mcpProductService.js';
import { mcpCampaignService } from '../services/mcpCampaignService.js';
import { mcpPostContextService } from '../services/mcpPostContextService.js';

describe('MCP Tools Suite (Read-Only & Zod Schema Validation)', () => {
  it('1. Confirma que existem exatamente 9 tools e TODAS são 100% Read-Only', () => {
    expect(ALL_MCP_TOOLS).toHaveLength(9);

    ALL_MCP_TOOLS.forEach(tool => {
      expect(tool.annotations.readOnlyHint).toBe(true);
      expect(tool.annotations.destructiveHint).toBe(false);
      expect(tool.annotations.idempotentHint).toBe(true);
    });
  });

  it('2. search_products valida query e rejeita buscas vazias', async () => {
    await expect(searchProductsTool.handler({ query: '' })).rejects.toThrow();

    vi.spyOn(mcpProductService, 'searchProducts').mockResolvedValueOnce([
      {
        id: '123',
        name: 'Guarda-Roupa Monza',
        slug: 'guarda-roupa-monza',
        price: 999.9,
        active: true,
      },
    ]);

    const res = await searchProductsTool.handler({ query: 'Monza', limit: 5 });
    expect(res.products).toHaveLength(1);
    expect(res.totalFound).toBe(1);
  });

  it('3. get_product requer productId válido e retorna produto', async () => {
    await expect(getProductTool.handler({ productId: '' })).rejects.toThrow();

    vi.spyOn(mcpProductService, 'getProductById').mockResolvedValueOnce({
      product: { id: '123', name: 'Monza', slug: 'monza', status: 'active', description: '' },
      commercialData: { price: 999.9, installment: '10x' },
      variations: [],
    });

    const res = await getProductTool.handler({ productId: '123' });
    expect(res.product.name).toBe('Monza');
  });

  it('4. get_product_images retorna imagens oficiais com aviso de fonte de verdade', async () => {
    vi.spyOn(mcpProductService, 'getProductImages').mockResolvedValueOnce([
      {
        id: 'img-1',
        kind: 'product',
        productId: '123',
        position: 1,
        isPrimary: true,
        url: 'https://cdn.com/foto.jpg',
        mimeType: 'image/jpeg',
      },
    ]);

    const res = await getProductImagesTool.handler({ productId: '123' });
    expect(res.images).toHaveLength(1);
    expect(res.images[0].kind).toBe('product');
    expect(res.note).toContain('fonte visual de verdade');
  });

  it('5. get_campaign e get_campaign_prompts retornam dados e prompts da campanha', async () => {
    vi.spyOn(mcpCampaignService, 'getCampaignByIdOrName').mockResolvedValueOnce({
      id: 'camp-1',
      name: 'Queima dos Salvados',
      description: 'Campanha de salvados',
      active: true,
      availableFormats: ['4:5'],
      prompts: [{ key: 'TITLE', name: 'Título', prompt: 'Destaque o título' }],
    });

    const campRes = await getCampaignTool.handler({ campaign: 'Queima' });
    expect(campRes.name).toBe('Queima dos Salvados');

    vi.spyOn(mcpCampaignService, 'getCampaignPrompts').mockResolvedValueOnce([
      { key: 'PRICE', name: 'Preço', prompt: 'Preço em amarelo' },
    ]);

    const promptRes = await getCampaignPromptsTool.handler({ campaignId: 'camp-1' });
    expect(promptRes.elements).toHaveLength(1);
    expect(promptRes.elements[0].key).toBe('PRICE');
  });

  it('6. get_store_assets retorna logo oficial e selos', async () => {
    const res = await getStoreAssetsTool.handler({});
    expect(res.assets.length).toBeGreaterThanOrEqual(2);
    expect(res.assets.some(a => a.category === 'logo')).toBe(true);
  });

  it('7. get_generated_post_references marca imagens como generated_reference', async () => {
    vi.spyOn(mcpCampaignService, 'getGeneratedPostReferences').mockResolvedValueOnce([
      {
        id: 'ref-1',
        kind: 'generated_reference',
        productId: '123',
        format: '4:5',
        url: 'https://cdn.com/post-antigo.png',
        note: 'Apenas referência',
      },
    ]);

    const res = await getGeneratedPostReferencesTool.handler({ productId: '123' });
    expect(res.references).toHaveLength(1);
    expect(res.references[0].kind).toBe('generated_reference');
  });

  it('8. get_post_generation_context e build_post_prompt_context executam com sucesso', async () => {
    vi.spyOn(mcpPostContextService, 'getPostGenerationContext').mockResolvedValueOnce({
      product: { id: '123', name: 'Monza', slug: 'monza', status: 'active', description: '' },
      commercialData: { price: 999.9, installment: '10x' },
      variations: [],
      productImages: { primary: null, openView: null, secondary: null, variationGallery: [], allImages: [] },
      campaign: { id: 'camp-1', name: 'Padrão', description: '', active: true, availableFormats: ['4:5'], prompts: [] },
      campaignAssets: [],
      storeAssets: [],
      generatedReferences: [],
      format: '4:5',
      sourceOfTruth: {
        productData: 'morantehub_erp',
        productImages: 'morantehub_erp_official_photos',
        campaign: 'morantehub_marketing_module',
        assets: 'morantehub_brand_assets',
      },
    });

    const ctxRes = await getPostGenerationContextTool.handler({ productId: '123', campaign: 'Padrão' });
    expect(ctxRes.product.name).toBe('Monza');
    expect(ctxRes.sourceOfTruth.productData).toBe('morantehub_erp');

    vi.spyOn(mcpPostContextService, 'buildPostPromptContext').mockResolvedValueOnce({
      briefing: { productTitle: 'Monza', category: 'Móveis', targetFormat: 'Feed', aspectRatio: '4:5', dimensions: '1080 × 1350' },
      commercialHighlights: { currentPriceFormatted: 'R$ 999,90', installmentText: '10x' },
      visualAssets: { primaryProductImageUrl: 'https://cdn.com/foto.jpg', otherVariationImages: [], officialLogoUrl: 'https://cdn.com/logo.png', referencePostImages: [] },
      campaignDirectives: { generalRule: 'Regra', elementInstructions: [] },
      hardConstraints: ['Restrição 1', 'Restrição 2'],
    });

    const promptCtxRes = await buildPostPromptContextTool.handler({ productId: '123' });
    expect(promptCtxRes.briefing.productTitle).toBe('Monza');
    expect(promptCtxRes.hardConstraints.length).toBeGreaterThan(0);
  });
});
