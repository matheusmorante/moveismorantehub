import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supportFixtureProvisionSchema } from '../../../shared-utils/customerSupportFormSchemas';

const projectRef = 'hkoxhourxwlddgsfdgws';
const expectedOrigin = `https://${projectRef}.supabase.co`;
let client: SupabaseClient;
let anonymous: SupabaseClient;
let request: ReturnType<typeof supportFixtureProvisionSchema.parse>;
let ownerId: string;
let negativeGatesPassed = false;

describe.sequential('Provisionamento expressamente autorizado da Central', () => {
  beforeAll(async () => {
    if (process.env.MORANTE_ENV_SOURCE !== 'vercel-development' || process.env.VERCEL_ENV !== 'development'
      || process.env.RUN_SUPPORT_FIXTURE_PROVISION !== '1' || !process.env.SUPPORT_FIXTURE_PROVISION_INPUT
      || !process.env.SUPPORT_FIXTURE_MANIFEST_OUTPUT) {
      throw new Error('Provisionamento exige launcher Vercel, solicitação revisada e operação explicitamente habilitada.');
    }
    const envelope = JSON.parse(readFileSync(resolve(process.env.SUPPORT_FIXTURE_PROVISION_INPUT), 'utf8'));
    if (envelope.projectRef !== projectRef || envelope.authorization !== 'central-fixtures-2026-10-21') {
      throw new Error('Projeto ou referência da autorização não corresponde à operação aprovada.');
    }
    request = supportFixtureProvisionSchema.parse(envelope.request);
    if (existsSync(resolve(process.env.SUPPORT_FIXTURE_MANIFEST_OUTPUT))) {
      const previous = JSON.parse(readFileSync(resolve(process.env.SUPPORT_FIXTURE_MANIFEST_OUTPUT), 'utf8'));
      if (previous.cleanupCompleted) throw new Error('Execução encerrada; não alterar os artefatos retidos.');
    }
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim();
    const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
    if (!url || new URL(url).origin !== expectedOrigin || !key || !email || !password) {
      throw new Error('Ambiente oficial incompleto ou projeto operacional divergente.');
    }
    const restrictedFetch: typeof fetch = (input, init) => {
      const target = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
      if (target.origin !== expectedOrigin) throw new Error('Destino externo proibido nesta operação.');
      return fetch(input, { ...init, signal: init?.signal || AbortSignal.timeout(25_000) });
    };
    const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: restrictedFetch } };
    client = createClient(url, key, options);
    anonymous = createClient(url, key, options);
    const login = await client.auth.signInWithPassword({ email, password });
    if (login.error || !login.data.session || !login.data.user) throw new Error('Autenticação do operador não concluiu.');
    ownerId = login.data.user.id;
    const gate = await fetch('http://127.0.0.1:3000/api/testing/test-artifact-operator', {
      method: 'POST', headers: { Authorization: `Bearer ${login.data.session.access_token}` }, signal: AbortSignal.timeout(10_000),
    });
    if (gate.status !== 204) throw new Error('Gate real do operador recusou a identidade configurada.');
    const permission = await client.rpc('customer_support_can_view');
    if (permission.error || permission.data !== true) throw new Error('Operador sem acesso confirmado à Central.');
  });

  afterAll(async () => {
    if (client) await client.auth.signOut({ scope: 'local' });
  });

  it('nega anon e parâmetros inválidos sem criar conversas', async () => {
    const args = { p_run_id: request.runId, p_scenario_key: request.scenarioKey,
      p_contact_names: request.contactNames, p_history: request.history };
    const denied = await anonymous.rpc('customer_support_provision_test_conversations', args);
    expect(Boolean(denied.error)).toBe(true);
    const deniedManifest = await anonymous.rpc('customer_support_test_fixture_manifest', { p_run_id: request.runId });
    expect(Boolean(deniedManifest.error)).toBe(true);
    const invalid = await client.rpc('customer_support_provision_test_conversations', { ...args, p_contact_names: [] });
    expect(invalid.error?.code).toBe('22023');
    const oversized = await client.rpc('customer_support_provision_test_conversations', { ...args,
      p_contact_names: Array(52).fill(request.contactNames[0]) });
    expect(oversized.error?.code).toBe('22023');
    const blank = await client.rpc('customer_support_provision_test_conversations', { ...args, p_history: [' '] });
    expect(blank.error?.code).toBe('22023');
    const current = await client.rpc('customer_support_test_fixture_manifest', { p_run_id: request.runId });
    expect(Boolean(current.error)).toBe(false);
    // Existing own artifacts permit an idempotent retry; no new run is generated.
    expect(current.data.ownerId === ownerId && current.data.runId === request.runId).toBe(true);
    const foldersBefore = await client.from('customer_support_inboxes').select('id', { count: 'exact', head: true })
      .eq('created_by', ownerId).contains('criteria', { testArtifact: { runId: request.runId } });
    expect(Boolean(foldersBefore.error)).toBe(false);
    const foreignOwner = await client.from('customer_support_inboxes').insert({
      name: `Guard ${request.runId.slice(0, 8)}`, created_by: ownerId,
      criteria: { testArtifact: { is_test: true, runId: request.runId, ownerId: crypto.randomUUID(), scenarioKey: request.scenarioKey } },
    });
    expect(Boolean(foreignOwner.error?.message.includes('TEST_ARTIFACT_UNAUTHORIZED'))).toBe(true);
    const foldersAfter = await client.from('customer_support_inboxes').select('id', { count: 'exact', head: true })
      .eq('created_by', ownerId).contains('criteria', { testArtifact: { runId: request.runId } });
    expect(Boolean(foldersAfter.error)).toBe(false);
    expect(foldersAfter.count).toBe(foldersBefore.count);
    negativeGatesPassed = true;
  });

  it('prepara somente a solicitação aprovada e confirma identidade e limites persistidos', async () => {
    if (!negativeGatesPassed) throw new Error('As provas negativas devem passar antes da operação positiva.');
    const args = { p_run_id: request.runId, p_scenario_key: request.scenarioKey,
      p_contact_names: request.contactNames, p_history: request.history };
    const response = await client.rpc('customer_support_provision_test_conversations', args);
    if (response.error) throw new Error(`Provisionamento recusado pelo banco (${response.error.code || 'sem código'}).`);
    const manifest = response.data;
    expect(manifest.ownerId === ownerId && manifest.runId === request.runId && manifest.scenarioKey === request.scenarioKey).toBe(true);
    expect(manifest.conversationIds.length).toBe(request.contactNames.length);
    const conversations = await client.from('whatsapp_conversations').select('id, customer_id, business_phone_number_id')
      .in('id', manifest.conversationIds);
    expect(Boolean(conversations.error)).toBe(false);
    expect(conversations.data?.length).toBe(request.contactNames.length);
    expect(conversations.data?.every((row) => row.customer_id === null && row.business_phone_number_id === `test-artifact:${request.runId}`)).toBe(true);
    const messages = await client.from('whatsapp_messages').select('raw_payload, api_message_id, media_id')
      .in('conversation_id', manifest.conversationIds);
    expect(Boolean(messages.error)).toBe(false);
    expect(messages.data?.length).toBeGreaterThanOrEqual(request.contactNames.length + request.history.length - 1);
    expect(messages.data?.length).toBeLessThanOrEqual(151);
    expect(messages.data?.every((row) => row.raw_payload?.testArtifact?.ownerId === ownerId
      && row.raw_payload?.testArtifact?.runId === request.runId && row.raw_payload?.testArtifact?.scenarioKey === request.scenarioKey
      && row.raw_payload?.author_id === ownerId && row.api_message_id === null && row.media_id === null)).toBe(true);
    const replay = await client.rpc('customer_support_provision_test_conversations', args);
    expect(Boolean(replay.error)).toBe(false);
    expect(JSON.stringify(replay.data.conversationIds) === JSON.stringify(manifest.conversationIds)).toBe(true);
    const manifestPath = resolve(process.env.SUPPORT_FIXTURE_MANIFEST_OUTPUT!);
    const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
    if (previous.runId && (previous.runId !== request.runId || previous.ownerId !== ownerId)) {
      throw new Error('Manifesto de outra execução não pode ser sobrescrito.');
    }
    writeFileSync(manifestPath, JSON.stringify({ ...previous, ...manifest,
      projectRef, initialMessages: request.contactNames.length + request.history.length - 1,
      migrationVersion: '20261021113455', negativeGatesPassed: true,
      businessWritesAuthorized: true, createdAt: new Date().toISOString(),
    }, null, 2) + '\n', { encoding: 'utf8' });
  });

  it('aplica busca textual antes de contar e paginar sem reduzi-la a fragmentos de telefone', async () => {
    if (!negativeGatesPassed) throw new Error('Gates negativos não conferidos.');
    const manifest = await client.rpc('customer_support_test_fixture_manifest', { p_run_id: request.runId });
    expect(Boolean(manifest.error)).toBe(false);
    const ids = new Set<string>(manifest.data.conversationIds);
    const criteria = { status: 'all', assigneeId: 'all', unread: false, customerLink: 'all', orders: 'all',
      search: request.runId.slice(0, 8) };
    const args = { p_filter: 'all', p_search: '', p_agent_id: null, p_criteria: criteria,
      p_page: 1, p_page_size: 50, p_sort_order: 'newest' };
    const first = await client.rpc('customer_support_list_conversations', args);
    expect(Boolean(first.error)).toBe(false);
    expect(first.data[0]?.total_count).toBe(request.contactNames.length);
    expect(first.data.length).toBe(50);
    expect(first.data.every((row: { id: string }) => ids.has(row.id))).toBe(true);
    const second = await client.rpc('customer_support_list_conversations', { ...args, p_page: 2 });
    expect(Boolean(second.error)).toBe(false);
    expect(second.data.length).toBe(1);
    expect(second.data.every((row: { id: string }) => ids.has(row.id))).toBe(true);
    expect(new Set([...first.data, ...second.data].map((row: { id: string }) => row.id)).size).toBe(51);
    const withOrders = await client.rpc('customer_support_list_conversations', { ...args,
      p_criteria: { ...criteria, orders: 'with_orders' } });
    expect(Boolean(withOrders.error)).toBe(false);
    expect(withOrders.data.length).toBe(0);
    const withoutOrders = await client.rpc('customer_support_list_conversations', { ...args,
      p_criteria: { ...criteria, orders: 'without_orders' } });
    expect(Boolean(withoutOrders.error)).toBe(false);
    expect(withoutOrders.data[0]?.total_count).toBe(51);
    const customers = await client.rpc('customer_support_search_customers', { p_search: request.runId.slice(0, 8) });
    expect(Boolean(customers.error)).toBe(false);
    expect(customers.data.length).toBe(0);
  });

  it('protege identidade e autoria, conserva eventos idempotentes e detecta edição concorrente na própria fixture', async () => {
    if (!negativeGatesPassed) throw new Error('Gates negativos não conferidos.');
    const found = await client.rpc('customer_support_test_fixture_manifest', { p_run_id: request.runId });
    if (found.error || found.data.ownerId !== ownerId) throw new Error('Identidade remota não confirmada.');
    const id = found.data.principalConversationId;
    const original = await client.from('whatsapp_conversations').select('assigned_to, tags, internal_notes, is_archived').eq('id', id).single();
    if (original.error) throw new Error('Estado original da fixture indisponível.');
    const before = await client.from('whatsapp_messages').select('id', { count: 'exact', head: true }).eq('conversation_id', id);
    expect(Boolean(before.error)).toBe(false);
    expect(before.count).not.toBeNull();
    const status = original.data.is_archived ? 'closed' : original.data.tags?.includes('status:snoozed') ? 'snoozed' : 'open';
    for (let repeat = 0; repeat < 2; repeat++) {
      const assigned = await client.rpc('customer_support_assign_conversation', { p_conversation_id: id, p_assignee_id: original.data.assigned_to });
      const unchangedStatus = await client.rpc('customer_support_set_conversation_status', { p_conversation_id: id, p_status: status });
      expect(Boolean(assigned.error || unchangedStatus.error)).toBe(false);
    }
    const invalidStatus = await client.rpc('customer_support_set_conversation_status', { p_conversation_id: id, p_status: 'invalid' });
    expect(invalidStatus.error?.code).toBe('22023');
    const reservedTag = await client.rpc('customer_support_update_tag', { p_conversation_id: id, p_tag: 'STATUS:closed', p_remove: false });
    expect(reservedTag.error?.code).toBe('22023');
    const forgedMessage = await client.from('whatsapp_messages').insert({ conversation_id: id, direction: 'outbound',
      message_type: 'internal_note', text_content: 'Autoria inválida deve ser recusada', status: 'sent',
      raw_payload: { author_id: crypto.randomUUID() } });
    expect(forgedMessage.error?.code).toBe('42501');
    const foreignMetadata = await client.from('whatsapp_messages').insert({ conversation_id: id, direction: 'outbound',
      message_type: 'internal_note', text_content: 'Execução inválida deve ser recusada', status: 'sent',
      raw_payload: { author_id: ownerId, testArtifact: { is_test: true, runId: crypto.randomUUID(), ownerId, scenarioKey: request.scenarioKey } } });
    expect(foreignMetadata.error?.code).toBe('42501');
    const concurrentTags = [`par-a-${request.runId.slice(0, 8)}`, `par-b-${request.runId.slice(0, 8)}`];
    const tagResults = await Promise.all(concurrentTags.map((tag) => client.rpc('customer_support_update_tag', {
      p_conversation_id: id, p_tag: tag, p_remove: false,
    })));
    expect(tagResults.every((result) => !result.error)).toBe(true);
    const tagged = await client.from('whatsapp_conversations').select('tags').eq('id', id).single();
    expect(concurrentTags.every((tag) => tagged.data?.tags?.includes(tag))).toBe(true);
    expect((original.data.tags || []).every((tag: string) => tagged.data?.tags?.includes(tag))).toBe(true);
    for (const tag of concurrentTags) {
      const removed = await client.rpc('customer_support_update_tag', { p_conversation_id: id, p_tag: tag, p_remove: true });
      expect(Boolean(removed.error)).toBe(false);
    }
    const candidates = [`Edição concorrente A ${crypto.randomUUID()}`, `Edição concorrente B ${crypto.randomUUID()}`];
    try {
      const noteResults = await Promise.all(candidates.map((notes) => client.rpc('customer_support_set_internal_notes', {
        p_conversation_id: id, p_notes: notes, p_expected_notes: original.data.internal_notes || '',
      })));
      expect(noteResults.filter((result) => !result.error && result.data === true).length).toBe(1);
      expect(noteResults.filter((result) => result.error?.code === 'P0001'
        && result.error.message.startsWith('CUSTOMER_SUPPORT_NOTES_CONFLICT:')).length).toBe(1);
      const winner = await client.from('whatsapp_conversations').select('internal_notes').eq('id', id).single();
      expect(candidates.includes(winner.data?.internal_notes)).toBe(true);
    } finally {
      const winner = await client.from('whatsapp_conversations').select('internal_notes').eq('id', id).single();
      if (!winner.error && candidates.includes(winner.data.internal_notes)) {
        const restored = await client.rpc('customer_support_set_internal_notes', { p_conversation_id: id,
          p_notes: original.data.internal_notes || '', p_expected_notes: winner.data.internal_notes });
        if (restored.error) throw new Error('Não foi possível restaurar o resumo da própria fixture.');
      }
    }
    const after = await client.from('whatsapp_messages').select('id', { count: 'exact', head: true }).eq('conversation_id', id);
    expect(Boolean(after.error)).toBe(false);
    expect(after.count).toBe(before.count);
    const folders = await client.from('customer_support_inboxes').select('id, criteria').eq('created_by', ownerId)
      .contains('criteria', { testArtifact: { runId: request.runId, ownerId } });
    if (folders.error || folders.data.length !== 1) throw new Error('A pasta própria criada pela UI deve existir para esta prova.');
    const folder = folders.data[0];
    const { testArtifact: marker, ...criteria } = folder.criteria;
    const retained = await client.from('customer_support_inboxes').update({ criteria }).eq('id', folder.id).select('criteria').single();
    expect(Boolean(retained.error)).toBe(false);
    expect(retained.data?.criteria?.testArtifact?.runId === request.runId && retained.data?.criteria?.testArtifact?.ownerId === ownerId).toBe(true);
    const forgedFolder = await client.from('customer_support_inboxes').update({ criteria: { ...criteria,
      testArtifact: { ...marker, ownerId: crypto.randomUUID() } } }).eq('id', folder.id);
    expect(forgedFolder.error?.code).toBe('42501');
    const extraFolder = await client.from('customer_support_inboxes').insert({ name: `Duplicada ${request.runId.slice(0, 8)}`,
      criteria: { ...criteria, testArtifact: marker }, created_by: ownerId });
    expect(extraFolder.error?.code).toBe('23505');
    expect(Boolean(extraFolder.error?.message.includes('customer_support_test_folder_run_unique'))).toBe(true);
    const manifestPath = resolve(process.env.SUPPORT_FIXTURE_MANIFEST_OUTPUT!);
    const previous = JSON.parse(readFileSync(manifestPath, 'utf8'));
    writeFileSync(manifestPath, JSON.stringify({ ...previous, backendProof: {
      idempotentEvents: true, actorEnforced: true, immutableIdentity: true,
      concurrentTags: true, noteConflictDetected: true, folderMetadataRetained: true,
      completedAt: new Date().toISOString(),
    } }, null, 2) + '\n', 'utf8');
  });
});
