import { getSettings } from '@/pages/utils/settingsService';
import type { WhatsAppConversation, WhatsAppMessage } from '../../../types';

export function recipientBlockReason(conversation: WhatsAppConversation): string {
  if (conversation.isArchived) return 'Reabra o atendimento para encaminhar.';
  const configuredPhoneNumberId = getSettings().whatsappConfig?.phoneNumberId;
  if (!configuredPhoneNumberId || configuredPhoneNumberId !== conversation.businessPhoneNumberId) {
    return 'Canal WhatsApp desconectado.';
  }
  return '';
}

export function messagePreview(message: WhatsAppMessage): string {
  if (message.messageType === 'sticker') return 'Figurinha';
  return (
    message.textContent ||
    message.mediaCaption ||
    message.mediaFilename ||
    (message.messageType === 'image'
      ? 'Foto'
      : message.messageType === 'video'
        ? 'Vídeo'
        : message.messageType === 'audio'
          ? 'Áudio'
          : 'Documento')
  );
}

export function templateForwardContent(message: WhatsAppMessage): string {
  const preview = message.rawPayload?.template_preview;
  if (!preview || typeof preview !== 'object') {
    return message.textContent || 'Mensagem de modelo do WhatsApp';
  }

  const header = preview.header && typeof preview.header === 'object' ? preview.header : null;
  const lines = [
    header?.type === 'text' && typeof header.text === 'string' ? header.text.trim() : '',
    typeof preview.body === 'string' ? preview.body.trim() : '',
    typeof preview.footer === 'string' ? preview.footer.trim() : '',
  ].filter(Boolean);

  const buttons = Array.isArray(preview.buttons)
    ? preview.buttons
        .map((button: any) => {
          const label = typeof button?.text === 'string' ? button.text.trim() : '';
          if (!label) return '';
          if (button.type === 'url' && typeof button.url === 'string') {
            try {
              const url = new URL(button.url.trim());
              if (url.protocol === 'http:' || url.protocol === 'https:') {
                return `${label}: ${url.href}`;
              }
            } catch {
              // Keep the visible button label and discard an invalid destination.
            }
          }
          if (button.type === 'phone_number' && typeof button.phoneNumber === 'string') {
            return `${label}: ${button.phoneNumber}`;
          }
          return label;
        })
        .filter(Boolean)
    : [];

  return (
    [...lines, ...(buttons.length ? ['Opções:', ...buttons.map((label) => `• ${label}`)] : [])].join('\n\n') ||
    message.textContent ||
    'Mensagem de modelo do WhatsApp'
  );
}

export function hasTemplateMedia(message: WhatsAppMessage): boolean {
  const type = message.rawPayload?.template_preview?.header?.type;
  return Boolean(message.mediaId && ['image', 'video', 'document'].includes(type));
}
