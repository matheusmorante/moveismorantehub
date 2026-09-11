import Order from "../types/order.type";
import { getSettings } from '@/pages/utils/settingsService';
import {
    stringifyFullAddress, stringifyFullAddressWithObservation,
    stringifyPayments, stringifyItemsWithValues, formatDate, formatCurrency, toTitleCase
} from "./formatters";
import { getShippingRouteUrl } from "./maps";
import { whatsappGraphService } from "./whatsappGraphService";
import { toast } from "react-toastify";

import {
    buildDeliveryMessage,
    buildCustomerOrderMessage,
    buildAssistanceMessage,
    buildAssistanceOrderDetailsMessage,
    buildGroupInviteMessage,
    buildPersonGroupInviteMessage,
    buildAssistanceServiceOrderMessage,
    buildBudgetWhatsappMessage,
    stringifyAdditionalContacts
} from "./whatsappTemplates";


export const shippingOrderWhatsappUrl = (order: Order) => {
    const message = buildDeliveryMessage(order);
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

export const customerOrderWhatsappUrl = (order: Order) => {
    const message = buildCustomerOrderMessage(order);
    const customer = order.customerData;
    const phone = customer.phone ? customer.phone.replace(/[^0-9]/g, '') : '';
    
    if (phone) {
        return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    }
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

const safeSendWhatsAppOrFallback = async ({
    phone,
    message,
    fallbackUrl,
    successMessage,
    templateData
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
        console.log("[WhatsApp] Modo WA.ME (WhatsApp Web / App) ativo. Abrindo link:", fallbackUrl);
        window.open(fallbackUrl, "_blank");
        return;
    }

    // Modo Meta Graph API (Envio direto via servidor Meta)
    const hasCloudApi = Boolean(config?.accessToken && config?.phoneNumberId);
    if (!hasCloudApi) {
        toast.warning("Token de Acesso ou Phone Number ID não configurados. Abrindo WhatsApp Web...");
        window.open(fallbackUrl, "_blank");
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
        console.error("[WhatsApp] Erro no envio via Meta Graph API:", error);
        toast.error(`Falha no envio pela API da Meta: ${error.message || "Erro desconhecido"}`);
        
        // Em caso de falha na API da Meta, oferece abrir o WhatsApp Web para não perder a venda/comunicação
        toast.info("Abrindo WhatsApp Web como alternativa...");
        window.open(fallbackUrl, "_blank");
    }
};

export const sendDirectShippingMessage = async (order: Order) => {
    const settings = getSettings();
    const deliveryPhone = settings.orderAutomation?.deliveryPhone;
    const url = shippingOrderWhatsappUrl(order);
    
    if (!deliveryPhone) {
        toast.info("Telefone da equipe de entrega não configurado. Abrindo link manual...");
        window.open(url, "_blank");
        return;
    }

    await safeSendWhatsAppOrFallback({
        phone: deliveryPhone,
        message: buildDeliveryMessage(order),
        fallbackUrl: url,
        successMessage: "Mensagem enviada com sucesso!"
    });
};

export const sendDirectCustomerMessage = async (order: Order) => {
    const customer = order.customerData;
    if (!customer?.phone) {
        toast.error("Cliente sem telefone cadastrado.");
        return;
    }

    const settings = getSettings();
    const config = settings.whatsappConfig;
    const url = customerOrderWhatsappUrl(order);
    const message = buildCustomerOrderMessage(order);

    const sched = order.shipping?.scheduling;
    const date = (sched?.dateType === 'range' && sched?.endDate)
        ? `de ${formatDate(sched.date)} até ${formatDate(sched.endDate)}`
        : formatDate(order.shipping?.scheduling?.date);

    let time = "Não informado";
    if (sched) {
        if (sched.notInformed) time = "Não informado";
        else if (sched.type === 'range' && sched.startTime && sched.endTime) time = `${sched.startTime} às ${sched.endTime}`;
        else if (sched.startTime) time = sched.startTime;
        else if (sched.time) time = sched.time;
    }

    let itemsBlock = stringifyItemsWithValues(order.items || []);
    if (order.shipping?.value && order.shipping.value > 0) {
        itemsBlock += `\nFrete: ${formatCurrency(order.shipping.value)}`;
    }

    const addressStr = order.shipping?.noAddress 
        ? (order.shipping?.deliveryMethod === 'pickup' ? "Retirada em loja" : "Não informado")
        : stringifyFullAddressWithObservation(customer.fullAddress);

    const cleanTotalVal = (order.paymentsSummary?.totalOrderValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const paymentsStr = stringifyPayments(order.paymentsSummary?.payments || []);

    const allParams = [
        customer.fullName || "Cliente",
        date || "A confirmar",
        time || "A combinar",
        addressStr || "Não informado",
        itemsBlock || "Produtos do pedido",
        cleanTotalVal || "0,00",
        paymentsStr || "Não informado"
    ];

    const varCount = typeof config?.templateVariableCount === 'number' ? config.templateVariableCount : 7;
    const finalParams = varCount === 0 ? [] : allParams.slice(0, varCount);

    await safeSendWhatsAppOrFallback({
        phone: customer.phone,
        message,
        fallbackUrl: url,
        successMessage: "Mensagem do pedido enviada para o cliente com sucesso!",
        templateData: {
            parameters: finalParams
        }
    });
};



export const sendDirectAssistanceMessage = async (order: Order) => {
    const customer = order.customerData;
    if (!customer?.phone) {
        toast.error("Cliente sem telefone cadastrado.");
        return;
    }

    const url = assistanceCustomerWhatsappUrl(order);
    const message = buildAssistanceMessage(order);

    await safeSendWhatsAppOrFallback({
        phone: customer.phone,
        message,
        fallbackUrl: url,
        successMessage: "Mensagem enviada para o cliente com sucesso!"
    });
};



export const assistanceOrderDetailsWhatsappUrl = (order: Order) => {
    const customer = order.customerData;
    const phone = customer.phone?.replace(/[^0-9]/g, '') || '';
    const message = buildAssistanceOrderDetailsMessage(order);

    if (phone) {
        return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    }
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
};

export const sendDirectAssistanceOrderDetailsMessage = async (order: Order) => {
    const customer = order.customerData;
    if (!customer?.phone) {
        toast.error("Cliente sem telefone cadastrado.");
        return;
    }

    const url = assistanceOrderDetailsWhatsappUrl(order);
    const message = buildAssistanceOrderDetailsMessage(order);

    await safeSendWhatsAppOrFallback({
        phone: customer.phone,
        message,
        fallbackUrl: url,
        successMessage: "Mensagem enviada com sucesso!"
    });
};

export const customerReviewsWhatsappUrl = (order: Order) => {
    const customer = order.customerData;
    const phone = customer.phone.replace(/[^0-9]/g, '');
    const settings = getSettings();
    const reviewUrl = settings.googleReviewUrl || 'https://g.page/r/CctxeFYzY2o8EBE/review';
    
    let message = settings.whatsappTemplates?.reviewRequest || "";
    
    message = message
        .replace(/{{cliente}}/g, customer.fullName?.split(' ')[0] || "Cliente")
        .replace(/{{reviewUrl}}/g, reviewUrl);

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export const assistanceCustomerWhatsappUrl = (order: Order) => {
    const customer = order.customerData;
    const phone = customer.phone?.replace(/[^0-9]/g, '') || '';
    const message = buildAssistanceMessage(order);

    if (phone) {
        return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    }
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}



export const groupInviteWhatsappUrl = (order: Order) => {
    const customer = order.customerData;
    const phone = customer.phone?.replace(/[^0-9]/g, '') || '';
    const message = buildGroupInviteMessage(order);

    if (phone) {
        return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    }
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
};

export const sendDirectGroupInviteMessage = async (order: Order) => {
    const customer = order.customerData;
    if (!customer?.phone) {
        toast.error("Cliente sem telefone cadastrado.");
        return;
    }

    const url = groupInviteWhatsappUrl(order);
    const message = buildGroupInviteMessage(order);

    await safeSendWhatsAppOrFallback({
        phone: customer.phone,
        message,
        fallbackUrl: url,
        successMessage: "Convite VIP enviado para o cliente com sucesso!"
    });
};

export const personGroupInviteWhatsappUrl = (person: any) => {
    const phone = person.phone?.replace(/[^0-9]/g, '') || '';
    const message = buildPersonGroupInviteMessage(person);

    if (phone) {
        return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    }
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
};

export const sendDirectPersonGroupInviteMessage = async (person: any) => {
    if (!person?.phone) {
        toast.error("Pessoa sem telefone cadastrado.");
        return;
    }

    const url = personGroupInviteWhatsappUrl(person);
    const message = buildPersonGroupInviteMessage(person);

    await safeSendWhatsAppOrFallback({
        phone: person.phone,
        message,
        fallbackUrl: url,
        successMessage: "Convite VIP enviado com sucesso!"
    });
};

export const assistanceServiceOrderWhatsappUrl = (order: Order) => {
    const message = buildAssistanceServiceOrderMessage(order);
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
};

export const budgetWhatsappUrl = (order: Order) => {
    const customer = order.customerData;
    const phone = customer.phone?.replace(/[^0-9]/g, '') || '';
    const message = buildBudgetWhatsappMessage(order);

    if (phone) {
        return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    }
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
};

export const sendDirectBudgetMessage = async (order: Order) => {
    const customer = order.customerData;
    if (!customer?.phone) {
        toast.error("Cliente sem telefone cadastrado.");
        return;
    }

    const url = budgetWhatsappUrl(order);
    const message = buildBudgetWhatsappMessage(order);

    await safeSendWhatsAppOrFallback({
        phone: customer.phone,
        message,
        fallbackUrl: url,
        successMessage: "Orçamento enviado com sucesso!"
    });
};