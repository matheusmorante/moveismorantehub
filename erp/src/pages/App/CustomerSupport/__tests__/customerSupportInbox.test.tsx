// @vitest-environment happy-dom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { fetchConversationCounts, fetchConversations, fetchTeamProfiles, type FetchConversationsOptions } from '@/pages/utils/customerSupport/customerSupportService';
import {
  DEFAULT_SUPPORT_FOLDER_CRITERIA,
  fetchCustomerSupportFolders,
  saveCustomerSupportFolder,
  deleteCustomerSupportFolder,
} from '@/pages/utils/customerSupport/customerSupportInboxService';
import { verifyMetaSignature } from '@/pages/utils/customerSupport/whatsappWebhookProcessor';
import { AddCustomInboxModal } from '../components/inbox/AddCustomInboxModal';
import { InboxSectionCustom } from '../components/inbox/InboxSectionCustom';
import { InboxSectionTeam } from '../components/inbox/InboxSectionTeam';
import { ChatComposer } from '../components/chat/ChatComposer';
import { CustomerNotesTab } from '../components/infoPanel/CustomerNotesTab';
import { QuickSnippetsModal } from '../components/QuickSnippetsModal';
import { ActivityTimelineDrawer } from '../components/ActivityTimelineDrawer';
import whatsappDispatchHandler from '../../../../../../api/whatsapp-dispatch';

afterEach(() => cleanup());

const makeFolder = (id: string, name: string, createdBy: string) => ({
  id,
  name,
  criteria: { ...DEFAULT_SUPPORT_FOLDER_CRITERIA },
  createdBy,
  createdAt: '2026-10-20T10:00:00Z',
  updatedAt: '2026-10-20T10:00:00Z',
});

