import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateErpRequest, hasErpPermission } from '../erp/api/_lib/authenticatedErpRequest.js';
import { supportCustomerSendSchema } from '../shared-utils/customerSupportFormSchemas.js';
import { buildProductCatalogUrl } from '../shared-utils/productCatalogLinks.js';
import { buildProductMetaCatalogSyncItems } from '../shared-utils/productMetaCatalogSyncItems.js';
import { buildWhatsAppNativeCatalogMessage } from '../shared-utils/whatsappNativeCatalogMessage.js';
import type { ProductCatalogSendSelection } from '../shared-utils/productCatalogFormSchemas.js';
import { getSupabaseSecretKey } from './supabaseSecretKey.js';

const GRAPH_VERSION = 'v26.0';
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const CARE_WINDOW_MS = 24 * 60 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ContentType = 'image' | 'video' | 'audio' | 'document' | 'sticker';
type ResolvedCatalogMessage = {
  text: string;
  nativeProducts?: Array<{ retailerId: string; name: string }>;
};
type SendPayload = {
  conversationId: string;
  message: string;
  replyToWamid?: string;
  forwarded?: boolean;
  contact?: { name: string; phone: string };
  file?: { bytes: Buffer; name: string; mimeType: string };
  catalogSelection?: ProductCatalogSendSelection;
};

class RequestBodyError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
  }
}

const withTimeout = async <T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), timeoutMs); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const normalizePhone = (value: string) => value.replace(/\D/g, '');

const formatCatalogPrice = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const isCatalogTestProduct = (product: Record<string, any>) => {
  const specs = product.technical_specs && typeof product.technical_specs === 'object'
    ? product.technical_specs
    : {};
  return [specs.is_test, specs.isTest, specs.testArtifact?.is_test, specs.testArtifact?.isTest]
    .some((value) => String(value).toLowerCase() === 'true');
};

