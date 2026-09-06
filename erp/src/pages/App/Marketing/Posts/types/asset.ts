export type AssetCategory =
  | 'CAMPAIGN_BADGE'
  | 'PAYMENT'
  | 'BRAND'
  | 'DECORATION'
  | 'FRAME'
  | 'DISCOUNT'
  | 'ICON'
  | 'BACKGROUND_ELEMENT'
  | 'OTHER';

export interface MarketingAsset {
  id: string;
  name: string;
  type: 'image/png' | 'image/webp' | 'image/svg+xml' | string;
  category: AssetCategory;
  fileUrl: string;
  campaignId?: string | null;
  width?: number;
  height?: number;
  aspectRatio?: number;
  isSystemDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}
