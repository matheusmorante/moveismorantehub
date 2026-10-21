// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { useCustomerSupportMedia } from '../hooks/useCustomerSupportMedia';
import { MessageBubble } from '../components/MessageBubble';
import { CustomerMediaTab } from '../components/infoPanel/CustomerMediaTab';
import type { WhatsAppMessage } from '../types';

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), user: { id: 'operator' } as { id: string } | null }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { auth: { getSession: mocks.getSession } } }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
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
    render(<CustomerMediaTab imageMessages={[message()]} docMessages={[message({ id: 'document', messageType: 'document', mediaId: '98765', mediaFilename: 'arquivo.pdf' })]} />);
    await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(2));
    screen.getAllByRole('link').forEach((link) => expect(link.getAttribute('href')).toBe('blob:private-media'));
    expect(screen.getByRole('link', { name: 'Baixar arquivo.pdf' }).getAttribute('download')).toBe('arquivo.pdf');
  });

  it.each(['location', 'contacts'] as const)('exibe conteúdo persistido para %s', (messageType) => {
    render(<MessageBubble message={message({ messageType, mediaId: null, textContent: 'Conteúdo compartilhado' })} />);
    expect(screen.getByText('Conteúdo compartilhado')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
