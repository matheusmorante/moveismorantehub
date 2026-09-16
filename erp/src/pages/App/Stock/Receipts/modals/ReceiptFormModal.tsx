import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PurchaseItemsSection } from '@/components/PurchaseItemsSection';
import { formatCurrency } from '@/pages/utils/formatters';
import type { GoodsReceipt } from '@/pages/utils/goodsReceiptService';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import type Purchase from '@/pages/types/purchase.type';
import ReceiptFiscalDocumentsSection from '../ReceiptFiscalDocumentsSection';
import ReturnObservationTags from '@/pages/App/SalesOrder/OrderActions/ReturnObservationTags';
import InboundNfeItemsSection from '../InboundNfeItemsSection';
import { formatGoodsReceiptCode } from '@/pages/utils/goodsReceiptCode';
import { InboundInvoiceFiscalReview } from '@/pages/App/Stock/InboundInvoices/components/InboundInvoiceFiscalReview';
import { useReceiptForm } from '../hooks/useReceiptForm';
import { ReceiptFormHeader } from '../components/ReceiptFormHeader';
import { ReceiptFormCosts } from '../components/ReceiptFormCosts';

interface ReceiptFormModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly initialReceipt?: GoodsReceipt | null;
    readonly copyReceipt?: boolean;
    readonly initialInboundInvoice?: InboundInvoice | null;
    readonly initialPurchase?: Purchase | null;
}

