import type { ExtractedMessageContent } from './types.js';
import { extractTemplatePreview } from '../whatsappTemplatePreview.js';

export function parseMediaMessage(
  type: string,
  msg: any,
  replyToWamid?: string
): ExtractedMessageContent | null {
  switch (type) {
    case 'image':
      return {
        type: 'image',
        text: msg.image?.caption || '[Imagem]',
        mediaId: msg.image?.id,
        mediaMimeType: msg.image?.mime_type || 'image/jpeg',
        mediaCaption: msg.image?.caption,
        replyToWamid,
      };

    case 'document':
      return {
        type: 'document',
        text: msg.document?.filename || msg.document?.caption || '[Documento]',
        mediaId: msg.document?.id,
        mediaMimeType: msg.document?.mime_type || 'application/octet-stream',
        mediaFilename: msg.document?.filename || 'documento',
        mediaCaption: msg.document?.caption,
        replyToWamid,
      };

    case 'audio':
      return {
        type: 'audio',
        text: '[Áudio]',
        mediaId: msg.audio?.id,
        mediaMimeType: msg.audio?.mime_type || 'audio/ogg',
        replyToWamid,
      };

    case 'video':
      return {
        type: 'video',
        text: msg.video?.caption || '[Vídeo]',
        mediaId: msg.video?.id,
        mediaMimeType: msg.video?.mime_type || 'video/mp4',
        mediaCaption: msg.video?.caption,
        replyToWamid,
      };

    case 'sticker':
      return {
        type: 'sticker',
        text: '[Figurinha]',
        mediaId: msg.sticker?.id,
        mediaMimeType: msg.sticker?.mime_type || 'image/webp',
        replyToWamid,
      };

    case 'template': {
      const extracted = extractTemplatePreview(msg);
      if (!extracted) {
        return {
          type: 'unsupported',
          text: 'A Meta informou uma mensagem de modelo sem prévia do conteúdo.',
          replyToWamid,
          rawPayload: { provider_message_type: type },
        };
      }
      const { preview } = extracted;
      return {
        type: 'template',
        text:
          [preview.name ? `Modelo: ${preview.name}` : '', preview.body || '', preview.footer || '']
            .filter(Boolean)
            .join('\n\n') || 'Mensagem de modelo do WhatsApp',
        mediaId: extracted.mediaId,
        mediaMimeType: extracted.mediaMimeType,
        mediaFilename: extracted.mediaFilename,
        replyToWamid,
        rawPayload: { provider_message_type: type, template_preview: preview },
      };
    }

    default:
      return null;
  }
}
