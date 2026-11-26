import { CircuitBreakerError } from '@/services/monitoring';
import { OrderReadContractError } from '../../../../../../../shared-utils/orders/orderReadContractError';

const isCircuitBreakerFailure = (error: unknown) => {
  if (error instanceof CircuitBreakerError) return true;
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { name?: unknown; message?: unknown };
  return (
    candidate.name === 'CircuitBreakerError' ||
    (typeof candidate.message === 'string' &&
      candidate.message.includes('Requisição bloqueada pelo Query Guard (Loop Detectado)'))
  );
};

export const shouldRetryOrderRead = (failureCount: number, error: unknown) =>
  failureCount < 1 && !(error instanceof OrderReadContractError) && !isCircuitBreakerFailure(error);
