import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../pages/utils/supabaseConfig', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    gte: vi.fn(() => ({
                        lte: vi.fn().mockResolvedValue({ data: [], error: null })
                    }))
                }))
            })),
            upsert: vi.fn().mockResolvedValue({ error: null }),
            insert: vi.fn().mockResolvedValue({ error: null })
        })),
        rpc: vi.fn().mockResolvedValue({ data: 'mock-id', error: null })
    },
    ecommerceSupabase: {}
}));

import { ApiUsageGuard } from '../apiUsageGuard';
import { ApiConfigService, DEFAULT_API_CONFIGURATIONS } from '../apiConfigService';
import { ApiUsageTracker } from '../apiUsageTracker';

describe('ApiUsageGuard - Controle de Cota e Prevenção de Custos', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        ApiUsageGuard.clearCache();
    });

    it('deve permitir requisições quando o consumo estiver saudável abaixo dos limites', async () => {
        vi.spyOn(ApiUsageTracker, 'getCurrentMonthUsage').mockResolvedValue(100); // 100 de 10.000 = 1%
        
        const result = await ApiUsageGuard.check('google_routes');
        expect(result.allowed).toBe(true);
        expect(result.status).toBe('ALLOW');
        expect(result.usagePercent).toBeLessThan(70);
    });

    it('deve retornar status WARNING quando o consumo ultrapassar 70%', async () => {
        vi.spyOn(ApiUsageTracker, 'getCurrentMonthUsage').mockResolvedValue(750); // 75% de 1.000
        
        const result = await ApiUsageGuard.check('google_routes');
        expect(result.allowed).toBe(true);
        expect(result.status).toBe('WARNING');
        expect(result.usagePercent).toBe(75);
    });

    it('deve retornar status CRITICAL quando o consumo ultrapassar 90%', async () => {
        vi.spyOn(ApiUsageTracker, 'getCurrentMonthUsage').mockResolvedValue(920); // 92% de 1.000
        
        const result = await ApiUsageGuard.check('google_routes');
        expect(result.allowed).toBe(true);
        expect(result.status).toBe('CRITICAL');
        expect(result.usagePercent).toBe(92);
    });

    it('deve BLOQUEAR requisição não crítica ao atingir o Hard Limit (95%) para evitar cobrança', async () => {
        vi.spyOn(ApiUsageTracker, 'getCurrentMonthUsage').mockResolvedValue(960); // 96% de 1.000
        
        const result = await ApiUsageGuard.check('google_routes');
        expect(result.allowed).toBe(false);
        expect(result.status).toBe('BLOCKED');
        expect(result.reason).toContain('Limite de segurança atingido');
    });

    it('NUNCA deve bloquear integração fiscal classificada como CRITICAL mesmo acima do limite', async () => {
        vi.spyOn(ApiUsageTracker, 'getCurrentMonthUsage').mockResolvedValue(10500); // Acima de 100%
        
        const result = await ApiUsageGuard.check('sefaz_nfe');
        expect(result.allowed).toBe(true);
        expect(result.status).toBe('CRITICAL');
        expect(result.reason).toContain('Permitido por ser serviço fiscal crítico');
    });

    it('deve respeitar desativação administrativa da integração', async () => {
        vi.spyOn(ApiConfigService, 'getConfiguration').mockResolvedValue({
            ...DEFAULT_API_CONFIGURATIONS.gemini_flash,
            enabled: false
        });

        const result = await ApiUsageGuard.check('gemini_flash');
        expect(result.allowed).toBe(false);
        expect(result.status).toBe('BLOCKED');
        expect(result.reason).toContain('desativada nas configurações administrativas');
    });

    it('deve acionar o Circuit Breaker contra loops quando exceder o teto de requisições por minuto', async () => {
        vi.spyOn(ApiUsageTracker, 'getCurrentMonthUsage').mockResolvedValue(100);
        vi.spyOn(ApiConfigService, 'getConfiguration').mockResolvedValue({
            ...DEFAULT_API_CONFIGURATIONS.google_route_optimization,
            circuit_breaker_max_per_minute: 5
        });

        // Simula 5 verificações rápidas no mesmo minuto
        for (let i = 0; i < 5; i++) {
            ApiUsageGuard.clearCache(); // força reavaliação imediata
            await ApiUsageGuard.check('google_route_optimization');
        }

        // A 6ª verificação deve disparar o Circuit Breaker
        ApiUsageGuard.clearCache();
        const tripResult = await ApiUsageGuard.check('google_route_optimization');
        expect(tripResult.allowed).toBe(false);
        expect(tripResult.status).toBe('BLOCKED');
        expect(tripResult.circuitBroken).toBe(true);
        expect(tripResult.reason).toContain('Circuit Breaker');
    });
});
