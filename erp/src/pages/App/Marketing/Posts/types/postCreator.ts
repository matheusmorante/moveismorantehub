export const ELEMENT_TYPES = [
  'TITLE', 'PRODUCT_NAME', 'PRICE', 'OLD_PRICE', 'INSTALLMENT',
  'BADGE', 'BACKGROUND', 'LOGO', 'CTA',
  'PRODUCT_SLOGAN', 'PRODUCT_SLOGAN_TITLE', 'PRODUCT_SLOGAN_SIDE',
  'COLOR_THEME',
  'POST_REFERENCE',
  'HEADER', 'FOOTER',
  'OPEN_VIEW', 'VARIATION_GALLERY',
] as const;

export type ElementType = (typeof ELEMENT_TYPES)[number];
export type ElementContentKind = 'STATIC_VISUAL' | 'DYNAMIC_CONTENT' | 'HYBRID';
export type ElementModelStatus = 'NO_PREVIEW' | 'UPDATED' | 'STALE' | 'GENERATING' | 'ERROR';
export type PostFormat = '4:5' | '9:16';

export interface ElementModelReference { id: string; name: string; fileUrl: string; mimeType: string; }
export interface ElementModel {
  id: string; name: string; elementType: ElementType; contentKind: ElementContentKind;
  /** Obrigatório apenas para BADGE; referencia opportunities.id. */
  opportunityId?: string | null;
  prompt: string; referenceFiles: ElementModelReference[]; generatedAssetUrl?: string | null;
  generationInputHash?: string | null; generationVersion: number; status: ElementModelStatus;
  createdAt: string; updatedAt: string;
}

export interface CampaignElementModel {
  campaignId: string; elementModelId: string; elementType: ElementType;
  opportunityId?: string | null;
  active: boolean; createdAt: string;
}

export interface PostCampaign {
  id: string; name: string; description?: string; generalGuidelines?: string;
  instructions?: string;
  active: boolean; createdAt: string; updatedAt: string;
}

export interface PostPreviewCache {
  id: string; campaignId: string; productId: string; format: PostFormat; inputHash: string;
  imageUrl: string; status: 'UPDATED' | 'STALE'; accepted: boolean; pinned: boolean;
  createdAt: string; updatedAt: string;
}

export interface GenerationContext {
  campaign: PostCampaign; selectedElementModels: ElementModel[];
  resolvedElementAssets: Array<{ elementType: ElementType; assetUrl: string }>;
  product: { id: string; name: string; price: string; oldPrice?: string; installment?: string };
  productImages: { primary: string; secondary?: string; variations: Array<{ variationId: string; variationName: string; image: string }> };
  commercialData: Record<string, string>; globalGuidelines: string; format: PostFormat;
}

export const elementLabel: Record<ElementType, string> = {
  TITLE: 'Título',
  PRODUCT_NAME: 'Nome do produto',
  PRICE: 'Preço',
  OLD_PRICE: 'Preço anterior',
  INSTALLMENT: 'Precificação e Parcelamento',
  BADGE: 'Selo de Oportunidade',
  BACKGROUND: 'Fundo/Decoração',
  LOGO: 'Logo',
  CTA: 'CTA',
  PRODUCT_SLOGAN: 'Slogan do Produto',
  PRODUCT_SLOGAN_TITLE: 'Slogan do Produto (Abaixo do Título)',
  PRODUCT_SLOGAN_SIDE: 'Slogan do Produto (Ao Lado do Móvel)',
  COLOR_THEME: 'Especificação de Cores e Decoração',
  POST_REFERENCE: 'Post de Exemplo / Referência',
  HEADER: 'Cabeçalho',
  FOOTER: 'Rodapé',
  OPEN_VIEW: 'Imagem Secundária',
  VARIATION_GALLERY: 'Galeria de Variações',
};

export const defaultContentKind: Record<ElementType, ElementContentKind> = {
  TITLE: 'DYNAMIC_CONTENT',
  PRODUCT_NAME: 'DYNAMIC_CONTENT',
  PRICE: 'HYBRID',
  OLD_PRICE: 'DYNAMIC_CONTENT',
  INSTALLMENT: 'HYBRID',
  BADGE: 'STATIC_VISUAL',
  BACKGROUND: 'STATIC_VISUAL',
  LOGO: 'STATIC_VISUAL',
  CTA: 'HYBRID',
  PRODUCT_SLOGAN: 'DYNAMIC_CONTENT',
  PRODUCT_SLOGAN_TITLE: 'DYNAMIC_CONTENT',
  PRODUCT_SLOGAN_SIDE: 'DYNAMIC_CONTENT',
  COLOR_THEME: 'STATIC_VISUAL',
  POST_REFERENCE: 'STATIC_VISUAL',
  HEADER: 'HYBRID',
  FOOTER: 'HYBRID',
  OPEN_VIEW: 'HYBRID',
  VARIATION_GALLERY: 'HYBRID',
};
