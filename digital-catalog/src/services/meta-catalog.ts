import { Database } from '@/types/database';
import { supabase } from '@/lib/supabase/client';

type ProductRow = Database['public']['Tables']['products']['Row'];

export interface MetaProductData {
  id: string;
  title: string;
  description: string;
  price: string;
  sale_price?: string;
  image_link: string;
  link: string;
  availability: 'in stock' | 'out of stock';
  brand: string;
  condition: 'new' | 'refurbished' | 'used';
  item_group_id?: string;
  product_type?: string;
  color?: string;
  size?: string;
  material?: string;
  gender?: string;
  additional_image_link?: string;
  quantity_to_sell_on_facebook?: number;
  identifier_exists?: 'yes' | 'no';
  custom_label_0?: string;
  custom_label_1?: string;
  custom_label_2?: string;
  custom_label_3?: string;
  // Aliases para retrocompatibilidade
  image_url?: string;
  url?: string;
}

export interface MetaBatchRequest {
  method: 'CREATE' | 'UPDATE' | 'DELETE';
  retailer_id: string;
  data?: Partial<MetaProductData>;
}

export interface MetaCredentials {
  accessToken: string;
  catalogId: string;
}

const META_GRAPH_VERSION = 'v26.0';
const DEFAULT_CATALOG_ID = '949184464866249';

/**
 * Obtém credenciais válidas do Meta Catalog a partir do banco de dados ou variáveis de ambiente
 */
export async function getMetaCatalogCredentials(): Promise<MetaCredentials | null> {
  let accessToken = process.env.META_ACCESS_TOKEN ? String(process.env.META_ACCESS_TOKEN).trim() : '';
  let catalogId = process.env.META_CATALOG_ID ? String(process.env.META_CATALOG_ID).trim().replace(/\D/g, '') : '';

  try {
    const { data: catSettings } = await supabase
      .from('facebook_catalog_settings')
      .select('meta_access_token, meta_catalog_id')
      .eq('id', true)
      .maybeSingle();

    if (catSettings) {
      if (catSettings.meta_access_token && !accessToken) {
        accessToken = String(catSettings.meta_access_token).trim();
      }
      if (catSettings.meta_catalog_id && !catalogId) {
        catalogId = String(catSettings.meta_catalog_id).trim().replace(/\D/g, '');
      }
    }
  } catch (err) {
    console.warn('[MetaCatalog] Erro ao ler facebook_catalog_settings:', err);
  }

  // Fallback se o catalogId for vazio ou inválido
  if (!catalogId || catalogId === '2597693034029026') {
    catalogId = DEFAULT_CATALOG_ID;
  }

  if (!accessToken || !catalogId) {
    return null;
  }

  return { accessToken, catalogId };
}

/**
 * Normaliza e codifica URL de imagem para crawler da Meta
 */
export function normalizeMetaImageUrl(urlStr: any): string {
  if (!urlStr) return '';
  const str = String(urlStr).trim();
  try {
    const decoded = decodeURI(str);
    return encodeURI(decoded).replace(/%2520/g, '%20').replace(/\s+/g, '%20');
  } catch {
    return str.replace(/\s+/g, '%20');
  }
}

/**
 * Envia um lote de atualizações de produtos para a API do Catálogo da Meta (items_batch)
 * Divide automaticamente em lotes de até 250 itens para respeitar o limite de 300 da Meta.
 */
