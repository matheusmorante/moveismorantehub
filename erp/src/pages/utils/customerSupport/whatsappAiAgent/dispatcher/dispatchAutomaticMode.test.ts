import { expect, it, vi } from 'vitest';
import { dispatchAutomaticMode } from './dispatchAutomaticMode.js';
import { sendMetaTextMessage } from './metaGraphSender.js';

it('não repete o envio quando a Meta aceita e a gravação do histórico falha', async () => {
  const rpc = vi.fn(async (name: string) => name === 'customer_support_prepare_ai_dispatch'
    ? { data: { allowed: true, dispatch_id: 'dispatch' }, error: null }
    : { data: true, error: null });
  const supabase = { rpc, from: vi.fn(() => ({ upsert: vi.fn().mockResolvedValue({ error: { message: 'indisponível' } }) })) };
  const fetchMeta = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ messages: [{ id: 'wamid.out' }] }) });
  const result = await dispatchAutomaticMode({
    supabase: supabase as any, inbound: { conversationId: 'conversation', messageId: 'message', from: '5541999999999',
      contactPhoneE164: '5541999999999', text: 'Olá', wamid: 'wamid.in', businessPhoneNumberId: 'business' },
    conv: { id: 'conversation' }, config: { model: 'gpt-6-luna' } as any, settings: {}, aiResponseText: 'Olá!',
    toolsUsed: [], situationKey: null, matchedKeywords: [], enforcedPhrases: [], relevantArticleIds: [],
    workflowKey: null, executionTimeMs: 1, accessToken: 'token', fetchMeta: fetchMeta as any, now: new Date(),
    durableJob: { id: 'job', token: 'lock' },
  });
  expect(result.reason).toBe('automatic_sent_persistence_incomplete');
  expect(fetchMeta).toHaveBeenCalledTimes(1);
  expect(rpc).toHaveBeenCalledWith('customer_support_record_ai_dispatch_outcome', expect.objectContaining({
    p_status: 'sent', p_api_message_id: 'wamid.out',
  }));
});

it('considera incerto um retorno 2xx sem identificador e um erro 5xx da Meta', async () => {
  for (const response of [
    { ok: true, status: 200, json: async () => ({}) },
    { ok: false, status: 503, json: async () => ({ error: 'unavailable' }) },
  ]) {
    const result = await sendMetaTextMessage({ fetchMeta: vi.fn().mockResolvedValue(response) as any,
      phoneNumberId: 'business', accessToken: 'token', recipientPhone: 'phone', textContent: 'Olá' });
    expect(result).toMatchObject({ ok: false, status: 'uncertain' });
  }
});
