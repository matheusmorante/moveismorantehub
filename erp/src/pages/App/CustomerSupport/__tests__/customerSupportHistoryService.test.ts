import { describe, expect, it, vi } from 'vitest';
import {
  fetchConversationActivityPage,
  fetchConversationAttachmentPage,
  fetchConversationMessageSearchPage,
  fetchPreviousConversationMessages,
  fetchConversationReplyTarget,
} from '@/pages/utils/customerSupport/customerSupportService';

function messageRow(id: string, timestamp: string, type = 'system_event') {
  return {
    id,
    conversation_id: 'conversation-1',
    api_message_id: `wamid.${id}`,
    direction: 'outbound',
    message_type: type,
    text_content: `Texto ${id}`,
    media_id: type === 'image' || type === 'document' ? `media-${id}` : null,
    media_mime_type: type === 'image' ? 'image/jpeg' : null,
    media_url: null,
    media_filename: type === 'document' ? `${id}.pdf` : null,
    media_caption: null,
    reply_to_message_id: null,
    reply_to_wamid: null,
    status: 'received',
    error_code: null,
    failure_reason: null,
    raw_payload: {},
    timestamp,
    created_at: timestamp,
  };
}

function mockSupabase(results: Array<any> | ((column: string | null) => Array<any>) = [], maybeSingle: any = null) {
  const queries: Array<Record<string, any>> = [];
  const client = {
    from: vi.fn(() => {
      const query: Record<string, any> = { column: null, filters: [], orders: [], result: results };
      for (const method of ['select', 'eq', 'in', 'not', 'or', 'order', 'limit', 'ilike']) {
        query[method] = vi.fn((...args: any[]) => {
          if (method === 'ilike') query.column = args[0];
          if (method === 'order') query.orders.push(args);
          if (['eq', 'in', 'not', 'or', 'ilike'].includes(method)) query.filters.push([method, ...args]);
          return query;
        });
      }
      query.then = (resolve: (value: any) => unknown, reject: (reason: unknown) => unknown) =>
        Promise.resolve({ data: typeof results === 'function' ? results(query.column) : query.result, error: null }).then(resolve, reject);
      query.maybeSingle = vi.fn().mockResolvedValue({ data: maybeSingle, error: null });
      queries.push(query);
      return query;
    }),
  };
  return { client, queries };
}

