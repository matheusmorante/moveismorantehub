// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChatMessageTimeline } from '../components/chat/ChatMessageTimeline';
import { ChatInChatSearch } from '../components/chat/ChatInChatSearch';
import { ChatArea } from '../components/ChatArea';
import type { WhatsAppConversation, WhatsAppMessage } from '../types';

const mocks = vi.hoisted(() => ({ fetchMessageSearch: vi.fn() }));
vi.mock('@/pages/utils/customerSupport/customerSupportService', () => ({
  fetchConversationMessageSearchPage: mocks.fetchMessageSearch,
}));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {} }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'operator' }, profile: { full_name: 'Atendente' } }) }));
vi.mock('../components/chat/ChatComposer', () => ({ ChatComposer: () => null }));
vi.mock('../components/QuickSnippetsModal', () => ({ QuickSnippetsModal: () => null }));
vi.mock('../components/MessageBubble', () => ({
  MessageBubble: ({ message }: { message: WhatsAppMessage }) => <p>{message.textContent}</p>,
}));

const message = (index: number, textContent: string, conversationId = 'conversation-1') => ({
  id: `m${String(index).padStart(3, '0')}`, conversationId, textContent,
  timestamp: new Date(Date.UTC(2026, 9, 23, 0, index)).toISOString(),
} as WhatsAppMessage);
const latest = Array.from({ length: 80 }, (_, index) => message(index + 121, `Mensagem recente ${index + 121}`));
const timelineProps = {
  messages: latest, displayName: 'Cliente', inChatSearch: 'agulha',
  isLoadingMessages: false, conversationId: 'conversation-1', hasOlderMessages: true,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((onResolve, onReject) => { resolve = onResolve; reject = onReject; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  mocks.fetchMessageSearch.mockResolvedValue({
    messages: [message(20, 'Mensagem antiga com agulha')], hasMore: false, nextCursor: null,
  });
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.resetAllMocks(); });

describe('Busca de mensagens em todo o histórico', () => {
  it('localiza m20 fora das últimas m121–m200 sem depender da rolagem ou da página normal', async () => {
    const loadOlder = vi.fn();
    render(<ChatMessageTimeline {...timelineProps} onLoadOlderMessages={loadOlder} />);
    expect(await screen.findByText('Mensagem antiga com agulha')).toBeTruthy();
    expect(mocks.fetchMessageSearch).toHaveBeenCalledWith(expect.anything(), 'conversation-1', null, 'agulha');
    expect(loadOlder).not.toHaveBeenCalled();
    expect(screen.queryByText('Nenhuma mensagem encontrada para a busca.')).toBeNull();
  });

  it('carrega outra página pelo botão mesmo sem scrollbar, mantendo ordem e deduplicando resultados', async () => {
    const newest = message(50, 'Agulha mais recente');
    const oldest = message(10, 'Agulha mais antiga');
    const cursor = { timestamp: newest.timestamp, id: newest.id };
    mocks.fetchMessageSearch
      .mockResolvedValueOnce({ messages: [newest], hasMore: true, nextCursor: cursor })
      .mockResolvedValueOnce({ messages: [newest, oldest], hasMore: false, nextCursor: null });
    const { container } = render(<ChatMessageTimeline {...timelineProps} />);
    await screen.findByText(newest.textContent!);
    fireEvent.click(screen.getByRole('button', { name: 'Carregar mais resultados' }));
    await screen.findByText(oldest.textContent!);
    expect(mocks.fetchMessageSearch).toHaveBeenLastCalledWith(expect.anything(), 'conversation-1', cursor, 'agulha');
    expect(Array.from(container.querySelectorAll('[data-message-id]')).map((element) => element.getAttribute('data-message-id')))
      .toEqual([oldest.id, newest.id]);
    expect(screen.queryByRole('button', { name: 'Carregar mais resultados' })).toBeNull();
  });

  it('mostra carregamento, erro e repetição sem acusar vazio antes da resposta', async () => {
    const pending = deferred<any>();
    mocks.fetchMessageSearch.mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce({ messages: [], hasMore: false, nextCursor: null });
    render(<ChatMessageTimeline {...timelineProps} />);
    expect(screen.getByRole('status').textContent).toBe('Pesquisando mensagens…');
    expect(screen.queryByText('Nenhuma mensagem encontrada para a busca.')).toBeNull();
    await act(async () => pending.reject(new Error('Falha controlada na busca.')));
    expect(screen.getByRole('alert').textContent).toBe('Falha controlada na busca.');
    expect(screen.queryByText('Nenhuma mensagem encontrada para a busca.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar pesquisar novamente' }));
    await screen.findByText('Nenhuma mensagem encontrada para a busca.');
    expect(mocks.fetchMessageSearch).toHaveBeenCalledTimes(2);
  });

  it('preserva resultados e o cursor para repetir uma página que falhou', async () => {
    const source = message(20, 'Resultado já confirmado');
    const older = message(10, 'Resultado anterior');
    const cursor = { timestamp: source.timestamp, id: source.id };
    mocks.fetchMessageSearch
      .mockResolvedValueOnce({ messages: [source], hasMore: true, nextCursor: cursor })
      .mockRejectedValueOnce(new Error('Falha na página anterior.'))
      .mockResolvedValueOnce({ messages: [older], hasMore: false, nextCursor: null });
    render(<ChatMessageTimeline {...timelineProps} />);
    await screen.findByText(source.textContent!);
    fireEvent.click(screen.getByRole('button', { name: 'Carregar mais resultados' }));
    await screen.findByRole('alert');
    expect(screen.getByText(source.textContent!)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar pesquisar novamente' }));
    await screen.findByText(older.textContent!);
    expect(mocks.fetchMessageSearch.mock.calls.slice(1).map((call) => call[2])).toEqual([cursor, cursor]);
  });

  it.each([
    { inChatSearch: 'outro termo', conversationId: 'conversation-1' },
    { inChatSearch: 'agulha', conversationId: 'conversation-2' },
  ])('descarta resultado antigo ao trocar para %j', async (nextQuery) => {
    const stale = deferred<any>();
    const current = message(30, 'Resultado do contexto atual', nextQuery.conversationId);
    mocks.fetchMessageSearch.mockReturnValueOnce(stale.promise)
      .mockResolvedValueOnce({ messages: [current], hasMore: false, nextCursor: null });
    const { rerender } = render(<ChatMessageTimeline {...timelineProps} />);
    rerender(<ChatMessageTimeline {...timelineProps} {...nextQuery} />);
    await screen.findByText(current.textContent!);
    await act(async () => stale.resolve({ messages: [message(20, 'Resultado antigo ignorado')], hasMore: true, nextCursor: null }));
    expect(screen.queryByText('Resultado antigo ignorado')).toBeNull();
    expect(screen.getByText(current.textContent!)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Carregar mais resultados' })).toBeNull();
  });

  it('limpar a busca restaura a janela normal e sua paginação, descartando a busca pendente', async () => {
    const pending = deferred<any>();
    mocks.fetchMessageSearch.mockReturnValueOnce(pending.promise);
    const loadOlder = vi.fn().mockResolvedValue(0);
    const { rerender } = render(<ChatMessageTimeline {...timelineProps} onLoadOlderMessages={loadOlder} />);
    rerender(<ChatMessageTimeline {...timelineProps} inChatSearch="" onLoadOlderMessages={loadOlder} />);
    expect(screen.getByText('Mensagem recente 121')).toBeTruthy();
    fireEvent.scroll(screen.getByRole('region', { name: 'Histórico da conversa' }));
    await waitFor(() => expect(loadOlder).toHaveBeenCalledTimes(1));
    await act(async () => pending.resolve({ messages: [message(20, 'Resultado atrasado')], hasMore: false, nextCursor: null }));
    expect(screen.queryByText('Resultado atrasado')).toBeNull();
    expect(screen.getByText('Mensagem recente 200')).toBeTruthy();
    expect(mocks.fetchMessageSearch).toHaveBeenCalledTimes(1);
  });

  it('sem termo não consulta o servidor e mantém a mensagem alvo de um salto normal', () => {
    const target = message(20, 'Contexto citado antigo');
    const jumpComplete = vi.fn();
    render(<ChatMessageTimeline {...timelineProps} inChatSearch="" messages={[target, ...latest]}
      jumpToMessageId={target.id} onJumpComplete={jumpComplete} />);
    expect(screen.getByText(target.textContent!)).toBeTruthy();
    expect(jumpComplete).toHaveBeenCalled();
    expect(mocks.fetchMessageSearch).not.toHaveBeenCalled();
  });
});

describe('Formulário de busca de mensagens', () => {
  it('repete a consulta com o mesmo termo ao submeter novamente ou recarregar a conversa', async () => {
    const source = message(20, 'Primeiro resultado agulha');
    const incoming = message(201, 'Novo resultado agulha');
    const refreshed = message(202, 'Resultado após recarregar agulha');
    const refreshMessages = vi.fn();
    mocks.fetchMessageSearch
      .mockResolvedValueOnce({ messages: [source], hasMore: false, nextCursor: null })
      .mockResolvedValueOnce({ messages: [incoming, source], hasMore: false, nextCursor: null })
      .mockResolvedValueOnce({ messages: [refreshed, incoming, source], hasMore: false, nextCursor: null });
    render(<ChatArea conversation={{ id: 'conversation-1', contactPhone: '5511999990000', contactName: 'Fixture', tags: [], status: 'open' } as WhatsAppConversation}
      messages={latest} teamMembers={[]} isLoadingMessages={false} isInfoPanelOpen={false}
      onBackMobile={vi.fn()} onToggleInfoPanel={vi.fn()} onToggleArchive={vi.fn()}
      onRefreshMessages={refreshMessages} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pesquisar na conversa', exact: true }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Pesquisar nesta conversa' }), { target: { value: 'agulha' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar', exact: true }));
    await screen.findByText(source.textContent!);
    fireEvent.click(screen.getByRole('button', { name: 'Buscar', exact: true }));
    await screen.findByText(incoming.textContent!);
    expect(mocks.fetchMessageSearch).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'Recarregar mensagens', exact: true }));
    await screen.findByText(refreshed.textContent!);
    expect(refreshMessages).toHaveBeenCalledTimes(1);
    expect(mocks.fetchMessageSearch).toHaveBeenCalledTimes(3);
    mocks.fetchMessageSearch.mock.calls.forEach((call) => expect(call.slice(1)).toEqual(['conversation-1', null, 'agulha']));
  });

  it('executa o resolver, impede busca longa e submete o texto normalizado', async () => {
    const onSearchChange = vi.fn();
    render(<ChatInChatSearch searchQuery="" onSearchChange={onSearchChange} onClose={vi.fn()} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'a'.repeat(101) } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    await screen.findByRole('alert');
    expect(onSearchChange).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '  agulha  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    await waitFor(() => expect(onSearchChange).toHaveBeenCalledWith('agulha'));
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Limpar pesquisa' }));
    await waitFor(() => expect(onSearchChange).toHaveBeenLastCalledWith(''));
  });
});
