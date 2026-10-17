import React from 'react';
import Seller from '@/pages/App/SalesOrder/components/Seller';
import Agendamento from '@/pages/App/SalesOrder/ShippingComponents/Agendamento';
import ProductSearchModal from '@/pages/App/SalesOrder/modals/ProductSearchModal';
import CustomerSearchModal from '@/pages/App/SalesOrder/modals/CustomerSearchModal';
import { formatOrderCode } from '@/pages/utils/orderCode';

import {
  AssistanceOrderHeader,
  AssistanceLinkedOrderSection,
  AssistanceCustomerSection,
  AssistanceDescriptionSection,
  AssistanceExtraItemsSection,
  AssistanceActions,
} from './components';

import { useAssistanceOrderForm } from './hooks/useAssistanceOrderForm';
import type { AssistanceOrderModalProps } from './types/assistance.types';

const AssistanceOrderModal: React.FC<AssistanceOrderModalProps> = (props) => {
  const { onClose } = props;
  const {
    isEditing,
    loading,
    customerData,
    setCustomerData,
    seller,
    setSeller,
    description,
    setDescription,
    observation,
    setObservation,
    assistanceServiceValue,
    setAssistanceServiceValue,
    assistanceCost,
    setAssistanceCost,
    scheduling,
    handleChangeScheduling,
    isLinked,
    currentLinkedOrder,
    selectedAssistanceItems,
    handleToggleItem,
    handleUpdateItemQty,
    extraItems,
    setExtraItems,
    validationErrors,
    handleSave,
    isProductSearchOpen,
    setIsProductSearchOpen,
    isCustomerSearchOpen,
    setIsCustomerSearchOpen,
  } = useAssistanceOrderForm(props);

  return (
    <div
      className="fixed inset-0 z-[999999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-[3px] animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up border-t sm:border border-slate-100 dark:border-slate-800"
        style={{ height: '90vh', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <AssistanceOrderHeader
          isEditing={isEditing}
          isLinked={isLinked}
          linkedOrderCode={currentLinkedOrder ? formatOrderCode(currentLinkedOrder) : undefined}
          onClose={onClose}
        />

        <form
          noValidate
          onSubmit={handleSave}
          className="p-8 flex flex-col gap-6 overflow-y-auto custom-scrollbar"
        >
          {/* Card do Pedido Original e Itens (apenas quando for assistência vinculada) */}
          {isLinked && currentLinkedOrder && (
            <AssistanceLinkedOrderSection
              currentLinkedOrder={currentLinkedOrder}
              selectedAssistanceItems={selectedAssistanceItems}
              handleToggleItem={handleToggleItem}
              handleUpdateItemQty={handleUpdateItemQty}
            />
          )}

          {/* Dados do cliente */}
          <AssistanceCustomerSection
            customerData={customerData}
            setCustomerData={setCustomerData}
            onOpenSearch={() => setIsCustomerSearchOpen(true)}
            errors={validationErrors}
            isLinked={isLinked}
          />

          {/* Atendente responsável */}
          <div className="flex flex-col gap-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
              <i className="bi bi-person-badge-fill text-amber-500" />
              Atendente Principal
            </h3>
            <Seller seller={seller} setSeller={setSeller} errors={validationErrors} />
          </div>

          {/* Descrição do serviço, observações e valores */}
          <AssistanceDescriptionSection
            description={description}
            setDescription={setDescription}
            observation={observation}
            setObservation={setObservation}
            assistanceServiceValue={assistanceServiceValue}
            setAssistanceServiceValue={setAssistanceServiceValue}
            assistanceCost={assistanceCost}
            setAssistanceCost={setAssistanceCost}
            errors={validationErrors}
          />

          {/* Peças e materiais extras/avulsos */}
          <AssistanceExtraItemsSection
            extraItems={extraItems}
            setExtraItems={setExtraItems}
            onOpenSearch={() => setIsProductSearchOpen(true)}
          />

          {/* Agendamento técnico */}
          <div className="flex flex-col gap-4">
            <Agendamento
              title="Agendamento da Assistência"
              scheduling={scheduling}
              onChangeScheduling={handleChangeScheduling}
              errors={validationErrors}
              isPickup={false}
              hideNotice={true}
            />
          </div>

          {/* Ações do formulário */}
          <AssistanceActions onClose={onClose} isLoading={loading} isEditing={isEditing} />
        </form>
      </div>

      {isProductSearchOpen && (
        <ProductSearchModal
          onClose={() => setIsProductSearchOpen(false)}
          onSelect={(p, v) => {
            const desc = v ? `${p.description} (${v.name})` : p.description;
            setExtraItems((prev) => [
              ...prev,
              {
                productId: p.id!,
                variationId: v?.id,
                description: desc,
                quantity: 1,
                unitPrice: (v ? v.unitPrice : p.unitPrice) || 0,
                unitDiscount: 0,
                discountType: 'fixed',
                handlingType: 'Standard',
              },
            ]);
            setIsProductSearchOpen(false);
          }}
        />
      )}

      {isCustomerSearchOpen && (
        <CustomerSearchModal
          onClose={() => setIsCustomerSearchOpen(false)}
          onSelect={(c) => {
            setCustomerData(c);
            setIsCustomerSearchOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default AssistanceOrderModal;