describe('Inbox da Central de Atendimento', () => {
  it('passa os filtros ao servidor antes de paginar e usa o total retornado', async () => {
    const row = {
      id: 'conversation-51',
      business_phone_number_id: 'business-phone',
      contact_phone: '+5511999999999',
      contact_wa_id: '5511999999999',
      contact_name: 'Cliente 51',
      customer_id: null,
      customer_link_status: 'unlinked',
      unread_count: 1,
      is_archived: false,
      tags: [],
      assigned_to: 'agent-2',
      assigned_profile_name: 'Agente B',
      last_message_at: '2026-10-20T10:00:00Z',
      created_at: '2026-10-20T09:00:00Z',
      total_count: 51,
    };
    const firstPage = Array.from({ length: 50 }, (_, index) => ({ ...row, id: `conversation-${index + 1}` }));
    const rpc = vi.fn((_name, args) => Promise.resolve({
      data: args.p_page === 1 ? firstPage : [row],
      error: null,
    }));
    const options: Omit<FetchConversationsOptions, 'page'> = {
      pageSize: 50,
      filter: 'all',
      agentId: 'agent-2',
      search: 'cliente',
      criteria: { ...DEFAULT_SUPPORT_FOLDER_CRITERIA, unread: true, orders: 'with_orders' as const },
      canViewCommercialInfo: true,
    };
    const first = await fetchConversations({ rpc } as any, { ...options, page: 1 });
    const second = await fetchConversations({ rpc } as any, { ...options, page: 2 });

    expect(rpc).toHaveBeenCalledWith('customer_support_list_conversations', expect.objectContaining({
      p_page_size: 50,
      p_sort_order: 'newest',
      p_filter: 'all',
      p_search: 'cliente',
      p_agent_id: 'agent-2',
      p_criteria: expect.objectContaining({ unread: true, orders: 'with_orders' }),
    }));
    expect(rpc.mock.calls.map(([, args]) => args.p_page)).toEqual([1, 2]);
    expect(first.conversations).toHaveLength(50);
    expect(second.conversations).toHaveLength(1);
    expect(first.totalCount).toBe(51);
    expect(second.totalCount).toBe(51);
  });

  it('usa contagens agregadas do servidor e carrega somente atendentes autorizados pelo RPC', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: [{ all_count: '120', mine_count: '14', unassigned_count: '8', unread_count: '17' }], error: null })
      .mockResolvedValueOnce({ data: [{ id: 'agent-1', full_name: 'Ana', role: 'seller' }], error: null });
    const supabase = { rpc } as any;

    await expect(fetchConversationCounts(supabase)).resolves.toEqual({ all: 120, mine: 14, unassigned: 8, unread: 17 });
    await expect(fetchTeamProfiles(supabase)).resolves.toEqual([{ id: 'agent-1', fullName: 'Ana', role: 'seller' }]);
    expect(rpc).toHaveBeenNthCalledWith(2, 'customer_support_list_agents');
  });

  it('distingue falha do diretório de uma resposta válida sem atendentes', async () => {
    const failed = { rpc: vi.fn().mockResolvedValue({ data: null, error: { code: '42501', message: 'Detalhe interno' } }) };
    await expect(fetchTeamProfiles(failed as any)).rejects.toThrow('Não foi possível carregar os atendentes. Tente novamente.');
    const empty = { rpc: vi.fn().mockResolvedValue({ data: [], error: null }) };
    await expect(fetchTeamProfiles(empty as any)).resolves.toEqual([]);
  });

  it('mostra falha e carregamento dos atendentes sem informar um falso diretório vazio', () => {
    const retry = vi.fn();
    const props = { agents: [], activeAgentId: null, onSelectAgent: vi.fn(), isExpanded: true,
      onToggleExpand: vi.fn(), onRetry: retry };
    const error = 'Não foi possível carregar os atendentes. Tente novamente.';
    const { rerender } = render(<InboxSectionTeam {...props} error={error} />);
    expect(screen.getByRole('alert').textContent).toContain(error);
    expect(screen.queryByText('Nenhum atendente autorizado encontrado.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar carregar atendentes novamente' }));
    expect(retry).toHaveBeenCalledTimes(1);
    rerender(<InboxSectionTeam {...props} isLoading />);
    expect(screen.getByRole('status').textContent).toContain('Carregando atendentes');
    expect(screen.queryByText('Nenhum atendente autorizado encontrado.')).toBeNull();
    rerender(<InboxSectionTeam {...props} />);
    expect(screen.getByText('Nenhum atendente autorizado encontrado.')).toBeTruthy();
  });

  it.each([
    ['CUSTOMER_SUPPORT_COMMERCIAL_PERMISSION_DENIED', 'Você não tem permissão para consultar pedidos nesta fila ou pasta.'],
    ['CUSTOMER_SUPPORT_PERMISSION_DENIED', 'Você não tem permissão para acessar a Central de Atendimento.'],
  ])('apresenta a recusa de permissão %s sem buscar dados comerciais', async (message, feedback) => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: '42501', message } });
    await expect(fetchConversations({ rpc } as any, { canViewCommercialInfo: true })).rejects.toThrow(feedback);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('mantém o feedback genérico para falhas sem um contrato conhecido de permissão', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: 'XX000', message: 'Detalhe técnico interno' } });
    await expect(fetchConversations({ rpc } as any)).rejects.toThrow('Não foi possível carregar as conversas. Tente atualizar a lista.');
  });

  it('persiste pastas compartilhadas com autor e reabre os critérios salvos', async () => {
    const criteria = { ...DEFAULT_SUPPORT_FOLDER_CRITERIA, status: 'snoozed' as const, unread: true };
    const insertedPayloads: any[] = [];
    const savedRow = {
      id: 'folder-1', name: 'Retornos', criteria, created_by: 'user-1',
      created_at: '2026-10-20T10:00:00Z', updated_at: '2026-10-20T10:00:00Z',
    };
    const supabase = {
      from: vi.fn(() => ({
        insert: vi.fn((payload) => {
          insertedPayloads.push(payload);
          return { select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: savedRow, error: null }) };
        }),
        select: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [savedRow], error: null }) }),
      })),
    } as any;

    const saved = await saveCustomerSupportFolder(supabase, { name: ' Retornos ', criteria, userId: 'user-1' });
    const reopened = await fetchCustomerSupportFolders(supabase);
    expect(insertedPayloads[0]).toMatchObject({ name: 'Retornos', created_by: 'user-1', criteria });
    expect(saved.folder?.createdBy).toBe('user-1');
    expect(reopened[0].criteria).toEqual(criteria);
  });

  it('separa pastas nas abas Por mim e Outras usando o autor salvo', () => {
    const folders = [makeFolder('mine', 'Minha pasta', 'user-1'), makeFolder('other', 'Pasta da Ana', 'user-2')];
    const onTabChange = vi.fn();
    const props = {
      folders,
      activeFolderId: null,
      currentUserId: 'user-1',
      onSelectFolder: vi.fn(),
      onEditFolder: vi.fn(),
      onDeleteFolder: vi.fn(),
      isExpanded: true,
      onToggleExpand: vi.fn(),
      onTabChange,
      onOpenAddModal: vi.fn(),
    };
    const { rerender } = render(
      <InboxSectionCustom
        {...props}
        customInboxTab="all"
      />
    );
    expect(screen.getByText('Minha pasta')).toBeTruthy();
    expect(screen.getByText('Pasta da Ana')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Editar pasta Pasta da Ana' }));
    expect(props.onEditFolder).toHaveBeenCalledWith(folders[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir pasta Pasta da Ana' }));
    expect(props.onDeleteFolder).toHaveBeenCalledWith(folders[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Por mim' }));
    expect(onTabChange).toHaveBeenCalledWith('by_me');
    rerender(<InboxSectionCustom {...props} customInboxTab="by_me" />);
    expect(screen.getByText('Minha pasta')).toBeTruthy();
    expect(screen.queryByText('Pasta da Ana')).toBeNull();
    rerender(<InboxSectionCustom {...props} customInboxTab="by_others" />);
    expect(screen.queryByText('Minha pasta')).toBeNull();
    expect(screen.getByText('Pasta da Ana')).toBeTruthy();
  });

  it('mostra a falha de pastas, permite repetir e só mostra vazio após uma consulta concluída', () => {
    const retry = vi.fn();
    const props = { folders: [], activeFolderId: null, onSelectFolder: vi.fn(), onEditFolder: vi.fn(),
      onDeleteFolder: vi.fn(), isExpanded: true, onToggleExpand: vi.fn(), customInboxTab: 'all' as const,
      onTabChange: vi.fn(), onOpenAddModal: vi.fn(), onRetry: retry };
    const error = 'Não foi possível carregar as pastas. Tente atualizar.';
    const { rerender } = render(<InboxSectionCustom {...props} error={error} />);
    expect(screen.getByRole('alert').textContent).toContain(error);
    expect(screen.queryByText('Nenhuma pasta nesta aba.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar carregar pastas novamente' }));
    expect(retry).toHaveBeenCalledTimes(1);
    rerender(<InboxSectionCustom {...props} isLoading />);
    expect(screen.getByRole('status').textContent).toContain('Carregando pastas');
    expect(screen.queryByText('Nenhuma pasta nesta aba.')).toBeNull();
    rerender(<InboxSectionCustom {...props} />);
    expect(screen.getByText('Nenhuma pasta nesta aba.')).toBeTruthy();
    rerender(<InboxSectionCustom {...props} folders={[makeFolder('retained', 'Pasta mantida', 'owner')]} error={error} />);
    expect(screen.getByText('Pasta mantida')).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('edita critérios de pasta compartilhada sem enviar novo autor ou identidade', async () => {
    const update = vi.fn();
    const row = { id: 'other-folder', name: 'Retornos', criteria: DEFAULT_SUPPORT_FOLDER_CRITERIA,
      created_by: 'original-author', created_at: '2026-10-20T10:00:00Z', updated_at: '2026-10-21T10:00:00Z' };
    const chain = { eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: row, error: null }) };
    update.mockReturnValue(chain);
    const client = { from: vi.fn(() => ({ update })) } as any;
    const result = await saveCustomerSupportFolder(client, { id: row.id, name: row.name, criteria: row.criteria, userId: 'editor' });
    expect(result.folder?.createdBy).toBe('original-author');
    expect(Object.keys(update.mock.calls[0][0]).sort()).toEqual(['criteria', 'name', 'updated_at']);
    expect(chain.eq).toHaveBeenCalledWith('id', row.id);
  });

  it('explica recusa de permissão sem atribuí-la à autoria da pasta', async () => {
    const chain = { eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { code: '42501' } }) };
    const client = { from: vi.fn(() => ({ delete: () => chain })) } as any;
    expect((await deleteCustomerSupportFolder(client, 'other-folder')).error).toBe('Você não tem permissão para excluir esta pasta.');
  });

  it('valida a criação de pasta com zodResolver antes de persistir', async () => {
    const onSave = vi.fn().mockResolvedValue(null);
    render(<AddCustomInboxModal isOpen onClose={vi.fn()} agents={[]} canViewCommercialInfo={false} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Criar pasta' }));
    await waitFor(() => expect(screen.getByText('O nome deve ter pelo menos 2 caracteres.')).toBeTruthy());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('valida comentários e tags antes de chamar os serviços', async () => {
    const addComment = vi.fn().mockResolvedValue(false);
    render(<ChatComposer onAddInternalNote={addComment} onOpenSnippets={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Comment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Comentário' }));
    await waitFor(() => expect(screen.getByText('Escreva um comentário antes de salvar.')).toBeTruthy());
    expect(addComment).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: ' Observação válida ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Comentário' }));
    await waitFor(() => expect(screen.getByText('Não foi possível salvar o comentário.')).toBeTruthy());
    expect(addComment).toHaveBeenCalledWith('Observação válida');

    cleanup();
    const addTag = vi.fn().mockResolvedValue(false);
    render(
      <CustomerNotesTab
        careWindow={{ isOpen: false, remainingMs: 0, remainingHours: 0, remainingMinutes: 0, expiresAt: null }}
        lastCustomerMessageAt={null}
        tags={[]}
        onAddTag={addTag}
        onRemoveTag={vi.fn().mockResolvedValue(true)}
        onSaveNotes={vi.fn().mockResolvedValue(true)}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    await waitFor(() => expect(screen.getByText('Digite um marcador.')).toBeTruthy());
    expect(addTag).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText('Adicionar marcador'), { target: { value: 'prioridade' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    await waitFor(() => expect(screen.getByText('Não foi possível salvar o marcador.')).toBeTruthy());
    expect(addTag).toHaveBeenCalledWith('prioridade');
  });

  it('oculta ferramentas sem função e mantém visível o bloqueio de envio', () => {
    render(<ChatComposer onAddInternalNote={vi.fn()} onOpenSnippets={vi.fn()} />);

    for (const title of [
      'Emojis',
      'Gravar áudio',
      'Anexar arquivo',
      'Inserir Variável / Tag',
      'Canal WhatsApp',
      'Assistente de IA / Respostas Inteligentes',
      'Expandir editor',
    ]) {
      expect(screen.queryByTitle(title)).toBeNull();
    }

    expect(screen.getByTitle('Modelos Rápidos / Snippets')).toBeTruthy();
    expect(screen.getByText('Whatsapp')).toBeTruthy();
    expect(screen.getByText('Envio bloqueado pela política da empresa')).toBeTruthy();
    expect(
      screen
        .getByTitle('O envio de mensagens para o cliente está bloqueado pela política da empresa')
        .hasAttribute('disabled'),
    ).toBe(true);
  });

  it('copia um snippet sem criar um comentário interno', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const createNote = vi.spyOn(await import('@/pages/utils/customerSupport/customerSupportService'), 'createInternalNoteMessage');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<QuickSnippetsModal isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Copiar' })[0]);
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(String(writeText.mock.calls[0][0])).toContain('PIX');
    expect(String(writeText.mock.calls[0][0])).not.toContain('12.345.678/0001-90');
    expect(createNote).not.toHaveBeenCalled();
  });

  it('mostra somente eventos persistidos e remove duplicatas da linha do tempo', () => {
    const event = {
      id: 'event-1', conversationId: 'conversation-1', apiMessageId: null,
      direction: 'outbound' as const, messageType: 'system_event' as const,
      textContent: 'Atendimento atribuído a Ana por Carlos', mediaId: null,
      mediaMimeType: null, mediaUrl: null, mediaFilename: null, mediaCaption: null,
      replyToMessageId: null, replyToWamid: null, status: 'received' as const,
      errorCode: null, failureReason: null, timestamp: '2026-10-20T10:00:00Z',
      createdAt: '2026-10-20T10:00:00Z',
    };
    const { container } = render(<ActivityTimelineDrawer messages={[event, event]} isOpen onClose={vi.fn()} />);
    expect(container.textContent?.match(/Atendimento atribuído a Ana por Carlos/g)).toHaveLength(1);
    expect(container.textContent).not.toContain('Fluxo Automático Iniciado');
    expect(container.textContent).not.toContain('Conversa iniciada via WhatsApp');
  });

  it('rejeita assinatura inválida e segredo ausente', () => {
    expect(verifyMetaSignature('{"event":1}', 'sha256=invalid', 'app-secret')).toBe(false);
    expect(verifyMetaSignature('{"event":1}', undefined, undefined)).toBe(false);
    expect(verifyMetaSignature('{"event":1}', '0123456789abcdef', 'app-secret')).toBe(false);
  });

  it('webhook HTTP rejeita assinatura inválida e segredo ausente em produção', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalAppSecret = process.env.WHATSAPP_APP_SECRET;
    const originalMetaSecret = process.env.META_APP_SECRET;
    try {
      process.env.NODE_ENV = 'production';
      process.env.WHATSAPP_APP_SECRET = '';
      process.env.META_APP_SECRET = '';
      vi.resetModules();
      const { default: missingSecretHandler } = await import('../../../../../../api/whatsapp-webhook');
      const missingSecretResponse = makeResponse();
      await missingSecretHandler(makePostRequest('sha256=invalid') as any, missingSecretResponse as any);
      expect(missingSecretResponse.statusCode).toBe(503);

      process.env.WHATSAPP_APP_SECRET = 'configured-secret';
      vi.resetModules();
      const { default: invalidSignatureHandler } = await import('../../../../../../api/whatsapp-webhook');
      const invalidSignatureResponse = makeResponse();
      await invalidSignatureHandler(makePostRequest('sha256=invalid') as any, invalidSignatureResponse as any);
      expect(invalidSignatureResponse.statusCode).toBe(401);
    } finally {
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;
      if (originalAppSecret === undefined) delete process.env.WHATSAPP_APP_SECRET;
      else process.env.WHATSAPP_APP_SECRET = originalAppSecret;
      if (originalMetaSecret === undefined) delete process.env.META_APP_SECRET;
      else process.env.META_APP_SECRET = originalMetaSecret;
      vi.resetModules();
    }
  });

  it('mantém o despacho bloqueado no backend', async () => {
    const response = {
      statusCode: 200,
      setHeader: vi.fn(),
      status(code: number) { this.statusCode = code; return this; },
      json: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
    } as any;
    await whatsappDispatchHandler({ method: 'POST', headers: {} } as any, response);
    expect(response.statusCode).toBe(403);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'BLOCKED_FREE_TIER_PROTECTION' }));
  });
});

function makePostRequest(signature: string) {
  return {
    method: 'POST',
    headers: { 'x-hub-signature-256': signature },
    query: {},
    async *[Symbol.asyncIterator]() {
      yield Buffer.from('{"entry":[]}');
    },
  };
}

function makeResponse() {
  return {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(value: unknown) { this.body = value; return this; },
    send(value: unknown) { this.body = value; return this; },
    end(value?: unknown) { this.body = value; return this; },
    setHeader() { return this; },
  };
}
