// Serviço para gerenciamento de configurações das APIs externas (limites, custos e políticas)

import { supabase } from '../../pages/utils/supabaseConfig';
import { ApiConfiguration, ApiServiceId } from './apiMonitoringTypes';

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
        service_name: 'Google Gemini 1.5 Flash',
        metric: 'requests',
        billing_unit: 'req',
        monthly_limit: 5000,
        warning_threshold: 70,
        critical_threshold: 90,
        hard_limit: 95,
        block_on_hard_limit: true,
        criticality: 'OPTIONAL',
        price_per_unit: 0.005,
        free_allowance: 500,
        currency: 'BRL',
        circuit_breaker_max_per_minute: 60,
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
        price_per_unit: 0.00,
        free_allowance: 0,
        currency: 'BRL',
        circuit_breaker_max_per_minute: 200,
        enabled: true,
    },
};

export class ApiConfigService {
    private static memoryCache: Record<string, ApiConfiguration> | null = null;

    /**
     * Retorna todas as configurações de API (da memória, localStorage ou Supabase)
     */
    public static async getAllConfigurations(): Promise<Record<string, ApiConfiguration>> {
        if (this.memoryCache) return this.memoryCache;

        // Tentar localStorage primeiro para resposta síncrona/imediata
        try {
            const raw = localStorage.getItem(CONFIG_CACHE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                this.memoryCache = { ...DEFAULT_API_CONFIGURATIONS, ...parsed };
            }
        } catch {}

        if (!this.memoryCache) {
            this.memoryCache = { ...DEFAULT_API_CONFIGURATIONS };
        }

        // Buscar do Supabase em segundo plano ou na inicialização
        try {
            const { data, error } = await supabase
                .from('api_configurations')
                .select('*');

            if (!error && data && data.length > 0) {
                const merged: Record<string, ApiConfiguration> = { ...DEFAULT_API_CONFIGURATIONS };
                data.forEach((item: any) => {
                    merged[item.service_id] = {
                        service_id: item.service_id,
                        provider: item.provider,
                        service_name: item.service_name,
                        metric: item.metric || 'requests',
                        billing_unit: item.billing_unit || 'req',
                        monthly_limit: Number(item.monthly_limit) || 10000,
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
            console.warn("Não foi possível carregar configurações de APIs do Supabase, usando padrão:", e);
        }

        return this.memoryCache;
    }

    /**
     * Retorna a configuração de um serviço específico
     */
    public static async getConfiguration(serviceId: ApiServiceId): Promise<ApiConfiguration> {
        const configs = await this.getAllConfigurations();
        return configs[serviceId] || {
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
        };
    }

    /**
     * Salva ou atualiza a configuração de um serviço
     */
    public static async saveConfiguration(config: ApiConfiguration, updatedBy?: string): Promise<boolean> {
        const configs = await this.getAllConfigurations();
        const payload: ApiConfiguration = {
            ...config,
            updated_at: new Date().toISOString(),
            updated_by: updatedBy || 'admin',
        };

        configs[config.service_id] = payload;
        this.memoryCache = configs;
        localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(configs));

        try {
            const { error } = await supabase
                .from('api_configurations')
                .upsert({
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
                });

            if (error) {
                console.warn("Aviso ao sincronizar api_configurations no banco:", error.message);
            }
            return true;
        } catch (e) {
            console.error("Erro ao salvar api_configuration:", e);
            return false;
        }
    }
}
