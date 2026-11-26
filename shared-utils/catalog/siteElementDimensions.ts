export const CAROUSEL_BANNER_VARIANTS = ['desktop', 'tablet', 'mobile'] as const;
export type CarouselBannerVariant = (typeof CAROUSEL_BANNER_VARIANTS)[number];

export const CAROUSEL_BANNER_IMAGES = {
  desktop: { label: 'Desktop', width: 1920, height: 600, minViewport: 1024, preferredMaxBytes: 300 * 1024 },
  tablet: { label: 'Tablet', width: 1200, height: 600, minViewport: 768, preferredMaxBytes: 200 * 1024 },
  mobile: { label: 'Mobile', width: 800, height: 800, minViewport: 0, preferredMaxBytes: 150 * 1024 },
} as const;

export const LEGACY_CAROUSEL_IMAGE = { width: 1920, height: 620 } as const;
