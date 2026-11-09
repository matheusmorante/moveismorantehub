export interface SendMetaMessageParams {
  fetchMeta: typeof fetch;
  phoneNumberId: string;
  accessToken: string;
  recipientPhone: string;
  textContent: string;
  replyToWamid?: string;
}

export interface MetaMessageResult {
  ok: boolean;
  status: 'sent' | 'failed' | 'uncertain';
  apiMessageId?: string;
  error?: string;
}

/**
 * Envia mensagem de texto via Meta Cloud API com proteção contra timeout e resultados incertos
 */
export async function sendMetaTextMessage(
  params: SendMetaMessageParams
): Promise<MetaMessageResult> {
  const { fetchMeta, phoneNumberId, accessToken, recipientPhone, textContent, replyToWamid } = params;

  const metaPayload: Record<string, any> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipientPhone,
    type: 'text',
    text: { body: textContent },
  };

  if (replyToWamid) {
    metaPayload.context = { message_id: replyToWamid };
  }

  let metaRes: Response;
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
  }

  if (!metaRes.ok) {
    const metaErrData = await metaRes.json().catch(() => ({}));
    return {
      ok: false,
      status: 'failed',
      error: JSON.stringify(metaErrData),
    };
  }

  const metaData = ((await metaRes.json().catch(() => ({}))) as any) || {};
  const apiMessageId = String(metaData.messages?.[0]?.id || `ai_out_${Date.now()}`);

  return {
    ok: true,
    status: 'sent',
    apiMessageId,
  };
}
