// Serviço central de rastreamento de uso de APIs (ApiUsageTracker)

import { supabase } from '../../pages/utils/supabaseConfig';
import { ApiConfigService } from './apiConfigService';
import { getModuleDefinition } from './apiModuleMapper';
import { 
    ApiEnvironment, 
    ApiProvider, 
    ApiServiceId, 
    ApiUsageLog, 
    ApiUsageStatus,
    ApiServiceSummary,
    ApiDashboardMetrics,
    ApiModelUsageBreakdown,
    ApiModuleUsageBreakdown
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
            } catch  { /* no-op: intencionalmente silencioso */ }
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
                // Ignorar erro silenciosamente
            }
        } catch  { /* no-op: intencionalmente silencioso */ }
    }

    /**
     * Consulta o consumo acumulado no mês corrente para um serviço e ambiente
     */
    public static async getCurrentMonthUsage(serviceId: ApiServiceId, environment: ApiEnvironment | 'all' = 'all'): Promise<number> {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        try {
            let query = supabase
                .from('api_usage_daily')
                .select('total_requests')
                .eq('service', serviceId)
                .gte('usage_date', startOfMonth)
                .lte('usage_date', endOfMonth);

            if (environment !== 'all') {
                query = query.eq('environment', environment);
            }

            const { data, error } = await query;

            let dailyCount = 0;
            if (!error && data && data.length > 0) {
                dailyCount = data.reduce((acc, row) => acc + (row.total_requests || 0), 0);
            }

            // Fallback: busca diretamente em api_usage_logs se daily estiver vazio
            if (dailyCount === 0) {
                let logsQuery = supabase
                    .from('api_usage_logs')
                    .select('units')
                    .eq('service', serviceId)
                    .gte('created_at', `${startOfMonth}T00:00:00.000Z`)
                    .lte('created_at', `${endOfMonth}T23:59:59.999Z`);

                if (environment !== 'all') {
                    logsQuery = logsQuery.eq('environment', environment);
                }

                const { data: logsData } = await logsQuery;
                if (logsData) {
                    return logsData.reduce((acc, row) => acc + (row.units || 1), 0);
                }
            }

            return dailyCount;
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
        environment: ApiEnvironment | 'all' = 'all'
    ): Promise<ApiDashboardMetrics> {
        const configs = await ApiConfigService.getAllConfigurations();
        
        let dailyRows: any[] = [];
        try {
            let query = supabase
                .from('api_usage_daily')
                .select('*')
                .gte('usage_date', startDate)
                .lte('usage_date', endDate);

            if (environment !== 'all') {
                query = query.eq('environment', environment);
            }

            const { data, error } = await query;

            if (!error && data) {
                dailyRows = data;
            }
        } catch (e) {
            console.warn("Erro ao buscar api_usage_daily:", e);
        }

        // Fallback: Se api_usage_daily estiver vazia, consulta a tabela bruta api_usage_logs
        if (dailyRows.length === 0) {
            try {
                let logsQuery = supabase
                    .from('api_usage_logs')
                    .select('service, units, cost_estimated, cache_hit, created_at')
                    .gte('created_at', `${startDate}T00:00:00.000Z`)
                    .lte('created_at', `${endDate}T23:59:59.999Z`);

                if (environment !== 'all') {
                    logsQuery = logsQuery.eq('environment', environment);
                }

                const { data: rawLogs } = await logsQuery;

                if (rawLogs && rawLogs.length > 0) {
                    const aggregated: Record<string, { total_requests: number; estimated_cost: number; cache_hits: number }> = {};

                    rawLogs.forEach((log) => {
                        const s = log.service;
                        if (!aggregated[s]) {
                            aggregated[s] = { total_requests: 0, estimated_cost: 0, cache_hits: 0 };
                        }
                        aggregated[s].total_requests += Number(log.units || 1);
                        aggregated[s].estimated_cost += Number(log.cost_estimated || 0);
                        if (log.cache_hit) {
                            aggregated[s].cache_hits += Number(log.units || 1);
                        }
                    });

                    dailyRows = Object.entries(aggregated).map(([service, stats]) => ({
                        service,
                        total_requests: stats.total_requests,
                        estimated_cost: stats.estimated_cost,
                        cache_hits: stats.cache_hits,
                    }));
                }
            } catch (err) {
                console.warn("Erro no fallback de busca em api_usage_logs:", err);
            }
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

        // Buscar logs analíticos para obter quebra precisa por MÓDULO e MODELO
        let detailedLogs: any[] = [];
        try {
            let logsQuery = supabase
                .from('api_usage_logs')
                .select('provider, service, operation, units, status, module_source, cost_estimated, created_at')
                .gte('created_at', `${startDate}T00:00:00.000Z`)
                .lte('created_at', `${endDate}T23:59:59.999Z`);

            if (environment !== 'all') {
                logsQuery = logsQuery.eq('environment', environment);
            }

            const { data } = await logsQuery;
            if (data && data.length > 0) {
                detailedLogs = data;
            }
        } catch (err) {
            console.warn("Aviso ao buscar logs analíticos de módulos/modelos:", err);
        }

        // Agregação por MODELO
        const modelMap: Record<string, { service_id: string; service_name: string; provider: ApiProvider; totalRequests: number; totalTokens: number; estimatedCostBrl: number }> = {};
        // Agregação por MÓDULO
        const moduleMap: Record<string, { totalRequests: number; totalTokens: number; estimatedCostBrl: number; modelCounts: Record<string, number> }> = {};
        let totalAiTokens = 0;

        detailedLogs.forEach((log) => {
            const sId = log.service || 'gemini_flash';
            const prov = (log.provider || 'gemini') as ApiProvider;
            const units = Number(log.units || 1);
            const cost = Number(log.cost_estimated || 0);
            const mod = log.module_source || 'general';

            const config = configs[sId];
            const sName = config?.service_name || sId;

            // Extrair modelo específico da operação se existir (ex: "... [gemini-3.8-flash]")
            let specificModel = sName;
            if (log.operation && log.operation.includes('[') && log.operation.includes(']')) {
                const match = log.operation.match(/\[(.*?)\]/);
                if (match && match[1]) {
                    specificModel = match[1].trim();
                }
            }

            // Modelo
            if (!modelMap[specificModel]) {
                modelMap[specificModel] = {
                    service_id: sId,
                    service_name: specificModel,
                    provider: prov,
                    totalRequests: 0,
                    totalTokens: 0,
                    estimatedCostBrl: 0,
                };
            }
            modelMap[specificModel].totalRequests += 1;
            modelMap[specificModel].estimatedCostBrl += cost;
            if (prov === 'gemini' && sId !== 'gemini_image') {
                modelMap[specificModel].totalTokens += units;
                totalAiTokens += units;
            }

            // Módulo
            if (!moduleMap[mod]) {
                moduleMap[mod] = {
                    totalRequests: 0,
                    totalTokens: 0,
                    estimatedCostBrl: 0,
                    modelCounts: {},
                };
            }
            moduleMap[mod].totalRequests += 1;
            moduleMap[mod].estimatedCostBrl += cost;
            if (prov === 'gemini' && sId !== 'gemini_image') {
                moduleMap[mod].totalTokens += units;
            }
            moduleMap[mod].modelCounts[specificModel] = (moduleMap[mod].modelCounts[specificModel] || 0) + 1;
        });

        // Se não houver logs na tabela analítica, derivar das summaries existentes
        if (detailedLogs.length === 0) {
            summaries.forEach((s) => {
                if (s.currentMonthUsage > 0 || s.estimatedCost > 0) {
                    modelMap[s.service_id] = {
                        service_id: s.service_id,
                        service_name: s.service_name,
                        provider: s.provider,
                        totalRequests: s.currentMonthUsage,
                        totalTokens: s.provider === 'gemini' && s.service_id !== 'gemini_image' ? s.currentMonthUsage * 350 : 0,
                        estimatedCostBrl: s.estimatedCost,
                    };
                    if (s.provider === 'gemini' && s.service_id !== 'gemini_image') {
                        totalAiTokens += s.currentMonthUsage * 350;
                    }
                }
            });
        }

        const safeTotalCost = totalCostBrl > 0 ? totalCostBrl : 0.01;

        const modelsBreakdown: ApiModelUsageBreakdown[] = Object.values(modelMap)
            .map((m) => ({
                model: m.service_name,
                service_id: m.service_id,
                service_name: m.service_name,
                provider: m.provider,
                totalRequests: m.totalRequests,
                totalTokens: m.totalTokens,
                estimatedCostBrl: Number(m.estimatedCostBrl.toFixed(2)),
                percentOfTotalCost: Number(Math.min(100, (m.estimatedCostBrl / safeTotalCost) * 100).toFixed(1)),
            }))
            .sort((a, b) => b.estimatedCostBrl - a.estimatedCostBrl || b.totalRequests - a.totalRequests);

        const modulesBreakdown: ApiModuleUsageBreakdown[] = Object.entries(moduleMap)
            .map(([modId, data]) => {
                const def = getModuleDefinition(modId);
                // Determinar o modelo mais frequente do módulo
                let topModel = 'N/A';
                let maxMCount = 0;
                Object.entries(data.modelCounts).forEach(([mName, count]) => {
                    if (count > maxMCount) {
                        maxMCount = count;
                        topModel = mName;
                    }
                });

                return {
                    module: modId,
                    label: def.label,
                    icon: def.icon,
                    color: def.color,
                    totalRequests: data.totalRequests,
                    totalTokens: data.totalTokens,
                    estimatedCostBrl: Number(data.estimatedCostBrl.toFixed(2)),
                    percentOfTotalCost: Number(Math.min(100, (data.estimatedCostBrl / safeTotalCost) * 100).toFixed(1)),
                    topModel,
                };
            })
            .sort((a, b) => b.estimatedCostBrl - a.estimatedCostBrl || b.totalRequests - a.totalRequests);

        return {
            totalRequests,
            totalCostBrl: Number(totalCostBrl.toFixed(2)),
            totalCostUsd: Number(totalCostUsd.toFixed(2)),
            totalCacheHits,
            totalSavingsBrl: Number(totalSavingsBrl.toFixed(2)),
            topUsedService,
            servicesNearLimitCount,
            servicesBlockedCount,
            totalAiTokens,
            summaries,
            modelsBreakdown,
            modulesBreakdown,
        };
    }
}

