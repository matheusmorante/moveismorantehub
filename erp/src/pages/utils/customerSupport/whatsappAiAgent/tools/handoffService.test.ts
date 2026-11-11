import { expect, it, vi } from 'vitest';
import { recordHandoffToHuman } from './handoffService.js';

it('não confirma transferência quando a gravação transacional falha', async () => {
  const supabase = { rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'unavailable' } }) };
  const result = await recordHandoffToHuman(supabase as any, { conversationId: 'conversation', reason: 'Solicitou ajuda' });
  expect(result.success).toBe(false);
  expect(supabase.rpc).toHaveBeenCalledWith('customer_support_record_ai_handoff', expect.objectContaining({
    p_conversation_id: 'conversation',
  }));
});

it('não confirma transferência sem uma conversa identificada', async () => {
  const supabase = { rpc: vi.fn() };
  const result = await recordHandoffToHuman(supabase as any, { conversationId: '', reason: 'Ajuda' });
  expect(result.success).toBe(false);
  expect(supabase.rpc).not.toHaveBeenCalled();
});
