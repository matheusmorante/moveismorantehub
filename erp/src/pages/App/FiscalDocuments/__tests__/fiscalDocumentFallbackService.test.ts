import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: mockDb.from,
  },
}));

import { fetchFiscalDocumentDetailsFromSupabase } from '../services/fiscalDocuments/fiscalDocumentFallbackService';

function createMockQuery(result: { data: unknown; error?: unknown }) {
  const query: any = {};
  for (const method of ['select', 'eq', 'or', 'order', 'limit']) {
    query[method] = vi.fn(() => query);
  }
  query.maybeSingle = vi.fn().mockResolvedValue(result);
  query.then = (onfulfilled: any) =>
    Promise.resolve({ data: result.data, error: result.error || null }).then(onfulfilled);
  return query;
}

describe('fiscalDocumentFallbackService', () => {
  beforeEach(() => {
    mockDb.from.mockReset();
  });

  it('loads document, events, drafts, linked docs, and order emissions when document exists in nfe_documents', async () => {
    const docData = {
      id: 'doc-primary',
      order_id: 'ord-55',
      numero_nfe: 101,
      serie: '1',
      chave_acesso: '41261044512248000107550010000001011000001010',
      modelo: '55',
      ambiente: 2,
      status: 'autorizada',
      created_at: '2026-10-20T10:00:00Z',
      updated_at: '2026-10-20T10:05:00Z',
      xml_nfe: '<nfeProc></nfeProc>',
    };

    mockDb.from.mockImplementation((table: string) => {
      if (table === 'nfe_documents') {
        const query = createMockQuery({ data: docData });
        return query;
      }
      if (table === 'nfe_document_events') {
        return createMockQuery({ data: [] });
      }
      if (table === 'nfe_operation_drafts') {
        return createMockQuery({ data: [] });
      }
      return createMockQuery({ data: null });
    });

    const result = await fetchFiscalDocumentDetailsFromSupabase('doc-primary');
    expect(result.document.id).toBe('doc-primary');
    expect(result.document.numero_nfe).toBe(101);
    expect(result.document.order_id).toBe('ord-55');
  });

  it('falls back to draft document when not found in nfe_documents', async () => {
    const draftData = {
      id: 'draft-estorno-1',
      operation_kind: 'estorno',
      environment: 2,
      status: 'ready',
      reason: 'Estorno de NF autorizada',
      access_key: '41261044512248000107550010000001021000001020',
      created_at: '2026-10-20T11:00:00Z',
      updated_at: '2026-10-20T11:00:00Z',
    };

    mockDb.from.mockImplementation((table: string) => {
      if (table === 'nfe_documents') {
        return createMockQuery({ data: null });
      }
      if (table === 'nfe_operation_drafts') {
        return createMockQuery({ data: draftData });
      }
      return createMockQuery({ data: null });
    });

    const result = await fetchFiscalDocumentDetailsFromSupabase('draft-estorno-1');
    expect(result.document.id).toBe('draft-estorno-1');
    expect(result.document.document_type).toBe('estorno');
    expect(result.document.numero_nfe).toBe(102);
    expect(result.document.ambiente).toBe(2);
  });
});
