// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCustomerSupportConversations } from '../hooks/useCustomerSupportConversations';
import { useCustomerSupportMessages } from '../hooks/useCustomerSupportMessages';
import type { WhatsAppConversation } from '../types';

type TestChannel = {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  event?: (payload: unknown) => void;
  status?: (status: string) => void;
};
const mocks = vi.hoisted(() => ({ channel: vi.fn(), removeChannel: vi.fn(),
  fetchConversations: vi.fn(), fetchConversationCounts: vi.fn(),
  fetchConversationMessages: vi.fn(), fetchPreviousConversationMessages: vi.fn(),
  fetchConversationReplyTarget: vi.fn(), markConversationAsRead: vi.fn(), channels: [] as TestChannel[] }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {
  channel: mocks.channel, removeChannel: mocks.removeChannel,
} }));
vi.mock('@/pages/utils/customerSupport/customerSupportService', () => ({
  fetchConversations: mocks.fetchConversations, fetchConversationCounts: mocks.fetchConversationCounts,
  fetchConversationMessages: mocks.fetchConversationMessages,
  fetchPreviousConversationMessages: mocks.fetchPreviousConversationMessages,
  fetchConversationReplyTarget: mocks.fetchConversationReplyTarget,
  markConversationAsRead: mocks.markConversationAsRead, mapRowToMessage: (row: unknown) => row,
}));

beforeEach(() => {
  vi.useFakeTimers();
  mocks.channels.length = 0;
  mocks.channel.mockImplementation(() => {
    const channel: TestChannel = { on: vi.fn(), subscribe: vi.fn() };
    channel.on.mockImplementation((_event, _filter, callback) => { channel.event = callback; return channel; });
    channel.subscribe.mockImplementation((callback) => { channel.status = callback; return channel; });
    mocks.channels.push(channel);
    return channel;
  });
  // realtime-js 2.99.1 invokes the CLOSED callback when unsubscribe succeeds.
  mocks.removeChannel.mockImplementation(async (channel: TestChannel) => { channel.status?.('CLOSED'); return 'ok'; });
  mocks.fetchConversations.mockResolvedValue({ conversations: [], totalCount: 0 });
  mocks.fetchConversationCounts.mockResolvedValue({ all: 0, mine: 0, unassigned: 0, unread: 0 });
  mocks.fetchConversationMessages.mockResolvedValue([]);
  mocks.fetchPreviousConversationMessages.mockResolvedValue([]);
  mocks.markConversationAsRead.mockResolvedValue(true);
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.resetAllMocks(); });

const cases = [
  { name: 'conversas', delay: 3000, useHook: () => useCustomerSupportConversations({}) },
  { name: 'mensagens', delay: 5000, useHook: () => useCustomerSupportMessages({
    selectedConversation: { id: 'a', unreadCount: 0 } as WhatsAppConversation, onClearUnread: vi.fn(),
  }) },
];

describe.each(cases)('Ciclo de vida Realtime: $name', ({ delay, useHook }) => {
  it('não recria canal depois de sair da Inbox, mesmo com CLOSED durante a remoção', async () => {
    const { unmount } = renderHook(() => useHook());
    await act(async () => {});
    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(delay * 2); });
    expect(mocks.channel).toHaveBeenCalledTimes(1);
  });

  it('cancela a reconexão pendente quando o canal volta a SUBSCRIBED', async () => {
    renderHook(() => useHook());
    await act(async () => {});
    act(() => { mocks.channels[0].status?.('CHANNEL_ERROR'); mocks.channels[0].status?.('SUBSCRIBED'); });
    await act(async () => { await vi.advanceTimersByTimeAsync(delay); });
    expect(mocks.channel).toHaveBeenCalledTimes(1);
  });

  it('reconecta uma vez e ignora callbacks do canal substituído', async () => {
    const { result } = renderHook(() => useHook());
    await act(async () => {});
    const retired = mocks.channels[0];
    act(() => retired.status?.('TIMED_OUT'));
    await act(async () => { await vi.advanceTimersByTimeAsync(delay); });
    expect(mocks.channel).toHaveBeenCalledTimes(2);
    act(() => mocks.channels[1].status?.('SUBSCRIBED'));
    mocks.fetchConversations.mockClear();
    mocks.markConversationAsRead.mockClear();
    await act(async () => {
      retired.event?.({ eventType: 'INSERT', new: { id: 'retired', conversationId: 'a',
        direction: 'inbound', timestamp: '2026-10-22T12:00:00Z' } });
      retired.status?.('CHANNEL_ERROR');
    });
    expect(mocks.fetchConversations).not.toHaveBeenCalled();
    expect(mocks.markConversationAsRead).not.toHaveBeenCalled();
    if ('messages' in result.current) expect(result.current.messages).toEqual([]);
    await act(async () => { await vi.advanceTimersByTimeAsync(delay); });
    expect(mocks.channel).toHaveBeenCalledTimes(2);
  });
});
