import { describe, expect, it, vi } from 'vitest';
import { fetchAndFormatConversationHistory } from './historyFetcher.js';

describe('histórico do atendente', () => {
  it('interrompe o turno quando o Supabase não consegue carregar o histórico', async () => {
    const query: any = {};
    for (const name of ['select', 'eq', 'order']) query[name] = vi.fn(() => query);
    query.limit = vi.fn().mockResolvedValue({ data: null, error: { message: 'database unavailable' } });

    await expect(fetchAndFormatConversationHistory({ from: () => query } as any, 'conversation', 'Qual a cor?'))
      .rejects.toThrow('Não foi possível carregar o histórico');
  });
});
