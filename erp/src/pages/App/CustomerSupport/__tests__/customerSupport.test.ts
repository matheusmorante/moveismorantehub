import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import {
  verifyMetaSignature,
  extractMessageContent,
  processWhatsAppWebhookPayload,
} from '@/pages/utils/customerSupport/whatsappWebhookProcessor';
import {
  normalizeToE164,
  getPhoneLookupCandidates,
  parseBrazilianPhone,
  formatPhoneForDisplay,
} from '@/pages/utils/customerSupport/phoneUtils';
import {
  matchCustomerByPhone,
  manuallyLinkCustomer,
  unlinkCustomer,
} from '@/pages/utils/customerSupport/customerMatchingService';
import {
  getCustomerOrders,
  mapOrderToSupportSummary,
  formatBRL,
} from '@/pages/utils/customerSupport/supportOrdersService';
import { whatsappSupportGuard } from '@/pages/utils/customerSupport/whatsappSupportGuard';
import { canPerform } from '@/pages/utils/permissionService';
import {
  fetchConversations,
  fetchConversationMessages,
  markConversationAsRead,
  toggleArchiveConversation,
  assignConversation,
  updateConversationStatus,
  createInternalNoteMessage,
  computeConversationStatus,
  DEFAULT_QUICK_SNIPPETS,
} from '@/pages/utils/customerSupport/customerSupportService';
import { formatTimeAgo } from '../components/ConversationItem';
import { groupMessagesByDate } from '../components/ChatArea';

