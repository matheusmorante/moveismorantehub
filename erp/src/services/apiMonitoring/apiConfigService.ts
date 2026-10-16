// Serviço para gerenciamento de configurações das APIs externas (limites, custos e políticas)

import { supabase } from '../../pages/utils/supabaseConfig';
import { ApiConfiguration, ApiServiceId } from './apiMonitoringTypes';
import { apiConfigurationWriteSchema } from '../../../../shared-utils/apiConfigFormSchema';

const CONFIG_CACHE_KEY = 'morante_api_configurations_v1';

export const DEFAULT_API_CONFIGURATIONS: Record<ApiServiceId, ApiConfiguration> = {
  google_routes: {
    service_id: 'google_routes',
    provider: 'google',
    service_name: 'Google Routes API',
    metric: 'requests',
    billing_unit: 'req',
    monthly_limit: 1000,
    warning_threshold: 70,
    critical_threshold: 90,
    hard_limit: 95,
    block_on_hard_limit: true,
    criticality: 'IMPORTANT',
    price_per_unit: 0.025,
    free_allowance: 500,
    currency: 'BRL',
    circuit_breaker_max_per_minute: 20,
    enabled: true,
  },
  google_places: {
    service_id: 'google_places',
    provider: 'google',
    service_name: 'Google Places (Autocomplete & Details)',
    metric: 'requests',
    billing_unit: 'req',
    monthly_limit: 1500,
    warning_threshold: 75,
    critical_threshold: 90,
    hard_limit: 95,
    block_on_hard_limit: true,
    criticality: 'IMPORTANT',
    price_per_unit: 0.017,
    free_allowance: 1000,
    currency: 'BRL',
    circuit_breaker_max_per_minute: 25,
    enabled: true,
  },
  google_geocoding: {
    service_id: 'google_geocoding',
    provider: 'google',
    service_name: 'Google Geocoding API',
    metric: 'requests',
    billing_unit: 'req',
    monthly_limit: 1000,
    warning_threshold: 75,
    critical_threshold: 90,
    hard_limit: 95,
    block_on_hard_limit: true,
    criticality: 'IMPORTANT',
    price_per_unit: 0.025,
    free_allowance: 500,
    currency: 'BRL',
    circuit_breaker_max_per_minute: 20,
    enabled: true,
  },
  google_route_optimization: {
    service_id: 'google_route_optimization',
    provider: 'google',
    service_name: 'Google Route Optimization',
    metric: 'requests',
    billing_unit: 'req',
    monthly_limit: 200,
    warning_threshold: 70,
    critical_threshold: 90,
    hard_limit: 95,
    block_on_hard_limit: true,
    criticality: 'OPTIONAL',
    price_per_unit: 0.15,
    free_allowance: 100,
    currency: 'BRL',
    circuit_breaker_max_per_minute: 10,
    enabled: false,
  },
  gemini_flash: {
    service_id: 'gemini_flash',
    provider: 'gemini',
    service_name: 'Google Gemini 1.5/2.5 Flash',
    metric: 'requests',
    billing_unit: 'req',
    monthly_limit: 3000,
    warning_threshold: 70,
    critical_threshold: 90,
    hard_limit: 95,
    block_on_hard_limit: true,
    criticality: 'OPTIONAL',
    price_per_unit: 0.01,
    free_allowance: 100,
    currency: 'BRL',
    max_monthly_budget_brl: 30.0, // Teto máximo absoluto de R$ 30,00 por mês
    circuit_breaker_max_per_minute: 60,
    enabled: true,
  },
  gemini_antigravity: {
    service_id: 'gemini_antigravity',
    provider: 'gemini',
    service_name: 'Google Gemini Antigravity / AI Agent',
    metric: 'requests',
    billing_unit: 'req',
    monthly_limit: 3000,
    warning_threshold: 70,
    critical_threshold: 90,
    hard_limit: 95,
    block_on_hard_limit: true,
    criticality: 'OPTIONAL',
    price_per_unit: 0.01,
    free_allowance: 100,
    currency: 'BRL',
    max_monthly_budget_brl: 30.0, // Teto máximo absoluto de R$ 30,00 por mês
    circuit_breaker_max_per_minute: 60,
    enabled: true,
  },
  gemini_image: {
    service_id: 'gemini_image',
    provider: 'gemini',
    service_name: 'Google Gemini Imagem (Marketing & Posts)',
    metric: 'images',
    billing_unit: 'img',
    monthly_limit: 150,
    warning_threshold: 70,
    critical_threshold: 90,
    hard_limit: 95,
    block_on_hard_limit: true,
    criticality: 'OPTIONAL',
    price_per_unit: 0.2,
    free_allowance: 10,
    currency: 'BRL',
    max_monthly_budget_brl: 30.0,
    circuit_breaker_max_per_minute: 5,
    enabled: true,
  },
  gemini_tts: {
    service_id: 'gemini_tts',
    provider: 'gemini',
    service_name: 'Google Gemini Voz / Áudio TTS',
    metric: 'characters',
    billing_unit: 'chars',
    monthly_limit: 50000,
    warning_threshold: 70,
    critical_threshold: 90,
    hard_limit: 95,
    block_on_hard_limit: true,
    criticality: 'OPTIONAL',
    price_per_unit: 0.0001,
    free_allowance: 5000,
    currency: 'BRL',
    max_monthly_budget_brl: 15.0,
    circuit_breaker_max_per_minute: 30,
    enabled: true,
  },
  meta_whatsapp: {
    service_id: 'meta_whatsapp',
    provider: 'meta',
    service_name: 'WhatsApp Graph API',
    metric: 'messages',
    billing_unit: 'msg',
    monthly_limit: 2000,
    warning_threshold: 70,
    critical_threshold: 90,
    hard_limit: 95,
    block_on_hard_limit: false,
    criticality: 'IMPORTANT',
    price_per_unit: 0.35,
    free_allowance: 250,
    currency: 'BRL',
    circuit_breaker_max_per_minute: 60,
    enabled: true,
  },
  sefaz_nfe: {
    service_id: 'sefaz_nfe',
    provider: 'sefaz',
    service_name: 'SEFAZ-PR (NF-e & NFC-e)',
    metric: 'requests',
    billing_unit: 'doc',
    monthly_limit: 10000,
    warning_threshold: 80,
    critical_threshold: 95,
    hard_limit: 100,
    block_on_hard_limit: false, // Crítico: NUNCA bloquear
    criticality: 'CRITICAL',
    price_per_unit: 0.0,
    free_allowance: 0,
    currency: 'BRL',
    circuit_breaker_max_per_minute: 200,
    enabled: true,
  },
};

export class ApiConfigService {
  private static memoryCache: Record<string, ApiConfiguration> | null = null;

  private static cachedConfigurations(): Record<string, ApiConfiguration> {
    if (this.memoryCache) return this.memoryCache;
    try {
      const stored = JSON.parse(localStorage.getItem(CONFIG_CACHE_KEY) || 'null');
      if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
        return { ...DEFAULT_API_CONFIGURATIONS, ...stored };
      }
    } catch { /* Fall back to the installed defaults when browser storage is unavailable. */ }
    return { ...DEFAULT_API_CONFIGURATIONS };
  }

  /**
   * Retorna todas as configurações de API (da memória, localStorage ou Supabase)
   */
  public static async getAllConfigurations(): Promise<Record<string, ApiConfiguration>> {
    if (this.memoryCache) return this.memoryCache;

    this.memoryCache = this.cachedConfigurations();

    // Buscar do Supabase em segundo plano ou na inicialização
    try {
      const { data, error } = await supabase.from('api_configurations').select('*');

      if (!error && data && data.length > 0) {
        const merged: Record<string, ApiConfiguration> = { ...DEFAULT_API_CONFIGURATIONS };
        data.forEach((item: any) => {
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
        this.memoryCache = merged;
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
