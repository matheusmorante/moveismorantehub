import type { VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { META_ADS_CREATIVE_CATALOG_ID } from '../../../shared-utils/metaCatalogIds.js';
import { hasErpPermission, type AuthenticatedErpRequest } from './authenticatedErpRequest.js';

const OPERATIONS = ['list_image_template_sets', 'list_image_template_products', 'read_image_template_product'] as const;
const PAGE_SIZE = 15;
const metaId = z.string().regex(/^\d{1,32}$/);
const cursor = z.string().regex(/^[A-Za-z0-9_.=+\/-]{1,2048}$/);
const target = z.enum(['ads', 'whatsapp']).default('ads');
const inputSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal(OPERATIONS[0]), target, after: cursor.optional() }),
  z.object({ operation: z.literal(OPERATIONS[1]), target, after: cursor.optional(), setId: metaId.optional() }),
  z.object({ operation: z.literal(OPERATIONS[2]), target, productId: metaId }),
]);
const entrySchema = z.object({ id: metaId, name: z.string(), retailer_id: z.string().optional() });
const pageSchema = z.object({
  data: z.array(entrySchema).max(PAGE_SIZE),
  paging: z.object({ next: z.string().optional(), cursors: z.object({ after: cursor.optional() }).optional() }).optional(),
});
const ownerSchema = z.object({ product_catalog: z.object({ id: metaId }) });
const productSchema = entrySchema.extend({
  ...ownerSchema.shape,
  image_url: z.string().nullish(), additional_image_urls: z.array(z.string().nullable()).nullish(),
  brand: z.string().nullish(), description: z.string().nullish(), product_type: z.string().nullish(),
  currency: z.string().nullish(), availability: z.string().nullish(),
  price: z.union([z.string(), z.number()]).nullish(), sale_price: z.union([z.string(), z.number()]).nullish(),
  sale_price_start_date: z.string().nullish(), sale_price_end_date: z.string().nullish(),
  custom_label_0: z.string().nullish(), custom_label_1: z.string().nullish(), custom_label_2: z.string().nullish(),
  custom_label_3: z.string().nullish(), custom_label_4: z.string().nullish(),
});
const productFields = Object.keys(productSchema.shape).map((key) => key === 'product_catalog' ? 'product_catalog{id}' : key).join(',');

export function isImageTemplatePreviewOperation(operation: unknown) {
  return OPERATIONS.some((value) => value === operation);
}

class CatalogReadError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export async function handleMetaImageTemplatePreview(
  body: unknown, context: AuthenticatedErpRequest, res: VercelResponse, token: string, graphVersion: string,
) {
  if (!hasErpPermission(context, 'manageCatalogImageTemplates')) {
    return res.status(403).json({ error: 'Sem permissão para consultar a prévia de modelos.' });
  }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return res.status(400).json({ error: 'Seleção de prévia inválida.' });
  const input = parsed.data;
  const configured = context.whatsappConfig as { catalogId?: unknown } | null | undefined;
  const catalog = metaId.safeParse(input.target === 'ads' ? META_ADS_CREATIVE_CATALOG_ID : configured?.catalogId);
  if (!catalog.success) return res.status(400).json({ error: 'Este catálogo não está configurado no ERP.' });
  const catalogId = catalog.data;

  const signal = AbortSignal.timeout(17_000);
  const read = async (path: string, params: Record<string, string>) => {
    const response = await fetch(`https://graph.facebook.com/${graphVersion}/${path}?${new URLSearchParams(params)}`, {
      method: 'GET', headers: { Authorization: `Bearer ${token}` }, signal,
    });
    const data = await response.json();
    if (!response.ok || data?.error) {
      const denied = [10, 190, 200].includes(Number(data?.error?.code)) || response.status === 403;
      throw new CatalogReadError(denied ? 403 : 502, denied
        ? 'A integração da Meta não tem acesso ao catálogo selecionado.'
        : 'A Meta não conseguiu consultar o catálogo selecionado.');
    }
    return data as unknown;
  };

  try {
    if (input.operation === 'read_image_template_product') {
      const data = productSchema.parse(await read(input.productId, { fields: productFields, catalog_id: catalogId }));
      if (data.product_catalog.id !== catalogId || data.id !== input.productId) {
        throw new CatalogReadError(404, 'Produto fora do catálogo selecionado.');
      }
      const { product_catalog: _owner, additional_image_urls: additionalImages, ...product } = data;
      return res.status(200).json({ ...product, additional_image_urls: additionalImages?.slice(0, 3) });
    }

    const isSets = input.operation === 'list_image_template_sets';
    const setId = !isSets ? input.setId : undefined;
    if (setId) {
      const owner = ownerSchema.safeParse(await read(setId, { fields: 'product_catalog{id}' }));
      if (!owner.success || owner.data.product_catalog.id !== catalogId) {
        throw new CatalogReadError(404, 'Conjunto fora do catálogo selecionado.');
      }
    }

    const page = pageSchema.parse(await read(`${setId ?? catalogId}/${isSets ? 'product_sets' : 'products'}`, {
      fields: isSets ? 'id,name' : 'id,name,retailer_id', limit: String(PAGE_SIZE),
      ...(input.after ? { after: input.after } : {}),
    }));
    return res.status(200).json({ rows: page.data, nextCursor: page.paging?.next ? page.paging.cursors?.after ?? null : null });
  } catch (error) {
    if (error instanceof CatalogReadError) return res.status(error.status).json({ error: error.message });
    return res.status(signal.aborted ? 504 : 502).json({ error: signal.aborted
      ? 'A consulta à Meta demorou demais.' : 'Não foi possível ler a resposta do catálogo selecionado.' });
  }
}
