import Order from "../types/order.type";
import { getSettings } from '@/pages/utils/settingsService';
import {
    stringifyFullAddress, stringifyFullAddressWithObservation,
    stringifyPayments, stringifyItemsWithValues, formatDate, formatCurrency
} from "./formatters";
import { getShippingRouteUrl } from "./maps";
import { whatsappGraphService } from "./whatsappGraphService";
import { toast } from "react-toastify";

const stringifyAdditionalContacts = (contacts?: { name: string, phone: string }[]) => {
    if (!contacts || contacts.length === 0) return "";
    return contacts.map(c => `• ${c.name}: ${c.phone}`).join('\n');
};

const buildDeliveryMessage = (order: Order) => {
    const settings = getSettings();
    const sched = order.shipping?.scheduling;
    const date = (sched?.dateType === 'range' && sched?.endDate)
        ? `de ${formatDate(sched.date)} até ${formatDate(sched.endDate)}`
        : formatDate(order.shipping.scheduling.date);

    let time = "Não informado";
    if (sched) {
        if (sched.notInformed) time = "Não informado";
        else if (sched.type === 'range' && sched.startTime && sched.endTime) time = `${sched.startTime} às ${sched.endTime}`;
        else if (sched.startTime) time = sched.startTime;
        else if (sched.time) time = sched.time;
    }
    const customer = order.customerData;
    
    let message = settings.whatsappTemplates?.deliveryInfo || "";
    
    if (!message) {
        message = order.shipping?.deliveryMethod === 'pickup' 
            ? `*REIRA: Novo Pedido para Retirada de ${customer.fullName || "Cliente"}*` 
            : `Novo Pedido para ${customer.fullName || "Cliente"}...`; 
    }

    let itemsBlock = stringifyItemsWithValues(order.items || []);
    if (order.shipping?.value && order.shipping.value > 0) {
        itemsBlock += `\n*Frete:* ${formatCurrency(order.shipping.value)}`;
    }

    let finalMessage = message
        .replace(/{{customerName}}/g, () => customer.fullName || "Cliente")
        .replace(/{{deliveryDate}}/g, () => date)
        .replace(/{{deliveryTime}}/g, () => time)
        .replace(/{{phone}}/g, () => customer.phone || "Não informado")
        .replace(/{{additionalContacts}}/g, () => stringifyAdditionalContacts(customer.additionalContacts))
        .replace(/{{customerObservations}}/g, () => customer.observations || "")
        .replace(/{{address}}/g, () => {
            if (order.shipping?.noAddress) return order.shipping?.deliveryMethod === 'pickup' ? "Retirada em loja" : "Não informado";
            return stringifyFullAddressWithObservation(customer.fullAddress);
        })
        .replace(/{{items}}/g, () => itemsBlock)
        .replace(/{{payments}}/g, () => stringifyPayments(order.payments || []))
        .replace(/{{totalValue}}/g, () => formatCurrency(order.paymentsSummary?.totalOrderValue || 0))
        .replace(/{{observation}}/g, () => order.observation || "Sem observações")
        .replace(/{{seller}}/g, () => order.seller || "Não informado")
        .replace(/{{routeUrl}}/g, () => customer.fullAddress ? getShippingRouteUrl(customer.fullAddress) : "Endereço não informado");

    if (order.shipping?.deliveryMethod === 'pickup') {
        finalMessage = finalMessage
            .replace(/Entrega/g, 'Retirada')
            .replace(/entrega/g, 'retirada')
            .replace(/ENTREGA/g, 'RETIRADA');
    }

    finalMessage = finalMessage.replace(/R\$\s*R\$/g, 'R$');

    return finalMessage;
};

