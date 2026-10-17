import Order from '../../types/order.type';
import { getSettings } from '@/pages/utils/settingsService';
import { whatsappGraphService } from '../whatsappGraphService';
import { toast } from 'react-toastify';
import { isSamePhoneNumber } from '../textUtils';
import { buildOrderMetaTemplateParams } from './metaOrderParams';
import { buildCustomerOrderMessage } from '../whatsappTemplates';
import { customerOrderWhatsappUrl } from './whatsappUrls';
import {
  recordWhatsAppDispatch,
  waitForMetaDeliveryConfirmation,
  WebhookWaitResult,
} from './whatsappDispatchTracker';

interface LastSendRecord {
  timestamp: number;
  messageContent: string;
}

const lastSendTimestamps = new Map<string, LastSendRecord>();
export const RECENT_SEND_COOLDOWN_MS = 60 * 1000; // 60 segundos
export const clearRecentSendTimestamps = () => lastSendTimestamps.clear();

/**
 * Atualiza um toast existente em carregamento para o status final ou dispara um novo
 */
function updateToastStatus(
  toastId: any,
  options: {
    render: string;
    type: 'success' | 'error' | 'warning' | 'info';
    autoClose?: number;
  }
) {
  if (toastId && typeof toast.update === 'function') {
    toast.update(toastId, {
      render: options.render,
      type: options.type,
      isLoading: false,
      ...(options.autoClose !== undefined ? { autoClose: options.autoClose } : {}),
    });
  } else {
    if (toastId && typeof toast.dismiss === 'function') {
      toast.dismiss(toastId);
    }
    const config = options.autoClose !== undefined ? { autoClose: options.autoClose } : undefined;
    if (options.type === 'success') {
      if (config) toast.success(options.render, config);
      else toast.success(options.render);
    } else if (options.type === 'warning') {
      if (config) toast.warning(options.render, config);
      else toast.warning(options.render);
    } else if (options.type === 'info') {
      if (config) toast.info(options.render, config);
      else toast.info(options.render);
    } else {
      if (config) toast.error(options.render, config);
      else toast.error(options.render);
    }
  }
}

/**
 * Envia o resumo e confirmação do pedido diretamente para o WhatsApp do cliente
 * utilizando estritamente a API oficial da Meta (WhatsApp Cloud API / Connect on WhatsApp).
 * O texto enviado é 100% idêntico ao texto gerado pelo botão tradicional que abre a aba do WhatsApp.
 * Aguarda a confirmação de entrega do Webhook da Meta antes de confirmar o sucesso.
 */
