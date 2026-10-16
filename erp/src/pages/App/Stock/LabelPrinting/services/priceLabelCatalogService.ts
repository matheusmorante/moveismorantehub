import { supabase } from '@/pages/utils/supabaseConfig';
import { normalizeSearchTerm, buildAccentInsensitiveRegex } from '@/pages/utils/textUtils';
import { getLocalProducts } from '@/pages/utils/productService/productLocalCache';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import { labelCatalogProductSchema, labelCatalogSearchFormSchema } from '../../../../../../../shared-utils/labelDataFillFormSchemas';

export interface PriceLabelCatalogProduct {
  id: string;
  name: string;
  description: string;
  code: string;
  unit_price: number;
  promo_price: number;
  images: string[];
}

export function extractProductName(prod: any): string {
  const candidate =
    prod?.name || prod?.title || prod?.marketplaceTitle || prod?.description || 'PRODUTO SEM NOME';
  return String(candidate).split('\n')[0].trim().toUpperCase();
}

export interface PriceLabelCatalogResult {
  data: PriceLabelCatalogProduct[];
  error: Error | null;
}

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const productId = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim()
    : typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? String(value) : null;
const text = (value: unknown): string => typeof value === 'string' || typeof value === 'number' ? String(value) : '';
const price = (value: unknown): number =>
  typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
// PostgREST quoted values escape backslashes/quotes; LIKE wildcards are escaped
// separately so punctuation in a submitted search remains literal.
const quoteFilter = (value: string): string => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const likePattern = (value: string): string => `%${value.replace(/[\\%_]/g, '\\$&')}%`;

/** Combines valid local products with a bounded, confirmed remote query. */
export async function searchProductsForLabelResult(searchTerm: string): Promise<PriceLabelCatalogResult> {
  const selection = labelCatalogSearchFormSchema.safeParse({ searchTerm });
  if (!selection.success) return { data: [], error: new Error('Confira o texto da busca de produtos.') };
  const term = normalizeSearchTerm(selection.data.searchTerm);
  const products = new Map<string, PriceLabelCatalogProduct>();
  let error: Error | null = null;
  const collect = (items: unknown[], remote: boolean) => {
    for (const item of items) {
      if (!record(item)) { error = new Error('O catálogo contém produtos inválidos. Os produtos válidos foram preservados.'); continue; }
      const id = productId(item.id);
      if (item.deleted === true) { if (id && remote) products.delete(id); continue; }
      if (!remote && term) {
        const description = normalizeSearchTerm(text(item.name || item.title || item.marketplaceTitle || item.description));
        const code = normalizeSearchTerm(text(item.code ?? item.sku));
        if (!description.includes(term) && !code.includes(term)) continue;
      }
      const name = extractProductName(item);
      const images = remote && Array.isArray(item.product_images) && item.product_images.length
        ? item.product_images.map((image) => record(image) ? image.image_url : null)
        : Array.isArray(item.images) ? item.images : [item.image_url];
      const parsed = labelCatalogProductSchema.safeParse({
        id, name, description: name, code: text(item.code ?? item.sku),
        unit_price: price((remote ? item.price ?? item.unit_price : item.unitPrice ?? item.price ?? item.unit_price) ?? 0),
        promo_price: price((remote ? item.promo_price : item.promoPrice ?? item.promo_price) ?? 0),
        images: images.filter((image): image is string => typeof image === 'string' && image.trim().length > 0),
      });
      if (parsed.success) products.set(parsed.data.id, parsed.data);
      else error = new Error('O catálogo contém produtos inválidos. Os produtos válidos foram preservados.');
    }
  };
  try {
    const local = getLocalProducts();
    if (!Array.isArray(local)) throw new Error('Catálogo local inválido.');
    collect(local, false);
  } catch { error = new Error('Não foi possível ler os produtos salvos neste computador.'); }

  try {
    let query = supabase.from('products').select('*, product_images(*)')
      .eq('deleted', false).order('created_at', { ascending: false }).limit(40);
    if (term) {
      const regex = quoteFilter(`.*${buildAccentInsensitiveRegex(term)}.*`), like = quoteFilter(likePattern(term));
      // PostgREST aliases '*' to '%' for LIKE even inside quoted values.
      query = query.or(term.includes('*')
        ? `name.imatch.${regex},description.imatch.${regex},code.imatch.${regex}`
        : `name.imatch.${regex},description.imatch.${regex},name.ilike.${like},description.ilike.${like},code.ilike.${like}`);
    }
    const response = await withTimeout(query, 15_000, null, 'etiquetas:buscar-produtos');
    if (!response || response.error || !Array.isArray(response.data)) throw new Error('Consulta não confirmada.');
    collect(response.data, true);
  } catch { error = new Error('Não foi possível consultar os produtos na nuvem. Os resultados locais foram preservados.'); }
  return { data: Array.from(products.values()), error };
}

/** Legacy consumers keep their array contract; the modal uses the explicit error. */
export async function searchProductsForLabel(searchTerm: string): Promise<PriceLabelCatalogProduct[]> {
  return (await searchProductsForLabelResult(searchTerm)).data;
}
