/** @vitest-environment jsdom */
import { expect, test, describe, beforeEach, afterEach, vi, Mock } from 'vitest';
import { supabaseMonitor, CircuitBreakerError } from '../../../services/monitoring';

describe('QueryGuard (SupabaseMonitorService)', () => {
    let mockFetch: Mock;

    beforeEach(() => {
        vi.useFakeTimers();
        mockFetch = vi.fn().mockResolvedValue({
            clone: function() { return this; },
            headers: new Headers()
        });
        window.fetch = mockFetch;
        // Limpar estado interno
        (supabaseMonitor as any).hitCounters = new Map();
        (supabaseMonitor as any).circuitStates = new Map();
        (supabaseMonitor as any).globalHitCounter = [];
        (supabaseMonitor as any).inFlightRequests = new Map();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('Caso A - loop de leitura (Circuit Breaker abre)', async () => {
        const url = 'https://hkoxhourxwlddgsfdgws.supabase.co/rest/v1/orders?select=*';
        
        let blockedCount = 0;
        let allowedCount = 0;

        for (let i = 0; i < 25; i++) {
            try {
                await supabaseMonitor.customFetch(url, { method: 'GET' });
                allowedCount++;
                vi.advanceTimersByTime(10); // Chamadas quase instantâneas
            } catch (e) {
                if (e instanceof CircuitBreakerError) {
                    blockedCount++;
                }
            }
        }

        // Limite MAX_READ_REQUESTS é 20, deduplicação pode intervir também.
        // Já que são chamadas "in flight" sendo resolvidas imediatamente neste mock sincrono, 
        // elas podem bater os contadores rápido.
        expect(blockedCount).toBeGreaterThan(0);
        expect(allowedCount).toBeLessThanOrEqual(20);
        
        // Verifica que window.fetch não foi chamado 25 vezes
        expect(mockFetch).toHaveBeenCalledTimes(allowedCount);
    });

    test('Caso B - chamadas legítimas diferentes (Não bloqueia)', async () => {
        for (let i = 0; i < 25; i++) {
            const url = `https://hkoxhourxwlddgsfdgws.supabase.co/rest/v1/orders?select=*&id=eq.${i}`;
            await supabaseMonitor.customFetch(url, { method: 'GET' });
            vi.advanceTimersByTime(10);
        }
        
        // Como o fingerprint muda por causa da URL diferente, não deve dar circuito aberto
        expect(mockFetch).toHaveBeenCalledTimes(25);
    });

    test('Caso C - chamadas simultâneas idênticas (Deduplicação)', async () => {
        const url = 'https://hkoxhourxwlddgsfdgws.supabase.co/rest/v1/customers?select=*';
        
        // Simular um fetch que demora um pouco (200ms)
        mockFetch.mockReturnValue(new Promise(resolve => {
            setTimeout(() => {
                resolve({ clone: function() { return this; }, headers: new Headers() });
            }, 200);
        }));

        // Disparar 5 requisições simultâneas sem avançar o timer
        const req1 = supabaseMonitor.customFetch(url, { method: 'GET' });
        const req2 = supabaseMonitor.customFetch(url, { method: 'GET' });
        const req3 = supabaseMonitor.customFetch(url, { method: 'GET' });
        
        vi.advanceTimersByTime(250); // Resolve as promises

        await Promise.all([req1, req2, req3]);
        
        // Deveria ter ido pra rede apenas 1 vez, e retornado a mesma promise clonada
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('Caso D - cooldown (OPEN -> HALF_OPEN -> CLOSED)', async () => {
        const url = 'https://hkoxhourxwlddgsfdgws.supabase.co/rest/v1/products?select=*';
        
        // Estourar o limite (21 chamadas síncronas)
        for (let i = 0; i < 25; i++) {
            try { await supabaseMonitor.customFetch(url, { method: 'GET' }); } catch (e) { /* no-op: intencionalmente silencioso */ }
        }
        
        // Deve estar OPEN agora
        await expect(supabaseMonitor.customFetch(url, { method: 'GET' })).rejects.toThrow(CircuitBreakerError);
        
        // Avançar o tempo (31 segundos = maior que COOLDOWN_MS de 30000ms)
        vi.advanceTimersByTime(31000);
        
        // Deve passar em HALF_OPEN e fechar o circuito
        await expect(supabaseMonitor.customFetch(url, { method: 'GET' })).resolves.not.toThrow();
    });

    test('Caso E - loop continua após cooldown (HALF_OPEN -> OPEN)', async () => {
        const url = 'https://hkoxhourxwlddgsfdgws.supabase.co/rest/v1/stocks?select=*';
        
        // Estourar
        for (let i = 0; i < 25; i++) {
            try { await supabaseMonitor.customFetch(url, { method: 'GET' }); } catch (e) { /* no-op: intencionalmente silencioso */ }
        }
        
        // Cooldown
        vi.advanceTimersByTime(31000);
        
        // Loop recomeça agressivamente
        let blockedCount = 0;
        for (let i = 0; i < 25; i++) {
            try { await supabaseMonitor.customFetch(url, { method: 'GET' }); } 
            catch (e) { if (e instanceof CircuitBreakerError) blockedCount++; }
        }

        expect(blockedCount).toBeGreaterThan(0);
    });

    test('Caso H - Escritas (POST/PATCH) bloqueiam com limite menor e NÃO deduplicam', async () => {
        const url = 'https://hkoxhourxwlddgsfdgws.supabase.co/rest/v1/orders';
        
        mockFetch.mockReturnValue(new Promise(resolve => {
            setTimeout(() => {
                resolve({ clone: function() { return this; }, headers: new Headers() });
            }, 100);
        }));

        // Disparar 3 inserções simultâneas
        const p1 = supabaseMonitor.customFetch(url, { method: 'POST', body: '{"a":1}' });
        const p2 = supabaseMonitor.customFetch(url, { method: 'POST', body: '{"a":1}' });
        const p3 = supabaseMonitor.customFetch(url, { method: 'POST', body: '{"a":1}' });
        
        vi.advanceTimersByTime(150);
        await Promise.all([p1, p2, p3]);

        // Não há deduplicação para POST, então as 3 foram pra rede
        expect(mockFetch).toHaveBeenCalledTimes(3);

        // O limite de WRITE é 10. Se mandarmos mais 8 iguais, deve abrir circuito
        let blocked = false;
        for (let i = 0; i < 8; i++) {
            try {
                await supabaseMonitor.customFetch(url, { method: 'POST', body: '{"a":1}' });
            } catch (e) {
                blocked = true;
            }
        }
        expect(blocked).toBe(true);
    });

    test('Kill Switch Global', async () => {
        const url = 'https://hkoxhourxwlddgsfdgws.supabase.co/rest/v1/diverse';
        
        // Disparar 205 requisições aleatórias rápidas (limite 200)
        let blockedCount = 0;
        for (let i = 0; i < 205; i++) {
            try {
                // URLs diferentes para fugir do loop detector individual
                await supabaseMonitor.customFetch(`${url}_${i}`, { method: 'GET' });
            } catch(e) {
                if (e instanceof CircuitBreakerError) blockedCount++;
            }
        }
        
        expect(blockedCount).toBeGreaterThan(0);
        expect(blockedCount).toBe(5); // Bloqueou as últimas 5 da janela
    });
});
