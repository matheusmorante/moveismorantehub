import { trace, context, SpanStatusCode, Span, Tracer } from '@opentelemetry/api';

const TRACER_NAME = 'morante-hub';
const TRACER_VERSION = '1.0.0';

export interface TelemetrySpanAttributes {
  [key: string]: string | number | boolean | undefined;
}

/**
 * PII and Secret Sanitizer
 * Redacts CPF, CNPJ, Email, Phone, and Bearer Tokens from telemetry metadata
 */
export function sanitizeTelemetryValue(val: unknown): unknown {
  if (typeof val !== 'string') {
    return val;
  }

  return val
    // Bearer tokens / JWT
    .replace(/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi, 'Bearer [REDACTED]')
    // Email
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '***@domain.redacted')
    // CPF (formatted or plain 11 digits)
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '***.***.***-**')
    // CNPJ
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '**.***.***/****-**')
    // Phone numbers (BR)
    .replace(/\(?\b\d{2}\)?\s*9?\d{4}-?\d{4}\b/g, '(**) *****-****');
}

export function sanitizeAttributes(attrs: TelemetrySpanAttributes): Record<string, string | number | boolean> {
  const sanitized: Record<string, string | number | boolean> = {};
  for (const [key, val] of Object.entries(attrs)) {
    if (val === undefined || val === null) continue;
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('password') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('token') ||
      lowerKey.includes('apikey') ||
      lowerKey.includes('authorization')
    ) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof val === 'string') {
      sanitized[key] = sanitizeTelemetryValue(val) as string;
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

export interface ExportedTelemetrySpan {
  name: string;
  attributes: Record<string, string | number | boolean>;
  status: { code: SpanStatusCode; message?: string };
  duration_ms: number;
  timestamp: number;
}

export type TelemetryExporter = (span: ExportedTelemetrySpan) => void | Promise<void>;

const activeExporters: Set<TelemetryExporter> = new Set();

/**
 * Registers a telemetry exporter (e.g. Memory, Console, or OTLP Exporter)
 */
export function registerTelemetryExporter(exporter: TelemetryExporter): () => void {
  activeExporters.add(exporter);
  return () => {
    activeExporters.delete(exporter);
  };
}

export function clearTelemetryExporters(): void {
  activeExporters.clear();
}

/**
 * In-memory exporter for validation, testing, and egress measurement
 */
export class MemorySpanExporter {
  private spans: ExportedTelemetrySpan[] = [];

  export(span: ExportedTelemetrySpan): void {
    this.spans.push(span);
  }

  getSpans(): ExportedTelemetrySpan[] {
    return [...this.spans];
  }

  clear(): void {
    this.spans = [];
  }

  calculatePayloadBytes(): number {
    return Buffer.byteLength(JSON.stringify(this.spans), 'utf8');
  }
}

/**
 * Returns the standard OpenTelemetry Tracer for MoranteHub
 */
export function getTracer(): Tracer {
  return trace.getTracer(TRACER_NAME, TRACER_VERSION);
}

/**
 * Executes a function inside an active OpenTelemetry span with automatic
 * timing, error reporting, and PII masking.
 */
export async function withSpan<T>(
  spanName: string,
  fn: (span: Span) => Promise<T> | T,
  initialAttributes?: TelemetrySpanAttributes
): Promise<T> {
  const tracer = getTracer();
  const safeAttributes = initialAttributes ? sanitizeAttributes(initialAttributes) : {};
  let statusCode = SpanStatusCode.OK;
  let statusMessage: string | undefined;

  return tracer.startActiveSpan(spanName, { attributes: safeAttributes }, async (span) => {
    const startTime = Date.now();
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err: unknown) {
      statusCode = SpanStatusCode.ERROR;
      const error = err instanceof Error ? err : new Error(String(err));
      statusMessage = sanitizeTelemetryValue(error.message) as string;
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: statusMessage,
      });
      throw err;
    } finally {
      const durationMs = Date.now() - startTime;
      span.setAttribute('operation.duration_ms', durationMs);
      span.end();

      if (activeExporters.size > 0) {
        const exported: ExportedTelemetrySpan = {
          name: spanName,
          attributes: { ...safeAttributes, 'operation.duration_ms': durationMs },
          status: { code: statusCode, message: statusMessage },
          duration_ms: durationMs,
          timestamp: startTime,
        };
        for (const exporter of activeExporters) {
          try {
            exporter(exported);
          } catch (e) {
            console.error('[OpenTelemetry] Exporter error:', e);
          }
        }
      }
    }
  });
}

/**
 * Domain-specific semantic tracers for critical business operations
 */
export const DomainSpans = {
  Stock: {
    createUnavailability: (attributes?: TelemetrySpanAttributes) =>
      (fn: (span: Span) => Promise<any> | any) =>
        withSpan('stock.unavailability.create', fn, { module: 'Stock', ...attributes }),
    undoUnavailability: (attributes?: TelemetrySpanAttributes) =>
      (fn: (span: Span) => Promise<any> | any) =>
        withSpan('stock.unavailability.undo', fn, { module: 'Stock', ...attributes }),
  },
  SalesOrder: {
    createOrder: (attributes?: TelemetrySpanAttributes) =>
      (fn: (span: Span) => Promise<any> | any) =>
        withSpan('sales.order.create', fn, { module: 'SalesOrder', ...attributes }),
    updateStatus: (attributes?: TelemetrySpanAttributes) =>
      (fn: (span: Span) => Promise<any> | any) =>
        withSpan('sales.order.update_status', fn, { module: 'SalesOrder', ...attributes }),
  },
  Fiscal: {
    emitNfe: (attributes?: TelemetrySpanAttributes) =>
      (fn: (span: Span) => Promise<any> | any) =>
        withSpan('fiscal.nfe.emit', fn, { module: 'Fiscal', ...attributes }),
    syncDistDfe: (attributes?: TelemetrySpanAttributes) =>
      (fn: (span: Span) => Promise<any> | any) =>
        withSpan('fiscal.dfe.dist', fn, { module: 'Fiscal', ...attributes }),
  },
  Auth: {
    login: (attributes?: TelemetrySpanAttributes) =>
      (fn: (span: Span) => Promise<any> | any) =>
        withSpan('auth.user.login', fn, { module: 'Auth', ...attributes }),
  },
};
