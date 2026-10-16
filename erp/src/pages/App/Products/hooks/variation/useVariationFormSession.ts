import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { Variation } from '@/pages/types/product.type';
import type { VariationFormOperationGuard } from './variationForm.types';

export const UNCERTAIN_SAVE_MESSAGE =
  'O salvamento pode ter sido gravado, mas não foi confirmado. Confira a variação e recarregue antes de repetir.';

interface UseVariationFormSessionOptions {
  isOpen: boolean;
  identity: string;
  operationGuard?: VariationFormOperationGuard;
  onClose: () => void;
  setFormData: React.Dispatch<React.SetStateAction<Variation | null>>;
}

export function useVariationFormSession({
  isOpen,
  identity,
  operationGuard,
  onClose,
  setFormData,
}: UseVariationFormSessionOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const session = useMemo(
    () => ({ active: isOpen, lock: false, completed: false, token: Symbol(identity) }),
    [isOpen, identity]
  );

  const ownGuards = useRef(new Map<string, VariationFormOperationGuard>());
  if (!ownGuards.current.has(identity)) {
    ownGuards.current.set(identity, { pending: null, error: '' });
  }
  const guard = operationGuard ?? ownGuards.current.get(identity)!;

  useEffect(() => {
    session.active = isOpen;
    if (guard.pending && guard.pending !== session.token) {
      guard.error ||= UNCERTAIN_SAVE_MESSAGE;
    }
    setError(guard.error);
    setLoading(false);

    return () => {
      session.active = false;
      if (guard.pending === session.token && !session.completed) {
        guard.error ||= UNCERTAIN_SAVE_MESSAGE;
      }
    };
  }, [session, guard, isOpen]);

  const updateFormData = useCallback<React.Dispatch<React.SetStateAction<Variation | null>>>(
    (update) => {
      if (session.active && !session.lock && !session.completed && !guard.error) {
        setFormData(update);
      }
    },
    [session, guard, setFormData]
  );

  const handleClose = useCallback(() => {
    if (session.active && !session.lock) {
      onClose();
    }
  }, [session, onClose]);

  return {
    session,
    guard,
    loading,
    setLoading,
    error,
    setError,
    blocked: Boolean(guard.error) || session.completed,
    updateFormData,
    handleClose,
  };
}
