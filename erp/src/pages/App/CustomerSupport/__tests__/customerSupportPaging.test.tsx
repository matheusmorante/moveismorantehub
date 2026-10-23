// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCustomerSupportConversations } from '../hooks/useCustomerSupportConversations';
import { useCustomerSupportMessages } from '../hooks/useCustomerSupportMessages';
import type { WhatsAppConversation, WhatsAppMessage } from '../types';

const mocks = vi.hoisted(() => ({ fetchConversations: vi.fn(), fetchConversationCounts: vi.fn(),
  fetchConversationMessages: vi.fn(), fetchPreviousConversationMessages: vi.fn(), markConversationAsRead: vi.fn(),
  messageListener: undefined as undefined | ((payload: any) => unknown) }));
vi.mock('@/pages/utils/customerSupport/customerSupportService', () => ({ fetchConversations: mocks.fetchConversations,
  fetchConversationCounts: mocks.fetchConversationCounts, fetchConversationMessages: mocks.fetchConversationMessages,
  fetchPreviousConversationMessages: mocks.fetchPreviousConversationMessages, markConversationAsRead: mocks.markConversationAsRead,
  mapRowToMessage: (row: unknown) => row }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {
  channel: () => ({ on(_event: string, filter: { table: string }, callback: (payload: any) => unknown) {
    if (filter.table === 'whatsapp_messages') mocks.messageListener = callback;
    return this;
  }, subscribe() { return this; } }), removeChannel: vi.fn(),
} }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((callback) => { resolve = callback; });
  return { promise, resolve };
}
const conversation = (id = 'a') => ({ id, unreadCount: 0 } as WhatsAppConversation);
const messages = (count: number, prefix = 'message') => Array.from({ length: count }, (_, index) => ({
  id: `${prefix}-${index}`, conversationId: 'a', timestamp: `2026-10-21T12:${String(index).padStart(2, '0')}:00Z`,
} as WhatsAppMessage));
beforeEach(() => {
  mocks.fetchConversations.mockResolvedValue({ conversations: Array.from({ length: 50 }, (_, index) => conversation(`a-${index}`)), totalCount: 51 });
  mocks.fetchConversationCounts.mockResolvedValue({ all: 51, mine: 0, unassigned: 0, unread: 0 });
  mocks.fetchConversationMessages.mockResolvedValue(messages(80));
  mocks.fetchPreviousConversationMessages.mockResolvedValue([]);
  mocks.markConversationAsRead.mockResolvedValue(true);
  mocks.messageListener = undefined;
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.resetAllMocks(); });

