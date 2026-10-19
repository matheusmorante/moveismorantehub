import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateNfeAccessKey } from '../nfeAccessKey';
import { buildReturnProductXml } from '../fiscalOperationReview';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  authorizeFiscalOperator: vi.fn(),
  validateNfeAgainstOfficialSchema: vi.fn(),
  validateUnsignedNfeStructure: vi.fn(),
  extractCertificateAndKey: vi.fn(),
  signNfeXml: vi.fn(),
  sendSoapToSefaz: vi.fn(),
  buildReviewedFiscalOperationXml: vi.fn(),
  parseAuthorizedInvoiceLines: vi.fn(),
  assertNfeSignature: vi.fn(),
}));

vi.mock('../../../../../../node_modules/@supabase/supabase-js/dist/index.mjs', () => ({
  createClient: mocks.createClient,
}));
vi.mock('../../../../../../api/nfe/fiscalAuthorization', () => ({
  authorizeFiscalOperator: mocks.authorizeFiscalOperator,
}));
vi.mock('../../../../../../api/nfe/schemaValidator', () => ({
  validateNfeAgainstOfficialSchema: mocks.validateNfeAgainstOfficialSchema,
  validateUnsignedNfeStructure: mocks.validateUnsignedNfeStructure,
}));
vi.mock('../../../../../../api/nfe/nfeSigner', () => ({
  extractCertificateAndKey: mocks.extractCertificateAndKey,
  signNfeXml: mocks.signNfeXml,
}));
vi.mock('../../../../../../api/nfe/fiscalXmlAudit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../../../api/nfe/fiscalXmlAudit')>()),
  assertNfeSignature: mocks.assertNfeSignature,
}));
vi.mock('../../../../../../api/nfe/sefazClient', () => ({
  sendSoapToSefaz: mocks.sendSoapToSefaz,
}));
vi.mock('../fiscalOperationXml', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../fiscalOperationXml')>()),
  buildReviewedFiscalOperationXml: mocks.buildReviewedFiscalOperationXml,
}));
vi.mock('../invoiceLineSnapshot', () => ({
  parseAuthorizedInvoiceLines: mocks.parseAuthorizedInvoiceLines,
}));

const sourceKey = generateNfeAccessKey({
  ufCode: '41',
  yearMonth: '2609',
  cnpj: '44512248000107',
  model: '55',
  series: '1',
  number: 699,
  emissionType: '1',
  randomCode: '87654321',
}).accessKey;
const reviewedProduct =
  '<prod><cProd>SKU-1</cProd><xProd>Cadeira</xProd><NCM>94017900</NCM><CFOP>1202</CFOP><qCom>1.0000</qCom><qTrib>1.0000</qTrib><vUnCom>100.0000</vUnCom><vProd>100.00</vProd></prod>';
const reviewedTaxes =
  '<imposto><ICMS><ICMSSN102><orig>0</orig><CSOSN>102</CSOSN></ICMSSN102></ICMS></imposto>';
const sourceDestination =
  '<dest><CPF>12345678901</CPF><xNome>Cliente Teste</xNome><enderDest><UF>PR</UF></enderDest><indIEDest>9</indIEDest></dest>';
const originalProduct =
  '<prod><cProd>SKU-1</cProd><xProd>Cadeira</xProd><NCM>94017900</NCM><CFOP>5102</CFOP><qCom>2.0000</qCom><qTrib>2.0000</qTrib><vUnCom>100.0000</vUnCom><vProd>200.00</vProd></prod>';
const authReply =
  '<retEnviNFe><cStat>104</cStat><xMotivo>Lote processado</xMotivo><protNFe><infProt><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo><nProt>141260000123456</nProt><dhRecbto>2026-09-26T12:00:00-03:00</dhRecbto></infProt></protNFe></retEnviNFe>';
function authorizationReplyFromRequest({ xmlPayload }: { xmlPayload: string }) {
  const key = xmlPayload.match(/Id="NFe([A-Z0-9]{44})"/)?.[1];
  const environment = xmlPayload.match(/<tpAmb>([12])<\/tpAmb>/)?.[1];
  if (!key || !environment) throw new Error('Transmissão de teste sem identidade');
  return authReply
    .replace('<retEnviNFe>', `<retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe"><tpAmb>${environment}</tpAmb>`)
    .replace('<infProt>', `<infProt><tpAmb>${environment}</tpAmb><chNFe>${key}</chNFe>`);
}
const identifiedNotFoundReply = (key: string, environment = 1) =>
  `<retConsSitNFe xmlns="http://www.portalfiscal.inf.br/nfe"><tpAmb>${environment}</tpAmb><chNFe>${key}</chNFe><cStat>217</cStat><xMotivo>NF-e não consta na base</xMotivo></retConsSitNFe>`;
const uncertainReply =
  '<retConsSitNFe><cStat>105</cStat><xMotivo>Lote em processamento</xMotivo></retConsSitNFe>';

