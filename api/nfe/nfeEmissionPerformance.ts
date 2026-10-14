import { SpanStatusCode, trace } from '@opentelemetry/api';

export type NfeEmissionPerformanceStage =
  | 'normal_sale_pipeline'
  | 'operator_authorization'
  | 'idempotency_recovery'
  | 'order_and_settings_fetch'
  | 'inputs_fetch'
  | 'ruleset_preflight'
  | 'cert_extract'
  | 'number_peek_rpc'
  | 'xml_serialization'
  | 'xml_unsigned_validation'
  | 'xml_signing'
  | 'xml_schema_validation'
  | 'prepare_attempt_rpc'
  | 'attempt_load'
  | 'reconcile_cert_extract'
  | 'pre_transmission_audit'
  | 'start_transmission_rpc'
  | 'sefaz_transmission'
  | 'persist_result_rpc'
  | 'release_attempt_rpc'
  | 'total_backend';

type PerformanceAttributes = Record<string, string | number | boolean | undefined>;

const tracer = trace.getTracer('morante-hub', '1.0.0');

export async function withNfeEmissionStage<T>(
  stage: NfeEmissionPerformanceStage,
  operation: () => T | Promise<T>,
  attributes: PerformanceAttributes = {}
): Promise<T> {
  const correlationId =
    typeof attributes.emissionRequestId === 'string'
      ? attributes.emissionRequestId
      : typeof attributes.correlationId === 'string'
        ? attributes.correlationId
        : undefined;

  const name = `fiscal.nfe.${stage}`;
  const safeAttributes = {
    module: 'Fiscal',
    flow: 'outbound_nfe',
    stage,
    ...(correlationId ? { correlation_id: correlationId } : {}),
    ...attributes,
  };

  return tracer.startActiveSpan(name, { attributes: safeAttributes }, async (span) => {
    const startedAt = performance.now();
    let succeeded = false;

    try {
      const result = await operation();
      succeeded = true;
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      // Do not attach an exception message that could contain request data.
      span.recordException('NF-e performance stage failed');
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'NF-e performance stage failed' });
      throw error;
    } finally {
      const durationMs = Math.max(0, performance.now() - startedAt);
      span.setAttribute('operation.duration_ms', durationMs);
      span.setAttribute('operation.success', succeeded);
      span.end();
      console.info(
        JSON.stringify({
          event: 'fiscal.nfe.performance',
          stage,
          ...(correlationId ? { correlation_id: correlationId } : {}),
          duration_ms: Number(durationMs.toFixed(2)),
          success: succeeded,
        })
      );
    }
  });
}