describe('Paginação da Inbox', () => {
  it('preserva dados comerciais carregados após falha de refresh e recupera ao repetir', async () => {
    const confirmed = { ...conversation('commercial'), customer: { id: 'customer-unit', fullName: 'Cliente unitário' }, orders: [{}, {}] } as WhatsAppConversation;
    mocks.fetchConversations.mockResolvedValueOnce({ conversations: [confirmed], totalCount: 1 });
    const { result } = renderHook(() => useCustomerSupportConversations({ canViewCommercialInfo: true }));
    await waitFor(() => expect(result.current.isLoadingConversations).toBe(false));
    act(() => result.current.setSelectedConversation(result.current.conversations[0]));
    const error = 'Não foi possível carregar os dados comerciais das conversas. Tente atualizar a lista.';
    mocks.fetchConversations.mockRejectedValueOnce(new Error(error));
    await act(() => result.current.loadConversations(true));
    expect(result.current.conversationsError).toBe(error);
    expect(result.current.conversations[0].orders).toHaveLength(2);
    expect(result.current.selectedConversation?.customer?.fullName).toBe('Cliente unitário');
    expect(result.current.isRefreshingConversations).toBe(false);
    mocks.fetchConversations.mockResolvedValueOnce({ conversations: [{ ...confirmed, orders: [{}, {}, {}] }], totalCount: 1 });
    await act(() => result.current.loadConversations(true));
    expect(result.current.conversationsError).toBe('');
    expect(result.current.selectedConversation?.orders).toHaveLength(3);
  });

  it('uma atualização automática durante a abertura não invalida a consulta que libera o loading', async () => {
    const initial = deferred<{ conversations: WhatsAppConversation[]; totalCount: number }>();
    mocks.fetchConversations.mockReturnValueOnce(initial.promise);
    const { result } = renderHook(() => useCustomerSupportConversations({}));
    expect(result.current.isLoadingConversations).toBe(true);
    await act(() => result.current.loadConversations(true));
    await act(async () => { initial.resolve({ conversations: [conversation('initial')], totalCount: 1 }); });
    expect(result.current.isLoadingConversations).toBe(false);
    expect(result.current.conversations.map(row => row.id)).toEqual(['initial']);
    expect(mocks.fetchConversations).toHaveBeenCalledTimes(1);
  });

  it('não sobrepõe consultas automáticas enquanto as contagens ainda estão pendentes', async () => {
    const counts = deferred<{ all: number; mine: number; unassigned: number; unread: number }>();
    mocks.fetchConversationCounts.mockReturnValueOnce(counts.promise);
    const { result } = renderHook(() => useCustomerSupportConversations({}));
    await waitFor(() => expect(result.current.conversations).toHaveLength(50));
    await act(() => result.current.loadConversations(true));
    await act(async () => { counts.resolve({ all: 51, mine: 0, unassigned: 0, unread: 0 }); });
    expect(mocks.fetchConversations).toHaveBeenCalledTimes(1);
    expect(result.current.isLoadingConversations).toBe(false);
    expect(result.current.isRefreshingConversations).toBe(false);
  });

  it('uma resposta de atualização anterior não descarta a próxima página carregada pelo usuário', async () => {
    const refresh = deferred<{ conversations: WhatsAppConversation[]; totalCount: number }>();
    const { result } = renderHook(() => useCustomerSupportConversations({}));
    await waitFor(() => expect(result.current.isLoadingConversations).toBe(false));
    mocks.fetchConversations.mockReturnValueOnce(refresh.promise);
    let refreshing!: Promise<void>;
    act(() => { refreshing = result.current.loadConversations(true); });
    mocks.fetchConversations.mockResolvedValueOnce({ conversations: [conversation('page-two')], totalCount: 51 });
    await act(() => result.current.loadMoreConversations());
    expect(result.current.conversations).toHaveLength(51);
    await act(async () => { refresh.resolve({ conversations: [conversation('stale-refresh')], totalCount: 51 }); await refreshing; });
    expect(result.current.conversations).toHaveLength(51);
    expect(result.current.conversations.at(-1)?.id).toBe('page-two');
    expect(result.current.hasMoreConversations).toBe(false);
    expect(result.current.isRefreshingConversations).toBe(false);
  });

  it('uma resposta do filtro antigo não libera nova consulta sobre o filtro atual ainda pendente', async () => {
    const old = deferred<{ conversations: WhatsAppConversation[]; totalCount: number }>();
    const next = deferred<{ conversations: WhatsAppConversation[]; totalCount: number }>();
    mocks.fetchConversations.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
    const { result, rerender } = renderHook(({ agentId }) => useCustomerSupportConversations({ agentId }), { initialProps: { agentId: 'old' } });
    rerender({ agentId: 'next' });
    await act(async () => { old.resolve({ conversations: [conversation('old')], totalCount: 1 }); });
    await act(() => result.current.loadConversations(true));
    await act(async () => { next.resolve({ conversations: [conversation('next')], totalCount: 1 }); });
    expect(mocks.fetchConversations).toHaveBeenCalledTimes(2);
    expect(result.current.conversations.map(row => row.id)).toEqual(['next']);
    expect(result.current.isLoadingConversations).toBe(false);
  });

  it('descarta a segunda página do filtro antigo ao trocar atendente', async () => {
    const stale = deferred<{ conversations: WhatsAppConversation[]; totalCount: number }>();
    const { result, rerender } = renderHook(({ agentId }) => useCustomerSupportConversations({ agentId }), { initialProps: { agentId: 'agent-a' } });
    await waitFor(() => expect(result.current.conversations).toHaveLength(50));
    mocks.fetchConversations.mockReturnValueOnce(stale.promise);
    let loading!: Promise<void>;
    act(() => { loading = result.current.loadMoreConversations(); });
    mocks.fetchConversations.mockResolvedValue({ conversations: [conversation('agent-b-result')], totalCount: 1 });
    rerender({ agentId: 'agent-b' });
    await waitFor(() => expect(result.current.conversations[0]?.id).toBe('agent-b-result'));
    await act(async () => { stale.resolve({ conversations: [conversation('old-page')], totalCount: 51 }); await loading; });
    expect(result.current.conversations.map((row) => row.id)).toEqual(['agent-b-result']);
    expect(result.current.totalCount).toBe(1);
    expect(result.current.isLoadingMore).toBe(false);
  });

  it('impede duas cargas simultâneas da mesma página e atualiza o total para zero', async () => {
    const pending = deferred<{ conversations: WhatsAppConversation[]; totalCount: number }>();
    const { result } = renderHook(() => useCustomerSupportConversations({}));
    await waitFor(() => expect(result.current.conversations).toHaveLength(50));
    mocks.fetchConversations.mockReturnValueOnce(pending.promise);
    let first!: Promise<void>;
    act(() => { first = result.current.loadMoreConversations(); void result.current.loadMoreConversations(); });
    expect(mocks.fetchConversations).toHaveBeenCalledTimes(2);
    mocks.fetchConversations.mockResolvedValueOnce({ conversations: [], totalCount: 0 });
    await act(async () => { pending.resolve({ conversations: [], totalCount: 0 }); await first; });
    expect(result.current.totalCount).toBe(0);
    expect(result.current.conversations).toHaveLength(0);
    expect(result.current.hasMoreConversations).toBe(false);
  });

  it('preserva a lista e informa falha ao carregar a próxima página', async () => {
    const { result } = renderHook(() => useCustomerSupportConversations({}));
    await waitFor(() => expect(result.current.conversations).toHaveLength(50));
    mocks.fetchConversations.mockRejectedValueOnce(new Error('Falha na consulta.'));
    await act(() => result.current.loadMoreConversations());
    expect(result.current.conversations).toHaveLength(50);
    expect(result.current.conversationsError).toBe('Falha na consulta.');
    expect(result.current.hasMoreConversations).toBe(true);
    expect(result.current.isLoadingMore).toBe(false);
  });
});

