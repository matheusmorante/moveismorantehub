/**
 * Guardas dos caminhos legados de envio da Central WhatsApp.
 * O compositor atual envia pela rota autenticada, que revalida permissão,
 * conversa, canal e janela de atendimento no servidor.
 */

export interface SendingAuthorizationCheck {
  allowed: boolean;
  reason: string;
  careWindowOpen?: boolean;
}

export interface CareWindow {
  isOpen: boolean;
  remainingMs: number;
  remainingHours: number;
  remainingMinutes: number;
  expiresAt: Date | null;
}

export const whatsappSupportGuard = {
  /**
   * Mantém desativados os caminhos legados que não usam a rota do compositor.
   */
  checkAuthorization: async (
    _recipientPhone?: string,
    _messageContent?: string
  ): Promise<SendingAuthorizationCheck> => {
    return {
      allowed: false,
      reason: 'Envio desativado por política da empresa.',
    };
  },

  /**
   * Bloqueador estrito para interceptar tentativas de envio
   */
  assertSendingAllowed: async (): Promise<never> => {
    throw new Error('Envio desativado por política da empresa.');
  },

  /**
   * Calcula se a Janela de Atendimento de 24 horas da Meta está aberta.
   * Regra oficial da Meta: a janela abre quando o cliente envia uma mensagem e expira após 24h.
   */
  calculateCareWindow: (lastCustomerMessageAt: string | null | undefined): CareWindow => {
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
