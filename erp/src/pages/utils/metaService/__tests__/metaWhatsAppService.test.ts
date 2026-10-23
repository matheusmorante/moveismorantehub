import { describe, expect, it, vi, beforeEach } from 'vitest';
import { metaWhatsAppService } from '../metaWhatsAppService';
import { metaHttpClient } from '../metaHttpClient';
import { getSettings } from '@/pages/utils/settingsService';
import { ApiUsageGuard } from '@/services/apiMonitoring/apiUsageGuard';
import { ApiUsageTracker } from '@/services/apiMonitoring/apiUsageTracker';

vi.mock('@/pages/utils/settingsService', () => ({
  getSettings: vi.fn(),
}));

vi.mock('@/services/apiMonitoring/apiUsageGuard', () => ({
  ApiUsageGuard: {
    check: vi.fn(),
  },
}));

vi.mock('@/services/apiMonitoring/apiUsageTracker', () => ({
  ApiUsageTracker: {
    record: vi.fn(),
  },
}));

vi.mock('../metaHttpClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../metaHttpClient')>();
  return {
    ...actual,
    metaHttpClient: {
      ...actual.metaHttpClient,
      request: vi.fn(),
      postMessages: vi.fn(),
    },
  };
});

const response = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
}) as Response;

describe('metaWhatsAppService', () => {
  it('sends only the WABA identifier to the authenticated server proxy', async () => {
    vi.mocked(metaHttpClient.request).mockResolvedValueOnce(response({ data: [] }));
    await metaWhatsAppService.fetchMessageTemplates({ wabaId: 'current-waba' });
    expect(metaHttpClient.request).toHaveBeenCalledWith('list_templates', { wabaId: 'current-waba' });
    expect(JSON.stringify(vi.mocked(metaHttpClient.request).mock.calls)).not.toContain('accessToken');
  });
  it('sends a template through the authenticated server proxy without integration credentials', async () => {
    vi.mocked(metaHttpClient.postMessages).mockResolvedValueOnce(response({ messages: [{ id: 'wamid.current' }] }));
    await metaWhatsAppService.sendTemplateMessage('41999998888', 'template', [], 'pt_BR', { phoneNumberId: 'current-sender' });
    expect(metaHttpClient.postMessages).toHaveBeenCalledWith(expect.objectContaining({ type: 'template' }), 'sales');
    expect(JSON.stringify(vi.mocked(metaHttpClient.postMessages).mock.calls)).not.toContain('accessToken');
  });
  it('requests the sender identity through the server proxy', async () => {
    vi.mocked(metaHttpClient.request).mockResolvedValueOnce(response({ id: 'current-sender' }));
    const result = await metaHttpClient.request('connection_test', { phoneNumberId: 'current-sender' });
    expect(await result.json()).toMatchObject({ id: 'current-sender' });
    expect(metaHttpClient.request).toHaveBeenCalledWith('connection_test', { phoneNumberId: 'current-sender' });
  });
  it('marks a pre-send guard refusal as a confirmed failure that may be corrected', async () => {
    vi.mocked(ApiUsageGuard.check).mockResolvedValueOnce({ allowed: false, reason: 'Limite de teste' } as any);
    await expect(metaWhatsAppService.sendTemplateMessage('41999998888', 'template', [], 'pt_BR')).rejects.toMatchObject({ confirmedFailure: true });
    expect(metaHttpClient.postMessages).not.toHaveBeenCalled();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSettings).mockReturnValue({
      companyPhone: '(41) 99749-3547',
      whatsappConfig: {
        phoneNumberId: '1020304050',
        wabaId: '1448795237039238',
        templateLanguage: 'pt_BR',
      },
    } as any);

    vi.mocked(ApiUsageGuard.check).mockResolvedValue({
      allowed: true,
      currentUsage: 1,
      limit: 1000,
    } as any);

    vi.mocked(metaHttpClient.postMessages).mockResolvedValue(response({
        messaging_product: 'whatsapp',
        contacts: [{ input: '554199998888', wa_id: '554199998888' }],
        messages: [{ id: 'wamid.HBgM...', message_status: 'accepted' }],
      }));
  });

  describe('sanitizeTemplateParam', () => {
    it('substitui quebras de linha e tabs por bullet points', () => {
      const input = 'Linha 1\nLinha 2\r\nLinha 3\tTabulada';
      const result = metaWhatsAppService.sanitizeTemplateParam(input);
      expect(result).toBe('Linha 1 • Linha 2 • Linha 3 • Tabulada');
      expect(result).not.toContain('\n');
      expect(result).not.toContain('\r');
      expect(result).not.toContain('\t');
    });

    it('colapsa 4 ou mais espaços consecutivos para evitar erro 132018', () => {
      const input = 'Texto com      muitos    espaços';
      const result = metaWhatsAppService.sanitizeTemplateParam(input);
      expect(result).toBe('Texto com muitos espaços');
      expect(result).not.toMatch(/\s{4,}/);
    });

    it('trata valores nulos ou vazios com traço seguro', () => {
      expect(metaWhatsAppService.sanitizeTemplateParam(null)).toBe('-');
      expect(metaWhatsAppService.sanitizeTemplateParam(undefined)).toBe('-');
      expect(metaWhatsAppService.sanitizeTemplateParam('')).toBe('-');
      expect(metaWhatsAppService.sanitizeTemplateParam('   ')).toBe('-');
    });

    it('limita o tamanho máximo a 1000 caracteres', () => {
      const huge = 'X'.repeat(1200);
      const result = metaWhatsAppService.sanitizeTemplateParam(huge);
      expect(result.length).toBeLessThanOrEqual(1000);
      expect(result.endsWith('...')).toBe(true);
    });
  });

  describe('formatRecipientPhone', () => {
    it('acrescenta código do país 55 para números locais ou nacionais de 10 ou 11 dígitos', () => {
      expect(metaWhatsAppService.formatRecipientPhone('4199998888')).toBe('554199998888');
      expect(metaWhatsAppService.formatRecipientPhone('(41) 99749-3547')).toBe('5541997493547');
    });

    it('mantém o formato quando o número já possui código do país de 12 ou mais dígitos', () => {
      expect(metaWhatsAppService.formatRecipientPhone('5541997493547')).toBe('5541997493547');
    });
  });

  describe('sendTextMessage', () => {
    it('envia mensagem de texto e grava uso na telemetria', async () => {
      const result = await metaWhatsAppService.sendTextMessage('4199998888', 'Olá cliente!');
      expect(result.messages).toBeDefined();
      expect(metaHttpClient.postMessages).toHaveBeenCalledWith(
        expect.objectContaining({ text: { body: 'Olá cliente!' } }),
        'sales'
      );
      expect(ApiUsageTracker.record).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'send_text',
          status: 'SUCCESS',
        })
      );
    });
  });

  describe('sendTemplateMessage', () => {
    it('envia mensagem com modelo sanitizando todos os parâmetros', async () => {
      await metaWhatsAppService.sendTemplateMessage(
        '4199998888',
        'envio_de_pedido',
        ['Cliente Teste', 'Linha 1\nLinha 2', 'R$  1.500,00']
      );

      expect(metaHttpClient.postMessages).toHaveBeenCalledWith(
        expect.objectContaining({ template: expect.objectContaining({ components: expect.arrayContaining([expect.objectContaining({ parameters: expect.arrayContaining([expect.objectContaining({ text: 'Linha 1 • Linha 2' })]) })]) }) }),
        'sales'
      );
      expect(ApiUsageTracker.record).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'send_template',
          status: 'SUCCESS',
        })
      );
    });

    it('executa retry automático sem o 9º dígito se a Meta retornar erro 100 para número BR de 13 dígitos', async () => {
      // Primeira chamada falha com código 100, segunda chamada tem sucesso
      vi.mocked(metaHttpClient.postMessages)
        .mockResolvedValueOnce(response({ error: { code: 100, message: 'Invalid parameter' } }, false, 400))
        .mockResolvedValueOnce(response({
          messaging_product: 'whatsapp',
          messages: [{ id: 'wamid.RETRY_SUCCESS' }],
        }));

      const result = await metaWhatsAppService.sendTemplateMessage(
        '5541997493547',
        'envio_de_pedido',
        ['Parâmetro 1']
      );

      expect(result.messages?.[0]?.id).toBe('wamid.RETRY_SUCCESS');
      expect(metaHttpClient.postMessages).toHaveBeenCalledTimes(2);
      // Segunda chamada deve ter enviado para 554197493547 (sem o 9º dígito inicial)
      const secondCallBody = vi.mocked(metaHttpClient.postMessages).mock.calls[1][0];
      expect(secondCallBody.to).toBe('554197493547');
    });
  });
});