async function resolveCatalogMessage(
  userDb: any,
  selection: ProductCatalogSendSelection,
  customMessage: string,
): Promise<ResolvedCatalogMessage> {
  const nativeDelivery = selection.deliveryMode === 'native';
  if (nativeDelivery && (selection.bulkScope || selection.items.length > 30 || selection.hidePrices)) {
    throw new RequestBodyError('Cards nativos aceitam até 30 produtos individuais e exibem o preço publicado na Meta. Use o link para listas maiores ou sem preço.', 400);
  }

  const productIds = Array.from(new Set(selection.items.map((item) => item.productId)));
  let products: Record<string, any>[] = [];
  if (productIds.length) {
    const productResult = await withTimeout<any>(userDb.from('products')
      .select('id,name,marketplace_title,description,slug,unit_price,price,promo_price,brand,active,is_draft,status,deleted,deleted_at,item_type,technical_specs,opportunity_id,stock,images,code,is_salvado,product_kind,material,condition,product_categories(categories(name,type))')
      .in('id', productIds)
      .eq('active', true)
      .eq('status', 'published')
      .is('deleted_at', null)
      .or('is_draft.is.null,is_draft.eq.false')
      .or('deleted.is.null,deleted.eq.false')
      .or('item_type.is.null,item_type.neq.service'), 12_000);
    if (productResult.error) throw new RequestBodyError('Não foi possível validar os produtos selecionados.', 503);
    products = (productResult.data || []).filter((product: Record<string, any>) => !isCatalogTestProduct(product));
    if (products.length !== productIds.length) {
      throw new RequestBodyError('Um ou mais produtos foram ocultados ou ficaram indisponíveis. Atualize a seleção antes de enviar.', 409);
    }
  }

  const productById = new Map(products.map((product) => [String(product.id), product]));
  const variationIds = Array.from(new Set(selection.items.flatMap((item) => item.variationId ? [item.variationId] : [])));
  let variations: Record<string, any>[] = [];
  if (variationIds.length || nativeDelivery) {
    const variationResult = await withTimeout<any>(userDb.from('product_variations')
      .select('id,product_id,status,active,name,sku,image_url,price,promo_price,stock,attributes,description,use_parent_price,use_parent_promo_price,use_parent_name,use_parent_description')
      .in(nativeDelivery ? 'product_id' : 'id', nativeDelivery ? productIds : variationIds), 12_000);
    if (variationResult.error) throw new RequestBodyError('Não foi possível validar as variações selecionadas.', 503);
    variations = (variationResult.data || []).filter((variation: Record<string, any>) =>
      nativeDelivery || (variation.active === true && (!variation.status || variation.status === 'published'))
    );
  }
  const variationById = new Map(variations.map((variation) => [String(variation.id), variation]));

  const resolvedItems = selection.items.map((item) => {
    const product = productById.get(item.productId);
    const variation = item.variationId ? variationById.get(item.variationId) : null;
    if (!product || (item.variationId && (!variation || String(variation.product_id) !== item.productId))) {
      throw new RequestBodyError('Uma variação foi ocultada ou ficou indisponível. Atualize a seleção antes de enviar.', 409);
    }
    const basePrice = Number(product.unit_price ?? product.price ?? 0);
    const basePromo = Number(product.promo_price ?? 0);
    const price = variation && variation.use_parent_price === false ? Number(variation.price ?? 0) : basePrice;
    const promoPrice = variation && variation.use_parent_promo_price === false ? Number(variation.promo_price ?? 0) : basePromo;
    const effectivePrice = promoPrice > 0 ? promoPrice : price;
    return {
      productId: item.productId,
      variationId: item.variationId || null,
      name: String(product.marketplace_title || product.name || 'Produto'),
      variationName: variation ? String(variation.name || '') : '',
      price: Number.isFinite(effectivePrice) && effectivePrice >= 0 ? effectivePrice : 0,
    };
  });

  if (nativeDelivery) {
    const retailerIdByItemId = new Map<string, string>();
    for (const product of products) {
      const productVariations = variations.filter((variation) => String(variation.product_id) === String(product.id));
      const syncItems = buildProductMetaCatalogSyncItems(product as any, productVariations as any, []);
      syncItems.forEach((item) => {
        if (!('deleted' in item) && item.status === 'published' && item.code.trim()) {
          retailerIdByItemId.set(item.id, item.code.trim());
        }
      });
    }

    const nativeProducts = resolvedItems.map((item) => {
      const catalogItemId = item.variationId || item.productId;
      const retailerId = retailerIdByItemId.get(catalogItemId);
      if (!retailerId) {
        throw new RequestBodyError('Um produto ou variação não está publicado no catálogo da Meta. Sincronize o catálogo e selecione novamente.', 409);
      }
      return {
        retailerId,
        name: [item.name, item.variationName].filter(Boolean).join(' · '),
      };
    });
    const bodyText = customMessage.trim() || (nativeProducts.length === 1
      ? 'Confira este produto do nosso catálogo:'
      : `Separei ${nativeProducts.length} produtos do nosso catálogo para você:`);
    if (bodyText.length > 1024) throw new RequestBodyError('A mensagem que acompanha os cards deve ter até 1024 caracteres.', 413);
    return { text: bodyText, nativeProducts };
  }

  let categoryName = '';
  let catalogCount = resolvedItems.length;
  if (selection.bulkScope) {
    const scope = selection.bulkScope;
    const scopeResult = await withTimeout<any>(userDb.rpc('customer_support_catalog_summary_page', {
      p_category_id: scope.filters.categoryId,
      p_search: scope.filters.search,
      p_brand: scope.filters.brand,
      p_page: 1,
      p_page_size: 1,
      p_excluded_product_ids: scope.excludedProductIds,
      p_include_product_ids: productIds,
      p_include_only: false,
    }), 15_000);
    if (scopeResult.error || !scopeResult.data || typeof scopeResult.data !== 'object') {
      throw new RequestBodyError('Não foi possível recalcular a lista selecionada. Tente novamente.', 503);
    }
    catalogCount = Number(scopeResult.data.totalCount) || 0;
    categoryName = typeof scopeResult.data.categoryName === 'string' ? scopeResult.data.categoryName : '';
    if (!catalogCount) throw new RequestBodyError('Nenhum produto continua disponível nesta seleção. Atualize os filtros.', 409);
  }

  const catalogUrl = buildProductCatalogUrl({
    items: selection.items,
    bulkScope: selection.bulkScope,
    hidePrices: selection.hidePrices,
  });
  if (!catalogUrl) throw new RequestBodyError('A seleção ficou grande demais para compartilhar em um link. Reduza os itens ou as exclusões.', 413);

  const catalogText = selection.bulkScope || resolvedItems.length > 8
    ? `Separei ${catalogCount} produto${catalogCount === 1 ? '' : 's'}${categoryName ? ` de ${categoryName}` : ''} para você.\n\nVeja a seleção completa: ${catalogUrl}`
    : [
      'Separei estas opções para você:',
      ...resolvedItems.map((item) => `• ${[item.name, item.variationName].filter(Boolean).join(' · ')}${selection.hidePrices ? '' : ` — ${formatCatalogPrice(item.price)}`}`),
      `Veja fotos e mais detalhes: ${catalogUrl}`,
    ].join('\n');
  const message = [customMessage.trim(), catalogText].filter(Boolean).join('\n\n');
  if (message.length > 4096) throw new RequestBodyError('O texto e o link do catálogo excedem o limite de 4096 caracteres. Reduza a seleção ou a mensagem.', 413);
  return { text: message };
}

