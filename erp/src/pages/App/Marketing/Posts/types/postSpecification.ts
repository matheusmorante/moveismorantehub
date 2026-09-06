/**
 * Tipos centrais da especificação de posts para IA.
 *
 * PostCreationSpecification  → 1 campanha (usado no Prompt Preview do ERP)
 * PostShareSpecification     → todas as campanhas (usado no link público)
 *
 * INVARIANTE: o texto do prompt, o JSON da página pública e o botão
 * "Copiar Prompt" derivam sempre do mesmo buildSpecification*.
 */

import { ElementType } from './postCreator';

// ---------------------------------------------------------------------------
// Referências e assets dentro de um elemento
// ---------------------------------------------------------------------------

/** Papel de um arquivo de referência ou asset dentro de um elemento. */
export type PostFileRole = 'REFERENCE' | 'OFFICIAL_ASSET';

/**
 * REFERENCE  → ensina à IA estilo, tipografia, composição etc.
 *              Não precisa ser reproduzida literalmente.
 * OFFICIAL_ASSET → arquivo real (logo, selo) que deve ser preservado.
 */
export interface PostFileResource {
  role: PostFileRole;
  elementType: ElementType;
  name: string;
  /** URL HTTPS públicamente acessível — sem blob:, localhost ou base64. */
  url: string;
  mimeType: string;
  description?: string;
}

export interface PostOfficialAssetsSpec {
  logo: {
    name: string;
    url: string;
    role: 'OFFICIAL_ASSET';
  };
  badge: {
    name: string;
    url: string;
    role: 'OFFICIAL_ASSET';
    opportunityId: string;
    opportunityName?: string;
  } | null;
}

// ---------------------------------------------------------------------------
// Elemento dentro de uma especificação de campanha
// ---------------------------------------------------------------------------

export interface PostElementSpec {
  elementType: ElementType;
  prompt: string;
  instructions?: string;
  resources: PostFileResource[];
}

// ---------------------------------------------------------------------------
// Especificação de uma campanha
// ---------------------------------------------------------------------------

export interface PostCampaignSpec {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  elements: PostElementSpec[];
}

// ---------------------------------------------------------------------------
// Imagens do Produto com Papéis Semânticos
// ---------------------------------------------------------------------------

export type ProductImageRole = 'PRIMARY' | 'OPEN_VIEW' | 'VARIATION_PRIMARY';

export interface ProductImageReference {
  url: string;
  role: 'PRIMARY' | 'OPEN_VIEW';
  variationId?: string;
  variationName?: string;
  description?: string;
}

export interface ProductVariationImageReference {
  variationId: string;
  variationName: string;
  url: string;
  role: 'VARIATION_PRIMARY';
}

export interface PostProductImagesSpec {
  primary: ProductImageReference | null;
  openView: ProductImageReference | null;
  variations: ProductVariationImageReference[];
  primaryVariation?: {
    id: string;
    name: string;
  } | null;
}

export interface PostProductImagesValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Especificação completa (1 campanha) — usada no Prompt Preview do ERP
// ---------------------------------------------------------------------------

export interface PostCreationSpecification {
  schemaVersion: '1.0';
  purpose: 'AI_POST_CREATION_INSTRUCTIONS';
  brand: { name: string };
  product: {
    /** URL pública do produto/variação no catálogo digital. */
    catalogUrl: string;
    id?: string;
    name?: string;
    price?: number;
    oldPrice?: number;
    installmentText?: string;
    photos?: string[];
  };
  productImages?: PostProductImagesSpec;
  officialAssets?: PostOfficialAssetsSpec;
  campaign: PostCampaignSpec;
  formats: PostFormatSpec[];
  globalRules: string;
  generatedAt: string;
  /** Hash do conteúdo para identificar versão da configuração. */
  configurationVersion: string;
}

// ---------------------------------------------------------------------------
// Especificação de compartilhamento (todas as campanhas) — usada no link público
// ---------------------------------------------------------------------------

export interface PostShareSpecification {
  schemaVersion: '1.0';
  purpose: 'AI_POST_CREATION_INSTRUCTIONS';
  brand: { name: string };
  product: {
    catalogUrl: string;
    id?: string;
    name?: string;
    price?: number;
    oldPrice?: number;
    installmentText?: string;
    photos?: string[];
  };
  productImages?: PostProductImagesSpec;
  officialAssets?: PostOfficialAssetsSpec;
  campaigns: PostCampaignSpec[];
  formats: PostFormatSpec[];
  globalRules: string;
  /**
   * Instrução mestre: como a IA deve interpretar e usar esta especificação.
   */
  masterInstruction: string;
  generatedAt: string;
  configurationVersion: string;
}

// ---------------------------------------------------------------------------
// Formatos oficiais
// ---------------------------------------------------------------------------

export interface PostFormatSpec {
  key: 'FEED_4_5' | 'STORY_STATUS_9_16';
  name: string;
  aspectRatio: string;
  referenceSize: string;
}

export const OFFICIAL_FORMATS: PostFormatSpec[] = [
  {
    key: 'FEED_4_5',
    name: 'Feed',
    aspectRatio: '4:5',
    referenceSize: '1080 × 1350',
  },
  {
    key: 'STORY_STATUS_9_16',
    name: 'Story / Status',
    aspectRatio: '9:16',
    referenceSize: '1080 × 1920',
  },
];

// ---------------------------------------------------------------------------
// Biblioteca de Posts — artes finais salvas pelo usuário
// ---------------------------------------------------------------------------

export type ProductPostFormat = 'FEED_4_5' | 'STORY_STATUS_9_16';

export interface ProductPost {
  id: string;
  productId: string;
  campaignId?: string | null;
  variationId?: string | null;
  format: ProductPostFormat;
  imageStoragePath: string;
  imageUrl: string;
  title?: string | null;
  notes?: string | null;
  /** Hash da configuração da campanha no momento do upload (metadado). */
  campaignConfigHash?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const productPostFormatLabel: Record<ProductPostFormat, string> = {
  FEED_4_5: 'Feed 4:5',
  STORY_STATUS_9_16: 'Story / Status 9:16',
};

// ---------------------------------------------------------------------------
// Share Token
// ---------------------------------------------------------------------------

export interface PostShareToken {
  id: string;
  productId: string;
  variationId?: string | null;
  token: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Resultado de validação de proporção de imagem
// ---------------------------------------------------------------------------

export interface ImageRatioValidation {
  detectedRatio: string;
  format: ProductPostFormat | null;
  valid: boolean;
  message?: string;
}
