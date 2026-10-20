import { useState, useCallback } from 'react';

/**
 * Hook responsável exclusivamente pelo gerenciamento de visibilidade de modais no fluxo de entrega (SRP).
 */
export function useDeliveryModals() {
  const [showUnattendedModal, setShowUnattendedModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showStartConfirmModal, setShowStartConfirmModal] = useState(false);

  const closeAllModals = useCallback(() => {
    setShowUnattendedModal(false);
    setShowCancelModal(false);
    setShowStartConfirmModal(false);
  }, []);

  return {
    showUnattendedModal,
    setShowUnattendedModal,
    showCancelModal,
    setShowCancelModal,
    showStartConfirmModal,
    setShowStartConfirmModal,
    closeAllModals,
  };
}
