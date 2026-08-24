import Order from '../types/order.type';
import { getSettings } from './settingsService';
import { whatsappGraphService } from './whatsappGraphService';
import { formatDate, stringifyFullAddressWithObservation } from './formatters';
import { toast } from 'react-toastify';

export interface DeliveryReminderResult {
    sent: boolean;
    reason?: string;
    mode?: 'same_day_space_reminder' | 'scheduled_reminder_with_button';
    message?: string;
}

/**
 * Normaliza datas para YYYY-MM-DD
 */
const normalizeDateStr = (dateVal: any): string => {
    if (!dateVal) return '';
    if (typeof dateVal === 'string') {
        const parts = dateVal.split('T')[0].split('-');
        if (parts.length === 3) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Identifica itens do pedido que exigem "Montagem Fora" (na casa do cliente)
 */
export const getOutsideAssemblyItems = (order: Order): any[] => {
    if (!order.items || order.items.length === 0) return [];
    
    const settings = getSettings();
    const allHandlingOptions = [
        ...(settings.deliveryHandlingOptions || []),
        ...(settings.pickupHandlingOptions || [])
    ];

    return order.items.filter(item => {
        if (!item.handlingType) return false;
        const optName = item.handlingType.trim().toLowerCase();
        
        // Verifica se a opção de manuseio está configurada com isAssemblyOutside === true
        const match = allHandlingOptions.find(o => o.label.trim().toLowerCase() === optName);
        if (match && match.isAssemblyOutside) return true;

        // Fallback por palavra-chave se a flag explícita não estiver setada
        return optName.includes('fora') || optName.includes('local') || optName.includes('casa');
    });
};

/**
 * Constrói a mensagem de lembrete de acordo com a regra de mesma data e montagem fora
 */
export const buildDeliveryReminderMessageContent = (order: Order) => {
    const settings = getSettings();
    const customerName = order.customerData?.fullName?.split(' ')[0] || 'Cliente';
    const sched = order.shipping?.scheduling;
    
    const deliveryDateStr = sched?.date ? formatDate(sched.date) : 'Hoje';
    
    let timeStr = 'Não informado';
    if (sched) {
        if (sched.notInformed) timeStr = 'A combinar';
        else if (sched.type === 'range' && sched.startTime && sched.endTime) timeStr = `${sched.startTime} às ${sched.endTime}`;
        else if (sched.startTime) timeStr = sched.startTime;
        else if (sched.time) timeStr = sched.time;
    }

    const addressStr = order.shipping?.noAddress 
        ? 'Retirada em Loja'
        : stringifyFullAddressWithObservation(order.customerData?.fullAddress);

    const outsideAssemblyItems = getOutsideAssemblyItems(order);
    const furnitureNames = outsideAssemblyItems.map(i => i.description).join(', ');

    // 1. Regra da Mesma Data (Criado hoje para entrega hoje)
    const createdDate = normalizeDateStr(order.createdAt || (order as any).created_at);
    const scheduledDate = normalizeDateStr(sched?.date);
    const isSameDay = !!(createdDate && scheduledDate && createdDate === scheduledDate);

    if (isSameDay) {
        if (outsideAssemblyItems.length === 0) {
            return {
                isSameDay: true,
                shouldSend: false,
                reason: 'Pedido feito no mesmo dia sem itens de montagem fora.',
                message: ''
            };
        }

        const template = settings.deliveryReminderAutomation?.sameDaySpaceReminderTemplate ||
            '📦 *LEMBRETE DE MONTAGEM - MÓVEIS MORANTE*\n\nOlá {{customerName}}, para a entrega de hoje do(s) seu(s) móvel(is) *{{furnitureItems}}*, lembramos a gentileza de deixar o espaço limpo e livre no local para a realização da montagem!';

        const msg = template
            .replace(/{{customerName}}/g, customerName)
            .replace(/{{furnitureItems}}/g, furnitureNames || 'seus móveis');

        return {
            isSameDay: true,
            shouldSend: true,
            mode: 'same_day_space_reminder' as const,
            message: msg
        };
    }

    // 2. Regra de Entregas Agendadas para datas futuras (Lembrete 12h antes)
    let assemblyNotice = '';
    if (outsideAssemblyItems.length > 0) {
        assemblyNotice = `\n\n📌 *Aviso de Montagem:* Para a montagem do(s) móvel(is) *${furnitureNames}*, solicitamos a gentileza de deixar o espaço limpo e livre no local.`;
    }

    const template = settings.deliveryReminderAutomation?.reminderTemplate ||
        '📦 *LEMBRETE DE ENTREGA - MÓVEIS MORANTE*\n\nOlá {{customerName}}, lembramos que sua entrega está agendada para:\n🗓️ *Data:* {{deliveryDate}}\n⏰ *Horário/Período:* {{deliveryTime}}\n🏠 *Endereço:* {{address}}{{assemblyNotice}}\n\nPor favor, confirme se o local estará acessível no horário agendado.';

    const msg = template
        .replace(/{{customerName}}/g, customerName)
        .replace(/{{deliveryDate}}/g, deliveryDateStr)
        .replace(/{{deliveryTime}}/g, timeStr)
        .replace(/{{address}}/g, addressStr)
        .replace(/{{assemblyNotice}}/g, assemblyNotice)
        .replace(/{{furnitureItems}}/g, furnitureNames || 'seus móveis');

    return {
        isSameDay: false,
        shouldSend: true,
        mode: 'scheduled_reminder_with_button' as const,
        message: msg
    };
};

/**
 * Processa o envio do lembrete de entrega para um pedido específico via Meta WhatsApp Cloud API
 */
export const processDeliveryReminderForOrder = async (order: Order, forceManual: boolean = false): Promise<DeliveryReminderResult> => {
    const settings = getSettings();
    const config = settings.deliveryReminderAutomation;

    if (!forceManual && !config?.enabled) {
        return { sent: false, reason: 'Automação desativada nas configurações.' };
    }

    const orderType = order.orderType || 'sale';
    if (orderType !== 'sale') {
        return { sent: false, reason: 'Válido apenas para pedidos de venda.' };
    }

    if (order.shipping?.deliveryMethod !== 'delivery') {
        return { sent: false, reason: 'Válido apenas para modalidade de entrega.' };
    }

    const phone = order.customerData?.phone;
    if (!phone) {
        return { sent: false, reason: 'Cliente sem telefone cadastrado.' };
    }

    const content = buildDeliveryReminderMessageContent(order);

    if (!content.shouldSend) {
        return { sent: false, reason: content.reason || 'Não atende aos critérios de envio.' };
    }

    try {
        if (content.isSameDay) {
            // No mesmo dia: envia apenas texto de lembrete de espaço para montagem (sem botão)
            await whatsappGraphService.sendTextMessage(phone, content.message);
            if (forceManual) toast.success("Mensagem enviada com sucesso");
            return { sent: true, mode: 'same_day_space_reminder', message: content.message };
        } else {
            // Entrega futura: envia com Botão Interativo customizável
            await whatsappGraphService.sendInteractiveButtonMessage(
                phone,
                content.message,
                config?.buttonTitle || 'Confirmar Entrega',
                `confirm_delivery_${order.id}`
            );
            if (forceManual) toast.success("Mensagem enviada com sucesso");
            return { sent: true, mode: 'scheduled_reminder_with_button', message: content.message };
        }
    } catch (error: any) {
        console.error(`Erro ao disparar lembrete de entrega para pedido #${order.id}:`, error);
        if (forceManual) toast.error("Erro na API do WhatsApp ao enviar o lembrete.");
        return { sent: false, reason: error?.message || 'Falha no disparo da API' };
    }
};
