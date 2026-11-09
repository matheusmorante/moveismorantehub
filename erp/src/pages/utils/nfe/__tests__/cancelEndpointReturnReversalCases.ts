import { expect, it } from 'vitest';

export function registerCancelEndpointReturnReversalCases({
  mocks,
  database,
  fiscalDocument,
  request,
  response,
}: any): void {
  it('permite cancelamento fiscal de NF-e modelo 55 de Devolução quando vinculada a pedido de devolução', async () => {
    const returnDoc = {
      ...fiscalDocument,
      document_type: 'return',
      modelo: '55',
      original_document_id: '11111111-1111-4111-8111-111111111111',
      related_return_order_id: 'return-order-id-123',
    };
    const db = database('fulfilled', {
      documentOverrides: returnDoc,
      orderOverrides: { order_type: 'return', status: 'fulfilled' },
    });
    mocks.createClient.mockReturnValue(db);
    process.env.NFE_CERTIFICATE_BASE64 = 'mock-certificate';
    mocks.extractCertificateAndKey.mockReturnValue({
      privateKeyPem: 'mock-key',
      certPem: 'mock-cert',
      certDerBase64: 'mock-der',
    });
    mocks.signNfeEventXml.mockImplementation((xml: string) => xml);
    mocks.sendSoapToSefaz.mockResolvedValue(
      `<retEnvEvento><retEvento><infEvento><tpAmb>2</tpAmb><chNFe>${returnDoc.chave_acesso}</chNFe><tpEvento>110111</tpEvento><nSeqEvento>1</nSeqEvento><cStat>135</cStat><xMotivo>Evento registrado e vinculado a NF-e</xMotivo><nProt>141260000000001</nProt><dhRegEvento>2026-10-17T15:00:00-03:00</dhRegEvento></infEvento></retEvento></retEnvEvento>`
    );
    const handler = (await import('../../../../../../api/nfe/cancel')).default;
    const result = response();

    await handler(
      {
        ...request,
        body: { documentId: returnDoc.id, reason: 'Cancelamento fiscal da devolucao autorizada' },
      },
      result.res as any
    );

    expect(result.statusCode).toBe(200);
    expect(result.body).toMatchObject({ success: true, status: 'cancelada', cStat: '135' });
    expect(db.rpc).toHaveBeenCalledWith('reserve_nfe_cancellation_event', expect.anything());
    expect(db.rpc).toHaveBeenCalledWith(
      'persist_nfe_cancellation_result',
      expect.objectContaining({ p_status: 'registered', p_cstat: '135' })
    );
  });

  it('rejeita cancelamento fiscal de NF-e de Devolução quando pedido de devolução não é do tipo return', async () => {
    const returnDoc = {
      ...fiscalDocument,
      document_type: 'return',
      modelo: '55',
      original_document_id: '11111111-1111-4111-8111-111111111111',
      related_return_order_id: 'return-order-id-123',
    };
    const db = database('fulfilled', {
      documentOverrides: returnDoc,
      orderOverrides: { order_type: 'sale', status: 'fulfilled' },
    });
    mocks.createClient.mockReturnValue(db);
    const handler = (await import('../../../../../../api/nfe/cancel')).default;
    const result = response();

    await handler(
      {
        ...request,
        body: { documentId: returnDoc.id, reason: 'Cancelamento fiscal de devolucao invalida' },
      },
      result.res as any
    );

    expect(result.statusCode).toBe(409);
    expect(result.body?.error).toContain('pedido de devolução comercial');
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('permite cancelamento fiscal de NF-e modelo 55 de Estorno quando não há substituição ativa vinculada', async () => {
    const estornoDoc = {
      ...fiscalDocument,
      document_type: 'estorno',
      modelo: '55',
      original_document_id: '11111111-1111-4111-8111-111111111111',
      related_return_order_id: null,
    };
    const db = database('cancelled', {
      documentOverrides: estornoDoc,
      replacementRecord: null,
    });
    mocks.createClient.mockReturnValue(db);
    process.env.NFE_CERTIFICATE_BASE64 = 'mock-certificate';
    mocks.extractCertificateAndKey.mockReturnValue({
      privateKeyPem: 'mock-key',
      certPem: 'mock-cert',
      certDerBase64: 'mock-der',
    });
    mocks.signNfeEventXml.mockImplementation((xml: string) => xml);
    mocks.sendSoapToSefaz.mockResolvedValue(
      `<retEnvEvento><retEvento><infEvento><tpAmb>2</tpAmb><chNFe>${estornoDoc.chave_acesso}</chNFe><tpEvento>110111</tpEvento><nSeqEvento>1</nSeqEvento><cStat>135</cStat><xMotivo>Evento registrado e vinculado a NF-e</xMotivo><nProt>141260000000001</nProt><dhRegEvento>2026-10-17T15:00:00-03:00</dhRegEvento></infEvento></retEvento></retEnvEvento>`
    );
    const handler = (await import('../../../../../../api/nfe/cancel')).default;
    const result = response();

    await handler(
      {
        ...request,
        body: { documentId: estornoDoc.id, reason: 'Cancelamento fiscal do estorno autorizado' },
      },
      result.res as any
    );

    expect(result.statusCode).toBe(200);
    expect(result.body).toMatchObject({ success: true, status: 'cancelada', cStat: '135' });
    expect(db.rpc).toHaveBeenCalledWith('reserve_nfe_cancellation_event', expect.anything());
    expect(db.rpc).toHaveBeenCalledWith(
      'persist_nfe_cancellation_result',
      expect.objectContaining({ p_status: 'registered', p_cstat: '135' })
    );
  });

  it('rejeita cancelamento fiscal de NF-e modelo 55 de Estorno quando há substituição ativa em andamento', async () => {
    const estornoDoc = {
      ...fiscalDocument,
      document_type: 'estorno',
      modelo: '55',
      original_document_id: '11111111-1111-4111-8111-111111111111',
      related_return_order_id: null,
    };
    const db = database('cancelled', {
      documentOverrides: estornoDoc,
      replacementRecord: { id: 'repl-123', status: 'ready_to_reissue' },
    });
    mocks.createClient.mockReturnValue(db);
    const handler = (await import('../../../../../../api/nfe/cancel')).default;
    const result = response();

    await handler(
      {
        ...request,
        body: { documentId: estornoDoc.id, reason: 'Cancelamento fiscal de estorno bloqueado' },
      },
      result.res as any
    );

    expect(result.statusCode).toBe(409);
    expect(result.body?.error).toContain('substituição fiscal de edição aplicada ou concluída');
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('rejeita cancelamento fiscal de Devolução ou Estorno se o modelo for 65', async () => {
    const returnDocNfce = {
      ...fiscalDocument,
      document_type: 'return',
      modelo: '65',
      original_document_id: '11111111-1111-4111-8111-111111111111',
    };
    const db = database('fulfilled', { documentOverrides: returnDocNfce });
    mocks.createClient.mockReturnValue(db);
    const handler = (await import('../../../../../../api/nfe/cancel')).default;
    const result = response();

    await handler(
      {
        ...request,
        body: { documentId: returnDocNfce.id, reason: 'Cancelamento fiscal devolucao modelo 65 invalido' },
      },
      result.res as any
    );

    expect(result.statusCode).toBe(409);
    expect(result.body?.error).toContain('modelo 55');
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
    expect(db.rpc).not.toHaveBeenCalled();
  });
}
