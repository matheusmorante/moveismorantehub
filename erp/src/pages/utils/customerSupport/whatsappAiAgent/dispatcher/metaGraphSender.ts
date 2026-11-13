import { buildWhatsAppNativeCatalogMessage } from '../../../../../../../shared-utils/whatsappNativeCatalogMessage.js';
import type { WhatsAppNativeCatalogProduct } from '../whatsappAiAgentTypes.js';

export interface SendMetaMessageParams {
  fetchMeta: typeof fetch;
  phoneNumberId: string;
  accessToken: string;
  recipientPhone: string;
  textContent: string;
  replyToWamid?: string;
}

export interface SendMetaNativeCatalogParams extends Omit<SendMetaMessageParams, 'textContent'> {
  catalogId: string;
  bodyText: string;
  products: WhatsAppNativeCatalogProduct[];
}

export interface MetaMessageResult {
  ok: boolean;
  status: 'sent' | 'failed' | 'uncertain';
  apiMessageId?: string;
  error?: string;
}

async function sendMetaPayloadMessage(
  params: Pick<SendMetaMessageParams, 'fetchMeta' | 'phoneNumberId' | 'accessToken'>,
  metaPayload: Record<string, unknown>,
): Promise<MetaMessageResult> {
  const { fetchMeta, phoneNumberId, accessToken } = params;

  let metaRes: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    metaRes = await fetchMeta(
      `https://graph.facebook.com/v26.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metaPayload),
        signal: controller.signal,
      }
    );
  } catch (netErr: any) {
    // PROTEÇÃO CONTRA INCERTEZA: se houver timeout ou queda durante o envio à Meta,
    // não retransmitir cegamente sem confirmação (Invariante FISCAL-002 / Concorrência de Mensageria)
    return {
      ok: false,
      status: 'uncertain',
      error: netErr?.message || 'Network timeout / error contacting Meta Graph API',
    };
  } finally {
    clearTimeout(timeout);
  }

  if (!metaRes.ok) {
    const metaErrData = await metaRes.json().catch(() => ({}));
    return {
      ok: false,
      status: metaRes.status >= 500 ? 'uncertain' : 'failed',
      error: JSON.stringify(metaErrData),
    };
  }

  const metaData = ((await metaRes.json().catch(() => ({}))) as any) || {};
  const apiMessageId = metaData.messages?.[0]?.id;
  if (typeof apiMessageId !== 'string' || !apiMessageId.trim()) {
    return { ok: false, status: 'uncertain', error: 'A Meta não confirmou o identificador da mensagem.' };
  }

  return {
    ok: true,
    status: 'sent',
    apiMessageId,
  };
}

/** Envia texto ou catálogo nativo via Meta com o mesmo tratamento de timeout e resultado incerto. */
export async function sendMetaTextMessage(
  params: SendMetaMessageParams
): Promise<MetaMessageResult> {
  const { recipientPhone, textContent, replyToWamid } = params;
  const metaPayload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipientPhone,
    type: 'text',
    text: { body: textContent },
  };
  if (replyToWamid) metaPayload.context = { message_id: replyToWamid };
  return sendMetaPayloadMessage(params, metaPayload);
}

export async function sendMetaNativeCatalogMessage(
  params: SendMetaNativeCatalogParams
): Promise<MetaMessageResult> {
  const { catalogId, recipientPhone, bodyText, products, replyToWamid } = params;
  const metaPayload = buildWhatsAppNativeCatalogMessage({
    recipient: recipientPhone,
    catalogId,
    bodyText,
    retailerIds: products.map((product) => product.retailerId),
  });
  if (replyToWamid) metaPayload.context = { message_id: replyToWamid };
  return sendMetaPayloadMessage(params, metaPayload);
}
