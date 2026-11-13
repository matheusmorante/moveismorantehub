import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import type { ProductCatalogSendSelection } from '../../../../../../shared-utils/productCatalogFormSchemas';
import {
  CUSTOMER_SUPPORT_WHATSAPP_SEND_QUOTA,
  type CustomerSupportMetaMonthlyUsage,
  type CustomerSupportWhatsAppSendQuota,
} from '../../../../../../shared-utils/customerSupportWhatsAppSendQuota';
import { supportCustomerSendSchema } from '../../../../../../shared-utils/customerSupportFormSchemas';

export class CustomerSupportSendError extends Error {
  constructor(message: string, readonly outcomeUncertain = false) {
    super(message);
    this.name = 'CustomerSupportSendError';
  }
}

export interface CustomerSupportSendInput {
  message: string;
  aiSuggestionMessageId?: string;
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

export type { CustomerSupportMetaMonthlyUsage, CustomerSupportWhatsAppSendQuota };

function isSendQuota(value: unknown): value is CustomerSupportWhatsAppSendQuota {
  if (!value || typeof value !== 'object') return false;
  const quota = value as Partial<CustomerSupportWhatsAppSendQuota>;
  return typeof quota.allowed === 'boolean'
    && typeof quota.day_start === 'string'
    && ['minute_limit', 'minute_used', 'minute_remaining', 'hour_limit', 'hour_used', 'hour_remaining',
      'day_attempts', 'day_sent', 'day_failed', 'day_uncertain', 'remaining_percent', 'retry_after_seconds']
      .every((key) => Number.isFinite(quota[key as keyof CustomerSupportWhatsAppSendQuota]));
}

async function fetchQuotaResponse(supabase: SupabaseClient, includeCost: boolean) {
  const sessionResponse = await withTimeout<any>(supabase.auth.getSession(), 10_000, null, 'central:cota-envio-sessao');
  const accessToken = sessionResponse?.data?.session?.access_token;
  if (sessionResponse?.error || !accessToken) throw new CustomerSupportSendError('Sessão inválida. Entre novamente.');

  const response = await withTimeout(fetch(`/api/whatsapp-support-send${includeCost ? '?include_cost=1' : ''}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  }), includeCost ? 32_000 : 12_000, null, 'central:cota-envio');
  if (!response?.ok) throw new CustomerSupportSendError('Não foi possível consultar a cota de envio.');
  const data = await response.json().catch(() => ({}));
  if (!isSendQuota(data?.quota)) throw new CustomerSupportSendError('A cota de envio retornou dados inválidos.');
  return data as { quota: CustomerSupportWhatsAppSendQuota; metaUsage?: CustomerSupportMetaMonthlyUsage };
}

/** Consulta a cota compartilhada do número do WhatsApp conectado. */
export async function fetchCustomerSupportWhatsAppSendQuota(
  supabase: SupabaseClient
): Promise<CustomerSupportWhatsAppSendQuota> {
  return (await fetchQuotaResponse(supabase, false)).quota;
}

export async function fetchCustomerSupportWhatsAppUsageDetails(supabase: SupabaseClient) {
  return fetchQuotaResponse(supabase, true);
}

function notifySendQuotaUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CUSTOMER_SUPPORT_WHATSAPP_SEND_QUOTA.updatedEvent));
  }
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
        ...(input.aiSuggestionMessageId ? { aiSuggestionMessageId: input.aiSuggestionMessageId } : {}),
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
    if (responseReceived) notifySendQuotaUpdated();
  }
}
