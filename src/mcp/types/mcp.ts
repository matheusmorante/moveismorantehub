/**
 * Tipos fundamentais do Servidor MCP Privado do MoranteHub
 * Exclusivo para geração de posts e contexto comercial de produtos por IA.
 */

export type McpClientId = 'chatgpt' | 'antigravity' | 'internal' | string;

export interface McpClientAuth {
  clientId: McpClientId;
  clientName: string;
  authenticated: boolean;
  tokenType: 'bearer' | 'direct';
}

export interface McpAuditLog {
  id: string;
  timestamp: string;
  tool: string;
  clientId: McpClientId;
  productId?: string | null;
  campaign?: string | null;
  status: 'SUCCESS' | 'ERROR' | 'UNAUTHORIZED' | 'RATE_LIMITED';
  durationMs: number;
  errorMessage?: string;
}

export interface McpProductSummary {
  id: string;
  name: string;
  slug: string;
  sku?: string;
  category?: string;
  price: number;
  oldPrice?: number | null;
  active: boolean;
  opportunityName?: string | null;
}

export interface McpProductVariation {
  id: string;
  name: string;
  title?: string;
  sku?: string;
  color?: string;
  price?: number;
  oldPrice?: number | null;
  active: boolean;
  attributes: Record<string, string>;
  images: string[];
}

export interface McpProductImage {
  id: string;
  kind: 'product';
  productId: string;
  variationId?: string | null;
  variationName?: string | null;
  position: number;
  isPrimary: boolean;
  isOpenView?: boolean;
  isSecondary?: boolean;
  url: string;
  mimeType: string;
  width?: number;
  height?: number;
  description?: string;
}

export interface McpCampaignPromptElement {
  key: string;
  name: string;
  prompt: string;
  assetUrl?: string | null;
  referenceFiles?: Array<{ name: string; url: string }>;
}

export interface McpCampaignData {
  id: string;
  name: string;
  description: string;
  generalGuidelines?: string;
  active: boolean;
  availableFormats: Array<'4:5' | '9:16' | 'mobile'>;
  prompts: McpCampaignPromptElement[];
}

export interface McpStoreAsset {
  id: string;
  name: string;
  kind: 'asset';
  category: 'logo' | 'badge' | 'installment' | 'seal' | 'other';
  url: string;
  mimeType: string;
  strictInstructions?: string;
}

export interface McpGeneratedReference {
  id: string;
  kind: 'generated_reference';
  productId: string;
  campaignId?: string;
  format: string;
  url: string;
  note: string;
}

export type McpTargetFormat = '4:5' | '9:16' | 'mobile';

export interface McpPostGenerationContext {
  product: {
    id: string;
    name: string;
    slug: string;
    sku?: string;
    category?: string;
    description: string;
    specifications?: Record<string, any>;
    materials?: string;
    measurements?: {
      width?: number;
      height?: number;
      depth?: number;
      weight?: number;
    };
    brand?: string;
    status: string;
  };
  commercialData: {
    price: number;
    oldPrice?: number | null;
    discountPercent?: number | null;
    installment: string;
    opportunity?: string | null;
  };
  variations: McpProductVariation[];
  productImages: {
    primary: McpProductImage | null;
    openView: McpProductImage | null;
    secondary: McpProductImage | null;
    variationGallery: McpProductImage[];
    allImages: McpProductImage[];
  };
  campaign: McpCampaignData;
  campaignAssets: McpStoreAsset[];
  storeAssets: McpStoreAsset[];
  generatedReferences: McpGeneratedReference[];
  format: McpTargetFormat;
  sourceOfTruth: {
    productData: 'morantehub_erp';
    productImages: 'morantehub_erp_official_photos';
    campaign: 'morantehub_marketing_module';
    assets: 'morantehub_brand_assets';
  };
}

export interface McpPromptContextOutput {
  briefing: {
    productTitle: string;
    category: string;
    targetFormat: string;
    aspectRatio: string;
    dimensions: string;
  };
  commercialHighlights: {
    currentPriceFormatted: string;
    oldPriceFormatted?: string | null;
    installmentText: string;
    opportunityName?: string | null;
  };
  visualAssets: {
    primaryProductImageUrl: string;
    openViewImageUrl?: string | null;
    otherVariationImages: Array<{ name: string; url: string }>;
    officialLogoUrl: string;
    officialBadgeUrl?: string | null;
    referencePostImages: string[];
  };
  campaignDirectives: {
    generalRule: string;
    elementInstructions: Array<{ element: string; instruction: string }>;
  };
  hardConstraints: string[];
}
