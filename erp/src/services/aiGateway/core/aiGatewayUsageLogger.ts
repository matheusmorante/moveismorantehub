import { supabase } from '../../../pages/utils/supabaseConfig';
import { ApiUsageTracker } from '../../apiMonitoring/apiUsageTracker';

export interface LogSuccessOptions {
  serviceId: string;
  operation: string;
  model: string;
  units: number;
  costEstimated: number;
  responseHttpStatus: number | null;
  moduleSource: string;
  durationMs: number;
  preAllocRequestId?: string;
}

export interface LogFailureOptions {
  serviceId: string;
  operation: string;
  responseHttpStatus: number | null;
  moduleSource: string;
  durationMs: number;
  safeMessage: string;
  preAllocRequestId?: string;
}

/**
 * Registra ou atualiza os logs de uso de IA na tabela api_usage_logs.
 * Se houver um request_id pré-alocado, atualiza atomicamente o registro existente
 * para evitar double-counting de cotas e estornar custos em caso de falha.
 */
export class AiGatewayUsageLogger {
  public static logSuccess(options: LogSuccessOptions): void {
    const {
      serviceId,
      operation,
      model,
      units,
      costEstimated,
      responseHttpStatus,
      moduleSource,
      durationMs,
      preAllocRequestId,
    } = options;

    if (preAllocRequestId) {
      void supabase
        .from('api_usage_logs')
        .update({
          service: serviceId,
          operation: `${operation} [${model}]`,
          units,
          status: 'SUCCESS',
          http_status: responseHttpStatus ?? 200,
          cost_estimated: costEstimated,
          response_time_ms: durationMs,
        })
        .eq('request_id', preAllocRequestId);
    } else {
      void ApiUsageTracker.record({
        provider: 'openai',
        service: serviceId,
        operation: `${operation} [${model}]`,
        units,
        status: 'SUCCESS',
        http_status: responseHttpStatus ?? 0,
        module_source: moduleSource,
        response_time_ms: durationMs,
        cost_estimated: costEstimated,
      });
    }
  }

  public static logFailure(options: LogFailureOptions): void {
    const {
      serviceId,
      operation,
      responseHttpStatus,
      moduleSource,
      durationMs,
      safeMessage,
      preAllocRequestId,
    } = options;

    const status = responseHttpStatus === 429 ? 'RATE_LIMITED' : 'ERROR';

    if (preAllocRequestId) {
      void supabase
        .from('api_usage_logs')
        .update({
          status,
          http_status: responseHttpStatus ?? 0,
          error_message: safeMessage,
          cost_estimated: 0,
          units: 0,
          response_time_ms: durationMs,
        })
        .eq('request_id', preAllocRequestId);
    } else {
      void ApiUsageTracker.record({
        provider: 'openai',
        service: serviceId,
        operation,
        units: 0,
        status,
        http_status: responseHttpStatus ?? 0,
        module_source: moduleSource,
        error_message: safeMessage,
        response_time_ms: durationMs,
        cost_estimated: 0,
      });
    }
  }
}
