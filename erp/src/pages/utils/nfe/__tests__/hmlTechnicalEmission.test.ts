import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  consultAuthorizedHmlTechnical,
  emitHmlTechnical,
  recoverHmlTechnical,
  retryHmlTechnical,
} from '../../../../../../api/nfe/emitHmlTechnical';
import type { FiscalSnapshotCandidate } from '../../../../../../api/nfe/fiscalSnapshot';
import {
  HML_CSOSN_SETTINGS_ID,
  initialHmlCsosnConfiguration,
} from '../../../../../../api/nfe/csosnPolicy';
import { embeddedNfeXml } from '../../../../../../api/nfe/xmlEnvelope';

const mocks = vi.hoisted(() => ({
  sendSoapToSefaz: vi.fn(),
  validateUnsignedNfeStructure: vi.fn(),
  validateNfeAgainstOfficialSchema: vi.fn(),
  extractCertificateAndKey: vi.fn(),
  signNfeXml: vi.fn(),
}));
vi.mock('../../../../../../api/nfe/sefazClient', () => ({
  sendSoapToSefaz: mocks.sendSoapToSefaz,
}));
vi.mock('../../../../../../api/nfe/schemaValidator', () => ({
  validateUnsignedNfeStructure: mocks.validateUnsignedNfeStructure,
  validateNfeAgainstOfficialSchema: mocks.validateNfeAgainstOfficialSchema,
}));
vi.mock('../../../../../../api/nfe/nfeSigner', () => ({
  extractCertificateAndKey: mocks.extractCertificateAndKey,
  signNfeXml: mocks.signNfeXml,
}));

const runId = 'TEST_AUT_f19b3e63-6f84-45ea-8c5f-39476d709a3d';
const requestId = 'f19b3e63-6f84-45ea-8c5f-39476d709a3d';
const hash = 'a'.repeat(64);
const candidate: FiscalSnapshotCandidate = {
  schemaVersion: 1,
  capturedAt: '2026-09-30T13:00:00.000Z',
  order: {
    id: runId,
    type: 'sale',
    status: 'draft',
    deleted: true,
    version: 1,
    updatedAt: '2026-09-30T12:00:00.000Z',
    data: {
      deleted: true,
      testRunId: runId,
      fiscalScenario: 'HML_TECHNICAL_V1',
      items: [
        {
          description: `PRODUTO ${runId}`,
          quantity: 1,
          unitPrice: 100,
          unitDiscount: 0,
          isTemporaryProduct: true,
        },
      ],
      payments: [],
      fiscalTestPayments: [{ method: 'pix', amount: 100 }],
      customerData: {
        fullName: `CLIENTE ${runId}`,
        cpfCnpj: '12345678909',
        fiscalAddress: {
          Logradouro: 'RUA TESTE',
          Numero: '10',
          Bairro: 'CENTRO',
          CMun: '4105805',
          XMun: 'COLOMBO',
          UF: 'PR',
          CEP: '83410270',
        },
      },
    },
  },
  issuerProfile: {
    companyCnpj: '12345678000195',
    companyName: 'EMPRESA HML',
    companyIE: '1234567850',
    companyCRT: '1',
    companyLogradouro: 'RUA TESTE',
    companyNumero: '10',
    companyBairro: 'CENTRO',
    companyCMun: '4105805',
    companyXMun: 'COLOMBO',
    companyUF: 'PR',
    companyCEP: '83410270',
  },
  emissionRequest: { id: requestId, environment: 2 },
};
const decision = {
  scope: { model: '55', operation: 'normal_sale', issuerCrt: '1' },
  pis: { cst: '99', base: 0, rate: 0, value: 0 },
  cofins: { cst: '99', base: 0, rate: 0, value: 0 },
  confirmedAt: '2026-09-01T00:00:00Z',
  confirmedBy: 'operator_instruction',
  productionApproved: false,
};
const command = { orderId: runId, environment: 2 as const, emissionRequestId: requestId };

