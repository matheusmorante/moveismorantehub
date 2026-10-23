import { getSettings } from '@/pages/utils/settingsService';
import { ApiUsageGuard } from '@/services/apiMonitoring/apiUsageGuard';
import { ApiUsageTracker } from '@/services/apiMonitoring/apiUsageTracker';
import { metaHttpClient } from './metaHttpClient';
import { metaErrorHandler } from './metaErrorHandler';
import { templateSanitizer } from './templateSanitizer';
import { sendTemplateMessage } from './metaTemplateSender';
import type { MetaMessageTemplate, MetaSendResponse } from './types';

export { templateSanitizer } from './templateSanitizer';
export { sendTemplateMessage } from './metaTemplateSender';

/**
 * Serviço especializado em comunicação via WhatsApp Cloud API / Meta Graph API.
 * Responsável por envio de mensagens de texto, botões interativos, listagem de modelos
 * e delegação de envio de templates e sanitização para submódulos de alta coesão.
 */
export const metaWhatsAppService = {
  sanitizeTemplateParam: templateSanitizer.sanitizeTemplateParam,
  formatRecipientPhone: templateSanitizer.formatRecipientPhone,
  sendTemplateMessage,

  /**
   * Envia uma mensagem de texto simples via Cloud API
   */
  sendTextMessage: async (
    to: string,
    text: string,
    purpose: 'sales' | 'delivery' | 'warranty' | 'settings_test' = 'sales'
  ): Promise<MetaSendResponse> => {
    const { whatsappConfig } = getSettings();
    if (!whatsappConfig?.phoneNumberId) throw new Error('Phone Number ID não configurado.');

    const formattedPhone = templateSanitizer.formatRecipientPhone(to);

    const guard = await ApiUsageGuard.check('meta_whatsapp');
    if (!guard.allowed) {
      throw new Error(`[ApiUsageGuard] Disparo WhatsApp bloqueado: ${guard.reason}`);
    }

    const startTime = Date.now();

    const response = await metaHttpClient.postMessages({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'text',
          text: { body: text },
        }, purpose);

    const data = await response.json();
    if (data.error) {
      console.error('[WhatsApp API] Erro ao enviar texto simples:', data.error);
      ApiUsageTracker.record({
        provider: 'meta',
        service: 'meta_whatsapp',
        operation: 'send_text',
        units: 1,
        status: 'ERROR',
        response_time_ms: Date.now() - startTime,
        module_source: 'communication',
        error_message: data.error.message,
      });
      const parsedMsg = metaErrorHandler.parseMetaErrorMessage(data.error, { recipientPhone: to });
      throw new Error(parsedMsg);
    }

    if (!data.messages || data.messages.length === 0 || !data.messages[0]?.id) {
      const errorMsg = `Meta API aceitou a chamada mas não gerou identificador de mensagem (wamid ausente). Resposta: ${JSON.stringify(data)}`;
      ApiUsageTracker.record({
        provider: 'meta',
        service: 'meta_whatsapp',
        operation: 'send_text',
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
        operation: 'send_text',
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
      operation: 'send_text',
      units: 1,
      status: 'SUCCESS',
      response_time_ms: Date.now() - startTime,
      module_source: 'communication',
    });

    return data;
  },

  /**
   * Envia um documento oficial (PDF) via WhatsApp Cloud API
   */
  sendDocumentMessage: async (
    to: string,
    documentUrl: string,
    filename: string,
    caption?: string
  ): Promise<MetaSendResponse> => {
    const { whatsappConfig } = getSettings();
    if (!whatsappConfig?.phoneNumberId) throw new Error('Phone Number ID não configurado.');

    const formattedPhone = templateSanitizer.formatRecipientPhone(to);

    const guard = await ApiUsageGuard.check('meta_whatsapp');
    if (!guard.allowed) {
      throw new Error(`[ApiUsageGuard] Disparo WhatsApp bloqueado: ${guard.reason}`);
    }

    const startTime = Date.now();

    const response = await metaHttpClient.postMessages({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'document',
          document: {
            link: documentUrl,
            filename,
            ...(caption ? { caption } : {}),
          },
        }, 'warranty');

    const data = await response.json();
    if (data.error) {
      console.error('[WhatsApp API] Erro ao enviar documento:', data.error);
      ApiUsageTracker.record({
        provider: 'meta',
        service: 'meta_whatsapp',
        operation: 'send_document',
        units: 1,
        status: 'ERROR',
        response_time_ms: Date.now() - startTime,
        module_source: 'communication',
        error_message: data.error.message,
      });
      const parsedMsg = metaErrorHandler.parseMetaErrorMessage(data.error, { recipientPhone: to });
      throw new Error(parsedMsg);
    }

    if (!data.messages || data.messages.length === 0 || !data.messages[0]?.id) {
      const errorMsg = `Meta API aceitou o documento mas não gerou identificador de mensagem (wamid ausente). Resposta: ${JSON.stringify(data)}`;
      ApiUsageTracker.record({
        provider: 'meta',
        service: 'meta_whatsapp',
        operation: 'send_document',
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
      operation: 'send_document',
      units: 1,
      status: 'SUCCESS',
      response_time_ms: Date.now() - startTime,
      module_source: 'communication',
    });

    return data;
  },

  /**
   * Envia mensagem interativa com botão de resposta rápida
   */
  sendInteractiveButtonMessage: async (
    to: string,
    text: string,
    buttonTitle: string = 'Confirmar Entrega',
    buttonId: string = 'confirm_delivery'
  ): Promise<MetaSendResponse> => {
    const { whatsappConfig } = getSettings();
    if (!whatsappConfig?.phoneNumberId) throw new Error('Phone Number ID não configurado.');

    const formattedPhone = templateSanitizer.formatRecipientPhone(to);

    try {
      const response = await metaHttpClient.postMessages({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: formattedPhone,
            type: 'interactive',
            interactive: {
              type: 'button',
              body: { text },
              action: {
                buttons: [
                  {
                    type: 'reply',
                    reply: { id: buttonId, title: buttonTitle },
                  },
                ],
              },
            },
          }, 'delivery');

      const data = await response.json();
      if (data.error) {
        console.warn(
          'Erro ao enviar mensagem interativa WhatsApp, tentando fallback de texto simples:',
          data.error
        );
        return await metaWhatsAppService.sendTextMessage(
          to,
          `${text}\n\n*Responda "${buttonTitle.toUpperCase()}" para confirmar.*`,
          'delivery'
        );
      }
      return data;
    } catch {
      return await metaWhatsAppService.sendTextMessage(
        to,
        `${text}\n\n*Responda "${buttonTitle.toUpperCase()}" para confirmar.*`,
        'delivery'
      );
    }
  },

  /**
   * Lista todos os modelos de mensagem aprovados no WhatsApp Business Account (WABA)
   */
  fetchMessageTemplates: async (config?: { wabaId: string }): Promise<MetaMessageTemplate[]> => {
    const whatsappConfig = config || getSettings().whatsappConfig;
    if (!whatsappConfig?.wabaId) {
      throw new Error('WABA ID (WhatsApp Business Account ID) não configurado.');
    }
    const response = await metaHttpClient.request('list_templates', { wabaId: whatsappConfig.wabaId });

    const data = await response.json();
    if (data.error) {
      console.error('Erro ao listar modelos de mensagem do WhatsApp:', data.error);
      const parsedMsg = metaErrorHandler.parseMetaErrorMessage(data.error);
      throw new Error(parsedMsg);
    }
    return data.data || [];
  },
};
