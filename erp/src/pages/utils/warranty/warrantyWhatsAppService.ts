import type Order from '@/pages/types/order.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { getSettings } from '@/pages/utils/settingsService';
import { isSamePhoneNumber } from '@/pages/utils/textUtils';
import { whatsappGraphService } from '@/pages/utils/whatsappGraphService';
import {
  recordWhatsAppDispatch,
  waitForMetaDeliveryConfirmation,
  WebhookWaitResult,
} from '@/pages/utils/whatsapp/whatsappDispatchTracker';
import { toast } from 'react-toastify';
import type { WarrantyTermRecord } from './warrantyTypes';

export const WARRANTY_WHATSAPP_MESSAGE = `Olá! Tudo bem?

A Móveis Morante agradece pela sua compra.

Estamos encaminhando o Termo de Garantia dos seus móveis. Nele você encontra informações sobre a cobertura da garantia, cuidados de conservação e como funciona nossa assistência técnica.

Nosso compromisso é oferecer informações claras e estar à disposição sempre que precisar de orientação.

Móveis Morante — Cuidando do seu lar.`;

interface SendWarrantyTermWhatsAppParams {
  order: Order;
  warrantyRecord: WarrantyTermRecord;
  recipientPhone?: string;
}

export interface SendWarrantyWhatsAppResult {
  success: boolean;
  mode: 'graph_api' | 'wame';
  message: string;
}

interface LastWarrantySendRecord {
  timestamp: number;
  recordId: string;
}

const lastWarrantySendTimestamps = new Map<string, LastWarrantySendRecord>();
export const WARRANTY_RECENT_SEND_COOLDOWN_MS = 60 * 1000; // 60 segundos
export const clearWarrantyRecentSendTimestamps = () => lastWarrantySendTimestamps.clear();

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
 * Envia o Termo de Garantia pelo WhatsApp tradicional (WhatsApp Web / App wa.me).
 * Abre a conversa com mensagem formatada e link direto para o PDF.
 */
