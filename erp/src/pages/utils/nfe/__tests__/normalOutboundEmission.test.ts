import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emitNormalSale } from '../../../../../../api/nfe/emitNormalSale';
import type {
  FiscalEmissionCommand,
  FiscalSnapshotCandidate,
} from '../../../../../../api/nfe/fiscalSnapshot';
import {
  canonicalFiscalCommand,
  fiscalAttemptCommand,
} from '../../../../../../api/nfe/normal-sale/attemptPolicy';
import {
  reconcileNormalSale,
  recoverNormalSale,
} from '../../../../../../api/nfe/normal-sale/outboundAttempt';

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  schema: vi.fn(),
  structure: vi.fn(),
  sign: vi.fn(),
}));
vi.mock('../../../../../../api/nfe/sefazClient', () => ({ sendSoapToSefaz: mocks.send }));
vi.mock('../../../../../../api/nfe/schemaValidator', () => ({
  validateNfeAgainstOfficialSchema: mocks.schema,
  validateUnsignedNfeStructure: mocks.structure,
}));
vi.mock('../../../../../../api/nfe/nfeSigner', () => ({
  extractCertificateAndKey: () => ({
    certPem: 'TEST_UNIT',
    privateKeyPem: 'TEST_UNIT',
    certDerBase64: 'TEST_UNIT',
  }),
  signNfeXml: mocks.sign,
}));

const requestId = 'f19b3e63-6f84-45ea-8c5f-39476d709a3d';
const command = (environment: 1 | 2 = 1, finalConsumer = false): FiscalEmissionCommand => ({
  orderId: 'TEST_UNIT_PRODUCTION',
  environment,
  emissionRequestId: requestId,
  productionConfirmed: environment === 1,
  finalConsumer,
  itemFiscalSelections: {
    '1': { ncm: '94036000', cfop: '5102', origem: '0', cest: '', csosn: '102' },
  },
});
const facts = (c: FiscalEmissionCommand): FiscalSnapshotCandidate => ({
  schemaVersion: 1,
  capturedAt: new Date().toISOString(),
  order: {
    id: c.orderId,
    type: 'sale',
    status: 'approved',
    deleted: false,
    version: 1,
    updatedAt: '2026-10-07T12:00:00Z',
    data: {
      customerData: { id: 'TEST_UNIT_CUSTOMER' },
      shipping: { value: 0, deliveryMethod: 'pickup' },
      items: [
        {
          productId: 'P-1',
          description: 'TEST_UNIT_PRODUCT',
          quantity: 1,
          unitPrice: 100,
          unitDiscount: 0,
        },
      ],
      payments: [{ method: 'pix', amount: 100 }],
    },
  },
  issuerProfile: {
    companyCnpj: '12345678000195',
    companyCRT: '1',
    companyUF: 'PR',
    companyName: 'TEST_UNIT_ISSUER',
    companyIE: '1234567850',
    companyLogradouro: 'RUA TESTE',
    companyNumero: '10',
    companyBairro: 'CENTRO',
    companyCMun: '4105805',
    companyXMun: 'COLOMBO',
    companyCEP: '83410270',
  },
  emissionRequest: {
    id: c.emissionRequestId,
    environment: c.environment,
    finalConsumer: c.finalConsumer,
    itemFiscalSelections: c.itemFiscalSelections,
  },
});
const contribution = (model: string) => ({
  scope: { model, operation: 'normal_sale', issuerCrt: '1' },
  pis: { cst: '99', base: 0, rate: 0, value: 0 },
  cofins: { cst: '99', base: 0, rate: 0, value: 0 },
  confirmedAt: '2026-09-01T00:00:00Z',
  confirmedBy: `TEST_UNIT_OWN_${model}`,
});
function authorization(key: string, environment: number, protocol = '141260000000001') {
  return `<retEnviNFe><tpAmb>${environment}</tpAmb><cStat>104</cStat><protNFe><infProt><tpAmb>${environment}</tpAmb><chNFe>${key}</chNFe><cStat>100</cStat><xMotivo>Autorizado</xMotivo><nProt>${protocol}</nProt><dhRecbto>2026-10-07T12:00:00-03:00</dhRecbto></infProt></protNFe></retEnviNFe>`;
}
const notFound = (a: Record<string, any>) =>
  `<retConsSitNFe><tpAmb>${a.environment}</tpAmb><chNFe>${a.access_key}</chNFe><cStat>217</cStat><xMotivo>Não consta</xMotivo></retConsSitNFe>`;