async function readRequestBody(req: VercelRequest, maxBytes: number): Promise<Buffer> {
  const request = req as VercelRequest & { rawBody?: Buffer };
  if (Buffer.isBuffer(request.rawBody)) {
    if (request.rawBody.byteLength > maxBytes) throw new RequestBodyError('Arquivo excede o limite de 4 MB.', 413);
    return request.rawBody;
  }

  const chunks: Buffer[] = [];
  let byteLength = 0;
  for await (const value of req as unknown as AsyncIterable<Buffer | string>) {
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
    byteLength += chunk.byteLength;
    if (byteLength > maxBytes) throw new RequestBodyError('Arquivo excede o limite de 4 MB.', 413);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, byteLength);
}

function parseMultipart(body: Buffer, contentTypeHeader: string): SendPayload {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentTypeHeader);
  const boundary = (match?.[1] || match?.[2] || '').trim();
  if (!boundary || boundary.length > 70 || /[\r\n]/.test(boundary)) {
    throw new RequestBodyError('Anexo inválido.', 400);
  }

  const marker = Buffer.from(`--${boundary}`);
  const separator = Buffer.from('\r\n\r\n');
  const nextPartMarker = Buffer.from(`\r\n--${boundary}`);
  const fields = new Map<string, string>();
  let file: SendPayload['file'];
  let cursor = body.indexOf(marker);

  while (cursor >= 0) {
    cursor += marker.length;
    if (body.subarray(cursor, cursor + 2).toString() === '--') break;
    if (body.subarray(cursor, cursor + 2).toString() !== '\r\n') {
      throw new RequestBodyError('Anexo inválido.', 400);
    }
    cursor += 2;

    const headerEnd = body.indexOf(separator, cursor);
    if (headerEnd < 0) throw new RequestBodyError('Anexo inválido.', 400);
    const headers = body.subarray(cursor, headerEnd).toString('utf8');
    const contentStart = headerEnd + separator.length;
    const partEnd = body.indexOf(nextPartMarker, contentStart);
    if (partEnd < 0) throw new RequestBodyError('Anexo inválido.', 400);
    const content = body.subarray(contentStart, partEnd);
    const disposition = /content-disposition:\s*form-data;([^\r\n]+)/i.exec(headers)?.[1] || '';
    const fieldName = /(?:^|;)\s*name="([^"]+)"/i.exec(disposition)?.[1] || '';
    const fileName = /(?:^|;)\s*filename="([^"]*)"/i.exec(disposition)?.[1];

    if (!fieldName) throw new RequestBodyError('Anexo inválido.', 400);
    if (fileName !== undefined) {
      if (file || !fileName.trim()) throw new RequestBodyError('Envie apenas um arquivo por mensagem.', 400);
      const mimeType = /^content-type:\s*([^\r\n]+)/im.exec(headers)?.[1]?.trim().toLowerCase() || 'application/octet-stream';
      file = { bytes: Buffer.from(content), name: fileName, mimeType };
    } else {
      if (fields.has(fieldName) || content.byteLength > 8_000) throw new RequestBodyError('Solicitação inválida.', 400);
      fields.set(fieldName, content.toString('utf8'));
    }
    cursor = partEnd + 2;
  }

  const conversationId = fields.get('conversationId')?.trim() || '';
  const message = fields.get('message') || '';
  const replyToWamid = fields.get('replyToWamid')?.trim() || '';
  const forwarded = fields.get('forwarded') === 'true';
  if (!UUID_PATTERN.test(conversationId)) throw new RequestBodyError('Conversa inválida.', 400);
  if (replyToWamid.length > 255) throw new RequestBodyError('Mensagem citada inválida.', 400);
  if (!file) throw new RequestBodyError('Selecione um arquivo para enviar.', 400);
  return { conversationId, message, file, ...(replyToWamid ? { replyToWamid } : {}), ...(forwarded ? { forwarded: true } : {}) };
}

