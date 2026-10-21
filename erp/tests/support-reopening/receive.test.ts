import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supportConversationCommandSchema } from '../../../shared-utils/customerSupportFormSchemas';
import { expectedRunId, expectedOwnerId, projectRef, scenarioKey, makeClient, readRequest, readManifest,
  saveManifest, signInOperator, type ReopeningManifest } from './context';

const phase = process.env.SUPPORT_REOPENING_PHASE;
if (!['provision', 'backend', 'inspect', 'cleanup'].includes(phase || '')) throw new Error('Selecione uma etapa concreta do lote; não existe execução automática geral.');
let client: SupabaseClient;
let anonymous: SupabaseClient;
let request: ReturnType<typeof readRequest>;
let manifest: ReopeningManifest | null;

beforeAll(async () => {
  request = readRequest();
  manifest = readManifest();
  client = makeClient(); anonymous = makeClient();
  await signInOperator(client);
  if (phase === 'provision' && manifest) throw new Error('Provisionamento já registrado; conferir antes de repetir.');
  if (phase !== 'provision' && (!manifest?.negativeGatesPassed || !manifest.businessWritesAuthorized)) throw new Error('Ownership/provisionamento não comprovados.');
  if (phase === 'backend' && manifest?.backendStarted) throw new Error('Etapa já iniciada; inspecionar a execução antes de qualquer retry.');
});
afterAll(async () => { if (client) await client.auth.signOut({ scope: 'local' }); });

async function remoteManifest() {
  const response = await client.rpc('customer_support_test_fixture_manifest', { p_run_id: expectedRunId });
  expect(response.error).toBeNull();
  expect(response.data.ownerId).toBe(expectedOwnerId);
  expect(response.data.runId).toBe(expectedRunId);
  return response.data;
}

async function snapshot() {
  const remote = await remoteManifest();
  const ids = remote.conversationIds as string[];
  const conversations = await client.from('whatsapp_conversations').select('*').in('id', ids).order('id');
  const messages = await client.from('whatsapp_messages').select('*').in('conversation_id', ids).order('id');
  expect(conversations.error).toBeNull(); expect(messages.error).toBeNull();
  expect(ids.length).toBeLessThanOrEqual(5);
  expect(messages.data!.length).toBeLessThanOrEqual(68);
  expect(conversations.data!.every(row => row.customer_id === null && row.business_phone_number_id === `test-artifact:${expectedRunId}`)).toBe(true);
  expect(messages.data!.every(row => row.raw_payload?.testArtifact?.ownerId === expectedOwnerId
    && row.raw_payload?.testArtifact?.runId === expectedRunId && row.raw_payload?.testArtifact?.scenarioKey === scenarioKey
    && row.media_id === null && row.media_url === null)).toBe(true);
  return { remote, conversations: conversations.data!, messages: messages.data! };
}

async function status(id: string, next: 'open' | 'closed' | 'snoozed') {
  const command = supportConversationCommandSchema.parse({ intent: 'status', conversationId: id, status: next });
  expect(command.intent).toBe('status');
  const result = await client.rpc('customer_support_set_conversation_status', { p_conversation_id: id, p_status: next });
  expect(result.error).toBeNull(); expect(result.data).toBe(true);
}

async function receive(id: string, key: string, timestamp = new Date().toISOString(), options: { newContact?: boolean; rollback?: boolean } = {}) {
  const result = await client.rpc('customer_support_test_receive_message', { p_anchor_conversation_id: id,
    p_message_key: key, p_text: `Recebimento sintético ${expectedRunId.slice(0, 8)} ${key}`, p_timestamp: timestamp,
    p_new_contact: options.newContact ?? false, p_rollback: options.rollback ?? false });
  return result;
}

describe.skipIf(phase !== 'provision').sequential('Operação separada de provisionamento', () => {
  it('comprova negativas e cria apenas quatro âncoras próprias', async () => {
    const args = { p_run_id: expectedRunId, p_scenario_key: scenarioKey, p_contact_names: request.contactNames, p_history: request.history };
    const initial = await remoteManifest();
    expect(initial.conversationIds).toEqual([]);
    expect((await anonymous.rpc('customer_support_provision_test_conversations', args)).error).toBeTruthy();
    expect((await client.rpc('customer_support_provision_test_conversations', { ...args, p_contact_names: [] })).error?.code).toBe('22023');
    const direct = { p_business_phone_number_id: `test-artifact:${expectedRunId}`, p_contact_wa_id: 'refused',
      p_contact_phone: 'refused', p_contact_name: null, p_customer_id: null, p_customer_link_status: 'unlinked', p_message: {} };
    expect((await client.rpc('customer_support_receive_message', direct)).error?.code).toBe('42501');
    expect((await anonymous.rpc('customer_support_receive_message', direct)).error?.code).toBe('42501');
    const response = await client.rpc('customer_support_provision_test_conversations', args);
    expect(response.error).toBeNull();
    const current = await snapshot();
    expect(current.remote.scenarioKey).toBe(scenarioKey);
    expect(current.remote.messageLimit).toBe(68);
    expect(current.remote.workingMessageLimit).toBe(63);
    expect(current.remote.cleanupReserved).toBe(5);
    expect(current.conversations).toHaveLength(4); expect(current.messages).toHaveLength(4);
    expect(current.messages.every(row => row.raw_payload?.supportFixtureAnchor === true && row.api_message_id === null)).toBe(true);
    manifest = { ...current.remote, projectRef, initialIds: [...current.remote.conversationIds], negativeGatesPassed: true, businessWritesAuthorized: true };
    saveManifest(manifest!);
  });
});

