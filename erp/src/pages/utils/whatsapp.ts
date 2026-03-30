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
        .replace(/{{address}}/g, stringifyFullAddress(customer.fullAddress))
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
    const settings = getSettings();

    const scheduledDate = (order as any).scheduledDate || '';
    const scheduledTime = (order as any).scheduledTime || '';
    const assistanceDescription = (order as any).assistanceDescription || 'Serviço técnico';

    // Format date to BR format
    let formattedDate = scheduledDate;
    if (scheduledDate) {
        try {
            const [year, month, day] = scheduledDate.split('-');
            formattedDate = `${day}/${month}/${year}`;
        } catch { /* keep raw */ }
    }

    let message = settings.whatsappTemplates?.assistanceConfirmation || 
        `*Olá ${customer.fullName}!* 🔧\n\nSeu atendimento de assistência técnica foi confirmado!\n\n🗓️ *Data:* ${formattedDate || 'A confirmar'}\n🕒 *Horário:* ${scheduledTime || 'A confirmar'}\n\n📋 *Serviço:*\n${assistanceDescription}\n\nEm caso de dúvidas, entre em contato!`;

    return message
        .replace(/{{customerName}}/g, customer.fullName || 'Cliente')
        .replace(/{{assistanceDate}}/g, formattedDate || 'A confirmar')
        .replace(/{{assistanceTime}}/g, scheduledTime || 'A confirmar')
        .replace(/{{phone}}/g, customer.phone || "Não informado")
        .replace(/{{additionalContacts}}/g, stringifyAdditionalContacts(customer.additionalContacts))
        .replace(/{{customerObservations}}/g, customer.observations || "")
        .replace(/{{assistanceDescription}}/g, assistanceDescription)
        .replace(/{{companyPhone}}/g, settings.companyPhone || '')
        .replace(/{{seller}}/g, order.seller || "Não informado")
        .replace(/{{observation}}/g, order.observation || '');
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