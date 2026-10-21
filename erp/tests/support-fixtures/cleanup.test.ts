import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { updateConversationStatus } from '../../src/pages/utils/customerSupport/customerSupportService';
import { supportConversationCommandSchema } from '../../../shared-utils/customerSupportFormSchemas';

const execute = process.env.RUN_SUPPORT_FIXTURE_CLEANUP === '1';
let client: SupabaseClient;
let manifest: any;
let manifestPath: string;
let openIds: string[];
let beforeMessages: number;
let preflightPassed = false;

describe.sequential('Retenção e limpeza das fixtures da própria execução', () => {
  beforeAll(async () => {
    if (process.env.MORANTE_ENV_SOURCE !== 'vercel-development' || process.env.VERCEL_ENV !== 'development'
      || !process.env.SUPPORT_FIXTURE_MANIFEST_OUTPUT) throw new Error('Limpeza exige ambiente oficial e manifesto próprio.');
    manifestPath = resolve(process.env.SUPPORT_FIXTURE_MANIFEST_OUTPUT);
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (manifest.projectRef !== 'hkoxhourxwlddgsfdgws' || manifest.uiProof?.folderDeleted !== true
      || manifest.backendProof?.noteConflictDetected !== true || manifest.conversationIds?.length !== 51) {
      throw new Error('Provas de UI/backend e exclusão da pasta devem estar concluídas.');
    }
    if (execute && (manifest.cleanupEventBudgetAuthorized !== 71 || manifest.cleanupCompleted)) {
      throw new Error('A reserva de 51 eventos de arquivamento precisa de autorização específica ainda não consumida.');
    }
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim();
    const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
    if (!url || new URL(url).origin !== 'https://hkoxhourxwlddgsfdgws.supabase.co' || !key || !email || !password) {
      throw new Error('Projeto ou credenciais oficiais ausentes.');
    }
    const restrictedFetch: typeof fetch = (input, init) => {
      const target = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
      if (target.origin !== 'https://hkoxhourxwlddgsfdgws.supabase.co') throw new Error('Destino externo proibido.');
      return fetch(input, { ...init, signal: init?.signal || AbortSignal.timeout(25_000) });
    };
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: restrictedFetch } });
    const login = await client.auth.signInWithPassword({ email, password });
    if (login.error || !login.data.session || login.data.user?.id !== manifest.ownerId) throw new Error('Operador divergente da execução.');
    const gate = await fetch('http://127.0.0.1:3000/api/testing/test-artifact-operator', { method: 'POST',
      headers: { Authorization: `Bearer ${login.data.session.access_token}` }, signal: AbortSignal.timeout(10_000) });
    if (gate.status !== 204) throw new Error('Gate real do operador recusou a limpeza.');
  });
  afterAll(async () => { if (client) await client.auth.signOut({ scope: 'local' }); });

  it('confere ownership, estado, retenção e quantidade exata antes de alterar', async () => {
    const remote = await client.rpc('customer_support_test_fixture_manifest', { p_run_id: manifest.runId });
    expect(Boolean(remote.error)).toBe(false);
    expect(remote.data.ownerId === manifest.ownerId
      && JSON.stringify([...remote.data.conversationIds].sort()) === JSON.stringify([...manifest.conversationIds].sort())).toBe(true);
    const rows = await client.from('whatsapp_conversations').select('id, is_archived, tags, customer_id')
      .in('id', manifest.conversationIds);
    expect(Boolean(rows.error)).toBe(false);
    expect(rows.data?.length).toBe(51);
    expect(rows.data?.every((row) => row.customer_id === null)).toBe(true);
    openIds = rows.data!.filter((row) => !row.is_archived && !row.tags?.includes('status:closed')).map((row) => row.id);
    const messages = await client.from('whatsapp_messages').select('conversation_id, raw_payload, api_message_id, media_id')
      .in('conversation_id', manifest.conversationIds);
    expect(Boolean(messages.error)).toBe(false);
    beforeMessages = messages.data!.length;
    expect(beforeMessages).toBeGreaterThanOrEqual(131);
    expect(messages.data?.every((row) => row.raw_payload?.testArtifact?.runId === manifest.runId
      && row.raw_payload?.testArtifact?.ownerId === manifest.ownerId && row.api_message_id === null && row.media_id === null)).toBe(true);
    const anchors = messages.data!.filter((row) => row.raw_payload?.supportFixtureAnchor === true);
    expect(new Set(anchors.map((row) => row.conversation_id)).size).toBe(51);
    const folders = await client.from('customer_support_inboxes').select('id', { count: 'exact', head: true })
      .eq('created_by', manifest.ownerId).contains('criteria', { testArtifact: { runId: manifest.runId, ownerId: manifest.ownerId } });
    expect(Boolean(folders.error)).toBe(false);
    expect(folders.count).toBe(0);
    if (execute) {
      expect(remote.data.messageLimit, 'A reserva de arquivamento precisa estar instalada antes da primeira mudança.').toBe(202);
      expect(beforeMessages + openIds.length).toBeLessThanOrEqual(202);
    }
    manifest = { ...manifest, cleanupPlan: { conversationsToArchive: openIds.length, messagesBefore: beforeMessages,
      expectedMessagesAfter: beforeMessages + openIds.length, requiredMessageLimit: 202, reviewedAt: new Date().toISOString() } };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    preflightPassed = true;
  });

  it.skipIf(!execute)('arquiva pelo comando normal e conserva todas as mensagens e eventos', async () => {
    if (!preflightPassed) throw new Error('Prévia de ownership/retensão deve passar antes da alteração.');
    for (const id of openIds) {
      const command = supportConversationCommandSchema.parse({ intent: 'status', conversationId: id, status: 'closed' });
      if (command.intent !== 'status' || !await updateConversationStatus(client, command.conversationId, command.status)) {
        throw new Error('Arquivamento da própria fixture falhou; não repetir em outros registros.');
      }
    }
    const conversations = await client.from('whatsapp_conversations').select('id, is_archived').in('id', manifest.conversationIds);
    expect(Boolean(conversations.error)).toBe(false);
    expect(conversations.data?.length === 51 && conversations.data.every((row) => row.is_archived)).toBe(true);
    const after = await client.from('whatsapp_messages').select('id', { count: 'exact', head: true }).in('conversation_id', manifest.conversationIds);
    expect(Boolean(after.error)).toBe(false);
    expect(after.count).toBe(beforeMessages + openIds.length);
    writeFileSync(manifestPath, JSON.stringify({ ...manifest, cleanupCompleted: true,
      cleanupProof: { conversationsArchived: 51, folderDeleted: true, messagesRetained: after.count,
        closureEventsAdded: openIds.length, completedAt: new Date().toISOString() } }, null, 2) + '\n', 'utf8');
  });
});
