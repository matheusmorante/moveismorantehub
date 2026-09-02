import { describe, expect, it } from 'vitest';
import { getNotificationSoundRoute, isNewScheduledOrderNotification, isOrderCancelledNotification, isOrderUpdatedNotification } from './notificationSoundRouting';

describe('som da notificação de novo pedido agendado', () => {
    it('usa level up seguido da voz somente na criação agendada', () => {
        const payload = { type: 'order_created', orderData: { status: 'scheduled' } };
        expect(isNewScheduledOrderNotification(payload)).toBe(true);
        expect(getNotificationSoundRoute(payload).sound).toBe('levelup.mp3');
    });

    it.each([
        { type: 'order_created', orderData: { status: 'draft' } },
        { type: 'assembly_outside', orderData: { status: 'scheduled' } },
        { type: 'system', orderData: {} },
    ])('mantém som padrão nos demais avisos', (payload) => {
        expect(getNotificationSoundRoute(payload).sound).toBe('default');
    });

    it('usa o som exclusivo para pedido alterado', () => {
        const payload = { type: 'order_edited', orderData: { status: 'scheduled' } };
        expect(isOrderUpdatedNotification(payload)).toBe(true);
        expect(getNotificationSoundRoute(payload)).toEqual({
            sound: 'order_updated.mp3',
            channelId: 'morante_order_updated_v2',
        });
    });

    it('prioriza o som exclusivo quando o pedido é cancelado', () => {
        const payload = { type: 'order_edited', orderData: { status: 'cancelled' } };
        expect(isOrderCancelledNotification(payload)).toBe(true);
        expect(getNotificationSoundRoute(payload)).toEqual({
            sound: 'order_cancelled.mp3',
            channelId: 'morante_order_cancelled_v2',
        });
    });
});