export async function sendMetaCatalogBatch(
  requests: MetaBatchRequest[],
  overrideCredentials?: MetaCredentials
) {
  const credentials = overrideCredentials || (await getMetaCatalogCredentials());

  if (!credentials?.accessToken || !credentials?.catalogId) {
    console.warn('[MetaCatalog] Credenciais da Meta não configuradas no servidor.');
    return { success: false, message: 'Credenciais da Meta não configuradas no servidor.' };
  }

  if (requests.length === 0) {
    return { success: true, message: 'Nenhuma requisição de lote enviada.' };
  }

  const { accessToken, catalogId } = credentials;
  const BATCH_SIZE = 250;
  const handles: string[] = [];
  const errors: any[] = [];

  for (let i = 0; i < requests.length; i += BATCH_SIZE) {
    const chunk = requests.slice(i, i + BATCH_SIZE);

    // Sanitiza e padroniza cada item do lote
    const sanitizedChunk = chunk.map((req) => {
      if (req.method === 'DELETE' || !req.data) {
        return {
          method: req.method,
          retailer_id: req.retailer_id,
          data: {
            id: req.retailer_id,
            ...(req.data || {}),
          },
        };
      }

      const d = req.data;
      const imageLink = d.image_link || d.image_url || '';
      const link = d.link || d.url || '';

      const normalizedData: any = {
        id: req.retailer_id,
        title: d.title,
        description: d.description,
        price: d.price,
        availability: d.availability || 'in stock',
        condition: d.condition || 'new',
        brand: d.brand || 'Móveis Morante',
        image_link: normalizeMetaImageUrl(imageLink),
        link,
      };

      if (d.sale_price) normalizedData.sale_price = d.sale_price;
      if (d.additional_image_link) normalizedData.additional_image_link = d.additional_image_link;
      if (d.item_group_id) normalizedData.item_group_id = d.item_group_id;
      if (d.product_type) normalizedData.product_type = d.product_type;
      if (d.color) normalizedData.color = d.color;
      if (d.size) normalizedData.size = d.size;
      if (d.material) normalizedData.material = d.material;
      if (d.gender) normalizedData.gender = d.gender;
      if (d.custom_label_0) normalizedData.custom_label_0 = d.custom_label_0;
      if (d.custom_label_1) normalizedData.custom_label_1 = d.custom_label_1;
      if (d.custom_label_2) normalizedData.custom_label_2 = d.custom_label_2;
      if (d.custom_label_3) normalizedData.custom_label_3 = d.custom_label_3;

      return {
        method: req.method,
        retailer_id: req.retailer_id,
        data: normalizedData,
      };
    });

    const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${catalogId}/items_batch`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          item_type: 'PRODUCT_ITEM',
          requests: sanitizedChunk,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('[MetaCatalog] Erro no lote da API Meta:', result);
        errors.push(result.error || result);
      } else if (result.handles && Array.isArray(result.handles)) {
        handles.push(...result.handles);
      }
    } catch (chunkErr: any) {
      console.error('[MetaCatalog] Erro de rede ao conectar com a API da Meta:', chunkErr);
      errors.push({ message: chunkErr.message });
    }
  }

  if (handles.length === 0 && errors.length > 0) {
    return {
      success: false,
      errors,
      message: 'Falha ao enviar todos os lotes para a Meta.',
    };
  }

  return {
    success: true,
    handles,
    totalSent: requests.length,
    chunks: Math.ceil(requests.length / BATCH_SIZE),
    errors: errors.length > 0 ? errors : undefined,
    message: `Lote de produtos enviado com sucesso (${requests.length} itens).`,
  };
}

/**
 * Consulta o status de processamento assíncrono de um lote enviado à Meta
 */
export async function checkMetaBatchStatus(handle: string, overrideCredentials?: MetaCredentials) {
  const credentials = overrideCredentials || (await getMetaCatalogCredentials());
  if (!credentials) {
    throw new Error('Credenciais da Meta não configuradas.');
  }

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${credentials.catalogId}/check_batch_request_status?handle=${encodeURIComponent(handle)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
    },
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error?.message || 'Erro ao consultar status do lote na Meta.');
  }

  return data;
}

/**
 * Mapeia um produto do banco de dados para a estrutura aceita pela Meta
 */
export function mapProductToMeta(
  product: ProductRow & { opportunities?: any; material?: string; is_salvado?: boolean },
  mainImageUrl: string | null,
  additionalImageUrls: string[] = []
): MetaProductData {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://moveismorante.com.br';
  const origin = appUrl.replace(/\/$/, '');

  const imageUrl = normalizeMetaImageUrl(mainImageUrl || `${origin}/placeholder-product.png`);
  const productUrl = `${origin}/produto/${product.slug}`;

  let baseDescription = product.description || product.name;
  const opp = Array.isArray(product.opportunities)
    ? product.opportunities[0]
    : product.opportunities;
  const oppName = opp?.name ? String(opp.name).trim() : '';
  if (opp && opp.observations) {
    baseDescription =
      `${baseDescription}\n\nAviso Importante (${oppName || opp.name}): ${opp.observations}`.trim();
  }

  const regularPrice = Number(product.price || 0);
  const promoPrice = product.promo_price ? Number(product.promo_price) : 0;
  const hasPromo = promoPrice > 0 && promoPrice < regularPrice;
  const currentPrice = hasPromo ? promoPrice : regularPrice;
  const oldPriceFormatted = hasPromo ? formatDecimalPrice(regularPrice) : undefined;

  const parentSku = String((product as any).code || (product as any).sku || '').trim() || product.id;

  const data: MetaProductData = {
    id: parentSku,
    title: product.name,
    description: stripHtml(baseDescription),
    price: `${regularPrice.toFixed(2)} BRL`,
    image_link: imageUrl,
    image_url: imageUrl,
    link: productUrl,
    url: productUrl,
    availability: product.status === 'published' ? 'in stock' : 'out of stock',
    brand: 'Móveis Morante',
    condition: product.is_salvado ? 'refurbished' : 'new',
    custom_label_1: formatDecimalPrice(currentPrice),
    custom_label_2: oldPriceFormatted,
    custom_label_3: oppName || undefined,
  };

  if (hasPromo) {
    data.sale_price = `${promoPrice.toFixed(2)} BRL`;
  }

  if (additionalImageUrls.length > 0) {
    data.additional_image_link = additionalImageUrls
      .map(normalizeMetaImageUrl)
      .filter(Boolean)
      .join(',');
  }

  return data;
}

export function formatDecimalPrice(val: any): string {
  if (val === null || val === undefined || val === '') return '';
  const num = Number(val);
  if (isNaN(num)) return '';
  return num.toFixed(2).replace('.', ',');
}

export function stripHtml(html: string): string {
  if (!html) return '';
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<\/div\s*>/gi, '\n')
    .replace(/<\/li\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
  return text.trim();
}
