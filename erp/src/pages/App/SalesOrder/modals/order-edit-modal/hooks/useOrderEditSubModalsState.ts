import { useState, useRef, useCallback } from 'react';
import type Order from '@/pages/types/order.type';
import type { useSalesOrderForm } from '../../../hooks/useSalesOrderForm';

interface UseOrderEditSubModalsStateParams {
  readonly formActions: ReturnType<typeof useSalesOrderForm>['actions'];
  readonly saveWithFiscalAudit: (updatedOrder: Order) => Promise<string | false>;
}

export function useOrderEditSubModalsState({
  formActions,
  saveWithFiscalAudit,
}: UseOrderEditSubModalsStateParams) {
  const [isSellerSearchOpen, setIsSellerSearchOpen] = useState(false);
  const [isSellerRegistrationOpen, setIsSellerRegistrationOpen] = useState(false);
  const sellerRef = useRef<HTMLButtonElement>(null);

  const [pendingUpdate, setPendingUpdate] = useState<Order | null>(null);
  const [isReconciliationConfirmationOpen, setIsReconciliationConfirmationOpen] = useState(false);

  const handleSelectSeller = useCallback(
    (name: string) => {
      formActions.setSeller(name);
    },
    [formActions]
  );

  const handleAddNewSeller = useCallback(() => {
    setIsSellerSearchOpen(false);
    setIsSellerRegistrationOpen(true);
  }, []);

  const handleSellerRegistered = useCallback(
    (newSeller: any) => {
      formActions.setSeller(newSeller.nickname || newSeller.fullName);
      setIsSellerRegistrationOpen(false);
    },
    [formActions]
  );

  const handleConfirmPendingUpdate = useCallback(() => {
    if (pendingUpdate) {
      const orderToSave = pendingUpdate;
      setPendingUpdate(null);
      void saveWithFiscalAudit(orderToSave);
    }
  }, [pendingUpdate, saveWithFiscalAudit]);

  return {
    isSellerSearchOpen,
    setIsSellerSearchOpen,
    isSellerRegistrationOpen,
    setIsSellerRegistrationOpen,
    sellerRef,
    pendingUpdate,
    setPendingUpdate,
    isReconciliationConfirmationOpen,
    setIsReconciliationConfirmationOpen,
    handleSelectSeller,
    handleAddNewSeller,
    handleSellerRegistered,
    handleConfirmPendingUpdate,
  };
}
