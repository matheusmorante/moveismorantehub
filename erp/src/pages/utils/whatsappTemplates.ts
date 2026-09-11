import Order from "../types/order.type";
import { getSettings } from '@/pages/utils/settingsService';
import {
    stringifyFullAddressWithObservation,
    stringifyPayments,
    stringifyItemsWithValues,
    formatDate,
    formatCurrency,
    toTitleCase
} from "./formatters";
import { getShippingRouteUrl } from "./maps";

export const stringifyAdditionalContacts = (contacts?: { name: string, phone: string }[]) => {
    if (!contacts || contacts.length === 0) return "";
    return contacts.map(c => `• ${c.name}: ${c.phone}`).join('\n');
};

export const buildDeliveryMessage = (order: Order) => {
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
    const customerNameFormatted = toTitleCase(customer?.fullName || "Cliente");
    
    let message = settings.whatsappTemplates?.deliveryInfo || "";
    
    if (!message) {
        message = order.shipping?.deliveryMethod === 'pickup' 
            ? `*REIRA: Novo Pedido para Retirada de ${customerNameFormatted}*` 
            : `Novo Pedido para ${customerNameFormatted}...`; 
    }

    let itemsBlock = stringifyItemsWithValues(order.items || []);
    if (order.shipping?.value && order.shipping.value > 0) {
        itemsBlock += `\n*Frete:* ${formatCurrency(order.shipping.value)}`;
    }

    const mapsLink = (
        order.shipping?.deliveryAddress?.mapsUrl ||
        (order.shipping?.deliveryAddress as any)?.googleMapsUrl ||
        (order.shipping?.deliveryAddress as any)?.mapsLink ||
        (order.shipping as any)?.mapsUrl ||
        customer.fullAddress?.mapsUrl ||
        (customer.fullAddress as any)?.googleMapsUrl ||
        (customer.fullAddress as any)?.mapsLink ||
        (customer as any)?.mapsUrl ||
        ''
    )?.trim() || null;

    let finalMessage = message
        .replace(/{{customerName}}/g, () => customerNameFormatted)
        .replace(/{{deliveryDate}}/g, () => date)
        .replace(/{{deliveryTime}}/g, () => time)
        .replace(/{{phone}}/g, () => customer.phone || "Não informado")
        .replace(/{{additionalContacts}}/g, () => stringifyAdditionalContacts(customer.additionalContacts))
        .replace(/{{customerObservations}}/g, () => customer.observations || "")
        .replace(/{{address}}/g, () => {
            if (order.shipping?.noAddress) return order.shipping?.deliveryMethod === 'pickup' ? "Retirada em loja" : "Não informado";
            const effectiveAddr = order.shipping?.deliveryAddress || customer.fullAddress;
            let addrStr = stringifyFullAddressWithObservation(effectiveAddr);
            if (mapsLink) {
                addrStr += `\n📍 *Localização (Google Maps):* ${mapsLink}`;
            }
            return addrStr;
        })
        .replace(/{{items}}/g, () => itemsBlock)
        .replace(/{{payments}}/g, () => stringifyPayments(order.payments || []))
        .replace(/{{totalValue}}/g, () => formatCurrency(order.paymentsSummary?.totalOrderValue || 0))
        .replace(/{{observation}}/g, () => order.observation || "Sem observações")
        .replace(/{{seller}}/g, () => order.seller || "Não informado")
        .replace(/{{routeUrl}}/g, () => mapsLink || (order.shipping?.deliveryAddress || customer.fullAddress ? getShippingRouteUrl(order.shipping?.deliveryAddress || customer.fullAddress) : "Endereço não informado"));

    if (order.shipping?.deliveryMethod === 'pickup') {
        finalMessage = finalMessage
            .replace(/Entrega/g, 'Retirada')
            .replace(/entrega/g, 'retirada')
            .replace(/ENTREGA/g, 'RETIRADA');
    }

    finalMessage = finalMessage.replace(/R\$\s*R\$/g, 'R$');

    return finalMessage;
};

export const buildCustomerOrderMessage = (order: Order) => {
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

export const buildAssistanceMessage = (order: Order) => {
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

export const buildAssistanceOrderDetailsMessage = (order: Order) => {
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
            const obs = item.observation?.trim() ? ` - ${item.observation.trim()}` : '';
            message += `• ${item.quantity}x ${item.description}${obs}\n`;
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

export const buildGroupInviteMessage = (order: Order) => {
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

export const buildPersonGroupInviteMessage = (person: any) => {
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

export const buildAssistanceServiceOrderMessage = (order: Order) => {
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
            const obs = item.observation?.trim() ? ` - ${item.observation.trim()}` : '';
            message += `• ${item.quantity}x ${item.description}${obs}\n`;
        });
    } else if (hasItems) {
        order.items.forEach((item) => {
            const obs = item.observation?.trim() ? ` - ${item.observation.trim()}` : '';
            message += `• ${item.quantity}x ${item.description}${obs}\n`;
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

export const buildBudgetWhatsappMessage = (order: Order) => {
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

            const obs = item.observation?.trim() ? ` - ${item.observation.trim()}` : '';
            let itemLine = `• *${qty}x ${item.description}${obs}* | Subtotal: ${formatCurrency(subtotal)}`;
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
