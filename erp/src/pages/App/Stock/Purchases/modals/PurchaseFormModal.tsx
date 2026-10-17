import React from 'react';
import { createPortal } from 'react-dom';
import Purchase from '../../../../types/purchase.type';
import { formatCurrency } from '../../../../utils/formatters';
import SupplierAutocomplete from '@/components/SupplierAutocomplete';
import { PurchaseItemsSection } from '../../components/PurchaseItemsSection';
import { PurchaseAttachmentsSection } from '../components/PurchaseAttachmentsSection';
import { usePurchaseAttachmentUpload } from '../hooks/usePurchaseAttachmentUpload';
import { usePurchaseModalForm } from '../hooks/usePurchaseModalForm';

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
    ipiPercent,
    setIpiPercent,
    freightPercent,
    setFreightPercent,
    validationErrors,
    draftId,
    draftError,
    isAutoSaving,
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

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-0 xl:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={
        activePurchase?.id
          ? `Editar Pedido #${activePurchase.purchaseNumber || activePurchase.id.slice(-4)}`
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
                  ? `Editar Pedido #${activePurchase.purchaseNumber || activePurchase.id.slice(-4)}`
                  : 'Novo Pedido de Compra'}
              </h2>
              {activePurchase?.status && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${
                    activePurchase.status === 'fulfilled'
                      ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-400/30'
                      : activePurchase.status === 'ordered'
                        ? 'bg-white/20 text-white border border-white/30'
                        : 'bg-red-500/20 text-red-100 border border-red-400/30'
                  }`}
                >
                  {activePurchase.status === 'fulfilled'
                    ? 'Atendido'
                    : activePurchase.status === 'ordered'
                      ? 'Em Ordem'
                      : 'Cancelado'}
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

        <div className="flex-1 overflow-y-auto p-6 xl:p-8 space-y-8 custom-scrollbar">
          {/* Supplier, Date, IPI & Freight */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
            <div className="md:col-span-2 flex flex-col gap-2">
              <SupplierAutocomplete
                suppliers={[...suppliers]}
                selectedSupplierId={selectedSupplierId}
                onSelect={setSelectedSupplierId}
                disabled={items.length > 0}
                disabledReason="Para alterar o fornecedor, remova todos os itens do pedido."
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
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                IPI (%)
              </label>
              <div className="relative border-0 border-b-2 border-slate-200 dark:border-slate-700 focus-within:border-blue-600 dark:focus-within:border-blue-500 transition-all">
                <input
                  type="number"
                  placeholder="0"
                  value={ipiPercent || ''}
                  onChange={(e) => setIpiPercent(Number(e.target.value))}
                  className="w-full bg-transparent p-2 outline-none font-bold text-sm text-slate-700 dark:text-slate-200 border-none focus:ring-0 rounded-none"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs select-none">
                  %
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Frete (%)
              </label>
              <div className="relative border-0 border-b-2 border-slate-200 dark:border-slate-700 focus-within:border-blue-600 dark:focus-within:border-blue-500 transition-all">
                <input
                  type="number"
                  placeholder="0"
                  value={freightPercent || ''}
                  onChange={(e) => setFreightPercent(Number(e.target.value))}
                  className="w-full bg-transparent p-2 outline-none font-bold text-sm text-slate-700 dark:text-slate-200 border-none focus:ring-0 rounded-none"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs select-none">
                  %
                </div>
              </div>
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
            ipiPercent={ipiPercent}
            freightPercent={freightPercent}
            formatCurrency={formatCurrency}
            supplierId={selectedSupplierId}
            onSupplierAutoSelect={(supId) => setSelectedSupplierId(supId)}
            hasError={validationErrors.items}
            isReceiptMode={false}
          />
        </div>

        {/* Footer Actions */}
        <div className="p-6 xl:p-8 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
          {!activePurchase?.id && (
            <p className="text-xs font-bold text-slate-400">
              <i
                className={`bi ${
                  isAutoSaving ? 'bi-arrow-repeat animate-spin' : 'bi-cloud-check-fill'
                } mr-1.5 text-blue-500`}
                aria-hidden="true"
              />
              {isAutoSaving ? 'Salvando rascunho…' : draftError || (draftId ? 'Rascunho salvo' : 'Aguardando dados para salvar o rascunho')}
            </p>
          )}
          <button
            type="button"
            onClick={handleCancelOrClose}
            className="w-full sm:w-auto px-6 py-3.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar / Fechar
          </button>
          <div className="flex gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() =>
                handleSave(activePurchase?.status === 'fulfilled' ? 'fulfilled' : 'ordered')
              }
              disabled={isSaving}
              className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2"
            >
              <i className="bi bi-check2-circle text-lg" aria-hidden="true" />
              <span>{activePurchase?.id ? 'Salvar Alterações' : 'Confirmar Pedido'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default PurchaseFormModal;
