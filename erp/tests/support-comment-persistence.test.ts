import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supportConversationCommandSchema, supportFixtureProvisionSchema } from '../../shared-utils/customerSupportFormSchemas';

const projectRef = 'hkoxhourxwlddgsfdgws';
const expectedOrigin = `https://${projectRef}.supabase.co`;
const authorization = 'central-comment-persistence-2026-10-23';
const runId = 'e9e22a13-f509-41c9-80c5-ecd21a0349c6';
const expectedOwnerId = '13eab361-be48-4e49-be4b-4ad79813b812';
const scenarioKey = 'support-comment-persistence';
const anchorText = 'Âncora sintética e9e22a13';
const commentText = 'Comentário sintético de persistência e9e22a13';
const execute = process.env.RUN_SUPPORT_COMMENT_PERSISTENCE === '1';

let client: SupabaseClient;
let anonymous: SupabaseClient;
let ownerId = '';
let inputPath = '';
let manifestPath = '';
let manifest: Record<string, unknown> = {};
let conversationId = '';

function saveManifest() {
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

async function readOwnState() {
  const conversations = await client.from('whatsapp_conversations')
    .select('id, customer_id, business_phone_number_id, is_archived, internal_notes')
    .eq('id', conversationId);
  if (conversations.error || conversations.data?.length !== 1) throw new Error('Leitura RLS da conversa sintética falhou.');
  const messages = await client.from('whatsapp_messages')
    .select('id, direction, message_type, text_content, raw_payload, api_message_id, media_id, media_url')
    .eq('conversation_id', conversationId).order('timestamp', { ascending: true });
  if (messages.error) throw new Error('Leitura RLS das mensagens sintéticas falhou.');
  return { conversation: conversations.data[0], messages: messages.data || [] };
}

describe.skipIf(!execute)('Persistência remota de comentários da Central', () => {
  beforeAll(async () => {
    if (process.env.MORANTE_ENV_SOURCE !== 'vercel-development' || process.env.VERCEL_ENV !== 'development'
      || !process.env.SUPPORT_COMMENT_PERSISTENCE_INPUT || !process.env.SUPPORT_COMMENT_PERSISTENCE_MANIFEST) {
      throw new Error('Use o launcher Vercel Development, solicitação aprovada e manifesto exclusivo.');
    }
    inputPath = resolve(process.env.SUPPORT_COMMENT_PERSISTENCE_INPUT);
    manifestPath = resolve(process.env.SUPPORT_COMMENT_PERSISTENCE_MANIFEST);
    if (existsSync(manifestPath)) throw new Error('Manifesto existente: inspecione a execução; esta prova não pode ser repetida.');

    const envelope = JSON.parse(readFileSync(inputPath, 'utf8'));
    const request = supportFixtureProvisionSchema.parse(envelope.request);
    if (envelope.projectRef !== projectRef || envelope.authorization !== authorization || envelope.approved !== true
      || envelope.expectedOwnerId !== expectedOwnerId || envelope.comment !== commentText
      || envelope.limits?.conversations !== 1 || envelope.limits?.messagesAndEvents !== 3
      || request.runId !== runId || request.scenarioKey !== scenarioKey
      || JSON.stringify(request.contactNames) !== JSON.stringify(['Teste comentário e9e22a13'])
      || JSON.stringify(request.history) !== JSON.stringify([anchorText])) {
      throw new Error('Solicitação não corresponde à fixture e aos limites aprovados.');
    }

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim();
    const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
    if (!url || new URL(url).origin !== expectedOrigin || !key || !email || !password) {
      throw new Error('Projeto operacional ou credenciais Vercel Development ausentes.');
    }
    const restrictedFetch: typeof fetch = (input, init) => {
      const target = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
      if (target.origin !== expectedOrigin) throw new Error('Destino externo proibido nesta prova.');
      return fetch(input, { ...init, signal: init?.signal || AbortSignal.timeout(20_000) });
    };
    const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: restrictedFetch } };
    client = createClient(url, key, options);
    anonymous = createClient(url, key, options);
    const login = await client.auth.signInWithPassword({ email, password });
    if (login.error || !login.data.session || login.data.user?.id !== expectedOwnerId) {
      throw new Error('Login Vercel Development não confirmou o operador autorizado.');
    }
    ownerId = login.data.user.id;
    const gate = await fetch('http://127.0.0.1:3000/api/testing/test-artifact-operator', { method: 'POST',
      headers: { Authorization: `Bearer ${login.data.session.access_token}` }, signal: AbortSignal.timeout(10_000) });
    const permission = await client.rpc('customer_support_can_view');
    const admin = await client.rpc('is_administrator');
    if (gate.status !== 204 || permission.error || permission.data !== true || admin.error || admin.data !== true) {
      throw new Error('Gate real de operador, acesso à Central ou identidade administrativa não confirmado.');
    }
    const prior = await client.rpc('customer_support_test_fixture_manifest', { p_run_id: runId });
    if (prior.error || prior.data?.ownerId !== ownerId || prior.data?.conversationIds?.length !== 0) {
      throw new Error('runId já utilizado ou manifesto remoto não confirmou fixture vazia.');
    }
    const unreadable = await anonymous.rpc('customer_support_test_fixture_manifest', { p_run_id: runId });
    if (!unreadable.error) throw new Error('O manifesto da fixture foi acessível sem autenticação.');
  });

  afterAll(async () => {
    if (client) await client.auth.signOut({ scope: 'local' });
  });

  it('cria uma conversa própria, persiste um comentário sem tocar o resumo e arquiva o histórico', async () => {
    const envelope = JSON.parse(readFileSync(inputPath, 'utf8'));
    const request = supportFixtureProvisionSchema.parse(envelope.request);
    const args = { p_run_id: request.runId, p_scenario_key: request.scenarioKey,
      p_contact_names: request.contactNames, p_history: request.history };

    const denied = await anonymous.rpc('customer_support_provision_test_conversations', args);
    expect(Boolean(denied.error)).toBe(true);
    const invalid = await client.rpc('customer_support_provision_test_conversations', { ...args, p_contact_names: [] });
    expect(invalid.error?.code).toBe('22023');
    const stillEmpty = await client.rpc('customer_support_test_fixture_manifest', { p_run_id: runId });
    expect(stillEmpty.data?.conversationIds).toEqual([]);

    manifest = { projectRef, runId, ownerId, scenarioKey, phase: 'provisioning',
      conversationIds: [], commentAttempted: false, cleanupCompleted: false };
    saveManifest();
    const provisioned = await client.rpc('customer_support_provision_test_conversations', args);
    if (provisioned.error) throw new Error(`Provisionamento recusado (${provisioned.error.code || 'sem código'}).`);
    const remote = provisioned.data;
    if (remote?.ownerId !== ownerId || remote?.runId !== runId || remote?.scenarioKey !== scenarioKey
      || remote?.conversationIds?.length !== 1) throw new Error('Manifesto retornado diverge da execução autorizada.');
    conversationId = remote.conversationIds[0];
    manifest = { ...manifest, phase: 'provisioned', conversationIds: [conversationId] };
    saveManifest();

    try {
      const initial = await readOwnState();
      expect(initial.conversation.customer_id).toBeNull();
      expect(initial.conversation.business_phone_number_id).toBe(`test-artifact:${runId}`);
      expect(initial.conversation.is_archived).toBe(false);
      expect(initial.conversation.internal_notes).toBeNull();
      expect(initial.messages).toHaveLength(1);
      expect(initial.messages[0].message_type).toBe('internal_note');
      expect(initial.messages[0].text_content).toBe(anchorText);
      expect(initial.messages[0].raw_payload?.testArtifact?.ownerId).toBe(ownerId);
      expect(initial.messages[0].api_message_id).toBeNull();
      expect(initial.messages[0].media_id).toBeNull();
      expect(initial.messages[0].media_url).toBeNull();

      manifest = { ...manifest, phase: 'comment-attempt', beforeInternalNotes: initial.conversation.internal_notes,
        beforeMessageIds: initial.messages.map((message) => message.id), commentAttempted: true };
      saveManifest();
      const added = await client.rpc('customer_support_add_internal_note', {
        p_conversation_id: conversationId, p_text: commentText,
      });
      if (added.error) throw new Error(`RPC de comentário recusada (${added.error.code || 'sem código'}).`);
      const addedRow = Array.isArray(added.data) ? added.data[0] : added.data;
      if (!addedRow?.id) throw new Error('A RPC não retornou o comentário persistido.');
      manifest = { ...manifest, phase: 'comment-returned', commentId: addedRow.id };
      saveManifest();

      const afterComment = await readOwnState();
      expect(afterComment.conversation.internal_notes).toBe(initial.conversation.internal_notes);
      expect(afterComment.messages).toHaveLength(2);
      expect(afterComment.messages.map((message) => message.id)).toContain(addedRow.id);
      const newComment = afterComment.messages.find((message) => message.id === addedRow.id);
      expect(newComment?.message_type).toBe('internal_note');
      expect(newComment?.text_content).toBe(commentText);
      expect(newComment?.raw_payload?.author_id).toBe(ownerId);
      expect(newComment?.api_message_id).toBeNull();
      expect(newComment?.media_id).toBeNull();
      expect(newComment?.media_url).toBeNull();
      manifest = { ...manifest, phase: 'comment-verified', commentVerified: true,
        afterCommentMessageCount: afterComment.messages.length,
        internalNotesUnchanged: afterComment.conversation.internal_notes === initial.conversation.internal_notes };
      saveManifest();
    } finally {
      if (conversationId) {
        const current = await readOwnState();
        if (!current.conversation.is_archived) {
          const close = supportConversationCommandSchema.parse({ intent: 'status', conversationId, status: 'closed' });
          if (close.intent !== 'status') throw new Error('Comando de arquivamento inválido.');
          const result = await client.rpc('customer_support_set_conversation_status', {
            p_conversation_id: close.conversationId, p_status: close.status,
          });
          if (result.error || result.data !== true) throw new Error('Falha ao arquivar a própria fixture pelo comando normal.');
        }
        const finalState = await readOwnState();
        const closures = finalState.messages.filter((message) => message.message_type === 'system_event'
          && message.raw_payload?.event === 'status' && message.raw_payload?.status === 'closed');
        if (!finalState.conversation.is_archived || finalState.messages.length > 3 || closures.length !== 1) {
          throw new Error('Limpeza retida fora do limite: inspecione a fixture sem repetir a gravação.');
        }
        manifest = { ...manifest, phase: 'cleanup-complete', finalMessageCount: finalState.messages.length,
          cleanupCompleted: true, archived: true };
        saveManifest();
      }
    }
  });
});
