import React from 'react';
import type Order from '@/pages/types/order.type';
import SellerSearchModal from '../../SellerSearchModal';
import PersonFormModal from '@/pages/App/Registrations/shared/modals/PersonFormModal';
import ItemMovementChangeConfirmModal, {
  getInventorySensitiveItemChanges,
} from '../../ItemMovementChangeConfirmModal';
import ConfirmModal from '@/components/shared/ConfirmModal';

interface OrderEditSubModalsProps {
  // Seller search & registration
  isSellerSearchOpen: boolean;
  sellerRef: React.RefObject<HTMLButtonElement>;
  onSelectSeller: (name: string) => void;
  onCloseSellerSearch: () => void;
  onAddNewSeller: () => void;
  isSellerRegistrationOpen: boolean;
  onCloseSellerRegistration: () => void;
  onSellerRegistered: (newSeller: any) => void;

  // Customer registration
  isCustomerRegistrationOpen: boolean;
  pendingCustomerData: any;
  onCloseCustomerRegistration: () => void;
  onCustomerRegistered: (person: any) => void;

  // Inventory movement confirm
  effectiveOrder: Order;
  pendingUpdate: Order | null;
  onCancelPendingUpdate: () => void;
  onConfirmPendingUpdate: () => void;

  // Commercial reconciliation confirm
  isReconciliationConfirmationOpen: boolean;
  onCloseReconciliationConfirmation: () => void;
  onConfirmReconciliation: () => void;

}

export const OrderEditSubModals: React.FC<OrderEditSubModalsProps> = ({
  isSellerSearchOpen,
  sellerRef,
  onSelectSeller,
  onCloseSellerSearch,
  onAddNewSeller,
  isSellerRegistrationOpen,
  onCloseSellerRegistration,
  onSellerRegistered,
  isCustomerRegistrationOpen,
  pendingCustomerData,
  onCloseCustomerRegistration,
  onCustomerRegistered,
  effectiveOrder,
  pendingUpdate,
  onCancelPendingUpdate,
  onConfirmPendingUpdate,
  isReconciliationConfirmationOpen,
  onCloseReconciliationConfirmation,
  onConfirmReconciliation,
}) => {
  return (
    <>
      {/* Seller Search Modal */}
      {isSellerSearchOpen && (
        <SellerSearchModal
          anchorRef={sellerRef}
          onSelect={onSelectSeller}
          onClose={onCloseSellerSearch}
          onAddNew={onAddNewSeller}
        />
      )}

      {/* Seller Registration Modal */}
      <PersonFormModal
        isOpen={isSellerRegistrationOpen}
        onClose={onCloseSellerRegistration}
        collectionName="employees"
        title="Vendedor"
        onSuccess={onSellerRegistered}
      />

      {/* Customer Registration Modal */}
      <PersonFormModal
        isOpen={isCustomerRegistrationOpen}
        onClose={onCloseCustomerRegistration}
        collectionName="customers"
        title="Cliente"
        person={pendingCustomerData}
        onSuccess={onCustomerRegistered}
      />

      {/* Item Movement Change Confirmation */}
      {pendingUpdate && (
        <ItemMovementChangeConfirmModal
          changes={getInventorySensitiveItemChanges(effectiveOrder, pendingUpdate)}
          onCancel={onCancelPendingUpdate}
          onConfirm={onConfirmPendingUpdate}
        />
      )}

      {/* Commercial Reconciliation Confirmation */}
      <ConfirmModal
        isOpen={isReconciliationConfirmationOpen}
        onClose={onCloseReconciliationConfirmation}
        onConfirm={onConfirmReconciliation}
        title="Confirmar conciliação comercial?"
        message="A conciliação comercial serve apenas para o relatório de vendas, indexando o produto cadastrado no lugar daquele que não estava cadastrado antes da conciliação. Ela NÃO gera movimentação de estoque (nem saída na venda, nem entrada na devolução). Deseja continuar?"
        confirmLabel="Confirmar conciliação comercial"
        type="info"
      />

    </>
  );
};
