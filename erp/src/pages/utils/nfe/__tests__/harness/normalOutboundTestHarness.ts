import { createHash } from 'node:crypto';
import { vi } from 'vitest';
import { emitNormalSale } from '../../../../../../../api/nfe/emitNormalSale';
import type {
  FiscalEmissionCommand,
  FiscalSnapshotCandidate,
} from '../../../../../../../api/nfe/fiscalSnapshot';
import { canonicalFiscalCommand } from '../../../../../../../api/nfe/normal-sale/attemptPolicy';

export { emitNormalSale, canonicalFiscalCommand };
export type { FiscalEmissionCommand, FiscalSnapshotCandidate };

export const requestId = 'f19b3e63-6f84-45ea-8c5f-39476d709a3d';

export const command = (
  environment: 1 | 2 = 1,
  finalConsumer = false
): FiscalEmissionCommand => ({
  orderId: 'TEST_UNIT_PRODUCTION',
  environment,
  emissionRequestId: requestId,
  productionConfirmed: environment === 1,
  finalConsumer,
  recipientIeIndicator: finalConsumer ? '9' : '1',
  recipientIe: finalConsumer ? '' : '1234567890',
  itemFiscalSelections: {
    '1': { ncm: '94036000', cfop: '5102', origem: '0', cest: '', csosn: '102' },
  },
});

export const facts = (c: FiscalEmissionCommand): FiscalSnapshotCandidate => ({
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
    recipientIeIndicator: c.recipientIeIndicator,
    recipientIe: c.recipientIe,
    itemFiscalSelections: c.itemFiscalSelections,
  },
});

export const contribution = () => ({
  scope: { models: ['55', '65'], operation: 'normal_sale', issuerCrt: '1' },
  pis: { cst: '99', base: 0, rate: 0, value: 0 },
  cofins: { cst: '99', base: 0, rate: 0, value: 0 },
  confirmedAt: '2026-09-01T00:00:00Z',
  confirmedBy: 'TEST_UNIT_SHARED_DECISION',
});

export function authorization(key: string, environment: number, protocol = '141260000000001') {
  return `<retEnviNFe><tpAmb>${environment}</tpAmb><cStat>104</cStat><protNFe><infProt><tpAmb>${environment}</tpAmb><chNFe>${key}</chNFe><cStat>100</cStat><xMotivo>Autorizado</xMotivo><nProt>${protocol}</nProt><dhRecbto>2026-10-07T12:00:00-03:00</dhRecbto></infProt></protNFe></retEnviNFe>`;
}

export const notFound = (a: Record<string, any>) =>
  `<retConsSitNFe><tpAmb>${a.environment}</tpAmb><chNFe>${a.access_key}</chNFe><cStat>217</cStat><xMotivo>Não consta</xMotivo></retConsSitNFe>`;

export type MockDatabase = ReturnType<typeof database>;

/** In-memory API adapter. Real PostgreSQL assertions are in supabase/tests/commonOutboundEmission.sql. */
export function database() {
  const attempts: Record<string, any>[] = [];
  const documents: Record<string, any>[] = [];
  const snapshots: Record<string, any>[] = [];
  const counters = new Map<string, number>();
  let failPreparation = false;
  let failResult = false;
  let contributionDecisionPresent = true;
  const settings = [
    {
      id: 'fiscal_decision_simples_normal_sale_v1',
      data: contribution(),
    },
  ];
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
                ? settings.filter(() => contributionDecisionPresent)
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
        return { data: null, error: { message: 'TEST_UNIT_PREPARATION_FAILURE', code: '23514' } };
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
    removeContributionDecision: () => {
      contributionDecisionPresent = false;
    },
  };
}

export type PreviewRun = {
  candidate: FiscalSnapshotCandidate;
  proof?: NonNullable<FiscalEmissionCommand['previewProof']>;
  result: Awaited<ReturnType<typeof emitNormalSale>>;
};

const previewProofs = new WeakMap<
  object,
  Map<string, NonNullable<FiscalEmissionCommand['previewProof']>>
>();

export async function preview(
  d: MockDatabase,
  c = command()
): Promise<PreviewRun> {
  const candidate = facts(c);
  const result = await emitNormalSale(
    d.db,
    { ...c, previewOnly: true },
    candidate,
    {},
    'TEST_UNIT_ACTOR'
  );
  const proof = result.body.previewProof;
  if (proof) {
    const byRequest = previewProofs.get(d) || new Map();
    byRequest.set(c.emissionRequestId, proof);
    previewProofs.set(d, byRequest);
  }
  return { candidate, proof, result };
}

export async function emitFromPreview(
  d: MockDatabase,
  c: FiscalEmissionCommand,
  prepared: PreviewRun
) {
  if (!prepared.proof) return prepared.result;
  return emitNormalSale(
    d.db,
    { ...c, previewProof: prepared.proof },
    prepared.candidate,
    {},
    'TEST_UNIT_ACTOR'
  );
}

export async function emit(d: MockDatabase, c = command()) {
  return emitFromPreview(d, c, await preview(d, c));
}

export function commandWithPreview(d: MockDatabase, c = command()) {
  const proof = previewProofs.get(d)?.get(c.emissionRequestId);
  return proof ? { ...c, previewProof: proof } : c;
}
