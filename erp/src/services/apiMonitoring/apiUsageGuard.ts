// Camada de proteção de cota e bloqueio preventivo de custos (ApiUsageGuard)

import { ApiConfigService } from './apiConfigService';
import { ApiUsageTracker } from './apiUsageTracker';
import { ApiServiceId, GuardCheckResult } from './apiMonitoringTypes';

interface CircuitBreakerTracker {
    timestamps: number[];
    isTripped: boolean;
    trippedAt?: number;
}

const circuitBreakers: Record<string, CircuitBreakerTracker> = {};
const checkCache: Record<string, { result: GuardCheckResult; cachedAt: number }> = {};
const CACHE_TTL_MS = 30000; // 30 segundos para validação rápida sem sobrecarregar

export class ApiUsageGuard {
    /**
     * Valida se uma chamada à API externa deve ser permitida, alertada ou bloqueada
     */
    public static async check(serviceId: ApiServiceId): Promise<GuardCheckResult> {
        const now = Date.now();

        // 1. Verificar Circuit Breaker em memória contra loops
        const cb = this.getCircuitBreaker(serviceId);
        const config = await ApiConfigService.getConfiguration(serviceId);

        // Limpar timestamps com mais de 60 segundos
        cb.timestamps = cb.timestamps.filter(t => now - t < 60000);

        // Se o circuit breaker disparou, verificar tempo de cooldown (2 minutos)
        if (cb.isTripped) {
            if (cb.trippedAt && now - cb.trippedAt < 120000) {
                return {
                    allowed: false,
                    status: 'BLOCKED',
                    circuitBroken: true,
                    reason: `Circuit Breaker ativado para ${config.service_name}: consumo anormal detectado (> ${config.circuit_breaker_max_per_minute} req/min). Aguarde 2 minutos.`,
                };
            }
            // Cooldown finalizado, reseta o breaker
            cb.isTripped = false;
            cb.timestamps = [];
        }

        // Se excedeu o limite por minuto, dispara o circuit breaker
        if (cb.timestamps.length >= config.circuit_breaker_max_per_minute) {
            cb.isTripped = true;
            cb.trippedAt = now;
            console.error(`🚨 [CIRCUIT BREAKER] Disparado para ${config.service_name}! Mais de ${config.circuit_breaker_max_per_minute} chamadas em 1 minuto.`);
            
            // Registrar log do incidente
            ApiUsageTracker.record({
                provider: config.provider,
                service: serviceId,
                operation: 'circuit_breaker_trip',
                units: 0,
                status: 'CIRCUIT_BROKEN',
                error_message: `Circuit breaker acionado com ${cb.timestamps.length} requisições no último minuto.`,
            });

            return {
                allowed: false,
                status: 'BLOCKED',
                circuitBroken: true,
                reason: `Circuit Breaker acionado para ${config.service_name} para prevenir custos com loop.`,
            };
        }

        // Registrar timestamp desta verificação
        cb.timestamps.push(now);

        // 2. Verificar cache recente de checagem de cota
        const cached = checkCache[serviceId];
        if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
            return cached.result;
        }

        // 3. Avaliar limites mensais configurados
        if (!config.enabled) {
            const res: GuardCheckResult = {
                allowed: false,
                status: 'BLOCKED',
                reason: `A integração ${config.service_name} está desativada nas configurações administrativas.`,
            };
            checkCache[serviceId] = { result: res, cachedAt: now };
            return res;
        }

        const env = ApiUsageTracker.getCurrentEnvironment();
        const currentUsage = await ApiUsageTracker.getCurrentMonthUsage(serviceId, env);
        const limit = config.monthly_limit || 10000;
        const usagePercent = limit > 0 ? (currentUsage / limit) * 100 : 0;

        let result: GuardCheckResult = {
            allowed: true,
            status: 'ALLOW',
            usagePercent: Number(usagePercent.toFixed(1)),
        };

        // Regra de Hard Limit
        if (usagePercent >= config.hard_limit) {
            if (config.criticality === 'CRITICAL') {
                // Serviços críticos (ex: SEFAZ fiscal) NUNCA são bloqueados
                result = {
                    allowed: true,
                    status: 'CRITICAL',
                    usagePercent: Number(usagePercent.toFixed(1)),
                    reason: `Atenção máxima: ${config.service_name} atingiu ${usagePercent.toFixed(1)}% do limite. Permitido por ser serviço fiscal crítico.`,
                };
            } else if (config.block_on_hard_limit) {
                // Bloqueio preventivo para evitar cobrança
                result = {
                    allowed: false,
                    status: 'BLOCKED',
                    usagePercent: Number(usagePercent.toFixed(1)),
                    reason: `Limite de segurança atingido (${usagePercent.toFixed(1)}% de ${limit} chamadas). Chamadas bloqueadas para evitar custos.`,
                };
            } else {
                result = {
                    allowed: true,
                    status: 'CRITICAL',
                    usagePercent: Number(usagePercent.toFixed(1)),
                    reason: `Consumo crítico (${usagePercent.toFixed(1)}%).`,
                };
            }
        } else if (usagePercent >= config.critical_threshold) {
            result = {
                allowed: true,
                status: 'CRITICAL',
                usagePercent: Number(usagePercent.toFixed(1)),
                reason: `Consumo atingiu nível crítico de ${usagePercent.toFixed(1)}%.`,
            };
        } else if (usagePercent >= config.warning_threshold) {
            result = {
                allowed: true,
                status: 'WARNING',
                usagePercent: Number(usagePercent.toFixed(1)),
                reason: `Consumo em nível de atenção (${usagePercent.toFixed(1)}%).`,
            };
        }

        checkCache[serviceId] = { result, cachedAt: now };
        return result;
    }

    private static getCircuitBreaker(serviceId: string): CircuitBreakerTracker {
        if (!circuitBreakers[serviceId]) {
            circuitBreakers[serviceId] = {
                timestamps: [],
                isTripped: false,
            };
        }
        return circuitBreakers[serviceId];
    }

    /**
     * Limpa o cache de verificação (usado após atualizar limites no painel)
     */
    public static clearCache(serviceId?: string) {
        if (serviceId) {
            delete checkCache[serviceId];
        } else {
            Object.keys(checkCache).forEach(k => delete checkCache[k]);
        }
    }
}
