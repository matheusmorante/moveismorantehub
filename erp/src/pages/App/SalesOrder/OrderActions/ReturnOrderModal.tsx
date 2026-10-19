import { useEffect } from 'react';
import ReturnFormTabs from '../components/ReturnFormTabs';
import ReturnOrderFormBase from '../components/ReturnOrderFormBase';
import ReturnCollectionSection from './ReturnCollectionSection';
import ReturnItemsSelection from './ReturnItemsSelection';
import {
  ReturnOrderModalProps,
  useReturnOrderData,
  useReturnOrderForm,
  ReturnOrderNotice,
  ReturnOrderFooter,
} from './return-order-modal';
import { formatOrderCode } from '../../../utils/orderCode';

const ReturnOrderModal = ({ order, onClose, onSuccess }: ReturnOrderModalProps) => {
  const {
    returnableQuantities,
    returnsLoaded,
    returnDataError,
    fiscalCapacityLines,
    fiscalCapacityLoaded,
    fiscalCapacityError,
    hasAuthorizedInvoice,
    priorReturnsRef,
  } = useReturnOrderData(order);

  const {
    quantities,
    returnUnitPrices,
    collectAtAddress,
    setCollectAtAddress,
    scheduling,
    setScheduling,
    observations,
    setObservations,
    submitting,
    activeTab,
    setActiveTab,
    selectedTotal,
    toggleItem,
    updateQuantity,
    updateUnitPrice,
    generateReturn,
  } = useReturnOrderForm({
    order,
    returnableQuantities,
    returnsLoaded,
    returnDataError,
    fiscalCapacityLines,
    fiscalCapacityLoaded,
    fiscalCapacityError,
    hasAuthorizedInvoice,
    priorReturnsRef,
    onSuccess,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <ReturnOrderFormBase
      title="Gerar pedido de devolução"
      subtitle={`Pedido #${formatOrderCode(order)} • ${order.customerData?.fullName || ''}`}
      onClose={onClose}
      footer={
        <ReturnOrderFooter
          order={order}
          selectedTotal={selectedTotal}
          quantitiesCount={Object.keys(quantities).length}
          submitting={submitting}
          returnDataError={returnDataError}
          returnsLoaded={returnsLoaded}
          fiscalCapacityLoaded={fiscalCapacityLoaded}
          hasAuthorizedInvoice={hasAuthorizedInvoice}
          fiscalCapacityError={fiscalCapacityError}
          collectAtAddress={collectAtAddress}
          onClose={onClose}
          onGenerateReturn={generateReturn}
        />
      }
    >
          <ReturnFormTabs activeTab={activeTab} onChange={setActiveTab} />

          <ReturnOrderNotice
            fiscalCapacityLoaded={fiscalCapacityLoaded}
            returnDataError={returnDataError}
            fiscalCapacityError={fiscalCapacityError}
            hasAuthorizedInvoice={hasAuthorizedInvoice}
            collectAtAddress={collectAtAddress}
          />

          {activeTab === 'items' ? (
            <ReturnItemsSelection
              order={order}
              quantities={quantities}
              returnableQuantities={returnableQuantities}
              returnUnitPrices={returnUnitPrices}
              onToggle={toggleItem}
              onQuantityChange={updateQuantity}
              onUnitPriceChange={updateUnitPrice}
            />
          ) : (
            <ReturnCollectionSection
              collectAtAddress={collectAtAddress}
              onCollectChange={setCollectAtAddress}
              scheduling={scheduling}
              onSchedulingChange={(key, value) =>
                setScheduling((current) => ({ ...current, [key]: value }))
              }
              observations={observations}
              onObservationsChange={setObservations}
            />
          )}
    </ReturnOrderFormBase>
  );
};

export default ReturnOrderModal;
