import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import type { FullConfig } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const { loadPersistedFiscalOrder } = require('../../../../scripts/testing/fiscal-persisted-artifact.cjs') as {
  loadPersistedFiscalOrder: (client: unknown, input: {
    orderId: string;
    runId: string;
    expectedEmail: string;
  }) => Promise<{ id: string; orderIndex: string; customerSearchLabel: string }>;
};

interface TestArtifactPolicyStatus {
  ready?: boolean;
  policyVersion?: string;
  behavioralProofRequired?: boolean;
}

function expectedProjectRef(): string {
  const projectRefPath = path.resolve(__dirname, '../../../../supabase/.temp/project-ref');
  const ref = fs.readFileSync(projectRefPath, 'utf8').trim();
  if (!/^[a-z0-9]{20}$/.test(ref)) {
    throw new Error('E2E fiscal bloqueado: ref local do Supabase inválida.');
  }
  return ref;
}

export default async function fiscalPolicyGlobalSetup(_config: FullConfig): Promise<void> {
  const projectRef = expectedProjectRef();
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const operatorEmail = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim().toLowerCase();
  const operatorPassword = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
  const runId = process.env.FISCAL_E2E_RUN_ID;
  const orderId = process.env.FISCAL_E2E_ORDER_ID;
  if (!url || !serviceKey || !anonKey || !operatorEmail || !operatorPassword || !runId || !orderId ||
      process.env.FISCAL_E2E_ALLOWED_SUPABASE_REF !== projectRef) {
    throw new Error('E2E fiscal bloqueado: faltam os parâmetros verificados do Supabase vinculado.');
  }

  const endpoint = new URL('/rest/v1/rpc/test_artifact_policy_status', url);
  const headers: Record<string, string> = {
    apikey: serviceKey,
    'content-type': 'application/json',
  };
  // Legacy service_role keys are JWTs; new Supabase secret keys must only be
  // sent as apikey, because they are not bearer tokens.
  if (serviceKey.startsWith('eyJ')) headers.authorization = `Bearer ${serviceKey}`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: '{}',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error('E2E fiscal bloqueado: não foi possível consultar o status de proteção do Supabase.');
  }
  if (!response.ok) {
    throw new Error('E2E fiscal bloqueado: RPC read-only de status ausente ou inacessível.');
  }

  let status: TestArtifactPolicyStatus;
  try {
    status = (await response.json()) as TestArtifactPolicyStatus;
  } catch {
    throw new Error('E2E fiscal bloqueado: resposta inválida do status de proteção do Supabase.');
  }
  if (
    status.ready !== true ||
    status.policyVersion !== 'json-artifacts-v1' ||
    status.behavioralProofRequired !== false
  ) {
    throw new Error('E2E fiscal bloqueado: instalação dos guards ou prova comportamental ainda pendente.');
  }

  const operator = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: login, error: loginError } = await operator.auth.signInWithPassword({
    email: operatorEmail,
    password: operatorPassword,
  });
  if (loginError || !login.session) {
    throw new Error('E2E fiscal bloqueado: a autenticação do operador configurado falhou.');
  }
  const { data: userData, error: userError } = await operator.auth.getUser(login.session.access_token);
  if (userError || !userData.user?.id || userData.user.email?.trim().toLowerCase() !== operatorEmail) {
    throw new Error('E2E fiscal bloqueado: a sessão não corresponde ao operador configurado.');
  }
  const { data: isAdministrator, error: permissionError } = await operator.rpc('is_administrator');
  if (permissionError || isAdministrator !== true) {
    throw new Error('E2E fiscal bloqueado: o operador autenticado não tem permissão administrativa.');
  }

  const artifact = await loadPersistedFiscalOrder(operator, { orderId, runId, expectedEmail: operatorEmail });
  process.env.FISCAL_E2E_SELECTED_ORDER_ID = artifact.id;
  process.env.FISCAL_E2E_SELECTED_ORDER_INDEX = artifact.orderIndex;
  process.env.FISCAL_E2E_CUSTOMER_SEARCH_LABEL = artifact.customerSearchLabel;
}