function database() {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  let document: Record<string, any> | null = null;
  let capturedOverrides: Record<string, string> = {};
  let capturedSelections = {};
  const from = vi.fn<(table: string) => any>((table: string) => ({
    select: () => ({
      eq: (_field: string, _value: unknown) => ({
        maybeSingle: async () => ({
          data:
            table === 'settings'
              ? {
                  data:
                    _value === HML_CSOSN_SETTINGS_ID ? initialHmlCsosnConfiguration() : decision,
                }
              : table === 'nfe_fiscal_snapshots'
                ? {
                    snapshot_data: {
                      ...candidate,
                      fiscalConfiguration: initialHmlCsosnConfiguration(),
                      emissionRequest: {
                        id: requestId,
                        itemCsosnOverrides: capturedOverrides,
                        itemFiscalSelections: capturedSelections,
                        requestedModel: '55',
                        environment: 2,
                        series: '1',
                        number: 700,
                      },
                    },
                    snapshot_sha256: hash,
                    order_id: runId,
                    environment: 2,
                    requested_model: '55',
                    reserved_number: 700,
                    series: '1',
                  }
                : document,
          error: null,
        }),
        eq: function () {
          return this;
        },
        in: function () {
          return this;
        },
        order: function () {
          return this;
        },
        limit: function () {
          return this;
        },
      }),
    }),
  }));
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    calls.push({ name, args });
    if (name === 'prepare_nfe_fiscal_snapshot') {
      capturedOverrides = args.p_item_csosn_overrides as Record<string, string>;
      capturedSelections = args.p_item_fiscal_selections || {};
      return {
        data: {
          snapshotId: '9a794b1a-3ff0-4e44-874e-4c75a8d3449e',
          snapshotHash: hash,
          number: 700,
          issuedAt: '2026-09-30T13:00:00Z',
          orderVersion: 1,
        },
        error: null,
      };
    }
    if (name === 'reserve_hml_nfe_outbound_with_replacement') {
      document = {
        id: 'doc-hml',
        order_id: runId,
        numero_nfe: 700,
        serie: '1',
        chave_acesso: args.p_access_key,
        modelo: '55',
        ambiente: 2,
        status: 'processando',
        xml_nfe: args.p_signed_xml,
        fiscal_ruleset_version: 'HML_TECHNICAL_V1',
        fiscal_snapshot_id: 'snapshot-hml',
        attemptToken: args.p_attempt_token,
        leaseExpiresAt: Date.now() + 120000,
      };
      return { data: 'doc-hml', error: null };
    }
    if (name === 'persist_hml_nfe_result') {
      if (
        !document ||
        document.attemptToken !== args.p_attempt_token ||
        document.leaseExpiresAt <= Date.now()
      )
        return { data: null, error: new Error('HML_ATTEMPT_LEASE_LOST') };
      if (document)
        Object.assign(document, {
          status: args.p_status,
          numero_protocolo: args.p_protocol,
          motivo_status: args.p_reason,
          xml_protocolo: args.p_response_xml,
        });
      return { data: null, error: null };
    }
    if (name === 'claim_hml_nfe_attempt') {
      if (!document || (document.attemptToken && document.leaseExpiresAt > Date.now()))
        return { data: false, error: null };
      Object.assign(document, {
        attemptToken: args.p_attempt_token,
        leaseExpiresAt: Date.now() + 120000,
      });
      return { data: true, error: null };
    }
    if (name === 'release_hml_nfe_attempt') {
      if (document && document.attemptToken === args.p_attempt_token) document.attemptToken = null;
      return { data: null, error: null };
    }
    if (name === 'reactivate_hml_nfe_retry') {
      if (document) document.status = 'processando';
      return { data: null, error: null };
    }
    return { data: null, error: new Error(`RPC inesperada: ${name}`) };
  });
  return {
    db: { from, rpc } as any,
    calls,
    rpc,
    from,
    seedDocument(value: Record<string, unknown>) {
      document = value;
    },
    seedSnapshotSelections(value: Record<string, unknown>) {
      capturedSelections = value;
    },
    get document() {
      return document;
    },
  };
}

