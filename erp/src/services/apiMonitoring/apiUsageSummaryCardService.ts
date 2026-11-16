import { supabase } from '../../pages/utils/supabaseConfig';
import { ApiConfigService } from './apiConfigService';
import { getModuleDefinition } from './apiModuleMapper';
import {
  ApiEnvironment,
  ApiModelUsageBreakdown,
  ApiModuleUsageBreakdown,
  ApiServiceSummary,
  ApiUsageSummaryCardMetrics,
} from './apiMonitoringTypes';

interface DailyAggregate {
  service: string;
  total_requests: number;
  estimated_cost: number;
  cache_hits: number;
}

interface ModelAggregate {
  model: string;
  service_id: string;
  provider: ApiModelUsageBreakdown['provider'];
  total_requests: number;
  total_units: number;
  estimated_cost: number;
}

interface ModuleAggregate {
  module: string;
  total_requests: number;
  total_units: number;
  estimated_cost: number;
  top_model: string;
}

/** Carrega a resposta pequena usada somente pelo cartão da página inicial. */
export const getApiUsageSummaryCardMetrics = async (
  startDate: string,
  endDate: string,
  environment: ApiEnvironment | 'all' = 'all',
): Promise<ApiUsageSummaryCardMetrics> => {
  const configs = await ApiConfigService.getAllConfigurations();
  const serviceNames = Object.fromEntries(
    Object.values(configs).map((config) => [config.service_id, config.service_name]),
  );

  const { data, error } = await supabase.rpc('get_api_usage_summary_card_aggregates', {
    p_start_date: startDate,
    p_end_date: endDate,
    p_environment: environment,
    p_service_names: serviceNames,
  });
  if (error) throw error;
  if (!data || typeof data !== 'object') {
    throw new Error('Resposta inválida das métricas resumidas de uso de APIs.');
  }

  const aggregate = data as {
    daily?: DailyAggregate[];
    models?: ModelAggregate[];
    modules?: ModuleAggregate[];
  };
  const dailyRows = Array.isArray(aggregate.daily) ? aggregate.daily : [];
  const modelRows = Array.isArray(aggregate.models) ? aggregate.models : [];
  const moduleRows = Array.isArray(aggregate.modules) ? aggregate.modules : [];

  const serviceMap: Record<string, { requests: number; cost: number; cacheHits: number }> = {};
  let totalRequests = 0;
  dailyRows.forEach((row) => {
    if (!serviceMap[row.service]) {
      serviceMap[row.service] = { requests: 0, cost: 0, cacheHits: 0 };
    }
    serviceMap[row.service].requests += Number(row.total_requests || 0);
    serviceMap[row.service].cost += Number(row.estimated_cost || 0);
    serviceMap[row.service].cacheHits += Number(row.cache_hits || 0);
    totalRequests += Number(row.total_requests || 0);
  });

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDayOfMonth = Math.max(1, now.getDate());
  let totalCostBrl = 0;
  let servicesNearLimitCount = 0;
  const summaries: ApiServiceSummary[] = Object.values(configs).map((config) => {
    const rowData = serviceMap[config.service_id] || { requests: 0, cost: 0, cacheHits: 0 };
    const usage = rowData.requests;
    const limit = config.monthly_limit || 10000;
    const usagePercent = limit > 0 ? Number(((usage / limit) * 100).toFixed(1)) : 0;
    const remaining = Math.max(0, limit - usage);
    const dailyAvg = usage / currentDayOfMonth;
    const projected = Math.round(dailyAvg * daysInMonth);
    const projectedLimitExceeded = projected > limit;

    let daysUntilDepletion: number | null = null;
    if (dailyAvg > 0 && remaining > 0) {
      daysUntilDepletion = Math.max(1, Math.round(remaining / dailyAvg));
    } else if (remaining <= 0) {
      daysUntilDepletion = 0;
    }

    let status: ApiServiceSummary['status'] = 'HEALTHY';
    if (usagePercent >= config.hard_limit) {
      status = 'BLOCKED';
    } else if (usagePercent >= config.critical_threshold) {
      status = 'CRITICAL';
      servicesNearLimitCount++;
    } else if (usagePercent >= config.warning_threshold) {
      status = 'WARNING';
      servicesNearLimitCount++;
    }

    const cacheEfficiencyPercent = usage + rowData.cacheHits > 0
      ? Number(((rowData.cacheHits / (usage + rowData.cacheHits)) * 100).toFixed(1))
      : 0;
    const estimatedSavings = Number((rowData.cacheHits * config.price_per_unit).toFixed(2));
    if (config.currency !== 'USD') totalCostBrl += rowData.cost;

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
      cacheEfficiencyPercent,
      estimatedSavings,
      status,
      criticality: config.criticality,
      config,
    };
  });

  const safeTotalCost = totalCostBrl > 0 ? totalCostBrl : 0.01;
  const modelsBreakdown: ApiModelUsageBreakdown[] = modelRows.map((row) => {
    const modelCost = Number(row.estimated_cost || 0);
    return {
      model: row.model,
      service_id: row.service_id,
      service_name: row.model,
      provider: row.provider,
      totalRequests: Number(row.total_requests || 0),
      totalTokens: Number(row.total_units || 0),
      estimatedCostBrl: Number(modelCost.toFixed(2)),
      percentOfTotalCost: Number(Math.min(100, (modelCost / safeTotalCost) * 100).toFixed(1)),
    };
  });

  const modulesBreakdown: ApiModuleUsageBreakdown[] = moduleRows.map((row) => {
    const definition = getModuleDefinition(row.module);
    const moduleCost = Number(row.estimated_cost || 0);
    return {
      module: row.module,
      label: definition.label,
      icon: definition.icon,
      color: definition.color,
      totalRequests: Number(row.total_requests || 0),
      totalTokens: Number(row.total_units || 0),
      estimatedCostBrl: Number(moduleCost.toFixed(2)),
      percentOfTotalCost: Number(Math.min(100, (moduleCost / safeTotalCost) * 100).toFixed(1)),
      topModel: row.top_model,
    };
  });

  return {
    totalRequests,
    servicesNearLimitCount,
    summaries,
    modelsBreakdown,
    modulesBreakdown,
  } satisfies ApiUsageSummaryCardMetrics;
};
