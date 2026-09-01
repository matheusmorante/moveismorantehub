import { describe, expect, it } from 'vitest';
import { getOperationalScheduleDate, isScheduledAssistanceOrReturn } from './operationalSchedule';

describe('cronograma operacional', () => {
    it('inclui assistência agendada com scheduledDate', () => {
        const order = { orderType: 'assistance', status: 'scheduled', scheduledDate: '2026-09-10' };
        expect(isScheduledAssistanceOrReturn(order)).toBe(true);
    });

    it('inclui devolução agendada pela data de coleta', () => {
        const order = { orderType: 'return', status: 'scheduled', shipping: { scheduling: { date: '2026-09-11' } } };
        expect(isScheduledAssistanceOrReturn(order)).toBe(true);
    });

    it('lê variações persistidas pelo aplicativo', () => {
        expect(getOperationalScheduleDate({ order_data: { scheduledDate: '2026-09-12' } })).toBe('2026-09-12');
    });

    it.each(['cancelled', 'draft', 'fulfilled'])('não trata %s como agendado', (status) => {
        expect(isScheduledAssistanceOrReturn({ orderType: 'return', status, scheduledDate: '2026-09-10' })).toBe(false);
    });
});
