import type { SupabaseClient } from '@supabase/supabase-js';
import type { WhatsAppMessage } from '@/pages/App/CustomerSupport/types';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import { CustomerSupportSendError } from './customerSupportSendService';

export async function downloadCustomerSupportForwardFile(
  supabase: SupabaseClient,
  message: WhatsAppMessage
): Promise<File> {
  const templateHeaderType = message.messageType === 'template'
    ? message.rawPayload?.template_preview?.header?.type
    : null;
  const mediaType = message.messageType === 'template' ? templateHeaderType : message.messageType;
  if (!message.mediaId || !['image', 'document', 'audio', 'video', 'sticker'].includes(mediaType)) {
    throw new CustomerSupportSendError('Esta mensagem não possui uma mídia que possa ser encaminhada.');
  }
  const sessionResponse = await withTimeout<any>(supabase.auth.getSession(), 10_000, null, 'central:encaminhar-sessao');
  const accessToken = sessionResponse?.data?.session?.access_token;
  if (sessionResponse?.error || !accessToken) throw new CustomerSupportSendError('Sessão inválida. Entre novamente.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`/api/whatsapp-media?id=${encodeURIComponent(message.mediaId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new CustomerSupportSendError(typeof data.error === 'string' ? data.error : 'Não foi possível carregar a mídia para encaminhar.');
    }
    const blob = await response.blob();
    const maxBytes = mediaType === 'sticker' ? 500 * 1024 : 4 * 1024 * 1024;
    if (!blob.size || blob.size > maxBytes) {
      throw new CustomerSupportSendError(mediaType === 'sticker'
        ? 'A figurinha precisa ter até 500 KB para ser encaminhada pela Central.'
        : 'A mídia precisa ter até 4 MB para ser encaminhada pela Central.');
    }
    const extensionByType: Record<string, string> = { image: 'jpg', video: 'mp4', audio: 'ogg', document: 'pdf', sticker: 'webp' };
    const filename = (message.mediaFilename || `mensagem.${extensionByType[mediaType]}`)
      .replace(/[\\/]/g, '_').slice(0, 255);
    return new File([blob], filename, { type: message.mediaMimeType || blob.type || 'application/octet-stream' });
  } catch (error) {
    if (error instanceof CustomerSupportSendError) throw error;
    throw new CustomerSupportSendError(controller.signal.aborted
      ? 'A consulta da mídia demorou demais. Tente encaminhar novamente.'
      : error instanceof Error ? error.message : 'Não foi possível carregar a mídia para encaminhar.');
  } finally {
    clearTimeout(timeout);
  }
}
