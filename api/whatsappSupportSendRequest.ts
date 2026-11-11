import type { ProductCatalogSendSelection } from '../shared-utils/productCatalogFormSchemas.js';
import type { WhatsAppSupportFile } from './whatsappSupportFileClassifier.js';
import { RequestBodyError } from './whatsappSupportRequestError.js';

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SendPayload = {
  conversationId: string;
  message: string;
  aiSuggestionMessageId?: string;
  replyToWamid?: string;
  forwarded?: boolean;
  contact?: { name: string; phone: string };
  file?: WhatsAppSupportFile;
  catalogSelection?: ProductCatalogSendSelection;
};

export function parseMultipart(body: Buffer, contentTypeHeader: string): SendPayload {
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