describe('pipeline técnico NF-e 55 HML', () => {
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

  it('registra a causa classificada da falha de reserva sem incluir dados do destinatário', async () => {
    const state = database();
    const rpc = state.rpc.getMockImplementation()!;
    state.rpc.mockImplementation(async (name, args) =>
      name === 'prepare_nfe_fiscal_snapshot'
        ? {
            data: null,
            error: { code: '42883', message: 'function missing for CPF 123.456.789-09' } as any,
          }
        : rpc(name, args)
    );
    const diagnosticLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await emitHmlTechnical(state.db, command, candidate, {});

    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({
      code: 'HML_SNAPSHOT_RESERVATION_FAILED',
      diagnosticStage: 'snapshot-reservation',
      databaseCode: '42883',
      diagnosticCategory: 'SQL_FUNCTION_NOT_FOUND',
      numberReserved: false,
      sefazContacted: false,
    });
    expect(result.body.diagnosticId).toEqual(expect.any(String));
    expect(diagnosticLog).toHaveBeenCalledWith(
      '[NF-e HML] Falha na reserva atômica do snapshot',
      expect.objectContaining({ diagnosticId: result.body.diagnosticId, databaseCode: '42883' })
    );
    expect(JSON.stringify(diagnosticLog.mock.calls)).not.toContain('123.456.789-09');
  });

  it('bloqueia IE com DV inválido antes de reservar número ou contatar a SEFAZ', async () => {
    const state = database();
    const invalid = {
      ...candidate,
      issuerProfile: { ...candidate.issuerProfile, companyIE: '9091234567' },
    };
    const result = await emitHmlTechnical(state.db, command, invalid, {});
    expect(result.body).toMatchObject({
      code: 'HML_ISSUER_IE_INVALID',
      numberReserved: false,
      sefazContacted: false,
    });
    expect(state.calls).toHaveLength(0);
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });
  it('preserva rejeição 209 em chamadas repetidas sem consulta nem retransmissão', async () => {
    const state = database();
    mocks.sendSoapToSefaz.mockResolvedValue('<retEnviNFe><cStat>209</cStat></retEnviNFe>');
    await emitHmlTechnical(state.db, command, candidate, {});
    Object.assign(state.document!, {
      status: 'erro',
      xml_protocolo: '<retEnviNFe><cStat>209</cStat><xMotivo>IE inválida</xMotivo></retEnviNFe>',
    });
    const original = structuredClone(state.document);
    mocks.sendSoapToSefaz.mockClear();
    state.calls.length = 0;
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await retryHmlTechnical(state.db, 'doc-hml');
      expect(result.body).toMatchObject({
        code: 'HML_ISSUER_IE_CORRECTION_REQUIRED',
        cStat: '209',
        pending: false,
        sefazContacted: false,
      });
    }
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
    expect(state.calls).toHaveLength(0);
    expect(state.document).toEqual(original);
  });
  it('bloqueia série avulsa 900 antes de reservar snapshot, número ou enviar SOAP', async () => {
    const state = database();
    const result = await emitHmlTechnical(state.db, command, candidate, {
      nfeHomologationSerie: '900',
    });
    expect(result.body).toMatchObject({
      code: 'HML_SEQUENCE_INVALID',
      numberReserved: false,
      sefazContacted: false,
    });
    expect(state.calls).toHaveLength(0);
    expect(state.document).toBeNull();
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });
  it('preserva rejeição 244 e orienta correção sem consultar ou retransmitir o XML rejeitado', async () => {
    const state = database();
    mocks.sendSoapToSefaz.mockResolvedValue('<retEnviNFe><cStat>244</cStat></retEnviNFe>');
    await emitHmlTechnical(state.db, command, candidate, {});
    Object.assign(state.document!, {
      status: 'erro',
      serie: '900',
      xml_protocolo:
        '<retEnviNFe><cStat>244</cStat><xMotivo>Série incompatível</xMotivo></retEnviNFe>',
    });
    mocks.sendSoapToSefaz.mockClear();
    state.calls.length = 0;
    const result = await retryHmlTechnical(state.db, 'doc-hml');
    expect(result.body).toMatchObject({
      code: 'HML_SERIES_CORRECTION_REQUIRED',
      cStat: '244',
      pending: false,
    });
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
    expect(state.calls).toHaveLength(0);
    expect(state.document?.serie).toBe('900');
  });
  const displayed = { ncm: '94036000', cfop: '5102', origem: '0', cest: '', csosn: '103' };
  it.each([
    ['NCM', { ncm: '94034000' }],
    ['CFOP', { cfop: '5101' }],
    ['origem', { origem: '2' }],
    ['CEST', { cest: '2804400' }],
    ['CSOSN', { csosn: '102' }],
    ['todos', { ncm: '94034000', cfop: '5101', origem: '2', cest: '2804400', csosn: '102' }],
  ])('preserva %s do comando até o XML na chamada SOAP controlada', async (_field, changes) => {
    const state = database();
    const selected = { ...displayed, ...changes };
    const itemFiscalSelections = { '1': selected };
    const itemCsosnOverrides = { '1': selected.csosn };
    mocks.sendSoapToSefaz.mockResolvedValue(
      '<retEnviNFe><cStat>999</cStat><xMotivo>TEST_AUT_CONTROLLED</xMotivo></retEnviNFe>'
    );
    await emitHmlTechnical(
      state.db,
      { ...command, itemFiscalSelections, itemCsosnOverrides },
      {
        ...candidate,
        emissionRequest: { ...candidate.emissionRequest, itemFiscalSelections, itemCsosnOverrides },
      },
      {}
    );
    expect(state.calls[0].args.p_item_fiscal_selections).toEqual(itemFiscalSelections);
    const { XmlDocument } = await import('libxml2-wasm');
    const xml = XmlDocument.fromString(mocks.sendSoapToSefaz.mock.calls[0][0].xmlPayload);
    try {
      const ns = { n: 'http://www.portalfiscal.inf.br/nfe' };
      for (const [field, tag] of [
        ['ncm', 'NCM'],
        ['cfop', 'CFOP'],
        ['origem', 'orig'],
        ['cest', 'CEST'],
        ['csosn', 'CSOSN'],
      ] as const) {
        const nodes = xml.find(`//n:det[@nItem='1']//n:${tag}`, ns);
        expect(nodes.map((node) => node.content)).toEqual(selected[field] ? [selected[field]] : []);
      }
      expect(mocks.sendSoapToSefaz.mock.calls[0][0].xmlPayload).not.toContain('<?xml');
      expect(state.document?.xml_nfe).toContain('<?xml');
    } finally {
      xml.dispose();
    }
  });

  it('bloqueia alteração de classificação introduzida pela assinatura antes do SOAP', async () => {
    const state = database();
    const itemFiscalSelections = { '1': displayed };
    mocks.signNfeXml.mockImplementation((xml: string) =>
      xml.replace('<NCM>94036000</NCM>', '<NCM>94034000</NCM>')
    );
    const result = await emitHmlTechnical(
      state.db,
      { ...command, itemFiscalSelections },
      { ...candidate, emissionRequest: { ...candidate.emissionRequest, itemFiscalSelections } },
      {}
    );
    expect(result.body).toMatchObject({ code: 'HML_XML_INVALID', sefazContacted: false });
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
    expect(
      state.calls.some((call) => call.name === 'reserve_hml_nfe_outbound_with_replacement')
    ).toBe(false);
  });
  it('blocks invalid CSRT configuration before numbering and returns only field names', async () => {
    vi.stubEnv('NFE_CSRT_ID', 'INVALID_TEST_AUT');
    const { db, rpc } = database();
    const result = await emitHmlTechnical(db, command, candidate, {});
    expect(result.body).toMatchObject({
      code: 'HML_CERTIFICATE_OR_CSRT_UNAVAILABLE',
      numberReserved: false,
      sefazContacted: false,
      configurationIssues: ['responsibleTechnician.csrtId'],
    });
    expect(JSON.stringify(result.body)).not.toContain('INVALID_TEST_AUT');
    expect(rpc).not.toHaveBeenCalled();
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('NFE_CERTIFICATE_BASE64', 'certificado-sintetico');
    vi.stubEnv('NFE_RESP_TECH_CNPJ', '12345678000195');
    vi.stubEnv('NFE_RESP_TECH_CONTACT', 'TECNICO HML');
    vi.stubEnv('NFE_RESP_TECH_EMAIL', 'hml@example.test');
    vi.stubEnv('NFE_RESP_TECH_PHONE', '41999999999');
    vi.stubEnv('NFE_CSRT_ID', '01');
    vi.stubEnv('NFE_CSRT_SECRET', '1234567890ABCDEF');
    mocks.extractCertificateAndKey.mockReturnValue({
      privateKeyPem: 'private',
      certPem: 'certificate',
      certDerBase64: 'cert-der',
    });
    mocks.signNfeXml.mockImplementation((xml: string) => xml);
  });
  afterEach(() => vi.unstubAllEnvs());

  it('reserva XML assinado antes do SOAP e grava autorização e item pela RPC', async () => {
    const state = database();
    mocks.sendSoapToSefaz.mockImplementation(async ({ xmlPayload }: { xmlPayload: string }) => {
      const key = xmlPayload.match(/Id="NFe(\d{44})"/)?.[1];
      return `<retEnviNFe><cStat>104</cStat><protNFe><infProt><chNFe>${key}</chNFe><cStat>100</cStat><xMotivo>Autorizado</xMotivo><nProt>141260000000001</nProt></infProt></protNFe></retEnviNFe>`;
    });
    const result = await emitHmlTechnical(state.db, command, candidate, {});
    expect(result.body).toMatchObject({
      success: true,
      documentId: 'doc-hml',
      environment: 2,
      protocolNumber: '141260000000001',
    });
    expect(state.calls.map((call) => call.name)).toEqual([
      'prepare_nfe_fiscal_snapshot',
      'reserve_hml_nfe_outbound_with_replacement',
      'persist_hml_nfe_result',
      'release_hml_nfe_attempt',
    ]);
    expect(state.calls[0].args).toMatchObject({
      p_modelo: '55',
      p_serie: '1',
      p_ambiente: 2,
    });
    expect(state.calls[0].args).not.toHaveProperty('p_requested_number');
    expect(state.calls[1].args.p_signed_xml).toContain(
      '<ICMSSN102><orig>0</orig><CSOSN>103</CSOSN>'
    );
    expect(state.calls[2].args).toMatchObject({
      p_status: 'homologada',
      p_protocol: '141260000000001',
    });
    expect((state.calls[2].args.p_items as unknown[]).length).toBe(1);
    expect(mocks.sendSoapToSefaz).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4',
      })
    );
  });

  it('faz consulta SOAP real somente leitura e confere a chave/protocolo autorizados persistidos', async () => {
    const accessKey = '4'.repeat(44);
    const document = {
      id: 'doc-hml',
      order_id: runId,
      numero_nfe: 701,
      serie: '1',
      chave_acesso: accessKey,
      modelo: '55',
      ambiente: 2,
      status: 'homologada',
      numero_protocolo: '141260000000099',
      fiscal_ruleset_version: 'HML_NORMAL_SALE_V1',
    };
    mocks.sendSoapToSefaz.mockResolvedValue(
      `<retConsSitNFe><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo><protNFe><infProt><chNFe>${accessKey}</chNFe><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo><nProt>141260000000099</nProt><dhRecbto>2026-09-30T15:00:00-03:00</dhRecbto></infProt></protNFe></retConsSitNFe>`
    );
    const result = await consultAuthorizedHmlTechnical(document);
    expect(result.body).toMatchObject({
      success: true,
      state: 'authorized',
      sefazConsulted: true,
      documentId: 'doc-hml',
      nfeNumber: 701,
      series: '1',
      cStat: '100',
      protocolNumber: document.numero_protocolo,
      responseHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(mocks.sendSoapToSefaz).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4',
        xmlPayload: expect.stringContaining(`<chNFe>${accessKey}</chNFe>`),
      })
    );
  });

  it('preserva a autorização original e exige reconciliação se a consulta não confirmar o protocolo', async () => {
    const accessKey = '4'.repeat(44);
    const document = {
      id: 'doc-hml',
      order_id: runId,
      numero_nfe: 701,
      serie: '1',
      chave_acesso: accessKey,
      modelo: '55',
      ambiente: 2,
      status: 'homologada',
      numero_protocolo: '141260000000099',
      fiscal_ruleset_version: 'HML_NORMAL_SALE_V1',
    };
    mocks.sendSoapToSefaz.mockResolvedValue(
      '<retConsSitNFe><cStat>217</cStat><xMotivo>Não consta</xMotivo></retConsSitNFe>'
    );
    const result = await consultAuthorizedHmlTechnical(document);
    expect(result).toMatchObject({
      status: 409,
      body: {
        success: false,
        pending: true,
        code: 'HML_AUTHORIZED_CONSULT_RECONCILIATION_REQUIRED',
        sefazConsulted: true,
      },
    });
    expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(1);
  });

  it('mantém a mesma tentativa pendente após timeout e não envia de novo', async () => {
    const state = database();
    mocks.sendSoapToSefaz.mockRejectedValue(new Error('timeout sintético'));
    const first = await emitHmlTechnical(state.db, command, candidate, {});
    expect(first.body).toMatchObject({
      code: 'HML_TRANSMISSION_UNCERTAIN',
      pending: true,
      documentId: 'doc-hml',
      diagnosticStage: 'sefaz-transmission',
      transportDiagnosticPersisted: true,
    });
    expect(state.document).toMatchObject({ status: 'pendente' });
    expect(state.document?.motivo_status).toContain('UNKNOWN_TRANSPORT_ERROR');
    expect(state.document?.motivo_status).toContain(String(first.body.diagnosticId));
    const second = await emitHmlTechnical(state.db, command, candidate, {});
    expect(second.body).toMatchObject({
      code: 'HML_RECONCILIATION_REQUIRED',
      pending: true,
      documentId: 'doc-hml',
      diagnosticStage: 'sefaz-consultation',
      transportDiagnosticPersisted: true,
    });
    expect(state.document?.motivo_status).toContain('Consulta HML inconclusiva por transporte');
    expect(state.document?.motivo_status).toContain(String(second.body.diagnosticId));
    expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(2); // autorização + consulta, sem retransmissão
    expect(mocks.sendSoapToSefaz.mock.calls[1][0].url).toContain('NFeConsultaProtocolo4');
  });

  it('não reserva nem transmite em produção', async () => {
    const state = database();
    const result = await emitHmlTechnical(
      state.db,
      { ...command, environment: 1 },
      { ...candidate, emissionRequest: { ...candidate.emissionRequest, environment: 1 } },
      {}
    );
    expect(result.body.code).toBe('PRODUCTION_FISCAL_RULESET_REQUIRED');
    expect(state.calls).toHaveLength(0);
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });

  it('só retransmite a chave e XML originais depois de consulta 217', async () => {
    const state = database();
    mocks.sendSoapToSefaz
      .mockRejectedValueOnce(new Error('timeout sintético'))
      .mockResolvedValueOnce(
        '<retConsSitNFe><cStat>217</cStat><xMotivo>Não consta</xMotivo></retConsSitNFe>'
      )
      .mockImplementationOnce(async ({ xmlPayload }: { xmlPayload: string }) => {
        const key = xmlPayload.match(/Id="NFe(\d{44})"/)?.[1];
        return `<retEnviNFe><cStat>104</cStat><protNFe><infProt><chNFe>${key}</chNFe><cStat>100</cStat><xMotivo>Autorizado</xMotivo><nProt>141260000000002</nProt></infProt></protNFe></retEnviNFe>`;
      });
    await emitHmlTechnical(state.db, command, candidate, {});
    const original = String(state.document?.xml_nfe || '');
    const recovered = await retryHmlTechnical(state.db, 'doc-hml');
    expect(recovered.body).toMatchObject({
      success: true,
      protocolNumber: '141260000000002',
      accessKey: state.document?.chave_acesso,
    });
    expect(mocks.sendSoapToSefaz.mock.calls[1][0].url).toContain('NFeConsultaProtocolo4');
    expect(mocks.sendSoapToSefaz.mock.calls[2][0].xmlPayload).toContain(embeddedNfeXml(original));
    expect(state.calls.map((call) => call.name)).toContain('reactivate_hml_nfe_retry');
    expect(state.calls.filter((call) => call.name === 'prepare_nfe_fiscal_snapshot')).toHaveLength(
      1
    );
  });

  it('permite retransmitir o mesmo XML após uma consulta 217 já persistida', async () => {
    const state = database();
    mocks.sendSoapToSefaz.mockRejectedValueOnce(new Error('timeout sintético'));
    await emitHmlTechnical(state.db, command, candidate, {});
    const originalXml = String(state.document?.xml_nfe || '');
    const originalKey = String(state.document?.chave_acesso || '');

    mocks.sendSoapToSefaz.mockResolvedValueOnce(
      '<retConsSitNFe><cStat>217</cStat><xMotivo>Não consta</xMotivo></retConsSitNFe>'
    );
    const reconciled = await retryHmlTechnical(state.db, 'doc-hml', false);
    expect(reconciled.body).toMatchObject({
      code: 'HML_CONFIRMED_NOT_FOUND',
      pending: false,
      state: 'not_found',
      cStat: '217',
      xMotivo: 'Não consta',
      orderId: runId,
      model: '55',
      environment: 2,
      nfeNumber: state.document?.numero_nfe,
      series: state.document?.serie,
      accessKey: originalKey,
    });
    expect(state.document?.status).toBe('erro');
    expect(state.document?.xml_protocolo).toContain('<cStat>217</cStat>');

    mocks.sendSoapToSefaz
      .mockResolvedValueOnce(
        '<retConsSitNFe><cStat>217</cStat><xMotivo>Não consta</xMotivo></retConsSitNFe>'
      )
      .mockResolvedValueOnce(
        '<retEnviNFe><cStat>105</cStat><xMotivo>Em processamento</xMotivo></retEnviNFe>'
      );
    const retried = await retryHmlTechnical(state.db, 'doc-hml');

    expect(retried.body).toMatchObject({
      success: false,
      pending: true,
      cStat: '105',
      accessKey: originalKey,
    });
    expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(4);
    expect(mocks.sendSoapToSefaz.mock.calls[2][0].url).toContain('NFeConsultaProtocolo4');
    expect(mocks.sendSoapToSefaz.mock.calls[3][0].xmlPayload).toContain(
      embeddedNfeXml(originalXml)
    );
    expect(state.document?.chave_acesso).toBe(originalKey);
    expect(state.document?.xml_nfe).toBe(originalXml);
  });

  it.each([true, false])(
    'exige nova emissão para NFC-e vencida após 217 (retransmissão=%s)',
    async (allowRetransmission) => {
      const state = database();
      mocks.sendSoapToSefaz
        .mockRejectedValueOnce(Object.assign(new Error('timeout sintético'), { code: 'ETIMEDOUT' }))
        .mockResolvedValueOnce(
          '<retConsSitNFe><cStat>217</cStat><xMotivo>Não consta</xMotivo></retConsSitNFe>'
        );
      await emitHmlTechnical(state.db, command, candidate, {});
      expect(state.document).not.toBeNull();
      state.document!.modelo = '65';
      const originalXml = state.document!.xml_nfe;

      const result = await retryHmlTechnical(state.db, 'doc-hml', allowRetransmission);

      expect(result.body).toMatchObject({
        code: 'HML_NEW_EMISSION_REQUIRED',
        pending: false,
        safeNewEmission: true,
        cStat: '217',
        model: '65',
      });
      expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(2);
      expect(state.document?.xml_nfe).toBe(originalXml);
      expect(state.document?.numero_nfe).toBe(700);
    }
  );

  it('impede consulta e retry paralelos enquanto o envio original está em andamento', async () => {
    const state = database();
    let resolveResponse!: (xml: string) => void;
    const response = new Promise<string>((resolve) => {
      resolveResponse = resolve;
    });
    mocks.sendSoapToSefaz.mockReturnValueOnce(response);
    const first = emitHmlTechnical(state.db, command, candidate, {});
    await vi.waitFor(() => expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(1));
    const repeated = await emitHmlTechnical(state.db, command, candidate, {});
    const retry = await retryHmlTechnical(state.db, 'doc-hml');
    expect(repeated.body.code).toBe('HML_ATTEMPT_IN_PROGRESS');
    expect(retry.body.code).toBe('HML_ATTEMPT_IN_PROGRESS');
    expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(1);
    expect(state.document?.attemptToken).toBeTruthy();
    resolveResponse('<retEnviNFe><cStat>105</cStat></retEnviNFe>');
    await first;
    expect(state.document?.attemptToken).toBeNull();
    expect(state.calls.filter((call) => call.name === 'prepare_nfe_fiscal_snapshot')).toHaveLength(
      1
    );
  });

  it('reconcilia autorização após falha na persistência sem retransmitir nem reservar número', async () => {
    const state = database();
    const rpc = state.rpc.getMockImplementation()!;
    let failPersistence = true;
    state.rpc.mockImplementation(async (name, args) => {
      if (name === 'persist_hml_nfe_result' && failPersistence) {
        failPersistence = false;
        return { data: null, error: new Error('falha sintética') };
      }
      return rpc(name, args);
    });
    mocks.sendSoapToSefaz.mockImplementation(
      async () =>
        `<retConsSitNFe><cStat>100</cStat><protNFe><infProt><chNFe>${state.document?.chave_acesso}</chNFe><cStat>100</cStat><nProt>141260000000003</nProt></infProt></protNFe></retConsSitNFe>`
    );
    const first = await emitHmlTechnical(state.db, command, candidate, {});
    expect(first.body).toMatchObject({ code: 'HML_RESULT_PERSIST_FAILED', pending: true });
    expect(state.document?.status).toBe('processando');
    const recovered = await retryHmlTechnical(state.db, 'doc-hml');
    expect(recovered.body).toMatchObject({ success: true, protocolNumber: '141260000000003' });
    expect(state.document?.status).toBe('homologada');
    expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(2);
    expect(mocks.sendSoapToSefaz.mock.calls[1][0].url).toContain('NFeConsultaProtocolo4');
    expect(state.calls.filter((call) => call.name === 'prepare_nfe_fiscal_snapshot')).toHaveLength(
      1
    );
  });

  it('devolve a autorização persistida mesmo após mudança no pedido e retirada do certificado', async () => {
    const state = database();
    mocks.sendSoapToSefaz.mockImplementation(
      async () =>
        `<retEnviNFe><cStat>104</cStat><protNFe><infProt><chNFe>${state.document?.chave_acesso}</chNFe><cStat>100</cStat><nProt>141260000000004</nProt></infProt></protNFe></retEnviNFe>`
    );
    await emitHmlTechnical(state.db, command, candidate, {});
    vi.stubEnv('NFE_CERTIFICATE_BASE64', '');
    const recovered = await emitHmlTechnical(
      state.db,
      command,
      { ...candidate, order: { ...candidate.order, data: {} } },
      {}
    );
    expect(recovered.body).toMatchObject({ success: true, protocolNumber: '141260000000004' });
    expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(1);
    expect(state.calls.filter((call) => call.name === 'prepare_nfe_fiscal_snapshot')).toHaveLength(
      1
    );
  });

  it('não aceita protocolo de outra chave mesmo se a chave correta estiver fora do protocolo', async () => {
    const state = database();
    mocks.sendSoapToSefaz.mockImplementation(
      async () =>
        `<retEnviNFe><cStat>104</cStat><chNFe>${state.document?.chave_acesso}</chNFe><protNFe><infProt><chNFe>${'9'.repeat(44)}</chNFe><cStat>100</cStat><nProt>141260000000005</nProt></infProt></protNFe></retEnviNFe>`
    );
    const result = await emitHmlTechnical(state.db, command, candidate, {});
    expect(result.body).toMatchObject({ success: false, pending: true });
    expect(state.document?.status).toBe('pendente');
    expect(
      state.calls.find((call) => call.name === 'persist_hml_nfe_result')?.args.p_items
    ).toEqual([]);
  });

  it('falha sem reservar ou transmitir se não puder ler a tentativa anterior', async () => {
    const state = database();
    state.from.mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: new Error('falha de leitura') }),
        }),
      }),
    }));
    const result = await emitHmlTechnical(state.db, command, candidate, {});
    expect(result.body.code).toBe('HML_ATTEMPT_READ_FAILED');
    expect(state.calls).toHaveLength(0);
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });

  it('preserva a tentativa pendente quando o XSD rejeita o XML de retry', async () => {
    const state = database();
    mocks.sendSoapToSefaz.mockRejectedValueOnce(new Error('timeout'));
    await emitHmlTechnical(state.db, command, candidate, {});
    mocks.sendSoapToSefaz.mockResolvedValueOnce(
      '<retConsSitNFe><cStat>217</cStat></retConsSitNFe>'
    );
    mocks.validateNfeAgainstOfficialSchema.mockRejectedValueOnce(new Error('XML inválido'));
    const result = await retryHmlTechnical(state.db, 'doc-hml');
    expect(result.body.code).toBe('HML_RETRY_XML_INVALID');
    expect(state.calls.some((call) => call.name === 'reactivate_hml_nfe_retry')).toBe(false);
    expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(2);
    expect(state.document?.attemptToken).toBeNull();
  });

  it('mantém a trava até terminar a retransmissão e bloqueia outro retry', async () => {
    const state = database();
    let finishRetry!: (xml: string) => void;
    mocks.sendSoapToSefaz.mockRejectedValueOnce(new Error('timeout'));
    await emitHmlTechnical(state.db, command, candidate, {});
    mocks.sendSoapToSefaz
      .mockResolvedValueOnce('<retConsSitNFe><cStat>217</cStat></retConsSitNFe>')
      .mockReturnValueOnce(
        new Promise<string>((resolve) => {
          finishRetry = resolve;
        })
      );
    const retry = retryHmlTechnical(state.db, 'doc-hml');
    await vi.waitFor(() => expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(3));
    const duplicate = await retryHmlTechnical(state.db, 'doc-hml');
    expect(duplicate.body.code).toBe('HML_ATTEMPT_IN_PROGRESS');
    expect(state.document?.attemptToken).toBeTruthy();
    finishRetry('<retEnviNFe><cStat>105</cStat></retEnviNFe>');
    await retry;
    expect(state.document?.attemptToken).toBeNull();
    expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(3);
  });

  it('não envia se a reserva do XML assinado falhar', async () => {
    const state = database();
    const rpc = state.rpc.getMockImplementation()!;
    state.rpc.mockImplementation(async (name, args) =>
      name === 'reserve_hml_nfe_outbound_with_replacement'
        ? { data: null, error: new Error('falha sintética') }
        : rpc(name, args)
    );
    const result = await emitHmlTechnical(state.db, command, candidate, {});
    expect(result.body.code).toBe('HML_ACTIVE_ATTEMPT_OR_PERSISTENCE_FAILED');
    expect(state.document).toBeNull();
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });

  it('mantém reconciliação pendente se a chamada perder a trava antes de persistir', async () => {
    const state = database();
    mocks.sendSoapToSefaz.mockImplementation(async () => {
      state.document!.attemptToken = 'outra-chamada';
      return `<retEnviNFe><cStat>104</cStat><protNFe><infProt><chNFe>${state.document?.chave_acesso}</chNFe><cStat>100</cStat><nProt>141260000000006</nProt></infProt></protNFe></retEnviNFe>`;
    });
    const result = await emitHmlTechnical(state.db, command, candidate, {});
    expect(result.body).toMatchObject({ code: 'HML_RESULT_PERSIST_FAILED', pending: true });
    expect(state.document?.status).toBe('processando');
    expect(state.document?.attemptToken).toBe('outra-chamada');
  });

  it('persiste escolha manual e a utiliza no XML sem aceitar alteração da tentativa existente', async () => {
    const state = database();
    const selected = { ...command, itemCsosnOverrides: { '1': '102' } };
    const facts = {
      ...candidate,
      emissionRequest: {
        ...candidate.emissionRequest,
        itemCsosnOverrides: selected.itemCsosnOverrides,
      },
    };
    mocks.sendSoapToSefaz.mockResolvedValue('<retEnviNFe><cStat>105</cStat></retEnviNFe>');
    await emitHmlTechnical(state.db, selected, facts, {});
    expect(
      state.calls.find((call) => call.name === 'prepare_nfe_fiscal_snapshot')?.args
    ).toMatchObject({ p_item_csosn_overrides: { '1': '102' } });
    expect(state.document?.xml_nfe).toContain('<CSOSN>102</CSOSN>');
    const changed = await emitHmlTechnical(
      state.db,
      { ...command, itemCsosnOverrides: { '1': '103' } },
      candidate,
      {}
    );
    expect(changed.body.code).toBe('HML_IDEMPOTENCY_MISMATCH');
    expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(1);
  });

  it('retorna 409 apontando o NCM divergente e libera abandono somente sem resposta SEFAZ', async () => {
    const state = database();
    const snapshotSelections = {
      '1': { ncm: '94036000', cfop: '5102', origem: '0', cest: '', csosn: '103' },
    };
    const currentSelections = {
      '1': { ncm: '94035000', cfop: '5102', origem: '0', cest: '', csosn: '103' },
    };
    state.seedSnapshotSelections(snapshotSelections);
    state.seedDocument({
      id: 'doc-hml',
      order_id: runId,
      emission_request_id: requestId,
      ambiente: 2,
      modelo: '65',
      status: 'pendente',
      document_type: 'outbound',
      fiscal_ruleset_version: 'HML_NORMAL_SALE_V2',
      fiscal_snapshot_id: 'snapshot-hml',
      hml_attempt_token: null,
      hml_attempt_expires_at: null,
      numero_protocolo: null,
      xml_protocolo: null,
      hml_response_history: [
        {
          reason: `Resposta da transmissão HML desconhecida: ${JSON.stringify({
            emissionRequestId: requestId,
            code: 'SELF_SIGNED_CERT_IN_CHAIN',
            category: 'TLS_FAILURE',
            phase: 'tls',
            environment: 2,
            model: '65',
            hostname: 'homologacao.nfce.sefa.pr.gov.br',
            endpoint: 'https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeAutorizacao4',
          })}`,
          responseXml: '',
          protocol: null,
        },
      ],
      supersedes_document_id: null,
    });

    const result = await recoverHmlTechnical(state.db, {
      ...command,
      itemFiscalSelections: currentSelections as any,
    });

    expect(result?.status).toBe(409);
    expect(result?.body).toMatchObject({
      code: 'HML_IDEMPOTENCY_MISMATCH',
      error: expect.stringContaining('dados fiscais foram alterados'),
      documentId: 'doc-hml',
      hmlCanAbandonTlsFailure: true,
      fiscalMismatchFields: [
        { field: 'Item 1 · NCM', snapshotValue: '94036000', currentValue: '94035000' },
      ],
    });
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });

  it('impede que o emissionRequestId formalmente abandonado reenvie o XML antigo', async () => {
    const state = database();
    state.seedDocument({
      id: 'doc-hml',
      order_id: runId,
      emission_request_id: requestId,
      ambiente: 2,
      modelo: '65',
      status: 'abandoned',
      document_type: 'outbound',
      fiscal_ruleset_version: 'HML_NORMAL_SALE_V2',
      fiscal_snapshot_id: 'snapshot-hml',
      hml_attempt_token: null,
      hml_attempt_expires_at: null,
      numero_protocolo: null,
      xml_protocolo: null,
      hml_response_history: [
        {
          abandonmentCode: 'FISCAL_SNAPSHOT_CHANGED_AFTER_PRE_TRANSMISSION_FAILURE',
          abandonedRequestId: requestId,
        },
      ],
      supersedes_document_id: null,
    });

    const result = await recoverHmlTechnical(state.db, command);

    expect(result?.status).toBe(409);
    expect(result?.body.code).toBe('HML_ATTEMPT_FORMALLY_ABANDONED');
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });

  it('bloqueia escolha que exige tributação específica antes da reserva e transmissão', async () => {
    const state = database();
    const selected = { ...command, itemCsosnOverrides: { '1': '500' } };
    const result = await emitHmlTechnical(
      state.db,
      selected,
      {
        ...candidate,
        emissionRequest: {
          ...candidate.emissionRequest,
          itemCsosnOverrides: selected.itemCsosnOverrides,
        },
      },
      {}
    );
    expect(result.body.code).toBe('HML_FISCAL_DOCUMENT_INCOMPLETE');
    expect(state.calls).toHaveLength(0);
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });

  it.each(['SC', 'SP', 'RS'])('bloqueia venda PR→%s sem regra APPROVED antes da RPC de snapshot numerado', async (destinationUf) => {
    const interstateOrderId = 'f119b598-fcaa-4212-a48f-76149b2a3c82';
    const interstateRequestId = '5a88242a-a67f-4e6b-9fc9-dd60d13e9c10';
    const selected = {
      '1': { ncm: '94035000', cfop: '6102', origem: '0', cest: '', csosn: '102' },
    };
    const interstateCandidate: FiscalSnapshotCandidate = {
      ...candidate,
      order: {
        ...candidate.order,
        id: interstateOrderId,
        type: 'sale',
        status: 'fulfilled',
        deleted: false,
        data: {
          shipping: {
            deliveryMethod: 'delivery',
            useCustomerAddress: true,
            deliveryAddress: { city: 'Município teste', state: destinationUf, zipCode: '89201000' },
            value: 0,
          },
          customerData: { id: 'customer-sc-1' },
          items: [
            {
              description: 'Mesa teste',
              productId: null,
              quantity: 1,
              unitPrice: 1200,
              unitDiscount: 0,
              discountType: 'fixed',
              itemType: 'product',
              fiscal: { ncm: '94035000', cfop: '5102' },
            },
          ],
          payments: [{ method: 'pix', amount: 1200 }],
        },
      },
      emissionRequest: {
        id: interstateRequestId,
        environment: 2,
        finalConsumer: true,
        recipientTaxId: '12345678000195',
        itemFiscalSelections: selected,
      },
    };
    const decisionData = {
      scope: { model: '55', operation: 'normal_sale', issuerCrt: '1' },
      pis: { cst: '99', base: 0, rate: 0, value: 0 },
      cofins: { cst: '99', base: 0, rate: 0, value: 0 },
      confirmedAt: '2026-09-01T00:00:00Z',
      confirmedBy: 'TEST_AUT_MATRIX',
      productionApproved: false,
    };
    const from = vi.fn((table: string) => {
      const filters: Record<string, unknown> = {};
      const query: any = {
        select: () => query,
        eq: (field: string, value: unknown) => {
          filters[field] = value;
          return query;
        },
        maybeSingle: async () => {
          if (table === 'nfe_documents') return { data: null, error: null };
          if (table === 'people')
            return {
              data: {
                id: 'customer-sc-1',
                full_name: 'Cliente teste SC',
                cpf_cnpj: '12345678000195',
                address: { city: 'Município teste', state: destinationUf, zipCode: '89201000' },
                rg_ie: '251040852',
                person_type_pf_pj: 'PJ',
                deleted: false,
              },
              error: null,
            };
          if (table === 'settings')
            return {
              data: {
                data:
                  filters.id === HML_CSOSN_SETTINGS_ID
                    ? initialHmlCsosnConfiguration()
                    : decisionData,
              },
              error: null,
            };
          return { data: null, error: null };
        },
        in: () =>
          table === 'ncms'
            ? Promise.resolve({
                data: [{ code: '94035000', active: true, is_active: true, start_date: null, end_date: null }],
                error: null,
              })
            : query,
        order: () => query,
        limit: () => query,
      };
      return query;
    });
    const rpc = vi.fn(async () => ({ data: null, error: new Error('RPC não esperada') }));

    const result = await emitHmlTechnical(
      { from, rpc } as any,
      {
        orderId: interstateOrderId,
        environment: 2,
        emissionRequestId: interstateRequestId,
        itemFiscalSelections: selected,
      } as any,
      interstateCandidate,
      {}
    );

    expect(result.status).toBe(422);
    expect(result.body).toMatchObject({
      code: 'HML_INTERSTATE_MATRIX_NOT_APPROVED',
      numberReserved: false,
      sefazContacted: false,
    });
    expect(rpc).not.toHaveBeenCalled();
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });
});
