import { getCancellationWindow } from './nfeEventRules';

export type FiscalCancellationAction =
  | 'cancel'
  | 'estorno'
  | 'return'
  | 'none'
  | 'manual_review'
  | 'blocked'
  | 'pending'
  | 'reconcile';

export interface FiscalCancellationPolicyInput {
  model: string;
  authorizedAt: string;
  status: string;
  environment: 1 | 2;
  goodsCirculated: boolean;
  operationDidNotOccur: boolean;
  issuerUf?: string;
  now?: number;
}

export interface FiscalCancellationPolicy {
  action: FiscalCancellationAction;
  reason?: string;
  deadline: Date | null;
}

/** Central decision for the fiscal effect of a commercial order cancellation. */
export function getFiscalCancellationPolicy(
  input: FiscalCancellationPolicyInput
): FiscalCancellationPolicy {
  if (input.goodsCirculated) {
    return {
      action: 'return',
      reason: 'A mercadoria já circulou; use o fluxo de devolução.',
      deadline: null,
    };
  }

  const authorizedStatus = input.environment === 1 ? 'autorizada' : 'homologada';
  if (input.status !== authorizedStatus) {
    return {
      action: 'none',
      reason: 'Não existe documento autorizado para tratar fiscalmente.',
      deadline: null,
    };
  }

  if (String(input.issuerUf || '').trim().toUpperCase() !== 'PR') {
    return {
      action: 'manual_review',
      reason:
        'A UF do emitente não está confirmada como Paraná; não há prazo fiscal específico configurado para decidir automaticamente.',
      deadline: null,
    };
  }

  const window = getCancellationWindow(input.model, input.authorizedAt, input.now);
  if (!window.valid) {
    return {
      action: 'manual_review',
      reason: 'A autorização original não tem uma data válida.',
      deadline: null,
    };
  }
  if (!window.expired) return { action: 'cancel', deadline: window.deadline };

  if (!input.operationDidNotOccur) {
    return {
      action: 'manual_review',
      reason: 'O prazo expirou e a operação não foi comprovada como não realizada.',
      deadline: window.deadline,
    };
  }
  if (!['55', '65'].includes(input.model)) {
    return {
      action: 'manual_review',
      reason:
        'O prazo expirou e o modelo ' +
        (input.model || 'não identificado') +
        ' não tem procedimento de estorno configurado.',
      deadline: window.deadline,
    };
  }
  return {
    action: 'estorno',
    reason:
      input.model === '65'
        ? 'O prazo de cancelamento da NFC-e expirou. No Paraná, prepare uma NF-e modelo 55 de ajuste referenciando a NFC-e original.'
        : 'O prazo de cancelamento da NF-e expirou. Prepare uma NF-e modelo 55 de ajuste referenciando o documento original.',
    deadline: window.deadline,
  };
}
