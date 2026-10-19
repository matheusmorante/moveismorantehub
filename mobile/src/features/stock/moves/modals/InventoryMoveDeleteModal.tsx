import React, { useState, useEffect } from 'react';
import { Modal, Alert } from 'react-native';
import { StockMove } from '../../types/stock.types';
import { isPurchaseEntry } from '../domain/inventoryTimelineBalance';
import { flattenFormErrors, useZodForm } from '../../../../hooks/useZodForm';
import { inventoryReversalFormSchema } from '../../../../../../shared-utils/operationsFormSchemas';
import { InventoryMoveDeleteModalContent } from './InventoryMoveDeleteModalContent';

export interface InventoryMoveDeleteModalProps {
  move: StockMove | null;
  isOpen: boolean;
  isDarkMode: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export const InventoryMoveDeleteModal: React.FC<InventoryMoveDeleteModalProps> = ({
  move,
  isOpen,
  isDarkMode,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const form = useZodForm(inventoryReversalFormSchema, { reason });

  const isPurchase = move ? isPurchaseEntry(move) : false;

  useEffect(() => {
    if (move && isOpen) {
      setReason(
        isPurchase ? 'Estorno de entrada de pedido de compra' : 'Estorno manual de lançamento'
      );
    }
  }, [move, isOpen, isPurchase]);

  if (!isOpen || !move) return null;

  const handleConfirm = () =>
    form.validateAndRun(
      { reason },
      (values) => onConfirm(values.reason.trim()),
      (errors) => Alert.alert('Revise a justificativa', Object.values(flattenFormErrors(errors))[0])
    );

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <InventoryMoveDeleteModalContent
        move={move}
        isDarkMode={isDarkMode}
        isDeleting={isDeleting}
        reason={reason}
        onChangeReason={setReason}
        onClose={onClose}
        onConfirm={handleConfirm}
      />
    </Modal>
  );
};

export { InventoryMoveDeleteModalContent };
