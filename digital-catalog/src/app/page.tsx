import { connection } from 'next/server';
import { getStorefrontCarouselBanners } from '@/features/carousel-banners';
import HomeCatalogClient from './home-catalog-client';

export default async function Home() {
  await connection();
  const responsiveBanners = await getStorefrontCarouselBanners();
  return <HomeCatalogClient responsiveBanners={responsiveBanners} />;
}
