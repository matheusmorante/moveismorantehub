import { supabase } from '@/pages/utils/supabaseConfig';

export const SYNTHETIC_SALES_SCENARIO_VERSION = 1 as const;

export type SyntheticFixturePhase =
  | 'reserved'
  | 'customer'
  | 'product'
  | 'seller'
  | 'order'
  | 'audit'
  | 'complete';

export type SyntheticFixtureEntityState = 'pending' | 'created' | 'audited';

export type SyntheticSalesScenarioRun = {
  id: string;
  scenarioKey: string;
  scenarioVersion: number;
  payloadHash: string;
  status: 'pending' | 'in_progress' | 'failed' | 'complete';
  phase: SyntheticFixturePhase;
  customerId: string;
  customerState: SyntheticFixtureEntityState;
  productId: string;
  productState: SyntheticFixtureEntityState;
  variationId: string;
  sellerId: string | null;
  orderId: string;
  orderState: SyntheticFixtureEntityState;
  leaseToken: string | null;
  claimed: boolean;
  auditSummary: Record<string, unknown>;
};

export type SyntheticSalesScenarioProgress = Partial<
  Pick<
    SyntheticSalesScenarioRun,
    | 'status'
    | 'phase'
    | 'customerState'
    | 'productState'
    | 'sellerId'
    | 'orderState'
    | 'auditSummary'
  >
> & {
  lastErrorCode?: string | null;
  releaseLease?: boolean;
};

const RUN_COLUMNS =
  'id,scenario_key,scenario_version,payload_hash,status,phase,customer_id,customer_state,product_id,product_state,variation_id,seller_id,order_id,order_state,lease_token,audit_summary';

const mapRun = (row: Record<string, unknown>, claimed = false): SyntheticSalesScenarioRun => ({
  id: String(row.id),
  scenarioKey: String(row.scenario_key),
  scenarioVersion: Number(row.scenario_version),
  payloadHash: String(row.payload_hash),
  status: row.status as SyntheticSalesScenarioRun['status'],
  phase: row.phase as SyntheticFixturePhase,
  customerId: String(row.customer_id),
  customerState: row.customer_state as SyntheticFixtureEntityState,
  productId: String(row.product_id),
  productState: row.product_state as SyntheticFixtureEntityState,
  variationId: String(row.variation_id),
  sellerId: row.seller_id ? String(row.seller_id) : null,
  orderId: String(row.order_id),
  orderState: row.order_state as SyntheticFixtureEntityState,
  leaseToken: row.lease_token ? String(row.lease_token) : null,
  claimed,
  auditSummary: (row.audit_summary as Record<string, unknown>) || {},
});

export async function claimSyntheticSalesScenario(
  scenarioKey: string,
  payloadHash: string,
  leaseToken = globalThis.crypto.randomUUID()
): Promise<SyntheticSalesScenarioRun> {
  const { data, error } = await supabase.rpc('claim_synthetic_sales_scenario', {
    p_scenario_key: scenarioKey,
    p_scenario_version: SYNTHETIC_SALES_SCENARIO_VERSION,
    p_payload_hash: payloadHash,
    p_lease_token: leaseToken,
  });
  if (error) throw error;
  if (!data || typeof data !== 'object') {
    throw new Error('O registro de idempotência da fixture não foi confirmado.');
  }

  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    scenarioKey: String(row.scenarioKey),
    scenarioVersion: Number(row.scenarioVersion),
    payloadHash: String(row.payloadHash),
    status: row.status as SyntheticSalesScenarioRun['status'],
    phase: row.phase as SyntheticFixturePhase,
    customerId: String(row.customerId),
    customerState: row.customerState as SyntheticFixtureEntityState,
    productId: String(row.productId),
    productState: row.productState as SyntheticFixtureEntityState,
    variationId: String(row.variationId),
    sellerId: row.sellerId ? String(row.sellerId) : null,
    orderId: String(row.orderId),
    orderState: row.orderState as SyntheticFixtureEntityState,
    leaseToken: row.leaseToken ? String(row.leaseToken) : null,
    claimed: row.claimed === true,
    auditSummary: (row.auditSummary as Record<string, unknown>) || {},
  };
}

export async function updateSyntheticSalesScenario(
  run: SyntheticSalesScenarioRun,
  progress: SyntheticSalesScenarioProgress
): Promise<SyntheticSalesScenarioRun> {
  if (!run.leaseToken) throw new Error('A fixture não possui uma reserva ativa.');
  const values: Record<string, unknown> = {};
  if (progress.status) values.status = progress.status;
  if (progress.phase) values.phase = progress.phase;
  if (progress.customerState) values.customer_state = progress.customerState;
  if (progress.productState) values.product_state = progress.productState;
  if (progress.sellerId !== undefined) values.seller_id = progress.sellerId;
  if (progress.orderState) values.order_state = progress.orderState;
  if (progress.auditSummary) values.audit_summary = progress.auditSummary;
  if (progress.lastErrorCode !== undefined) values.last_error_code = progress.lastErrorCode;
  values.lease_until = progress.releaseLease
    ? null
    : new Date(Date.now() + 15 * 60 * 1000).toISOString();
  if (progress.releaseLease) values.lease_token = null;

  const { data, error } = await supabase
    .from('synthetic_sales_scenarios')
    .update(values)
    .eq('id', run.id)
    .eq('lease_token', run.leaseToken)
    .select(RUN_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('A reserva da fixture expirou ou foi assumida por outra execução.');
  const updated = mapRun(data as Record<string, unknown>);
  return {
    ...updated,
    leaseToken: progress.releaseLease ? null : run.leaseToken,
    claimed: !progress.releaseLease,
  };
}

export async function loadSyntheticSalesScenario(
  scenarioKey: string
): Promise<SyntheticSalesScenarioRun | null> {
  const { data, error } = await supabase
    .from('synthetic_sales_scenarios')
    .select(RUN_COLUMNS)
    .eq('scenario_key', scenarioKey)
    .eq('scenario_version', SYNTHETIC_SALES_SCENARIO_VERSION)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRun(data as Record<string, unknown>) : null;
}

export async function loadSyntheticSalesScenarioById(
  id: string
): Promise<SyntheticSalesScenarioRun | null> {
  const { data, error } = await supabase
    .from('synthetic_sales_scenarios')
    .select(RUN_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRun(data as Record<string, unknown>) : null;
}