describe.skipIf(phase !== 'backend').sequential('Recebimento transacional na própria massa', () => {
  it('reabre fechado preservando responsável/tags e não reabre por replay após novo fechamento', async () => {
    const before = await snapshot();
    expect(before.conversations).toHaveLength(4); expect(before.messages).toHaveLength(4);
    manifest!.backendStarted = true; saveManifest(manifest!);
    const id = manifest!.initialIds[0];
    const assigned = await client.rpc('customer_support_assign_conversation', { p_conversation_id: id, p_assignee_id: expectedOwnerId });
    expect(assigned.error).toBeNull();
    const tag = await client.rpc('customer_support_update_tag', { p_conversation_id: id, p_tag: `prova-${expectedRunId.slice(0, 8)}`, p_remove: false });
    expect(tag.error).toBeNull();
    await status(id, 'closed');
    const closed = await snapshot();
    const received = await receive(id, 'closed-first');
    expect(received.error).toBeNull(); expect(received.data).toMatchObject({ conversation_id: id, inserted: true, reopened: true });
    const after = await snapshot();
    const conversation = after.conversations.find(row => row.id === id)!;
    expect(conversation.is_archived).toBe(false); expect(conversation.assigned_to).toBe(expectedOwnerId);
    expect(conversation.tags).toContain(`prova-${expectedRunId.slice(0, 8)}`);
    expect(conversation.tags).not.toContain('status:closed');
    expect(after.messages.length - closed.messages.length).toBe(2);
    expect(after.messages.filter(row => row.raw_payload?.source_message_id === received.data.message_id)).toHaveLength(1);
    const duplicate = await receive(id, 'closed-first');
    expect(duplicate.error).toBeNull(); expect(duplicate.data.inserted).toBe(false);
    expect((await snapshot()).messages.length).toBe(after.messages.length);
    await status(id, 'closed');
    const reclosed = await snapshot();
    expect((await receive(id, 'closed-first')).data.inserted).toBe(false);
    expect(await snapshot()).toEqual(reclosed);
  });

  it('reabre adiado, conserva datas/resumo em entrega atrasada e não reabre com nota', async () => {
    const id = manifest!.initialIds[1];
    const first = await receive(id, 'snoozed-baseline'); expect(first.error).toBeNull();
    await status(id, 'snoozed');
    const note = await client.rpc('customer_support_add_internal_note', { p_conversation_id: id, p_text: 'Nota de teste não deve reabrir.' });
    expect(note.error).toBeNull();
    const before = await snapshot();
    const prior = before.conversations.find(row => row.id === id)!; expect(prior.tags).toContain('status:snoozed');
    const lateTimestamp = new Date(new Date(prior.last_message_at).getTime() - 60_000).toISOString();
    const receipt = await receive(id, 'snoozed-late', lateTimestamp);
    expect(receipt.error).toBeNull(); expect(receipt.data.reopened).toBe(true);
    const after = await snapshot(); const row = after.conversations.find(item => item.id === id)!;
    expect(row.tags).not.toContain('status:snoozed'); expect(row.last_message_at).toBe(prior.last_message_at);
    expect(row.last_customer_message_at).toBe(prior.last_customer_message_at); expect(row.last_message_text).toBe(prior.last_message_text);
    expect(row.unread_count).toBe(prior.unread_count + 1);
  });

  it('serializa duas mensagens e um ID repetido em paralelo sem perder incrementos/eventos', async () => {
    const id = manifest!.initialIds[2]; await status(id, 'closed');
    const before = await snapshot(); const count = before.conversations.find(row => row.id === id)!.unread_count;
    const pair = await Promise.all([receive(id, 'concurrent-one'), receive(id, 'concurrent-two')]);
    expect(pair.every(result => !result.error && result.data.inserted)).toBe(true);
    expect(pair.filter(result => result.data.reopened)).toHaveLength(1);
    const after = await snapshot(); expect(after.messages.length - before.messages.length).toBe(3);
    expect(after.conversations.find(row => row.id === id)!.unread_count).toBe(count + 2);
    await status(id, 'closed'); const closed = await snapshot();
    const repeat = await Promise.all([receive(id, 'concurrent-same'), receive(id, 'concurrent-same')]);
    expect(repeat.every(result => !result.error)).toBe(true); expect(repeat.filter(result => result.data.inserted)).toHaveLength(1);
    expect((await snapshot()).messages.length - closed.messages.length).toBe(2);
  });

  it('reverte mensagem/estado/evento e criação nova quando falha depois da função compartilhada', async () => {
    const id = manifest!.initialIds[3]; await status(id, 'closed');
    const before = await snapshot();
    const rollback = await receive(id, 'rollback-existing', undefined, { rollback: true });
    expect(rollback.error?.message).toContain('SUPPORT_TEST_CONTROLLED_ROLLBACK');
    expect(await snapshot()).toEqual(before);
    const firstContact = await receive(id, 'rollback-new', undefined, { newContact: true, rollback: true });
    expect(firstContact.error?.message).toContain('SUPPORT_TEST_CONTROLLED_ROLLBACK');
    expect(await snapshot()).toEqual(before);
    const retry = await receive(id, 'rollback-existing'); expect(retry.error).toBeNull(); expect(retry.data.inserted).toBe(true);
    const contacts = await Promise.all([receive(id, 'new-contact-one', undefined, { newContact: true }), receive(id, 'new-contact-two', undefined, { newContact: true })]);
    expect(contacts.every(result => !result.error && result.data.inserted)).toBe(true);
    expect(new Set(contacts.map(result => result.data.conversation_id)).size).toBe(1);
    const after = await snapshot(); expect(after.conversations).toHaveLength(5);
    manifest!.conversationIds = after.remote.conversationIds;
    manifest!.backendProof = { passed: true, messageCount: after.messages.length, completedAt: new Date().toISOString() };
    saveManifest(manifest!);
  });
});

