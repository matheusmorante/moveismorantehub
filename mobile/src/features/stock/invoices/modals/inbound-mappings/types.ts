import type { InboundScorerProduct } from '../utils/inboundDeterministicScorer';

export type MappingItem = {
  itemNumber: number;
  productCode: string;
  productDescription: string;
  matchedProductId?: string;
  matchedVariationId?: string;
  productErpName?: string;
  linkedProductCode?: string;
  [key: string]: any;
};

export type Supplier = {
  id: string;
  full_name: string;
  cpf_cnpj?: string | null;
};

export type Product = InboundScorerProduct;

export type ProductSuggestion = Product & {
  confidence: number;
  reason: string;
  matches: string[];
  divergences: string[];
};

export type CompositionLink = {
  id: string;
  productId: string;
  variationId?: string;
  productErpName: string;
  linkedProductCode: string;
  sellingPrice: number;
  quantityMultiplier: number;
};
