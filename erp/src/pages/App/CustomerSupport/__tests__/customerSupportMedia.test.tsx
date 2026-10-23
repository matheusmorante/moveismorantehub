// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { useCustomerSupportMedia } from '../hooks/useCustomerSupportMedia';
import { MessageBubble } from '../components/MessageBubble';
import { CustomerMediaTab } from '../components/infoPanel/CustomerMediaTab';
import type { WhatsAppMessage } from '../types';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  fetchAttachments: vi.fn(),
  user: { id: 'operator' } as { id: string } | null,
}));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { auth: { getSession: mocks.getSession } } }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/pages/utils/customerSupport/customerSupportService', () => ({ fetchConversationAttachmentPage: mocks.fetchAttachments }));
const BrowserURL = globalThis.URL;
let createObjectURL: ReturnType<typeof vi.fn>;
let revokeObjectURL: ReturnType<typeof vi.fn>;
let fetchMock: ReturnType<typeof vi.fn>;
const message = (overrides: Partial<WhatsAppMessage> = {}): WhatsAppMessage => ({
  id: 'message-1', conversationId: 'conversation-1', apiMessageId: 'wamid.1', direction: 'inbound', messageType: 'image',
  textContent: null, mediaId: '12345', mediaUrl: 'https://untrusted.example/private-file', mediaMimeType: 'image/jpeg',
  mediaFilename: null, mediaCaption: null, replyToMessageId: null, replyToWamid: null, status: 'received', errorCode: null,
  failureReason: null, timestamp: '2026-10-21T12:00:00Z', createdAt: '2026-10-21T12:00:00Z', ...overrides,
});

