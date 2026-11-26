import type { VercelRequest } from '@vercel/node';
import { supportCustomerSendSchema } from '../../shared-utils/customerSupportFormSchemas.js';
import { RequestBodyError } from '../whatsappSupportRequestError.js';
import { parseMultipart, UUID_PATTERN, type SendPayload } from '../whatsappSupportSendRequest.js';

export const MAX_WHATSAPP_UPLOAD_BYTES = 4 * 1024 * 1024;

export const normalizePhone = (value: string) => value.replace(/\D/g, '');

async function readRequestBody(req: VercelRequest, maxBytes: number): Promise<Buffer> {
  const request = req as VercelRequest & { rawBody?: Buffer };
  if (Buffer.isBuffer(request.rawBody)) {
    if (request.rawBody.byteLength > maxBytes) {
      throw new RequestBodyError('Arquivo excede o limite de 4 MB.', 413);
    }
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

/** Lê e valida o corpo multipart ou JSON da requisição de envio do suporte WhatsApp. */
export async function parseWhatsAppSupportSendRequest(req: VercelRequest): Promise<SendPayload> {
  const rawContentType = String(req.headers['content-type'] || '');
  const contentType = rawContentType.toLowerCase();
  const body = await readRequestBody(req, MAX_WHATSAPP_UPLOAD_BYTES + 32_000);

  if (contentType.includes('multipart/form-data')) {
    // Multipart boundaries are case-sensitive; preserve the original header value.
    return parseMultipart(body, rawContentType);
  }
  if (!contentType.includes('application/json')) {
    throw new RequestBodyError('Formato de solicitação inválido.', 415);
  }
  if (body.byteLength > 16_000) {
    throw new RequestBodyError('Solicitação excede o tamanho permitido.', 413);
  }

  const parsed = body.length ? JSON.parse(body.toString('utf8')) : {};
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new RequestBodyError('Solicitação inválida.', 400);
  }

  const conversationId = typeof parsed.conversationId === 'string' ? parsed.conversationId.trim() : '';
  const message = typeof parsed.message === 'string' ? parsed.message : '';
  const aiSuggestionMessageId = typeof parsed.aiSuggestionMessageId === 'string'
    ? parsed.aiSuggestionMessageId.trim()
    : '';
  const replyToWamid = typeof parsed.replyToWamid === 'string' ? parsed.replyToWamid.trim() : '';
  const forwarded = parsed.forwarded === true;
  const contact = parsed.contact && typeof parsed.contact === 'object' && !Array.isArray(parsed.contact)
    ? (parsed.contact as { name?: unknown; phone?: unknown })
    : undefined;
  const catalogSelection = parsed.catalogSelection;

  if (!UUID_PATTERN.test(conversationId)) throw new RequestBodyError('Conversa inválida.', 400);
  if (aiSuggestionMessageId && !UUID_PATTERN.test(aiSuggestionMessageId)) {
    throw new RequestBodyError('Sugestão da IA inválida.', 400);
  }

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
    ...(normalizedContact
      ? { contactName: normalizedContact.name, contactPhone: normalizedContact.phone }
      : {}),
    ...(catalogSelection !== undefined ? { catalogSelection } : {}),
  });
  if (!sendInput.success) {
    throw new RequestBodyError(sendInput.error.issues[0]?.message || 'Solicitação inválida.', 400);
  }

  return {
    conversationId: sendInput.data.conversationId,
    message: sendInput.data.message,
    ...(aiSuggestionMessageId ? { aiSuggestionMessageId } : {}),
    ...(sendInput.data.replyToWamid ? { replyToWamid: sendInput.data.replyToWamid } : {}),
    ...(sendInput.data.forwarded ? { forwarded: true } : {}),
    ...(normalizedContact ? { contact: normalizedContact } : {}),
    ...(sendInput.data.catalogSelection ? { catalogSelection: sendInput.data.catalogSelection } : {}),
  };
}
