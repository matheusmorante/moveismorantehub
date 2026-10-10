import fs from 'node:fs';
import path from 'node:path';
import type { FullConfig } from '@playwright/test';

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
  const apiKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !apiKey || process.env.FISCAL_E2E_ALLOWED_SUPABASE_REF !== projectRef) {
    throw new Error('E2E fiscal bloqueado: faltam os parâmetros verificados do Supabase vinculado.');
  }

  const endpoint = new URL('/rest/v1/rpc/test_artifact_policy_status', url);
  const headers: Record<string, string> = {
    apikey: apiKey,
    'content-type': 'application/json',
  };
  // Legacy service_role keys are JWTs; new Supabase secret keys must only be
  // sent as apikey, because they are not bearer tokens.
  if (apiKey.startsWith('eyJ')) headers.authorization = `Bearer ${apiKey}`;

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
}
