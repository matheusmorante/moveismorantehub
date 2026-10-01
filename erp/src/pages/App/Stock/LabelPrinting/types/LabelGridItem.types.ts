export interface LabelItemConfig {
  name: string;
  price: string;
  promoPrice?: string;
  sku?: string;
  barcode?: string;
  code?: string;
  quantity: number;
  image?: string;
  scale?: number;
  rotation?: number;
  imageFit?: 'contain' | 'cover' | 'fill';
  extraFields?: any[];
  isBlank?: boolean;
  opportunityId?: string | null;
  opportunity_id?: string | null;
  showName?: boolean;
  showPromoPrice?: boolean;
  isLogoOnly?: boolean;
  printingMode?: 'simple' | 'advanced';
  productImages?: { image_url: string; is_main: boolean }[];
  parentImages?: { image_url: string; is_main: boolean }[];
  currentImageIndex?: number;
  instances?: string[];
  productId?: string;
  variationId?: string;
}

export interface LogoItemConfig {
  image: string;
  quantity: number;
  scale?: number;
  rotation?: number;
  name?: string;
  imageFit?: 'contain' | 'cover' | 'fill';
  price?: string;
  promoPrice?: string;
  sku?: string;
  extraFields?: any[];
  isBlank?: boolean;
  instances?: string[];
}

export interface LabelLogoAsset {
  readonly id: string;
  readonly image: string;
  readonly name: string;
}

export interface LabelGridItemInstance {
  type: 'logo' | 'product';
  originalIdx: number;
  uuid: string;
  name?: string;
  price?: string;
  promoPrice?: string;
  sku?: string;
  barcode?: string;
  code?: string;
  quantity: number;
  image?: string;
  scale?: number;
  rotation?: number;
  imageFit?: 'contain' | 'cover' | 'fill';
  extraFields?: any[];
  isBlank?: boolean;
  opportunityId?: string | null;
  opportunity_id?: string | null;
  showName?: boolean;
  showPromoPrice?: boolean;
  isLogoOnly?: boolean;
  printingMode?: 'simple' | 'advanced';
  productImages?: { image_url: string; is_main: boolean }[];
  parentImages?: { image_url: string; is_main: boolean }[];
  currentImageIndex?: number;
  instances?: string[];
  productId?: string;
  variationId?: string;
}
