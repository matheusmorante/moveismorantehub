// Serviço central de rastreamento de uso de APIs (ApiUsageTracker)

import { supabase } from '../../pages/utils/supabaseConfig';
import { ApiConfigService } from './apiConfigService';
import { 
    ApiEnvironment, 
    ApiProvider, 
    ApiServiceId, 
    ApiUsageLog, 
    ApiUsageStatus,
    ApiServiceSummary,
    ApiDashboardMetrics 
} from './apiMonitoringTypes';

interface RecordUsageOptions {
    provider: ApiProvider;
    service: ApiServiceId;
    operation: string;
    units?: number;
    status?: ApiUsageStatus;
    http_status?: number;
    module_source?: string;
    environment?: ApiEnvironment;
    cache_hit?: boolean;
    response_time_ms?: number;
    request_id?: string;
    error_message?: string;
}

// Conjunto em memória para deduplicação de idempotência (últimos 500 requests)
const recentRequestIds = new Set<string>();

export class ApiUsageTracker {
    /**
     * Determina o ambiente atual de execução
     */
    public static getCurrentEnvironment(): ApiEnvironment {
        if (typeof window === 'undefined') return 'development';
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'development';
        }
        return 'production';
    }

    /**
     * Registra o consumo de uma requisição externa de forma assíncrona e segura
     */
    public static async record(options: RecordUsageOptions): Promise<string | null> {
        const {
            provider,
            service,
            operation,
            units = 1,
            status = 'SUCCESS',
            http_status = 200,
            module_source = 'general',
            environment = this.getCurrentEnvironment(),
            cache_hit = false,
            response_time_ms,
            request_id,
            error_message,
        } = options;

        // Idempotência: Se um request_id já foi registrado recentemente, ignorar para evitar contagem dupla
        if (request_id) {
            if (recentRequestIds.has(request_id)) {
                return null;
            }
            recentRequestIds.add(request_id);
            if (recentRequestIds.size > 1000) {
                const first = recentRequestIds.values().next().value;
                if (first) recentRequestIds.delete(first);
            }
        }

        // Calcular custo estimado se não for cache hit
        let estimatedCost = 0;
        if (!cache_hit && status === 'SUCCESS') {
            try {
                const config = await ApiConfigService.getConfiguration(service);
                if (config.price_per_unit > 0) {
                    estimatedCost = Number((units * config.price_per_unit).toFixed(4));
                }
            } catch {}
        }

        // 1. Chamar função atômica no Supabase
        try {
            const rpcResult = await supabase.rpc('record_api_usage_atomic', {
                p_provider: provider,
                p_service: service,
                p_operation: operation,
                p_units: units,
                p_status: status,
                p_http_status: http_status,
                p_module_source: module_source,
                p_environment: environment,
                p_cost_estimated: estimatedCost,
                p_cache_hit: cache_hit,
                p_response_time_ms: response_time_ms || 0,
                p_request_id: request_id || null,
                p_error_message: error_message || null,
            });

            const data = rpcResult?.data;
            const error = rpcResult?.error;

            if (error || !rpcResult) {
                // Fallback: se a RPC não existir ainda (banco local ou pré-migration), tenta inserir direto na tabela silenciando se falhar
                this.fallbackDirectInsert({
                    provider,
                    service,
                    operation,
                    units,
                    status,
                    http_status,
                    module_source,
                    environment,
                    cost_estimated: estimatedCost,
                    cache_hit,
                    response_time_ms,
                    request_id,
                    error_message,
                }).catch(() => {});
                return null;
            }

            return data as string;
        } catch {
            return null;
        }
    }

    /**
     * Fallback gracioso para inserção direta se a RPC ainda não tiver sido criada
     */
    private static async fallbackDirectInsert(log: ApiUsageLog) {
        try {
            const { error } = await supabase.from('api_usage_logs').insert([log]);
            if (error) {
                // Ignorar erro 404 / 42P01 (relação não existente) silenciosamente
            }
        } catch {}
    }

    /**
     * Consulta o consumo acumulado no mês corrente para um serviço e ambiente
     */
    public static async getCurrentMonthUsage(serviceId: ApiServiceId, environment: ApiEnvironment = 'production'): Promise<number> {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        try {
            const { data, error } = await supabase
                .from('api_usage_daily')
                .select('total_requests')
                .eq('service', serviceId)
                .eq('environment', environment)
                .gte('usage_date', startOfMonth)
                .lte('usage_date', endOfMonth);

            if (error || !data) return 0;
            return data.reduce((acc, row) => acc + (row.total_requests || 0), 0);
        } catch {
            return 0;
        }
    }

    /**
     * Obtém as métricas consolidadas para a tela de dashboard
     */
    public static async getDashboardMetrics(
        startDate: string,
        endDate: string,
        environment: ApiEnvironment = 'production'
    ): Promise<ApiDashboardMetrics> {
        const configs = await ApiConfigService.getAllConfigurations();
        
        let dailyRows: any[] = [];
        try {
            const { data, error } = await supabase
                .from('api_usage_daily')
                .select('*')
                .eq('environment', environment)
                .gte('usage_date', startDate)
                .lte('usage_date', endDate);

            if (!error && data) {
                dailyRows = data;
            }
        } catch (e) {
            console.warn("Erro ao buscar api_usage_daily:", e);
        }

        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const currentDayOfMonth = Math.max(1, now.getDate());

        let totalRequests = 0;
        let totalCostBrl = 0;
        let totalCostUsd = 0;
        let totalCacheHits = 0;
        let totalSavingsBrl = 0;
        let servicesNearLimitCount = 0;
        let servicesBlockedCount = 0;

        // Agrupar por service_id
        const serviceMap: Record<string, { requests: number; cost: number; cacheHits: number }> = {};

        dailyRows.forEach(row => {
            const s = row.service;
            if (!serviceMap[s]) serviceMap[s] = { requests: 0, cost: 0, cacheHits: 0 };
            serviceMap[s].requests += row.total_requests || 0;
            serviceMap[s].cost += Number(row.estimated_cost || 0);
            serviceMap[s].cacheHits += row.cache_hits || 0;

            totalRequests += row.total_requests || 0;
            totalCacheHits += row.cache_hits || 0;
        });

        const summaries: ApiServiceSummary[] = Object.values(configs).map(config => {
            const rowData = serviceMap[config.service_id] || { requests: 0, cost: 0, cacheHits: 0 };
            const usage = rowData.requests;
            const limit = config.monthly_limit || 10000;
            const usagePercent = limit > 0 ? Number(((usage / limit) * 100).toFixed(1)) : 0;
            const remaining = Math.max(0, limit - usage);

            // Projeção simples até o final do mês
            const dailyAvg = usage / currentDayOfMonth;
            const projected = Math.round(dailyAvg * daysInMonth);
            const projectedLimitExceeded = projected > limit;

            let daysUntilDepletion: number | null = null;
            if (dailyAvg > 0 && remaining > 0) {
                daysUntilDepletion = Math.max(1, Math.round(remaining / dailyAvg));
            } else if (remaining <= 0) {
                daysUntilDepletion = 0;
            }

            // Status visual
            let status: ApiServiceSummary['status'] = 'HEALTHY';
            if (usagePercent >= config.hard_limit) {
                status = 'BLOCKED';
                servicesBlockedCount++;
            } else if (usagePercent >= config.critical_threshold) {
                status = 'CRITICAL';
                servicesNearLimitCount++;
            } else if (usagePercent >= config.warning_threshold) {
                status = 'WARNING';
                servicesNearLimitCount++;
            }

            // Economia por cache
            const cacheEfficiency = (usage + rowData.cacheHits) > 0 
                ? Number(((rowData.cacheHits / (usage + rowData.cacheHits)) * 100).toFixed(1)) 
                : 0;
            const estimatedSavings = Number((rowData.cacheHits * config.price_per_unit).toFixed(2));

            if (config.currency === 'USD') {
                totalCostUsd += rowData.cost;
            } else {
                totalCostBrl += rowData.cost;
            }
            totalSavingsBrl += estimatedSavings;

            return {
                service_id: config.service_id,
                service_name: config.service_name,
                provider: config.provider,
                currentMonthUsage: usage,
                monthlyLimit: limit,
                usagePercent,
                remainingUnits: remaining,
                estimatedEndOfMonthUsage: projected,
                projectedLimitExceeded,
                daysUntilDepletion,
                estimatedCost: rowData.cost,
                currency: config.currency,
                cacheHits: rowData.cacheHits,
                cacheEfficiencyPercent: cacheEfficiency,
                estimatedSavings,
                status,
                criticality: config.criticality,
                config,
            };
        });

        // Identificar API mais utilizada
        let topUsedService = 'Nenhuma';
        let maxReqs = 0;
        summaries.forEach(s => {
            if (s.currentMonthUsage > maxReqs) {
                maxReqs = s.currentMonthUsage;
                topUsedService = s.service_name;
            }
        });

        return {
            totalRequests,
            totalCostBrl: Number(totalCostBrl.toFixed(2)),
            totalCostUsd: Number(totalCostUsd.toFixed(2)),
            totalCacheHits,
            totalSavingsBrl: Number(totalSavingsBrl.toFixed(2)),
            topUsedService,
            servicesNearLimitCount,
            servicesBlockedCount,
            summaries,
        };
    }
}
