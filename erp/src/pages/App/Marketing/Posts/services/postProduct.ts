import { Product } from '@/pages/types/product.type';
import { shouldShowPreviousPrice } from '../postPriceVisibility';
export function postProduct(product: Product, overrides: Record<string, string> = {}) {
  const variations = (product.variations || []).filter(v => v.active !== false);
  const first = variations[0];
  const price = first?.unitPrice ?? product.unitPrice;
  const promo = first?.promoPrice ?? product.promoPrice;
  const discounted = shouldShowPreviousPrice(price, promo, false);
  const currency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const slots = variations.length ? variations.flatMap((v, index) =>
    (index === 0 ? [0, 1] : [0]).map(photo => ({ id: `${v.id}:${photo}`, label: `Variação ${index + 1} • foto ${photo + 1}`,
      url: overrides[`${v.id}:${photo}`] ?? v.images?.[photo] ?? '', choices: v.images || [] }))) :
    [0, 1].map(photo => ({ id: `product:${photo}`, label: `Foto ${photo + 1}`,
      url: overrides[`product:${photo}`] ?? product.images?.[photo] ?? '', choices: product.images || [] }));
  return { name: product.name || product.title || product.description || 'Produto', price: currency(discounted ? promo! : price),
    oldPrice: discounted ? currency(price) : undefined, mainImageUrl: slots[0]?.url || '', slots,
    galleryImages: slots.slice(1).filter(s => s.url).map(s => ({ id: s.id, image_url: s.url })) };
}