function inspectWebP(bytes: Buffer): { animated: boolean } | null {
  if (bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP'
    || bytes.readUInt32LE(4) + 8 !== bytes.length) return null;

  let cursor = 12;
  let hasImageChunk = false;
  let hasAnimationFlag = false;
  let hasAnimationChunk = false;
  let hasAnimationFrame = false;
  let dimensions: { width: number; height: number } | null = null;
  const readUInt24LE = (offset: number) => bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
  while (cursor + 8 <= bytes.length) {
    const type = bytes.toString('ascii', cursor, cursor + 4);
    const size = bytes.readUInt32LE(cursor + 4);
    const dataOffset = cursor + 8;
    const chunkEnd = cursor + 8 + size;
    const paddedChunkEnd = chunkEnd + (size % 2);
    if (paddedChunkEnd > bytes.length) return null;
    if (type === 'VP8X') {
      if (size !== 10) return null;
      hasAnimationFlag = (bytes[dataOffset] & 0x02) !== 0;
      dimensions = { width: 1 + readUInt24LE(dataOffset + 4), height: 1 + readUInt24LE(dataOffset + 7) };
    } else if (type === 'VP8 ') {
      if (size < 10 || bytes[dataOffset + 3] !== 0x9d || bytes[dataOffset + 4] !== 0x01 || bytes[dataOffset + 5] !== 0x2a) return null;
      hasImageChunk = true;
      dimensions ||= {
        width: bytes.readUInt16LE(dataOffset + 6) & 0x3fff,
        height: bytes.readUInt16LE(dataOffset + 8) & 0x3fff,
      };
    } else if (type === 'VP8L') {
      if (size < 5 || bytes[dataOffset] !== 0x2f) return null;
      hasImageChunk = true;
      dimensions ||= {
        width: 1 + bytes[dataOffset + 1] + ((bytes[dataOffset + 2] & 0x3f) << 8),
        height: 1 + (bytes[dataOffset + 2] >> 6) + (bytes[dataOffset + 3] << 2) + ((bytes[dataOffset + 4] & 0x0f) << 10),
      };
    } else if (type === 'ANIM') {
      hasAnimationChunk = true;
    } else if (type === 'ANMF') {
      if (size < 16) return null;
      hasAnimationFrame = true;
    }
    cursor = paddedChunkEnd;
  }
  if (cursor !== bytes.length || !dimensions || dimensions.width !== 512 || dimensions.height !== 512) return null;
  if (hasAnimationFlag || hasAnimationChunk || hasAnimationFrame) {
    return hasAnimationFlag && hasAnimationChunk && hasAnimationFrame ? { animated: true } : null;
  }
  return hasImageChunk ? { animated: false } : null;
}

export function classifyWhatsAppSupportFile(file: NonNullable<SendPayload['file']>): { type: ContentType; mimeType: string } {
  const normalizedMime = file.mimeType.split(';')[0].trim();
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const imageTypes = new Set(['image/jpeg', 'image/png']);
  const videoTypes = new Set(['video/mp4', 'video/3gpp']);
  const audioTypes = new Set(['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg']);
  const documentTypes = new Set([
    'text/plain',
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]);

  const mimeByExtension: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    mp4: 'video/mp4', '3gp': 'video/3gpp',
    aac: 'audio/aac', m4a: 'audio/mp4', mp3: 'audio/mpeg', amr: 'audio/amr', ogg: 'audio/ogg',
    txt: 'text/plain', pdf: 'application/pdf', doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    webp: 'image/webp',
  };
  const mimeType = normalizedMime === 'application/octet-stream' || !normalizedMime
    ? mimeByExtension[extension] || ''
    : normalizedMime;

  if (imageTypes.has(mimeType)) return { type: 'image', mimeType };
  if (mimeType === 'image/webp') {
    const webp = inspectWebP(file.bytes);
    if (!webp) throw new RequestBodyError('Figurinha inválida: o WebP precisa ser válido e ter 512 × 512 pixels.', 415);
    const maxBytes = webp.animated ? 500 * 1024 : 100 * 1024;
    if (file.bytes.byteLength > maxBytes) {
      throw new RequestBodyError(webp.animated
        ? 'Figurinhas animadas devem ter até 500 KB.'
        : 'Figurinhas estáticas devem ter até 100 KB.', 413);
    }
    return { type: 'sticker', mimeType };
  }
  if (videoTypes.has(mimeType)) return { type: 'video', mimeType };
  if (audioTypes.has(mimeType)) return { type: 'audio', mimeType };
  if (documentTypes.has(mimeType)) return { type: 'document', mimeType };
  throw new RequestBodyError('Formato não aceito pelo WhatsApp. Use JPG, PNG, WebP de figurinha, MP4, áudio OGG/MP3/M4A, PDF, DOCX, XLSX ou TXT.', 415);
}