beforeEach(() => {
  mocks.user = { id: 'operator' };
  mocks.fetchAttachments.mockResolvedValue({
    messages: [message(), message({ id: 'document', messageType: 'document', mediaId: '98765', mediaFilename: 'arquivo.pdf' })],
    hasMore: false,
    nextCursor: null,
  });
  mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'private-jwt' } }, error: null });
  createObjectURL = vi.fn().mockReturnValue('blob:private-media');
  revokeObjectURL = vi.fn();
  vi.stubGlobal('URL', class extends BrowserURL {
    static createObjectURL = createObjectURL;
    static revokeObjectURL = revokeObjectURL;
  });
  fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['file']) });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('Mídias da Central no navegador', () => {
  it('envia o JWT somente no header e revoga a URL ao desmontar', async () => {
    const { result, unmount } = renderHook(() => useCustomerSupportMedia('12345'));
    await waitFor(() => expect(result.current.mediaUrl).toBe('blob:private-media'));
    expect(fetchMock).toHaveBeenCalledWith('/api/whatsapp-media?id=12345', expect.objectContaining({ headers: { Authorization: 'Bearer private-jwt' }, cache: 'no-store' }));
    expect(fetchMock.mock.calls[0][0]).not.toContain('private-jwt');
    const signal = fetchMock.mock.calls[0][1].signal;
    unmount();
    expect(signal.aborted).toBe(true);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:private-media');
  });

  it('remove a mídia da sessão anterior ao sair', async () => {
    const { result, rerender } = renderHook(() => useCustomerSupportMedia('12345'));
    await waitFor(() => expect(result.current.mediaUrl).toBeTruthy());
    mocks.user = null;
    rerender();
    expect(result.current.mediaUrl).toBeNull();
    expect(result.current.mediaError).toMatch(/Entre novamente/);
    expect(revokeObjectURL).toHaveBeenCalled();
  });

  it('cancela a consulta antiga quando a mídia muda', async () => {
    let resolveBlob!: (blob: Blob) => void;
    fetchMock.mockResolvedValueOnce({ ok: true, blob: () => new Promise<Blob>((resolve) => { resolveBlob = resolve; }) });
    const { result, rerender } = renderHook(({ id }) => useCustomerSupportMedia(id), { initialProps: { id: '12345' } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const oldSignal = fetchMock.mock.calls[0][1].signal;
    rerender({ id: '67890' });
    await waitFor(() => expect(result.current.mediaUrl).toBe('blob:private-media'));
    await act(async () => resolveBlob(new Blob(['old-file'])));
    expect(oldSignal.aborted).toBe(true);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('mostra falha e permite repetir a leitura autenticada', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Sem permissão para acessar a Central.' }) });
    render(<MessageBubble message={message()} />);
    await screen.findByRole('alert');
    expect(screen.getByText('Sem permissão para acessar a Central.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(screen.getByRole('img').getAttribute('src')).toBe('blob:private-media'));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('não busca a Meta nem o proxy sem sessão', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    const { result } = renderHook(() => useCustomerSupportMedia('12345'));
    await waitFor(() => expect(result.current.mediaError).toMatch(/Entre novamente/));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['image', 'audio', 'video', 'document', 'sticker'] as const)('renderiza %s usando apenas blob local', async (messageType) => {
    const { container } = render(<MessageBubble message={message({ messageType, mediaFilename: 'documento.pdf' })} />);
    const element = await waitFor(() => {
      const media = container.querySelector('img, audio, video, a[download]');
      expect(media).toBeTruthy();
      return media!;
    });
    expect(element.getAttribute(messageType === 'document' ? 'href' : 'src')).toBe('blob:private-media');
    expect(container.innerHTML).not.toMatch(/private-jwt|untrusted.example|\/api\/whatsapp-media/);
  });

  it('usa a mesma leitura protegida na galeria e no download de documentos', async () => {
    const jumpToMessage = vi.fn();
    render(<CustomerMediaTab conversationId="conversation-1" onJumpToMessage={jumpToMessage} />);
    await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(2));
    screen.getAllByRole('link').forEach((link) => expect(link.getAttribute('href')).toBe('blob:private-media'));
    expect(screen.getByRole('link', { name: 'Abrir arquivo.pdf' }).getAttribute('download')).toBe('arquivo.pdf');
    fireEvent.click(screen.getAllByRole('button', { name: 'Ver na conversa' })[0]);
    expect(jumpToMessage).toHaveBeenCalledWith(message());
  });

  it('carrega mais anexos com cursor próprio e salta à origem de cada item', async () => {
    const document = message({ id: 'document-2', messageType: 'document', mediaId: '98766', mediaFilename: 'novo.pdf' });
    mocks.fetchAttachments
      .mockResolvedValueOnce({ messages: [message()], hasMore: true, nextCursor: { timestamp: message().timestamp, id: message().id } })
      .mockResolvedValueOnce({ messages: [document], hasMore: false, nextCursor: null });
    const jumpToMessage = vi.fn();
    render(<CustomerMediaTab conversationId="conversation-1" onJumpToMessage={jumpToMessage} />);
    await screen.findByRole('button', { name: 'Carregar mais anexos' });
    fireEvent.click(screen.getByRole('button', { name: 'Carregar mais anexos' }));
    await screen.findByRole('link', { name: 'Abrir novo.pdf' });
    expect(mocks.fetchAttachments).toHaveBeenCalledTimes(2);
    expect(mocks.fetchAttachments.mock.calls[1][2]).toEqual({ timestamp: message().timestamp, id: message().id });
    fireEvent.click(screen.getAllByRole('button', { name: 'Ver na conversa' })[1]);
    expect(jumpToMessage).toHaveBeenCalledWith(document);
  });

  it('valida e normaliza a busca da galeria pelo resolver Zod', async () => {
    render(<CustomerMediaTab conversationId="conversation-1" onJumpToMessage={vi.fn()} />);
    await waitFor(() => expect(mocks.fetchAttachments).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'x'.repeat(101) } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    await screen.findByRole('alert');
    expect(mocks.fetchAttachments).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '  contrato  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    await waitFor(() => expect(mocks.fetchAttachments).toHaveBeenCalledTimes(2));
    expect(mocks.fetchAttachments.mock.calls[1][3]).toBe('contrato');
  });

  it('carrega a mensagem citada ao solicitar contexto e salta até ela', async () => {
    const source = message({ id: 'source', apiMessageId: 'wamid.source', messageType: 'text', mediaId: null, textContent: 'Dúvida original do cliente' });
    const reply = message({ id: 'reply', messageType: 'text', mediaId: null, textContent: 'Resposta do atendente', replyToWamid: 'wamid.source' });
    const resolveReply = vi.fn().mockResolvedValue(source);
    const jumpToMessage = vi.fn();
    render(<MessageBubble message={reply} onResolveReplyTarget={resolveReply} onJumpToMessage={jumpToMessage} />);

    fireEvent.click(screen.getByRole('button', { name: 'Carregar contexto citado' }));
    await screen.findByText('Dúvida original do cliente');
    expect(resolveReply).toHaveBeenCalledWith({
      conversationId: 'conversation-1', messageId: null, apiMessageId: 'wamid.source',
    });
    expect(jumpToMessage).toHaveBeenCalledWith(source);
  });

  it.each(['location', 'contacts'] as const)('exibe conteúdo persistido para %s', (messageType) => {
    render(<MessageBubble message={message({ messageType, mediaId: null, textContent: 'Conteúdo compartilhado' })} />);
    expect(screen.getByText('Conteúdo compartilhado')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
