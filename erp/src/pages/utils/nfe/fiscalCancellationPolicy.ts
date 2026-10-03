import { getCancellationWindow } from './nfeEventRules';

export type FiscalCancellationAction = 'cancel' | 'estorno' | 'return' | 'none' | 'manual_review';

export interface FiscalCancellationPolicyInput {
  model: string;
  authorizedAt: string;
  status: string;
  environment: 1 | 2;
  goodsCirculated: boolean;
  operationDidNotOccur: boolean;
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

  const window = getCancellationWindow(input.model, input.authorizedAt, input.now);
  if (!window.valid) {
    return {
      action: 'manual_review',
      reason: 'A autorização original não tem uma data válida.',
      deadline: null,
    };
  }
  if (!window.expired) return { action: 'cancel', deadline: window.deadline };

  if (input.model === '55' && input.operationDidNotOccur) {
    return { action: 'estorno', deadline: window.deadline };
  }
  return {
    action: 'manual_review',
    reason: 'O prazo expirou, mas este modelo ou situação exige validação fiscal.',
    deadline: window.deadline,
  };
}
