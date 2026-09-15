import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { dispatchAppNotification, AppNotificationPayload } from '@/pages/utils/pushNotificationService';

type TestNotification = Pick<AppNotificationPayload, 'title' | 'message' | 'type' | 'orderData'> & {
    id: string;
    label: string;
    icon: string;
    className: string;
};

const notifications: TestNotification[] = [
    {
        id: 'created',
        label: 'Pedido criado / agendado',
        icon: 'bi-cart-check-fill',
        className: 'bg-emerald-600 hover:bg-emerald-700',
        title: '🛒 Teste — Novo pedido agendado',
        message: 'Teste do alerta para pedido criado e agendado.',
        type: 'order_created',
        orderData: { status: 'scheduled' },
    },
    {
        id: 'updated',
        label: 'Pedido alterado',
        icon: 'bi-pencil-square',
        className: 'bg-blue-600 hover:bg-blue-700',
        title: '✏️ Teste — Pedido alterado',
        message: 'Teste do alerta para alteração de pedido.',
        type: 'order_edited',
        orderData: { status: 'scheduled' },
    },
    {
        id: 'cancelled',
        label: 'Pedido cancelado',
        icon: 'bi-x-octagon-fill',
        className: 'bg-rose-600 hover:bg-rose-700',
        title: '⚠️ Teste — Pedido cancelado',
        message: 'Atenção: este é um teste do alerta de cancelamento.',
        type: 'order_edited',
        orderData: { status: 'cancelled' },
    },
];

const OrderNotificationTestSection = () => {
    const [sendingId, setSendingId] = useState<string | null>(null);

    const sendTest = async ({ id, label, ...payload }: TestNotification) => {
        setSendingId(id);
        try {
            await dispatchAppNotification(payload);
            toast.success(`Teste de “${label}” enviado.`);
        } catch (error) {
            console.error('[NotificationTest] Falha ao enviar teste:', error);
            toast.error(`Não foi possível enviar o teste de “${label}”.`);
        } finally {
            setSendingId(null);
        }
    };

    return (
        <div className="p-8 space-y-5">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                <div className="flex gap-3">
                    <i className="bi bi-phone-vibrate-fill text-lg" />
                    <p className="text-xs leading-relaxed font-medium">
                        Cada botão cria uma notificação de teste no histórico e a envia aos dispositivos com token ativo. Use para validar o app aberto, em segundo plano e fechado.
                    </p>
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                {notifications.map((notification) => (
                    <button
                        key={notification.id}
                        type="button"
                        disabled={sendingId !== null}
                        onClick={() => sendTest(notification)}
                        className={`flex min-h-28 flex-col items-start justify-between rounded-2xl p-5 text-left text-white shadow-sm transition disabled:cursor-wait disabled:opacity-60 ${notification.className}`}
                    >
                        <i className={`bi ${notification.icon} text-xl`} />
                        <span className="text-xs font-black uppercase tracking-wide">
                            {sendingId === notification.id ? 'Enviando…' : `Testar: ${notification.label}`}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default OrderNotificationTestSection;
