import { useEffect, useRef, useState } from 'react';
import type Order from '@/pages/types/order.type';
import { findPendingFiscalEmission } from '@/pages/utils/nfe/nfeEmissionRequestState';
import { safeFiscalIssueMessage } from '@/pages/utils/nfe/fiscalIssuePresentation';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';

export interface UseNfeAttemptRestorationProps {
  order: Order | null;
  environment: 1 | 2;
  operatorId?: string;
  canOperateFiscal: boolean;
  onAttemptFound: (result: NfeEmissionResult) => void;
  onClearState: () => void;
}

export function useNfeAttemptRestoration({
  order,
  environment,
  operatorId,
  canOperateFiscal,
  onAttemptFound,
  onClearState,
}: UseNfeAttemptRestorationProps) {
  const orderId = order?.id;
  const operationOwner = useRef({ orderId, environment, operatorId });
  if (
    operationOwner.current.orderId !== orderId ||
    operationOwner.current.environment !== environment ||
    operationOwner.current.operatorId !== operatorId
  ) {
    operationOwner.current = { orderId, environment, operatorId };
  }

  const onAttemptFoundRef = useRef(onAttemptFound);
  onAttemptFoundRef.current = onAttemptFound;

  const onClearStateRef = useRef(onClearState);
  onClearStateRef.current = onClearState;

  const [restoration, setRestoration] = useState<{
    owner: object;
    loading: boolean;
    error?: string;
  } | null>(null);

  const isRestoringAttempt = Boolean(
    orderId &&
      canOperateFiscal &&
      (!restoration || restoration.owner !== operationOwner.current || restoration.loading)
  );

  const attemptRestorationError =
    restoration?.owner === operationOwner.current ? restoration.error : undefined;

  useEffect(() => {
    onClearStateRef.current();
    const owner = operationOwner.current;
    let current = true;

    if (!orderId || !canOperateFiscal) {
      setRestoration({ owner, loading: false });
      return;
    }

    setRestoration({ owner, loading: true });
    void findPendingFiscalEmission(String(orderId), environment)
      .then((attempt) => {
        if (!current || operationOwner.current !== owner) return;
        if (attempt) {
          onAttemptFoundRef.current({
            ...attempt,
            success: false,
            pending: true,
            numberReserved: true,
            databaseReason: 'ALREADY_ACTIVE_FISCAL_ATTEMPT',
            error:
              'Já existe uma tentativa fiscal em andamento para este pedido. Consulte a tentativa original antes de continuar.',
          });
        }
        setRestoration({ owner, loading: false });
      })
      .catch((error) => {
        if (!current || operationOwner.current !== owner) return;
        const message = safeFiscalIssueMessage(
          error instanceof Error ? error.message : '',
          'Não foi possível conferir as tentativas fiscais anteriores. Feche e reabra a emissão para consultar novamente.'
        );
        onAttemptFoundRef.current({
          success: false,
          pending: true,
          orderId: String(orderId),
          environment,
          error: message,
          technicalDetails: { apiCode: 'FISCAL_RECOVERY_UNAVAILABLE' },
        });
        setRestoration({ owner, loading: false, error: message });
      });

    return () => {
      current = false;
    };
  }, [orderId, environment, operatorId, canOperateFiscal]);

  useEffect(
    () => () => {
      operationOwner.current = { ...operationOwner.current };
    },
    []
  );

  return {
    operationOwner,
    isRestoringAttempt,
    attemptRestorationError,
  };
}
