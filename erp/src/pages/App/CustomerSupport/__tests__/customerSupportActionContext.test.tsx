// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCustomerSupportActions } from '../hooks/useCustomerSupportActions';
import type { WhatsAppConversation, WhatsAppMessage } from '../types';

const mocks = vi.hoisted(() => ({ assignConversation: vi.fn(), updateConversationStatus: vi.fn(),
  createInternalNoteMessage: vi.fn(), toggleArchiveConversation: vi.fn() }));
vi.mock('@/pages/utils/customerSupport/customerSupportService', () => mocks);
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {} }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((callback) => { resolve = callback; });
  return { promise, resolve };
}
const conversation = (id = 'a') => ({ id, isArchived: false, tags: ['original'], contactName: 'Original' } as WhatsAppConversation);
const setters = () => ({ setSelectedConversation: vi.fn(), setConversations: vi.fn(), setMessages: vi.fn(), currentUserName: 'Operador' });
type Actions = ReturnType<typeof useCustomerSupportActions>;

describe('Contexto de comandos da Central', () => {
  it.each([
    ['atribuição', 'assignConversation', (actions: Actions) => actions.handleAssignConversation('agent', 'Ana')],
    ['status', 'updateConversationStatus', (actions: Actions) => actions.handleUpdateStatus('closed')],
    ['arquivamento', 'toggleArchiveConversation', (actions: Actions) => actions.handleToggleArchive()],
  ] as const)('descarta resposta de %s após mudar a conversa', async (_label, service, invoke) => {
    const pending = deferred<boolean>();
    mocks[service].mockReturnValueOnce(pending.promise);
    const state = setters();
    const { result, rerender } = renderHook(({ selected }) => useCustomerSupportActions({ ...state, selectedConversation: selected }), { initialProps: { selected: conversation('a') } });
    let request!: Promise<boolean>;
    act(() => { request = invoke(result.current); });
    rerender({ selected: conversation('b') });
    await act(async () => { pending.resolve(true); await request; });
    expect(state.setSelectedConversation).not.toHaveBeenCalled();
    expect(state.setConversations).not.toHaveBeenCalled();
  });

  it('não insere comentário nem resumo de outra abertura, mesmo voltando à mesma conversa', async () => {
    const pending = deferred<WhatsAppMessage>();
    mocks.createInternalNoteMessage.mockReturnValueOnce(pending.promise);
    const state = setters();
    const { result, rerender } = renderHook(({ selected }) => useCustomerSupportActions({ ...state, selectedConversation: selected }), { initialProps: { selected: conversation('a') } });
    let request!: Promise<boolean>;
    act(() => { request = result.current.handleAddInternalNote('Comentário'); });
    rerender({ selected: conversation('b') });
    rerender({ selected: conversation('a') });
    await act(async () => { pending.resolve({ id: 'note', textContent: 'Comentário', timestamp: '2026-10-21T12:00:00Z' } as WhatsAppMessage); await request; });
    expect(state.setMessages).not.toHaveBeenCalled();
    expect(state.setSelectedConversation).not.toHaveBeenCalled();
  });

  it('ignora callback parcial de um painel anterior', () => {
    const state = setters();
    const { result, rerender } = renderHook(({ selected }) => useCustomerSupportActions({ ...state, selectedConversation: selected }), { initialProps: { selected: conversation('a') } });
    const oldCallback = result.current.handleConversationUpdated;
    rerender({ selected: conversation('b') });
    act(() => oldCallback({ internalNotes: 'Não pertence a b' }));
    expect(state.setSelectedConversation).not.toHaveBeenCalled();
    expect(state.setConversations).not.toHaveBeenCalled();
  });

  it('altera status preservando os campos e marcadores mais recentes do estado local', async () => {
    mocks.updateConversationStatus.mockResolvedValue(true);
    const state = setters();
    const { result } = renderHook(() => useCustomerSupportActions({ ...state, selectedConversation: conversation() }));
    await act(() => result.current.handleUpdateStatus('closed'));
    const update = state.setSelectedConversation.mock.calls[0][0];
    const current = { ...conversation(), contactName: 'Nome atualizado', tags: ['novo', 'status:snoozed'] };
    expect(update(current)).toMatchObject({ contactName: 'Nome atualizado', tags: ['novo', 'status:closed'], status: 'closed', isArchived: true });
  });
});
