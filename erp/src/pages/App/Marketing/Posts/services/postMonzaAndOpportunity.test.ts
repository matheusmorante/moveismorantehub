import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildCampaignSpec,
  buildSingleSpecification,
  renderSpecificationAsPrompt,
} from './postSpecificationBuilder';
import { resolveProductImages } from './postProductImageResolver';
import { ElementModel, PostCampaign } from '../types/postCreator';

describe('Correção Crítica — Guarda-Roupa Monza & Filtragem de Badge de Oportunidade', () => {
  // Fixture real do Guarda-Roupa Monza (sem oportunidade: opportunity_id = null)
  const monzaProduct: any = {
    id: 'b9f1bb8a-8e5a-48c5-ab8c-e065f3ea4078',
    name: 'Guarda Roupa Monza 4 Portas c/ Pés',
    slug: 'guarda-roupa-monza-4-portas-c-pes',
    opportunity_id: null,
    opportunityId: null,
    unitPrice: 849,
    product_variations: [
      {
        id: 'var-branco',
        sku: '000239-03',
        name: 'Guarda Roupa Monza 4 Portas c/ Pés Branco',
        image_url: 'https://pub-389127050a434f568c29dc66bdce2567.r2.dev/branco-1.jpg,https://pub-389127050a434f568c29dc66bdce2567.r2.dev/branco-aberto.jpg',
        images: [
          'https://pub-389127050a434f568c29dc66bdce2567.r2.dev/branco-1.jpg',
          'https://pub-389127050a434f568c29dc66bdce2567.r2.dev/branco-aberto.jpg',
        ],
        active: true,
      },
      {
        id: 'var-freijo-grafite',
        sku: '000239-01',
        name: 'Guarda Roupa Monza 4 Portas c/ Pés Freijó/Grafite',
        image_url: 'https://pub-389127050a434f568c29dc66bdce2567.r2.dev/freijo-grafite-1.jpg',
        images: [
          'https://pub-389127050a434f568c29dc66bdce2567.r2.dev/freijo-grafite-1.jpg',
        ],
        active: true,
      },
      {
        id: 'var-freijo-off',
        sku: '000239-02',
        name: 'Guarda Roupa Monza 4 Portas c/ Pés Freijó/Off White',
        image_url: 'https://pub-389127050a434f568c29dc66bdce2567.r2.dev/freijo-off-1.jpg',
        images: [
          'https://pub-389127050a434f568c29dc66bdce2567.r2.dev/freijo-off-1.jpg',
        ],
        active: true,
      },
    ],
    variations: [
      {
        id: 'var-branco',
        name: 'Branco',
        images: [
          'https://pub-389127050a434f568c29dc66bdce2567.r2.dev/branco-1.jpg',
          'https://pub-389127050a434f568c29dc66bdce2567.r2.dev/branco-aberto.jpg',
        ],
        active: true,
      },
      {
        id: 'var-freijo-grafite',
        name: 'Freijó/Grafite',
        images: [
          'https://pub-389127050a434f568c29dc66bdce2567.r2.dev/freijo-grafite-1.jpg',
        ],
        active: true,
      },
      {
        id: 'var-freijo-off',
        name: 'Freijó/Off White',
        images: [
          'https://pub-389127050a434f568c29dc66bdce2567.r2.dev/freijo-off-1.jpg',
        ],
        active: true,
      },
    ],
  };

  const defaultCampaign: PostCampaign = {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Campanha Padrão',
    description: 'Campanha padrão que reúne modelos visuais reutilizáveis.',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const titleModel: ElementModel = {
    id: 'model-title',
    name: 'Título Padrão',
    elementType: 'TITLE',
    contentKind: 'DYNAMIC_CONTENT',
    prompt: 'Posicione o título com clareza.',
    referenceFiles: [],
    generationVersion: 1,
    status: 'UPDATED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const queimaBadgeModel: ElementModel = {
    id: 'model-queima-badge',
    name: 'Selo Queima dos Salvados',
    elementType: 'BADGE',
    contentKind: 'STATIC_VISUAL',
    opportunityId: 'opp-queima-id',
    prompt: 'Utilize exclusivamente o selo visual oficial da Queima dos Salvados.',
    referenceFiles: [
      {
        id: 'ref-queima',
        name: 'Selo oficial Queima dos Salvados',
        fileUrl: 'https://example.com/assets/queima-salvados-original.png',
        mimeType: 'image/png',
      },
    ],
    generatedAssetUrl: 'https://example.com/assets/queima-salvados-original.png',
    generationVersion: 1,
    status: 'UPDATED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const allActiveModels: ElementModel[] = [titleModel, queimaBadgeModel];

  it('1. Monza sem oportunidade: BADGE é estritamente omitido da especificação e do prompt', async () => {
    const spec = await buildSingleSpecification({
      productCatalogUrl: 'https://www.moveismorante.com.br/produto/guarda-roupa-monza-4-portas-c-pes',
      campaign: defaultCampaign,
      activeModels: allActiveModels,
      globalRules: 'Regras da Marca Móveis Morante',
      product: monzaProduct,
    });

    // Elemento BADGE deve ter sido filtrado completamente
    expect(spec.campaign.elements.some(e => e.elementType === 'BADGE')).toBe(false);

    // O texto do prompt NÃO pode conter "Queima dos Salvados" nem "Selo oficial Queima"
    const prompt = renderSpecificationAsPrompt(spec);
    expect(prompt).not.toContain('Queima dos Salvados');
    expect(prompt).not.toContain('Selo oficial Queima dos Salvados');
    expect(prompt).not.toContain('ELEMENTO: BADGE');

    // Deve conter as seções oficiais com URLs absolutas
    expect(prompt).toContain('IMAGENS OFICIAIS DO PRODUTO');
    expect(prompt).toContain('IMAGEM PRINCIPAL');
    expect(prompt).toContain('https://pub-389127050a434f568c29dc66bdce2567.r2.dev/branco-1.jpg');
    expect(prompt).toContain('IMAGEM SECUNDÁRIA');
    expect(prompt).toContain('https://pub-389127050a434f568c29dc66bdce2567.r2.dev/branco-aberto.jpg');
    expect(prompt).toContain('VARIAÇÕES DISPONÍVEIS');
    expect(prompt).toContain('Freijó/Grafite');
    expect(prompt).toContain('Freijó/Off White');
    expect(prompt).toContain('FIDELIDADE VISUAL OBRIGATÓRIA');
  });

  it('2. Produto com Oportunidade Queima: BADGE Queima dos Salvados é incluído', async () => {
    const queimaProduct = {
      ...monzaProduct,
      opportunity_id: 'opp-queima-id',
      opportunityId: 'opp-queima-id',
    };

    const spec = await buildSingleSpecification({
      productCatalogUrl: 'https://www.moveismorante.com.br/produto/guarda-roupa-monza-4-portas-c-pes',
      campaign: defaultCampaign,
      activeModels: allActiveModels,
      globalRules: 'Regras da Marca Móveis Morante',
      product: queimaProduct,
    });

    // BADGE deve estar presente
    const badgeElement = spec.campaign.elements.find(e => e.elementType === 'BADGE');
    expect(badgeElement).toBeDefined();
    expect(badgeElement?.resources).toHaveLength(0);
    expect(spec.officialAssets?.badge?.url).toBe('https://example.com/assets/queima-salvados-original.png');

    const prompt = renderSpecificationAsPrompt(spec);
    expect(prompt).toContain('ELEMENTO: BADGE');
    expect(prompt).toContain('SELO OFICIAL');
    expect(prompt.split('https://example.com/assets/queima-salvados-original.png')).toHaveLength(2);
  });

  it('3. Produto com OUTRA oportunidade: NUNCA inclui Queima dos Salvados por fallback', async () => {
    const otherOppProduct = {
      ...monzaProduct,
      opportunity_id: 'opp-mostruario-id',
      opportunityId: 'opp-mostruario-id',
    };

    const spec = await buildSingleSpecification({
      productCatalogUrl: 'https://www.moveismorante.com.br/produto/guarda-roupa-monza-4-portas-c-pes',
      campaign: defaultCampaign,
      activeModels: allActiveModels, // contém apenas badge de queima
      globalRules: 'Regras da Marca Móveis Morante',
      product: otherOppProduct,
    });

    // Como não há badge para opp-mostruario-id, o badge de queima NÃO pode entrar
    expect(spec.campaign.elements.some(e => e.elementType === 'BADGE')).toBe(false);

    const prompt = renderSpecificationAsPrompt(spec);
    expect(prompt).not.toContain('Queima dos Salvados');
  });

  it('4. Seleção manual de fotos (manualOverrides) é fonte de verdade e tem precedência', async () => {
    const overrides = {
      primaryUrl: 'https://pub-389127050a434f568c29dc66bdce2567.r2.dev/foto-manual-primaria.jpg',
      openViewUrl: 'https://pub-389127050a434f568c29dc66bdce2567.r2.dev/foto-manual-aberta.jpg',
      variationUrls: {
        'var-freijo-grafite': 'https://pub-389127050a434f568c29dc66bdce2567.r2.dev/freijo-custom.jpg',
      },
    };

    const spec = await buildSingleSpecification({
      productCatalogUrl: 'https://www.moveismorante.com.br/produto/guarda-roupa-monza-4-portas-c-pes',
      campaign: defaultCampaign,
      activeModels: [titleModel],
      globalRules: 'Regras da Marca Móveis Morante',
      product: monzaProduct,
      manualOverrides: overrides,
    });

    expect(spec.productImages?.primary?.url).toBe(
      'https://pub-389127050a434f568c29dc66bdce2567.r2.dev/foto-manual-primaria.jpg'
    );
    expect(spec.productImages?.openView?.url).toBe(
      'https://pub-389127050a434f568c29dc66bdce2567.r2.dev/foto-manual-aberta.jpg'
    );

    const varFreijo = spec.productImages?.variations.find(v => v.variationId === 'var-freijo-grafite');
    expect(varFreijo?.url).toBe('https://pub-389127050a434f568c29dc66bdce2567.r2.dev/freijo-custom.jpg');

    const prompt = renderSpecificationAsPrompt(spec);
    expect(prompt).toContain('https://pub-389127050a434f568c29dc66bdce2567.r2.dev/foto-manual-primaria.jpg');
    expect(prompt).toContain('https://pub-389127050a434f568c29dc66bdce2567.r2.dev/foto-manual-aberta.jpg');
    expect(prompt).toContain('https://pub-389127050a434f568c29dc66bdce2567.r2.dev/freijo-custom.jpg');
  });

  it('5. Inclusão dos elementos estruturais OPEN_VIEW e VARIATION_GALLERY', async () => {
    const spec = await buildSingleSpecification({
      productCatalogUrl: 'https://www.moveismorante.com.br/produto/guarda-roupa-monza-4-portas-c-pes',
      campaign: defaultCampaign,
      activeModels: [titleModel],
      globalRules: 'Regras',
      product: monzaProduct,
    });

    expect(spec.campaign.elements.some(e => e.elementType === 'OPEN_VIEW')).toBe(true);
    expect(spec.campaign.elements.some(e => e.elementType === 'VARIATION_GALLERY')).toBe(true);
  });
});
