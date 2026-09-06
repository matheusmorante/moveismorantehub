export type LayerType =
  | 'PRODUCT_MAIN_IMAGE'
  | 'ASSET'
  | 'DYNAMIC_TEXT'
  | 'DYNAMIC_PRICE'
  | 'DYNAMIC_INSTALLMENT'
  | 'VARIATION_GALLERY'
  | 'HEADER_FOOTER_DECORATION';

export interface BaseLayer {
  id: string;
  type: LayerType;
  name: string;
  x: number; // 0.0 a 1.0 (posição X relativa no canvas)
  y: number; // 0.0 a 1.0 (posição Y relativa no canvas)
  width: number; // 0.0 a 1.0 (largura relativa)
  height?: number; // 0.0 a 1.0 (altura relativa)
  rotation: number; // rotação em graus
  zIndex: number;
  opacity: number; // 0.0 a 1.0
  locked: boolean;
  visible: boolean;
  role?: 'badge' | 'title' | 'oldPrice' | 'price' | 'installment' | 'productSlogan' | 'storeSlogan' | 'gallery' | 'brand' | 'main';
  modelId?: string;
  opportunityId?: string;
  preferredRegion?: 'TOP_LEFT' | 'TOP_CENTER' | 'TOP_RIGHT' | 'CENTER_LEFT' | 'CENTER' | 'CENTER_RIGHT' | 'BOTTOM_LEFT' | 'BOTTOM_CENTER' | 'BOTTOM_RIGHT';
  preferredSize?: 'small' | 'medium' | 'large';
  priority?: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW';
  positionTolerance?: 'strict' | 'automatic';
  safeMargin?: number;
  relations?: { above?: string; below?: string; keepNear?: string; keepSeparateFrom?: string };
  aiInstructions?: string;
  /** Área efetivamente ocupada pelo produto na imagem (quando conhecida pelo fluxo de imagem). */
  subjectBounds?: { x: number; y: number; width: number; height: number };
}

export interface AssetLayer extends BaseLayer {
  type: 'ASSET';
  assetId: string;
  assetUrl?: string;
}

export interface DynamicTextLayer extends BaseLayer {
  type: 'DYNAMIC_TEXT' | 'DYNAMIC_PRICE' | 'DYNAMIC_INSTALLMENT';
  textBinding: string; // e.g. "{{product.name}}", "{{product.price}}", "{{product.installmentValue}}"
  fontFamily: string;
  fontSizeRelative: number; // altura relativa do texto
  color: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  backgroundPadding?: number;
  borderRadius?: number;
  maxLines?: number;
  textDecoration?: 'line-through' | 'none';
  backgroundShape?: 'brush' | 'rounded';
}

export interface VariationGalleryLayer extends BaseLayer {
  type: 'VARIATION_GALLERY';
  direction: 'horizontal' | 'vertical' | 'grid';
  thumbnailSizeRelative: number;
  gapRelative: number;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
}

export type Layer = AssetLayer | DynamicTextLayer | VariationGalleryLayer | BaseLayer;
