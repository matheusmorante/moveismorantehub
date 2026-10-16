import Order from '../../types/order.type';
import { getSettings } from '@/pages/utils/settingsService';
import { whatsappGraphService } from '../whatsappGraphService';
import { toast } from 'react-toastify';
import {
  shippingOrderWhatsappUrl,
  customerOrderWhatsappUrl,
  assistanceCustomerWhatsappUrl,
  assistanceOrderDetailsWhatsappUrl,
  groupInviteWhatsappUrl,
  personGroupInviteWhatsappUrl,
  returnOSCustomerWhatsappUrl,
  returnOSTeamWhatsappUrl,
  budgetWhatsappUrl,
} from './whatsappUrls';
import { buildOrderMetaTemplateParams } from './metaOrderParams';
import {
  buildDeliveryMessage,
  buildCustomerOrderMessage,
  buildAssistanceMessage,
  buildAssistanceOrderDetailsMessage,
  buildGroupInviteMessage,
  buildPersonGroupInviteMessage,
  buildReturnServiceOrderMessage,
  buildBudgetWhatsappMessage,
} from '../whatsappTemplates';

/**
 * Utilitário de despacho resiliente para ações que suportam envio via WhatsApp Web (wa.me)
 * ou chaveamento condicional para a Meta Graph API conforme configuração do sistema.
 */
export const safeSendWhatsAppOrFallback = async ({
  phone,
  message,
  fallbackUrl,
  successMessage,
  templateData,
}: {
  phone: string;
  message: string;
  fallbackUrl: string;
  successMessage: string;
  templateData?: {
    templateName?: string;
    parameters: string[];
  };
}) => {
  const settings = getSettings();
  const config = settings.whatsappConfig;
  const sendMode = config?.sendMode || 'wame';

  // Se o modo NÃO for explicitamente 'graph_api' (ou seja, for 'wame' ou padrão), abre a aba wa.me diretamente sem chamar a Cloud API
  if (sendMode !== 'graph_api') {
    console.log('[WhatsApp] Modo WA.ME (WhatsApp Web / App) ativo. Abrindo link:', fallbackUrl);
    window.open(fallbackUrl, '_blank');
    return;
  }

  // Modo Meta Graph API (Envio direto via servidor Meta)
  const hasCloudApi = Boolean(config?.accessToken && config?.phoneNumberId);
  if (!hasCloudApi) {
    toast.warning('Token de Acesso ou Phone Number ID não configurados. Abrindo WhatsApp Web...');
    window.open(fallbackUrl, '_blank');
    return;
  }

  const templateName = templateData?.templateName || config?.templateNameOrderConfirmation?.trim();

  try {
    if (templateName) {
      await whatsappGraphService.sendTemplateMessage(
        phone,
        templateName,
        templateData?.parameters || [],
        config?.templateLanguage || 'pt_BR'
      );
      toast.success(successMessage);
      return;
    }

    // Se não tiver nome de modelo configurado, tenta envio direto de texto
    await whatsappGraphService.sendTextMessage(phone, message);
    toast.success(successMessage);
  } catch (error: any) {
    console.error('[WhatsApp] Erro no envio via Meta Graph API:', error);
    toast.error(`Falha no envio pela API da Meta: ${error.message || 'Erro desconhecido'}`);

    // Em caso de falha na API da Meta, oferece abrir o WhatsApp Web para não perder a venda/comunicação
    toast.info('Abrindo WhatsApp Web como alternativa...');
    window.open(fallbackUrl, '_blank');
  }
};

export const sendDirectShippingMessage = async (order: Order) => {
  const settings = getSettings();
  const deliveryPhone = settings.orderAutomation?.deliveryPhone;
  const url = shippingOrderWhatsappUrl(order);

  if (!deliveryPhone) {
    toast.info('Telefone da equipe de entrega não configurado. Abrindo link manual...');
    window.open(url, '_blank');
    return;
  }

  await safeSendWhatsAppOrFallback({
    phone: deliveryPhone,
    message: buildDeliveryMessage(order),
    fallbackUrl: url,
    successMessage: 'Mensagem enviada com sucesso!',
  });
};

