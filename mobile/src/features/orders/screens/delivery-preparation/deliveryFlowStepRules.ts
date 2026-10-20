/**
 * Regras puras de domínio para o ciclo de vida e etapas da entrega (Clean Architecture).
 * Isola cálculos de status, títulos e checklist sem acoplamento com hooks do React.
 */

export interface DeliveryStepState {
  currentStep: number;
  headerTitle: string;
  isInArrival: boolean;
  isInService: boolean;
  isInTransit: boolean;
  isInProgress: boolean;
}

/**
 * Determina a etapa atual e títulos da entrega a partir do snapshot do pedido.
 * 1. Preparação (preparar saída e conferência de itens)
 * 2. Em Rota (deslocamento até o cliente)
 * 3. Chegada (no local do cliente / botão não foi possível entregar)
 * 4. Em Atendimento (início do atendimento, conferência final e recebimento de pagamentos)
 */
export function resolveDeliveryStep(data: any): DeliveryStepState {
  const safeData = data || {};
  const deliveryStatus = safeData.deliveryStatus;

  // Etapa 4: Em Atendimento (quando o atendimento aos serviços/produtos ou pagamentos foi explicitamente iniciado)
  const isInService =
    deliveryStatus === 'in_service' || Boolean(safeData.deliveryServiceStartedAt);

  // Etapa 3: Chegada no Local (quando a equipe chegou ao endereço, mas ainda não iniciou o atendimento formal)
  const isInArrival =
    (deliveryStatus === 'arrived' || Boolean(safeData.deliveryArrivedAt)) && !isInService;

  // Etapa 2: Em Rota (deslocamento para o endereço)
  const isInTransit =
    (deliveryStatus === 'in_progress' || Boolean(safeData.deliveryStartedAt)) &&
    !isInArrival &&
    !isInService;

  const isInProgress = isInTransit || isInArrival || isInService;
  const currentStep = isInService ? 4 : isInArrival ? 3 : isInTransit ? 2 : 1;
  const headerTitle = isInService
    ? 'Em Atendimento'
    : isInArrival
      ? 'Chegada no Local'
      : isInTransit
        ? 'Em Rota'
        : 'Preparar Saída';

  return {
    currentStep,
    headerTitle,
    isInArrival,
    isInService,
    isInTransit,
    isInProgress,
  };
}

/**
 * Inicializa a lista de pagamentos a partir do pedido ou com fallback seguro.
 */
export function resolveInitialDeliveryPayments(order: any): any[] {
  const data = order?.order_data || order || {};
  if (Array.isArray(data.payments) && data.payments.length > 0) {
    return data.payments;
  }
  const amount = Number(data.paymentsSummary?.totalOrderValue || data.totalValue || 0);
  return [
    {
      method: data.paymentMethod || 'Pix',
      amount,
      status: 'Pendente',
      fee: 0,
      feeType: 'fixed',
    },
  ];
}

/**
 * Verifica se todos os itens obrigatórios do checklist foram conferidos.
 */
export function isDeliveryChecklistComplete(
  checklist: readonly { id: string }[],
  checkedMap: Record<string, boolean>
): boolean {
  if (!checklist || checklist.length === 0) return true;
  return checklist.every((item) => Boolean(checkedMap[item.id]));
}

/**
 * Valida se todos os pagamentos da entrega foram confirmados como pagos.
 */
export function areDeliveryPaymentsPaid(payments: readonly any[]): boolean {
  if (!Array.isArray(payments) || payments.length === 0) return false;
  return payments.every((payment) => {
    const status = String(payment?.status || '').toLowerCase();
    return status === 'pago' || status === 'paid';
  });
}
