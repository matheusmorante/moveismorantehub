import { expect, it } from 'vitest';

export function registerTransmitOperationDraftProductionConfirmationCases({
  createDatabase,
  createResponse,
  getHandler,
  mocks,
  uncertainReply,
}: {
  createDatabase: () => any;
  createResponse: () => any;
  getHandler: () => Promise<any>;
  mocks: any;
  uncertainReply: string;
}): void {
  it.each([false, true])('exige confirmação explícita para transmissão ready em Produção (XML armazenado=%s)', async (storedXml) => {
    const { db, state } = createDatabase();
    if (storedXml) {
      state.draft.access_key = '4'.repeat(44);
      state.draft.signed_xml = '<NFe><Signature/></NFe>';
    }
    mocks.createClient.mockReturnValue(db);
    const handler = await getHandler();
    const res = createResponse();
    await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
      body: { draftId: state.draft.id, productionConfirmed: false } } as any, res.response);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Produção');
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
    expect(mocks.extractCertificateAndKey).not.toHaveBeenCalled();
    expect(state.rpcCalls).toEqual([]);
    expect(state.draft.status).toBe('ready');
  });

  it.each(['unknown', 'transmitting'])('consulta tentativa %s em Produção sem exigir confirmação de transmissão', async (status) => {
    const { db, state } = createDatabase();
    state.draft.status = status;
    state.draft.access_key = '4'.repeat(44);
    state.draft.signed_xml = '<NFe><Signature/></NFe>';
    mocks.createClient.mockReturnValue(db);
    mocks.sendSoapToSefaz.mockResolvedValue(uncertainReply);
    const handler = await getHandler();
    const res = createResponse();
    await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
      body: { draftId: state.draft.id, productionConfirmed: false } } as any, res.response);
    expect(res.statusCode).toBe(202);
    expect(res.body).toMatchObject({ pending: true, cStat: '105' });
    expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(1);
    expect(mocks.sendSoapToSefaz.mock.calls[0][0].xmlPayload).toContain('<xServ>CONSULTAR</xServ>');
    expect(state.draft.status).toBe(status);
    expect(state.draft.access_key).toBe('4'.repeat(44));
    expect(state.draft.signed_xml).toBe('<NFe><Signature/></NFe>');
    expect(mocks.signNfeXml).not.toHaveBeenCalled();
    expect(state.rpcCalls).toEqual([]);
  });

}
