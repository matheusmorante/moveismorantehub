// Types para o sistema de monitoramento de uso de APIs externas e controle de custos

export type ApiProvider = 'google' | 'gemini' | 'meta' | 'sefaz' | 'brasilapi' | 'expo' | 'other';

export type ApiServiceId = 
    | 'google_routes'
    | 'google_places'
    | 'google_geocoding'
    | 'google_route_optimization'
    | 'gemini_flash'
    | 'meta_whatsapp'
    | 'sefaz_nfe'
    | 'brasilapi_cep'
    | string;

export type ApiCriticality = 'OPTIONAL' | 'IMPORTANT' | 'CRITICAL';

export type ApiUsageStatus = 
    | 'SUCCESS'
    | 'ERROR'
    | 'RATE_LIMITED'
    | 'BLOCKED_BY_INTERNAL_LIMIT'
    | 'CIRCUIT_BROKEN';

export type ApiEnvironment = 'production' | 'development' | 'test';

export interface ApiConfiguration {
    service_id: ApiServiceId;
    provider: ApiProvider;
    service_name: string;
    metric: 'requests' | 'tokens' | 'messages' | string;
    billing_unit: string;
    monthly_limit: number;
    warning_threshold: number; // Percentual (ex: 70)
    critical_threshold: number; // Percentual (ex: 90)
    hard_limit: number; // Percentual de bloqueio operacional (ex: 95)
    block_on_hard_limit: boolean;
    criticality: ApiCriticality;
    price_per_unit: number;
    free_allowance: number;
    currency: 'BRL' | 'USD';
    circuit_breaker_max_per_minute: number;
    enabled: boolean;
    updated_at?: string;
    updated_by?: string;
}

export interface ApiUsageLog {
    id?: string;
    provider: ApiProvider;
    service: ApiServiceId;
    operation: string;
    units: number;
    status: ApiUsageStatus;
    http_status?: number;
    module_source?: string;
    environment: ApiEnvironment;
    cost_estimated?: number;
    cache_hit?: boolean;
    response_time_ms?: number;
    request_id?: string;
    error_message?: string;
    created_at?: string;
}

export interface ApiUsageDaily {
    usage_date: string;
    provider: ApiProvider;
    service: ApiServiceId;
    environment: ApiEnvironment;
    total_requests: number;
    success_requests: number;
    error_requests: number;
    blocked_requests: number;
    cache_hits: number;
    total_units: number;
    estimated_cost: number;
    updated_at: string;
}

export interface GuardCheckResult {
    allowed: boolean;
    status: 'ALLOW' | 'WARNING' | 'CRITICAL' | 'BLOCKED';
    reason?: string;
    usagePercent?: number;
    circuitBroken?: boolean;
}

export interface ApiServiceSummary {
    service_id: ApiServiceId;
    service_name: string;
    provider: ApiProvider;
    currentMonthUsage: number;
    monthlyLimit: number;
    usagePercent: number;
    remainingUnits: number;
    estimatedEndOfMonthUsage: number;
    projectedLimitExceeded: boolean;
    daysUntilDepletion: number | null;
    estimatedCost: number;
    currency: 'BRL' | 'USD';
    cacheHits: number;
    cacheEfficiencyPercent: number;
    estimatedSavings: number;
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'BLOCKED' | 'UNCONFIGURED';
    criticality: ApiCriticality;
    config: ApiConfiguration;
}

export interface ApiDashboardMetrics {
    totalRequests: number;
    totalCostBrl: number;
    totalCostUsd: number;
    totalCacheHits: number;
    totalSavingsBrl: number;
    topUsedService: string;
    servicesNearLimitCount: number;
    servicesBlockedCount: number;
    summaries: ApiServiceSummary[];
}