const buildCustomerOrderMessage = (order: Order) => {
    const settings = getSettings();
    const sched = order.shipping?.scheduling;
    const date = (sched?.dateType === 'range' && sched?.endDate)
        ? `de ${formatDate(sched.date)} até ${formatDate(sched.endDate)}`
        : formatDate(order.shipping.scheduling.date);

    let time = "Não informado";
    if (sched) {
        if (sched.notInformed) time = "Não informado";
        else if (sched.type === 'range' && sched.startTime && sched.endTime) time = `${sched.startTime} às ${sched.endTime}`;
        else if (sched.startTime) time = sched.startTime;
        else if (sched.time) time = sched.time;
    }
    const customer = order.customerData;
    
    let message = settings.whatsappTemplates?.orderConfirmation || "";
    
    let itemsBlock = stringifyItemsWithValues(order.items || []);
    if (order.shipping?.value && order.shipping.value > 0) {
        itemsBlock += `\n*Frete:* ${formatCurrency(order.shipping.value)}`;
    }
    
    let finalMessage = message
        .replace(/{{customerName}}/g, () => customer.fullName || "Cliente")
        .replace(/{{deliveryDate}}/g, () => date)
        .replace(/{{deliveryTime}}/g, () => time)
        .replace(/{{address}}/g, () => {
            if (order.shipping?.noAddress) return order.shipping?.deliveryMethod === 'pickup' ? "Retirada em loja" : "Não informado";
            return stringifyFullAddressWithObservation(customer.fullAddress);
        })
        .replace(/{{items}}/g, () => itemsBlock)
        .replace(/{{totalValue}}/g, () => formatCurrency(order.paymentsSummary?.totalOrderValue || 0))
        .replace(/{{seller}}/g, () => order.seller || "Não informado")
        .replace(/{{payments}}/g, () => stringifyPayments(order.payments || []));

    if (order.shipping?.deliveryMethod === 'pickup') {
        finalMessage = finalMessage
            .replace(/Entrega/g, 'Retirada')
            .replace(/entrega/g, 'retirada')
            .replace(/ENTREGA/g, 'RETIRADA');
    }

    finalMessage = finalMessage.replace(/R\$\s*R\$/g, 'R$');

    return finalMessage;
};

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
    const sendMode = config?.sendMode || 'graph_api';

    // Se o modo for 'wame' (WhatsApp Web / App), abre a aba wa.me diretamente
    if (sendMode === 'wame') {
        window.open(fallbackUrl, "_blank");
        return;
    }

    // Modo Meta Graph API (Envio direto via servidor Meta)
    const hasCloudApi = !!(config?.accessToken && config?.phoneNumberId);
    if (!hasCloudApi) {
        toast.warning("Token de Acesso ou Phone Number ID não configurados em Configurações > WhatsApp API. Abrindo WhatsApp Web...");
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

const buildAssistanceMessage = (order: Order) => {
    const customer = order.customerData;

    // Format date
    const sched = order.shipping?.scheduling;
    const formattedDate = (sched?.dateType === 'range' && sched?.endDate)
        ? `de ${formatDate(sched.date)} até ${formatDate(sched.endDate)}`
        : (sched?.date ? formatDate(sched.date) : 'data a confirmar');

    // Format time/period
    let scheduledTime = "";
    if (sched) {
        if (sched.notInformed) {
            scheduledTime = "(horário a combinar)";
        } else if (sched.type === 'range' && sched.startTime && sched.endTime) {
            scheduledTime = `das ${sched.startTime} às ${sched.endTime}`;
        } else if (sched.startTime) {
            scheduledTime = `às ${sched.startTime}`;
        } else if (sched.time) {
            scheduledTime = `às ${sched.time}`;
        }
    }

    // Capture products
    const itemsToUse = (order.assistanceItems && order.assistanceItems.length > 0) ? order.assistanceItems : order.items;
    const produtos = itemsToUse && itemsToUse.length > 0 
        ? itemsToUse.map(i => i.description || "Produto").join(', ') 
        : "produto";

    const firstName = customer.fullName?.split(' ')[0] || "Cliente";

    return `Olá ${firstName}, a assistência do(s) ${produtos} foi agendada para dia ${formattedDate} ${scheduledTime}`.trim() + '.';
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

const buildAssistanceOrderDetailsMessage = (order: Order) => {
    const customer = order.customerData;
    
    // date
    const sched = order.shipping?.scheduling;
    const date = (sched?.dateType === 'range' && sched?.endDate)
        ? `de ${formatDate(sched.date)} até ${formatDate(sched.endDate)}`
        : (sched?.date ? formatDate(sched.date) : 'A confirmar');

    // time
    let time = "";
    if (sched) {
        if (sched.notInformed) {
            time = "Não informado";
        } else if (sched.type === 'range' && sched.startTime && sched.endTime) {
            time = `${sched.startTime} às ${sched.endTime}`;
        } else if (sched.startTime) {
            time = sched.startTime;
        } else if (sched.time) {
            time = sched.time;
        }
    }

    let message = `*PEDIDO DE ASSISTÊNCIA TÉCNICA*\n\n`;
    message += `*Cliente:* ${customer.fullName || 'Não informado'}\n`;
    const address = order.shipping?.noAddress 
        ? (order.shipping?.deliveryMethod === 'pickup' ? "Retirada em loja" : "Não informado")
        : stringifyFullAddressWithObservation(customer.fullAddress);
    message += `*Endereço:* ${address}\n\n`;
    
    message += `*Data Agendada:* ${date}\n`;
    message += `*Horário:* ${time || 'Não informado'}\n\n`;
    
    message += `*Itens da Assistência:*\n`;
    const itemsToUse = (order.assistanceItems && order.assistanceItems.length > 0) ? order.assistanceItems : order.items;
    if (itemsToUse && itemsToUse.length > 0) {
        itemsToUse.forEach((item) => {
            message += `• ${item.quantity}x ${item.description}\n`;
        });
    } else {
        message += `• Nenhum item especificado\n`;
    }
    
    if (order.observation) {
        message += `\n*Observações:*\n${order.observation}\n`;
    }
    
    message += `\n*Vendedor:* ${order.seller || 'Não informado'}`;
    
    return message;
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

const buildGroupInviteMessage = (order: Order) => {
    const customer = order.customerData;
    const settings = getSettings();
    const defaults = {
        groupInviteMessage: 'Se quiser ficar por dentro de novas ofertas e promoções, clique nesse grupo, estarei sempre enviando por lá: {{groupLink}}',
        groupInviteLink: 'https://chat.whatsapp.com/FtqlGwW7pdI9Jzgl8VRia6?mode=gi_t'
    };
    
    let message = settings.whatsappTemplates?.groupInviteMessage || defaults.groupInviteMessage;
    const link = settings.whatsappTemplates?.groupInviteLink || defaults.groupInviteLink;
    
    return message
        .replace(/{{customerName}}/g, customer.fullName?.split(' ')[0] || "Cliente")
        .replace(/{{groupLink}}/g, link);
};

const buildPersonGroupInviteMessage = (person: any) => {
    const settings = getSettings();
    const defaults = {
        groupInviteMessage: 'Se quiser ficar por dentro de novas ofertas e promoções, clique nesse grupo, estarei sempre enviando por lá: {{groupLink}}',
        groupInviteLink: 'https://chat.whatsapp.com/FtqlGwW7pdI9Jzgl8VRia6?mode=gi_t'
    };
    
    let message = settings.whatsappTemplates?.groupInviteMessage || defaults.groupInviteMessage;
    const link = settings.whatsappTemplates?.groupInviteLink || defaults.groupInviteLink;
    
    return message
        .replace(/{{customerName}}/g, person.fullName?.split(' ')[0] || "Cliente")
        .replace(/{{groupLink}}/g, link);
};

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

const buildAssistanceServiceOrderMessage = (order: Order) => {
    const customer = order.customerData;
    
    // date
    const sched = order.shipping?.scheduling;
    const date = (sched?.dateType === 'range' && sched?.endDate)
        ? `de ${formatDate(sched.date)} até ${formatDate(sched.endDate)}`
        : (sched?.date ? formatDate(sched.date) : 'A confirmar');

    // time
    let time = "";
    if (sched) {
        if (sched.notInformed) {
            time = "A combinar";
        } else if (sched.type === 'range' && sched.startTime && sched.endTime) {
            time = `${sched.startTime} às ${sched.endTime}`;
        } else if (sched.startTime) {
            time = sched.startTime;
        } else if (sched.time) {
            time = sched.time;
        }
    }

    let message = `🛠️ *ORDEM DE SERVIÇO - ASSISTÊNCIA*\n____________________\n\n`;
    message += `👤 *Cliente:* ${customer.fullName || 'Não informado'}\n`;
    message += `📞 *Fone:* ${customer.phone || 'Não informado'}\n`;
    const address = order.shipping?.noAddress 
        ? (order.shipping?.deliveryMethod === 'pickup' ? "Retirada em loja" : "Não informado")
        : stringifyFullAddressWithObservation(customer.fullAddress);
    message += `🏠 *Endereço:* ${address}\n\n`;
    
    message += `🗓️ *Agendamento:* ${date}\n`;
    message += `🕒 *Janela:* ${time || 'A combinar'}\n\n`;
    
    message += `📦 *Itens do Chamado:*\n`;
    const hasAssistanceItems = order.assistanceItems && order.assistanceItems.length > 0;
    const hasItems = order.items && order.items.length > 0;

    if (hasAssistanceItems) {
        order.assistanceItems!.forEach((item) => {
            message += `• ${item.quantity}x ${item.description}\n`;
        });
    } else if (hasItems) {
        order.items.forEach((item) => {
            message += `• ${item.quantity}x ${item.description}\n`;
        });
    } else {
        message += `• Nenhum item especificado\n`;
    }
    
    if (order.assistanceDescription) {
        message += `\n📝 *Defeito Relatado:*\n${order.assistanceDescription}\n`;
    }
    
    if (order.observation) {
        message += `\n💡 *Obs Interna:*\n${order.observation}\n`;
    }
    
    message += `\n👤 *Vendedor:* ${order.seller || 'Não informado'}`;
    
    return message;
};

export const assistanceServiceOrderWhatsappUrl = (order: Order) => {
    const message = buildAssistanceServiceOrderMessage(order);
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
};

/**
 * Orçamentos
 */

const buildBudgetWhatsappMessage = (order: Order) => {
    const customer = order.customerData;
    const firstName = customer.fullName?.split(' ')[0] || "Cliente";
    
    let message = `*ORÇAMENTO - MÓVEIS MORANTE*\n\n`;
    message += `Olá ${firstName}, segue o orçamento solicitado:\n\n`;

    const addrStr = stringifyFullAddressWithObservation(customer.fullAddress);
    if (addrStr) {
        message += `*Endereço:* ${addrStr}\n\n`;
    }
    
    message += `*Itens:*\n`;
    if (order.items && order.items.length > 0) {
        order.items.forEach((item) => {
            const unitPrice = item.unitPrice || 0;
            const qty = item.quantity || 1;
            const unitDisc = item.unitDiscount || 0;
            
            const subtotal = unitPrice * qty;
            const unitDiscount = item.discountType === 'fixed' ? unitDisc : (unitPrice * unitDisc) / 100;
            const totalDiscount = unitDiscount * qty;
            const finalValue = subtotal - totalDiscount;

            let itemLine = `• *${qty}x ${item.description}* | Subtotal: ${formatCurrency(subtotal)}`;
            if (totalDiscount > 0) {
                itemLine += ` | Desconto: -${formatCurrency(totalDiscount)}`;
            }
            itemLine += ` | Valor Final: ${formatCurrency(finalValue)}\n`;
            
            message += itemLine;
        });
    }
    
    message += `\n*Valor Total:* ${formatCurrency(order.paymentsSummary.totalOrderValue || 0)}\n\n`;
    
    if (order.observation) {
        message += `*Observações:*\n${order.observation}\n\n`;
    }
    
    message += `Fico à disposição para qualquer dúvida!\n`;
    message += `*Atendente:* ${order.seller || 'Morante'}`;
    
    return message;
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