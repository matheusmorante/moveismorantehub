import { describe, expect, it } from 'vitest';
import { getNotificationSoundRoute, isNewScheduledOrderNotification } from './notificationSoundRouting';

describe('som da notificação de novo pedido agendado', () => {
    it('usa level up seguido da voz somente na criação agendada', () => {
        const payload = { type: 'order_created', orderData: { status: 'scheduled' } };
        expect(isNewScheduledOrderNotification(payload)).toBe(true);
        expect(getNotificationSoundRoute(payload).sound).toBe('levelup.mp3');
    });

    it.each([
        { type: 'order_created', orderData: { status: 'draft' } },
        { type: 'order_edited', orderData: { status: 'scheduled' } },
        { type: 'assembly_outside', orderData: { status: 'scheduled' } },
        { type: 'system', orderData: {} },
    ])('mantém som padrão nos demais avisos', (payload) => {
        expect(getNotificationSoundRoute(payload).sound).toBe('default');
    });
});