describe.skipIf(phase !== 'inspect').sequential('Inspeção após falha de seletor da UI', () => {
  it('confirma exatamente o ponto observado antes de liberar a continuação manual do teste corrigido', async () => {
    expect(manifest!.backendProof?.passed).toBe(true);
    expect(manifest!.uiStarted).toBe(true);
    expect(manifest!.uiProof).toBeUndefined();
    const current = await snapshot();
    expect(current.messages.some(row => row.api_message_id?.startsWith(`test-reopen:${expectedRunId}:ui-`))).toBe(false);
    const principal = current.conversations.find(row => row.id === manifest!.initialIds[0])!;
    if (process.env.SUPPORT_REOPENING_INSPECTION === 'after-open') {
      expect(current.messages.length).toBe(manifest!.backendProof!.messageCount + 1);
      expect(principal.is_archived).toBe(false);
      expect(principal.tags).not.toContain('status:closed');
      const reopen = current.messages.filter(row => row.conversation_id === principal.id
        && row.message_type === 'system_event' && row.raw_payload?.event === 'status'
        && row.raw_payload?.status === 'open' && row.raw_payload?.author_id === expectedOwnerId);
      expect(reopen).toHaveLength(1);
      manifest!.uiResumeAfterOpenVerified = true;
    } else {
      expect(process.env.SUPPORT_REOPENING_INSPECTION).toBeUndefined();
      expect(current.messages.length).toBe(manifest!.backendProof!.messageCount);
      expect(principal.is_archived).toBe(true);
      expect(principal.tags).toContain('status:closed');
    }
    manifest!.uiPrewriteInspection = { messageCount: current.messages.length, noUiReceipts: true, completedAt: new Date().toISOString() };
    manifest!.uiStarted = false;
    saveManifest(manifest!);
  });
});

describe.skipIf(phase !== 'cleanup').sequential('Limpeza normal, com reserva incluída no teto', () => {
  it('arquiva somente as próprias conversas, conserva histórico e encerra o manifesto', async () => {
    const before = await snapshot();
    const open = before.conversations.filter(row => !row.is_archived || !row.tags?.includes('status:closed'));
    expect(before.messages.length + open.length).toBeLessThanOrEqual(68);
    for (const row of open) await status(row.id, 'closed');
    const after = await snapshot(); expect(after.conversations.every(row => row.is_archived)).toBe(true);
    expect(after.messages.length).toBe(before.messages.length + open.length);
    expect(before.messages.every(old => after.messages.some(row => row.id === old.id))).toBe(true);
    manifest!.conversationIds = after.remote.conversationIds;
    manifest!.cleanupCompleted = true;
    manifest!.cleanupProof = { before: before.messages.length, after: after.messages.length,
      archived: after.conversations.length, completedAt: new Date().toISOString() };
    saveManifest(manifest!);
  });
});
