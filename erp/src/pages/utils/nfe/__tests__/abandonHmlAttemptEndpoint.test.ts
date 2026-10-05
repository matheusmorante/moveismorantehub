import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  authorize: vi.fn(),
  maybeSingle: vi.fn(),
  snapshotMaybeSingle: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('../../../../../../node_modules/@supabase/supabase-js/dist/index.mjs', () => ({
  createClient: mocks.createClient,
}));
vi.mock('../../../../../../api/supabaseSecretKey', () => ({
  getSupabaseSecretKey: () => 'TEST_AUT_SERVICE_KEY',
}));
vi.mock('../../../../../../api/nfe/fiscalAuthorization', () => ({
  authorizeFiscalOperator: mocks.authorize,
}));

const orderId = 'TEST_AUT_order-4077';
const documentId = '3707d4f2-27e9-4bfe-9c6c-3216e2f5b189';
const requestId = 'd81628e1-7874-42cf-9ae2-fcfd551903e3';
const currentChoices = {
  '1': { ncm: '94035000', cfop: '5102', origem: '0', cest: '', csosn: '103' },
};
const originalChoices = {
  '1': { ncm: '94036000', cfop: '5102', origem: '0', cest: '', csosn: '103' },
};
const tlsDiagnostic = {
  emissionRequestId: requestId,
  code: 'SELF_SIGNED_CERT_IN_CHAIN',
  category: 'TLS_FAILURE',
  phase: 'tls',
  environment: 2,
  model: '65',
  hostname: 'homologacao.nfce.sefa.pr.gov.br',
  endpoint: 'https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeAutorizacao4',
};
const fiscalChoicesBody = {
  itemCsosnOverrides: {},
  itemFiscalSelections: currentChoices,
};

function response() {
  let statusCode = 200;
  let body: unknown;
  const res: any = {
    setHeader: vi.fn(),
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(value: unknown) {
      body = value;
      return res;
    },
    end: vi.fn(),
  };
  return {
    res,
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
  };
}

let row: Record<string, unknown>;
let handler: (req: any, res: any) => Promise<unknown>;

describe('encerramento fiscal HML antes do envio', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv('VERCEL_ENV', 'development');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://synthetic.supabase.co');
    row = {
      id: documentId,
      order_id: orderId,
      emission_request_id: requestId,
      ambiente: 2,
      modelo: '65',
      status: 'pendente',
      document_type: 'outbound',
      fiscal_ruleset_version: 'HML_NORMAL_SALE_V2',
      fiscal_snapshot_id: '1ceea795-a13c-4f30-bc37-889eddff9dc9',
      hml_attempt_token: null,
      hml_attempt_expires_at: null,
      numero_protocolo: null,
      xml_protocolo: null,
      hml_response_history: [
        {
          reason: `Resposta da transmissão HML desconhecida: ${JSON.stringify(tlsDiagnostic)}`,
          responseXml: '',
          protocol: null,
        },
      ],
      numero_nfe: 616,
      serie: '1',
    };
    mocks.maybeSingle.mockImplementation(async () => ({ data: row, error: null }));
    mocks.snapshotMaybeSingle.mockResolvedValue({
      data: { snapshot_data: { emissionRequest: { itemFiscalSelections: originalChoices } } },
      error: null,
    });
    mocks.rpc.mockResolvedValue({ data: { success: true, alreadyAbandoned: false }, error: null });
    mocks.authorize.mockResolvedValue({ ok: true, userId: 'f19b3e63-6f84-45ea-8c5f-39476d709a3d' });
    const queryFor = (table: string): any => {
      const maybeSingle = table === 'nfe_documents' ? mocks.maybeSingle : mocks.snapshotMaybeSingle;
      const query: any = {
        select: () => query,
        eq: () => query,
        maybeSingle,
      };
      return query;
    };
    mocks.createClient.mockReturnValue({
      from: (table: string) => queryFor(table),
      rpc: mocks.rpc,
    });
    handler = (await import('../../../../../../api/nfe/abandon-hml-attempt')).default as any;
  });

  it('revalida as evidências no servidor e registra o ator sem transmitir', async () => {
    const result = response();
    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer synthetic-operator-token' },
        body: { orderId, documentId, emissionRequestId: requestId, ...fiscalChoicesBody },
      },
      result.res
    );

    expect(result.statusCode).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('abandon_untransmitted_hml_attempt', {
      p_document_id: documentId,
      p_order_id: orderId,
      p_emission_request_id: requestId,
      p_actor_id: 'f19b3e63-6f84-45ea-8c5f-39476d709a3d',
    });
  });

  it.each([
    ['217', '<retConsSitNFe><cStat>217</cStat></retConsSitNFe>', ''],
    ['704', '<retEnviNFe><cStat>704</cStat></retEnviNFe>', '141260000000616'],
  ])(
    'recusa abandono quando existe resposta/protocolo SEFAZ (%s)',
    async (_code, responseXml, protocol) => {
      row.hml_response_history = [
        {
          reason: `SEFAZ respondeu ${_code}`,
          responseXml,
          protocol,
        },
      ];
      const result = response();
      await handler(
        {
          method: 'POST',
          headers: { authorization: 'Bearer synthetic-operator-token' },
          body: { orderId, documentId, emissionRequestId: requestId, ...fiscalChoicesBody },
        },
        result.res
      );

      expect(result.statusCode).toBe(409);
      expect(result.body).toMatchObject({ code: 'HML_ABANDONMENT_TRANSMISSION_NOT_PROVEN' });
      expect(mocks.rpc).not.toHaveBeenCalled();
    }
  );

  it('não abandona a tentativa quando as escolhas enviadas não diferem do snapshot', async () => {
    mocks.snapshotMaybeSingle.mockResolvedValueOnce({
      data: { snapshot_data: { emissionRequest: { itemFiscalSelections: currentChoices } } },
      error: null,
    });
    const result = response();
    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer synthetic-operator-token' },
        body: { orderId, documentId, emissionRequestId: requestId, ...fiscalChoicesBody },
      },
      result.res
    );

    expect(result.statusCode).toBe(409);
    expect(result.body).toMatchObject({ code: 'HML_ABANDONMENT_FISCAL_CHANGE_NOT_PROVEN' });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