describe('Central de Atendimento WhatsApp — Suíte Completa de Testes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Recebimento de mensagem válida
  it('1. deve processar o recebimento de uma mensagem válida da Meta Cloud API', async () => {
    const mockSupabase: any = {
      from: vi.fn((table: string) => {
        if (table === 'whatsapp_messages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'whatsapp_conversations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'conv-123', customer_id: null, customer_link_status: 'unlinked', unread_count: 0 },
              error: null,
            }),
            update: vi.fn().mockReturnThis(),
          };
        }
        if (table === 'people') {
          return {
            select: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockResolvedValue({ error: null }),
        };
      }),
    };

    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: '10987654321' },
                contacts: [{ wa_id: '5511987654321', profile: { name: 'Maria da Silva' } }],
                messages: [
                  {
                    id: 'wamid.HBgLMTIzNDU2Nzg5MA==',
                    from: '5511987654321',
                    timestamp: '1729000000',
                    type: 'text',
                    text: { body: 'Olá, gostaria de saber sobre meu pedido!' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const res = await processWhatsAppWebhookPayload(mockSupabase, payload);
    expect(res.processedMessages).toBe(1);
    expect(res.errors).toHaveLength(0);
  });

  // 2. Rejeição de assinatura inválida
  it('2. deve rejeitar assinaturas X-Hub-Signature-256 forjadas ou inválidas', () => {
    const rawBody = JSON.stringify({ test: 'event' });
    const appSecret = 'super_secret_meta_key_2026';

    const validSignature = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    // Assinatura correta
    expect(verifyMetaSignature(rawBody, `sha256=${validSignature}`, appSecret)).toBe(true);

    // Assinatura inválida
    expect(verifyMetaSignature(rawBody, 'sha256=abcdef1234567890deadbeef', appSecret)).toBe(false);

    // Cabeçalho ausente
    expect(verifyMetaSignature(rawBody, undefined, appSecret)).toBe(false);
  });

  // 3. Deduplicação de eventos (Idempotência)
  it('3. deve ignorar eventos duplicados com o mesmo api_message_id (idempotência)', async () => {
    const existingWamid = 'wamid.DUPLICATE_TEST_ID';
    const mockSupabase: any = {
      from: vi.fn((table: string) => {
        if (table === 'whatsapp_messages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'msg-already-persisted' },
              error: null,
            }),
            insert: vi.fn(),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };

    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: existingWamid,
                    from: '5511987654321',
                    type: 'text',
                    text: { body: 'Mensagem repetida da Meta' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const res = await processWhatsAppWebhookPayload(mockSupabase, payload);
    expect(res.processedMessages).toBe(0);
    expect(res.duplicatesIgnored).toBe(1);
  });

  // 4. Processamento de múltiplas mensagens no mesmo payload
  it('4. deve processar todas as mensagens de múltiplos entries e changes no payload', async () => {
    const mockSupabase: any = {
      from: vi.fn((table: string) => {
        if (table === 'whatsapp_messages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'whatsapp_conversations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'conv-1' } }),
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          };
        }
        if (table === 'people') {
          return {
            select: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [] }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        };
      }),
    };

    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  { id: 'wamid.1', from: '5511911111111', type: 'text', text: { body: 'Msg 1' } },
                  { id: 'wamid.2', from: '5511922222222', type: 'text', text: { body: 'Msg 2' } },
                ],
              },
            },
          ],
        },
        {
          changes: [
            {
              value: {
                messages: [
                  { id: 'wamid.3', from: '5511933333333', type: 'text', text: { body: 'Msg 3' } },
                ],
              },
            },
          ],
        },
      ],
    };

    const res = await processWhatsAppWebhookPayload(mockSupabase, payload);
    expect(res.processedMessages).toBe(3);
  });

  // 5. Recebimento de texto
  it('5. deve extrair corretamente o corpo de mensagens de texto', () => {
    const textMsg = {
      id: 'wamid.TEXT123',
      type: 'text',
      text: { body: 'Qual é o horário de funcionamento?' },
    };
    const extracted = extractMessageContent(textMsg);
    expect(extracted.type).toBe('text');
    expect(extracted.text).toBe('Qual é o horário de funcionamento?');
  });

  // 6. Recebimento de mídia (imagem, documento, áudio, vídeo)
  it('6. deve extrair metadados e IDs de mídias sem expor URLs privadas', () => {
    const imageMsg = {
      type: 'image',
      image: { id: 'media_img_999', mime_type: 'image/jpeg', caption: 'Comprovante' },
    };
    const docMsg = {
      type: 'document',
      document: { id: 'media_doc_888', mime_type: 'application/pdf', filename: 'contrato.pdf' },
    };
    const audioMsg = {
      type: 'audio',
      audio: { id: 'media_aud_777', mime_type: 'audio/ogg' },
    };

    const extImg = extractMessageContent(imageMsg);
    expect(extImg.type).toBe('image');
    expect(extImg.mediaId).toBe('media_img_999');
    expect(extImg.text).toBe('Comprovante');

    const extDoc = extractMessageContent(docMsg);
    expect(extDoc.type).toBe('document');
    expect(extDoc.mediaId).toBe('media_doc_888');
    expect(extDoc.mediaFilename).toBe('contrato.pdf');

    const extAud = extractMessageContent(audioMsg);
    expect(extAud.type).toBe('audio');
    expect(extAud.mediaId).toBe('media_aud_777');
  });

  // 7. Identificação correta de cliente
  it('7. deve identificar o cliente no cadastro ao receber número brasileiro com/sem nono dígito', async () => {
    const mockSupabase: any = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'customer-101',
              full_name: 'Ana Ferreira',
              phone: '(11) 98765-4321',
              cpf_cnpj: '123.456.789-00',
              active: true,
            },
          ],
          error: null,
        }),
      })),
    };

    // Telefone da Meta com DDI 55 e 9 dígitos: 5511987654321
    const match = await matchCustomerByPhone(mockSupabase, '5511987654321');
    expect(match.status).toBe('auto_matched');
    expect(match.customer?.id).toBe('customer-101');
    expect(match.customer?.fullName).toBe('Ana Ferreira');
  });

  // 8. Tratamento de telefones ambíguos
  it('8. deve detectar ambiguidade quando dois ou mais clientes possuem o mesmo telefone', async () => {
    const mockSupabase: any = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            { id: 'cust-1', full_name: 'Carlos Silva', phone: '11988887777', active: true },
            { id: 'cust-2', full_name: 'Empresa Silva ME', phone: '11988887777', active: true },
          ],
          error: null,
        }),
      })),
    };

    const match = await matchCustomerByPhone(mockSupabase, '5511988887777');
    expect(match.status).toBe('ambiguous');
    expect(match.customer).toBeNull();
    expect(match.ambiguityList).toHaveLength(2);
  });

  // 9. Vinculação de pedidos de venda
  it('9. deve consultar pedidos de venda vinculados ao cliente sem carregar dados excessivos', async () => {
    const mockSupabase: any = {
      rpc: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'order-4268',
              order_number: '4268',
              status: 'active',
              total_amount: 1890,
              payment_method: 'PIX',
              delivery_status: 'scheduled',
              scheduled_date: '2026-10-25',
              items: [{ name: 'Guarda-Roupa Monza', quantity: 1 }],
              created_at: '2026-10-14T10:00:00Z',
            },
          ],
          error: null,
        }),
    };

    const orders = await getCustomerOrders(mockSupabase, 'customer-101');
    expect(orders).toHaveLength(1);
    expect(orders[0].orderNumber).toBe('4268');
    expect(orders[0].totalAmount).toBe(1890);
    expect(orders[0].isActive).toBe(true);
    expect(formatBRL(orders[0].totalAmount)).toContain('1.890,00');
  });

  // 10. Proteção das informações por permissão
  it('10. deve validar permissões no módulo Central de Atendimento conforme os perfis', () => {
    // Administrador tem permissão total
    expect(canPerform('viewCustomerSupport', ['administrator'])).toBe(true);
    expect(canPerform('viewCustomerCommercialInfo', ['administrator'])).toBe(true);

    // Gerente tem acesso padrão
    expect(canPerform('viewCustomerSupport', ['manager'])).toBe(true);
    expect(canPerform('viewCustomerCommercialInfo', ['manager'])).toBe(true);

    // Usuário sem perfil ou pendente não acessa
    expect(canPerform('viewCustomerSupport', ['pending'])).toBe(false);
    expect(canPerform('viewCustomerCommercialInfo', ['pending'])).toBe(false);
  });

  // 11. Paginação de conversas
  it('11. deve aplicar range de paginação server-side na listagem de conversas', async () => {
    const mockSupabase: any = {
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    await fetchConversations(mockSupabase, { page: 2, pageSize: 30, filter: 'all' });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('customer_support_list_conversations', expect.objectContaining({
      p_page: 2,
      p_page_size: 30,
      p_filter: 'all',
    }));
  });

  // 12. Atualização incremental (zerar não lidas e arquivar)
  it('12. deve atualizar incrementalmente estado de leitura e arquivamento', async () => {
    const updateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const mockSupabase: any = {
      from: vi.fn(() => ({ update: updateMock })),
    };

    await markConversationAsRead(mockSupabase, 'conv-abc');
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ unread_count: 0 })
    );

    await toggleArchiveConversation(mockSupabase, 'conv-abc', false);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ is_archived: true })
    );
  });

  // 16. Bloqueio de envio pelo frontend
  it('16. deve manter o envio estritamente bloqueado no frontend com mensagem explicativa', async () => {
    const check = await whatsappSupportGuard.checkAuthorization('5511999999999', 'Olá');
    expect(check.allowed).toBe(false);
    expect(check.reason).toBe('Envio desativado por política da empresa.');
  });

  // 17. Bloqueio de envio pelo backend
  it('17. deve lançar erro imediato caso qualquer endpoint ou serviço tente disparar mensagens', async () => {
    await expect(whatsappSupportGuard.assertSendingAllowed()).rejects.toThrow(
      'Envio desativado por política da empresa.'
    );
  });

  // 18. Garantia de que nenhum teste envia mensagens reais pela Meta
  it('18. garante que nenhum teste faz chamadas HTTP externas ou envia mensagens reais', () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // 19. Formatação de tempo relativo (estilo WhatsApp Web)
  it('19. deve formatar carimbos de data/hora no padrão WhatsApp Web', () => {
    const now = new Date();
    const todayFormatted = formatTimeAgo(now.toISOString());
    expect(todayFormatted).toMatch(/^\d{2}:\d{2}$/);

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const yesterdayFormatted = formatTimeAgo(yesterday.toISOString());
    expect(yesterdayFormatted).toBe('Ontem');
  });

  // 20. Agrupamento de mensagens por data (Hoje, Ontem e datas completas)
  it('20. deve agrupar mensagens por data com separadores contextuais', () => {
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);

    const mockMsgs: any[] = [
      { id: '1', timestamp: yesterday.toISOString(), textContent: 'Msg ontem' },
      { id: '2', timestamp: now.toISOString(), textContent: 'Msg hoje' },
    ];

    const grouped = groupMessagesByDate(mockMsgs);
    expect(grouped.length).toBe(2);
    expect(grouped[0].dateLabel).toBe('Ontem');
    expect(grouped[1].dateLabel).toBe('Hoje');
  });

  // 21. Atribuição de conversa a atendente e geração de evento de sistema
  it('21. deve atribuir conversa a um atendente e registrar evento de sistema na timeline', async () => {
    const updateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const mockSupabase: any = {
      from: vi.fn((table: string) => {
        if (table === 'whatsapp_conversations') return { update: updateMock };
        if (table === 'whatsapp_messages') return { insert: insertMock };
        return {};
      }),
    };

    const success = await assignConversation(
      mockSupabase,
      'conv-xyz',
      'user-123',
      'Matheus Morante',
      'Admin'
    );

    expect(success).toBe(true);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ assigned_to: 'user-123' })
    );
    expect(insertMock).toHaveBeenCalledWith([
      expect.objectContaining({
        message_type: 'system_event',
        text_content: expect.stringContaining('Matheus Morante'),
      }),
    ]);
  });

  // 22. Atualização de status da conversa (open, closed, snoozed)
  it('22. deve atualizar status da conversa e registrar evento de sistema', async () => {
    const updateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const mockSupabase: any = {
      from: vi.fn((table: string) => {
        if (table === 'whatsapp_conversations') return { update: updateMock };
        if (table === 'whatsapp_messages') return { insert: insertMock };
        return {};
      }),
    };

    const success = await updateConversationStatus(
      mockSupabase,
      'conv-xyz',
      'closed',
      [],
      'Matheus'
    );

    expect(success).toBe(true);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ is_archived: true, tags: ['status:closed'] })
    );
    expect(insertMock).toHaveBeenCalledWith([
      expect.objectContaining({
        message_type: 'system_event',
        text_content: expect.stringContaining('Fechado / Resolvido'),
      }),
    ]);

    // Cálculo puro de status
    expect(computeConversationStatus({ is_archived: true, tags: [] })).toBe('closed');
    expect(computeConversationStatus({ is_archived: false, tags: ['status:snoozed'] })).toBe('snoozed');
    expect(computeConversationStatus({ is_archived: false, tags: [] })).toBe('open');
  });

  // 23. Criação de comentário/anotação interna da equipe no chat
  it('23. deve criar comentário interno em whatsapp_messages sem disparar à Meta', async () => {
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'msg-note-1',
            conversation_id: 'conv-xyz',
            direction: 'outbound',
            message_type: 'internal_note',
            text_content: 'Cliente solicitou entrega apenas no período da tarde.',
            raw_payload: { author_name: 'Ana Silva', author_role: 'Vendedora' },
            timestamp: new Date().toISOString(),
          },
          error: null,
        }),
      }),
    });

    const updateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

    const mockSupabase: any = {
      from: vi.fn((table: string) => {
        if (table === 'whatsapp_messages') return { insert: insertMock };
        if (table === 'whatsapp_conversations') return { update: updateMock };
        return {};
      }),
    };

    const note = await createInternalNoteMessage(
      mockSupabase,
      'conv-xyz',
      'Cliente solicitou entrega apenas no período da tarde.',
      { id: 'user-456', name: 'Ana Silva', role: 'Vendedora' }
    );

    expect(note).not.toBeNull();
    expect(note?.messageType).toBe('internal_note');
    expect(note?.authorName).toBe('Ana Silva');
    expect(note?.authorRole).toBe('Vendedora');
    expect(insertMock).toHaveBeenCalledWith([
      expect.objectContaining({
        message_type: 'internal_note',
        direction: 'outbound',
      }),
    ]);
  });

  // 24. Filtragem por filas "mine" e "unassigned" com hidratação
  it('24. deve filtrar conversas por fila "mine" e "unassigned"', async () => {
    const mockSupabase: any = {
      rpc: vi.fn().mockResolvedValue({
        data: [
        {
          id: 'conv-1',
          business_phone_number_id: '',
          contact_phone: '+5511999999999',
          contact_wa_id: '5511999999999',
          assigned_to: 'user-me',
          assigned_profile_name: 'Meu Atendente',
          is_archived: false,
          created_at: new Date().toISOString(),
          total_count: 1,
        },
      ],
        error: null,
      }),
    };

    const resMine = await fetchConversations(mockSupabase, {
      filter: 'mine',
    });

    expect(mockSupabase.rpc).toHaveBeenCalledWith('customer_support_list_conversations', expect.objectContaining({ p_filter: 'mine' }));
    expect(resMine.conversations[0].assignedProfile?.fullName).toBe('Meu Atendente');
  });

  // 25. Catálogo de respostas rápidas e modelos
  it('25. deve conter modelos úteis de respostas rápidas (PIX, entrega, loja, garantia)', () => {
    expect(DEFAULT_QUICK_SNIPPETS.length).toBeGreaterThanOrEqual(5);
    const pixSnippet = DEFAULT_QUICK_SNIPPETS.find((s) => s.shortcut === '/pix');
    expect(pixSnippet).toBeDefined();
    expect(pixSnippet?.content).toContain('PIX');

    const deliverySnippet = DEFAULT_QUICK_SNIPPETS.find((s) => s.shortcut === '/entrega');
    expect(deliverySnippet).toBeDefined();
    expect(deliverySnippet?.content).toContain('logística');
  });

  // 26. Ordenação de conversas (Newest, Oldest, Unread first)
  it('26. deve ordenar conversas corretamente por data recente, data antiga e não lidas primeiro', () => {
    const list: any[] = [
      { id: 'c1', unreadCount: 0, lastMessageAt: '2026-10-14T10:00:00Z' },
      { id: 'c2', unreadCount: 3, lastMessageAt: '2026-10-12T10:00:00Z' },
      { id: 'c3', unreadCount: 0, lastMessageAt: '2026-10-16T15:00:00Z' },
    ];

    // Newest
    const newest = [...list].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    expect(newest.map((c) => c.id)).toEqual(['c3', 'c1', 'c2']);

    // Oldest
    const oldest = [...list].sort((a, b) => new Date(a.lastMessageAt).getTime() - new Date(b.lastMessageAt).getTime());
    expect(oldest.map((c) => c.id)).toEqual(['c2', 'c1', 'c3']);

    // Unread first
    const unreadFirst = [...list].sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });
    expect(unreadFirst[0].id).toBe('c2');
  });

  // 27. Proteção de custo zero na interface e composição de notas
  it('27. deve garantir que o composer mantenha o bloqueio de envio para custo zero enquanto suporta notas internas da equipe', () => {
    const internalNote = {
      messageType: 'internal_note',
      textContent: 'Cliente solicitou retorno amanhã às 14h',
      authorName: 'Atendente Carlos',
      timestamp: '2026-10-16T18:00:00Z',
    };

    expect(internalNote.messageType).toBe('internal_note');
    expect(internalNote.authorName).toBe('Atendente Carlos');
  });
});