export const sendDirectCustomerMessage = async (order: Order) => {
  const customer = order.customerData;
  if (!customer?.phone) {
    toast.error('Cliente sem telefone cadastrado.');
    return;
  }

  const settings = getSettings();
  const config = settings.whatsappConfig;
  const url = customerOrderWhatsappUrl(order);
  const message = buildCustomerOrderMessage(order);
  const finalParams = buildOrderMetaTemplateParams(order, config);

  await safeSendWhatsAppOrFallback({
    phone: customer.phone,
    message,
    fallbackUrl: url,
    successMessage: 'Mensagem do pedido enviada para o cliente com sucesso!',
    templateData: {
      parameters: finalParams,
    },
  });
};

export const sendDirectAssistanceMessage = async (order: Order) => {
  const customer = order.customerData;
  if (!customer?.phone) {
    toast.error('Cliente sem telefone cadastrado.');
    return;
  }

  const url = assistanceCustomerWhatsappUrl(order);
  const message = buildAssistanceMessage(order);

  await safeSendWhatsAppOrFallback({
    phone: customer.phone,
    message,
    fallbackUrl: url,
    successMessage: 'Mensagem enviada para o cliente com sucesso!',
  });
};

export const sendDirectAssistanceOrderDetailsMessage = async (order: Order) => {
  const customer = order.customerData;
  if (!customer?.phone) {
    toast.error('Cliente sem telefone cadastrado.');
    return;
  }

  const url = assistanceOrderDetailsWhatsappUrl(order);
  const message = buildAssistanceOrderDetailsMessage(order);

  await safeSendWhatsAppOrFallback({
    phone: customer.phone,
    message,
    fallbackUrl: url,
    successMessage: 'Mensagem enviada com sucesso!',
  });
};

export const sendDirectGroupInviteMessage = async (order: Order) => {
  const customer = order.customerData;
  if (!customer?.phone) {
    toast.error('Cliente sem telefone cadastrado.');
    return;
  }

  const url = groupInviteWhatsappUrl(order);
  const message = buildGroupInviteMessage(order);

  await safeSendWhatsAppOrFallback({
    phone: customer.phone,
    message,
    fallbackUrl: url,
    successMessage: 'Convite VIP enviado para o cliente com sucesso!',
  });
};

export const sendDirectPersonGroupInviteMessage = async (person: any) => {
  if (!person?.phone) {
    toast.error('Pessoa sem telefone cadastrado.');
    return;
  }

  const url = personGroupInviteWhatsappUrl(person);
  const message = buildPersonGroupInviteMessage(person);

  await safeSendWhatsAppOrFallback({
    phone: person.phone,
    message,
    fallbackUrl: url,
    successMessage: 'Convite VIP enviado com sucesso!',
  });
};

export const sendDirectReturnOSCustomerMessage = async (order: Order) => {
  const customer = order.customerData;
  if (!customer?.phone) {
    toast.error('Cliente sem telefone cadastrado.');
    return;
  }

  const message = buildReturnServiceOrderMessage(order, 'customer');
  await safeSendWhatsAppOrFallback({
    phone: customer.phone,
    message,
    fallbackUrl: returnOSCustomerWhatsappUrl(order),
    successMessage: 'Pedido de devolução enviado para o cliente.',
  });
};

export const sendDirectReturnOSTeamMessage = async (order: Order) => {
  const settings = getSettings();
  const deliveryPhone = settings.orderAutomation?.deliveryPhone;
  const message = buildReturnServiceOrderMessage(order, 'team');
  const fallbackUrl = returnOSTeamWhatsappUrl(order);

  if (!deliveryPhone) {
    toast.info('Telefone da equipe de coleta não configurado. Abrindo link manual...');
    window.open(fallbackUrl, '_blank');
    return;
  }

  await safeSendWhatsAppOrFallback({
    phone: deliveryPhone,
    message,
    fallbackUrl,
    successMessage: 'Pedido de devolução enviado para a equipe.',
  });
};

export const sendDirectBudgetMessage = async (order: Order) => {
  const customer = order.customerData;
  if (!customer?.phone) {
    toast.error('Cliente sem telefone cadastrado.');
    return;
  }

  const url = budgetWhatsappUrl(order);
  const message = buildBudgetWhatsappMessage(order);

  await safeSendWhatsAppOrFallback({
    phone: customer.phone,
    message,
    fallbackUrl: url,
    successMessage: 'Orçamento enviado com sucesso!',
  });
};
