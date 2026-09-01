import { describe, expect, it } from 'vitest';
import { shouldShowOrderInSchedule } from './scheduleOrderVisibility';

describe('shouldShowOrderInSchedule', () => {
    it.each(['cancelled', 'canceled', 'cancelado', 'CANCELLED']) (
        'oculta status cancelado %s',
        (status) => expect(shouldShowOrderInSchedule({ status })).toBe(false)
    );

    it('oculta cancelamento salvo no order_data', () => {
        expect(shouldShowOrderInSchedule({ order_data: { status: 'cancelled' } })).toBe(false);
    });

    it('mantém devolução agendada no cronograma', () => {
        expect(shouldShowOrderInSchedule({ orderType: 'return', status: 'scheduled' })).toBe(true);
    });
});
