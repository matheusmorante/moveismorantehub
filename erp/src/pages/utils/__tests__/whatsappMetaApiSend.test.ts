import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  sendDirectCustomerOrderViaMetaApi,
  isSamePhoneNumber,
  buildOrderMetaTemplateParams,
} from '../whatsapp';
import { clearRecentSendTimestamps } from '../whatsapp/metaDirectSend';
import { whatsappGraphService } from '../whatsappGraphService';
import { getSettings } from '../settingsService';
import { toast } from 'react-toastify';
import Order from '../../types/order.type';

vi.mock('../settingsService', () => ({
  getSettings: vi.fn(),
}));

vi.mock('../whatsappGraphService', () => ({
  whatsappGraphService: {
    sendTemplateMessage: vi.fn(),
    sendTextMessage: vi.fn(),
  },
}));

vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe('sendDirectCustomerOrderViaMetaApi', () => {
  const baseOrder = {
    id: 'ord-meta-1',
    customerData: {
      fullName: 'Consumidor Teste',
      phone: '41999998888',
      fullAddress: {
        street: 'Rua das Flores',
        number: '123',
        neighborhood: 'Centro',
        city: 'Curitiba',
        state: 'PR',
      },
    },
    shipping: {
      deliveryMethod: 'delivery',
      scheduling: {
        date: '2026-10-25',
        type: 'fixed',
        time: '10:00',
      },
    },
    items: [
      {
        id: 'item-1',
        description: 'Mesa de Jantar',
        quantity: 1,
        unitPrice: 1500,
      },
    ],
    paymentsSummary: {
      totalOrderValue: 1500,
    },
  } as unknown as Order;

  beforeEach(() => {
    vi.clearAllMocks();
    clearRecentSendTimestamps();
  });

  it('retorna false e alerta se o cliente não tiver telefone', async () => {
    const orderNoPhone = {
      ...baseOrder,
      customerData: { fullName: 'Sem Telefone' },
    } as Order;

    const result = await sendDirectCustomerOrderViaMetaApi(orderNoPhone);
    expect(result).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Cliente sem telefone cadastrado.');
    expect(whatsappGraphService.sendTemplateMessage).not.toHaveBeenCalled();
  });

  it('retorna false e avisa se as credenciais da Meta não estiverem configuradas', async () => {
    vi.mocked(getSettings).mockReturnValue({
      whatsappConfig: {
        accessToken: '',
        phoneNumberId: '',
      },
    } as any);

    const result = await sendDirectCustomerOrderViaMetaApi(baseOrder as Order);
    expect(result).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Configuração da Meta incompleta')
    );
    expect(whatsappGraphService.sendTemplateMessage).not.toHaveBeenCalled();
  });

  it('dispara exatamente o mesmo texto gerado para o WhatsApp Web ao enviar diretamente via API Meta', async () => {
    vi.mocked(getSettings).mockReturnValue({
      whatsappConfig: {
        accessToken: 'EAAB...',
        phoneNumberId: '100200300',
        templateNameOrderConfirmation: '',
      },
    } as any);

    vi.mocked(whatsappGraphService.sendTextMessage).mockResolvedValue({ success: true } as any);

    const result = await sendDirectCustomerOrderViaMetaApi(baseOrder as Order);
    expect(result).toBe(true);
    expect(whatsappGraphService.sendTextMessage).toHaveBeenCalledWith(
      '41999998888',
      expect.stringContaining('Consumidor Teste')
    );
    expect(whatsappGraphService.sendTextMessage).toHaveBeenCalledWith(
      '41999998888',
      expect.stringContaining('Mesa de Jantar')
    );
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('enviado diretamente ao cliente via Cloud WhatsApp')
    );
  });

  it('realiza fallback para modelo aprovado quando a janela de 24h expira e há template cadastrado', async () => {
    vi.mocked(getSettings).mockReturnValue({
      whatsappConfig: {
        accessToken: 'EAAB...',
        phoneNumberId: '100200300',
        templateNameOrderConfirmation: 'confirmacao_pedido_entrega',
        templateLanguage: 'pt_BR',
        templateVariableCount: 7,
      },
    } as any);

    vi.mocked(whatsappGraphService.sendTextMessage).mockRejectedValue(
      new Error('Meta API: (#131047) Re-engagement message: More than 24 hours have elapsed')
    );
    vi.mocked(whatsappGraphService.sendTemplateMessage).mockResolvedValue({ success: true } as any);

    const result = await sendDirectCustomerOrderViaMetaApi(baseOrder as Order);
    expect(result).toBe(true);
    expect(whatsappGraphService.sendTemplateMessage).toHaveBeenCalledWith(
      '41999998888',
      'confirmacao_pedido_entrega',
      expect.arrayContaining(['Consumidor Teste']),
      'pt_BR'
    );
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('enviado diretamente ao cliente via modelo aprovado do Cloud WhatsApp')
    );
  });

  it('trata erro de janela de 24h da Meta (#131047) com instrução clara para cadastrar modelo quando não há template', async () => {
    vi.mocked(getSettings).mockReturnValue({
      whatsappConfig: {
        accessToken: 'EAAB...',
        phoneNumberId: '100200300',
        templateNameOrderConfirmation: '',
      },
    } as any);

    vi.mocked(whatsappGraphService.sendTextMessage).mockRejectedValue(
      new Error('Meta API: (#131047) Re-engagement message: More than 24 hours have elapsed')
    );

    const result = await sendDirectCustomerOrderViaMetaApi(baseOrder as Order);
    expect(result).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Meta API (Regra 24h)')
    );
  });

  it('trata erro de parâmetros inválidos da Meta (#132018) com aviso claro', async () => {
    vi.mocked(getSettings).mockReturnValue({
      whatsappConfig: {
        accessToken: 'EAAB...',
        phoneNumberId: '100200300',
        templateNameOrderConfirmation: 'confirmacao_pedido_entrega',
      },
    } as any);

    vi.mocked(whatsappGraphService.sendTextMessage).mockRejectedValue(
      new Error('Meta API: (#131047) Re-engagement message: More than 24 hours have elapsed')
    );
    vi.mocked(whatsappGraphService.sendTemplateMessage).mockRejectedValue(
      new Error("Meta API (Código 132018): (#132018) There's an issue with the parameters in your template: Param text cannot have new-line/tab characters or more than 4 consecutive spaces")
    );

    const result = await sendDirectCustomerOrderViaMetaApi(baseOrder as Order);
    expect(result).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Meta API (Erro 132018)')
    );
  });

  it('garante que os parâmetros montados para o modelo nunca contenham quebras de linha ou caracteres proibidos (#132018)', async () => {
    vi.mocked(getSettings).mockReturnValue({
      whatsappConfig: {
        accessToken: 'EAAB...',
        phoneNumberId: '100200300',
        templateNameOrderConfirmation: 'confirmacao_pedido_entrega',
        templateVariableCount: 7,
      },
    } as any);

    vi.mocked(whatsappGraphService.sendTextMessage).mockRejectedValue(
      new Error('Meta API: (#131047) Re-engagement message: More than 24 hours have elapsed')
    );
    vi.mocked(whatsappGraphService.sendTemplateMessage).mockResolvedValue({ success: true } as any);

    const orderWithMultilineData = {
      ...baseOrder,
      items: [
        { id: '1', description: 'Item 1\nCom quebra', quantity: 1, unitPrice: 100, observation: 'Obs linha 1\nObs linha 2' },
        { id: '2', description: 'Item 2', quantity: 2, unitPrice: 50 },
      ],
      payments: [
        { method: 'Cartão de Crédito', value: 100 },
        { method: 'Pix', value: 100 },
      ],
      shipping: {
        ...baseOrder.shipping,
        value: 20,
      },
    } as unknown as Order;

    await sendDirectCustomerOrderViaMetaApi(orderWithMultilineData);

    const calls = vi.mocked(whatsappGraphService.sendTemplateMessage).mock.calls;
    expect(calls.length).toBe(1);
    const params: string[] = calls[0][2];

    for (const param of params) {
      expect(param).not.toContain('\n');
      expect(param).not.toContain('\r');
      expect(param).not.toContain('\t');
      expect(param).not.toMatch(/\s{4,}/);
    }
  });

  it('impede o envio direto e alerta o usuário quando o telefone do cliente for o mesmo número da loja', async () => {
    vi.mocked(getSettings).mockReturnValue({
      companyPhone: '(41) 99749-3547',
      whatsappConfig: {
        accessToken: 'EAAB...',
        phoneNumberId: '100200300',
        templateNameOrderConfirmation: 'confirmacao_pedido_entrega',
        templateVariableCount: 7,
      },
    } as any);

    const orderSelfPhone = {
      ...baseOrder,
      customerData: {
        fullName: 'Matheus Morante',
        phone: '(41) 99749-3547',
      },
    } as unknown as Order;

    const result = await sendDirectCustomerOrderViaMetaApi(orderSelfPhone);
    expect(result).toBe(false);
    expect(toast.warning).toHaveBeenCalledWith(
      expect.stringContaining('é o mesmo número do WhatsApp Business da empresa')
    );
    expect(whatsappGraphService.sendTemplateMessage).not.toHaveBeenCalled();
  });

  it('formata agendamento pendente como "A combinar" nos parâmetros do modelo', () => {
    const orderPendingScheduling = {
      ...baseOrder,
      shipping: {
        deliveryMethod: 'delivery',
        scheduling: {
          pendingScheduling: true,
          date: '',
          time: ' às ',
        },
      },
    } as unknown as Order;

    const params = buildOrderMetaTemplateParams(orderPendingScheduling);
    expect(params[1]).toBe('A combinar');
    expect(params[2]).toBe('A combinar');
  });

  it('trata erro 100 (Invalid parameter) com mensagem orientativa e amigável', async () => {
    vi.mocked(getSettings).mockReturnValue({
      companyPhone: '(41) 99749-3547',
      whatsappConfig: {
        accessToken: 'EAAB...',
        phoneNumberId: '100200300',
        templateNameOrderConfirmation: 'envio_de_pedido',
        templateVariableCount: 7,
      },
    } as any);

    vi.mocked(whatsappGraphService.sendTextMessage).mockRejectedValue(
      new Error('Meta API (Código 100): (#100) Invalid parameter: Invalid parameter')
    );
    vi.mocked(whatsappGraphService.sendTemplateMessage).mockRejectedValue(
      new Error('Meta API (Código 100): (#100) Invalid parameter: Invalid parameter')
    );

    const orderOtherPhone = {
      ...baseOrder,
      customerData: {
        fullName: 'Outro Cliente',
        phone: '41988887777',
      },
    } as unknown as Order;

    const result = await sendDirectCustomerOrderViaMetaApi(orderOtherPhone);
    expect(result).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Meta API (Erro 100 - Parâmetro Inválido)')
    );
  });

  it('trata erro de número remetente pendente de verificação (NOT_VERIFIED) exibindo toast de erro e nunca abrindo WhatsApp Web indevidamente', async () => {
    const originalWindow = (globalThis as any).window;
    const mockOpen = vi.fn();
    (globalThis as any).window = { open: mockOpen };

    try {
      vi.mocked(getSettings).mockReturnValue({
        companyPhone: '(41) 99749-3547',
        whatsappConfig: {
          accessToken: 'EAAB...',
          phoneNumberId: '100200300',
          templateNameOrderConfirmation: 'envio_de_pedido',
          templateVariableCount: 7,
        },
      } as any);

      vi.mocked(whatsappGraphService.sendTextMessage).mockRejectedValue(
        new Error(
          "Meta WhatsApp API: O número remetente da empresa está com status 'Não Verificado' (code_verification_status: NOT_VERIFIED) no WhatsApp Cloud API."
        )
      );
      vi.mocked(whatsappGraphService.sendTemplateMessage).mockRejectedValue(
        new Error(
          "Meta WhatsApp API: O número remetente da empresa está com status 'Não Verificado' (code_verification_status: NOT_VERIFIED) no WhatsApp Cloud API."
        )
      );

      const orderMotherPhone = {
        ...baseOrder,
        customerData: {
          fullName: 'Mãe do Matheus',
          phone: '41992244631',
        },
      } as unknown as Order;

      const result = await sendDirectCustomerOrderViaMetaApi(orderMotherPhone);

      expect(result).toBe(false);
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('NOT_VERIFIED'),
        expect.any(Object)
      );
      // Garante que o botão de envio direto NUNCA abre WhatsApp Web
      expect(mockOpen).not.toHaveBeenCalled();
      expect(toast.info).not.toHaveBeenCalled();
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });

  it('bloqueia reenvio consecutivo em menos de 1 minuto para o mesmo número e exibe toast de erro de proteção contra spam', async () => {
    vi.mocked(getSettings).mockReturnValue({
      whatsappConfig: {
        accessToken: 'EAAB...',
        phoneNumberId: '100200300',
        templateNameOrderConfirmation: '',
      },
    } as any);

    vi.mocked(whatsappGraphService.sendTextMessage).mockResolvedValue({ success: true } as any);

    // 1º Envio: Sucesso
    const firstResult = await sendDirectCustomerOrderViaMetaApi(baseOrder as Order);
    expect(firstResult).toBe(true);
    expect(toast.success).toHaveBeenCalledTimes(1);

    // 2º Envio Imediato com a MESMA mensagem: Deve ser bloqueado pelo cooldown anti-spam do sistema
    const secondResult = await sendDirectCustomerOrderViaMetaApi(baseOrder as Order);
    expect(secondResult).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Envio repetido bloqueado'),
      expect.any(Object)
    );
    // Garante que a 2ª chamada não foi enviada para a Meta para evitar descarte silencioso
    expect(whatsappGraphService.sendTextMessage).toHaveBeenCalledTimes(1);

    // 3º Envio com mensagem DIFERENTE (ex: data de entrega alterada no pedido): Deve ser PERMITIDO
    const updatedOrder = {
      ...baseOrder,
      shipping: {
        ...baseOrder.shipping,
        scheduling: {
          date: '2026-11-01',
          type: 'fixed',
          time: '14:00',
        },
      },
    } as unknown as Order;

    const thirdResult = await sendDirectCustomerOrderViaMetaApi(updatedOrder);
    expect(thirdResult).toBe(true);
    expect(whatsappGraphService.sendTextMessage).toHaveBeenCalledTimes(2);
  });

  it('trata erro de spam/rate limit da Meta (#131056) exibindo toast de erro claro', async () => {
    vi.mocked(getSettings).mockReturnValue({
      whatsappConfig: {
        accessToken: 'EAAB...',
        phoneNumberId: '100200300',
        templateNameOrderConfirmation: '',
      },
    } as any);

    vi.mocked(whatsappGraphService.sendTextMessage).mockRejectedValue(
      new Error('Meta API (Código 131056): (#131056) Too many messages sent to this recipient')
    );

    const result = await sendDirectCustomerOrderViaMetaApi(baseOrder as Order);
    expect(result).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Cloud WhatsApp (Proteção Anti-Spam da Meta)'),
      expect.any(Object)
    );
  });

  it('monta parâmetros de 8 variáveis com tipo "entrega" e estilo idêntico ao wa.me', () => {
    const config = { templateVariableCount: 8 };
    const params = buildOrderMetaTemplateParams(baseOrder as Order, config);
    expect(params).toHaveLength(8);
    expect(params[0]).toBe('Consumidor Teste');
    expect(params[1]).toBe('entrega');
    expect(params[2]).toBe('domingo, 25/10/2026');
    expect(params[3]).toBe('10:00');
    expect(params[4]).toBe('Rua das Flores, 123, Centro, Curitiba');
    expect(params[5]).toContain('Mesa de Jantar | 1 UN');
    expect(params[5]).toContain('1.500,00');
    expect(params[6]).toBe('1.500,00');
    expect(params[7]).toBe('Não informado');
  });

  it('monta parâmetros de 8 variáveis com tipo "retirada" e endereço "Retirada em loja"', () => {
    const pickupOrder = {
      ...baseOrder,
      shipping: {
        deliveryMethod: 'pickup',
        noAddress: true,
        scheduling: {
          date: '2026-10-25',
          time: '10:00 às 12:00',
        },
      },
    } as unknown as Order;

    const config = { templateVariableCount: 8 };
    const params = buildOrderMetaTemplateParams(pickupOrder, config);
    expect(params).toHaveLength(8);
    expect(params[0]).toBe('Consumidor Teste');
    expect(params[1]).toBe('retirada');
    expect(params[4]).toBe('Retirada em loja');
  });
});

describe('isSamePhoneNumber', () => {
  it('identifica corretamente números iguais em diferentes formatos e variações de nono dígito', () => {
    expect(isSamePhoneNumber('(41) 99749-3547', '(41) 99749-3547')).toBe(true);
    expect(isSamePhoneNumber('(41) 99749-3547', '5541997493547')).toBe(true);
    expect(isSamePhoneNumber('(41) 99749-3547', '+55 41 9749-3547')).toBe(true);
    expect(isSamePhoneNumber('(41) 99749-3547', '4197493547')).toBe(true);
    expect(isSamePhoneNumber('(41) 99749-3547', '(41) 98888-7777')).toBe(false);
    expect(isSamePhoneNumber('(41) 99749-3547', '(42) 99749-3547')).toBe(false);
    expect(isSamePhoneNumber(null, '(41) 99749-3547')).toBe(false);
  });
});