export async function sendWarrantyTermWhatsApp({
  order,
  warrantyRecord,
  recipientPhone,
}: SendWarrantyTermWhatsAppParams): Promise<SendWarrantyWhatsAppResult> {
  const customer = order.customerData;
  const targetPhone = recipientPhone || customer?.phone || warrantyRecord.customer_phone || '';
  const cleanPhone = targetPhone.replace(/\D/g, '');

  if (!cleanPhone || cleanPhone.length < 10) {
    throw new Error('Número de telefone do cliente inválido ou não informado.');
  }

  const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
  const pdfUrl = warrantyRecord.file_url || '';

  const webMessage = pdfUrl
    ? `${WARRANTY_WHATSAPP_MESSAGE}\n\n📄 *Visualizar Termo de Garantia em PDF:*\n${pdfUrl}`
    : WARRANTY_WHATSAPP_MESSAGE;

  const fallbackUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(webMessage)}`;
  window.open(fallbackUrl, '_blank');

  await supabase
    .from('warranty_terms')
    .update({
      sent_at: new Date().toISOString(),
      send_recipient: formattedPhone,
      send_channel: 'whatsapp',
      send_mode: 'wame',
      delivery_status: 'sent',
      delivery_status_updated_at: new Date().toISOString(),
    })
    .eq('id', warrantyRecord.id);

  return {
    success: true,
    mode: 'wame',
    message: 'WhatsApp Web aberto com sucesso para envio.',
  };
}

/**
 * Envia o PDF do Termo de Garantia diretamente para o WhatsApp do cliente
 * utilizando a API oficial da Meta (Cloud WhatsApp / Meta Graph API).
 * Aguarda a confirmação de entrega do Webhook antes de confirmar o sucesso.
 */
export async function sendDirectWarrantyTermViaMetaApi({
  order,
  warrantyRecord,
  recipientPhone,
}: SendWarrantyTermWhatsAppParams): Promise<boolean> {
  const customer = order.customerData;
  const targetPhone = recipientPhone || customer?.phone || warrantyRecord.customer_phone || '';
  const cleanPhone = targetPhone.replace(/\D/g, '');

  if (!cleanPhone || cleanPhone.length < 10) {
    toast.error('Número de telefone do cliente inválido ou não informado.');
    return false;
  }

  const settings = getSettings();
  const config = settings.whatsappConfig;

  // 1. Validar se as credenciais da Meta Cloud API estão preenchidas
  if (!config?.phoneNumberId) {
    toast.error(
      'Configuração da Meta incompleta: Phone Number ID não informado. Confira Configurações > WhatsApp API.'
    );
    return false;
  }

  // 2. Prevenir envio para o próprio número remetente
  const companyPhone = settings.companyPhone || '(41) 99749-3547';
  if (isSamePhoneNumber(targetPhone, companyPhone)) {
    toast.warning(
      `O telefone (${targetPhone}) é o mesmo número do WhatsApp Business da empresa. A Meta proíbe o envio de mensagens para o próprio número remetente. Altere o telefone do cliente no pedido para testar o envio direto.`
    );
    return false;
  }

  // 3. Validar se a URL pública do PDF está pronta
  const pdfUrl = warrantyRecord.file_url;
  if (!pdfUrl) {
    toast.error('URL do documento em PDF não disponível para envio.');
    return false;
  }

  // 4. Prevenir reenvio de documento idêntico em sequência rápida (anti-spam Meta)
  const now = Date.now();
  const lastSent = lastWarrantySendTimestamps.get(cleanPhone);
  if (
    lastSent &&
    lastSent.recordId === warrantyRecord.id &&
    now - lastSent.timestamp < WARRANTY_RECENT_SEND_COOLDOWN_MS
  ) {
    const elapsedSecs = Math.max(1, Math.floor((now - lastSent.timestamp) / 1000));
    const remainingSecs = Math.ceil(
      (WARRANTY_RECENT_SEND_COOLDOWN_MS - (now - lastSent.timestamp)) / 1000
    );
    toast.error(
      `Envio repetido bloqueado: Este Termo de Garantia já foi enviado para este número há ${elapsedSecs}s. A Meta descarta envios repetidos de documentos em menos de 1 minuto para prevenir spam. Aguarde mais ${remainingSecs}s antes de reenviar.`,
      { autoClose: 9000 }
    );
    return false;
  }

  // 5. Exibe toast de progresso / aguardando confirmação da Meta
  let toastId: any = null;
  if (typeof toast.loading === 'function') {
    toastId = toast.loading(
      'Enviando Termo de Garantia via Cloud WhatsApp e aguardando confirmação da Meta... ⏳'
    );
  }

  try {
    const fileName = warrantyRecord.file_name || `Termo-de-Garantia-${order.id}.pdf`;

    // Disparo oficial do PDF via Meta Cloud API
    const sendResult = await whatsappGraphService.sendDocumentMessage(
      cleanPhone,
      pdfUrl,
      fileName,
      WARRANTY_WHATSAPP_MESSAGE
    );

    const apiMessageId = sendResult?.messages?.[0]?.id;

    // 6. Registra despacho no banco para rastreamento de Webhook
    if (apiMessageId) {
      await recordWhatsAppDispatch({
        orderId: order.id ? String(order.id) : undefined,
        recipientPhone: cleanPhone,
        messageType: 'warranty_term',
        messageContent: `Termo de Garantia - ${fileName}`,
        apiMessageId,
      });

      await supabase
        .from('warranty_terms')
        .update({
          sent_at: new Date().toISOString(),
          send_recipient: cleanPhone,
          send_channel: 'whatsapp',
          send_mode: 'graph_api',
          api_message_id: apiMessageId,
          api_response: sendResult,
          delivery_status: 'pending',
          delivery_status_updated_at: new Date().toISOString(),
          failure_reason: null,
        })
        .eq('id', warrantyRecord.id);
    }

    // 7. Aguarda resposta do Webhook da Meta
    const webhookResult: WebhookWaitResult = apiMessageId
      ? await waitForMetaDeliveryConfirmation(apiMessageId)
      : { status: 'delivered' };

    if (webhookResult.status === 'failed') {
      const failMsg =
        webhookResult.failureReason ||
        'A Meta recusou a entrega deste Termo de Garantia (falha assíncrona).';

      await supabase
        .from('warranty_terms')
        .update({
          delivery_status: 'failed',
          delivery_status_updated_at: new Date().toISOString(),
          failure_reason: failMsg,
        })
        .eq('id', warrantyRecord.id);

      updateToastStatus(toastId, {
        render: `Cloud WhatsApp: Falha na entrega (${failMsg}).`,
        type: 'error',
        autoClose: 10000,
      });
      return false;
    }

    // Atualiza registro como entregue no banco
    await supabase
      .from('warranty_terms')
      .update({
        delivery_status: webhookResult.status === 'timeout' ? 'sent' : 'delivered',
        delivery_status_updated_at: new Date().toISOString(),
      })
      .eq('id', warrantyRecord.id);

    lastWarrantySendTimestamps.set(cleanPhone, { timestamp: Date.now(), recordId: warrantyRecord.id });

    if (webhookResult.status === 'timeout') {
      updateToastStatus(toastId, {
        render:
          'Termo de Garantia aceito na fila da Meta! O cliente receberá assim que o WhatsApp entregar.',
        type: 'info',
        autoClose: 6000,
      });
      return true;
    }

    updateToastStatus(toastId, {
      render: 'Termo de Garantia em PDF enviado diretamente ao cliente via Cloud WhatsApp com sucesso! 🎉',
      type: 'success',
    });
    return true;
  } catch (error: any) {
    console.error('[sendDirectWarrantyTermViaMetaApi] Falha no envio do PDF:', error);
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
          'Meta API (Regra 24h): A conversa está fora da janela de 24h. Para enviar este documento diretamente, utilize o botão "Enviar pelo WhatsApp" (WhatsApp Web) ou aguarde uma mensagem do cliente.',
        type: 'error',
      });
    } else if (msg.includes('mesmo número') || msg.includes('próprio número')) {
      updateToastStatus(toastId, {
        render: msg,
        type: 'warning',
      });
    } else if (msg.includes('100') || msg.includes('Invalid parameter')) {
      updateToastStatus(toastId, {
        render:
          'Meta API (Erro 100 - Parâmetro Inválido): A Meta rejeitou o documento. Verifique se o telefone do cliente está correto e se o link do PDF é acessível publicamente.',
        type: 'error',
      });
    } else {
      updateToastStatus(toastId, {
        render: `Falha no envio pela API da Meta: ${msg}`,
        type: 'error',
      });
    }
    return false;
  }
}
