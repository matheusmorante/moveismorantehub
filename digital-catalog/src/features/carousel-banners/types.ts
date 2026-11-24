import type { CarouselBannerVariant } from '../../../../shared-utils/siteElementDimensions';

export interface StorefrontCarouselBanner {
  id: string;
  alt: string;
  linkUrl: string | null;
  images: Record<CarouselBannerVariant, string>;
}
