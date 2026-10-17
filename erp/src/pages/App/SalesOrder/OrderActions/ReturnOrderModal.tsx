import { useEffect } from 'react';
import ReturnFormTabs from '../components/ReturnFormTabs';
import ReturnCollectionSection from './ReturnCollectionSection';
import ReturnItemsSelection from './ReturnItemsSelection';
import {
  ReturnOrderModalProps,
  useReturnOrderData,
  useReturnOrderForm,
  ReturnOrderHeader,
  ReturnOrderNotice,
  ReturnOrderFooter,
} from './return-order-modal';

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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[999999] flex items-stretch justify-center p-0 xl:items-center xl:p-4">
      <button
        type="button"
        aria-label="Fechar modal de devolução"
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="return-order-title"
        tabIndex={-1}
        className="relative z-10 flex h-full w-full max-w-none flex-col overflow-hidden border border-slate-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 xl:h-auto xl:max-h-[90vh] xl:max-w-2xl xl:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <ReturnOrderHeader order={order} onClose={onClose} />

        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6">
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
        </div>

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
      </div>
    </div>
  );
};

export default ReturnOrderModal;
