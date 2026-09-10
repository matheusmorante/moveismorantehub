import { describe, it, expect } from 'vitest';
import {
  buildCampaignSpec,
  buildSingleSpecification,
  renderSpecificationAsPrompt,
} from './postSpecificationBuilder';
import {
  OFFICIAL_MORANTE_LOGO_URL,
  OFFICIAL_QUEIMA_BADGE_URL,
  OFFICIAL_ASSET_MASTER_RULE,
  normalizeOfficialAssetUrl,
} from './postOfficialAssetConstants';
import { resolveOfficialAssets } from './postOfficialAssetResolver';
import { ElementModel, PostCampaign } from '../types/postCreator';

describe('Assets Oficiais Móveis Morante & Selos de Oportunidade', () => {
  const defaultCampaign: PostCampaign = {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Campanha Padrão',
    description: 'Campanha padrão para divulgação comercial.',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const monzaProductWithoutOpp: any = {
    id: 'b9f1bb8a-8e5a-48c5-ab8c-e065f3ea4078',
    name: 'Guarda Roupa Monza 4 Portas c/ Pés',
    slug: 'guarda-roupa-monza-4-portas-c-pes',
    opportunity_id: null,
    opportunityId: null,
    price: 849,
    variations: [
      {
        id: 'var-branco',
        name: 'Branco',
        images: ['https://pub-389127050a434f568c29dc66bdce2567.r2.dev/branco-1.jpg'],
        active: true,
      },
    ],
  };

  const productWithQueimaOpp: any = {
    ...monzaProductWithoutOpp,
    opportunity_id: 'opp-queima-id',
    opportunityId: 'opp-queima-id',
    opportunityName: 'Queima dos Salvados',
    opportunity: {
      id: 'opp-queima-id',
      name: 'Queima dos Salvados',
      image_url: OFFICIAL_QUEIMA_BADGE_URL,
    },
  };

  const logoModel: ElementModel = {
    id: 'model-logo',
    name: 'Logo Móveis Morante',
    elementType: 'LOGO',
    contentKind: 'STATIC_VISUAL',
    prompt: 'Posicione o logo no topo esquerdo.',
    referenceFiles: [
      {
        id: 'ref-logo',
        name: 'Logo Móveis Morante',
        fileUrl: '/images/logo-morante.png', // Legado relativo que deve ser normalizado e deduplicado
        mimeType: 'image/png',
      },
    ],
    generatedAssetUrl: '/images/logo-morante.png',
    generationVersion: 1,
    status: 'UPDATED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const queimaBadgeModel: ElementModel = {
    id: 'model-queima-badge',
    name: 'Selo Oficial Queima dos Salvados',
    elementType: 'BADGE',
    contentKind: 'STATIC_VISUAL',
    opportunityId: 'opp-queima-id',
    prompt: 'Utilize exclusivamente o selo oficial Queima dos Salvados.',
    referenceFiles: [
      {
        id: 'ref-queima',
        name: 'Selo Oficial Queima dos Salvados',
        fileUrl: OFFICIAL_QUEIMA_BADGE_URL,
        mimeType: 'image/png',
      },
    ],
    generatedAssetUrl: OFFICIAL_QUEIMA_BADGE_URL,
    generationVersion: 1,
    status: 'UPDATED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('1. Logo oficial sempre aparece com URL absoluta HTTPS verificável', async () => {
    const spec = await buildSingleSpecification({
      productCatalogUrl: 'https://www.moveismorante.com.br/produto/guarda-roupa-monza-4-portas-c-pes',
      campaign: defaultCampaign,
      activeModels: [logoModel],
      globalRules: 'Regras da Marca',
      product: monzaProductWithoutOpp,
    });

    expect(spec.officialAssets).toBeDefined();
    expect(spec.officialAssets?.logo.url).toBe(OFFICIAL_MORANTE_LOGO_URL);
    expect(spec.officialAssets?.logo.url.startsWith('https://')).toBe(true);

    const prompt = renderSpecificationAsPrompt(spec);
    expect(prompt).toContain(OFFICIAL_MORANTE_LOGO_URL);
    expect(prompt).toContain('LOGO OFICIAL DA MÓVEIS MORANTE');
  });

  it('2. Logo NÃO aparece duplicado como referência sem necessidade', () => {
    const campaignSpec = buildCampaignSpec(defaultCampaign, [logoModel]);
    const logoElement = campaignSpec.elements.find(e => e.elementType === 'LOGO');

    expect(logoElement).toBeDefined();
    // Como referenceFiles tinha o mesmo arquivo que generatedAssetUrl, a referência duplicada foi filtrada
    const officialAssetsInResources = logoElement?.resources.filter(r => r.role === 'OFFICIAL_ASSET');
    const referenceInResources = logoElement?.resources.filter(r => r.role === 'REFERENCE');

    expect(officialAssetsInResources?.length).toBe(1);
    expect(referenceInResources?.length).toBe(0);
  });

  it('3. Badge oficial aparece SOMENTE para oportunidade compatível com URL pública', async () => {
    const spec = await buildSingleSpecification({
      productCatalogUrl: 'https://www.moveismorante.com.br/produto/guarda-roupa-monza-4-portas-c-pes',
      campaign: defaultCampaign,
      activeModels: [logoModel, queimaBadgeModel],
      globalRules: 'Regras da Marca',
      product: productWithQueimaOpp,
    });

    expect(spec.officialAssets?.badge).not.toBeNull();
    expect(spec.officialAssets?.badge?.url).toBe(OFFICIAL_QUEIMA_BADGE_URL);
    expect(spec.officialAssets?.badge?.opportunityId).toBe('opp-queima-id');

    const prompt = renderSpecificationAsPrompt(spec);
    expect(prompt).toContain('SELO OFICIAL');
    expect(prompt).toContain(OFFICIAL_QUEIMA_BADGE_URL);
    expect(prompt.split(OFFICIAL_QUEIMA_BADGE_URL)).toHaveLength(2);
    const badgeElement = spec.campaign.elements.find(element => element.elementType === 'BADGE');
    expect(badgeElement?.resources.some(resource => resource.url === OFFICIAL_QUEIMA_BADGE_URL)).toBe(false);
  });

  it('4. Produto sem oportunidade → badge totalmente ausente de assets e prompt', async () => {
    const spec = await buildSingleSpecification({
      productCatalogUrl: 'https://www.moveismorante.com.br/produto/guarda-roupa-monza-4-portas-c-pes',
      campaign: defaultCampaign,
      activeModels: [logoModel, queimaBadgeModel],
      globalRules: 'Regras da Marca',
      product: monzaProductWithoutOpp,
    });

    // Badge nulo
    expect(spec.officialAssets?.badge).toBeNull();

    // Elemento BADGE também filtrado da campanha
    expect(spec.campaign.elements.some(e => e.elementType === 'BADGE')).toBe(false);

    const prompt = renderSpecificationAsPrompt(spec);
    expect(prompt).not.toContain('SELO OFICIAL');
    expect(prompt).not.toContain(OFFICIAL_QUEIMA_BADGE_URL);
    expect(prompt).not.toContain('Queima dos Salvados');
  });

  it('5. URLs públicas oficiais são absolutas HTTPS sem prefixos relativos', () => {
    expect(normalizeOfficialAssetUrl('/images/logo-morante.png')).toBe(OFFICIAL_MORANTE_LOGO_URL);
    expect(normalizeOfficialAssetUrl('/assets/queima-salvados-original.png')).toBe(OFFICIAL_QUEIMA_BADGE_URL);
    expect(OFFICIAL_MORANTE_LOGO_URL).toBe('https://www.moveismorante.com.br/logo-morante.png');
    expect(OFFICIAL_QUEIMA_BADGE_URL.startsWith('https://')).toBe(true);
  });

  it('6. Prompt contém as regras expressas de NÃO RECRIAR, NÃO REDESENHAR e PRESERVAÇÃO', async () => {
    const spec = await buildSingleSpecification({
      productCatalogUrl: 'https://www.moveismorante.com.br/produto/guarda-roupa-monza-4-portas-c-pes',
      campaign: defaultCampaign,
      activeModels: [logoModel, queimaBadgeModel],
      globalRules: 'Regras da Marca',
      product: productWithQueimaOpp,
    });

    const prompt = renderSpecificationAsPrompt(spec);
    expect(prompt).toContain('ASSETS OFICIAIS (NÃO RECRIAR / NÃO REDESENHAR)');
    expect(prompt).toContain('OFFICIAL_ASSET não é inspiração visual.');
    expect(prompt).toContain('NÃO:');
    expect(prompt).toContain('- redesenhar;');
    expect(prompt).toContain('- recriar;');
    expect(prompt).toContain('- alterar cores;');
    expect(prompt).toContain('Se a IA/ferramenta utilizada não conseguir inserir o asset fielmente');
  });

  it('7. Resolver de assets oficiais preserva regras mesmo sem modelo explícito de logo', () => {
    const resolved = resolveOfficialAssets({
      product: monzaProductWithoutOpp,
      activeModels: [],
    });

    expect(resolved.logo.url).toBe(OFFICIAL_MORANTE_LOGO_URL);
    expect(resolved.badge).toBeNull();
  });

  it('8. Selo de oportunidade NÃO deve usar o selo/badge da lista de produtos do ERP e SIM o do elemento BADGE da campanha', () => {
    const productWithErpListBadge = {
      ...productWithQueimaOpp,
      opportunity: {
        id: 'opp-queima-id',
        name: 'Queima dos Salvados',
        image_url: 'https://hkoxhourxwlddgsfdgws.supabase.co/storage/v1/object/public/products/erp-list-badge-small.png', // Selo pequeno da tabela do ERP
      },
    };

    const campaignElementBadgeModel: ElementModel = {
      id: 'model-custom-campaign-badge',
      campaignId: 'camp-1',
      elementType: 'BADGE',
      name: 'Selo Queima Oficial da Campanha',
      prompt: 'Posicione no topo direito',
      status: 'UPDATED',
      opportunityId: 'opp-queima-id',
      generatedAssetUrl: 'https://hkoxhourxwlddgsfdgws.supabase.co/storage/v1/object/public/products/marketing/seals/campaign-badge-hd.png',
    };

    const resolved = resolveOfficialAssets({
      product: productWithErpListBadge,
      activeModels: [campaignElementBadgeModel],
    });

    // Deve usar o do elemento da campanha e NUNCA o da lista do ERP
    expect(resolved.badge?.url).toBe('https://hkoxhourxwlddgsfdgws.supabase.co/storage/v1/object/public/products/marketing/seals/campaign-badge-hd.png');
    expect(resolved.badge?.url).not.toContain('erp-list-badge-small.png');
  });

  it('9. Produto com selo legado no ERP fica sem badge quando a campanha não possui modelo correspondente', () => {
    const resolved = resolveOfficialAssets({
      product: {
        ...productWithQueimaOpp,
        opportunity: {
          id: 'opp-queima-id',
          name: 'Queima dos Salvados',
          image_url: 'https://example.com/erp-list-badge.png',
        },
      },
      activeModels: [],
    });

    expect(resolved.badge).toBeNull();
  });

  it('10. Modelo legado salvo somente como anexo continua sendo a fonte oficial do selo', () => {
    const attachmentUrl = 'https://example.com/biblioteca/selo-queima-com-fogos.png';
    const modelWithAttachmentOnly: ElementModel = {
      ...queimaBadgeModel,
      generatedAssetUrl: null,
      referenceFiles: [{
        id: 'ref-fire-badge',
        name: 'Selo Queima com Fogos',
        fileUrl: attachmentUrl,
        mimeType: 'image/png',
      }],
    };

    const resolved = resolveOfficialAssets({
      product: productWithQueimaOpp,
      activeModels: [modelWithAttachmentOnly],
    });

    expect(resolved.badge?.url).toBe(attachmentUrl);
  });
});