describe('Paginação do histórico', () => {
  it('confirma novas não lidas da conversa aberta mesmo quando o INSERT em tempo real não chega', async () => {
    const read = deferred<boolean>();
    const clear = vi.fn();
    const { result, rerender } = renderHook(({ unreadCount }) => useCustomerSupportMessages({
      selectedConversation: { ...conversation(), unreadCount }, onClearUnread: clear,
    }), { initialProps: { unreadCount: 0 } });
    await waitFor(() => expect(result.current.messages).toHaveLength(80));
    mocks.markConversationAsRead.mockReturnValueOnce(read.promise);
    rerender({ unreadCount: 2 });
    await waitFor(() => expect(mocks.markConversationAsRead).toHaveBeenCalledWith(expect.anything(), 'a'));
    expect(clear).not.toHaveBeenCalled();
    expect(mocks.fetchConversationMessages).toHaveBeenCalledTimes(1);
    await act(async () => { read.resolve(true); });
    expect(clear).toHaveBeenCalledWith('a');
    expect(result.current.messages).toHaveLength(80);
    rerender({ unreadCount: 2 });
    expect(mocks.markConversationAsRead).toHaveBeenCalledTimes(1);
  });

  it('a consulta automática não apaga uma falha de leitura e trocar conversa limpa o aviso', async () => {
    mocks.markConversationAsRead.mockResolvedValueOnce(false);
    const clear = vi.fn();
    const { result, rerender } = renderHook(({ id }) => useCustomerSupportMessages({
      selectedConversation: { ...conversation(id), unreadCount: id === 'a' ? 1 : 0 }, onClearUnread: clear,
    }), { initialProps: { id: 'a' } });
    await waitFor(() => expect(result.current.messages).toHaveLength(80));
    expect(result.current.messagesError).toContain('Não foi possível confirmar a leitura');
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(mocks.fetchConversationMessages).toHaveBeenCalledTimes(2);
    expect(result.current.messagesError).toContain('Não foi possível confirmar a leitura');
    expect(clear).not.toHaveBeenCalled();
    rerender({ id: 'b' });
    expect(result.current.messagesError).toBe('');
  });

  it('só limpa o contador depois da confirmação de leitura e permite repetir após erro', async () => {
    const read = deferred<boolean>();
    const clear = vi.fn();
    mocks.markConversationAsRead.mockReturnValueOnce(read.promise);
    const { result } = renderHook(() => useCustomerSupportMessages({ selectedConversation: { ...conversation(), unreadCount: 2 }, onClearUnread: clear }));
    await waitFor(() => expect(result.current.messages).toHaveLength(80));
    expect(clear).not.toHaveBeenCalled();
    await act(async () => { read.resolve(false); });
    expect(clear).not.toHaveBeenCalled();
    expect(result.current.messagesError).toContain('Não foi possível confirmar a leitura');
    await act(() => result.current.refreshMessages());
    expect(clear).toHaveBeenCalledWith('a');
    expect(result.current.messagesError).toBe('');
  });

  it('mostra o inbound em tempo real sem aguardar a confirmação de leitura', async () => {
    const read = deferred<boolean>();
    const clear = vi.fn();
    const { result } = renderHook(() => useCustomerSupportMessages({ selectedConversation: conversation(), onClearUnread: clear }));
    await waitFor(() => expect(result.current.messages).toHaveLength(80));
    mocks.markConversationAsRead.mockReturnValueOnce(read.promise);
    act(() => { void mocks.messageListener!({ eventType: 'INSERT', new: { ...messages(1, 'inbound')[0], direction: 'inbound' } }); });
    expect(result.current.messages.some(row => row.id === 'inbound-0')).toBe(true);
    expect(clear).not.toHaveBeenCalled();
    await act(async () => { read.resolve(true); });
    expect(clear).toHaveBeenCalledWith('a');
  });

  it('uma leitura da conversa anterior não altera o contador ou erro da conversa atual', async () => {
    const read = deferred<boolean>();
    const clear = vi.fn();
    mocks.markConversationAsRead.mockReturnValueOnce(read.promise);
    const { result, rerender } = renderHook(({ id }) => useCustomerSupportMessages({
      selectedConversation: { ...conversation(id), unreadCount: id === 'a' ? 1 : 0 }, onClearUnread: clear,
    }), { initialProps: { id: 'a' } });
    await waitFor(() => expect(result.current.messages).toHaveLength(80));
    rerender({ id: 'b' });
    await act(async () => { read.resolve(false); });
    expect(clear).not.toHaveBeenCalled();
    expect(result.current.messagesError).toBe('');
  });

  it('não reabre o fim do histórico nem descarta mensagens antigas na atualização', async () => {
    const { result } = renderHook(() => useCustomerSupportMessages({ selectedConversation: conversation(), onClearUnread: vi.fn() }));
    await waitFor(() => expect(result.current.messages).toHaveLength(80));
    const older = [{ ...messages(1, 'older')[0], timestamp: '2026-10-20T10:00:00Z' }];
    mocks.fetchPreviousConversationMessages.mockResolvedValueOnce(older);
    await act(() => result.current.loadOlderMessages());
    expect(result.current.hasOlderMessages).toBe(false);
    expect(result.current.messages).toHaveLength(81);
    await act(() => result.current.refreshMessages());
    expect(result.current.hasOlderMessages).toBe(false);
    expect(result.current.messages.some((row) => row.id === 'older-0')).toBe(true);
    expect(result.current.messages).toHaveLength(81);
  });

  it('mantém o cursor e o histórico após erro, permitindo repetir a página', async () => {
    const { result } = renderHook(() => useCustomerSupportMessages({ selectedConversation: conversation(), onClearUnread: vi.fn() }));
    await waitFor(() => expect(result.current.messages).toHaveLength(80));
    mocks.fetchPreviousConversationMessages.mockRejectedValueOnce(new Error('Falha nas anteriores.'));
    await act(() => result.current.loadOlderMessages());
    expect(result.current.hasOlderMessages).toBe(true);
    expect(result.current.messages).toHaveLength(80);
    expect(result.current.messagesError).toBe('Falha nas anteriores.');
    await act(() => result.current.loadOlderMessages());
    expect(mocks.fetchPreviousConversationMessages).toHaveBeenCalledTimes(2);
    expect(result.current.hasOlderMessages).toBe(false);
  });

  it('descarta a resposta de uma abertura anterior da mesma conversa', async () => {
    const stale = deferred<WhatsAppMessage[]>();
    mocks.fetchConversationMessages.mockReturnValueOnce(stale.promise);
    const { result, rerender } = renderHook(({ id }) => useCustomerSupportMessages({ selectedConversation: conversation(id), onClearUnread: vi.fn() }), { initialProps: { id: 'a' } });
    rerender({ id: 'b' });
    await waitFor(() => expect(result.current.messages).toHaveLength(80));
    rerender({ id: 'a' });
    await waitFor(() => expect(mocks.fetchConversationMessages).toHaveBeenCalledTimes(3));
    await act(async () => stale.resolve(messages(1, 'stale')));
    expect(result.current.messages).toHaveLength(80);
    expect(result.current.messages.some((row) => row.id === 'stale-0')).toBe(false);
    expect(result.current.isLoadingMessages).toBe(false);
  });

  it('recupera o estado de paginação quando a primeira consulta falha', async () => {
    mocks.fetchConversationMessages.mockRejectedValueOnce(new Error('Falha inicial.'));
    const { result } = renderHook(() => useCustomerSupportMessages({ selectedConversation: conversation(), onClearUnread: vi.fn() }));
    await waitFor(() => expect(result.current.messagesError).toBe('Falha inicial.'));
    expect(result.current.isLoadingMessages).toBe(false);
    await act(() => result.current.refreshMessages());
    expect(result.current.messages).toHaveLength(80);
    expect(result.current.hasOlderMessages).toBe(true);
    expect(result.current.messagesError).toBe('');
  });
});
