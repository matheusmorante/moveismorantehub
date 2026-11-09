// Serviço central de rastreamento de uso de APIs (ApiUsageTracker)

import { supabase } from '../../pages/utils/supabaseConfig';
import { ApiConfigService } from './apiConfigService';
import { getApiUsageDashboardMetrics } from './apiUsageDashboardService';
import {
  ApiEnvironment,
  ApiProvider,
  ApiServiceId,
  ApiUsageLog,
  ApiUsageStatus,
  ApiDashboardMetrics,
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
  cost_estimated?: number;
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
    let estimatedCost = cost_estimated !== undefined ? cost_estimated : 0;
    if (!cache_hit && status === 'SUCCESS' && cost_estimated === undefined) {
      try {
        const config = await ApiConfigService.getConfiguration(service);
        if (config.price_per_unit > 0) {
          estimatedCost = Number((units * config.price_per_unit).toFixed(4));
        }
      } catch {
        /* no-op: intencionalmente silencioso */
      }
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
    } catch {
      /* no-op: intencionalmente silencioso */
    }
  }

  /**
   * Consulta o consumo acumulado no mês corrente para um serviço e ambiente
   */
  public static async getCurrentMonthUsage(
    serviceId: ApiServiceId,
    environment: ApiEnvironment | 'all' = 'all'
  ): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];

    try {
      const { data, error } = await supabase.rpc('get_api_usage_monthly_total', {
        p_service: serviceId,
        p_start_date: startOfMonth,
        p_end_date: endOfMonth,
        p_environment: environment,
      });
      const total =
        typeof data === 'number'
          ? data
          : typeof data === 'string' && data.trim()
            ? Number(data)
            : Number.NaN;
      if (!error && Number.isFinite(total)) return total;
    } catch {
      // Preserve the existing reads if the aggregate RPC is temporarily unavailable.
    }

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
    return getApiUsageDashboardMetrics(startDate, endDate, environment);
  }
}