export function ReceiptFormModal(props: ReceiptFormModalProps) {
    const { isOpen, onClose, initialReceipt, copyReceipt, initialInboundInvoice, initialPurchase } = props;

    const {
        suppliers,
        supplierId,
        setSupplierId,
        items,
        setItems,
        inboundItems,
        ipiPercent,
        freightPercent,
        nonFiscalDiscountMode,
        setNonFiscalDiscountMode,
        nonFiscalDiscountValue,
        setNonFiscalDiscountValue,
        nonFiscalFreightMode,
        setNonFiscalFreightMode,
        nonFiscalFreightValue,
        setNonFiscalFreightValue,
        nonFiscalOtherExpensesMode,
        setNonFiscalOtherExpensesMode,
        nonFiscalOtherExpensesValue,
        setNonFiscalOtherExpensesValue,
        receiptDate,
        setReceiptDate,
        invoiceNumber,
        fiscalKey,
        setFiscalKey,
        attachments,
        setAttachments,
        observations,
        setObservations,
        isSaving,
        isAttachingInboundDocument,
        isDraftSaved,
        receiptIndex,
        processedItems,
        totalValue,
        baseValueForRateio,
        handleFinalize,
        handleInboundItemChange,
    } = useReceiptForm(props);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;
    
    const supplier = suppliers.find((person) => person.id === supplierId);

    const content = (
        <div
            className="fixed inset-0 z-[999999] flex items-center justify-center p-0 xl:p-6 bg-slate-900/60 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-form-modal-title"
        >
            <button
                type="button"
                aria-label="Fechar modal"
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-default"
                onClick={onClose}
            />
            <section className="relative flex flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-900 h-full w-full xl:h-auto xl:max-h-[90vh] xl:max-w-7xl xl:rounded-[2.5rem]">
                <header className="flex shrink-0 items-center justify-between bg-emerald-600 px-5 py-3 text-white xl:px-8 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white">
                            <i className={`bi ${fiscalKey || initialInboundInvoice ? 'bi-file-earmark-text-fill' : 'bi-box-seam'} text-lg`} aria-hidden="true" />
                        </div>
                        <div>
                            <h2 id="receipt-form-modal-title" className="text-base sm:text-lg font-black uppercase tracking-wide">
                                {fiscalKey || initialInboundInvoice ? 'Registrar Recebimento com NF-e' : initialPurchase ? 'Registrar Recebimento com Pedido de Compra' : 'Registrar Recebimento sem Nota Fiscal'}
                            </h2>
                            {fiscalKey || initialInboundInvoice ? (
                                <p className="text-xs text-emerald-100 font-normal">
                                    NF-e #{invoiceNumber || initialInboundInvoice?.nfeNumber || '—'} · {supplier?.fullName || initialInboundInvoice?.emitterName || 'Fornecedor'}
                                </p>
                            ) : (
                                <p className="text-xs text-emerald-100 font-normal">
                                    Entrada de mercadorias no estoque e conciliação de custos
                                </p>
                            )}
                        </div>
                        {(receiptIndex || (!copyReceipt && initialReceipt?.receiptIndex)) && (
                            <span className="font-mono text-xs font-black bg-emerald-800/60 border border-emerald-400/40 px-2.5 py-0.5 rounded-lg text-emerald-100">
                                #{formatGoodsReceiptCode({ receiptIndex: receiptIndex || (!copyReceipt ? initialReceipt?.receiptIndex : undefined) })}
                            </span>
                        )}
                        {isDraftSaved && (
                            <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white border border-white/30 animate-pulse">
                                <i className="bi bi-cloud-check-fill text-emerald-300" aria-hidden="true" /> Rascunho salvo
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl p-2 hover:bg-white/10 transition-colors"
                        title="Fechar"
                        aria-label="Fechar"
                    >
                        <i className="bi bi-x-lg text-lg" aria-hidden="true" />
                    </button>
                </header>
                <div className="flex-1 space-y-6 overflow-y-auto p-5 xl:p-8 max-w-7xl mx-auto w-full">
                    {/* Resumo Fiscal da NF-e */}
                    {initialInboundInvoice && (
                        <InboundInvoiceFiscalReview invoice={initialInboundInvoice} />
                    )}

                    <ReceiptFormHeader
                        initialInboundInvoice={initialInboundInvoice}
                        initialPurchase={initialPurchase}
                        initialReceipt={initialReceipt}
                        copyReceipt={copyReceipt}
                        items={items}
                        suppliers={suppliers}
                        supplierId={supplierId}
                        setSupplierId={setSupplierId}
                        receiptDate={receiptDate}
                        setReceiptDate={setReceiptDate}
                    />

                    <ReceiptFormCosts
                        baseValueForRateio={baseValueForRateio}
                        nonFiscalDiscountMode={nonFiscalDiscountMode}
                        setNonFiscalDiscountMode={setNonFiscalDiscountMode}
                        nonFiscalDiscountValue={nonFiscalDiscountValue}
                        setNonFiscalDiscountValue={setNonFiscalDiscountValue}
                        nonFiscalFreightMode={nonFiscalFreightMode}
                        setNonFiscalFreightMode={setNonFiscalFreightMode}
                        nonFiscalFreightValue={nonFiscalFreightValue}
                        setNonFiscalFreightValue={setNonFiscalFreightValue}
                        nonFiscalOtherExpensesMode={nonFiscalOtherExpensesMode}
                        setNonFiscalOtherExpensesMode={setNonFiscalOtherExpensesMode}
                        nonFiscalOtherExpensesValue={nonFiscalOtherExpensesValue}
                        setNonFiscalOtherExpensesValue={setNonFiscalOtherExpensesValue}
                    />

                    <ReceiptFiscalDocumentsSection
                        attachments={attachments}
                        fiscalKey={fiscalKey}
                        onAttachmentsChange={setAttachments}
                        onFiscalKeyChange={setFiscalKey}
                    />
                    
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
                        <ReturnObservationTags
                            label="Observações do Recebimento"
                            observations={observations}
                            onChange={setObservations}
                        />
                    </div>
                    
                    {inboundItems ? (
                        <InboundNfeItemsSection
                            items={inboundItems}
                            processedItems={processedItems}
                            supplierId={supplierId}
                            onChange={handleInboundItemChange}
                            formatCurrency={formatCurrency}
                        />
                    ) : (
                        <PurchaseItemsSection
                            items={processedItems}
                            onAddItem={(item) => setItems((current) => [...current, item])}
                            onRemoveItem={(index) => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                            onUpdateItem={(index, updatedItem) => setItems((current) => current.map((item, i) => (i === index ? updatedItem : item)))}
                            ipiPercent={ipiPercent}
                            freightPercent={freightPercent}
                            formatCurrency={formatCurrency}
                            supplierId={supplierId}
                            onSupplierAutoSelect={setSupplierId}
                            isReceiptMode={true}
                        />
                    )}
                </div>
                <footer className="flex shrink-0 flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-955/40 sm:flex-row xl:px-8 shadow-inner">
                    <div className="flex flex-wrap items-center gap-3">
                        <p className="text-sm font-black text-slate-700 dark:text-slate-100">
                            Total final: <span className="text-emerald-600 dark:text-emerald-400 text-lg font-black">{formatCurrency(totalValue)}</span>
                        </p>
                        {inboundItems && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold bg-slate-200/60 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg">
                                {inboundItems.filter((i) => Boolean(i.linkedProductId)).length} de {inboundItems.length} itens vinculados
                            </span>
                        )}
                    </div>
                    <div className="flex w-full gap-3 sm:w-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 sm:flex-initial rounded-2xl px-5 py-3 text-xs font-black uppercase text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            disabled={isSaving || isAttachingInboundDocument}
                            onClick={handleFinalize}
                            className="flex-1 sm:flex-initial rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-black uppercase text-white hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md"
                        >
                            {isAttachingInboundDocument ? 'Anexando XML...' : isSaving ? 'Confirmando...' : 'Confirmar recebimento'}
                        </button>
                    </div>
                </footer>
            </section>
        </div>
    );

    return typeof document === 'undefined' ? content : createPortal(content, document.body);
}

export default ReceiptFormModal;
