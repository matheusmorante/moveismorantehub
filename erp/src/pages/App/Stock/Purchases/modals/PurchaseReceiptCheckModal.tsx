import React from 'react';
import Purchase from '../../../../types/purchase.type';
import QRScannerModal from '@/components/shared/QRScannerModal';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { formatToBRDate } from '../../../../utils/formatters';
import { usePurchaseReceiptCheckForm } from '../hooks/usePurchaseReceiptCheckForm';
import { PurchaseReceiptItemRow } from '../components/PurchaseReceiptItemRow';

export interface PurchaseReceiptCheckModalProps {
  readonly purchase: Purchase | null;
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

/**
 * Modal de conferência de compra (3-Way Match: Pedido x NF x Físico) com suporte a leitor de código de barras.
 */
export const PurchaseReceiptCheckModal: React.FC<PurchaseReceiptCheckModalProps> = ({
  purchase,
  isOpen,
  onClose,
}) => {
  const {
    scannedItems,
    invoicedQuantities,
    isScannerOpen,
    setIsScannerOpen,
    isSaving,
    invoiceNumber,
    setInvoiceNumber,
    invoiceDate,
    setInvoiceDate,
    discrepancyNote,
    setDiscrepancyNote,
    validationError,
    form,
    handleScan,
    updateReceivedQty,
    updateInvoicedQty,
    handlePrint,
    handleSave,
  } = usePurchaseReceiptCheckForm({
    purchase,
    isOpen,
    onClose,
  });

  if (!isOpen || !purchase) return null;

  return (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-2 sm:p-4 xl:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Conferência de Compra"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in border-0 cursor-default"
        onClick={onClose}
        aria-label="Fechar conferência de compra"
      />

      <div className="relative bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
        <div className="p-8 bg-blue-600 text-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-2xl font-black tracking-tight uppercase">
              3-Way Match: Conferência de Compra
            </h2>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200 mt-1">
              Pedido #{purchase.id?.slice(-4)} • {purchase.supplierName} •{' '}
              {formatToBRDate(purchase.date)}
            </p>
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-white/20 hover:bg-white/30 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all"
            >
              <i className="bi bi-printer" aria-hidden="true" />
              Imprimir
            </button>
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="bg-white/20 hover:bg-white/30 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all"
            >
              <i className="bi bi-qr-code-scan" aria-hidden="true" />
              Escanear
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              aria-label="Fechar modal"
            >
              <i className="bi bi-x-lg text-xl" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
          {/* NF Info Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-800">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Número da NF
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="000.000.000"
                className="w-full bg-white dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-sm font-bold"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Data da NF
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-sm font-bold font-mono"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Nota de Divergência
              </label>
              <input
                type="text"
                value={discrepancyNote}
                onChange={(e) => setDiscrepancyNote(e.target.value)}
                placeholder="Ex: Produto avariado, falta item..."
                className="w-full bg-white dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-sm font-bold"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-12 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400">
              <div className="col-span-5">Produto</div>
              <div className="col-span-2 text-center">Pedido</div>
              <div className="col-span-2 text-center">NF (Faturado)</div>
              <div className="col-span-3 text-center">Físico (Recebido)</div>
            </div>

            {purchase.items.map((item, index) => {
              const key = item.productId + (item.variationId || '');
              const received = scannedItems[key] || 0;
              const invoiced = invoicedQuantities[key] || 0;

              return (
                <PurchaseReceiptItemRow
                  key={index}
                  item={item}
                  received={received}
                  invoiced={invoiced}
                  onUpdateInvoiced={(val) => updateInvoicedQty(key, val)}
                  onUpdateReceived={(val) => updateReceivedQty(key, val)}
                />
              );
            })}
          </div>
        </div>

        <div className="p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          {validationError && (
            <p role="alert" className="mb-3 text-sm font-bold text-red-600 dark:text-red-400">
              {validationError}
            </p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || form.formState.isSubmitting}
            className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <i className="bi bi-check-lg text-xl" aria-hidden="true" />
            )}
            Finalizar Conferência
          </button>
        </div>
      </div>

      <ErrorBoundary name="Scanner de Recebimento">
        <QRScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScan={handleScan}
          closeOnScan={false}
          title="Escanear Itens do Pedido"
        />
      </ErrorBoundary>
    </div>
  );
};

export default PurchaseReceiptCheckModal;
