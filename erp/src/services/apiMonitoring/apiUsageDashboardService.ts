import { supabase } from '../../pages/utils/supabaseConfig';
import { ApiConfigService } from './apiConfigService';
import { getModuleDefinition } from './apiModuleMapper';
import {
  ApiProvider,
  ApiEnvironment,
  ApiDashboardMetrics,
  ApiModelUsageBreakdown,
  ApiModuleUsageBreakdown,
  ApiServiceSummary,
} from './apiMonitoringTypes';

/**
 * Obtém as métricas consolidadas para a tela de dashboard
 */
export const getApiUsageDashboardMetrics = async (
  startDate: string,
  endDate: string,
  environment: ApiEnvironment | 'all' = 'all'
): Promise<ApiDashboardMetrics> => {
  const configs = await ApiConfigService.getAllConfigurations();

  const { data: aggregateData, error: aggregateError } = await supabase.rpc(
    'get_api_usage_dashboard_aggregates',
    { p_start_date: startDate, p_end_date: endDate, p_environment: environment },
  );
  if (aggregateError) throw aggregateError;
  if (!aggregateData || typeof aggregateData !== 'object') {
    throw new Error('Resposta inválida das métricas de uso de APIs.');
  }
  const aggregate = aggregateData as { daily?: any[]; details?: any[] };
  const dailyRows = Array.isArray(aggregate.daily) ? aggregate.daily : [];
  const detailedLogs = Array.isArray(aggregate.details) ? aggregate.details : [];

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

  dailyRows.forEach((row) => {
    const s = row.service;
    if (!serviceMap[s]) serviceMap[s] = { requests: 0, cost: 0, cacheHits: 0 };
    serviceMap[s].requests += row.total_requests || 0;
    serviceMap[s].cost += Number(row.estimated_cost || 0);
    serviceMap[s].cacheHits += row.cache_hits || 0;

    totalRequests += row.total_requests || 0;
    totalCacheHits += row.cache_hits || 0;
  });

  const summaries: ApiServiceSummary[] = Object.values(configs).map((config) => {
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
    const cacheEfficiency =
      usage + rowData.cacheHits > 0
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
  summaries.forEach((s) => {
    if (s.currentMonthUsage > maxReqs) {
      maxReqs = s.currentMonthUsage;
      topUsedService = s.service_name;
    }
  });

  // Agregação por MODELO
  const modelMap: Record<
    string,
    {
      service_id: string;
      service_name: string;
      provider: ApiProvider;
      totalRequests: number;
      totalTokens: number;
      estimatedCostBrl: number;
    }
  > = {};
  // Agregação por MÓDULO
  const moduleMap: Record<
    string,
    {
      totalRequests: number;
      totalTokens: number;
      estimatedCostBrl: number;
      modelCounts: Record<string, number>;
    }
  > = {};
  let totalAiTokens = 0;

  detailedLogs.forEach((log) => {
    const sId = log.service || 'gemini_flash';
    const prov = (log.provider || 'gemini') as ApiProvider;
    const units = Number(log.total_units || 0);
    const requestCount = Number(log.total_requests || 0);
    const cost = Number(log.estimated_cost || 0);
    const mod = log.module_source || 'general';

    const config = configs[sId];
    const sName = config?.service_name || sId;
    const specificModel = String(log.model || sName);

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
    modelMap[specificModel].totalRequests += requestCount;
    modelMap[specificModel].estimatedCostBrl += cost;
    if ((prov === 'gemini' && sId !== 'gemini_image') || (prov === 'openai' && sId !== 'openai_image')) {
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
    moduleMap[mod].totalRequests += requestCount;
    moduleMap[mod].estimatedCostBrl += cost;
    if ((prov === 'gemini' && sId !== 'gemini_image') || (prov === 'openai' && sId !== 'openai_image')) {
      moduleMap[mod].totalTokens += units;
    }
    moduleMap[mod].modelCounts[specificModel] =
      (moduleMap[mod].modelCounts[specificModel] || 0) + requestCount;
  });

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
      percentOfTotalCost: Number(
        Math.min(100, (m.estimatedCostBrl / safeTotalCost) * 100).toFixed(1)
      ),
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
        percentOfTotalCost: Number(
          Math.min(100, (data.estimatedCostBrl / safeTotalCost) * 100).toFixed(1)
        ),
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
};
