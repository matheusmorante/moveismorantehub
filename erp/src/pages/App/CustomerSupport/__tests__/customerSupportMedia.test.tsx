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
  it('renderiza eco enviado pelo app como mensagem de saída e identifica sua origem', () => {
    const { container } = render(<MessageBubble message={message({
      direction: 'outbound', messageType: 'text', textContent: 'Respondido no celular',
      authorName: 'WhatsApp Business (celular)', mediaId: null,
    })} />);

    expect(screen.getByText('Respondido no celular')).toBeTruthy();
    expect(container.querySelector('[title="WhatsApp Business (celular)"]')).toBeTruthy();
    expect(container.textContent).toContain('WB');
  });

  it('identifica mensagens encaminhadas frequentemente', () => {
    render(<MessageBubble message={message({
      messageType: 'text',
      mediaId: null,
      textContent: 'Confira esta informação',
      rawPayload: { provider_message_type: 'text', frequently_forwarded: true },
    })} />);

    expect(screen.getByText('Encaminhada muitas vezes')).toBeTruthy();
  });

  it('exibe metadados de segurança e referência recebidos com mídia', () => {
    render(<MessageBubble message={message({
      rawPayload: {
        provider_message_type: 'image',
        identity: { acknowledged: true, created_timestamp: 1_603_232_300_000 },
        referral: { headline: 'Oferta do almoço', body: 'Cardápio de hoje', source_type: 'ad', source_id: 'ad-42' },
      },
    })} />);

    expect(screen.getByRole('note', { name: 'Aviso de segurança do WhatsApp' }).textContent).toContain('notificação de segurança');
    expect(screen.getByRole('note', { name: 'Contexto da mensagem' }).textContent).toContain('Oferta do almoço');
    expect(screen.getByRole('note', { name: 'Contexto da mensagem' }).textContent).toContain('ad-42');
  });

  it('permite encaminhar uma figurinha recebida', () => {
    const onForwardMessage = vi.fn();
    const sticker = message({ messageType: 'sticker', mediaMimeType: 'image/webp' });
    render(<MessageBubble message={sticker} onForwardMessage={onForwardMessage} />);

    fireEvent.click(screen.getByRole('button', { name: 'Encaminhar mensagem' }));
    expect(onForwardMessage).toHaveBeenCalledWith(sticker);
  });

  it.each(['system', 'request_welcome'] as const)('não oferece responder ou encaminhar para eventos %s', (providerMessageType) => {
    render(<MessageBubble
      message={message({
        messageType: 'interactive',
        mediaId: null,
        textContent: 'Aviso do WhatsApp',
        rawPayload: { provider_message_type: providerMessageType },
      })}
      onReplyMessage={vi.fn()}
      onForwardMessage={vi.fn()}
    />);

    expect(screen.queryByRole('button', { name: 'Responder esta mensagem' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Encaminhar mensagem' })).toBeNull();
  });

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

  it('explica indisponibilidade de rede sem exibir o erro bruto do navegador', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    render(<MessageBubble message={message()} />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('Não foi possível conectar ao serviço de mídia. Verifique sua conexão e tente novamente.')).toBeTruthy();
    expect(screen.queryByText('Failed to fetch')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(screen.getByRole('img').getAttribute('src')).toBe('blob:private-media'));
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

  it('usa ícone genérico para documentos sem MIME PDF', () => {
    const { container } = render(<MessageBubble message={message({
      messageType: 'document',
      mediaId: null,
      mediaMimeType: 'application/zip',
      mediaFilename: 'anexos.zip',
    })} />);

    expect(container.querySelector('.bi-file-earmark-pdf-fill')).toBeNull();
    expect(container.querySelector('.bi-file-earmark')).toBeTruthy();
    expect(screen.getByText('ZIP')).toBeTruthy();
  });

  it('reproduz áudio com controles no estilo WhatsApp, busca e velocidade sem controles nativos', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const { container } = render(<MessageBubble message={message({ messageType: 'audio', mediaMimeType: 'audio/ogg' })} />);
    const audio = await waitFor(() => {
      const element = container.querySelector('audio');
      expect(element).toBeTruthy();
      return element!;
    });
    let currentTime = 0;
    Object.defineProperties(audio, {
      duration: { configurable: true, value: 12 },
      currentTime: { configurable: true, get: () => currentTime, set: (value: number) => { currentTime = value; } },
      playbackRate: { configurable: true, writable: true, value: 1 },
    });
    fireEvent.loadedMetadata(audio);
    await screen.findByText('0:00 / 0:12');
    expect(audio.hasAttribute('controls')).toBe(false);
    pause.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Reproduzir áudio' }));
    await waitFor(() => expect(play).toHaveBeenCalledOnce());
    expect(screen.getByRole('button', { name: 'Pausar áudio' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Velocidade 1x' }));
    expect(audio.playbackRate).toBe(1.5);
    fireEvent.click(screen.getByRole('button', { name: 'Velocidade 1.5x' }));
    expect(audio.playbackRate).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: 'Velocidade 2x' }));
    expect(audio.playbackRate).toBe(1);

    fireEvent.change(screen.getByRole('slider', { name: 'Posição do áudio' }), { target: { value: '6' } });
    expect(audio.currentTime).toBe(6);
    await screen.findByText('0:06 / 0:12');

    fireEvent.click(screen.getByRole('button', { name: 'Pausar áudio' }));
    expect(pause).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Reproduzir áudio' })).toBeTruthy();
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

  it('oferece link seguro para abrir a localização compartilhada', () => {
    render(<MessageBubble message={message({
      messageType: 'location',
      mediaId: null,
      textContent: '📍 Loja Centro\n-23.55, -46.63',
      rawPayload: { location: { url: 'https://maps.example/loja' } },
    })} />);

    expect(screen.getByRole('link', { name: 'Abrir localização' }).getAttribute('href')).toBe('https://maps.example/loja');
  });

  it('não cria links de navegação para protocolos externos inseguros', () => {
    render(<MessageBubble message={message({
      messageType: 'location',
      mediaId: null,
      rawPayload: { location: { url: 'javascript:alert(1)' } },
    })} />);

    expect(screen.queryByRole('link', { name: 'Abrir localização' })).toBeNull();
  });

  it('exibe erro 131051 como aviso e mantém o código nos detalhes técnicos', () => {
    const { container } = render(<MessageBubble message={message({
      messageType: 'unsupported',
      mediaId: null,
      textContent: 'A API do WhatsApp informou que este tipo de mensagem não é suportado. (código 131051)',
      errorCode: '131051',
      failureReason: 'Unsupported message type — Message type is not currently supported',
    })} />);

    expect(screen.getByText('Mensagem não suportada pela API do WhatsApp.')).toBeTruthy();
    expect(screen.getByText('O aviso chegou sem o conteúdo original. A central não consegue recuperar a imagem, o texto nem os botões.')).toBeTruthy();
    const details = container.querySelector('details');
    expect(details?.textContent).toContain('131051');
    expect(details?.textContent).toContain('Message type is not currently supported');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('renderiza template com imagem, texto e ações dentro do balão recebido', async () => {
    render(<MessageBubble message={message({
      messageType: 'template',
      mediaId: 'template-image',
      mediaMimeType: 'image/jpeg',
      textContent: 'Modelo: atualizacao_almoco\n\nATUALIZAÇÃO DO ALMOÇO',
      rawPayload: {
        template_preview: {
          name: 'atualizacao_almoco',
          header: { type: 'image' },
          body: 'ATUALIZAÇÃO DO ALMOÇO\nPassando para informar as opções disponíveis hoje.',
          footer: 'Consulte o cardápio de hoje.',
          buttons: [
            { type: 'url', text: 'Acessar Cardápio', url: 'https://example.com/cardapio' },
            { type: 'quick_reply', text: 'Desativar mensagens' },
          ],
        },
      },
    })} />);

    expect(await screen.findByAltText('Imagem do template do WhatsApp')).toBeTruthy();
    expect(screen.getByText(/ATUALIZAÇÃO DO ALMOÇO/)).toBeTruthy();
    expect(screen.getByText('Consulte o cardápio de hoje.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Acessar Cardápio' }).getAttribute('href')).toBe('https://example.com/cardapio');
    expect(screen.getByText('Desativar mensagens')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('/api/whatsapp-media?id=template-image', expect.any(Object));
  });

  it('mostra URL insegura de template sem criar um link executável', () => {
    render(<MessageBubble message={message({
      messageType: 'template',
      mediaId: null,
      textContent: 'Modelo com ação insegura',
      rawPayload: {
        template_preview: {
          body: 'Modelo com ação insegura',
          buttons: [{ type: 'url', text: 'Abrir oferta', url: 'javascript:alert(1)' }],
        },
      },
    })} />);

    expect(screen.getByText('Abrir oferta')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Abrir oferta' })).toBeNull();
  });
});
