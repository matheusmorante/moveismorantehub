import { expect, it, vi } from 'vitest';
import { emitHmlTechnical, retryHmlTechnical } from '../../../../../../api/nfe/emitHmlTechnical';

type HmlTechnicalEmissionAttemptRecoveryCasesDependencies = {
  mocks: any;
  database: () => any;
  command: any;
  candidate: any;
};

export function registerHmlTechnicalEmissionAttemptRecoveryCases({
  mocks,
  database,
  command,
  candidate,
}: HmlTechnicalEmissionAttemptRecoveryCasesDependencies): void {
  it('recupera o documento ativo por pedido/ambiente mesmo com outra chave de intenção', async () => {
    const state = database();
    let resolveResponse!: (xml: string) => void;
    mocks.sendSoapToSefaz.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveResponse = resolve;
      })
    );
    const first = emitHmlTechnical(state.db, command, candidate, {});
    await vi.waitFor(() => expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(1));
    const existingFrom = state.from.getMockImplementation()!;
    state.from.mockImplementation((table) => {
      const query = existingFrom(table);
      if (table !== 'nfe_documents') return query;
      const select = query.select;
      query.select = (...args: unknown[]) => {
        const selected = select(...args);
        const eq = selected.eq;
        selected.eq = (field: string, value: unknown) => {
          const chain = eq(field, value);
          if (field === 'emission_request_id')
            chain.maybeSingle = async () => ({ data: null, error: null });
          return chain;
        };
        return selected;
      };
      return query;
    });
    const second = await emitHmlTechnical(
      state.db,
      { ...command, emissionRequestId: 'afdeea6c-500c-4f43-9372-7c4bec6db8a4' },
      candidate,
      {}
    );
    expect(second.status).toBe(409);
    expect(second.body).toMatchObject({
      pending: true,
      documentId: 'doc-hml',
      databaseReason: 'ALREADY_ACTIVE_FISCAL_ATTEMPT',
      model: '55',
      nfeNumber: 700,
    });
    expect(state.calls.filter((c) => c.name === 'prepare_nfe_fiscal_snapshot')).toHaveLength(1);
    expect(
      state.calls.filter((c) => c.name === 'reserve_hml_nfe_outbound_with_replacement')
    ).toHaveLength(1);
    expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(1);
    resolveResponse('<retEnviNFe><cStat>105</cStat></retEnviNFe>');
    await first;
  });

  it('classifica conflito de snapshot como 409 e identifica a reserva original sem consultar SEFAZ', async () => {
    const state = database();
    const rpc = state.rpc.getMockImplementation()!;
    state.rpc.mockImplementation(async (name, args) =>
      name === 'prepare_nfe_fiscal_snapshot'
        ? { data: null, error: { code: '23505', message: 'ALREADY_ACTIVE_FISCAL_ATTEMPT' } as any }
        : rpc(name, args)
    );
    const result = await emitHmlTechnical(state.db, command, candidate, {});
    expect(result.status).toBe(409);
    expect(result.body).toMatchObject({
      pending: true,
      databaseReason: 'ALREADY_ACTIVE_FISCAL_ATTEMPT',
      reservationRecoveryRequired: true,
      nfeNumber: 700,
      model: '55',
      series: '1',
    });
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });

  it.each(['108', '109', '215', '656', '999'])(
    'consulta %s inconclusiva mantém a trava do documento',
    async (cStat) => {
      const state = database();
      mocks.sendSoapToSefaz.mockRejectedValueOnce(new Error('timeout'));
      await emitHmlTechnical(state.db, command, candidate, {});
      mocks.sendSoapToSefaz.mockResolvedValueOnce(
        `<retConsSitNFe><cStat>${cStat}</cStat><xMotivo>Consulta indisponível</xMotivo></retConsSitNFe>`
      );
      const result = await retryHmlTechnical(state.db, 'doc-hml');
      expect(result.body).toMatchObject({ pending: true, code: 'HML_RECONCILIATION_REQUIRED' });
      expect(state.document?.status).toBe('pendente');
      expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(2);
      expect(mocks.sendSoapToSefaz.mock.calls[1][0].url).toContain('NFeConsultaProtocolo4');
    }
  );
}
