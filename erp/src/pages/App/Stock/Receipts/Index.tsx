import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useReceipts } from './useReceipts';
import { ReceiptsHeader } from './ReceiptsHeader';
import { ReceiptsTable } from './ReceiptsTable';
import ReceiptCard from './ReceiptCard';
import ReceiptFormModal from './ReceiptFormModal';
import ReceiptDetailsModal from './ReceiptDetailsModal';
import ConfirmReverseModal from './ConfirmReverseModal';
import InboundInvoiceReceiptPickerModal from './InboundInvoiceReceiptPickerModal';
import PurchaseReceiptPickerModal from './PurchaseReceiptPickerModal';
import { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { fetchInboundInvoices } from '@/pages/utils/inboundNfe/inboundInvoicesService';
import Purchase from '@/types/purchase.type';

export default function ReceiptsPage() {
    const [searchParams] = useSearchParams();
    const inboundKeyParam = searchParams.get('inboundKey');

    const [isInboundPickerOpen, setIsInboundPickerOpen] = useState(false);
    const [isPurchasePickerOpen, setIsPurchasePickerOpen] = useState(false);
    const [selectedInboundInvoice, setSelectedInboundInvoice] = useState<InboundInvoice | null>(null);
    const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

    const {
        suppliers,
        selectedSupplierId,
        setSelectedSupplierId,
        supplierReceipts,
        isFormOpen,
        setIsFormOpen,
        selectedReceipt,
        setSelectedReceipt,
        isDetailsOpen,
        setIsDetailsOpen,
        detailsReceipt,
        setDetailsReceipt,
        openMenuId,
        setOpenMenuId,
        reverseCandidate,
        setReverseCandidate,
        isReversing,
        handleOpenNew,
        handleOpenEdit,
        handleOpenDetails,
        handleRowClick,
        handleDelete,
        handleReverseRequest,
        handleConfirmReverse
    } = useReceipts();

    // Pré-carrega NF-e de entrada se veio por query param da tela de Notas Fiscais de Entrada
    useEffect(() => {
        if (!inboundKeyParam) return;
        const loadFromParam = async () => {
            try {
                const list = await fetchInboundInvoices();
                const matched = list.find((inv) => inv.nfeKey === inboundKeyParam);
                if (matched) {
                    setSelectedInboundInvoice(matched);
                    setSelectedPurchase(null);
                    setIsFormOpen(true);
                }
            } catch (e) {
                console.error('Erro ao buscar nota por parâmetro:', e);
            }
        };
        loadFromParam();
    }, [inboundKeyParam]);

    const handleSelectInboundInvoice = (invoice: InboundInvoice) => {
        setSelectedInboundInvoice(invoice);
        setSelectedPurchase(null);
        setSelectedReceipt(null);
        setIsFormOpen(true);
    };

    const handleSelectPurchase = (purchase: Purchase) => {
        if (purchase.supplierId) {
            setSelectedSupplierId(purchase.supplierId);
        }
        setSelectedInboundInvoice(null);
        setSelectedPurchase(purchase);
        setSelectedReceipt(null);
        setIsFormOpen(true);
    };

    const selectedSupplier = suppliers.find((p) => p.id === selectedSupplierId);

    return (
        <div className="flex flex-col">
            <ReceiptsHeader
                suppliers={suppliers}
                selectedSupplierId={selectedSupplierId}
                onSelectSupplier={setSelectedSupplierId}
                onSelectInboundNfe={() => setIsInboundPickerOpen(true)}
                onSelectPurchase={() => setIsPurchasePickerOpen(true)}
                onSelectManual={() => {
                    setSelectedInboundInvoice(null);
                    setSelectedPurchase(null);
                    handleOpenNew();
                }}
            />

            <section className="overflow-hidden">
                {!selectedSupplierId ? (
                    <div className="rounded-[2rem] border border-slate-100 bg-white p-12 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
                        <i className="bi bi-person-lines-fill text-4xl text-slate-300 dark:text-slate-700" />
                        <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">Selecione um fornecedor acima</p>
                        <p className="mt-1 text-xs text-slate-400">Pesquise o fornecedor para visualizar o histórico de recebimentos, ou utilize o botão acima para iniciar por Nota Fiscal de Entrada ou Pedido.</p>
                    </div>
                ) : supplierReceipts.length === 0 ? (
                    <div className="rounded-[2rem] border border-slate-100 bg-white p-12 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
                        <i className="bi bi-box2-heart text-3xl text-slate-300" />
                        <p className="mt-3 text-sm font-bold text-slate-400">Nenhum recebimento encontrado para este fornecedor.</p>
                        <p className="mt-1 text-xs text-slate-400">Utilize as opções no topo para registrar um novo recebimento deste fornecedor.</p>
                    </div>
                ) : (
                    <>
                        {/* Visualização em Tabela (Apenas telas XL ou maiores: >= 1280px) */}
                        <ReceiptsTable
                            receipts={supplierReceipts}
                            openMenuId={openMenuId}
                            setOpenMenuId={setOpenMenuId}
                            onRowClick={handleRowClick}
                            onOpenDetails={handleOpenDetails}
                            onOpenEdit={handleOpenEdit}
                            onReverseRequest={handleReverseRequest}
                            onDelete={handleDelete}
                        />

                        {/* Visualização em Cards (Telas menores que XL: < 1280px) */}
                        <div className="block xl:hidden">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {supplierReceipts.map((receipt) => (
                                    <ReceiptCard
                                        key={receipt.id}
                                        receipt={receipt}
                                        onClick={handleRowClick}
                                        onEdit={handleOpenEdit}
                                        onDelete={handleDelete}
                                        onReverse={handleReverseRequest}
                                        onViewDetails={handleOpenDetails}
                                    />
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </section>

            <ReceiptFormModal
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false);
                    setSelectedReceipt(null);
                    setSelectedInboundInvoice(null);
                    setSelectedPurchase(null);
                }}
                initialReceipt={selectedReceipt}
                initialInboundInvoice={selectedInboundInvoice}
                initialPurchase={selectedPurchase}
                preselectedSupplierId={selectedSupplierId}
            />

            <ReceiptDetailsModal
                isOpen={isDetailsOpen}
                onClose={() => { setIsDetailsOpen(false); setDetailsReceipt(null); }}
                receipt={detailsReceipt}
                onReverse={(receipt) => handleReverseRequest(null, receipt)}
            />

            <ConfirmReverseModal
                isOpen={Boolean(reverseCandidate)}
                onClose={() => setReverseCandidate(null)}
                onConfirm={handleConfirmReverse}
                receipt={reverseCandidate}
                isProcessing={isReversing}
            />

            <InboundInvoiceReceiptPickerModal
                isOpen={isInboundPickerOpen}
                onClose={() => setIsInboundPickerOpen(false)}
                onSelect={handleSelectInboundInvoice}
                supplierId={selectedSupplierId}
                supplierName={selectedSupplier?.fullName}
            />

            <PurchaseReceiptPickerModal
                isOpen={isPurchasePickerOpen}
                onClose={() => setIsPurchasePickerOpen(false)}
                onSelect={handleSelectPurchase}
                supplierId={selectedSupplierId}
                supplierName={selectedSupplier?.fullName}
            />
        </div>
    );
}