function createDatabase(kind: 'return' | 'estorno' = 'return') {
  const estornoProduct = buildReturnProductXml({
    originalProductXml: originalProduct,
    quantity: 2,
    originalQuantity: 2,
    grossValue: 200,
    discountValue: 0,
    cfop: '1949',
  });
  const state = {
    draft: {
      id: '11111111-1111-4111-8111-111111111111',
      operation_kind: kind,
      finalidade: kind === 'estorno' ? 3 : 4,
      original_document_id: '22222222-2222-4222-8222-222222222222',
      original_access_key: sourceKey,
      return_order_id: kind === 'estorno' ? null : '33333333-3333-4333-8333-333333333333',
      environment: 1,
      status: 'ready',
      reason: kind === 'estorno' ? 'Operação não realizada e prazo legal expirado.' : null,
      nature_of_operation: kind === 'estorno' ? 'Nota Fiscal de Estorno' : 'Devolução de mercadoria',
      review_data: {
        nature_of_operation: kind === 'estorno' ? 'Nota Fiscal de Estorno' : 'Devolução de mercadoria',
        recipient_xml: sourceDestination,
        totals_xml: `<total><ICMSTot><vProd>${kind === 'estorno' ? '200.00' : '100.00'}</vProd><vDesc>0.00</vDesc><vNF>${kind === 'estorno' ? '200.00' : '100.00'}</vNF></ICMSTot></total>`,
        transport_xml: '<transp><modFrete>4</modFrete></transp>',
        payment_xml: '<pag><detPag><tPag>90</tPag><vPag>0.00</vPag></detPag></pag>',
        reason: kind === 'estorno' ? 'Operação não realizada e prazo legal expirado.' : '',
        item_taxes_confirmed: true,
        totals_confirmed: true,
        apportionment_review_confirmed: kind === 'estorno',
        period_adjustment_text:
          kind === 'estorno'
            ? 'Diferenças e acréscimos fiscais revisados pelo responsável.'
            : '',
      },
      reviewed_at: '2026-09-26T12:00:00.000Z',
      updated_at: '2026-09-26T12:00:00.000Z',
      transmitted_at: null as string | null,
      access_key: null as string | null,
      signed_xml: null as string | null,
      document_id: null as string | null,
      sefaz_response_xml: null as string | null,
    },
    source: {
      id: '22222222-2222-4222-8222-222222222222',
      order_id: '44444444-4444-4444-8444-444444444444',
      document_type: 'outbound',
      status: 'autorizada',
      ambiente: 1,
      modelo: '55',
      chave_acesso: sourceKey,
      numero_nfe: 699,
      serie: '1',
      numero_protocolo: '141260000654321',
      xml_protocolo: `<protNFe><infProt><tpAmb>1</tpAmb><cStat>100</cStat><chNFe>${sourceKey}</chNFe><nProt>141260000654321</nProt><dhRecbto>2026-09-26T12:00:00-03:00</dhRecbto></infProt></protNFe>`,
      xml_nfe: `<NFe><infNFe Id="NFe${sourceKey}"><ide><tpAmb>1</tpAmb><mod>55</mod><serie>1</serie><nNF>699</nNF><tpNF>1</tpNF><idDest>1</idDest><indFinal>1</indFinal></ide><emit><CNPJ>44512248000107</CNPJ><CRT>1</CRT></emit>${sourceDestination}</infNFe></NFe>`,
    },
    lines: [
      {
        id: '55555555-5555-4555-8555-555555555555',
        original_document_item_id: '66666666-6666-4666-8666-666666666666',
        fiscal_item_number: 1,
        quantity: kind === 'estorno' ? 2 : 1,
        gross_value: kind === 'estorno' ? 200 : 100,
        discount_value: 0,
        reviewed_cfop: kind === 'estorno' ? '1949' : '1202',
        reviewed_product_xml: kind === 'estorno' ? estornoProduct : reviewedProduct,
        reviewed_taxes_xml: reviewedTaxes,
      },
    ],
    originalLines: [
      {
        id: '66666666-6666-4666-8666-666666666666',
        document_id: '22222222-2222-4222-8222-222222222222',
        item_number: 2,
        billed_quantity: 2,
        gross_value: 200,
        discount_value: 0,
        product_code: 'SKU-1',
        description: 'Cadeira',
        unit_value: 100,
        product_xml: originalProduct,
        taxes_xml: reviewedTaxes,
      },
    ],
    settings: {
      data: {
        companyCnpj: '44512248000107',
        companyUF: 'PR',
        companyCRT: '1',
        companyName: 'EMPRESA TESTE UNITÁRIO',
        companyIE: '1234567850',
        companyLogradouro: 'RUA TESTE',
        companyNumero: '10',
        companyBairro: 'CENTRO',
        companyCMun: '4105805',
        companyXMun: 'COLOMBO',
        companyCEP: '83410270',
        nfeSerie: '1',
        nfeNextNumber: 700,
        certificateBase64: 'mock-pfx',
        certificatePassword: 'mock-password',
      },
    },
    profile: { role: 'seller', roles: ['seller'] },
    returnOrder: {
      id: '33333333-3333-4333-8333-333333333333',
      order_index: 123,
      order_type: 'return',
      status: 'fulfilled',
      deleted: false,
      linked_order_id: '44444444-4444-4444-8444-444444444444',
      order_data: { returnMethod: 'store_delivery' } as { returnMethod?: string },
    },
    saleOrder: {
      id: '44444444-4444-4444-8444-444444444444',
      status: 'cancelled',
      delivery_status: '',
      delivery_method: 'delivery',
      order_data: {},
    },
    returnAllocations: [
      {
        id: '88888888-8888-4888-8888-888888888888',
        return_order_id: '33333333-3333-4333-8333-333333333333',
        return_item_index: 0,
        original_document_id: '22222222-2222-4222-8222-222222222222',
        original_item_number: 2,
        quantity: 1,
        fiscal_return_document_id: null,
      },
    ],
    draftAllocationLinks: [
      {
        draft_line_id: '55555555-5555-4555-8555-555555555555',
        allocation_id: '88888888-8888-4888-8888-888888888888',
      },
    ],
    rpcCalls: [] as Array<{ name: string; args: Record<string, unknown> }>,
    failStart: false,
    loseStartResponse: false,
  };

  const from = (table: string) => {
    let patch: Record<string, unknown> | null = null;
    let idFilter: string | null = null;
    let statusFilter: string | null = null;
    let statusIn: string[] | null = null;
    let versionFilter: string | null = null;
    const resultForTable = () =>
      table === 'nfe_operation_drafts'
        ? state.draft
        : table === 'nfe_documents'
          ? state.source
          : table === 'nfe_operation_draft_lines'
            ? state.lines
            : table === 'nfe_document_items'
              ? state.originalLines
              : table === 'settings'
                ? state.settings
        : table === 'profiles'
                  ? state.profile
                  : table === 'orders'
                    ? kind === 'estorno'
                      ? state.saleOrder
                      : state.returnOrder
                    : table === 'nfe_return_item_allocations'
                      ? state.returnAllocations
                      : table === 'nfe_operation_draft_allocations'
                        ? state.draftAllocationLinks
                        : null;
    const queryResult = () => {
      if (!patch) return { data: structuredClone(resultForTable()), error: null };
      if (
        table !== 'nfe_operation_drafts' ||
        idFilter !== state.draft.id ||
        (statusFilter && state.draft.status !== statusFilter) ||
        (versionFilter && state.draft.updated_at !== versionFilter) ||
        (statusIn && !statusIn.includes(state.draft.status))
      )
        return { data: null, error: null };
      if (patch.transmitted_at && !patch.status && state.failStart)
        return { data: null, error: { message: 'Início não confirmado' } };
      Object.assign(state.draft, patch);
      if (patch.transmitted_at && !patch.status && state.loseStartResponse) throw new Error('Resposta do início perdida');
      return { data: { id: state.draft.id, updated_at: state.draft.updated_at }, error: null };
    };
    const builder: any = {
      select: () => builder,
      update: (value: Record<string, unknown>) => {
        patch = value;
        return builder;
      },
      eq: (column: string, value: string) => {
        if (column === 'id') idFilter = value;
        if (column === 'status') statusFilter = value;
        if (column === 'updated_at') versionFilter = value;
        return builder;
      },
      in: (column: string, values: string[]) => {
        if (column === 'status') statusIn = values;
        return builder;
      },
      is: () => builder,
      order: () => builder,
      maybeSingle: async () => queryResult(),
      then: (resolve: (value: unknown) => void, reject: (error: unknown) => void) => {
        return Promise.resolve(queryResult()).then(resolve, reject);
      },
    };
    return builder;
  };

  const db = {
    auth: {
      getUser: async () => ({
        data: { user: { id: '77777777-7777-4777-8777-777777777777' } },
        error: null,
      }),
    },
    from,
    rpc: async (name: string, args: Record<string, unknown>) => {
      state.rpcCalls.push({ name, args });
      if (name === 'peek_nfe_outbound_number') return { data: 701, error: null };
      if (name === 'prepare_nfe_operation_attempt') {
        if (state.draft.status !== 'ready') return {
          data: { created: false, draftId: state.draft.id, status: state.draft.status, accessKey: state.draft.access_key }, error: null,
        };
        Object.assign(state.draft, { status: 'transmitting', access_key: args.p_access_key,
          signed_xml: args.p_signed_xml, transmitted_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        return { data: { created: true, draftId: state.draft.id, status: 'transmitting',
          accessKey: args.p_access_key, number: Number(String(args.p_access_key).slice(25, 34)), updatedAt: state.draft.updated_at }, error: null };
      }
      if (name === 'persist_authorized_nfe_operation_draft') {
        state.draft.status = 'authorized';
        state.draft.document_id = String(args.p_document_id);
        return { data: args.p_document_id, error: null };
      }
      return { data: null, error: { message: 'RPC inesperada' } };
    },
  };
  return { db, state };
}

function createNfceEstornoDatabase() {
  const result = createDatabase('estorno');
  const nfceKey = generateNfeAccessKey({
    ufCode: '41',
    yearMonth: '2609',
    cnpj: '44512248000107',
    model: '65',
    series: '1',
    number: 699,
    emissionType: '1',
    randomCode: '87654321',
  }).accessKey;
  result.state.draft.original_access_key = nfceKey;
  result.state.source.modelo = '65';
  result.state.source.chave_acesso = nfceKey;
  result.state.source.xml_protocolo = result.state.source.xml_protocolo.replace(sourceKey, nfceKey);
  result.state.source.xml_nfe = result.state.source.xml_nfe
    .replace('NFe' + sourceKey, 'NFe' + nfceKey)
    .replace(sourceKey, nfceKey)
    .replace('<mod>55</mod>', '<mod>65</mod>');
  return result;
}

function parseSyntheticOperationLines(xml: string) {
  return [...xml.matchAll(/<det\s+nItem="(\d+)">([\s\S]*?)<\/det>/g)].map(
    ([, itemNumber, detail]) => {
      const productXml = detail.match(/<prod\b[\s\S]*?<\/prod>/)?.[0] || '';
      const taxesXml = detail.match(/<imposto\b[\s\S]*?<\/imposto>/)?.[0] || '';
      const value = (tag: string) =>
        productXml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1] || '';
      return {
        invoiceItemNumber: Number(itemNumber),
        productCode: value('cProd'),
        description: value('xProd'),
        billedQuantity: Number(value('qCom')),
        unitValue: Number(value('vUnCom')),
        grossValue: Number(value('vProd')),
        discountValue: Number(value('vDesc') || 0),
        productXml,
        taxesXml,
      };
    }
  );
}

function createResponse() {
  let statusCode = 200;
  let body: any;
  const response: any = {
    setHeader: vi.fn(),
    status(code: number) {
      statusCode = code;
      return response;
    },
    json(value: unknown) {
      body = value;
      return response;
    },
    end() {
      return response;
    },
  };
  return {
    response,
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
  };
}

async function getHandler() {
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key';
  vi.resetModules();
  return (await import('../../../../../../api/nfe/transmit-operation-draft')).default;
}

describe('endpoint de transmissão do rascunho fiscal (SEFAZ simulada)', () => {
  beforeEach(async () => {
    const fiscalOperationXml = await vi.importActual<typeof import('../fiscalOperationXml')>(
      '../fiscalOperationXml'
    );
    vi.clearAllMocks();
    mocks.authorizeFiscalOperator.mockResolvedValue({ ok: true, userId: 'test-fiscal-operator' });
    vi.stubEnv('NFE_RESP_TECH_CNPJ', '12345678000195');
    vi.stubEnv('NFE_RESP_TECH_CONTACT', 'TEST_AUT');
    vi.stubEnv('NFE_RESP_TECH_EMAIL', 'test@example.invalid');
    vi.stubEnv('NFE_RESP_TECH_PHONE', '41999999999');
    vi.stubEnv('NFE_CSRT_ID', '01');
    vi.stubEnv('NFE_CSRT_SECRET', 'TESTAUT000000000000000000');
    process.env.NFE_CERTIFICATE_BASE64 = 'server-pfx';
    process.env.NFE_CERTIFICATE_PASSWORD = 'server-password';
    mocks.validateNfeAgainstOfficialSchema.mockResolvedValue(undefined);
    mocks.validateUnsignedNfeStructure.mockResolvedValue(undefined);
    mocks.assertNfeSignature.mockReturnValue(undefined);
    mocks.extractCertificateAndKey.mockReturnValue({
      certPem: 'mock-cert',
      privateKeyPem: 'mock-key',
      certDerBase64: 'mock-der',
    });
    mocks.signNfeXml.mockImplementation((xml: string) =>
      xml.replace('</NFe>', '<Signature/></NFe>')
    );
    mocks.buildReviewedFiscalOperationXml.mockImplementation(
      fiscalOperationXml.buildReviewedFiscalOperationXml
    );
    mocks.parseAuthorizedInvoiceLines.mockImplementation(parseSyntheticOperationLines);
  });
  afterEach(() => vi.unstubAllEnvs());

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

  it('só persiste no RPC transacional após autorização com chave/protocolo SEFAZ', async () => {
    const { db, state } = createDatabase();
    const reviewedVersion = state.draft.updated_at;
    mocks.validateNfeAgainstOfficialSchema.mockImplementation(async (xml: string) => {
      if (!xml.includes('<Signature')) throw new Error('O XSD oficial exige assinatura digital.');
    });
    mocks.createClient.mockReturnValue(db);
    mocks.sendSoapToSefaz.mockImplementation(authorizationReplyFromRequest);
    const handler = await getHandler();
    const res = createResponse();
    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, productionConfirmed: true },
      } as any,
      res.response
    );

    expect(mocks.createClient).toHaveBeenCalled();
    expect(mocks.extractCertificateAndKey).toHaveBeenCalledWith('server-pfx', 'server-password');
    expect([res.statusCode, res.body]).toEqual([
      200,
      expect.objectContaining({ status: 'authorized' }),
    ]);
    expect(res.body.status).toBe('authorized');
    expect(mocks.validateUnsignedNfeStructure).toHaveBeenCalledTimes(1);
    expect(mocks.validateNfeAgainstOfficialSchema).toHaveBeenCalledTimes(1);
    expect(mocks.validateNfeAgainstOfficialSchema).toHaveBeenCalledWith(state.draft.signed_xml);
    expect(mocks.assertNfeSignature).toHaveBeenCalledWith(state.draft.signed_xml, 'mock-cert');
    expect(mocks.validateUnsignedNfeStructure.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.signNfeXml.mock.invocationCallOrder[0]
    );
    expect(mocks.signNfeXml.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.validateNfeAgainstOfficialSchema.mock.invocationCallOrder[0]
    );
    expect(state.draft.signed_xml).toContain('<?xml');
    const transmittedXml = mocks.sendSoapToSefaz.mock.calls[0][0].xmlPayload as string;
    expect(transmittedXml).not.toContain('<?xml');
    expect(transmittedXml).not.toMatch(/>\s+</);
    expect(transmittedXml).toContain('<xProd>Cadeira</xProd>');
    expect(transmittedXml).toContain(state.draft.signed_xml!.replace(/^<\?xml[^?]*\?>/, ''));
    expect(state.draft.access_key).toMatch(/^\d{44}$/);
    expect(state.rpcCalls.map((call) => call.name)).toEqual([
      'peek_nfe_outbound_number',
      'prepare_nfe_operation_attempt',
      'persist_authorized_nfe_operation_draft',
    ]);
    const prepared = state.rpcCalls[1].args;
    expect(prepared.p_expected_updated_at).toBe(reviewedVersion);
    expect(prepared.p_expected_review_data).toEqual(state.draft.review_data);
    expect(prepared.p_expected_lines).toEqual(state.lines);
    expect(prepared.p_signed_xml).toBe(state.draft.signed_xml);
    const persist = state.rpcCalls[2].args;
    expect(persist.p_access_key).toBe(state.draft.access_key);
    expect(persist.p_signed_xml).toBe(state.draft.signed_xml);
    expect((persist.p_items as Array<Record<string, unknown>>)[0].item_number).toBe(1);
    expect(mocks.buildReviewedFiscalOperationXml.mock.calls[0][0].lines[0].originalItemNumber).toBe(
      2
    );
  });

  it('revalida o pedido cancelado e prepara uma NF-e de estorno modelo 55 após o prazo', async () => {
    const { db, state } = createDatabase('estorno');
    mocks.createClient.mockReturnValue(db);
    mocks.sendSoapToSefaz.mockImplementation(authorizationReplyFromRequest);
    const handler = await getHandler();
    const res = createResponse();

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, productionConfirmed: true },
      } as any,
      res.response
    );

    expect(res.statusCode).toBe(200);
    expect(mocks.buildReviewedFiscalOperationXml).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'estorno',
        natureOfOperation: 'Nota Fiscal de Estorno',
        originalOperationType: 1,
        destinationIndicator: 1,
        periodAdjustmentText: 'Diferenças e acréscimos fiscais revisados pelo responsável.',
        originalAccessKey: sourceKey,
      })
    );
    expect(state.draft.access_key).not.toBe(sourceKey);
    expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(1);
  });

  it('aceita NFC-e do Paraná como origem do estorno e transmite somente a NFE modelo 55 revisada', async () => {
    const { db, state } = createNfceEstornoDatabase();
    mocks.createClient.mockReturnValue(db);
    mocks.sendSoapToSefaz.mockImplementation(authorizationReplyFromRequest);
    const handler = await getHandler();
    const res = createResponse();

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, productionConfirmed: true },
      } as any,
      res.response
    );

    expect(res.statusCode).toBe(200);
    expect(mocks.buildReviewedFiscalOperationXml).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'estorno',
        originalAccessKey: state.source.chave_acesso,
      })
    );
    expect(state.draft.access_key).not.toBe(state.source.chave_acesso);
    expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(1);
  });

  it('bloqueia o estorno em período posterior sem texto de diferenças/acréscimos revisado', async () => {
    const { db, state } = createDatabase('estorno');
    state.draft.review_data.period_adjustment_text = '';
    mocks.createClient.mockReturnValue(db);
    const handler = await getHandler();
    const res = createResponse();

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, productionConfirmed: true },
      } as any,
      res.response
    );

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toContain('diferenças/acréscimos do art. 298, §2º');
    expect(mocks.buildReviewedFiscalOperationXml).not.toHaveBeenCalled();
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });

  it('bloqueia transmissão do estorno se houver evidência de circulação', async () => {
    const { db, state } = createDatabase('estorno');
    state.saleOrder.delivery_status = 'delivered';
    mocks.createClient.mockReturnValue(db);
    const handler = await getHandler();
    const res = createResponse();

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, productionConfirmed: true },
      } as any,
      res.response
    );

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/entrega\/retirada está confirmada/i);
    expect(state.rpcCalls).toEqual([]);
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });

  it('bloqueia transmissão do estorno se o prazo de cancelamento ainda estiver aberto', async () => {
    const { db, state } = createDatabase('estorno');
    state.source.xml_protocolo = `<protNFe><infProt><dhRecbto>${new Date().toISOString()}</dhRecbto></infProt></protNFe>`;
    mocks.createClient.mockReturnValue(db);
    const handler = await getHandler();
    const res = createResponse();

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, productionConfirmed: true },
      } as any,
      res.response
    );

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/cancelamento|prazo/i);
    expect(state.rpcCalls).toEqual([]);
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });

  it('nega transmissão a usuário autenticado fora dos papéis fiscais permitidos', async () => {
    const { db, state } = createDatabase();
    mocks.authorizeFiscalOperator.mockResolvedValueOnce({
      ok: false,
      status: 403,
      message: 'Usuário sem permissão fiscal.',
    });
    mocks.createClient.mockReturnValue(db);
    const handler = await getHandler();
    const res = createResponse();

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, productionConfirmed: true },
      } as any,
      res.response
    );

    expect(res.statusCode).toBe(403);
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
    expect(state.rpcCalls).toEqual([]);
  });

  it('bloqueia a emissão deste fluxo para documento NFC-e modelo 65', async () => {
    const { db, state } = createDatabase();
    state.source.modelo = '65';
    mocks.createClient.mockReturnValue(db);
    const handler = await getHandler();
    const res = createResponse();
    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, productionConfirmed: true },
      } as any,
      res.response
    );

    expect(res.statusCode).toBe(409);
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });

  it('rejeita pagamento da venda em devolução antes de reservar número ou transmitir', async () => {
    const { db, state } = createDatabase();
    state.draft.review_data.payment_xml =
      '<pag><detPag><tPag>01</tPag><vPag>100.00</vPag></detPag></pag>';
    mocks.createClient.mockReturnValue(db);
    const handler = await getHandler();
    const res = createResponse();

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, productionConfirmed: true },
      } as any,
      res.response
    );

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/campos estruturais/i);
    expect(state.rpcCalls).toEqual([]);
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });

  it('rejeita transporte divergente do método persistido antes de reservar número', async () => {
    const { db, state } = createDatabase();
    state.returnOrder.order_data = { returnMethod: 'store_collection' };
    state.draft.review_data.transport_xml = '<transp><modFrete>9</modFrete></transp>';
    mocks.createClient.mockReturnValue(db);
    const handler = await getHandler();
    const res = createResponse();

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, productionConfirmed: true },
      } as any,
      res.response
    );

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/divergem do cenário fiscal/);
    expect(state.rpcCalls).toEqual([]);
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });

  it('bloqueia pedido sem método de retorno persistido antes de reservar número', async () => {
    const { db, state } = createDatabase();
    state.returnOrder.order_data = {};
    mocks.createClient.mockReturnValue(db);
    const handler = await getHandler();
    const res = createResponse();

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, productionConfirmed: true },
      } as any,
      res.response
    );

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/método de retorno não está persistido/);
    expect(state.rpcCalls).toEqual([]);
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });

  it('rejeita CFOP incompatível com o item original antes da transmissão', async () => {
    const { db, state } = createDatabase();
    state.lines[0].reviewed_cfop = '6102';
    mocks.createClient.mockReturnValue(db);
    const handler = await getHandler();
    const res = createResponse();

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, productionConfirmed: true },
      } as any,
      res.response
    );

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/CFOP .* não é permitido/i);
    expect(state.rpcCalls).toEqual([]);
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });

  it('registra rejeição sem chamar a RPC de autorização', async () => {
    const { db, state } = createDatabase();
    mocks.createClient.mockReturnValue(db);
    let identifiedRejection = '';
    mocks.sendSoapToSefaz.mockImplementation(input => {
      identifiedRejection = authorizationReplyFromRequest(input)
        .replace('<cStat>100', '<cStat>434')
        .replace('<xMotivo>Autorizado o uso da NF-e', '<xMotivo>Rejeição de validação fiscal')
        .replace(/<nProt>.*?<\/nProt>|<dhRecbto>.*?<\/dhRecbto>/g, '');
      return identifiedRejection;
    });
    const handler = await getHandler();
    const res = createResponse();
    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, productionConfirmed: true },
      } as any,
      res.response
    );

    expect(res.statusCode).toBe(422);
    expect(res.body.status).toBe('rejected');
    expect(state.draft.status).toBe('rejected');
    expect(
      state.rpcCalls.some((call) => call.name === 'persist_authorized_nfe_operation_draft')
    ).toBe(false);
    expect(state.draft.sefaz_response_xml).toBe(identifiedRejection);
    expect(res.body.cStat).toBe('434');
  });

  it('bloqueia retransmissão após 217 quando o XML armazenado não passa no XSD', async () => {
    const { db, state } = createDatabase();
    state.draft.access_key = '4'.repeat(44);
    state.draft.signed_xml =
      '<NFe><infNFe><infRespTec><idCSRT>01</idCSRT><hashCSRT>AAAAAAAAAAAAAAAAAAAAAAAAAAA=</hashCSRT></infRespTec></infNFe></NFe><Signature/>';
    mocks.createClient.mockReturnValue(db);
    mocks.validateNfeAgainstOfficialSchema.mockRejectedValue(
      new Error('XML da NF-e não passou pelo schema oficial PL_010f_v1.04: inválido')
    );
    const handler = await getHandler();
    const res = createResponse();
    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, productionConfirmed: true },
      } as any,
      res.response
    );

    expect(res.statusCode).toBe(422);
    expect(mocks.validateNfeAgainstOfficialSchema).toHaveBeenCalledWith(state.draft.signed_xml);
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
    expect(state.draft.status).toBe('ready');
  });

  it('bloqueia XML inválido antes de reservar número ou gravar a tentativa', async () => {
    const { db, state } = createDatabase();
    mocks.createClient.mockReturnValue(db);
    mocks.validateNfeAgainstOfficialSchema.mockRejectedValue(
      new Error('XML da NF-e não passou pelo schema oficial PL_010f_v1.04: inválido')
    );
    const handler = await getHandler();
    const res = createResponse();
    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, productionConfirmed: true },
      } as any,
      res.response
    );

    expect(res.statusCode).toBe(422);
    expect(res.body).toMatchObject({ numberReserved: false });
    expect(state.rpcCalls.filter(call => call.name !== 'peek_nfe_outbound_number')).toEqual([]);
    expect(state.draft.status).toBe('ready');
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });

  it('duas requisições do mesmo rascunho só transmitem a preparação vencedora', async () => {
    const { db, state } = createDatabase();
    const rpc = db.rpc;
    let arrivals = 0;
    let release!: () => void;
    const bothPrepared = new Promise<void>(resolve => { release = resolve; });
    db.rpc = async (name, args) => {
      if (name === 'peek_nfe_outbound_number') {
        if (++arrivals === 2) release();
        await bothPrepared;
      }
      return rpc(name, args);
    };
    mocks.createClient.mockReturnValue(db);
    mocks.sendSoapToSefaz.mockImplementation(authorizationReplyFromRequest);
    const handler = await getHandler();
    const results = [createResponse(), createResponse()];
    await Promise.all(results.map(res => handler({ method: 'POST',
      headers: { authorization: 'Bearer user-token' },
      body: { draftId: state.draft.id, productionConfirmed: true } } as any, res.response)));

    expect(results.map(res => res.statusCode).sort()).toEqual([200, 409]);
    expect(results.find(res => res.statusCode === 409)?.body.pending).toBe(true);
    expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(1);
    expect(state.rpcCalls.filter(call => call.name === 'prepare_nfe_operation_attempt')).toHaveLength(2);
    expect(state.rpcCalls.filter(call => call.name === 'persist_authorized_nfe_operation_draft')).toHaveLength(1);
    expect(state.rpcCalls.some(call => call.name === 'reserve_next_nfe_number')).toBe(false);
  });

  it('reprepara o XML após conflito de sequência antes de qualquer transmissão', async () => {
    const { db, state } = createDatabase();
    const rpc = db.rpc;
    let preparationCount = 0;
    db.rpc = async (name, args) => {
      if (name === 'peek_nfe_outbound_number' && preparationCount) return { data: 702, error: null };
      if (name === 'prepare_nfe_operation_attempt' && ++preparationCount === 1)
        return { data: null, error: { message: 'FISCAL_SEQUENCE_CHANGED' } };
      return rpc(name, args);
    };
    mocks.createClient.mockReturnValue(db);
    mocks.sendSoapToSefaz.mockImplementation(authorizationReplyFromRequest);
    const handler = await getHandler();
    const res = createResponse();
    await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
      body: { draftId: state.draft.id, productionConfirmed: true } } as any, res.response);

    expect(res.statusCode).toBe(200);
    expect(state.draft.access_key?.slice(25, 34)).toBe('000000702');
    expect(mocks.signNfeXml).toHaveBeenCalledTimes(2);
    expect(mocks.validateNfeAgainstOfficialSchema).toHaveBeenCalledTimes(2);
    expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(1);
  });

  it.each(['lost-response', 'changed-review', 'missing-migration'])(
    'falha de preparação %s mantém a transmissão bloqueada', async failure => {
      const { db, state } = createDatabase();
      const rpc = db.rpc;
      db.rpc = async (name, args) => {
        if (name !== 'prepare_nfe_operation_attempt') return rpc(name, args);
        if (failure === 'lost-response') {
          await rpc(name, args);
          throw new Error('Resposta da gravação perdida');
        }
        return { data: null, error: { message: failure === 'changed-review'
          ? 'FISCAL_DRAFT_CHANGED' : 'Could not find the function public.prepare_nfe_operation_attempt' } };
      };
      mocks.createClient.mockReturnValue(db);
      const handler = await getHandler();
      const res = createResponse();
      await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, productionConfirmed: true } } as any, res.response);

      expect(res.body).toMatchObject({ success: false, pending: true });
      expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
      expect(state.draft.status).toBe(failure === 'lost-response' ? 'transmitting' : 'ready');
      if (failure === 'lost-response') expect(state.draft.access_key).toMatch(/^\d{44}$/);
    }
  );

  it('timeout nunca retransmite automaticamente; libera somente após consulta cStat 217', async () => {
    const { db, state } = createDatabase();
    mocks.createClient.mockReturnValue(db);
    mocks.sendSoapToSefaz.mockImplementation(({ xmlPayload }: { xmlPayload: string }) =>
      xmlPayload.includes('<xServ>CONSULTAR</xServ>')
        ? Promise.resolve(identifiedNotFoundReply(state.draft.access_key!))
        : Promise.reject(new Error('timeout'))
    );
    const handler = await getHandler();
    const first = createResponse();
    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, productionConfirmed: true },
      } as any,
      first.response
    );
    expect(first.statusCode).toBe(202);
    expect(first.body.pending).toBe(true);
    expect(state.draft.status).toBe('unknown');
    const attemptedAccessKey = state.draft.access_key;
    const attemptedSignedXml = state.draft.signed_xml;
    expect(attemptedAccessKey).toMatch(/^\d{44}$/);
    expect(
      state.rpcCalls.some((call) => call.name === 'persist_authorized_nfe_operation_draft')
    ).toBe(false);

    state.draft.transmitted_at = new Date(Date.now() - 31_000).toISOString();
    const second = createResponse();
    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, productionConfirmed: false },
      } as any,
      second.response
    );
    expect(second.statusCode).toBe(409);
    expect(second.body.retryAllowed).toBe(true);
    expect(state.draft.status).toBe('ready');
    expect(state.draft.access_key).toBe(attemptedAccessKey);
    expect(state.draft.signed_xml).toBe(attemptedSignedXml);
    expect(
      mocks.sendSoapToSefaz.mock.calls.filter(
        ([input]) => !input.xmlPayload.includes('<xServ>CONSULTAR</xServ>')
      )
    ).toHaveLength(1);

    const unconfirmedRetry = createResponse();
    await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
      body: { draftId: state.draft.id, productionConfirmed: false } } as any, unconfirmedRetry.response);
    expect(unconfirmedRetry.statusCode).toBe(400);
    expect(unconfirmedRetry.body.error).toContain('Produção');
    expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(3);

    mocks.sendSoapToSefaz.mockImplementation(authorizationReplyFromRequest);
    const previousTransmissionTime = state.draft.transmitted_at;
    const confirmedRetry = createResponse();
    await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
      body: { draftId: state.draft.id, productionConfirmed: true } } as any, confirmedRetry.response);
    expect(confirmedRetry.statusCode).toBe(200);
    expect(confirmedRetry.body.status).toBe('authorized');
    expect(state.draft.access_key).toBe(attemptedAccessKey);
    expect(state.draft.signed_xml).toBe(attemptedSignedXml);
    expect(state.draft.transmitted_at).not.toBe(previousTransmissionTime);
    expect(state.rpcCalls.filter((call) => call.name === 'prepare_nfe_operation_attempt')).toHaveLength(1);
    expect(state.rpcCalls.some((call) => call.name === 'reserve_next_nfe_number')).toBe(false);
    expect(mocks.sendSoapToSefaz.mock.calls.filter(([input]) => !input.xmlPayload.includes('<xServ>CONSULTAR</xServ>'))).toHaveLength(2);
  });

  it('timeout com situação ainda incerta continua pendente e não libera retry', async () => {
    const { db, state } = createDatabase();
    mocks.createClient.mockReturnValue(db);
    mocks.sendSoapToSefaz.mockImplementation(({ xmlPayload }: { xmlPayload: string }) =>
      xmlPayload.includes('<xServ>CONSULTAR</xServ>')
        ? Promise.resolve(uncertainReply)
        : Promise.reject(new Error('timeout'))
    );
    const handler = await getHandler();
    const res = createResponse();
    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, productionConfirmed: true },
      } as any,
      res.response
    );

    expect(res.statusCode).toBe(202);
    expect(res.body.retryAllowed).toBeUndefined();
    expect(state.draft.status).toBe('unknown');
    expect(
      state.rpcCalls.some((call) => call.name === 'persist_authorized_nfe_operation_draft')
    ).toBe(false);
  });

  it.each(['transmitting', 'unknown'].flatMap(status => [0, 29_999, 30_000, 31_000].map(age => ({ status, age }))))(
    'consulta217 respeita a idade da tentativa $status/$age ms', async ({ status, age }) => {
      const { db, state } = createDatabase();
      const now = Date.parse('2026-10-18T12:00:00Z');
      state.draft.status = status;
      state.draft.access_key = '4'.repeat(44);
      state.draft.signed_xml = '<NFe><Signature/></NFe>';
      state.draft.transmitted_at = new Date(now - age).toISOString();
      mocks.createClient.mockReturnValue(db);
      mocks.sendSoapToSefaz.mockResolvedValue(identifiedNotFoundReply(state.draft.access_key));
      const handler = await getHandler();
      const res = createResponse();
      const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
      try {
        await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
          body: { draftId: state.draft.id, productionConfirmed: false } } as any, res.response);
      } finally { clock.mockRestore(); }
      expect(res.statusCode).toBe(age < 30_000 ? 202 : 409);
      expect(res.body.retryAllowed).toBe(age < 30_000 ? undefined : true);
      expect(state.draft.status).toBe(age < 30_000 ? status : 'ready');
      expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(1);
      expect(state.rpcCalls).toEqual([]);
    }
  );

  it.each([null, 'invalid-date', '2026-10-18T12:01:00Z'])(
    'consulta217 não libera tentativa com instante ausente/inválido/futuro (%s)', async transmittedAt => {
      const { db, state } = createDatabase();
      state.draft.status = 'unknown';
      state.draft.access_key = '4'.repeat(44);
      state.draft.signed_xml = '<NFe><Signature/></NFe>';
      state.draft.transmitted_at = transmittedAt;
      mocks.createClient.mockReturnValue(db);
      mocks.sendSoapToSefaz.mockResolvedValue(identifiedNotFoundReply(state.draft.access_key));
      const handler = await getHandler();
      const res = createResponse();
      const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-18T12:00:00Z'));
      try {
        await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
          body: { draftId: state.draft.id, productionConfirmed: false } } as any, res.response);
      } finally { clock.mockRestore(); }
      expect(res.body).toMatchObject({ success: false, pending: true });
      expect(res.body.retryAllowed).toBeUndefined();
      expect(state.draft.status).toBe('unknown');
    }
  );

  it('consulta iniciada antes da janela não libera217 mesmo quando termina depois dela', async () => {
    const { db, state } = createDatabase();
    const now = Date.parse('2026-10-18T12:00:00Z');
    state.draft.status = 'transmitting';
    state.draft.access_key = '4'.repeat(44);
    state.draft.signed_xml = '<NFe><Signature/></NFe>';
    state.draft.transmitted_at = new Date(now).toISOString();
    mocks.createClient.mockReturnValue(db);
    const handler = await getHandler();
    const res = createResponse();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    mocks.sendSoapToSefaz.mockImplementation(async () => {
      clock.mockReturnValue(now + 31_000);
      return identifiedNotFoundReply(state.draft.access_key!);
    });
    try {
      await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, productionConfirmed: false } } as any, res.response);
    } finally { clock.mockRestore(); }
    expect(res.statusCode).toBe(202);
    expect(state.draft.status).toBe('transmitting');
  });

  it('consulta217 obsoleta não sobrescreve uma transmissão concorrente mais recente', async () => {
    const { db, state } = createDatabase();
    state.draft.status = 'unknown';
    state.draft.access_key = '4'.repeat(44);
    state.draft.signed_xml = '<NFe><Signature/></NFe>';
    state.draft.transmitted_at = new Date(Date.now() - 60_000).toISOString();
    mocks.createClient.mockReturnValue(db);
    mocks.sendSoapToSefaz.mockImplementation(async () => {
      Object.assign(state.draft, { status: 'transmitting', updated_at: new Date().toISOString() });
      return identifiedNotFoundReply(state.draft.access_key!);
    });
    const handler = await getHandler();
    const res = createResponse();
    await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
      body: { draftId: state.draft.id, productionConfirmed: false } } as any, res.response);
    expect(res.body).toMatchObject({ success: false, pending: true });
    expect(res.body.retryAllowed).toBeUndefined();
    expect(state.draft.status).toBe('transmitting');
  });

  it.each(['key', 'environment', 'missing-environment', 'duplicate', 'malformed'])(
    'consulta217 com identidade %s não libera outra tentativa', async mismatch => {
      const { db, state } = createDatabase();
      state.draft.status = 'unknown';
      state.draft.access_key = '4'.repeat(44);
      state.draft.signed_xml = '<NFe><Signature/></NFe>';
      state.draft.transmitted_at = new Date(Date.now() - 60_000).toISOString();
      const valid = identifiedNotFoundReply(state.draft.access_key);
      const invalid = mismatch === 'key' ? valid.replace(state.draft.access_key, '5'.repeat(44))
        : mismatch === 'environment' ? valid.replace('<tpAmb>1', '<tpAmb>2')
        : mismatch === 'missing-environment' ? valid.replace('<tpAmb>1</tpAmb>', '')
        : mismatch === 'duplicate' ? '<root>' + valid + valid + '</root>'
        : valid.replace('</retConsSitNFe>', '');
      mocks.createClient.mockReturnValue(db);
      mocks.sendSoapToSefaz.mockResolvedValue(invalid);
      const handler = await getHandler();
      const res = createResponse();
      await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, productionConfirmed: false } } as any, res.response);
      expect(res.body).toMatchObject({ success: false, pending: true });
      expect(res.body.retryAllowed).toBeUndefined();
      expect(state.draft.status).toBe('unknown');
    }
  );

  it.each(['matching', 'root-key', 'protocol-key', 'environment', 'duplicate-protocol'])(
    'consulta100 confirma a identidade antes de persistir (%s)', async scenario => {
      const { db, state } = createDatabase();
      mocks.createClient.mockReturnValue(db);
      mocks.sendSoapToSefaz.mockImplementation(({ xmlPayload }: { xmlPayload: string }) =>
        xmlPayload.includes('<xServ>CONSULTAR</xServ>') ? Promise.resolve(uncertainReply) : Promise.reject(new Error('timeout')));
      const handler = await getHandler();
      const first = createResponse();
      await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, productionConfirmed: true } } as any, first.response);
      expect(first.body.pending).toBe(true);
      const key = state.draft.access_key!;
      const signed = state.draft.signed_xml;
      const protocol = `<protNFe><infProt><tpAmb>1</tpAmb><chNFe>${scenario === 'protocol-key' ? '5'.repeat(44) : key}</chNFe><cStat>100</cStat><nProt>141260000123456</nProt><dhRecbto>2026-09-26T12:00:00-03:00</dhRecbto></infProt></protNFe>`;
      const query = `<retConsSitNFe xmlns="http://www.portalfiscal.inf.br/nfe"><tpAmb>${scenario === 'environment' ? 2 : 1}</tpAmb><chNFe>${scenario === 'root-key' ? '5'.repeat(44) : key}</chNFe><cStat>100</cStat>${protocol}${scenario === 'duplicate-protocol' ? protocol : ''}</retConsSitNFe>`;
      mocks.sendSoapToSefaz.mockResolvedValue(query);
      const result = createResponse();
      await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, productionConfirmed: false } } as any, result.response);
      expect(result.statusCode).toBe(scenario === 'matching' ? 200 : 202);
      expect(state.draft.status).toBe(scenario === 'matching' ? 'authorized' : 'unknown');
      expect(state.draft.access_key).toBe(key);
      expect(state.draft.signed_xml).toBe(signed);
      expect(state.rpcCalls.filter(call => call.name === 'persist_authorized_nfe_operation_draft')).toHaveLength(scenario === 'matching' ? 1 : 0);
      expect(mocks.sendSoapToSefaz.mock.calls.filter(([input]) => !input.xmlPayload.includes('<xServ>CONSULTAR</xServ>'))).toHaveLength(1);
    }
  );

  it('resposta atrasada da preparação não transmite uma versão superada da tentativa', async () => {
    const { db, state } = createDatabase();
    const rpc = db.rpc;
    db.rpc = async (name, args) => {
      const response = await rpc(name, args);
      if (name === 'prepare_nfe_operation_attempt') {
        state.draft.updated_at = new Date(Date.parse(state.draft.updated_at) + 1000).toISOString();
      }
      return response;
    };
    mocks.createClient.mockReturnValue(db);
    const handler = await getHandler();
    const res = createResponse();
    await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
      body: { draftId: state.draft.id, productionConfirmed: true } } as any, res.response);
    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ success: false, pending: true });
    expect(state.draft.status).toBe('transmitting');
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });

  it.each(['failStart', 'loseStartResponse'] as const)('início de transmissão não confirmado (%s) não envia SOAP', async failure => {
    const { db, state } = createDatabase();
    state[failure] = true;
    mocks.createClient.mockReturnValue(db);
    const handler = await getHandler();
    const res = createResponse();
    await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
      body: { draftId: state.draft.id, productionConfirmed: true } } as any, res.response);
    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ success: false, pending: true });
    expect(state.draft.status).toBe('transmitting');
    expect(state.draft.access_key).toMatch(/^\d{44}$/);
    expect(state.draft.signed_xml).toBeTruthy();
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
    expect(state.rpcCalls.some(call => call.name === 'persist_authorized_nfe_operation_draft')).toBe(false);
  });
  it.each(['key', 'root-environment', 'protocol-environment', 'missing-key', 'duplicate-protocol',
    'duplicate-result', 'namespace', 'malformed', 'doctype', 'root-status', 'invalid-date', 'missing-date'])(
    'autorização direta divergente mantém pendência sem persistir (%s)', async scenario => {
      const { db, state } = createDatabase();
      mocks.createClient.mockReturnValue(db);
      mocks.sendSoapToSefaz.mockImplementation(input => {
        const reply = authorizationReplyFromRequest(input);
        const protocol = reply.match(/<protNFe>[\s\S]*?<\/protNFe>/)![0];
        switch (scenario) {
          case 'key': return reply.replace(state.draft.access_key!, sourceKey);
          case 'root-environment': return reply.replace('<tpAmb>1', '<tpAmb>2');
          case 'protocol-environment': return reply.replace('<infProt><tpAmb>1', '<infProt><tpAmb>2');
          case 'missing-key': return reply.replace(/<chNFe>[\s\S]*?<\/chNFe>/, '');
          case 'duplicate-protocol': return reply.replace(protocol, protocol + protocol);
          case 'duplicate-result': return `<responses>${reply}${reply}</responses>`;
          case 'namespace': return reply.replace('http://www.portalfiscal.inf.br/nfe', 'urn:untrusted');
          case 'malformed': return reply.replace('</retEnviNFe>', '');
          case 'doctype': return '<!DOCTYPE retEnviNFe [<!ENTITY nfh "unused">]>' + reply;
          case 'root-status': return reply.replace('<cStat>104', '<cStat>105');
          case 'invalid-date': return reply.replace('2026-09-26T12:00:00-03:00', 'invalid-date');
          case 'missing-date': return reply.replace(/<dhRecbto>.*?<\/dhRecbto>/, '');
          default: throw new Error('Cenário não configurado');
        }
      });
      const handler = await getHandler();
      const res = createResponse();
      await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, productionConfirmed: true } } as any, res.response);
      expect(res.statusCode).toBe(202);
      expect(res.body).toMatchObject({ success: false, pending: true, reconciliationRequired: true,
        accessKey: state.draft.access_key });
      expect(state.draft.status).toBe('transmitting');
      expect(state.draft.signed_xml).toBeTruthy();
      expect(state.rpcCalls.some(call => call.name === 'persist_authorized_nfe_operation_draft')).toBe(false);
      expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(1);
    }
  );

  it.each(['', '<html>Bad Gateway</html>', '<soap:Fault>Unavailable</soap:Fault>',
    '<retEnviNFe><cStat>104</cStat><protNFe><infProt><cStat>100</cStat></infProt></protNFe></retEnviNFe>',
    '<retEnviNFe><cStat>104</cStat><protNFe><infProt><cStat>539</cStat>',
    '<retConsSitNFe><cStat>217</cStat></retConsSitNFe>'])(
    'resposta de transmissão inconclusiva não vira rejeição definitiva (%s)', async reply => {
      const { db, state } = createDatabase();
      mocks.createClient.mockReturnValue(db);
      mocks.sendSoapToSefaz.mockResolvedValueOnce(reply).mockResolvedValue(uncertainReply);
      const handler = await getHandler();
      const res = createResponse();
      await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, productionConfirmed: true } } as any, res.response);
      expect(res.statusCode).toBe(202);
      expect(res.body).toMatchObject({ success: false, pending: true });
      expect(state.draft.status).toBe('unknown');
      expect(state.draft.access_key).toBeTruthy();
      expect(state.draft.signed_xml).toBeTruthy();
      expect(state.rpcCalls.some(call => call.name === 'persist_authorized_nfe_operation_draft')).toBe(false);
      expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(2);
      expect(mocks.sendSoapToSefaz.mock.calls[1][0].xmlPayload).toContain('<xServ>CONSULTAR</xServ>');
    }
  );

  it.each(['539', '108', '109', '999', 'rejection-key', 'rejection-environment', 'rejection-duplicate'])(
    'retorno %s exige consulta em vez de declarar rejeição definitiva', async scenario => {
      const { db, state } = createDatabase();
      mocks.createClient.mockReturnValue(db);
      mocks.sendSoapToSefaz.mockImplementationOnce(input => {
        const reply = authorizationReplyFromRequest(input).replace('<cStat>100', `<cStat>${scenario.startsWith('rejection-') ? '434' : scenario}`);
        if (scenario === 'rejection-key') return reply.replace(state.draft.access_key!, sourceKey);
        if (scenario === 'rejection-environment') return reply.replace('<tpAmb>1', '<tpAmb>2');
        if (scenario === 'rejection-duplicate') return `<responses>${reply}${reply}</responses>`;
        return reply;
      }).mockResolvedValue(uncertainReply);
      const handler = await getHandler();
      const res = createResponse();
      await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, productionConfirmed: true } } as any, res.response);
      expect(res.statusCode).toBe(202);
      expect(res.body).toMatchObject({ success: false, pending: true });
      expect(state.draft.status).toBe('unknown');
      expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(2);
      expect(mocks.sendSoapToSefaz.mock.calls[1][0].xmlPayload).toContain('<xServ>CONSULTAR</xServ>');
    }
  );

  it('registra rejeição de lote identificada sem protocolo por item', async () => {
    const { db, state } = createDatabase();
    mocks.createClient.mockReturnValue(db);
    mocks.sendSoapToSefaz.mockResolvedValue('<retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe"><tpAmb>1</tpAmb><cStat>215</cStat><xMotivo>Falha no schema XML</xMotivo></retEnviNFe>');
    const handler = await getHandler();
    const res = createResponse();
    await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
      body: { draftId: state.draft.id, productionConfirmed: true } } as any, res.response);
    expect(res.statusCode).toBe(422);
    expect(res.body).toMatchObject({ pending: false, status: 'rejected', cStat: '215' });
    expect(state.draft.status).toBe('rejected');
    expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(1);
  });

  it('rejeição tardia não declara rejeitada uma tentativa com versão mais recente', async () => {
    const { db, state } = createDatabase();
    mocks.createClient.mockReturnValue(db);
    mocks.sendSoapToSefaz.mockImplementation(input => {
      state.draft.updated_at = new Date(Date.parse(state.draft.updated_at) + 1000).toISOString();
      state.draft.status = 'unknown';
      return authorizationReplyFromRequest(input).replace('<cStat>100', '<cStat>434');
    });
    const handler = await getHandler();
    const res = createResponse();
    await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
      body: { draftId: state.draft.id, productionConfirmed: true } } as any, res.response);
    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ success: false, pending: true, reconciliationRequired: true });
    expect(res.body.status).not.toBe('rejected');
    expect(state.draft.status).toBe('unknown');
    expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(1);
  });

  it.each(['empty', 'unrelated-id', 'object', 'error', 'throw', 'lost-commit-response'])(
    'confirmação de gravação %s mantém pendência em vez de declarar conclusão', async scenario => {
      const { db, state } = createDatabase();
      const rpc = db.rpc;
      db.rpc = async (name, args) => {
        if (name !== 'persist_authorized_nfe_operation_draft') return rpc(name, args);
        if (scenario === 'lost-commit-response') await rpc(name, args);
        else state.rpcCalls.push({ name, args });
        if (scenario === 'throw' || scenario === 'lost-commit-response') throw new Error('Resposta RPC perdida');
        if (scenario === 'error') return { data: null, error: { message: 'Gravação não confirmada' } };
        return { data: scenario === 'empty' ? null : scenario === 'object' ? { id: state.draft.id } : sourceKey,
          error: null };
      };
      mocks.createClient.mockReturnValue(db);
      mocks.sendSoapToSefaz.mockImplementation(authorizationReplyFromRequest);
      const handler = await getHandler();
      const res = createResponse();
      await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, productionConfirmed: true } } as any, res.response);
      expect(res.statusCode).toBe(503);
      expect(res.body).toMatchObject({ pending: true, reconciliationRequired: true, accessKey: state.draft.access_key });
      expect(res.body.status).not.toBe('authorized');
      expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(1);
      if (scenario === 'lost-commit-response') {
        const recovered = createResponse();
        await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
          body: { draftId: state.draft.id, productionConfirmed: false } } as any, recovered.response);
        expect(recovered.statusCode).toBe(200);
        expect(recovered.body.documentId).toBe(state.draft.id);
        expect(mocks.sendSoapToSefaz).toHaveBeenCalledTimes(1);
      }
    }
  );

  it('permite prévia do XML do estorno a administradores sem reservar número nem transmitir à SEFAZ', async () => {
    const { db, state } = createDatabase('estorno');
    mocks.createClient.mockReturnValue(db);
    mocks.authorizeFiscalOperator.mockResolvedValue({ ok: true, userId: 'admin-1', isAdministrator: true });
    const handler = await getHandler();
    const res = createResponse();
    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer admin-token' },
        body: { draftId: state.draft.id, previewOnly: true },
      } as any,
      res.response
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      preview: true,
    });
    expect(typeof res.body.xml).toBe('string');
    expect(res.body.xml).toContain('<NFe');
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
    expect(state.rpcCalls.some(call => call.name === 'prepare_nfe_operation_attempt')).toBe(false);
  });

  it('bloqueia prévia do XML para operadores sem privilégio de administrador', async () => {
    const { db, state } = createDatabase('estorno');
    mocks.createClient.mockReturnValue(db);
    mocks.authorizeFiscalOperator.mockResolvedValue({ ok: true, userId: 'user-1', isAdministrator: false });
    const handler = await getHandler();
    const res = createResponse();
    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer user-token' },
        body: { draftId: state.draft.id, previewOnly: true },
      } as any,
      res.response
    );
    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({
      success: false,
      code: 'FISCAL_XML_PREVIEW_ADMIN_REQUIRED',
    });
    expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
  });
});