describe('Paginação do histórico da Central', () => {
  it('pagina atividades persistidas com cursor e deduplica por chave no consumidor', async () => {
    const rows = [
      messageRow('event-new', '2026-10-23T13:00:00Z'),
      messageRow('event-old', '2026-10-23T12:00:00Z', 'internal_note'),
    ];
    const { client, queries } = mockSupabase(rows);
    const page = await fetchConversationActivityPage(client as any, 'conversation-1', {
      timestamp: '2026-10-23T14:00:00Z', id: 'cursor-id',
    }, 1);

    expect(page.messages.map((message) => message.id)).toEqual(['event-new']);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toEqual({ timestamp: '2026-10-23T13:00:00Z', id: 'event-new' });
    expect(queries[0].in).toHaveBeenCalledWith('message_type', ['internal_note', 'system_event']);
    expect(queries[0].or).toHaveBeenCalledWith('timestamp.lt."2026-10-23T14:00:00Z",and(timestamp.eq."2026-10-23T14:00:00Z",id.lt.cursor-id)');
    expect(queries[0].orders).toEqual([
      ['timestamp', { ascending: false }], ['id', { ascending: false }],
    ]);
  });

  it('cita timestamps reservados pelo filtro PostgREST ao carregar mensagens anteriores', async () => {
    const { client, queries } = mockSupabase([messageRow('older', '2026-10-23T13:00:00.123+00:00')]);
    await fetchPreviousConversationMessages(client as any, 'conversation-1', {
      timestamp: '2026-10-23T14:00:00.123+00:00', id: 'cursor-id',
    }, 1);

    expect(queries[0].or).toHaveBeenCalledWith(
      'timestamp.lt."2026-10-23T14:00:00.123+00:00",and(timestamp.eq."2026-10-23T14:00:00.123+00:00",id.lt.cursor-id)'
    );
  });

  it('busca anexos por texto literal e pagina a união sem duplicatas', async () => {
    const resultsByColumn = {
      text_content: [messageRow('item-3', '2026-10-23T13:00:00Z', 'image')],
      media_filename: [messageRow('item-2', '2026-10-23T14:00:00Z', 'document')],
      media_caption: [messageRow('item-1', '2026-10-23T15:00:00Z', 'image'), messageRow('item-1', '2026-10-23T15:00:00Z', 'image')],
    };
    const { client, queries } = mockSupabase((column) => resultsByColumn[column as keyof typeof resultsByColumn] || []);
    const page = await fetchConversationAttachmentPage(client as any, 'conversation-1', null, ' promo%_* ', 2);

    expect(queries).toHaveLength(3);
    expect(queries.map((query) => query.filters.find((filter: unknown[]) => filter[0] === 'ilike')?.slice(1))).toEqual([
      ['text_content', '%promo\\%\\_\\*%'],
      ['media_filename', '%promo\\%\\_\\*%'],
      ['media_caption', '%promo\\%\\_\\*%'],
    ]);
    expect(page.messages.map((message) => message.id)).toEqual(['item-1', 'item-2']);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor?.id).toBe('item-2');
  });

  it('resolve a mensagem citada somente dentro da conversa selecionada', async () => {
    const source = messageRow('source', '2026-10-23T12:00:00Z', 'text');
    const { client, queries } = mockSupabase([], source);
    const message = await fetchConversationReplyTarget(client as any, 'conversation-1', {
      messageId: null, apiMessageId: 'wamid.source',
    });

    expect(message?.id).toBe('source');
    expect(queries[0].filters).toContainEqual(['eq', 'conversation_id', 'conversation-1']);
    expect(queries[0].filters).toContainEqual(['eq', 'api_message_id', 'wamid.source']);
    expect(queries[0].maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('pesquisa todo o histórico com termo literal antes do cursor e limite, incluindo legendas', async () => {
    const resultsByColumn = {
      text_content: [messageRow('text-result', '2026-10-23T15:00:00Z', 'text')],
      media_filename: [messageRow('file-result', '2026-10-23T14:00:00Z', 'document')],
      media_caption: [messageRow('text-result', '2026-10-23T15:00:00Z', 'text'), messageRow('caption-result', '2026-10-23T13:00:00Z', 'image')],
    };
    const { client, queries } = mockSupabase((column) => resultsByColumn[column as keyof typeof resultsByColumn] || []);
    const cursor = { timestamp: '2026-10-23T16:00:00.123+00:00', id: 'source-id' };
    const page = await fetchConversationMessageSearchPage(client as any, 'conversation-1', cursor, ' a%_*\\b ', 2);
    expect(page.messages.map((message) => message.id)).toEqual(['text-result', 'file-result']);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toEqual({ timestamp: '2026-10-23T14:00:00Z', id: 'file-result' });
    expect(queries).toHaveLength(3);
    queries.forEach((query, index) => {
      expect(query.filters[0]).toEqual(['eq', 'conversation_id', 'conversation-1']);
      expect(query.filters[1]).toEqual(['ilike', ['text_content', 'media_filename', 'media_caption'][index], '%a\\%\\_\\*\\\\b%']);
      expect(query.or).toHaveBeenCalledWith('timestamp.lt."2026-10-23T16:00:00.123+00:00",and(timestamp.eq."2026-10-23T16:00:00.123+00:00",id.lt.source-id)');
      expect(query.limit).toHaveBeenCalledWith(3);
      expect(query.in).not.toHaveBeenCalled();
      expect(query.not).not.toHaveBeenCalled();
    });
  });

  it('impõe teto por consulta e não consulta histórico com busca vazia ou inválida', async () => {
    const { client, queries } = mockSupabase([]);
    expect(await fetchConversationMessageSearchPage(client as any, 'conversation-1', null, '  '))
      .toEqual({ messages: [], hasMore: false, nextCursor: null });
    expect(client.from).not.toHaveBeenCalled();
    await expect(fetchConversationMessageSearchPage(client as any, 'conversation-1', null, 'a'.repeat(101)))
      .rejects.toThrow('A busca deve ter no máximo 100 caracteres.');
    expect(client.from).not.toHaveBeenCalled();
    await fetchConversationMessageSearchPage(client as any, 'conversation-1', null, 'consulta', 5000);
    queries.forEach((query) => expect(query.limit).toHaveBeenCalledWith(51));
  });
});
