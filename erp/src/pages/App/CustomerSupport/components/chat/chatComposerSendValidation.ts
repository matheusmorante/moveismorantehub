import type { SupportChatComposerDraft } from '../../../../../../../shared-utils/customerSupportFormSchemas';
import { normalizedFileType } from './chatComposerAttachmentFiles';

export const CHAT_COMPOSER_UNSUPPORTED_AUDIO_ERROR =
  'A API do WhatsApp aceita áudio OGG, MP3, M4A, AAC ou AMR. Esta gravação precisa ser convertida antes do envio.';

const SUPPORTED_AUDIO_MIME_TYPES = new Set([
  'audio/aac',
  'audio/mp4',
  'audio/mpeg',
  'audio/amr',
  'audio/ogg',
]);

export const isSupportedChatComposerAudioMimeType = (mimeType: string) =>
  SUPPORTED_AUDIO_MIME_TYPES.has(mimeType);

export const getChatComposerSendPreflightError = (
  draft: SupportChatComposerDraft,
  fileByAttachmentId: ReadonlyMap<string, File>,
): string | null => {
  let plannedText = draft.message.trim();
  for (const attachment of draft.attachments) {
    if (attachment.kind === 'catalog') {
      if (attachment.selection.deliveryMode === 'native' && plannedText.length > 1024) {
        return 'A mensagem que acompanha os cards do WhatsApp deve ter até 1024 caracteres.';
      }
      if (plannedText.length > 4096) {
        return 'A mensagem excede o limite de 4096 caracteres.';
      }
      plannedText = '';
      continue;
    }
    if (attachment.kind === 'contact') {
      plannedText = '';
      continue;
    }
    const file = fileByAttachmentId.get(attachment.id);
    const fileInfo = file ? normalizedFileType(file) : null;
    if (!file || !fileInfo) {
      return `O arquivo “${attachment.label}” não está mais disponível ou não é aceito pelo WhatsApp.`;
    }
    if (fileInfo.label === 'Áudio' && !isSupportedChatComposerAudioMimeType(fileInfo.mimeType)) {
      return CHAT_COMPOSER_UNSUPPORTED_AUDIO_ERROR;
    }
    if (fileInfo.label === 'Áudio') plannedText = '';
    else if (plannedText.length > 1024) {
      return 'A legenda do anexo pode ter até 1024 caracteres.';
    } else plannedText = '';
  }
  return null;
};
