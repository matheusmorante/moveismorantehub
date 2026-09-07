import {
  McpPostGenerationContext,
  McpProductImage,
  McpPromptContextOutput,
  McpTargetFormat,
} from '../types/mcp.js';
import { mcpAssetService, OFFICIAL_STORE_ASSETS } from './mcpAssetService.js';
import { mcpCampaignService } from './mcpCampaignService.js';
import { mcpProductService } from './mcpProductService.js';

export const OFFICIAL_HARD_CONSTRAINTS = [
  'As fotos oficiais fornecidas do produto são a FONTE VISUAL DE VERDADE ABSOLUTA.',
  'É expressamente PROIBIDO recriar ou substituir o móvel por um produto semelhante, aproximado ou genérico.',
  'Preserve integralmente a estrutura original: geometria, proporções, materiais, textura de madeira e acabamento.',
  'Preserve rigorosamente o número exato de portas, gavetas, pés, puxadores, espelhos e painéis ripados.',
  'É expressamente PROIBIDO inventar uma logo parecida para a Móveis Morante. Utilize exclusivamente o asset oficial fornecido.',
  'É expressamente PROIBIDO inventar selos promocionais ou redesenhar chamas/textos do selo oficial.',
  'Preserve os valores comerciais reais: nunca altere preço, desconto ou parcelamento.',
  'A foto da visão interna (móvel aberto) deve ser puramente fotográfica e limpa: NUNCA insira textos sobrepostos, setas ou balões descritivos.',
  'A galeria de cores secundária deve conter EXCLUSIVAMENTE as DEMAIS variações, NUNCA duplicando a cor principal já em destaque no post.',
  'Imagens geradas anteriormente são APENAS referências visuais de composição e iluminação, NUNCA substitutas das fotos reais do produto.',
];

export class McpPostContextService {
  /**
   * Monta o contexto consolidado completo para geração de posts (Tool Principal).
   */
  async getPostGenerationContext(params: {
    productId: string;
    campaign?: string;
    campaignId?: string;
    format?: McpTargetFormat;
    variationId?: string;
  }): Promise<McpPostGenerationContext> {
    const { productId, campaign: campaignName, campaignId, format = '4:5', variationId } = params;

    const productDetails = await mcpProductService.getProductById(productId);
    const campaignTarget = campaignId || campaignName || 'Campanha Padrão';
    const campaign = await mcpCampaignService.getCampaignByIdOrName(campaignTarget);
    const allImages = await mcpProductService.getProductImages(productId, variationId);

    const primaryImg = allImages.find(img => img.isPrimary) || allImages[0] || null;
    const openViewImg = allImages.find(img => img.isOpenView) || null;
    const secondaryImg = allImages.find(img => img.isSecondary) || null;
    const variationGallery = allImages.filter(img => !img.isPrimary && img.variationId !== primaryImg?.variationId);

    const storeAssets = await mcpAssetService.getStoreAssets();
    const opportunityBadge = await mcpAssetService.resolveBadgeForOpportunity(productDetails.commercialData.opportunity);

    const campaignAssets = [...storeAssets];
    if (opportunityBadge && !campaignAssets.some(a => a.id === opportunityBadge.id)) {
      campaignAssets.push(opportunityBadge);
    }

    const generatedReferences = await mcpCampaignService.getGeneratedPostReferences(productId, campaign.id);

    return {
      product: productDetails.product,
      commercialData: productDetails.commercialData,
      variations: productDetails.variations,
      productImages: {
        primary: primaryImg,
        openView: openViewImg,
        secondary: secondaryImg,
        variationGallery,
        allImages,
      },
      campaign,
      campaignAssets,
      storeAssets,
      generatedReferences,
      format,
      sourceOfTruth: {
        productData: 'morantehub_erp',
        productImages: 'morantehub_erp_official_photos',
        campaign: 'morantehub_marketing_module',
        assets: 'morantehub_brand_assets',
      },
    };
  }

  /**
   * Constrói o briefing estruturado e pronto para montagem do prompt final pela IA.
   */
  async buildPostPromptContext(params: {
    productId: string;
    campaign?: string;
    campaignId?: string;
    format?: McpTargetFormat;
    variationId?: string;
  }): Promise<McpPromptContextOutput> {
    const context = await this.getPostGenerationContext(params);
    const { product, commercialData, productImages, campaign, format } = context;

    const isStory = format === '9:16' || format === 'mobile';
    const aspectRatio = isStory ? '9:16' : '4:5';
    const dimensions = isStory ? '1080 × 1920' : '1080 × 1350';

    const priceFormatted = commercialData.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const oldPriceFormatted = commercialData.oldPrice
      ? commercialData.oldPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : null;

    const logoAsset = OFFICIAL_STORE_ASSETS.find(a => a.category === 'logo');
    const badgeAsset = await mcpAssetService.resolveBadgeForOpportunity(commercialData.opportunity);

    return {
      briefing: {
        productTitle: product.name,
        category: product.category || 'Móveis Residenciais',
        targetFormat: isStory ? 'Story / Status (Tela de Celular)' : 'Feed Instagram',
        aspectRatio,
        dimensions,
      },
      commercialHighlights: {
        currentPriceFormatted: priceFormatted,
        oldPriceFormatted,
        installmentText: commercialData.installment,
        opportunityName: commercialData.opportunity,
      },
      visualAssets: {
        primaryProductImageUrl: productImages.primary?.url || '',
        openViewImageUrl: productImages.openView?.url || null,
        otherVariationImages: productImages.variationGallery.map(img => ({
          name: img.variationName || 'Cor Alternativa',
          url: img.url,
        })),
        officialLogoUrl: logoAsset?.url || 'https://www.moveismorante.com.br/logo-morante.png',
        officialBadgeUrl: badgeAsset?.url || null,
        referencePostImages: context.generatedReferences.map(r => r.url),
      },
      campaignDirectives: {
        generalRule: campaign.generalGuidelines || 'Composição rica, iluminação comercial elegante e forte hierarquia.',
        elementInstructions: campaign.prompts.map(p => ({
          element: p.name,
          instruction: p.prompt,
        })),
      },
      hardConstraints: OFFICIAL_HARD_CONSTRAINTS,
    };
  }
}

export const mcpPostContextService = new McpPostContextService();
