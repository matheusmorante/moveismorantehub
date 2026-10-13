import { describe, expect, it, vi } from 'vitest';
import { reconcileLegacyConsultation } from '../../../../../../api/nfe/reconcileLegacyConsultation';

const doc = {
  id: 'document-id',
  ambiente: 2,
  status: 'homologada',
  chave_acesso: `41261012345678000195550010000000011000000000`,
  numero_protocolo: '141260000000001',
};
const consultationStartedAt = '2026-10-13T12:00:00.000Z';
const xml = (state = '100', environment = 2, key = doc.chave_acesso) =>
  `<retConsSitNFe xmlns="http://www.portalfiscal.inf.br/nfe"><tpAmb>${environment}</tpAmb><chNFe>${key}</chNFe><cStat>${state}</cStat><protNFe><infProt><tpAmb>${environment}</tpAmb><chNFe>${key}</chNFe><cStat>100</cStat><nProt>${doc.numero_protocolo}</nProt></infProt></protNFe></retConsSitNFe>`;
function database(event: { id: string; status: string } | null = null) {
  const q: any = {
    select: () => q,
    eq: () => q,
    order: () => q,
    limit: () => q,
    maybeSingle: async () => ({ data: event, error: null }),
  };
  return {
    from: vi.fn(() => q),
    rpc: vi.fn().mockImplementation(async (name, params) => ({
      data:
        name === 'persist_nfe_cancellation_result'
          ? { eventId: params.p_event_id, status: params.p_status }
          : { documentId: doc.id, status: 'homologada' },
      error: null,
    })),
  };
}
describe('consulta legada preserva fatos fiscais', () => {
  it.each([
    xml('217'),
    xml('108'),
    xml('100', 1),
    xml('100', 2, '5'.repeat(44)),
    `<broken>${xml()}`,
  ])('não escreve diante de resposta incerta/incompatível', async (response) => {
    const db = database();
    const result = await reconcileLegacyConsultation(
      db as any,
      doc,
      response,
      consultationStartedAt
    );
    expect(result.body).toMatchObject({ success: false, pending: true });
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it('não restaura autorização de documento cancelado', async () => {
    const db = database();
    const result = await reconcileLegacyConsultation(
      db as any,
      { ...doc, status: 'cancelada' },
      xml(),
      consultationStartedAt
    );
    expect(result.body.success).toBe(false);
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it('não cria evento fictício ao descobrir cancelamento externo', async () => {
    const db = database();
    expect(
      (await reconcileLegacyConsultation(db as any, doc, xml('101'), consultationStartedAt)).body
        .success
    ).toBe(false);
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it('mantém pendente cancelamento consultado sem protocolo do evento', async () => {
    const db = database({ id: 'event-id', status: 'unknown' });
    const result = await reconcileLegacyConsultation(
      db as any,
      doc,
      xml('101'),
      consultationStartedAt
    );
    expect(result.body).toMatchObject({ success: false, pending: true });
    expect(db.rpc).toHaveBeenCalledWith(
      'persist_nfe_cancellation_result',
      expect.objectContaining({ p_status: 'unknown', p_protocol: null })
    );
  });
  it.each(['none', 'rejected', 'response_lost', 'response_empty', 'wrong_document'])(
    'usa commit único e expõe falha de persistência: %s',
    async (failure) => {
      const db = database({ id: 'event-id', status: 'unknown' });
      if (failure === 'rejected')
        db.rpc.mockResolvedValue({ data: null, error: { code: '23514' } });
      if (failure === 'response_lost') db.rpc.mockRejectedValue(new Error('fetch failed'));
      if (failure === 'response_empty') db.rpc.mockResolvedValue({ data: null, error: null });
      if (failure === 'wrong_document')
        db.rpc.mockResolvedValue({
          data: { documentId: 'other-id', status: 'homologada' },
          error: null,
        });
      const result = await reconcileLegacyConsultation(
        db as any,
        doc,
        xml(),
        consultationStartedAt
      );
      expect(result.body.success).toBe(failure === 'none');
      expect(db.rpc).toHaveBeenCalledOnce();
      expect(db.rpc).toHaveBeenCalledWith(
        'persist_nfe_legacy_consultation',
        expect.objectContaining({
          p_document_id: doc.id,
          p_event_id: 'event-id',
          p_consultation_started_at: consultationStartedAt,
        })
      );
    }
  );
});