/** In-memory API adapter. Real PostgreSQL assertions are in supabase/tests/commonOutboundEmission.sql. */
function database() {
  const attempts: Record<string, any>[] = [],
    documents: Record<string, any>[] = [],
    snapshots: Record<string, any>[] = [];
  const counters = new Map<string, number>();
  let failPreparation = false,
    failResult = false,
    own65 = true;
  const settings = ['55', '65'].map((model) => ({
    id: `fiscal_decision_simples_${model === '55' ? 'nfe55' : 'nfce65'}_normal_sale_v1`,
    data: contribution(model),
  }));
  const from = vi.fn((table: string) => {
    const filters: Array<(r: Record<string, any>) => boolean> = [];
    const rows = () => {
      const all =
        table === 'nfe_outbound_attempts'
          ? attempts
          : table === 'nfe_documents'
            ? documents
            : table === 'nfe_fiscal_snapshots'
              ? snapshots
              : table === 'settings'
                ? settings.filter((r) => own65 || r.data.scope.model !== '65')
                : table === 'ncms'
                  ? [
                      {
                        code: '94036000',
                        active: true,
                        is_active: true,
                        start_date: null,
                        end_date: null,
                      },
                    ]
                  : table === 'people'
                    ? [
                        {
                          id: 'TEST_UNIT_CUSTOMER',
                          full_name: 'TEST_UNIT_CUSTOMER',
                          cpf_cnpj: '12345678909',
                          deleted: false,
                          person_type_pf_pj: 'PF',
                          rg_ie: null,
                          address: JSON.stringify({
                            street: 'RUA TESTE',
                            number: '10',
                            neighborhood: 'CENTRO',
                            city: 'Curitiba',
                            state: 'PR',
                            cep: '80010000',
                          }),
                        },
                      ]
                    : [];
      return structuredClone(all.filter((r) => filters.every((filter) => filter(r))));
    };
    const query = {
      select: () => query,
      eq: (key: string, value: unknown) => {
        filters.push((r) => r[key] === value);
        return query;
      },
      in: (key: string, values: unknown[]) => {
        filters.push((r) => values.includes(r[key]));
        return query;
      },
      maybeSingle: async () => ({ data: rows()[0] || null, error: null }),
      // biome-ignore lint/suspicious/noThenProperty: Supabase query builders are intentionally thenable.
      then: (resolve: (result: unknown) => unknown) =>
        Promise.resolve({ data: rows(), error: null }).then(resolve),
    };
    return query;
  });
  const rpc = vi.fn(async (name: string, p: Record<string, any>) => {
    const a = attempts.find((r) => r.document_id === p.p_document_id);
    if (name === 'peek_nfe_outbound_number')
      return {
        data: Math.max(
          p.p_minimum,
          (counters.get([p.p_issuer_cnpj, p.p_model, p.p_environment, p.p_series].join(':')) || 0) +
            1
        ),
        error: null,
      };
    if (name === 'prepare_nfe_outbound_attempt') {
      const r = p.p_snapshot.emissionRequest;
      const prior = attempts.find((a) => a.emission_request_id === r.id);
      if (prior)
        return canonicalFiscalCommand(prior.request_command) ===
          canonicalFiscalCommand(p.p_request_command)
          ? {
              data: {
                documentId: prior.document_id,
                snapshotId: prior.snapshot_id,
                created: false,
              },
              error: null,
            }
          : { data: null, error: { message: 'IDEMPOTENCY_KEY_REUSED' } };
      if (failPreparation)
        return { data: null, error: { message: 'TEST_UNIT_PREPARATION_FAILURE' } };
      if (
        attempts.some(
          (a) =>
            a.order_id === p.p_snapshot.order.id &&
            a.environment === r.environment &&
            a.state !== 'rejected'
        )
      )
        return { data: null, error: { message: 'ALREADY_ACTIVE_FISCAL_ATTEMPT' } };
      const key = [
        p.p_snapshot.issuerProfile.companyCnpj,
        r.requestedModel,
        r.environment,
        r.series,
      ].join(':');
      if ((counters.get(key) || 0) >= r.number)
        return { data: null, error: { message: 'FISCAL_SEQUENCE_CHANGED' } };
      counters.set(key, r.number);
      const id = `doc-${attempts.length}`,
        snapshotId = `snapshot-${attempts.length}`;
      attempts.push({
        document_id: id,
        snapshot_id: snapshotId,
        emission_request_id: r.id,
        order_id: p.p_snapshot.order.id,
        issuer_cnpj: p.p_snapshot.issuerProfile.companyCnpj,
        model: r.requestedModel,
        environment: r.environment,
        series: r.series,
        number: r.number,
        access_key: p.p_access_key,
        request_command: p.p_request_command,
        xml_sha256: createHash('sha256').update(p.p_signed_xml).digest('hex'),
        state: 'prepared',
        attempt_token: p.p_attempt_token,
        response_history: [],
      });
      documents.push({
        id,
        order_id: p.p_snapshot.order.id,
        modelo: r.requestedModel,
        ambiente: r.environment,
        numero_nfe: r.number,
        serie: r.series,
        chave_acesso: p.p_access_key,
        xml_nfe: p.p_signed_xml,
        fiscal_snapshot_id: snapshotId,
        fiscal_ruleset_version: 'NORMAL_SALE_V1',
        status: 'processando',
      });
      snapshots.push({ id: snapshotId, snapshot_data: p.p_snapshot });
      return { data: { documentId: id, snapshotId, created: true }, error: null };
    }
    if (name === 'claim_nfe_outbound_attempt') {
      if (!a || a.attempt_token) return { data: false, error: null };
      a.attempt_token = p.p_attempt_token;
      return { data: true, error: null };
    }
    if (name === 'release_nfe_outbound_attempt') {
      if (a?.attempt_token === p.p_attempt_token) a.attempt_token = null;
      return { data: null, error: null };
    }
    if (!a || a.attempt_token !== p.p_attempt_token)
      return { data: null, error: { message: 'FISCAL_ATTEMPT_LEASE_LOST' } };
    if (name === 'start_nfe_outbound_transmission') {
      if (!['prepared', 'confirmed_not_found'].includes(a.state))
        return { data: null, error: { message: 'FISCAL_ATTEMPT_STATE_CHANGED' } };
      a.state = 'transmitting';
      a.transmission_started_at = new Date().toISOString();
      return { data: null, error: null };
    }
    if (name === 'persist_nfe_outbound_result') {
      if (
        failResult ||
        (p.p_state === 'authorized' &&
          (!p.p_response_xml.includes(`<chNFe>${a.access_key}</chNFe>`) ||
            !p.p_response_xml.includes(`<tpAmb>${a.environment}</tpAmb>`)))
      )
        return { data: null, error: { message: 'FISCAL_PROTOCOL_MISMATCH' } };
      a.state = p.p_state;
      a.response_history.push(p);
      Object.assign(documents.find((d) => d.id === a.document_id)!, {
        status:
          p.p_state === 'authorized'
            ? a.environment === 1
              ? 'autorizada'
              : 'homologada'
            : 'pendente',
        numero_protocolo: p.p_protocol,
        xml_protocolo: p.p_response_xml,
      });
      return { data: null, error: null };
    }
    throw new Error(`Unexpected RPC ${name}`);
  });
  return {
    db: { from, rpc } as any,
    attempts,
    documents,
    snapshots,
    counters,
    rpc,
    failPreparation: () => {
      failPreparation = true;
    },
    failResult: () => {
      failResult = true;
    },
    remove65: () => {
      own65 = false;
    },
  };
}
async function emit(d: ReturnType<typeof database>, c = command()) {
  return emitNormalSale(d.db, c, facts(c), {}, 'TEST_UNIT_ACTOR');
}
beforeEach(() => {
  vi.stubEnv('NFE_PRODUCTION_ENABLED', 'true');
  vi.stubEnv('NFE_CERTIFICATE_BASE64', 'TEST_UNIT_A1');
  vi.stubEnv('NFE_RESP_TECH_CNPJ', '12345678000195');
  vi.stubEnv('NFE_RESP_TECH_CONTACT', 'TEST UNIT');
  vi.stubEnv('NFE_RESP_TECH_EMAIL', 'test@example.com');
  vi.stubEnv('NFE_RESP_TECH_PHONE', '41999999999');
  vi.stubEnv('NFE_CSRT_ID', '01');
  vi.stubEnv('NFE_CSRT_SECRET', 'TESTUNITCSRT1234567890');
  vi.stubEnv('NFE_ID_CSRT_PRODUCAO', '01');
  vi.stubEnv('NFE_CSRT_PRODUCAO', 'TESTUNITCSRT1234567890');
  vi.stubEnv('NFE_ID_CSRT_HOMOLOGACAO', '01');
  vi.stubEnv('NFE_CSRT_HOMOLOGACAO', 'TESTUNITCSRT1234567890');
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => [{ id: 4106902, nome: 'Curitiba' }] }))
  );
  mocks.structure.mockResolvedValue(undefined);
  mocks.schema.mockResolvedValue(undefined);
  mocks.sign.mockImplementation((xml: string) =>
    xml.replace('</NFe>', '<Signature>TEST_UNIT</Signature></NFe>')
  );
  mocks.send.mockImplementation(async (p: Record<string, string>) => {
    const key = p.xmlPayload.match(/Id="NFe(\d{44})"/)?.[1];
    if (!key) throw new Error('Unexpected consultation in default fixture');
    return authorization(key, Number(p.xmlPayload.match(/<tpAmb>([12])<\/tpAmb>/)?.[1]));
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('common outbound orchestration (SOAP and PostgreSQL mocked)', () => {
  it.each([1, 2] as const)(
    'prepares and authorizes both models in environment %s with own decisions',
    async (environment) => {
      const d = database();
      const nfe = await emit(d, command(environment, false));
      const nfceCommand = {
        ...command(environment, true),
        orderId: 'TEST_UNIT_NFCE',
        emissionRequestId: 'a19b3e63-6f84-45ea-8c5f-39476d709a3d',
      };
      const nfce = await emit(d, nfceCommand);
      expect(nfe.body).toMatchObject({ success: true, model: '55', environment, nfeNumber: 102 });
      expect(nfce.body).toMatchObject({ success: true, model: '65', environment, nfeNumber: 600 });
      expect(d.snapshots).toHaveLength(2);
      expect(d.rpc.mock.calls.filter(([n]) => n === 'prepare_nfe_outbound_attempt')).toHaveLength(
        2
      );
      expect(d.attempts.map((a) => a.response_history.length)).toEqual([1, 1]);
    }
  );
  it('keeps HML/PROD counters independent', async () => {
    const d = database();
    const first = await emit(d, command(1));
    const second = await emit(d, {
      ...command(2),
      emissionRequestId: 'a19b3e63-6f84-45ea-8c5f-39476d709a3d',
    });
    expect([first.body.nfeNumber, second.body.nfeNumber]).toEqual([102, 102]);
    expect(d.counters.size).toBe(2);
  });
  it('serializes two concurrent emissions without transmitting a losing number', async () => {
    const d = database();
    const results = await Promise.all([
      emit(d),
      emit(d, {
        ...command(),
        orderId: 'TEST_UNIT_SECOND',
        emissionRequestId: 'a19b3e63-6f84-45ea-8c5f-39476d709a3d',
      }),
    ]);
    expect(results.map((r) => r.body.nfeNumber).sort()).toEqual([102, 103]);
    expect(results.every((r) => r.body.success)).toBe(true);
    expect(mocks.send).toHaveBeenCalledTimes(2);
  });
  it('concurrent identical requests create one attempt and send once', async () => {
    const d = database();
    await Promise.all([emit(d), emit(d)]);
    expect(d.attempts).toHaveLength(1);
    expect(d.snapshots).toHaveLength(1);
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
  it('timeout after sending records reconciliation and never automatically resends', async () => {
    const d = database();
    mocks.send.mockRejectedValueOnce(new Error('ETIMEDOUT'));
    const r = await emit(d);
    expect(r.body).toMatchObject({
      success: false,
      pending: true,
      code: 'FISCAL_TRANSMISSION_UNCERTAIN',
    });
    expect(d.attempts[0].state).toBe('reconciling');
    expect(mocks.send).toHaveBeenCalledTimes(1);
    mocks.send.mockResolvedValueOnce(notFound(d.attempts[0]));
    const retry = await recoverNormalSale(d.db, command());
    expect(retry?.body).toMatchObject({ code: 'FISCAL_CONFIRMED_NOT_FOUND', nfeNumber: 102 });
    expect(mocks.send).toHaveBeenCalledTimes(2);
    expect(mocks.send.mock.calls[1][0].xmlPayload).toContain('<xServ>CONSULTAR</xServ>');
    expect(d.attempts).toHaveLength(1);
  });
  it('reconciles an already authorized invoice from the original XML and key', async () => {
    const d = database();
    mocks.send.mockRejectedValueOnce(new Error('timeout'));
    await emit(d);
    const a = d.attempts[0];
    mocks.send.mockResolvedValueOnce(authorization(a.access_key, 1));
    const r = await reconcileNormalSale(d.db, a.document_id);
    expect(r.body).toMatchObject({ success: true, state: 'authorized', nfeNumber: 102 });
    expect(d.documents[0].status).toBe('autorizada');
    expect(d.attempts).toHaveLength(1);
    expect(d.rpc.mock.calls.at(-2)?.[1].p_items).toHaveLength(1);
  });
  it('identical final retry returns the same attempt without SOAP or a new number', async () => {
    const d = database();
    const first = await emit(d);
    const second = await recoverNormalSale(d.db, command());
    expect(second?.body).toMatchObject({
      success: true,
      documentId: first.body.documentId,
      accessKey: first.body.accessKey,
    });
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(d.attempts).toHaveLength(1);
  });
  it.each([
    { finalConsumer: true },
    { requestedNumber: 700 },
    { recipientIe: '1234' },
    { deliveryByIssuer: true },
    {
      itemFiscalSelections: {
        '1': { ncm: '94036000', cfop: '5102', origem: '1', cest: '', csosn: '102' },
      },
    },
  ])('rejects changed fiscal payload with the same idempotency key (%j)', async (change) => {
    const d = database();
    await emit(d);
    const r = await recoverNormalSale(d.db, { ...command(), ...change });
    expect(r?.body.code).toBe('IDEMPOTENCY_KEY_REUSED');
    expect(d.attempts).toHaveLength(1);
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
  it('explicit retry after confirmed 217 queries again and reuses exact signed XML', async () => {
    const d = database();
    mocks.send.mockRejectedValueOnce(new Error('timeout'));
    await emit(d);
    mocks.send.mockResolvedValueOnce(notFound(d.attempts[0]));
    await reconcileNormalSale(d.db, d.documents[0].id);
    const original = d.documents[0].xml_nfe;
    mocks.send.mockResolvedValueOnce(notFound(d.attempts[0]));
    const r = await recoverNormalSale(d.db, command());
    expect(r?.body.success).toBe(true);
    expect(d.documents[0].xml_nfe).toBe(original);
    expect(d.attempts).toHaveLength(1);
    expect(d.counters.values().next().value).toBe(102);
    expect(mocks.send).toHaveBeenCalledTimes(4);
  });
  it('failed preparation leaves no simulated counter, snapshot, attempt or SOAP', async () => {
    const d = database();
    d.failPreparation();
    const r = await emit(d);
    expect(r.body.success).toBe(false);
    expect(d.counters.size).toBe(0);
    expect(d.snapshots).toHaveLength(0);
    expect(d.attempts).toHaveLength(0);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('XML failure happens before any reservation', async () => {
    const d = database();
    mocks.schema.mockRejectedValueOnce(new Error('schema failed'));
    const r = await emit(d);
    expect(r.body).toMatchObject({ success: false, numberReserved: false, sefazContacted: false });
    expect(d.rpc.mock.calls.some(([n]) => n === 'prepare_nfe_outbound_attempt')).toBe(false);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('failed persistence after authorization leaves the durable transmitting state for reconciliation', async () => {
    const d = database();
    d.failResult();
    const r = await emit(d);
    expect(r.body).toMatchObject({ pending: true, code: 'FISCAL_RESULT_PERSIST_FAILED' });
    expect(d.attempts[0].state).toBe('transmitting');
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
  it('partial batch and duplicate status stay pending', async () => {
    for (const cStat of ['103', '104', '105', '204', '539', '999']) {
      const d = database();
      mocks.send.mockResolvedValueOnce(
        `<retEnviNFe><tpAmb>1</tpAmb><cStat>${cStat}</cStat></retEnviNFe>`
      );
      const r = await emit(d);
      expect(r.body.pending).toBe(true);
      expect(d.attempts[0].state).toBe('reconciling');
    }
  });
  it('production flag and confirmation are checked before allocating', async () => {
    const d = database();
    vi.stubEnv('NFE_PRODUCTION_ENABLED', 'false');
    const r = await emit(d);
    expect(r.body.code).toBe('PRODUCTION_EMISSION_DISABLED');
    expect(d.counters.size).toBe(0);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('missing own65 decision cannot fall back to model55', async () => {
    const d = database();
    d.remove65();
    const r = await emit(d, command(1, true));
    expect(r.body.error).toContain('CONTRIBUTION_MODEL_SCOPE_REQUIRED');
    expect(d.counters.size).toBe(0);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('command comparison ignores only consent and object key ordering', () => {
    expect(canonicalFiscalCommand(fiscalAttemptCommand(command()))).toBe(
      canonicalFiscalCommand(fiscalAttemptCommand({ ...command(), productionConfirmed: false }))
    );
    expect(canonicalFiscalCommand({ b: 1, a: { z: 2, x: 3 } })).toBe(
      canonicalFiscalCommand({ a: { x: 3, z: 2 }, b: 1 })
    );
  });
});