function metaErrorMessage(data: Record<string, any>): string {
  const code = Number(data.error?.code);
  if (code === 131047) return 'A janela de atendimento de 24 horas expirou. Atualize a conversa antes de tentar novamente.';
  if (code === 131030) return 'O WhatsApp não reconheceu este telefone como destinatário autorizado.';
  if (code === 131026) return 'O WhatsApp não conseguiu entregar a mensagem a este contato.';
  return 'O WhatsApp recusou o envio. Confira o arquivo e a conexão do canal.';
}

function responseJson(res: VercelResponse, status: number, body: Record<string, unknown>) {
  return res.status(status).json(body);
}

export function createWhatsAppSupportSendHandler(dependencies: { fetchMeta?: typeof fetch } = {}) {
  const fetchMeta = dependencies.fetchMeta || ((input, init) => globalThis.fetch(input, init));

  return async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return responseJson(res, 405, { error: 'Método não permitido.' });

    const rawContentType = String(req.headers['content-type'] || '');
    const contentType = rawContentType.toLowerCase();
    let payload: SendPayload;
    try {
      const body = await readRequestBody(req, MAX_UPLOAD_BYTES + 32_000);
      if (contentType.includes('multipart/form-data')) {
        // Multipart boundaries are case-sensitive; preserve the original header value.
        payload = parseMultipart(body, rawContentType);
      } else if (contentType.includes('application/json')) {
        if (body.byteLength > 16_000) return responseJson(res, 413, { error: 'Solicitação excede o tamanho permitido.' });
        const parsed = body.length ? JSON.parse(body.toString('utf8')) : {};
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new RequestBodyError('Solicitação inválida.', 400);
        const conversationId = typeof parsed.conversationId === 'string' ? parsed.conversationId.trim() : '';
        const message = typeof parsed.message === 'string' ? parsed.message : '';
        const replyToWamid = typeof parsed.replyToWamid === 'string' ? parsed.replyToWamid.trim() : '';
        const forwarded = parsed.forwarded === true;
        const contact = parsed.contact && typeof parsed.contact === 'object' && !Array.isArray(parsed.contact)
          ? parsed.contact as { name?: unknown; phone?: unknown }
          : undefined;
        const catalogSelection = parsed.catalogSelection;
        if (!UUID_PATTERN.test(conversationId)) throw new RequestBodyError('Conversa inválida.', 400);
        let normalizedContact: SendPayload['contact'];
        if (contact) {
          const name = typeof contact.name === 'string' ? contact.name.trim() : '';
          const phone = typeof contact.phone === 'string' ? normalizePhone(contact.phone) : '';
          if (!name || name.length > 100 || !/^\d{10,15}$/.test(phone)) {
            throw new RequestBodyError('Contato inválido.', 400);
          }
          normalizedContact = { name, phone };
        }
        const sendInput = supportCustomerSendSchema.safeParse({
          conversationId,
          message,
          ...(replyToWamid ? { replyToWamid } : {}),
          ...(forwarded ? { forwarded: true } : {}),
          attachmentType: normalizedContact ? 'contact' : catalogSelection ? 'catalog' : 'text',
          ...(normalizedContact ? { contactName: normalizedContact.name, contactPhone: normalizedContact.phone } : {}),
          ...(catalogSelection !== undefined ? { catalogSelection } : {}),
        });
        if (!sendInput.success) throw new RequestBodyError(sendInput.error.issues[0]?.message || 'Solicitação inválida.', 400);
        payload = {
          conversationId: sendInput.data.conversationId,
          message: sendInput.data.message,
          ...(sendInput.data.replyToWamid ? { replyToWamid: sendInput.data.replyToWamid } : {}),
          ...(sendInput.data.forwarded ? { forwarded: true } : {}),
          ...(normalizedContact ? { contact: normalizedContact } : {}),
          ...(sendInput.data.catalogSelection ? { catalogSelection: sendInput.data.catalogSelection } : {}),
        };
      } else {
        return responseJson(res, 415, { error: 'Formato de solicitação inválido.' });
      }
    } catch (error) {
      if (error instanceof RequestBodyError) return responseJson(res, error.statusCode, { error: error.message });
      return responseJson(res, 400, { error: 'Solicitação inválida.' });
    }

    let message = payload.message.trim();
    if ((!message && !payload.file && !payload.contact && !payload.catalogSelection) || message.length > 4096) {
      return responseJson(res, 400, { error: 'Escreva uma mensagem ou adicione um anexo. O texto pode ter até 4096 caracteres.' });
    }
    if (payload.file && payload.file.bytes.byteLength > MAX_UPLOAD_BYTES) {
      return responseJson(res, 413, { error: 'Cada arquivo deve ter no máximo 4 MB nesta central.' });
    }
    if (payload.file && message.length > 1024) {
      return responseJson(res, 400, { error: 'A legenda do anexo pode ter até 1024 caracteres.' });
    }

    const context = await authenticateErpRequest(req, res).catch(() => null);
    if (!context) return;
    if (!hasErpPermission(context, 'sendCustomerSupportMessages')) {
      return responseJson(res, 403, { error: 'Você não tem permissão para enviar mensagens pela Central.' });
    }

    try {
      const permission = await withTimeout(context.userDb.rpc('customer_support_can_view'), 12_000);
      if (permission.error) return responseJson(res, 503, { error: 'Não foi possível validar o acesso à Central.' });
      if (permission.data !== true) return responseJson(res, 403, { error: 'Sem permissão para usar a Central de Atendimento.' });

      const conversationResult = await withTimeout(context.userDb
        .from('whatsapp_conversations')
        .select('id,business_phone_number_id,contact_phone,last_customer_message_at,is_archived')
        .eq('id', payload.conversationId)
        .maybeSingle(), 12_000);
      if (conversationResult.error) return responseJson(res, 503, { error: 'Não foi possível validar a conversa.' });
      const conversation = conversationResult.data;
      if (!conversation) return responseJson(res, 404, { error: 'Conversa não encontrada.' });
      if (conversation.is_archived) return responseJson(res, 409, { error: 'Reabra o atendimento antes de enviar uma mensagem.' });

      let replyToMessageId: string | null = null;
      if (payload.replyToWamid) {
        const replyTargetResult = await withTimeout<any>(context.userDb.from('whatsapp_messages')
          .select('id,message_type,text_content,raw_payload')
          .eq('conversation_id', payload.conversationId)
          .eq('api_message_id', payload.replyToWamid)
          .maybeSingle(), 12_000);
        if (replyTargetResult.error) return responseJson(res, 503, { error: 'Não foi possível validar a mensagem citada.' });
        const isLegacyRevocation = typeof replyTargetResult.data?.text_content === 'string'
          && /a central ainda não consegue exibir este tipo de mensagem\s*\(\s*revoke\s*\)\./i.test(replyTargetResult.data.text_content);
        const providerMessageType = replyTargetResult.data?.raw_payload?.provider_message_type;
        const isNonReplyableProviderEvent = ['reaction', 'system', 'request_welcome'].includes(providerMessageType);
        if (!replyTargetResult.data || ['internal_note', 'system_event', 'deleted'].includes(replyTargetResult.data.message_type)
          || isLegacyRevocation || isNonReplyableProviderEvent) {
          return responseJson(res, 400, { error: 'A mensagem selecionada não pode ser respondida nesta conversa.' });
        }
        replyToMessageId = String(replyTargetResult.data.id);
      }

      const lastCustomerMessageAt = Date.parse(String(conversation.last_customer_message_at || ''));
      const elapsed = Date.now() - lastCustomerMessageAt;
      if (!Number.isFinite(lastCustomerMessageAt) || elapsed < 0 || elapsed >= CARE_WINDOW_MS) {
        return responseJson(res, 403, { error: 'A janela de atendimento de 24 horas está fechada. Aguarde uma nova mensagem do cliente.' });
      }

      const testArtifactResult = await withTimeout(context.userDb
        .from('whatsapp_messages')
        .select('id')
        .eq('conversation_id', payload.conversationId)
        .contains('raw_payload', { testArtifact: { is_test: true } })
        .limit(1), 12_000);
      if (testArtifactResult.error) return responseJson(res, 503, { error: 'Não foi possível validar a origem da conversa.' });
      if ((testArtifactResult.data || []).length) return responseJson(res, 403, { error: 'Conversas de teste não podem enviar mensagens a clientes.' });

      let nativeProducts: ResolvedCatalogMessage['nativeProducts'];
      if (payload.catalogSelection) {
        const resolvedCatalog = await resolveCatalogMessage(context.userDb, payload.catalogSelection, message);
        message = resolvedCatalog.text;
        nativeProducts = resolvedCatalog.nativeProducts;
      }

      const settingsResult = await withTimeout(context.userDb
        .from('settings')
        .select('whatsappConfig:data->whatsappConfig')
        .eq('id', 'app')
        .maybeSingle(), 12_000);
      if (settingsResult.error) return responseJson(res, 503, { error: 'Não foi possível carregar a configuração do WhatsApp.' });
      const whatsappConfig = settingsResult.data?.whatsappConfig as { phoneNumberId?: unknown; catalogId?: unknown } | null;
      const phoneNumberId = typeof whatsappConfig?.phoneNumberId === 'string' ? whatsappConfig.phoneNumberId.trim() : '';
      const catalogId = typeof whatsappConfig?.catalogId === 'string' ? whatsappConfig.catalogId.trim() : '';
      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || '';
      if (!/^\d{1,32}$/.test(phoneNumberId) || phoneNumberId !== conversation.business_phone_number_id || !accessToken) {
        return responseJson(res, 503, { error: 'O canal WhatsApp desta conversa não está conectado.' });
      }

      const recipient = normalizePhone(String(conversation.contact_phone || ''));
      if (!/^\d{10,15}$/.test(recipient)) return responseJson(res, 400, { error: 'Telefone da conversa inválido.' });

      const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim() || '';
      const supabaseSecret = getSupabaseSecretKey();
      if (!supabaseUrl || !supabaseSecret) return responseJson(res, 503, { error: 'Persistência do histórico indisponível.' });
      const adminDb = createClient(supabaseUrl, supabaseSecret, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const sendAt = new Date().toISOString();
      let messageType: ContentType | 'text' | 'contacts' | 'interactive' = payload.contact ? 'contacts' : 'text';
      let mediaId: string | null = null;
      let mediaMimeType: string | null = null;
      let mediaFilename: string | null = null;
      let graphPayload: Record<string, unknown>;
      let storedText = message;

      if (payload.contact) {
        graphPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: 'contacts',
          contacts: [{
            name: { formatted_name: payload.contact.name, first_name: payload.contact.name },
            phones: [{ phone: `+${payload.contact.phone}`, type: 'WORK' }],
          }],
        };
        storedText = `Contato compartilhado: ${payload.contact.name} (+${payload.contact.phone})`;
      } else if (payload.file) {
        const classified = classifyWhatsAppSupportFile(payload.file);
        const uploadForm = new FormData();
        uploadForm.set('messaging_product', 'whatsapp');
        uploadForm.set('type', classified.mimeType);
        uploadForm.set('file', new Blob([new Uint8Array(payload.file.bytes)], { type: classified.mimeType }), payload.file.name);
        const uploadController = new AbortController();
        const uploadTimeout = setTimeout(() => uploadController.abort(), 25_000);
        let uploadResponse: Response;
        try {
          uploadResponse = await fetchMeta(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/media`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
            body: uploadForm,
            signal: uploadController.signal,
          });
        } catch {
          return responseJson(res, uploadController.signal.aborted ? 504 : 502, {
            error: 'Não foi possível enviar o arquivo à Meta. O arquivo não foi enviado ao cliente.',
          });
        } finally {
          clearTimeout(uploadTimeout);
        }
        const uploadData = await uploadResponse.json().catch(() => ({})) as Record<string, any>;
        mediaId = typeof uploadData.id === 'string' ? uploadData.id : null;
        if (!uploadResponse.ok || !mediaId) {
          return responseJson(res, 502, { error: 'O WhatsApp não aceitou este arquivo. Confira o formato e o tamanho.' });
        }

        messageType = classified.type;
        mediaMimeType = classified.mimeType;
        mediaFilename = payload.file.name.slice(0, 255);
        const mediaKey = classified.type;
        graphPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: classified.type,
          [mediaKey]: {
            id: mediaId,
            ...(classified.type === 'document' ? { filename: mediaFilename } : {}),
            ...(classified.type !== 'sticker' && message ? { caption: message } : {}),
          },
        };
        storedText = classified.type === 'sticker' ? '[Figurinha]' : message || mediaFilename || `[${classified.type === 'image' ? 'Imagem' : classified.type === 'video' ? 'Vídeo' : classified.type === 'audio' ? 'Áudio' : 'Documento'}]`;
      } else if (nativeProducts) {
        if (!/^\d{1,32}$/.test(catalogId)) {
          return responseJson(res, 503, { error: 'Configure um catálogo da Meta vinculado ao WhatsApp antes de enviar cards nativos.' });
        }
        graphPayload = buildWhatsAppNativeCatalogMessage({
          recipient,
          catalogId,
          bodyText: message,
          retailerIds: nativeProducts.map((product) => product.retailerId),
        });
        messageType = 'interactive';
        storedText = [
          message,
          nativeProducts.length === 1
            ? `Produto do catálogo: ${nativeProducts[0].name}`
            : `Lista nativa com ${nativeProducts.length} produtos: ${nativeProducts.slice(0, 4).map((product) => product.name).join(', ')}`,
        ].filter(Boolean).join('\n\n');
      } else {
        graphPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: 'text',
          text: { body: message },
        };
      }

      if (payload.replyToWamid) graphPayload.context = { message_id: payload.replyToWamid };

      const sendController = new AbortController();
      const sendTimeout = setTimeout(() => sendController.abort(), 25_000);
      let graphResponse: Response;
      try {
        graphResponse = await fetchMeta(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(graphPayload),
          signal: sendController.signal,
        });
      } catch {
        return responseJson(res, sendController.signal.aborted ? 504 : 502, {
          error: 'Resultado do envio incerto. Atualize a conversa antes de tentar novamente.',
          outcomeUncertain: true,
        });
      } finally {
        clearTimeout(sendTimeout);
      }

      const graphData = await graphResponse.json().catch(() => ({})) as Record<string, any>;
      if (!graphResponse.ok) return responseJson(res, 502, {
        error: nativeProducts
          ? 'A Meta recusou o card nativo. Confira a conexão do canal, o catálogo vinculado e se os produtos estão sincronizados e publicados.'
          : metaErrorMessage(graphData),
        ...(graphResponse.status >= 500 ? { outcomeUncertain: true } : {}),
      });
      const apiMessageId = typeof graphData.messages?.[0]?.id === 'string' ? graphData.messages[0].id : '';
      if (!apiMessageId) {
        return responseJson(res, 502, {
          error: 'A Meta não confirmou o identificador da mensagem. Atualize a conversa antes de tentar novamente.',
          outcomeUncertain: true,
        });
      }

      const profileResult = await withTimeout(context.userDb.from('profiles').select('full_name').eq('id', context.userId).maybeSingle(), 8_000).catch(() => null);
      const authorName = String(profileResult?.data?.full_name || 'Atendente').slice(0, 100);
      try {
        const insertResult = await withTimeout(adminDb.from('whatsapp_messages').insert({
          conversation_id: payload.conversationId,
          api_message_id: apiMessageId,
          direction: 'outbound',
          message_type: messageType,
          text_content: storedText,
          media_id: mediaId,
          media_mime_type: mediaMimeType,
          media_filename: mediaFilename,
          media_caption: payload.file ? message || null : null,
          reply_to_message_id: replyToMessageId,
          reply_to_wamid: payload.replyToWamid || null,
          status: 'sent',
          raw_payload: {
            author_id: context.userId,
            author_name: authorName,
            origin: payload.forwarded ? 'customer_support_forward' : 'customer_support_composer',
            ...(payload.forwarded ? { forwarded: true } : {}),
          },
          timestamp: sendAt,
        }), 12_000);
        if (insertResult.error) throw new Error('insert failed');
        const conversationUpdate = await withTimeout(adminDb.from('whatsapp_conversations').update({
          last_message_text: storedText,
          last_message_at: sendAt,
          updated_at: sendAt,
        }).eq('id', payload.conversationId), 12_000);
        if (conversationUpdate.error) throw new Error('conversation update failed');
      } catch {
        return responseJson(res, 200, {
          accepted: true,
          persisted: false,
          apiMessageId,
          warning: 'A Meta aceitou a mensagem, mas o histórico não foi atualizado. Atualize a conversa e não reenvie este conteúdo.',
        });
      }

      return responseJson(res, 200, { accepted: true, persisted: true, apiMessageId });
    } catch (error) {
      if (error instanceof RequestBodyError) return responseJson(res, error.statusCode, { error: error.message });
      return responseJson(res, 503, { error: 'Não foi possível validar e preparar o envio. Tente novamente.' });
    }
  };
}

export default createWhatsAppSupportSendHandler();
