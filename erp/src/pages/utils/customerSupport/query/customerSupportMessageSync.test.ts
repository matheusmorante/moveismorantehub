import { describe, expect, it, vi } from 'vitest';
import { fetchConversationMessageChanges, mergeSupportMessageChanges } from './customerSupportMessageSync';
import type { WhatsAppMessage } from '@/pages/App/CustomerSupport/types';

const message = (id: string, changedAt: string, text = id) => ({ id, changedAt, text,
  conversationId: 'conversation', timestamp: '2026-11-04T10:00:00Z' } as unknown as WhatsAppMessage);

describe('sincronização incremental de mensagens', () => {
  it('preserva histórico, conteúdo e revisões mais novas em respostas fora de ordem', () => {
    const old = message('old', '1970-01-01T00:00:00Z');
    const updated = { ...message('new', '2026-11-04T10:00:00.000002Z', 'editada'), reactions: [{ emoji: '❤️' }] };
    const result = mergeSupportMessageChanges([old, updated], [message('new', '2026-11-04T10:00:00.000001Z', 'obsoleta'), message('added', '2026-11-04T10:01:00Z')]);
    expect(result.find((row) => row.id === 'new')).toMatchObject({ text: 'editada', reactions: [{ emoji: '❤️' }] });
    expect(result.map((row) => row.id)).toEqual(['added', 'new', 'old']);
  });

  it('recupera mais de 200 alterações de uma desconexão usando a mesma janela e cursor', async () => {
    const rows = Array.from({ length: 200 }, (_, i) => ({ id: `m-${i}`, conversation_id: 'conversation', timestamp: '2026-11-04T10:00:00Z', changed_at: '2026-11-04T10:01:00Z' }));
    const rpc = vi.fn().mockResolvedValueOnce({ data: { messages: rows, watermark: '2026-11-04T11:00:00Z', hasMore: true, nextCursor: { id: 'm-199', changedAt: '2026-11-04T10:01:00Z' } }, error: null })
      .mockResolvedValueOnce({ data: { messages: [{ ...rows[0], id: 'last', raw_payload: { reactions: [] } }], watermark: '2026-11-04T11:00:00Z', hasMore: false }, error: null });
    const result = await fetchConversationMessageChanges({ rpc } as any, 'conversation', '2026-11-03T10:00:00Z', [message('known', '1970-01-01T00:00:00Z')]);
    expect(result.messages).toHaveLength(201);
    expect(rpc.mock.calls[1][1]).toMatchObject({ p_conversation_id: 'conversation', p_since: '2026-11-03T10:00:00Z', p_known: { known: '1970-01-01T00:00:00Z' }, p_until: '2026-11-04T11:00:00Z', p_after_id: 'm-199' });
    expect(result.watermark).toBe('2026-11-04T11:00:00Z');
  });

  it('interrompe uma página inválida sem devolver um watermark de sucesso', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { messages: [], watermark: 'now', hasMore: true, nextCursor: null }, error: null });
    await expect(fetchConversationMessageChanges({ rpc } as any, 'conversation', null, [])).rejects.toThrow('não avançou');
    expect(rpc).toHaveBeenCalledOnce();
  });

  it('não transforma uma falha remota em lista vazia confirmada', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: new Error('rede') });
    await expect(fetchConversationMessageChanges({ rpc } as any, 'conversation', null, [])).rejects.toThrow('atualizar');
  });
});
