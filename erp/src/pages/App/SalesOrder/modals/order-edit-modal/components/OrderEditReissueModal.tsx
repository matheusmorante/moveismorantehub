import React, { useRef } from 'react';
import { toast } from 'react-toastify';
import type Order from '@/pages/types/order.type';
import NfeEmissionModal from '../../../OrderActions/NfeEmissionModal';
import { clearFiscalEmissionRequest } from '@/pages/utils/nfe/nfeEmissionRequestState';
import { prepareOrderFiscalSnapshotForEmission } from '@/pages/utils/nfeEmissionSnapshotService';
import type { FiscalReissueState } from '../types/orderEditModal.types';

interface OrderEditReissueModalProps {
  readonly fiscalReissue: FiscalReissueState;
  readonly setFiscalReissue: (state: FiscalReissueState | null) => void;
  readonly onSaveSuccess: (savedId?: string, savedOrder?: Order) => void;
  readonly onClose: () => void;
}

export const OrderEditReissueModal: React.FC<OrderEditReissueModalProps> = ({
  fiscalReissue,
  setFiscalReissue,
  onSaveSuccess,
  onClose,
}) => {
  const skipEmissionCloseRef = useRef(false);
  const { order: reissueOrder, replacement, remaining } = fiscalReissue;

  const finishOrAdvanceReissue = async () => {
    skipEmissionCloseRef.current = true;
    if (remaining.length) {
      const [nextReplacement, ...nextRemaining] = remaining;
      clearFiscalEmissionRequest(reissueOrder.id!, nextReplacement.environment);
      try {
        const preparedOrder = await prepareOrderFiscalSnapshotForEmission(
          reissueOrder,
          nextReplacement.environment
        );
        setFiscalReissue({
          order: preparedOrder,
          replacement: nextReplacement,
          remaining: nextRemaining,
        });
      } catch (error) {
        toast.error(
          error instanceof Error
            ? `Não foi possível preparar a nova NF: ${error.message}`
            : 'Não foi possível preparar a nova NF.'
        );
        setFiscalReissue(null);
        onSaveSuccess(reissueOrder.id, reissueOrder);
        onClose();
      }
      return;
    }
    setFiscalReissue(null);
    onSaveSuccess(reissueOrder.id, reissueOrder);
    onClose();
  };

  return (
    <NfeEmissionModal
      isOpen
      order={reissueOrder}
      initialEnvironment={replacement.environment}
      onClose={() => {
        if (skipEmissionCloseRef.current) {
          skipEmissionCloseRef.current = false;
          return;
        }
        setFiscalReissue(null);
        onSaveSuccess(reissueOrder.id, reissueOrder);
        onClose();
      }}
      onSuccess={() => void finishOrAdvanceReissue()}
    />
  );
};
