import { getSettings } from '@/pages/utils/settingsService';
import { ApiUsageGuard } from '@/services/apiMonitoring/apiUsageGuard';
import { ApiUsageTracker } from '@/services/apiMonitoring/apiUsageTracker';
import { metaHttpClient } from './metaHttpClient';
import { metaErrorHandler } from './metaErrorHandler';
import { templateSanitizer } from './templateSanitizer';
import type { MetaSendResponse } from './types';

/**
 * Envia um modelo de mensagem aprovado (Template) via Meta Cloud API com fallbacks inteligentes:
 * - Validação de guardrails e monitoramento de uso (ApiUsageGuard, ApiUsageTracker)
 * - Sanitização de parâmetros conforme Erro 132018
 * - Fallback 1: Retentativa sem 9º dígito para números brasileiros (Erro 100)
 * - Fallback 2: Alternância de idioma pt_BR <-> pt (Erro 100)
 * - Validação estrita de wamid e status retornado pela Meta
 */
export const sendTemplateMessage = async (
  to: string,
  templateName: string,
  parameters: string[] = [],
  languageCode?: string,
  config?: { phoneNumberId: string; templateLanguage?: string },
  purpose: 'sales' | 'settings_test' = 'sales'
): Promise<MetaSendResponse> => {
  const whatsappConfig = config || getSettings().whatsappConfig;
  if (!whatsappConfig?.phoneNumberId) {
    throw new Error('Phone Number ID não configurado nas Configurações > WhatsApp API.');
  }

  const formattedPhone = templateSanitizer.formatRecipientPhone(to);
  const targetLanguage = languageCode || whatsappConfig?.templateLanguage || 'pt_BR';

  const components: any[] = [];
  if (parameters && parameters.length > 0) {
    const bodyParams = parameters.map((p) => ({
      type: 'text',
      text: templateSanitizer.sanitizeTemplateParam(p),
    }));
    components.push({
      type: 'body',
      parameters: bodyParams,
    });
  }

  const payload: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedPhone,
    type: 'template',
    template: {
      name: templateName.trim(),
      language: { code: targetLanguage },
      ...(components.length > 0 ? { components } : {}),
    },
  };

  const guard = await ApiUsageGuard.check('meta_whatsapp');
  if (!guard.allowed) {
    throw Object.assign(new Error(`[ApiUsageGuard] Disparo WhatsApp bloqueado: ${guard.reason}`), { confirmedFailure: true });
  }

  const startTime = Date.now();

  const response = await metaHttpClient.postMessages(payload, purpose);

  const data = await response.json();

  // Fallback 1: se falhar com código 100 e for número BR com 9º dígito (13 dígitos: 554199...), tenta sem o 9º dígito
  if (
    data.error &&
    data.error.code === 100 &&
    formattedPhone.length === 13 &&
    formattedPhone.startsWith('55')
  ) {
    const phoneWithoutNine = `55${formattedPhone.substring(2, 4)}${formattedPhone.substring(5)}`;
    const altPayload = { ...payload, to: phoneWithoutNine };
    const altResponse = await metaHttpClient.postMessages(altPayload, purpose);
    const altData = await altResponse.json();
    if (!altData.error) {
      return altData;
    }
  }

  // Fallback 2: se ainda falhar com erro 100, tenta alternar código de idioma (pt_BR <-> pt)
  if (data.error && data.error.code === 100) {
    const altLang = targetLanguage === 'pt_BR' ? 'pt' : 'pt_BR';
    const altPayloadLang = {
      ...payload,
      template: {
        ...payload.template,
        language: { code: altLang },
      },
    };
    const altResponseLang = await metaHttpClient.postMessages(altPayloadLang, purpose);
    const altDataLang = await altResponseLang.json();
    if (!altDataLang.error) {
      return altDataLang;
    }
  }

  if (data.error) {
    console.error(
      '[WhatsApp API] Erro retornado pela Meta:',
      JSON.stringify(data.error, null, 2)
    );
    ApiUsageTracker.record({
      provider: 'meta',
      service: 'meta_whatsapp',
      operation: 'send_template',
      units: 1,
      status: 'ERROR',
      response_time_ms: Date.now() - startTime,
      module_source: 'communication',
      error_message: data.error.message,
    });

    const parsedError = metaErrorHandler.parseMetaErrorMessage(data.error, {
      templateName,
      recipientPhone: to,
    });
    throw Object.assign(new Error(parsedError), { confirmedFailure: true });
  }

  if (!data.messages || data.messages.length === 0 || !data.messages[0]?.id) {
    const errorMsg = `Meta API aceitou a chamada mas não gerou identificador de mensagem (wamid ausente). Resposta: ${JSON.stringify(data)}`;
    ApiUsageTracker.record({
      provider: 'meta',
      service: 'meta_whatsapp',
      operation: 'send_template',
      units: 1,
      status: 'ERROR',
      response_time_ms: Date.now() - startTime,
      module_source: 'communication',
      error_message: errorMsg,
    });
    throw new Error(errorMsg);
  }

  if (data.messages[0]?.message_status === 'failed') {
    const errorMsg = 'Meta API rejeitou a entrega da mensagem (message_status: failed).';
    ApiUsageTracker.record({
      provider: 'meta',
      service: 'meta_whatsapp',
      operation: 'send_template',
      units: 1,
      status: 'ERROR',
      response_time_ms: Date.now() - startTime,
      module_source: 'communication',
      error_message: errorMsg,
    });
    throw new Error(errorMsg);
  }

  ApiUsageTracker.record({
    provider: 'meta',
    service: 'meta_whatsapp',
    operation: 'send_template',
    units: 1,
    status: 'SUCCESS',
    response_time_ms: Date.now() - startTime,
    module_source: 'communication',
  });

  return data;
};
