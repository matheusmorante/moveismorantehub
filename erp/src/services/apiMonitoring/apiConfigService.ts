// Serviço para gerenciamento de configurações das APIs externas (limites, custos e políticas)

import { supabase } from '../../pages/utils/supabaseConfig';
import { ApiConfiguration, ApiServiceId } from './apiMonitoringTypes';
import { apiConfigurationWriteSchema } from '../../../../shared-utils/apiConfigFormSchema';
import { DEFAULT_API_CONFIGURATIONS } from './defaultApiConfigurations';

export { DEFAULT_API_CONFIGURATIONS };

const CONFIG_CACHE_KEY = 'morante_api_configurations_v1';
const isLegacyGeminiConfig = (serviceId: string, provider?: string) =>
  serviceId.startsWith('gemini_') || provider === 'gemini';

const withoutLegacyGeminiConfigs = (configs: Record<string, ApiConfiguration>) =>
  Object.fromEntries(
    Object.entries(configs).filter(([serviceId, config]) => !isLegacyGeminiConfig(serviceId, config.provider))
  ) as Record<string, ApiConfiguration>;

export class ApiConfigService {
  private static memoryCache: Record<string, ApiConfiguration> | null = null;

  private static cachedConfigurations(): Record<string, ApiConfiguration> {
    if (this.memoryCache) return this.memoryCache;
    try {
      const stored = JSON.parse(localStorage.getItem(CONFIG_CACHE_KEY) || 'null');
      if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
        return withoutLegacyGeminiConfigs({ ...DEFAULT_API_CONFIGURATIONS, ...stored });
      }
    } catch { /* Fall back to the installed defaults when browser storage is unavailable. */ }
    return withoutLegacyGeminiConfigs({ ...DEFAULT_API_CONFIGURATIONS });
  }

  /**
   * Retorna todas as configurações de API (da memória, localStorage ou Supabase)
   */
  public static async getAllConfigurations(): Promise<Record<string, ApiConfiguration>> {
    if (this.memoryCache) return this.memoryCache;

    this.memoryCache = this.cachedConfigurations();

    // Buscar do Supabase em segundo plano ou na inicialização
    try {
      const { data, error } = await supabase
        .from('api_configurations')
        .select('service_id,provider,service_name,metric,billing_unit,monthly_limit,warning_threshold,critical_threshold,hard_limit,block_on_hard_limit,criticality,price_per_unit,free_allowance,currency,circuit_breaker_max_per_minute,enabled,updated_at,updated_by')
        .neq('provider', 'gemini');

      if (!error && data && data.length > 0) {
        const merged: Record<string, ApiConfiguration> = { ...DEFAULT_API_CONFIGURATIONS };
        data.forEach((item: any) => {
          if (isLegacyGeminiConfig(String(item.service_id || ''), item.provider)) return;
          merged[item.service_id] = {
            service_id: item.service_id,
            provider: item.provider,
            service_name: item.service_name,
            metric: item.metric || 'requests',
            billing_unit: item.billing_unit || 'req',
            monthly_limit: item.monthly_limit == null ? 10000 : Number(item.monthly_limit),
            warning_threshold: Number(item.warning_threshold) || 70,
            critical_threshold: Number(item.critical_threshold) || 90,
            hard_limit: Number(item.hard_limit) || 95,
            block_on_hard_limit: item.block_on_hard_limit ?? true,
            criticality: item.criticality || 'IMPORTANT',
            price_per_unit: Number(item.price_per_unit) || 0,
            free_allowance: Number(item.free_allowance) || 0,
            currency: item.currency || 'BRL',
            circuit_breaker_max_per_minute: Number(item.circuit_breaker_max_per_minute) || 150,
            enabled: item.enabled ?? true,
            updated_at: item.updated_at,
            updated_by: item.updated_by,
          };
        });
        this.memoryCache = withoutLegacyGeminiConfigs(merged);
        localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(merged));
      }
    } catch (e) {
      console.warn(
        'Não foi possível carregar configurações de APIs do Supabase, usando padrão:',
        e
      );
    }

    return this.memoryCache;
  }

  /**
   * Retorna a configuração de um serviço específico
   */
  public static async getConfiguration(serviceId: ApiServiceId): Promise<ApiConfiguration> {
    const configs = await this.getAllConfigurations();
    return (
      configs[serviceId] || {
        service_id: serviceId,
        provider: 'other',
        service_name: serviceId,
        metric: 'requests',
        billing_unit: 'req',
        monthly_limit: 10000,
        warning_threshold: 70,
        critical_threshold: 90,
        hard_limit: 95,
        block_on_hard_limit: false,
        criticality: 'IMPORTANT',
        price_per_unit: 0,
        free_allowance: 0,
        currency: 'BRL',
        circuit_breaker_max_per_minute: 100,
        enabled: true,
      }
    );
  }

  /**
   * Salva ou atualiza a configuração de um serviço
   */
  public static async saveConfiguration(
    config: ApiConfiguration,
    updatedBy?: string
  ): Promise<boolean> {
    const values = apiConfigurationWriteSchema.parse(config);
    const payload = {
      ...values,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy || 'admin',
    };
    const { data, error, status } = await supabase.from('api_configurations').upsert({
      service_id: payload.service_id,
      provider: payload.provider,
      service_name: payload.service_name,
      metric: payload.metric,
      billing_unit: payload.billing_unit,
      monthly_limit: payload.monthly_limit,
      warning_threshold: payload.warning_threshold,
      critical_threshold: payload.critical_threshold,
      hard_limit: payload.hard_limit,
      block_on_hard_limit: payload.block_on_hard_limit,
      criticality: payload.criticality,
      price_per_unit: payload.price_per_unit,
      free_allowance: payload.free_allowance,
      currency: payload.currency,
      circuit_breaker_max_per_minute: payload.circuit_breaker_max_per_minute,
      enabled: payload.enabled,
      updated_at: payload.updated_at,
      updated_by: payload.updated_by,
    }).select('service_id').single();
    if (error) {
      if (status === 0 || !error.code || error.code === 'PGRST116' || error.code === '40003' || error.code.startsWith('08')) throw { uncertain: true };
      throw error;
    }
    if (data?.service_id !== payload.service_id) throw { uncertain: true };
    // Publish the cache only after the persisted identity is acknowledged.
    const configs = { ...this.cachedConfigurations(), [payload.service_id]: payload };
    this.memoryCache = configs;
    try { localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(configs)); }
    catch { /* The server confirmed the write; storage failure must not invite replay. */ }
    return true;
  }
}
