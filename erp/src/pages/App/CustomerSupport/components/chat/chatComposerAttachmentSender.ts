import type { SupportChatComposerDraft } from '../../../../../../../shared-utils/customerSupportFormSchemas';
import type {
  CustomerSupportSendInput,
  CustomerSupportSendResult,
} from '@/pages/utils/customerSupport/customerSupportService';
import { toCatalogSendSelection } from './chatComposerCatalogSelection';
import {
  CHAT_COMPOSER_UNSUPPORTED_AUDIO_ERROR,
  isSupportedChatComposerAudioMimeType,
} from './chatComposerSendValidation';
import { normalizedFileType } from './chatComposerAttachmentFiles';

interface SendDraftAttachmentsParams {
  draft: SupportChatComposerDraft;
  fileByAttachmentId: Map<string, File>;
  replyToWamid?: string;
  onSendMessage: (input: CustomerSupportSendInput) => Promise<CustomerSupportSendResult>;
  onClearDraftMessage: () => void;
  removeAttachment: (id: string) => void;
}

export async function sendDraftAttachments({
  draft,
  fileByAttachmentId,
  replyToWamid,
  onSendMessage,
  onClearDraftMessage,
  removeAttachment,
}: SendDraftAttachmentsParams): Promise<{ hadWarning: boolean; warningFeedback?: string; replyWasSent: boolean }> {
  let pendingText = draft.message.trim();
  let pendingReply = replyToWamid;
  let replyWasSent = false;
  let hadWarning = false;
  let warningFeedback: string | undefined;

  const sendMessage = async (input: CustomerSupportSendInput) => {
    const result = await onSendMessage({
      ...input,
      ...(pendingReply ? { replyToWamid: pendingReply } : {}),
    });
    if (!result.persisted || result.warning) {
      hadWarning = true;
      warningFeedback = result.warning || 'A Meta aceitou a mensagem. Atualize o histórico para conferir o registro.';
    }
    if (pendingReply) {
      pendingReply = undefined;
      replyWasSent = true;
    }
    return result;
  };

  const sendText = async (text: string) => {
    await sendMessage({ message: text });
    pendingText = '';
    onClearDraftMessage();
  };

  if (draft.attachments.length === 0) {
    await sendText(pendingText);
  } else {
    for (const attachment of draft.attachments) {
      if (attachment.kind === 'catalog') {
        await sendMessage({
          message: pendingText,
          catalogSelection: toCatalogSendSelection(attachment.selection),
        });
        pendingText = '';
        onClearDraftMessage();
        removeAttachment(attachment.id);
        continue;
      }

      if (attachment.kind === 'contact') {
        if (pendingText) await sendText(pendingText);
        await sendMessage({
          message: '',
          contact: {
            name: attachment.contactName || attachment.label,
            phone: attachment.contactPhone || '',
          },
        });
        removeAttachment(attachment.id);
        continue;
      }

      const file = fileByAttachmentId.get(attachment.id);
      if (!file) {
        throw new Error(`O arquivo “${attachment.label}” não está mais disponível. Remova e anexe novamente.`);
      }
      const fileInfo = normalizedFileType(file);
      if (!fileInfo) {
        throw new Error(`O formato de “${attachment.label}” não é aceito pelo WhatsApp.`);
      }
      if (fileInfo.label === 'Áudio' && !isSupportedChatComposerAudioMimeType(fileInfo.mimeType)) {
        throw new Error(CHAT_COMPOSER_UNSUPPORTED_AUDIO_ERROR);
      }
      const supportsCaption = fileInfo.label !== 'Áudio';
      if (!supportsCaption && pendingText) await sendText(pendingText);
      await sendMessage({
        message: supportsCaption ? pendingText : '',
        file,
      });
      if (supportsCaption) {
        pendingText = '';
        onClearDraftMessage();
      }
      removeAttachment(attachment.id);
    }
    if (pendingText) await sendText(pendingText);
  }

  return { hadWarning, warningFeedback, replyWasSent };
}
