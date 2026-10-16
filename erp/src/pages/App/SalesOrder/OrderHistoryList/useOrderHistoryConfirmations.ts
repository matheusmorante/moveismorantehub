import { useState } from 'react';

export interface OrderHistoryConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  type: 'danger' | 'warning' | 'info';
}

interface UseOrderHistoryConfirmationsParams {
  onDelete: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onBulkTrash: () => void;
  onBulkPermanentDelete: () => void;
  selectedOrdersCount: number;
}

export function useOrderHistoryConfirmations({
  onDelete,
  onPermanentDelete,
  onBulkTrash,
  onBulkPermanentDelete,
  selectedOrdersCount,
}: UseOrderHistoryConfirmationsParams) {
  const [confirmModal, setConfirmModal] = useState<OrderHistoryConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info',
  });

  const closeConfirmModal = () =>
    setConfirmModal((prev) => ({
      ...prev,
      isOpen: false,
    }));

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir rascunho?',
      message: 'Esta ação não pode ser desfeita. O rascunho será removido permanentemente.',
      onConfirm: () => onDelete(id),
      type: 'danger',
    });
  };

  const handlePermanentDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Permanentemente?',
      message:
        'Esta ação não pode ser desfeita. Todos os dados deste pedido serão removidos definitivamente.',
      onConfirm: () => onPermanentDelete(id),
      type: 'danger',
    });
  };

  const handleBulkTrash = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Mover selecionados para Lixeira?',
      message: `Você está prestes a mover ${selectedOrdersCount} pedido(s) para a lixeira.`,
      onConfirm: () => onBulkTrash(),
      type: 'warning',
    });
  };

  const handleBulkPermanentDelete = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Permanentemente?',
      message: `Você está prestes a excluir DEFINITIVAMENTE ${selectedOrdersCount} pedido(s). Esta ação não pode ser desfeita.`,
      onConfirm: () => onBulkPermanentDelete(),
      type: 'danger',
    });
  };

  return {
    confirmModal,
    closeConfirmModal,
    handleDelete,
    handlePermanentDelete,
    handleBulkTrash,
    handleBulkPermanentDelete,
  };
}
