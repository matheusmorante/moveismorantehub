import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  FiscalEmissionCommand,
  FiscalSnapshotCandidate,
} from '../../../../../../api/nfe/fiscalSnapshot';
import { fiscalAttemptCommand } from '../../../../../../api/nfe/normal-sale/attemptPolicy';
import {
  reconcileNormalSale,
  recoverNormalSale,
  describeActiveNormalSaleConflict,
  transmitPreparedOutbound,
} from '../../../../../../api/nfe/normal-sale/outboundAttempt';
import {
  requestId,
  command,
  facts,
  contribution,
  authorization,
  notFound,
  database,
  preview,
  emit,
  emitFromPreview,
  commandWithPreview,
  emitNormalSale,
  canonicalFiscalCommand,
} from './harness/normalOutboundTestHarness';

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  schema: vi.fn(),
  structure: vi.fn(),
  sign: vi.fn(),
  assertSignedXmlMatchesSnapshot: vi.fn(),
}));
const consultationAuthorization = (key: string, environment: number) =>
  `<retConsSitNFe xmlns="http://www.portalfiscal.inf.br/nfe"><tpAmb>${environment}</tpAmb><chNFe>${key}</chNFe><cStat>100</cStat><protNFe><infProt><tpAmb>${environment}</tpAmb><chNFe>${key}</chNFe><cStat>100</cStat><xMotivo>Autorizado</xMotivo><nProt>141260000000001</nProt><dhRecbto>2026-10-07T12:00:00-03:00</dhRecbto></infProt></protNFe></retConsSitNFe>`;
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
vi.mock('../../../../../../api/nfe/fiscalXmlAudit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../../../api/nfe/fiscalXmlAudit')>()),
  assertSignedFiscalXmlMatchesSnapshot: mocks.assertSignedXmlMatchesSnapshot,
}));


