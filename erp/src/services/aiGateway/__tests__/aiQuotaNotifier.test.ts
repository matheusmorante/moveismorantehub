import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    isQuotaExceeded,
    notifyAiQuotaWarning,
    getActiveAiQuotaAlerts,
    dismissAiQuotaAlert,
    clearAllAiQuotaAlerts,
    subscribeAiQuotaAlerts,
} from '../aiQuotaNotifier';

describe('aiQuotaNotifier', () => {
    beforeEach(() => {
        clearAllAiQuotaAlerts();
    });

    it('identifica corretamente erros de cota e rate limit', () => {
        expect(isQuotaExceeded({ message: 'HTTP 429: Resource has been exhausted' })).toBe(true);
        expect(isQuotaExceeded({ errorCode: 'AI_RATE_LIMIT_EXCEEDED' })).toBe(true);
        expect(isQuotaExceeded({ errorCode: 'AI_DAILY_LIMIT_REACHED' })).toBe(true);
        expect(isQuotaExceeded({ userFriendlyMessage: 'Limite diário de uso de IA atingido' })).toBe(true);
        expect(isQuotaExceeded('RESOURCE_EXHAUSTED')).toBe(true);
        expect(isQuotaExceeded(new Error('Quota exceeded for model gemini-3.5-flash-lite'))).toBe(true);

        expect(isQuotaExceeded({ message: 'SyntaxError: Unexpected token' })).toBe(false);
        expect(isQuotaExceeded(null)).toBe(false);
        expect(isQuotaExceeded(undefined)).toBe(false);
    });

    it('registra e atualiza alertas no Header por modelo sem disparar toast', () => {
        notifyAiQuotaWarning('gemini-3.5-flash-lite', 'descrição de produto');
        let alerts = getActiveAiQuotaAlerts();
        expect(alerts).toHaveLength(1);
        expect(alerts[0].model).toBe('gemini-3.5-flash-lite');
        expect(alerts[0].featureLabel).toBe('descrição de produto');

        // Atualização do mesmo modelo não deve duplicar itens no Header
        notifyAiQuotaWarning('gemini-3.5-flash-lite', 'extração de cor');
        alerts = getActiveAiQuotaAlerts();
        expect(alerts).toHaveLength(1);
        expect(alerts[0].featureLabel).toBe('extração de cor');

        // Modelo adicional deve ser registrado separadamente
        notifyAiQuotaWarning('gemini-3.8-flash', 'NCM');
        alerts = getActiveAiQuotaAlerts();
        expect(alerts).toHaveLength(2);

        // Usuário fecha/dispensa o aviso do modelo específico
        dismissAiQuotaAlert('gemini-3.5-flash-lite');
        alerts = getActiveAiQuotaAlerts();
        expect(alerts).toHaveLength(1);
        expect(alerts[0].model).toBe('gemini-3.8-flash');
    });

    it('notifica inscritos via subscribeAiQuotaAlerts em tempo real', () => {
        const mockCallback = vi.fn();
        const unsubscribe = subscribeAiQuotaAlerts(mockCallback);

        expect(mockCallback).toHaveBeenCalledWith([]);

        notifyAiQuotaWarning('gemini-3.5-flash-lite');
        expect(mockCallback).toHaveBeenLastCalledWith(
            expect.arrayContaining([expect.objectContaining({ model: 'gemini-3.5-flash-lite' })])
        );

        unsubscribe();
    });
});

