import crypto from 'crypto';

/**
 * Valida a assinatura HMAC SHA-256 enviada no cabeçalho X-Hub-Signature-256.
 * Usa crypto.timingSafeEqual para proteger contra ataques de timing.
 */
export function verifyMetaSignature(
  rawBody: string | Buffer,
  signatureHeader: string | undefined,
  appSecret: string | undefined
): boolean {
  if (!appSecret || appSecret.trim() === '') {
    return false;
  }
  if (!signatureHeader) return false;

  const signatureMatch = /^sha256=([a-f0-9]{64})$/i.exec(signatureHeader.trim());
  const signatureHex = signatureMatch?.[1];
  if (!signatureHex) return false;

  try {
    const expectedHex = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    const sigBuf = Buffer.from(signatureHex, 'hex');
    const expectedBuf = Buffer.from(expectedHex, 'hex');

    if (sigBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expectedBuf);
  } catch (err) {
    console.error('[verifyMetaSignature] Erro ao validar assinatura:', err);
    return false;
  }
}

/**
 * Lê o corpo bruto da requisição webhook como Buffer.
 * Preserva os bytes exatos necessários para validação criptográfica de HMAC.
 */
export async function readRawWebhookBody(
  request: any
): Promise<Buffer> {
  if (Buffer.isBuffer(request?.rawBody)) return request.rawBody;
  if (!request || typeof request[Symbol.asyncIterator] !== 'function') {
    return Buffer.alloc(0);
  }
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
