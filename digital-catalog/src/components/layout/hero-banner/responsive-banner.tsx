import Link from 'next/link';
import { CAROUSEL_BANNER_IMAGES } from '../../../../../shared-utils/siteElementDimensions';
import type { StorefrontCarouselBanner } from '@/features/carousel-banners';

interface Props {
  banner: StorefrontCarouselBanner;
  first: boolean;
  onError: () => void;
}

export function ResponsiveBanner({ banner, first, onError }: Props) {
  const { desktop, tablet, mobile } = CAROUSEL_BANNER_IMAGES;
  const picture = (
    <picture className="block w-full">
      <source media={`(min-width: ${desktop.minViewport}px)`} srcSet={banner.images.desktop}
        width={desktop.width} height={desktop.height} />
      <source media={`(min-width: ${tablet.minViewport}px)`} srcSet={banner.images.tablet}
        width={tablet.width} height={tablet.height} />
      {/* The artwork changes per breakpoint, so a native picture selects the file. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={banner.images.mobile} alt={banner.alt} width={mobile.width} height={mobile.height}
        className="block h-auto w-full" loading={first ? 'eager' : 'lazy'} fetchPriority={first ? 'high' : 'auto'}
        decoding="async" draggable={false} onError={onError} />
    </picture>
  );
  if (!banner.linkUrl) return picture;
  return (
    <Link href={banner.linkUrl} prefetch={false} draggable={false}
      className="block focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary">
      {picture}
    </Link>
  );
}
