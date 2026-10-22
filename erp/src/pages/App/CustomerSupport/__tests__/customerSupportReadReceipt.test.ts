import { afterEach, describe, expect, it, vi } from 'vitest';
import { markConversationAsRead } from '@/pages/utils/customerSupport/customerSupportService';

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

function client(response: unknown) {
  const gt = vi.fn().mockReturnValue(response);
  const eq = vi.fn(() => ({ gt }));
  const update = vi.fn(() => ({ eq }));
  return { supabase: { from: vi.fn(() => ({ update })) } as any, update, eq, gt };
}

describe('Confirmação de leitura — contrato e prazo, sem DML remoto', () => {
  it('confirma sucesso e atualiza somente não lidas da conversa selecionada', async () => {
    const mock = client(Promise.resolve({ error: null }));
    expect(await markConversationAsRead(mock.supabase, 'conversation-a')).toBe(true);
    expect(mock.update).toHaveBeenCalledWith({ unread_count: 0 });
    expect(mock.eq).toHaveBeenCalledWith('id', 'conversation-a');
    expect(mock.gt).toHaveBeenCalledWith('unread_count', 0);
  });

  it('não confirma erro retornado nem falha de transporte', async () => {
    expect(await markConversationAsRead(client(Promise.resolve({ error: { code: '42501' } })).supabase, 'a')).toBe(false);
    expect(await markConversationAsRead(client(Promise.resolve().then(() => { throw new Error('network'); })).supabase, 'a')).toBe(false);
  });

  it('encerra uma resposta pendente em 10s sem confirmar resultado incerto', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const mock = client(new Promise(() => undefined));
    let completed = false;
    const pending = markConversationAsRead(mock.supabase, 'a').then(value => { completed = true; return value; });
    await vi.advanceTimersByTimeAsync(9_999);
    expect(completed).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
