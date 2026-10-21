import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supportFixtureProvisionSchema } from '../../../shared-utils/customerSupportFormSchemas';

export const projectRef = 'hkoxhourxwlddgsfdgws';
export const expectedOrigin = `https://${projectRef}.supabase.co`;
export const authorization = 'central-reopening-fixtures-2026-10-21';
export const expectedRunId = '8eaed14f-364d-47ab-be41-66be54b3fb65';
export const expectedOwnerId = '13eab361-be48-4e49-be4b-4ad79813b812';
export const scenarioKey = 'support-reopening';

export interface ReopeningManifest {
  projectRef: string; runId: string; ownerId: string; scenarioKey: string;
  conversationIds: string[]; principalConversationId: string; initialIds: string[];
  inputHash: string; messageLimit: number; workingMessageLimit: number; cleanupReserved: number;
  negativeGatesPassed: boolean; businessWritesAuthorized: boolean; cleanupCompleted?: boolean;
  backendStarted?: boolean; backendProof?: { passed: boolean; messageCount: number; completedAt: string };
  uiStarted?: boolean; uiProof?: { passed: boolean; messageCount: number; completedAt: string };
  cleanupProof?: { before: number; after: number; archived: number; completedAt: string };
}

export function readRequest() {
  if (process.env.MORANTE_ENV_SOURCE !== 'vercel-development' || process.env.VERCEL_ENV !== 'development'
    || !process.env.SUPPORT_REOPENING_INPUT || !process.env.SUPPORT_REOPENING_MANIFEST) {
    throw new Error('Use o launcher Vercel Development com a solicitação e manifesto deste lote.');
  }
  const envelope = JSON.parse(readFileSync(resolve(process.env.SUPPORT_REOPENING_INPUT), 'utf8'));
  const request = supportFixtureProvisionSchema.parse(envelope.request);
  if (envelope.projectRef !== projectRef || envelope.authorization !== authorization || envelope.approved !== true
    || envelope.expectedOwnerId !== expectedOwnerId || request.runId !== expectedRunId || request.scenarioKey !== scenarioKey
    || request.contactNames.length !== 4 || request.history.length !== 1
    || envelope.limits?.conversations !== 5 || envelope.limits?.messagesAndEvents !== 68
    || envelope.limits?.workingRows !== 63 || envelope.limits?.cleanupReserved !== 5) {
    throw new Error('Operação não corresponde à autorização concreta do lote de reabertura.');
  }
  return request;
}

export function readManifest(): ReopeningManifest | null {
  const path = resolve(process.env.SUPPORT_REOPENING_MANIFEST!);
  if (!existsSync(path)) return null;
  const manifest = JSON.parse(readFileSync(path, 'utf8')) as ReopeningManifest;
  if (manifest.projectRef !== projectRef || manifest.runId !== expectedRunId || manifest.ownerId !== expectedOwnerId
    || manifest.scenarioKey !== scenarioKey || manifest.cleanupCompleted) {
    throw new Error('Manifesto divergente ou execução já encerrada; não reutilizar fixtures retidas.');
  }
  return manifest;
}

export function saveManifest(manifest: ReopeningManifest) {
  writeFileSync(resolve(process.env.SUPPORT_REOPENING_MANIFEST!), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
}

export function makeClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || new URL(url).origin !== expectedOrigin || !key) throw new Error('Projeto remoto divergente ou ambiente incompleto.');
  const restrictedFetch: typeof fetch = (input, init) => {
    const target = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (target.origin !== expectedOrigin) throw new Error('Destino externo proibido na prova de reabertura.');
    return fetch(input, { ...init, signal: init?.signal || AbortSignal.timeout(20_000) });
  };
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: restrictedFetch } });
}

export async function signInOperator(client: SupabaseClient) {
  const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim();
  const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
  if (!email || !password) throw new Error('Credenciais oficiais ausentes; não solicitar login manual.');
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error || login.data.user?.id !== expectedOwnerId || !login.data.session) {
    throw new Error('Login não confirmou o proprietário autorizado.');
  }
  const gate = await fetch('http://127.0.0.1:3000/api/testing/test-artifact-operator', { method: 'POST',
    headers: { Authorization: `Bearer ${login.data.session.access_token}` }, signal: AbortSignal.timeout(10_000) });
  const permission = await client.rpc('customer_support_can_view');
  const admin = await client.rpc('is_administrator');
  if (gate.status !== 204 || permission.error || permission.data !== true || admin.error || admin.data !== true) {
    throw new Error('Gate real, permissão ou identidade administrativa não comprovados.');
  }
}
