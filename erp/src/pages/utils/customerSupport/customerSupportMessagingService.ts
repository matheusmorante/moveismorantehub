import type { SupabaseClient } from '@supabase/supabase-js';
import type { WhatsAppMessage } from '@/pages/App/CustomerSupport/types';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import type { ProductCatalogSendSelection } from '../../../../../shared-utils/productCatalogFormSchemas';
import {
  supportSandboxMessageSchema,
  supportCustomerSendSchema,
} from '../../../../../shared-utils/customerSupportFormSchemas';
export interface CustomerSupportTestSendResult {
  accepted: true;
  persisted: boolean;
  warning?: string;
}

/** Sends only through the Meta test sender endpoint; the server enforces the Development sandbox. */
export async function sendCustomerSupportTestMessage(
  supabase: SupabaseClient,
  conversationId: string,
  message: string
): Promise<CustomerSupportTestSendResult> {
  const parsed = supportSandboxMessageSchema.safeParse({ message });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Mensagem inválida.');

  const sessionResponse = await withTimeout<any>(supabase.auth.getSession(), 10_000, null, 'central:envio-teste-sessao');
  const accessToken = sessionResponse?.data?.session?.access_token;
  if (sessionResponse?.error || !accessToken) throw new Error('Sessão inválida. Entre novamente.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch('/api/whatsapp-dispatch', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversationId, message: parsed.data.message }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Não foi possível enviar a mensagem de teste.');
    if (data.accepted !== true) throw new Error('A Meta não confirmou o envio da mensagem.');
    return {
      accepted: true,
      persisted: data.persisted === true,
      ...(typeof data.warning === 'string' ? { warning: data.warning } : {}),
    };
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('Resultado do envio incerto. Atualize a conversa antes de tentar novamente.');
    }
    throw error instanceof Error ? error : new Error('Não foi possível enviar a mensagem de teste.');
  } finally {
    clearTimeout(timeout);
  }
}

export interface CustomerSupportTestSender {
  enabled: boolean;
  phoneNumberId?: string;
  phoneNumber?: string;
}

export class CustomerSupportSendError extends Error {
  constructor(message: string, readonly outcomeUncertain = false) {
    super(message);
    this.name = 'CustomerSupportSendError';
  }
}

export interface CustomerSupportSendInput {
  message: string;
  file?: File;
  contact?: { name: string; phone: string };
  catalogSelection?: ProductCatalogSendSelection;
  replyToWamid?: string;
  forwarded?: boolean;
}

export interface CustomerSupportSendResult {
  accepted: true;
  persisted: boolean;
  apiMessageId?: string;
  warning?: string;
}

/** Envia uma mensagem do atendimento pela rota autenticada, vinculada à conversa ativa. */
export async function sendCustomerSupportMessage(
  supabase: SupabaseClient,
  conversationId: string,
  input: CustomerSupportSendInput
): Promise<CustomerSupportSendResult> {
  const attachmentType = input.contact ? 'contact' : input.file ? 'file' : input.catalogSelection ? 'catalog' : 'text';
  const parsed = supportCustomerSendSchema.safeParse({
    conversationId,
    message: input.message,
    attachmentType,
    ...(input.replyToWamid ? { replyToWamid: input.replyToWamid } : {}),
    ...(input.forwarded ? { forwarded: true } : {}),
    ...(input.file ? {
      fileName: input.file.name,
      fileMimeType: input.file.type || 'application/octet-stream',
      fileSize: input.file.size,
    } : {}),
    ...(input.contact ? {
      contactName: input.contact.name,
      contactPhone: input.contact.phone,
    } : {}),
    ...(input.catalogSelection ? { catalogSelection: input.catalogSelection } : {}),
  });
  if (!parsed.success) {
    throw new CustomerSupportSendError(parsed.error.issues[0]?.message || 'Mensagem inválida.');
  }
  if (input.file && parsed.data.message.trim().length > 1024) {
    throw new CustomerSupportSendError('A legenda do anexo pode ter até 1024 caracteres.');
  }

  const sessionResponse = await withTimeout<any>(supabase.auth.getSession(), 10_000, null, 'central:envio-sessao');
  const accessToken = sessionResponse?.data?.session?.access_token;
  if (sessionResponse?.error || !accessToken) throw new CustomerSupportSendError('Sessão inválida. Entre novamente.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);
  let responseReceived = false;
  try {
    const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
    let body: BodyInit;
    if (input.file) {
      const formData = new FormData();
      formData.set('conversationId', parsed.data.conversationId);
      formData.set('message', parsed.data.message);
      if (parsed.data.replyToWamid) formData.set('replyToWamid', parsed.data.replyToWamid);
      if (parsed.data.forwarded) formData.set('forwarded', 'true');
      formData.set('file', input.file, input.file.name);
      body = formData;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({
        conversationId: parsed.data.conversationId,
        message: parsed.data.message,
        ...(parsed.data.replyToWamid ? { replyToWamid: parsed.data.replyToWamid } : {}),
        ...(parsed.data.forwarded ? { forwarded: true } : {}),
        ...(input.contact ? { contact: input.contact } : {}),
        ...(parsed.data.catalogSelection ? { catalogSelection: parsed.data.catalogSelection } : {}),
      });
    }

    const response = await fetch('/api/whatsapp-support-send', {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });
    responseReceived = true;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new CustomerSupportSendError(
        typeof data.error === 'string' ? data.error : 'Não foi possível enviar a mensagem.',
        data.outcomeUncertain === true,
      );
    }
    if (data.accepted !== true) {
      throw new CustomerSupportSendError('O WhatsApp não confirmou o envio. Atualize a conversa antes de tentar novamente.', true);
    }
    return {
      accepted: true,
      persisted: data.persisted === true,
      ...(typeof data.apiMessageId === 'string' ? { apiMessageId: data.apiMessageId } : {}),
      ...(typeof data.warning === 'string' ? { warning: data.warning } : {}),
    };
  } catch (error) {
    if (error instanceof CustomerSupportSendError) throw error;
    if (controller.signal.aborted || !responseReceived) {
      throw new CustomerSupportSendError(
        'Resultado do envio incerto. Atualize a conversa antes de tentar novamente.',
        true,
      );
    }
    throw new CustomerSupportSendError(error instanceof Error ? error.message : 'Não foi possível enviar a mensagem.');
  } finally {
    clearTimeout(timeout);
  }
}

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

export async function fetchCustomerSupportTestSender(): Promise<CustomerSupportTestSender> {
  try {
    const response = await withTimeout<Response | null>(fetch('/api/whatsapp-dispatch?operation=test-sender', { cache: 'no-store' }), 10_000, null, 'central:remetente-teste');
    if (!response?.ok) return { enabled: false };
    const data = await response.json();
    return data?.enabled === true && typeof data.phoneNumberId === 'string' && typeof data.phoneNumber === 'string'
      ? { enabled: true, phoneNumberId: data.phoneNumberId, phoneNumber: data.phoneNumber }
      : { enabled: false };
  } catch {
    return { enabled: false };
  }
}

/**
 * Busca lista de perfis de atendentes/usuários ativos do sistema
 */
