import React from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import Purchase from '../../../../types/purchase.type';
import { formatCurrency } from '../../../../utils/formatters';
import SupplierAutocomplete from '@/components/SupplierAutocomplete';
import { PercentInput } from '@/components/PercentInput';
import { PurchaseItemsSection } from '../../components/PurchaseItemsSection';
import { PurchaseAttachmentsSection } from '../components/PurchaseAttachmentsSection';
import { usePurchaseAttachmentUpload } from '../hooks/usePurchaseAttachmentUpload';
import { usePurchaseModalForm } from '../hooks/usePurchaseModalForm';
import { supplierProvidesStockOrigin } from '../../../../../../../shared-utils/productSupplierStockOrigin';
import { formatPurchaseNumber } from '../../../../../../../shared-utils/purchaseNumber';
import { getPurchaseConfirmationBlockReasons } from '../../../../../../../shared-utils/purchaseFormSchemas';

export interface PurchaseFormModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly purchase?: Purchase | null;
  readonly initialPurchase?: Purchase | null;
}

/**
 * Modal principal de criação e edição de pedidos de compra, cálculo automático de IPI/Frete e lançamento em estoque.
 */
export const PurchaseFormModal: React.FC<PurchaseFormModalProps> = ({
  isOpen,
  onClose,
  purchase,
  initialPurchase,
}) => {
  const activePurchase = purchase || initialPurchase;
  const [activeItemIndex, setActiveItemIndex] = React.useState<number | null>(null);
  const [showConfirmationBlockReasons, setShowConfirmationBlockReasons] = React.useState(false);
  useBodyScrollLock(isOpen);

  React.useEffect(() => {
    setActiveItemIndex(null);
  }, [isOpen, activePurchase?.id]);

  const {
    attachments,
    setAttachments,
    isUploading,
    handleFileUpload,
    handleRemoveAttachment,
  } = usePurchaseAttachmentUpload({
    initialAttachments: activePurchase?.attachments,
  });

  const {
    suppliers,
    selectedSupplierId,
    setSelectedSupplierId,
    items,
    isSaving,
    purchaseDate,
    setPurchaseDate,
    discountPercent,
    setDiscountPercent,
    ipiPercent,
    setIpiPercent,
    freightPercent,
    setFreightPercent,
    validationErrors,
    draftId,
    draftError,
    isAutoSaving,
    hasDraftChanges,
    isDraftSession,
    handleAddItem,
    handleRemoveItem,
    handleUpdateItem,
    handleCancelOrClose,
    handleSave,
  } = usePurchaseModalForm({
    isOpen,
    onClose,
    activePurchase,
    attachments,
    setAttachments,
  });

  const confirmationBlockReasons = getPurchaseConfirmationBlockReasons(selectedSupplierId, items);
  const confirmationBlockKey = confirmationBlockReasons.join('|');

  React.useEffect(() => {
    setShowConfirmationBlockReasons(false);
  }, [isOpen, confirmationBlockKey]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-0 xl:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={
        activePurchase?.id
          ? `Editar Pedido #${formatPurchaseNumber(activePurchase.purchaseNumber) || activePurchase.id.slice(-4)}`
          : 'Novo Pedido de Compra'
      }
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in border-0 cursor-default"
        onClick={handleCancelOrClose}
        aria-label="Fechar pedido de compra"
      />

      <div className="relative bg-white dark:bg-slate-900 w-full h-full xl:h-auto xl:max-h-[90vh] xl:max-w-7xl rounded-none xl:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up border-0 xl:border border-slate-100 dark:border-slate-800 transition-all">
        {/* Header Compacto */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 xl:px-8 xl:py-5 bg-blue-600 text-white flex items-center justify-between gap-3 shrink-0 shadow-sm">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg xl:text-xl font-black tracking-tight uppercase truncate">
                {activePurchase?.id
                  ? `Editar Pedido #${formatPurchaseNumber(activePurchase.purchaseNumber) || activePurchase.id.slice(-4)}`
                  : 'Novo Pedido de Compra'}
              </h2>
              {activePurchase?.status && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${
                    activePurchase.status === 'draft'
                      ? 'bg-indigo-200 text-indigo-900 border border-indigo-300'
                      : activePurchase.status === 'pending'
                      ? 'bg-amber-500/20 text-amber-100 border border-amber-400/30'
                      : activePurchase.status === 'fulfilled'
                      ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-400/30'
                      : activePurchase.status === 'ordered'
                        ? 'bg-white/20 text-white border border-white/30'
                        : 'bg-red-500/20 text-red-100 border border-red-400/30'
                  }`}
                >
                  {activePurchase.status === 'draft'
                    ? 'Rascunho'
                    : activePurchase.status === 'pending'
                    ? 'Pendente'
                    : activePurchase.status === 'fulfilled'
                    ? 'Atendido'
                    : activePurchase.status === 'ordered'
                      ? 'Em Ordem'
                      : 'Cancelado'}
                </span>
              )}
              {!activePurchase?.id && (hasDraftChanges || draftId) && (
                <span className="px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-indigo-200 text-indigo-900 border border-indigo-300">
                  Rascunho
                </span>
              )}
            </div>
            <p className="hidden xl:block text-[10px] font-black uppercase tracking-[0.15em] text-blue-200 mt-0.5">
              {activePurchase?.id
                ? `Alteração de dados e itens • ${activePurchase.supplierName}`
                : 'Entrada de mercadorias via fornecedor'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCancelOrClose}
              className="p-1.5 sm:p-2 hover:bg-white/10 rounded-xl transition-colors"
              aria-label="Fechar modal"
            >
              <i className="bi bi-x-lg text-lg" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className={`flex-1 min-h-0 overflow-y-auto flex flex-col gap-6 p-4 custom-scrollbar sm:p-6 xl:gap-8 xl:p-8 ${isSaving ? 'pointer-events-none opacity-60' : ''}`}>
          {/* Supplier, Date, Discount, IPI & Freight */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-6 items-end">
            <div className="col-span-2 md:col-span-2 flex flex-col gap-2">
              <SupplierAutocomplete
                suppliers={[...suppliers]}
                selectedSupplierId={selectedSupplierId}
                onSelect={setSelectedSupplierId}
                supplierFilter={(supplier) => supplierProvidesStockOrigin(supplier.stockOrigins, 'normal')}
                disabled={Boolean(selectedSupplierId && items.length > 0)}
                disabledReason="Para alterar o fornecedor, remova todos os itens do pedido."
                showDisabledReasonOnClick
                placeholder="Buscar fornecedor..."
                inputClassName="w-full bg-transparent border-0 border-b-2 border-slate-200 dark:border-slate-700 p-2 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-300 transition-all focus:ring-0 focus:shadow-sm rounded-none"
              />
              {validationErrors.supplier && (
                <span className="text-xs font-bold text-red-500">Selecione um fornecedor.</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Data do Pedido
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full bg-transparent border-0 border-b-2 border-slate-200 dark:border-slate-700 p-2 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-200 transition-all focus:ring-0 rounded-none"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="purchase-discount-percent" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Desconto (%)
              </label>
              <PercentInput
                id="purchase-discount-percent"
                value={discountPercent}
                onChangeValue={(value) => setDiscountPercent(value ?? 0)}
                min={0}
                className="!text-sm"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="purchase-ipi-percent" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                IPI (%)
              </label>
              <PercentInput
                id="purchase-ipi-percent"
                value={ipiPercent}
                onChangeValue={(value) => setIpiPercent(value ?? 0)}
                min={0}
                className="!text-sm"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="purchase-freight-percent" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Frete (%)
              </label>
              <PercentInput
                id="purchase-freight-percent"
                value={freightPercent}
                onChangeValue={(value) => setFreightPercent(value ?? 0)}
                min={0}
                className="!text-sm"
              />
            </div>
          </div>

          <PurchaseAttachmentsSection
            attachments={attachments}
            isUploading={isUploading}
            onUpload={handleFileUpload}
            onRemove={handleRemoveAttachment}
          />

          {/* Section of Purchase Items */}
          <PurchaseItemsSection
            items={[...items]}
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
            onUpdateItem={handleUpdateItem}
            discountPercent={discountPercent}
            ipiPercent={ipiPercent}
            freightPercent={freightPercent}
            formatCurrency={formatCurrency}
            supplierId={selectedSupplierId}
            onSupplierAutoSelect={(supId) => setSelectedSupplierId(supId)}
            hasError={validationErrors.items}
            isReceiptMode={false}
            activeItemIndex={activeItemIndex}
            onActiveItemChange={setActiveItemIndex}
            canRemoveItems={!isSaving && !isUploading}
          />

          <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col items-stretch gap-4">
            {isDraftSession && (
              <p className="text-xs font-bold text-slate-400">
                <i
                  className={`bi ${
                    isAutoSaving ? 'bi-arrow-repeat animate-spin' : 'bi-cloud-check-fill'
                  } mr-1.5 text-blue-500`}
                  aria-hidden="true"
                />
                {isAutoSaving
                  ? 'Salvando rascunho…'
                  : draftError || (hasDraftChanges
                    ? 'Alterações aguardando salvamento'
                    : draftId
                      ? 'Rascunho salvo'
                      : 'Preencha um campo para iniciar o rascunho')}
              </p>
            )}
            <div className="flex w-full justify-between gap-3">
              <div className="relative flex-1 sm:flex-none sm:min-w-[180px]">
                {showConfirmationBlockReasons && confirmationBlockReasons.length > 0 && (
                  <div
                    id="purchase-confirmation-block-reasons"
                    role="tooltip"
                    aria-live="polite"
                    className="absolute bottom-full left-0 z-20 mb-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-left text-xs font-semibold text-red-800 shadow-lg dark:border-red-900 dark:bg-red-950 dark:text-red-200"
                  >
                    {confirmationBlockReasons.map((reason) => <p key={reason}>{reason}</p>)}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (isSaving) return;
                    if (confirmationBlockReasons.length > 0) {
                      setShowConfirmationBlockReasons(true);
                      return;
                    }
                    setShowConfirmationBlockReasons(false);
                    void handleSave();
                  }}
                  disabled={isSaving}
                  aria-disabled={isSaving || confirmationBlockReasons.length > 0}
                  aria-describedby={showConfirmationBlockReasons && confirmationBlockReasons.length > 0
                    ? 'purchase-confirmation-block-reasons'
                    : undefined}
                  className={`w-full rounded-2xl bg-blue-600 px-3 py-3.5 text-center text-xs font-bold text-white transition-all shadow-lg shadow-blue-200 dark:shadow-none sm:px-6 sm:text-sm ${
                    confirmationBlockReasons.length > 0
                      ? 'cursor-not-allowed opacity-50'
                      : 'hover:bg-blue-700'
                  } ${isSaving ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  {activePurchase?.id && activePurchase.status !== 'draft' ? 'Salvar Alterações' : 'Confirmar Pedido'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default PurchaseFormModal;
