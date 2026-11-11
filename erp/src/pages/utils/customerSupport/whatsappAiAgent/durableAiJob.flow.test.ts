import { expect, it, vi } from 'vitest';
import { processDurableAiJob } from './durableAiJob.js';
import { clearProcessedMessagesCache } from './whatsappAiAgentSecurity.js';

it('recupera uma falha da OpenAI e envia uma única resposta na próxima execução da fila', async () => {
  clearProcessedMessagesCache();
  const phone = '5541999999999';
  const inbound = { conversationId: 'conversation-test', messageId: 'message-test', from: phone,
    contactPhoneE164: `+${phone}`, text: 'Oi', wamid: 'wamid-test', businessPhoneNumberId: 'business-test' };
  const savedMessages: any[] = [];
  const outcomes: string[] = [];
  let claims = 0;
  const config = { enabled: true, supportMode: 'automatico', testPhoneNumbers: [phone], enabledTools: [] };
  const db = {
    rpc: vi.fn(async (name: string, params: any) => {
      if (name === 'customer_support_claim_ai_job') return { data: { id: 'job', token: `token-${++claims}`,
        attempts: claims, phase: 'pending', response: null, dispatchStatus: null, inbound }, error: null };
      if (name === 'customer_support_acquire_ai_turn') return { data: { acquired: true, turn_id: 'turn', lock_token: 'lock' }, error: null };
      if (name === 'customer_support_complete_ai_turn') return { data: { success: true, has_pending: false }, error: null };
      if (name === 'customer_support_reserve_ai_quota') return { data: { allowed: true, reservation_id: `reserve-${claims}` }, error: null };
      if (name === 'record_ai_token_usage') return { data: { log_id: 'log', reservation_committed: true }, error: null };
      if (name === 'customer_support_prepare_ai_dispatch') return { data: { allowed: true, dispatch_id: 'dispatch' }, error: null };
      if (name === 'customer_support_finish_ai_job') outcomes.push(params.p_outcome);
      return { data: true, error: null };
    }),
    from: vi.fn((table: string) => {
      if (table === 'settings') {
        const q: any = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: { data: {
          whatsappAiAgent: config, whatsappConfig: { accessToken: 'test-token', phoneNumberId: 'business-test' },
        } }, error: null }) };
        return q;
      }
      if (table === 'whatsapp_conversations') {
        const q: any = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: {
          id: inbound.conversationId, assigned_to: null, is_archived: false, tags: [], ai_status: 'active',
        }, error: null }), update: () => ({ eq: () => ({ lte: async () => ({ error: null }) }) }) };
        return q;
      }
      if (table === 'whatsapp_messages') {
        const q: any = { select: () => q, eq: () => q, order: () => q,
          limit: async () => ({ data: [], error: null }),
          upsert: async (message: any) => { savedMessages.push(message); return { error: null }; } };
        return q;
      }
      throw new Error(`Consulta não prevista: ${table}`);
    }),
  };
  const fetchOpenAi = vi.fn().mockRejectedValueOnce(new Error('rede indisponível')).mockResolvedValueOnce(
    new Response(JSON.stringify({ output_text: 'Olá! Como posso ajudar?', output: [],
      usage: { input_tokens: 10, output_tokens: 8 } }), { status: 200 }));
  const fetchMeta = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ messages: [{ id: 'wamid-out' }] }) });
  const deps = { fetchOpenAi: fetchOpenAi as unknown as typeof fetch, fetchMeta: fetchMeta as unknown as typeof fetch,
    openAiApiKey: 'test-openai-key', whatsappAccessToken: 'test-meta-key' };

  await processDurableAiJob(db as any, 'job', deps);
  expect(outcomes).toEqual(['retry']);
  expect(fetchMeta).not.toHaveBeenCalled();
  await processDurableAiJob(db as any, 'job', deps);

  expect(outcomes).toEqual(['retry', 'completed']);
  expect(fetchOpenAi).toHaveBeenCalledTimes(2);
  expect(db.rpc.mock.calls.filter(([name]) => name === 'customer_support_reserve_ai_quota')).toHaveLength(2);
  expect(fetchMeta).toHaveBeenCalledTimes(1);
  expect(savedMessages).toHaveLength(1);
  expect(savedMessages[0].api_message_id).toBe('wamid-out');
});
