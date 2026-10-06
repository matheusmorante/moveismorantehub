import { SpanStatusCode, trace } from '@opentelemetry/api';

type NfeEmissionPerformanceStage = 'sefaz_transmission';
type PerformanceAttributes = Record<string, string | number | boolean | undefined>;

const tracer = trace.getTracer('morante-hub', '1.0.0');

export async function withNfeEmissionStage<T>(
  stage: NfeEmissionPerformanceStage,
  operation: () => T | Promise<T>,
  attributes: PerformanceAttributes = {}
): Promise<T> {
  const name = `fiscal.nfe.${stage}`;
  const safeAttributes = {
    module: 'Fiscal',
    flow: 'outbound_nfe',
    stage,
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
          duration_ms: Number(durationMs.toFixed(2)),
          success: succeeded,
        })
      );
    }
  });
}
