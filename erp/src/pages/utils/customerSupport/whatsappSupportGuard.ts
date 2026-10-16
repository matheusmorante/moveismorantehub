/**
 * Camada de segurança e guarda de envio para a Central de Atendimento WhatsApp.
 * 
 * Regra fundamental: o módulo opera exclusivamente em modo de visualização gratuita,
 * bloqueando de forma absoluta qualquer envio que possa gerar custos na Meta.
 */

export interface SendingAuthorizationCheck {
  allowed: boolean;
  reason: string;
  careWindowOpen?: boolean;
  freeTierBalance?: number;
  riskOfBilling?: boolean;
}

export const whatsappSupportGuard = {
  /**
   * Verifica se o envio de mensagens está liberado na Central.
   * Na versão atual, SEMPRE retorna allowed: false.
   */
  checkAuthorization: async (
    _recipientPhone?: string,
    _messageContent?: string
  ): Promise<SendingAuthorizationCheck> => {
    return {
      allowed: false,
      reason: 'Envio indisponível. Central em modo de visualização gratuita.',
      riskOfBilling: true,
    };
  },

  /**
   * Bloqueador estrito para interceptar tentativas de envio
   */
  assertSendingAllowed: async (): Promise<never> => {
    throw new Error('Envio indisponível. Central em modo de visualização gratuita.');
  },

  /**
   * Calcula se a Janela de Atendimento de 24 horas da Meta está aberta.
   * Regra oficial da Meta: a janela abre quando o cliente envia uma mensagem e expira após 24h.
   */
  calculateCareWindow: (lastCustomerMessageAt: string | null | undefined): {
    isOpen: boolean;
    remainingMs: number;
    remainingHours: number;
    remainingMinutes: number;
    expiresAt: Date | null;
  } => {
    if (!lastCustomerMessageAt) {
      return {
        isOpen: false,
        remainingMs: 0,
        remainingHours: 0,
        remainingMinutes: 0,
        expiresAt: null,
      };
    }

    const messageTime = new Date(lastCustomerMessageAt).getTime();
    if (isNaN(messageTime)) {
      return {
        isOpen: false,
        remainingMs: 0,
        remainingHours: 0,
        remainingMinutes: 0,
        expiresAt: null,
      };
    }

    const windowDurationMs = 24 * 60 * 60 * 1000; // 24 horas
    const expiresAtMs = messageTime + windowDurationMs;
    const now = Date.now();
    const remainingMs = Math.max(0, expiresAtMs - now);
    const isOpen = remainingMs > 0;

    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
      isOpen,
      remainingMs,
      remainingHours,
      remainingMinutes,
      expiresAt: new Date(expiresAtMs),
    };
  },
};
