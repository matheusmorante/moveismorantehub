import 'server-only';
import { supabaseAnonKey, supabaseUrl } from '@/lib/supabase/client';
import { siteElementLinkSchema } from '../../../../shared-utils/siteElementSchemas';
import type { StorefrontCarouselBanner } from './types';

type PublicBannerRow = {
  id: string;
  name: string;
  image_path: string;
  tablet_image_path: string;
  mobile_image_path: string;
  link_url: string | null;
};

export async function getStorefrontCarouselBanners(): Promise<StorefrontCarouselBanner[]> {
  const url = new URL('/rest/v1/site_element_models', supabaseUrl);
  url.searchParams.set('select', 'id,name,image_path,tablet_image_path,mobile_image_path,link_url');
  url.searchParams.set('order', 'created_at.desc,id.asc');
  // The anonymous policy filters active, complete carousels before ordering.
  const assetUrl = (path: string) => new URL(`/storage/v1/object/public/products/${path}`, supabaseUrl).href;
  try {
    const response = await fetch(url, {
      headers: { apikey: supabaseAnonKey },
      // An ERP activation must be visible on the next storefront request.
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return [];
    const rows = await response.json() as PublicBannerRow[];
    return rows.map((row) => ({
      id: row.id,
      alt: row.name,
      linkUrl: siteElementLinkSchema.safeParse(row.link_url ?? '').data || null,
      images: {
        desktop: assetUrl(row.image_path),
        tablet: assetUrl(row.tablet_image_path),
        mobile: assetUrl(row.mobile_image_path),
      },
    }));
  } catch {
    return [];
  }
}
