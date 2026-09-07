import { describe, it, expect, vi } from 'vitest';
import {
  mcpAssetService,
  OFFICIAL_STORE_ASSETS,
} from '../services/mcpAssetService.js';
import { mcpCampaignService } from '../services/mcpCampaignService.js';
import {
  mcpPostContextService,
  OFFICIAL_HARD_CONSTRAINTS,
} from '../services/mcpPostContextService.js';
import {
  mcpProductService,
  parseImagesList,
  toAbsoluteHttpsUrl,
} from '../services/mcpProductService.js';

describe('MCP Specialized Services', () => {
  it('1. toAbsoluteHttpsUrl formata URLs relativas para HTTPS', () => {
    expect(toAbsoluteHttpsUrl('/images/foto.webp')).toBe('https://www.moveismorante.com.br/images/foto.webp');
    expect(toAbsoluteHttpsUrl('http://cdn.com/foto.jpg')).toBe('https://cdn.com/foto.jpg');
    expect(toAbsoluteHttpsUrl('https://moveismorante.com.br/logo.png')).toBe('https://moveismorante.com.br/logo.png');
  });

  it('2. parseImagesList extrai arrays JSON e strings separadas por vírgula', () => {
    const list1 = parseImagesList('["/foto1.jpg", "/foto2.jpg"]');
    expect(list1).toHaveLength(2);
    expect(list1[0]).toContain('https://');

    const list2 = parseImagesList('https://cdn.com/a.jpg, https://cdn.com/b.jpg');
    expect(list2).toHaveLength(2);
  });

  it('3. mcpAssetService retorna logo oficial e selo da Queima dos Salvados', async () => {
    const assets = await mcpAssetService.getStoreAssets();
    expect(assets.length).toBeGreaterThanOrEqual(2);

    const logo = assets.find(a => a.category === 'logo');
    expect(logo).toBeDefined();
    expect(logo?.url).toBe('https://www.moveismorante.com.br/logo-morante.png');
    expect(logo?.strictInstructions).toContain('REGRA INVIOLÁVEL');

    const queimaBadge = await mcpAssetService.resolveBadgeForOpportunity('Queima dos Salvados');
    expect(queimaBadge).toBeDefined();
    expect(queimaBadge?.url).toContain('supabase.co');
  });

  it('4. mcpCampaignService resolve Campanha Padrão e prompts essenciais', async () => {
    const campaign = await mcpCampaignService.getCampaignByIdOrName('Campanha Padrão');
    expect(campaign.name).toBe('Campanha Padrão');
    expect(campaign.availableFormats).toContain('4:5');
    expect(campaign.prompts.length).toBeGreaterThanOrEqual(3);

    const keys = campaign.prompts.map(p => p.key);
    expect(keys).toContain('TITLE');
    expect(keys).toContain('PRICE');
  });

  it('5. mcpPostContextService monta contexto consolidado com hardConstraints invioláveis', async () => {
    // Mock getProductById para teste determinístico
    vi.spyOn(mcpProductService, 'getProductById').mockResolvedValueOnce({
      product: {
        id: 'prod-monza-123',
        name: 'Guarda-Roupa Monza 4 Portas c/ Pés',
        slug: 'guarda-roupa-monza',
        category: 'Guarda-Roupas',
        description: 'Guarda-roupa com 4 portas e 2 gavetas.',
        brand: 'Móveis Morante',
        status: 'active',
      },
      commercialData: {
        price: 999.9,
        oldPrice: 1299.9,
        discountPercent: 23,
        installment: '10x de R$ 99,99 sem juros',
        opportunity: 'Queima dos Salvados',
        opportunityId: 'opp-queima',
      },
      variations: [
        {
          id: 'var-1',
          name: 'Freijó / Off White',
          active: true,
          attributes: { cor: 'Freijó / Off White' },
          images: ['https://cdn.com/monza-freijo-1.webp', 'https://cdn.com/monza-freijo-interno.webp'],
        },
        {
          id: 'var-2',
          name: 'Cinamomo / Grafite',
          active: true,
          attributes: { cor: 'Cinamomo / Grafite' },
          images: ['https://cdn.com/monza-grafite-1.webp'],
        },
      ],
    });

    vi.spyOn(mcpProductService, 'getProductImages').mockResolvedValueOnce([
      {
        id: 'img-1',
        kind: 'product',
        productId: 'prod-monza-123',
        variationId: 'var-1',
        position: 1,
        isPrimary: true,
        url: 'https://cdn.com/monza-freijo-1.webp',
        mimeType: 'image/webp',
      },
      {
        id: 'img-2',
        kind: 'product',
        productId: 'prod-monza-123',
        variationId: 'var-1',
        position: 2,
        isPrimary: false,
        isOpenView: true,
        url: 'https://cdn.com/monza-freijo-interno.webp',
        mimeType: 'image/webp',
      },
      {
        id: 'img-3',
        kind: 'product',
        productId: 'prod-monza-123',
        variationId: 'var-2',
        position: 1,
        isPrimary: false,
        url: 'https://cdn.com/monza-grafite-1.webp',
        mimeType: 'image/webp',
      },
    ]);

    const context = await mcpPostContextService.getPostGenerationContext({
      productId: 'prod-monza-123',
      campaign: 'Campanha Padrão',
      format: '4:5',
    });

    expect(context.product.name).toBe('Guarda-Roupa Monza 4 Portas c/ Pés');
    expect(context.commercialData.price).toBe(999.9);
    expect(context.productImages.primary?.url).toBe('https://cdn.com/monza-freijo-1.webp');
    expect(context.productImages.openView?.url).toBe('https://cdn.com/monza-freijo-interno.webp');
    expect(context.sourceOfTruth.productData).toBe('morantehub_erp');
  });

  it('6. buildPostPromptContext gera briefing estruturado e inclui hardConstraints obrigatórias', async () => {
    vi.spyOn(mcpProductService, 'getProductById').mockResolvedValueOnce({
      product: {
        id: 'prod-monza-123',
        name: 'Guarda-Roupa Monza',
        slug: 'monza',
        category: 'Dormitório',
        description: 'Descrição',
        status: 'active',
      },
      commercialData: {
        price: 899,
        oldPrice: 1099,
        installment: '10x sem juros',
        opportunity: 'Queima dos Salvados',
      },
      variations: [],
    });

    vi.spyOn(mcpProductService, 'getProductImages').mockResolvedValueOnce([]);

    const briefing = await mcpPostContextService.buildPostPromptContext({
      productId: 'prod-monza-123',
      campaign: 'Campanha Padrão',
      format: '9:16',
    });

    expect(briefing.briefing.aspectRatio).toBe('9:16');
    expect(briefing.briefing.dimensions).toBe('1080 × 1920');
    expect(briefing.hardConstraints).toEqual(OFFICIAL_HARD_CONSTRAINTS);
    expect(briefing.hardConstraints).toContain(
      'Preserve rigorosamente o número exato de portas, gavetas, pés, puxadores, espelhos e painéis ripados.',
    );
  });
});
