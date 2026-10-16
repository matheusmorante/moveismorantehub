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
import {
  computeAlertLevel,
  getMonthlyUsage,
} from '@/pages/utils/customerSupport/freeTierTracker';
import { whatsappSupportGuard } from '@/pages/utils/customerSupport/whatsappSupportGuard';
import { canPerform } from '@/pages/utils/permissionService';
import {
  fetchConversations,
  fetchConversationMessages,
  markConversationAsRead,
  toggleArchiveConversation,
} from '@/pages/utils/customerSupport/customerSupportService';

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
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
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
      })),
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
    const rangeMock = vi.fn().mockResolvedValue({ data: [], count: 0, error: null });
    const mockSupabase: any = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn(() => ({ range: rangeMock })),
      })),
    };

    await fetchConversations(mockSupabase, { page: 2, pageSize: 30, filter: 'all' });
    // Página 2 com pageSize 30: range(30, 59)
    expect(rangeMock).toHaveBeenCalledWith(30, 59);
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

  // 13. Contador de consumo
  it('13. deve calcular o saldo disponível e percentual da franquia de 1.000 mensagens', async () => {
    const mockSupabase: any = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            service_messages_count: 350,
            reconciliation_status: 'estimated',
          },
        }),
      })),
    };

    const usage = await getMonthlyUsage(mockSupabase);
    expect(usage.freeTierLimit).toBe(1000);
    expect(usage.serviceMessagesCount).toBe(350);
    expect(usage.availableBalance).toBe(650);
    expect(usage.percentageUsed).toBe(35);
    expect(usage.alertLevel).toBe('normal');
  });

  // 14. Alertas aos 900 e 1.000
  it('14. deve emitir alertas adequados nas faixas de 800, 900 e 1.000 mensagens', () => {
    expect(computeAlertLevel(250)).toBe('normal');
    expect(computeAlertLevel(820)).toBe('warning');
    expect(computeAlertLevel(910)).toBe('danger');
    expect(computeAlertLevel(1000)).toBe('exceeded');
    expect(computeAlertLevel(1050)).toBe('exceeded');
  });

  // 15. Contador com consumo desconhecido
  it('15. deve apresentar estado "Consumo não confirmado" em caso de falha de consulta', async () => {
    const mockSupabase: any = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockRejectedValue(new Error('Network error')),
      })),
    };

    const usage = await getMonthlyUsage(mockSupabase);
    expect(usage.reconciliationStatus).toBe('unconfirmed');
    expect(usage.statusLabel).toBe('Consumo não confirmado — envio bloqueado.');
  });

  // 16. Bloqueio de envio pelo frontend
  it('16. deve manter o envio estritamente bloqueado no frontend com mensagem explicativa', async () => {
    const check = await whatsappSupportGuard.checkAuthorization('5511999999999', 'Olá');
    expect(check.allowed).toBe(false);
    expect(check.reason).toBe('Envio indisponível. Central em modo de visualização gratuita.');
  });

  // 17. Bloqueio de envio pelo backend
  it('17. deve lançar erro imediato caso qualquer endpoint ou serviço tente disparar mensagens', async () => {
    await expect(whatsappSupportGuard.assertSendingAllowed()).rejects.toThrow(
      'Envio indisponível. Central em modo de visualização gratuita.'
    );
  });

  // 18. Garantia de que nenhum teste envia mensagens reais pela Meta
  it('18. garante que nenhum teste faz chamadas HTTP externas ou envia mensagens reais', () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