beforeEach(() => {
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
  mocks.assertSignedXmlMatchesSnapshot.mockReturnValue(undefined);
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
  it.each([true, false])('blocks non-final sales to non-contributors before numbering (previewOnly=%s)', async (previewOnly) => {
    const d = database();
    const invalidCommand = { ...command(2, false), recipientIeIndicator: '9' as const, recipientIe: '', previewOnly };
    const result = await emitNormalSale(d.db, invalidCommand, facts(invalidCommand), {}, 'TEST_UNIT_ACTOR');

    expect(result.body).toMatchObject({ success: false, numberReserved: false, sefazContacted: false });
    expect(result.body.error).toContain('consumidor final');
    expect(d.rpc).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
    expect(d.attempts).toHaveLength(0);
    expect(d.documents).toHaveLength(0);
  });

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
    expect(results.every((r) => r.body.success)).toBe(true);
    expect(d.attempts.map((a) => a.number).sort()).toEqual([102, 103]);
    expect(new Set(d.attempts.map((a) => a.access_key)).size).toBe(2);
    expect(mocks.send).toHaveBeenCalledTimes(2);
    for (const attempt of d.attempts) {
      expect(mocks.send.mock.calls.filter(([p]) =>
        p.xmlPayload.includes(`Id="NFe${attempt.access_key}"`)
      )).toHaveLength(1);
    }
  });
  it('concurrent identical requests create one attempt and send once', async () => {
    const d = database();
    const c = command();
    const prepared = await preview(d, c);
    await Promise.all([emitFromPreview(d, c, prepared), emitFromPreview(d, c, prepared)]);
    expect(d.attempts).toHaveLength(1);
    expect(d.snapshots).toHaveLength(1);
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
  it.each([1, 2] as const)('identifies the original active attempt for a losing request in environment %s without sending again', async (environment) => {
    const d = database();
    const original = command(environment, environment === 2);
    mocks.send.mockRejectedValueOnce(new Error('ETIMEDOUT'));
    const first = await emit(d, original);
    const losing = await emit(d, { ...original, emissionRequestId: 'a19b3e63-6f84-45ea-8c5f-39476d709a3d' });
    expect(losing.status).toBe(409);
    expect(losing.body).toMatchObject({
      pending: true,
      databaseReason: 'ALREADY_ACTIVE_FISCAL_ATTEMPT',
      documentId: first.body.documentId,
      emissionRequestId: original.emissionRequestId,
      accessKey: first.body.accessKey,
      nfeNumber: first.body.nfeNumber,
      environment,
      numberReserved: false,
      sefazContacted: false,
    });
    expect(losing.body.error).toBe('Já existe uma tentativa fiscal em andamento para este pedido. Consulte a tentativa original antes de continuar.');
    expect(d.attempts).toHaveLength(1);
    expect(d.snapshots).toHaveLength(1);
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
  it('does not select a conflicting attempt from another order, environment, issuer or an ambiguous set', async () => {
    const d = database();
    mocks.send.mockRejectedValueOnce(new Error('ETIMEDOUT'));
    await emit(d);
    const scope = { orderId: command().orderId, environment: 1 as const };
    for (const [candidate, issuer] of [
      [{ ...scope, orderId: 'TEST_UNIT_OTHER' }, '12345678000195'],
      [{ ...scope, environment: 2 as const }, '12345678000195'],
      [scope, '98765432000198'],
    ] as const) {
      const missing = await describeActiveNormalSaleConflict(d.db, candidate, issuer);
      expect(missing.status).toBe(503);
      expect(missing.body).toMatchObject({ pending: true, code: 'FISCAL_RECOVERY_UNAVAILABLE', numberReserved: false });
      expect(missing.body).not.toHaveProperty('documentId');
    }
    d.attempts.push({ ...d.attempts[0], document_id: 'TEST_UNIT_AMBIGUOUS' });
    const ambiguous = await describeActiveNormalSaleConflict(d.db, scope, '12345678000195');
    expect(ambiguous.status).toBe(503);
    expect(ambiguous.body).not.toHaveProperty('documentId');
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
    const retry = await recoverNormalSale(d.db, commandWithPreview(d));
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
    mocks.send.mockResolvedValueOnce(consultationAuthorization(a.access_key, 1));
    const r = await reconcileNormalSale(d.db, a.document_id);
    expect(r.body).toMatchObject({ success: true, state: 'authorized', nfeNumber: 102 });
    expect(d.documents[0].status).toBe('autorizada');
    expect(d.attempts).toHaveLength(1);
    expect(d.rpc.mock.calls.at(-2)?.[1].p_items).toHaveLength(1);
  });
  it.each(['invalid_protocol', 'missing_date', 'wrong_outer_key', 'wrong_namespace', 'duplicate_protocol', 'wrong_outer_environment'])(
    'never persists an authorized reconciliation from %s', async (variant) => {
      const d = database();
      mocks.send.mockRejectedValueOnce(new Error('timeout'));
      await emit(d);
      const a = d.attempts[0];
      let response = consultationAuthorization(a.access_key, 1);
      if (variant === 'invalid_protocol') response = response.replace('141260000000001', 'INVALID_CONTROLLED_PROTOCOL');
      if (variant === 'missing_date') response = response.replace(/<dhRecbto>.*?<\/dhRecbto>/, '');
      if (variant === 'wrong_outer_key') response = response.replace(`<chNFe>${a.access_key}</chNFe>`, `<chNFe>${a.access_key.slice(0, -1)}0</chNFe>`);
      if (variant === 'wrong_namespace') response = response.replace('http://www.portalfiscal.inf.br/nfe', 'urn:invalid');
      if (variant === 'duplicate_protocol') response = response.replace('</infProt>', '<nProt>141260000000002</nProt></infProt>');
      if (variant === 'wrong_outer_environment') response = response.replace('<tpAmb>1</tpAmb>', '<tpAmb>2</tpAmb>');
      const before = d.rpc.mock.calls.length;
      mocks.send.mockResolvedValueOnce(response);
      const result = await reconcileNormalSale(d.db, a.document_id);
      expect(result.body).toMatchObject({ success: false, pending: true, state: 'unknown' });
      expect(d.rpc.mock.calls.slice(before).some(([name, args]) => name === 'persist_nfe_outbound_result' && args.p_state === 'authorized')).toBe(false);
      expect(d.attempts[0].state).toBe('reconciling');
      expect(d.documents[0].numero_protocolo).toBeNull();
      expect(mocks.send).toHaveBeenCalledTimes(2);
    }
  );
  it('identical final retry returns the same attempt without SOAP or a new number', async () => {
    const d = database();
    const first = await emit(d);
    vi.stubEnv('NFE_CERTIFICATE_BASE64', '');
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
    const r = await recoverNormalSale(d.db, commandWithPreview(d));
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
  it('lost preparation response preserves the committed attempt without starting transmission', async () => {
    const d = database();
    const rpc = d.rpc.getMockImplementation()!;
    d.rpc.mockImplementation(async (name, args) => {
      const result = await rpc(name, args);
      if (name === 'prepare_nfe_outbound_attempt') throw new Error('TEST_UNIT_RESPONSE_LOST');
      return result;
    });
    const r = await emit(d);
    expect(r.body).toMatchObject({
      pending: true,
      numberReserved: true,
      emissionRequestId: requestId,
    });
    expect(d.attempts).toHaveLength(1);
    expect(mocks.send).not.toHaveBeenCalled();
    d.rpc.mockImplementation(rpc);
    d.attempts[0].attempt_token = null;
    const resumed = await recoverNormalSale(d.db, commandWithPreview(d));
    expect(resumed?.body).toMatchObject({ success: true, nfeNumber: 102 });
    expect(d.attempts).toHaveLength(1);
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
  it('unknown preparation failure keeps the intent pending without claiming no number was reserved', async () => {
    const d = database();
    const rpc = d.rpc.getMockImplementation()!;
    d.rpc.mockImplementation(async (name, args) => {
      if (name === 'prepare_nfe_outbound_attempt') throw new Error('TEST_UNIT_NETWORK_LOSS');
      return rpc(name, args);
    });
    const r = await emit(d);
    expect(r.body).toMatchObject({
      pending: true,
      code: 'FISCAL_PREPARATION_UNCONFIRMED',
      emissionRequestId: requestId,
      sefazContacted: false,
    });
    expect(r.body.numberReserved).toBeUndefined();
    expect(d.attempts).toHaveLength(0);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('cancelled final document is preserved and cannot be emitted again by the same intent', async () => {
    const d = database();
    await emit(d);
    d.documents[0].status = 'cancelada';
    const r = await recoverNormalSale(d.db, commandWithPreview(d));
    expect(r?.body).toMatchObject({
      success: false,
      state: 'cancelled',
      code: 'FISCAL_ALREADY_CANCELLED',
    });
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(d.attempts).toHaveLength(1);
  });
  it('reconciles an existing production key independently of runtime configuration', async () => {
    const d = database();
    mocks.send.mockRejectedValueOnce(new Error('timeout'));
    await emit(d);
    mocks.send.mockResolvedValueOnce(consultationAuthorization(d.attempts[0].access_key, 1));
    const r = await reconcileNormalSale(d.db, d.documents[0].id);
    expect(r.body).toMatchObject({ success: true, state: 'authorized' });
    expect(mocks.send.mock.calls[1][0].xmlPayload).toContain('<xServ>CONSULTAR</xServ>');
    expect(d.attempts).toHaveLength(1);
  });
  it('XML failure happens before any reservation', async () => {
    const d = database();
    mocks.schema.mockRejectedValueOnce(new Error('schema failed'));
    const r = await emit(d);
    expect(r.body).toMatchObject({ success: false, numberReserved: false, sefazContacted: false });
    expect(d.rpc.mock.calls.some(([n]) => n === 'prepare_nfe_outbound_attempt')).toBe(false);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('blocks an NF-e 55 referencing NFC-e 65 before start RPC or another SOAP send', async () => {
    const d = database();
    await emit(d, command(2));
    const attempt = d.attempts[0];
    const document = d.documents[0];
    const nfceAccessKey = `${'1'.repeat(20)}65${'1'.repeat(22)}`;
    document.xml_nfe = document.xml_nfe.replace(
      '</ide>',
      `<NFref><refNFe>${nfceAccessKey}</refNFe></NFref></ide>`
    );
    attempt.xml_sha256 = createHash('sha256').update(document.xml_nfe).digest('hex');
    const startsBefore = d.rpc.mock.calls.filter(
      ([name]) => name === 'start_nfe_outbound_transmission'
    ).length;
    const sendsBefore = mocks.send.mock.calls.length;

    const result = await transmitPreparedOutbound(
      d.db,
      attempt as Parameters<typeof transmitPreparedOutbound>[1],
      document as Parameters<typeof transmitPreparedOutbound>[2],
      'TEST_UNIT_RECHECK',
      { certPem: 'TEST_UNIT', privateKeyPem: 'TEST_UNIT' } as Parameters<
        typeof transmitPreparedOutbound
      >[4],
      false
    );

    expect(result).toMatchObject({
      status: 422,
      body: {
        code: 'FISCAL_TRANSMISSION_INTEGRITY_FAILED',
        sefazContacted: false,
      },
    });
    expect(result.body.error).toMatch(/não pode referenciar chave de NFC-e modelo 65/);
    expect(
      d.rpc.mock.calls.filter(([name]) => name === 'start_nfe_outbound_transmission')
    ).toHaveLength(startsBefore);
    expect(mocks.send).toHaveBeenCalledTimes(sendsBefore);
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
  it('requires explicit production confirmation before allocating', async () => {
    const d = database();
    const r = await emit(d, { ...command(), productionConfirmed: false });
    expect(r.body.code).toBe('PRODUCTION_CONFIRMATION_REQUIRED');
    expect(d.counters.size).toBe(0);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('missing shared decision blocks before number reservation or SEFAZ contact', async () => {
    const d = database();
    d.removeContributionDecision();
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
