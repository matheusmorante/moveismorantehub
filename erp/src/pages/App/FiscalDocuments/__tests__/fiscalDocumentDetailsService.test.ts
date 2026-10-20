import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = vi.hoisted(() => ({
  from: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: mockDb.from,
    auth: { getSession: mockDb.getSession },
  },
}));

import { fetchFiscalDocumentDetails } from '../services/fiscalDocuments/fiscalDocumentDetailsService';
import * as fallbackService from '../services/fiscalDocuments/fiscalDocumentFallbackService';

describe('fiscalDocumentDetailsService', () => {
  beforeEach(() => {
    mockDb.from.mockReset();
    mockDb.getSession.mockReset();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws an error if user session is not available', async () => {
    mockDb.getSession.mockResolvedValue({ data: { session: null }, error: null });

    await expect(fetchFiscalDocumentDetails('doc-123')).rejects.toThrow(
      'Faça login novamente para consultar os detalhes fiscais.'
    );
  });

  it('fetches details from API and parses valid response envelope', async () => {
    mockDb.getSession.mockResolvedValue({
      data: { session: { access_token: 'fake-jwt-token' } },
      error: null,
    });

    const mockPayload = {
      success: true,
      document: {
        id: 'doc-123',
        order_id: 'order-1',
        numero_nfe: 10,
        serie: '1',
        chave_acesso: '41261044512248000107550010000000101000000100',
        modelo: '55',
        ambiente: 2,
        status: 'autorizada',
        created_at: '2026-10-20T10:00:00Z',
        updated_at: '2026-10-20T10:05:00Z',
      },
      events: [
        {
          id: 'evt-1',
          event_type: '110111',
          status: 'homologado',
          requested_at: '2026-10-20T10:05:00Z',
        },
      ],
      operationDrafts: [],
      linkedDocuments: [],
      orderEmissions: [],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (h: string) => (h.toLowerCase() === 'content-type' ? 'application/json' : null),
      },
      text: async () => JSON.stringify(mockPayload),
      json: async () => mockPayload,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchFiscalDocumentDetails('doc-123');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/nfe/document-details',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-jwt-token',
        }),
      })
    );

    expect(result.document.id).toBe('doc-123');
    expect(result.document.numero_nfe).toBe(10);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].id).toBe('evt-1');
  });

  it('delegates to Supabase fallback when API fetch fails', async () => {
    mockDb.getSession.mockResolvedValue({
      data: { session: { access_token: 'fake-jwt-token' } },
      error: null,
    });

    const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', fetchMock);

    const fallbackSpy = vi.spyOn(fallbackService, 'fetchFiscalDocumentDetailsFromSupabase').mockResolvedValue({
      document: {
        id: 'doc-fallback',
        order_id: null,
        numero_nfe: 99,
        serie: '1',
        chave_acesso: '41261044512248000107550010000000991000000990',
        modelo: '55',
        ambiente: 2,
        status: 'homologada',
        created_at: '2026-10-20T10:00:00Z',
        updated_at: '2026-10-20T10:00:00Z',
        xml_nfe: null,
        xml_protocolo: null,
      },
      events: [],
      parsedXml: null,
      linkedDocuments: [],
      orderEmissions: [],
    });

    const result = await fetchFiscalDocumentDetails('doc-fallback');
    expect(fallbackSpy).toHaveBeenCalledWith('doc-fallback');
    expect(result.document.id).toBe('doc-fallback');
  });
});
