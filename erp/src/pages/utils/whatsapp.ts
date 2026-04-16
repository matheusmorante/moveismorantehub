import Order from "../types/order.type";
import { getSettings } from '@/pages/utils/settingsService';
import {
    stringifyFullAddress, stringifyFullAddressWithObservation,
    stringifyPayments, stringifyItemsWithValues, formatDate
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
    const date = formatDate(order.shipping.scheduling.date);
    const time = order.shipping.scheduling.time || "Não informado";
    const customer = order.customerData;
    
    let message = settings.whatsappTemplates?.deliveryInfo || "";
    
    if (!message) {
        message = `Novo Pedido para ${customer.fullName || "Cliente"}...`; 
    }

    return message
        .replace(/{{customerName}}/g, customer.fullName || "Cliente")
        .replace(/{{deliveryDate}}/g, date)
        .replace(/{{deliveryTime}}/g, time)
        .replace(/{{phone}}/g, customer.phone || "Não informado")
        .replace(/{{additionalContacts}}/g, stringifyAdditionalContacts(customer.additionalContacts))
        .replace(/{{customerObservations}}/g, customer.observations || "")
        .replace(/{{address}}/g, stringifyFullAddressWithObservation(customer.fullAddress))
        .replace(/{{items}}/g, stringifyItemsWithValues(order.items || []))
        .replace(/{{payments}}/g, stringifyPayments(order.payments || []))
        .replace(/{{totalValue}}/g, (order.paymentsSummary.totalOrderValue || 0).toString())
        .replace(/{{observation}}/g, order.observation || "Sem observações")
        .replace(/{{seller}}/g, order.seller || "Não informado")
        .replace(/{{routeUrl}}/g, customer.fullAddress ? getShippingRouteUrl(customer.fullAddress) : "Endereço não informado");
};

const buildCustomerOrderMessage = (order: Order) => {
    const settings = getSettings();
    const date = formatDate(order.shipping.scheduling.date);
    const time = order.shipping.scheduling.time || "Não informado";
    const customer = order.customerData;
    
    let message = settings.whatsappTemplates?.orderConfirmation || "";
    
    return message
        .replace(/{{customerName}}/g, customer.fullName || "Cliente")
        .replace(/{{deliveryDate}}/g, date)
        .replace(/{{deliveryTime}}/g, time)
        .replace(/{{address}}/g, stringifyFullAddressWithObservation(customer.fullAddress))
        .replace(/{{items}}/g, stringifyItemsWithValues(order.items || []))
        .replace(/{{totalValue}}/g, (order.paymentsSummary.totalOrderValue || 0).toString())
        .replace(/{{seller}}/g, order.seller || "Não informado")
        .replace(/{{payments}}/g, stringifyPayments(order.payments || []));
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

export const sendDirectShippingMessage = async (order: Order) => {
    const settings = getSettings();
    const deliveryPhone = settings.orderAutomation?.deliveryPhone;
    
    if (!deliveryPhone) {
        toast.info("Telefone da equipe de entrega não configurado. Abrindo link manual...");
        window.open(shippingOrderWhatsappUrl(order), "_blank");
        return;
    }

    try {
        const message = buildDeliveryMessage(order);
        await whatsappGraphService.sendTextMessage(deliveryPhone, message);
        toast.success("Entrega enviada com sucesso!");
    } catch (error) {
        console.error("Erro ao enviar mensagem direta:", error);
        toast.error("Erro na API do WhatsApp. Abrindo link manual...");
        window.open(shippingOrderWhatsappUrl(order), "_blank");
    }
};

export const sendDirectCustomerMessage = async (order: Order) => {
    const customer = order.customerData;
    if (!customer?.phone) {
        toast.error("Cliente sem telefone cadastrado.");
        return;
    }

    try {
        const message = buildCustomerOrderMessage(order);
        await whatsappGraphService.sendTextMessage(customer.phone, message);
        toast.success("Mensagem enviada para o cliente com sucesso!");
    } catch (error) {
        console.error("Erro ao enviar mensagem direta:", error);
        toast.error("Erro na API. Abrindo link manual...");
        window.open(customerOrderWhatsappUrl(order), "_blank");
    }
};

const buildAssistanceMessage = (order: Order) => {
    const customer = order.customerData;

    // Format date
    const d = order.shipping?.scheduling?.date;
    const formattedDate = d ? formatDate(d) : 'data a confirmar';

    // Format time/period
    const sched = order.shipping?.scheduling;
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
    const produtos = order.items && order.items.length > 0 
        ? order.items.map(i => i.description || "Produto").join(', ') 
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

    try {
        const message = buildAssistanceMessage(order);
        await whatsappGraphService.sendTextMessage(customer.phone, message);
        toast.success("Mensagem enviada para o cliente com sucesso!");
    } catch (error) {
        console.error("Erro ao enviar mensagem direta de assistência:", error);
        toast.error("Erro na API. Abrindo link manual...");
        window.open(assistanceCustomerWhatsappUrl(order), "_blank");
    }
};

const buildAssistanceOrderDetailsMessage = (order: Order) => {
    const customer = order.customerData;
    
    // date
    const d = order.shipping?.scheduling?.date;
    const date = d ? formatDate(d) : 'A confirmar';

    // time
    const sched = order.shipping?.scheduling;
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
    message += `*Endereço:* ${stringifyFullAddressWithObservation(customer.fullAddress)}\n\n`;
    
    message += `*Data Agendada:* ${date}\n`;
    message += `*Horário:* ${time || 'Não informado'}\n\n`;
    
    message += `*Itens da Assistência:*\n`;
    if (order.items && order.items.length > 0) {
        order.items.forEach((item) => {
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

    try {
        const message = buildAssistanceOrderDetailsMessage(order);
        await whatsappGraphService.sendTextMessage(customer.phone, message);
        toast.success("Pedido de Assistência enviado para o cliente com sucesso!");
    } catch (error) {
        console.error("Erro ao enviar pedido de assistência:", error);
        toast.error("Erro na API. Abrindo link manual...");
        window.open(assistanceOrderDetailsWhatsappUrl(order), "_blank");
    }
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

const buildAssistanceServiceOrderMessage = (order: Order) => {
    const customer = order.customerData;
    
    // date
    const d = order.scheduledDate || order.shipping?.scheduling?.date;
    const date = d ? formatDate(d) : 'A confirmar';

    // time
    const sched = order.shipping?.scheduling;
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
    message += `🏠 *Endereço:* ${stringifyFullAddressWithObservation(customer.fullAddress)}\n\n`;
    
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
            message += `• ${item.quantity}x ${item.description}\n`;
        });
    }
    
    message += `\n*Valor Total:* R$ ${(order.paymentsSummary.totalOrderValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;
    
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

    try {
        const message = buildBudgetWhatsappMessage(order);
        await whatsappGraphService.sendTextMessage(customer.phone, message);
        toast.success("Orçamento enviado com sucesso!");
    } catch (error) {
        console.error("Erro ao enviar orçamento direto:", error);
        toast.error("Erro na API. Abrindo link manual...");
        window.open(budgetWhatsappUrl(order), "_blank");
    }
};