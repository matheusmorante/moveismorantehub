import { describe, it, expect, beforeEach } from 'vitest';
import {
  withSpan,
  DomainSpans,
  registerTelemetryExporter,
  clearTelemetryExporters,
  MemorySpanExporter,
  sanitizeTelemetryValue,
  sanitizeAttributes,
} from '../tracer';
import { SpanStatusCode } from '@opentelemetry/api';

describe('OpenTelemetry Tracing & PII Guard', () => {
  let memoryExporter: MemorySpanExporter;

  beforeEach(() => {
    clearTelemetryExporters();
    memoryExporter = new MemorySpanExporter();
    registerTelemetryExporter((span) => memoryExporter.export(span));
  });

  describe('PII and Secret Sanitization', () => {
    it('masks CPF, CNPJ, Email, Phone and Tokens from attributes', () => {
      const rawAttrs = {
        'customer.cpf': '123.456.789-00',
        'customer.cnpj': '12.345.678/0001-90',
        'customer.email': 'joao.silva@empresa.com.br',
        'customer.phone': '(44) 99876-5432',
        'auth.token':
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        'payment.secretKey': 'sk_live_verysecretstring',
        'product.sku': 'MOR-CRI-001',
        'order.total': 1500.5,
      };

      const sanitized = sanitizeAttributes(rawAttrs);

      expect(sanitized['customer.cpf']).toBe('***.***.***-**');
      expect(sanitized['customer.cnpj']).toBe('**.***.***/****-**');
      expect(sanitized['customer.email']).toBe('***@domain.redacted');
      expect(sanitized['customer.phone']).toBe('(**) *****-****');
      expect(sanitized['auth.token']).toBe('[REDACTED]');
      expect(sanitized['payment.secretKey']).toBe('[REDACTED]');
      expect(sanitized['product.sku']).toBe('MOR-CRI-001');
      expect(sanitized['order.total']).toBe(1500.5);
    });

    it('masks Bearer tokens embedded in string messages', () => {
      const msg = 'Request failed with Bearer eyJhbGciOi.eyJzdWIi.sflKxw header';
      expect(sanitizeTelemetryValue(msg)).toBe('Request failed with Bearer [REDACTED] header');
    });
  });

  describe('Representative Business Flow Tracing', () => {
    it('traces Stock.createUnavailability, exports span, masks PII, and measures egress impact', async () => {
      const result = await DomainSpans.Stock.createUnavailability({
        unavailability_id: 'unavail-uuid-1234',
        product_id: 'prod-uuid-5678',
        variation_id: 'var-uuid-9999',
        quantity: 2,
        reason: 'Avaria em transporte',
        'operator.email': 'operador@morante.com.br',
        'operator.cpf': '098.765.432-10',
        'session.token': 'secret-session-token-999',
      })(async (span) => {
        span.setAttribute('stock.balance_before', 10);
        span.setAttribute('stock.balance_after', 8);
        return { success: true, new_balance: 8 };
      });

      expect(result.success).toBe(true);

      const exportedSpans = memoryExporter.getSpans();
      expect(exportedSpans).toHaveLength(1);

      const span = exportedSpans[0];
      expect(span.name).toBe('stock.unavailability.create');
      expect(span.status.code).toBe(SpanStatusCode.OK);
      expect(span.duration_ms).toBeGreaterThanOrEqual(0);

      // Verify PII is masked in the exported telemetry payload
      expect(span.attributes['operator.email']).toBe('***@domain.redacted');
      expect(span.attributes['operator.cpf']).toBe('***.***.***-**');
      expect(span.attributes['session.token']).toBe('[REDACTED]');
      expect(span.attributes['module']).toBe('Stock');
      expect(span.attributes['product_id']).toBe('prod-uuid-5678');

      // Measure Egress Impact
      const payloadBytes = memoryExporter.calculatePayloadBytes();
      console.log(`[Telemetry Egress Evidence] 1 span payload size: ${payloadBytes} bytes`);
      expect(payloadBytes).toBeLessThan(500); // Strict lightweight boundary
    });

    it('records errors and redacts PII in exception messages', async () => {
      await expect(
        withSpan('order.process_payment', async () => {
          throw new Error('Falha para o cliente com CPF 111.222.333-44 e email teste@email.com');
        })
      ).rejects.toThrow();

      const exportedSpans = memoryExporter.getSpans();
      expect(exportedSpans).toHaveLength(1);
      const span = exportedSpans[0];

      expect(span.status.code).toBe(SpanStatusCode.ERROR);
      expect(span.status.message).toContain('***.***.***-**');
      expect(span.status.message).toContain('***@domain.redacted');
      expect(span.status.message).not.toContain('111.222.333-44');
      expect(span.status.message).not.toContain('teste@email.com');
    });
  });
});
