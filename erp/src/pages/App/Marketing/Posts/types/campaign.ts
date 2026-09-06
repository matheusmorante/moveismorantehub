export interface MarketingCampaign {
  id: string;
  name: string;
  slug: string;
  description?: string;
  primaryColor?: string;
  accentColor?: string;
  badgeAssetId?: string | null;
  active: boolean;
  isSystemDefault?: boolean;
  createdAt: string;
  updatedAt: string;
  persistedRemotely?: boolean;
}
