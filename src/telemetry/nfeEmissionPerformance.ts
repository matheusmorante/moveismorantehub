import { SpanStatusCode } from '@opentelemetry/api';
import { getTracer, sanitizeAttributes, type TelemetrySpanAttributes } from './tracer';

export type NfeEmissionPerformanceStage =
  | 'modal_open'
  | 'fiscal_enrichment'
  | 'csosn_prepare'
  | 'customer_resolution'
  | 'sequence_preview'
  | 'payload_prepare'
  | 'ready_to_transmit'
  | 'sefaz_transmission';

const readinessReportStages: NfeEmissionPerformanceStage[] = [
  'modal_open',
  'fiscal_enrichment',
  'csosn_prepare',
  'customer_resolution',
  'sequence_preview',
];

/**
 * Records a low-cardinality NF-e performance span without order/customer data.
 * Browser timings are also exposed through the User Timing API for local profiling.
 */
export async function withNfeEmissionStage<T>(
  stage: NfeEmissionPerformanceStage,
  operation: () => T | Promise<T>,
  attributes: TelemetrySpanAttributes = {}
): Promise<T> {
  const name = `fiscal.nfe.${stage}`;
  const safeAttributes = sanitizeAttributes({
    module: 'Fiscal',
    flow: 'outbound_nfe',
    stage,
    ...attributes,
  });
  const tracer = getTracer();

  return tracer.startActiveSpan(name, { attributes: safeAttributes }, async (span) => {
    const browserTiming =
      typeof (globalThis as typeof globalThis & { window?: unknown }).window !== 'undefined' &&
      typeof performance !== 'undefined';
    const now = () =>
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const startedAt = now();
    let succeeded = false;

    try {
      const result = await operation();
      succeeded = true;
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      // Exception text may contain request data. Keep telemetry useful without exporting it.
      span.recordException('NF-e performance stage failed');
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'NF-e performance stage failed' });
      throw error;
    } finally {
      const finishedAt = now();
      const durationMs = Math.max(0, finishedAt - startedAt);
      span.setAttribute('operation.duration_ms', durationMs);
      span.setAttribute('operation.success', succeeded);

      if (browserTiming) {
        try {
          performance.measure(name, { start: startedAt, end: finishedAt });
        } catch {
          // Timing instrumentation must never interfere with fiscal preparation.
        }
      } else {
        // Vercel/server logs provide a queryable baseline for the server-only SEFAZ stage.
        console.info(
          JSON.stringify({
            event: 'fiscal.nfe.performance',
            stage,
            duration_ms: Number(durationMs.toFixed(2)),
            success: succeeded,
          })
        );
      }

      span.end();
    }
  });
}

/** Records the wall-clock interval from opening the emission modal until its transmit button is enabled. */
export function recordNfeEmissionReadiness(
  startedAt: number,
  attributes: TelemetrySpanAttributes = {}
): number {
  if (typeof performance === 'undefined') return 0;

  const stage = 'ready_to_transmit';
  const name = `fiscal.nfe.${stage}`;
  const finishedAt = performance.now();
  const durationMs = Math.max(0, finishedAt - startedAt);
  const safeAttributes = sanitizeAttributes({
    module: 'Fiscal',
    flow: 'outbound_nfe',
    stage,
    ...attributes,
  });
  const timeOrigin =
    typeof performance.timeOrigin === 'number' ? performance.timeOrigin : Date.now() - finishedAt;
  const span = getTracer().startSpan(name, {
    attributes: safeAttributes,
    startTime: timeOrigin + startedAt,
  });
  span.setAttribute('operation.duration_ms', durationMs);
  span.setAttribute('operation.success', true);
  span.setStatus({ code: SpanStatusCode.OK });
  span.end(timeOrigin + finishedAt);

  try {
    performance.measure(name, { start: startedAt, end: finishedAt });
    const report = readinessReportStages.map((reportStage) => {
      const measurements = performance
        .getEntriesByName(`fiscal.nfe.${reportStage}`, 'measure')
        .filter((entry) => entry.startTime >= startedAt && entry.startTime <= finishedAt);
      const latest = measurements.at(-1);
      return `${reportStage.padEnd(22)} ${latest ? `${latest.duration.toFixed(2)} ms` : 'n/a'}`;
    });
    report.push(`ready_to_transmit      ${durationMs.toFixed(2)} ms`);
    console.info(`[NFe Performance]\n${report.join('\n')}`);
  } catch {
    // Performance reporting must never interfere with fiscal preparation.
  }

  return durationMs;
}
