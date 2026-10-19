/**
 * Client HTTP para a API de lotes do Meta Catalog (Graph API items_batch).
 * Responsabilidade única: envio/consulta de lotes de produtos para a Meta.
 */
import { normalizeMetaImageUrl } from './formatting';
import type { MetaCredentials } from './credentials';
import { getMetaCatalogCredentials } from './credentials';

export const META_GRAPH_VERSION = 'v26.0';

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

export interface MetaBatchResult {
  success: boolean;
  message: string;
  handles?: string[];
  totalSent?: number;
  chunks?: number;
  errors?: unknown[];
}

/**
 * Sanitiza um item de lote para garantir que todos os campos obrigatórios
 * da API Meta estejam presentes e normalizados.
 */
function sanitizeBatchItem(req: MetaBatchRequest): MetaBatchRequest {
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

  const normalizedData: Record<string, unknown> = {
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
    data: normalizedData as Partial<MetaProductData>,
  };
}

/**
 * Envia um lote de atualizações de produtos para a API do Catálogo da Meta (items_batch).
 * Divide automaticamente em lotes de até 250 itens para respeitar o limite de 300 da Meta.
 */
export async function sendMetaCatalogBatch(
  requests: MetaBatchRequest[],
  overrideCredentials?: MetaCredentials
): Promise<MetaBatchResult> {
  const credentials = overrideCredentials ?? (await getMetaCatalogCredentials());

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
  const errors: unknown[] = [];
  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${catalogId}/items_batch`;

  for (let i = 0; i < requests.length; i += BATCH_SIZE) {
    const chunk = requests.slice(i, i + BATCH_SIZE).map(sanitizeBatchItem);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ item_type: 'PRODUCT_ITEM', requests: chunk }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('[MetaCatalog] Erro no lote da API Meta:', result);
        errors.push((result as any).error || result);
      } else if (result.handles && Array.isArray(result.handles)) {
        handles.push(...result.handles);
      }
    } catch (chunkErr: unknown) {
      const err = chunkErr as Error;
      console.error('[MetaCatalog] Erro de rede ao conectar com a API da Meta:', err);
      errors.push({ message: err.message });
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
 * Consulta o status de processamento assíncrono de um lote enviado à Meta.
 */
export async function checkMetaBatchStatus(
  handle: string,
  overrideCredentials?: MetaCredentials
): Promise<unknown> {
  const credentials = overrideCredentials ?? (await getMetaCatalogCredentials());
  if (!credentials) {
    throw new Error('Credenciais da Meta não configuradas.');
  }

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${credentials.catalogId}/check_batch_request_status?handle=${encodeURIComponent(handle)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${credentials.accessToken}` },
  });

  const data = await response.json();
  if (!response.ok || (data as any).error) {
    throw new Error((data as any).error?.message || 'Erro ao consultar status do lote na Meta.');
  }

  return data;
}