export const sendDirectCustomerOrderViaMetaApi = async (order: Order): Promise<boolean> => {
  const customer = order.customerData;
  if (!customer?.phone) {
    toast.error('Cliente sem telefone cadastrado.');
    return false;
  }

  const settings = getSettings();
  const config = settings.whatsappConfig;

  // 1. Validar se as credenciais da Meta Cloud API estão preenchidas
  if (!config?.accessToken || !config?.phoneNumberId) {
    toast.error(
      'Configuração da Meta incompleta: Token de Acesso permanente ou Phone Number ID não informados. Acesse Configurações > WhatsApp API.'
    );
    return false;
  }

  // 2. Prevenir envio para o próprio número remetente (regra rígida da Meta que gera Erro 100)
  const companyPhone = settings.companyPhone || '(41) 99749-3547';
  if (isSamePhoneNumber(customer.phone, companyPhone)) {
    toast.warning(
      `O telefone (${customer.phone}) é o mesmo número do WhatsApp Business da empresa. A Meta proíbe o envio de mensagens para o próprio número remetente. Altere o telefone do cliente no pedido para testar o envio direto.`
    );
    return false;
  }

  // 3. Monta exatamente o mesmo texto gerado para o cliente pelo outro botão (WhatsApp Web / App)
  const message = buildCustomerOrderMessage(order);
  const templateName = config?.templateNameOrderConfirmation?.trim();
  const finalParams = buildOrderMetaTemplateParams(order, config);

  // 4. Prevenir reenvio de mensagem IDÊNTICA em sequência rápida para evitar que a Meta descarte por spam/deduplicação
  const cleanPhone = customer.phone.replace(/\D/g, '');
  const now = Date.now();
  const lastSent = lastSendTimestamps.get(cleanPhone);
  if (
    lastSent &&
    lastSent.messageContent === message &&
    now - lastSent.timestamp < RECENT_SEND_COOLDOWN_MS
  ) {
    const elapsedSecs = Math.max(1, Math.floor((now - lastSent.timestamp) / 1000));
    const remainingSecs = Math.ceil((RECENT_SEND_COOLDOWN_MS - (now - lastSent.timestamp)) / 1000);
    toast.error(
      `Envio repetido bloqueado: Esta mesma mensagem idêntica já foi enviada para este número há ${elapsedSecs}s. A Meta descarta mensagens com conteúdo idêntico em menos de 1 minuto para prevenir spam. Se desejar enviar uma atualização, altere os dados do pedido ou aguarde mais ${remainingSecs}s.`,
      { autoClose: 9000 }
    );
    return false;
  }

  // 5. Exibe toast de progresso / aguardando confirmação da Meta
  let toastId: any = null;
  if (typeof toast.loading === 'function') {
    toastId = toast.loading('Enviando via Cloud WhatsApp e aguardando confirmação da Meta... ⏳');
  }

  try {
    let sendResult: any = null;
    let isTemplateFallback = false;

    // Tenta primeiro o envio direto do texto completo da mensagem (idêntico ao outro botão) via Cloud API
    try {
      sendResult = await whatsappGraphService.sendTextMessage(customer.phone, message);
    } catch (textError: any) {
      const textErrMsg = String(textError?.message || '');
      const is24hError =
        textErrMsg.includes('131047') ||
        textErrMsg.includes('24 hours') ||
        textErrMsg.includes('Re-engagement');

      // Se falhar exclusivamente pela janela de 24 horas da Meta e houver template cadastrado, tenta o template aprovado como alternativa
      if (is24hError && templateName) {
        console.warn(
          '[Meta WhatsApp API] Janela de 24h expirada para envio de texto direto. Tentando modelo aprovado como fallback:',
          templateName
        );
        sendResult = await whatsappGraphService.sendTemplateMessage(
          customer.phone,
          templateName,
          finalParams,
          config?.templateLanguage || 'pt_BR'
        );
        isTemplateFallback = true;
      } else {
        // Propaga o erro para o tratamento centralizado
        throw textError;
      }
    }

    const apiMessageId = sendResult?.messages?.[0]?.id;

    // 6. Registra despacho no banco para rastreamento de Webhook
    if (apiMessageId) {
      await recordWhatsAppDispatch({
        orderId: order.id ? String(order.id) : undefined,
        recipientPhone: cleanPhone,
        messageType: 'order_confirmation',
        messageContent: message,
        apiMessageId,
      });
    }

    // 7. Aguarda resposta do Webhook da Meta
    let webhookResult: WebhookWaitResult = apiMessageId
      ? await waitForMetaDeliveryConfirmation(apiMessageId)
      : { status: 'delivered' };

    // Se o envio inicial de texto livre falhar de forma assíncrona pela janela de 24h (Meta Webhook erro 131047):
    if (webhookResult.status === 'failed') {
      const is24hWebhookError =
        webhookResult.errorCode === '131047' ||
        String(webhookResult.failureReason || '').includes('131047') ||
        String(webhookResult.failureReason || '').includes('24h') ||
        String(webhookResult.failureReason || '').includes('24 hours') ||
        String(webhookResult.failureReason || '').includes('Re-engagement');

      // Se a falha foi por janela de 24h fechada e ainda não usamos o template, aciona o fallback automático para o modelo aprovado
      if (is24hWebhookError && !isTemplateFallback && templateName) {
        console.warn(
          '[Meta WhatsApp API] Webhook reportou Janela de 24h fechada (#131047). Acionando fallback automático para modelo aprovado:',
          templateName
        );
        updateToastStatus(toastId, {
          render: `Janela de 24h fechada para texto livre. Enviando via modelo aprovado (${templateName})... ⏳`,
          type: 'info',
        });

        try {
          const fallbackResult = await whatsappGraphService.sendTemplateMessage(
            customer.phone,
            templateName,
            finalParams,
            config?.templateLanguage || 'pt_BR'
          );
          isTemplateFallback = true;
          const fallbackMsgId = fallbackResult?.messages?.[0]?.id;

          if (fallbackMsgId) {
            await recordWhatsAppDispatch({
              orderId: order.id ? String(order.id) : undefined,
              recipientPhone: cleanPhone,
              messageType: 'order_confirmation',
              messageContent: `[Modelo: ${templateName}] ${finalParams.join(' • ')}`,
              apiMessageId: fallbackMsgId,
            });

            webhookResult = await waitForMetaDeliveryConfirmation(fallbackMsgId);
          } else {
            webhookResult = { status: 'delivered' };
          }
        } catch (templateError: any) {
          console.error(
            '[Meta WhatsApp API] Falha no envio do modelo aprovado como fallback:',
            templateError
          );
          throw templateError;
        }
      }
    }

    // Se persistir com status failed (mesmo após tentar o template ou se não havia template cadastrado)
    if (webhookResult.status === 'failed') {
      const is24hWebhookError =
        webhookResult.errorCode === '131047' ||
        String(webhookResult.failureReason || '').includes('131047') ||
        String(webhookResult.failureReason || '').includes('24h') ||
        String(webhookResult.failureReason || '').includes('24 hours') ||
        String(webhookResult.failureReason || '').includes('Re-engagement');

      if (is24hWebhookError) {
        updateToastStatus(toastId, {
          render:
            'Meta API (Janela de 24h fechada): A Meta exige um Modelo de Mensagem aprovado para iniciar conversas. Como nenhum modelo está configurado em Configurações > WhatsApp API, abrindo o WhatsApp Web como alternativa...',
          type: 'warning',
          autoClose: 9000,
        });
        if (typeof window !== 'undefined' && typeof window.open === 'function') {
          window.open(customerOrderWhatsappUrl(order), '_blank');
        }
        return false;
      }

      const failMsg =
        webhookResult.failureReason ||
        'A Meta recusou a entrega desta mensagem após o envio (falha assíncrona).';
      updateToastStatus(toastId, {
        render: `Cloud WhatsApp: Falha na entrega (${failMsg}).`,
        type: 'error',
        autoClose: 10000,
      });
      return false;
    }

    // Marca no histórico de cooldown anti-spam
    lastSendTimestamps.set(cleanPhone, { timestamp: Date.now(), messageContent: message });

    if (webhookResult.status === 'timeout') {
      updateToastStatus(toastId, {
        render:
          'Mensagem aceita na fila da Meta! O cliente receberá assim que o WhatsApp entregar.',
        type: 'info',
        autoClose: 6000,
      });
      return true;
    }

    updateToastStatus(toastId, {
      render: isTemplateFallback
        ? 'Pedido/entrega enviado diretamente ao cliente via modelo aprovado do Cloud WhatsApp! 🎉'
        : 'Pedido/entrega enviado diretamente ao cliente via Cloud WhatsApp com sucesso! 🎉',
      type: 'success',
    });
    return true;
  } catch (error: any) {
    console.error('[Meta WhatsApp API] Falha no envio direto:', error);
    const msg = String(error?.message || 'Erro desconhecido na API da Meta');
    if (
      msg.includes('NOT_VERIFIED') ||
      msg.includes('Não Verificado') ||
      msg.includes('verificação pendente') ||
      msg.includes('133010')
    ) {
      updateToastStatus(toastId, {
        render:
          'Meta API: O número da empresa está pendente de verificação (NOT_VERIFIED) no Meta Business Suite. As mensagens não são entregues até concluir a validação por SMS/Ligação na Meta.',
        type: 'error',
        autoClose: 9000,
      });
    } else if (
      msg.includes('131056') ||
      msg.includes('131049') ||
      msg.includes('130429') ||
      msg.includes('80007') ||
      msg.toLowerCase().includes('rate limit') ||
      msg.toLowerCase().includes('spam')
    ) {
      updateToastStatus(toastId, {
        render:
          'Cloud WhatsApp (Proteção Anti-Spam da Meta): A Meta recusou este envio por proteção contra disparos repetidos para o mesmo número. Aguarde alguns minutos ou utilize o botão de envio via WhatsApp Web.',
        type: 'error',
        autoClose: 9000,
      });
    } else if (msg.includes('131047') || msg.includes('24 hours') || msg.includes('Re-engagement')) {
      updateToastStatus(toastId, {
        render:
          'Meta API (Regra 24h): A conversa está fora da janela de 24h. Cadastre um Modelo de Mensagem (Template) no Meta Business Suite e configure seu nome em Configurações > WhatsApp API.',
        type: 'error',
      });
    } else if (msg.includes('132000') || msg.includes('does not exist')) {
      updateToastStatus(toastId, {
        render: `Meta API: O modelo "${templateName}" não existe ou não foi aprovado na sua conta Meta WABA.`,
        type: 'error',
      });
    } else if (msg.includes('132018') || msg.includes('parameters in your template')) {
      updateToastStatus(toastId, {
        render:
          'Meta API (Erro 132018): Os parâmetros do modelo continham caracteres inválidos (quebras de linha ou múltiplos espaços). Ajustados automaticamente.',
        type: 'error',
      });
    } else if (msg.includes('mesmo número') || msg.includes('próprio número')) {
      updateToastStatus(toastId, {
        render: msg,
        type: 'warning',
      });
    } else if (msg.includes('100') || msg.includes('Invalid parameter')) {
      if (isSamePhoneNumber(customer.phone, companyPhone)) {
        updateToastStatus(toastId, {
          render: `Meta API (Erro 100): O telefone (${customer.phone}) é o mesmo número do WhatsApp da empresa. A Meta não permite enviar mensagens para si mesma. Altere o telefone do cliente no pedido para testar.`,
          type: 'warning',
        });
      } else {
        updateToastStatus(toastId, {
          render: `Meta API (Erro 100 - Parâmetro Inválido): A Meta rejeitou os dados do envio. Verifique se o telefone do cliente está correto ou se a quantidade de variáveis no modelo "${templateName || 'envio_de_pedido'}" confere.`,
          type: 'error',
        });
      }
    } else {
      updateToastStatus(toastId, {
        render: `Falha no envio pela API da Meta: ${msg}`,
        type: 'error',
      });
    }
    return false;
  }
};
