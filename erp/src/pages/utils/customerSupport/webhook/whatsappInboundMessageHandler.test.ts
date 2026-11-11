import { expect, it, vi } from 'vitest';

const processJob = vi.hoisted(() => vi.fn());
vi.mock('../whatsappAiAgent/durableAiJob.js', () => ({ processDurableAiJob: processJob }));
import { processInboundMessageBatch } from './whatsappInboundMessageHandler.js';

it('tenta o trabalho persistente também quando a entrega do webhook é duplicada', async () => {
  const query: any = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'message' }, error: null });
  const supabase = { from: vi.fn(() => query), rpc: vi.fn().mockResolvedValue({ data: {
    conversation_id: 'conversation', message_id: 'message', inserted: false, ai_job_id: 'job',
  }, error: null }) };
  processJob.mockResolvedValue(true);
  const result = await processInboundMessageBatch(supabase as any, 'business', {
    messages: [{ id: 'wamid', from: '5541999999999', type: 'text', text: { body: 'Olá' }, timestamp: '1794350000' }],
  });
  expect(result.duplicatesIgnored).toBe(1);
  expect(supabase.rpc).toHaveBeenCalledWith('customer_support_receive_message_with_ai_job', expect.anything());
  expect(processJob).toHaveBeenCalledWith(supabase, 'job');
});
