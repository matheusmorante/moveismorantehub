import { supabase } from './supabaseClient';

export type ApiProvider = 'google' | 'gemini' | 'meta' | 'sefaz';
export type ApiServiceId = 
  | 'google_routes' 
  | 'google_places' 
  | 'google_geocoding' 
  | 'google_route_optimization' 
  | 'gemini_flash' 
  | 'meta_whatsapp' 
  | 'sefaz_nfe';

export type ApiUsageStatus = 'SUCCESS' | 'ERROR' | 'RATE_LIMITED' | 'BLOCKED_BY_INTERNAL_LIMIT' | 'CIRCUIT_BROKEN';

export interface RecordUsageOptions {
  provider: ApiProvider;
  service: ApiServiceId;
  operation: string;
  units?: number;
  status?: ApiUsageStatus;
  http_status?: number;
  module_source?: string;
  environment?: 'production' | 'development' | 'test';
  cache_hit?: boolean;
  response_time_ms?: number;
  request_id?: string;
  error_message?: string;
}

export class MobileApiUsageTracker {
  private static getCurrentEnvironment(): 'production' | 'development' | 'test' {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      return 'development';
    }
    return 'production';
  }

  public static async record(options: RecordUsageOptions): Promise<void> {
    try {
      const {
        provider,
        service,
        operation,
        units = 1,
        status = 'SUCCESS',
        http_status = 200,
        module_source = 'mobile_logistics',
        environment = this.getCurrentEnvironment(),
        cache_hit = false,
        response_time_ms = 0,
        request_id,
        error_message,
      } = options;

      await supabase.rpc('record_api_usage_atomic', {
        p_provider: provider,
        p_service: service,
        p_operation: operation,
        p_units: units,
        p_status: status,
        p_http_status: http_status,
        p_module_source: module_source,
        p_environment: environment,
        p_cost_estimated: 0,
        p_cache_hit: cache_hit,
        p_response_time_ms: response_time_ms,
        p_request_id: request_id || null,
        p_error_message: error_message || null,
      });
    } catch {
      // Monitoramento nunca bloqueia o fluxo operacional
    }
  }
}
