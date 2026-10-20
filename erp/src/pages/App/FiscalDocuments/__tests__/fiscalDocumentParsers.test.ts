import { describe, expect, it } from 'vitest';
import {
  isRecord,
  mapFiscalDocumentDetailsRecord,
  mapNfeDocumentRecord,
  mapOperationDraftSummary,
  nullableString,
  parseFiscalDocumentEvent,
} from '../services/fiscalDocuments/fiscalDocumentParsers';

describe('fiscalDocumentParsers', () => {
  describe('isRecord', () => {
    it('returns true for plain objects and false for primitives/arrays/null', () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ a: 1 })).toBe(true);
      expect(isRecord(null)).toBe(false);
      expect(isRecord(undefined)).toBe(false);
      expect(isRecord([])).toBe(false);
      expect(isRecord('string')).toBe(false);
      expect(isRecord(123)).toBe(false);
    });
  });

  describe('nullableString', () => {
    it('returns string when valid or null when null/undefined', () => {
      expect(nullableString('valid', 'field')).toBe('valid');
      expect(nullableString(null, 'field')).toBeNull();
      expect(nullableString(undefined, 'field')).toBeNull();
    });

    it('throws error when value is of wrong type', () => {
      expect(() => nullableString(123, 'teste')).toThrow(
        'Histórico fiscal com dados inválidos em teste.'
      );
    });
  });

  describe('parseFiscalDocumentEvent', () => {
    it('successfully parses valid event payload', () => {
      const raw = {
        id: 'evt-1',
        event_type: '110111',
        status: 'homologado',
        requested_at: '2026-10-20T10:00:00Z',
        attempt_number: 1,
        cstat: '135',
        xmotivo: 'Evento registrado e vinculado a NF-e',
        requested_by: 'operador@morante.com',
        protocol_number: '135260000000001',
        justification: 'Cancelamento por erro de faturamento',
      };

      const parsed = parseFiscalDocumentEvent(raw);
      expect(parsed).toEqual({
        id: 'evt-1',
        event_type: '110111',
        status: 'homologado',
        requested_at: '2026-10-20T10:00:00Z',
        attempt_number: 1,
        cstat: '135',
        xmotivo: 'Evento registrado e vinculado a NF-e',
        requested_by: 'operador@morante.com',
        protocol_number: '135260000000001',
        justification: 'Cancelamento por erro de faturamento',
      });
    });

    it('throws error when mandatory attributes are missing or invalid', () => {
      expect(() => parseFiscalDocumentEvent(null)).toThrow('Histórico fiscal com dados inválidos.');
      expect(() => parseFiscalDocumentEvent({ id: 123 })).toThrow('Histórico fiscal com dados inválidos.');
      expect(() =>
        parseFiscalDocumentEvent({
          id: 'evt-1',
          event_type: '110111',
          status: 'ok',
          requested_at: '2026-10-20',
          attempt_number: 'invalid',
        })
      ).toThrow('Histórico fiscal com dados inválidos.');
    });
  });

  describe('mapNfeDocumentRecord', () => {
    it('maps database/API record to NfeDocumentRecord with defaults', () => {
      const raw = {
        id: 'doc-1',
        order_id: 'ord-1',
        numero_nfe: 100,
        serie: '1',
        chave_acesso: '41261044512248000107550010000001001000001000',
        modelo: '55',
        ambiente: 2,
        status: 'autorizada',
        motivo_status: 'Autorizado o uso da NF-e',
        numero_protocolo: '141260000000001',
        created_at: '2026-10-20T12:00:00Z',
        updated_at: '2026-10-20T12:01:00Z',
      };

      const mapped = mapNfeDocumentRecord(raw, 'outbound');
      expect(mapped.id).toBe('doc-1');
      expect(mapped.numero_nfe).toBe(100);
      expect(mapped.document_type).toBe('outbound');
      expect(mapped.modelo).toBe('55');
      expect(mapped.ambiente).toBe(2);
    });
  });

  describe('mapFiscalDocumentDetailsRecord', () => {
    it('maps details document correctly', () => {
      const raw = {
        id: 'doc-2',
        order_id: null,
        numero_nfe: 200,
        serie: '2',
        chave_acesso: '41261044512248000107550020000002001000002000',
        modelo: '55',
        ambiente: 1,
        status: 'cancelada',
        created_at: '2026-10-20T12:00:00Z',
        updated_at: '2026-10-20T12:05:00Z',
      };

      const mapped = mapFiscalDocumentDetailsRecord(raw);
      expect(mapped.id).toBe('doc-2');
      expect(mapped.order_id).toBeNull();
      expect(mapped.ambiente).toBe(1);
      expect(mapped.status).toBe('cancelada');
    });
  });

  describe('mapOperationDraftSummary', () => {
    it('maps operation draft with environment and operation_kind', () => {
      const raw = {
        id: 'draft-1',
        operation_kind: 'estorno',
        environment: 2,
        status: 'ready',
        reason: 'Erro de precificação',
        created_at: '2026-10-20T13:00:00Z',
      };

      const mapped = mapOperationDraftSummary(raw);
      expect(mapped.operation_kind).toBe('estorno');
      expect(mapped.environment).toBe(2);
      expect(mapped.status).toBe('ready');
      expect(mapped.reason).toBe('Erro de precificação');
    });
  });
});
