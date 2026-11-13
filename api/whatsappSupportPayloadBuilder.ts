import type { SendPayload } from './whatsappSupportSendRequest.js';
import type { WhatsAppSupportContentType } from './whatsappSupportFileClassifier.js';
import type { ResolvedCatalogMessage } from './whatsappSupportCatalogMessage.js';
import { buildWhatsAppNativeCatalogMessage } from '../shared-utils/whatsappNativeCatalogMessage.js';

export interface BuildWhatsAppSupportPayloadInput {
  recipient: string;
  message: string;
  contact?: SendPayload['contact'];
  file?: SendPayload['file'];
  mediaId?: string | null;
  mediaType?: WhatsAppSupportContentType;
  mediaMimeType?: string | null;
  mediaFilename?: string | null;
  nativeProducts?: ResolvedCatalogMessage['nativeProducts'];
  catalogId?: string;
  replyToWamid?: string;
}

export interface BuildWhatsAppSupportPayloadResult {
  graphPayload: Record<string, unknown>;
  messageType: WhatsAppSupportContentType | 'text' | 'contacts' | 'interactive';
  storedText: string;
  catalogError?: { status: number; message: string };
}

export function buildWhatsAppSupportGraphPayload({
  recipient,
  message,
  contact,
  file,
  mediaId,
  mediaType,
  mediaMimeType,
  mediaFilename,
  nativeProducts,
  catalogId = '',
  replyToWamid,
}: BuildWhatsAppSupportPayloadInput): BuildWhatsAppSupportPayloadResult {
  let graphPayload: Record<string, unknown>;
  let messageType: WhatsAppSupportContentType | 'text' | 'contacts' | 'interactive' = contact ? 'contacts' : 'text';
  let storedText = message;

  if (contact) {
    graphPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'contacts',
      contacts: [{
        name: { formatted_name: contact.name, first_name: contact.name },
        phones: [{ phone: `+${contact.phone}`, type: 'WORK' }],
      }],
    };
    storedText = `Contato compartilhado: ${contact.name} (+${contact.phone})`;
  } else if (file && mediaId && mediaType) {
    messageType = mediaType;
    const mediaKey = mediaType;
    graphPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: mediaType,
      [mediaKey]: {
        id: mediaId,
        ...(mediaType === 'document' ? { filename: mediaFilename } : {}),
        ...(mediaType !== 'sticker' && message ? { caption: message } : {}),
      },
    };
    storedText = mediaType === 'sticker'
      ? '[Figurinha]'
      : message || mediaFilename || `[${mediaType === 'image' ? 'Imagem' : mediaType === 'video' ? 'Vídeo' : mediaType === 'audio' ? 'Áudio' : 'Documento'}]`;
  } else if (nativeProducts) {
    if (!/^\d{1,32}$/.test(catalogId)) {
      return {
        graphPayload: {},
        messageType: 'interactive',
        storedText,
        catalogError: {
          status: 503,
          message: 'Configure um catálogo da Meta vinculado ao WhatsApp antes de enviar cards nativos.',
        },
      };
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

  if (replyToWamid) {
    graphPayload.context = { message_id: replyToWamid };
  }

  return { graphPayload, messageType, storedText };
}
