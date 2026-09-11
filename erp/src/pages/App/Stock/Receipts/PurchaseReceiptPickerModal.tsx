import { useEffect, useState } from 'react';
import Purchase from '../../../types/purchase.type';
import Person from '../../../types/person.type';
import { subscribeToPurchases } from '../../../utils/purchaseService';
import { subscribeToPeople } from '../../../utils/personService';
import { formatCurrency } from '../../../utils/formatters';
import SupplierAutocomplete from '@/components/SupplierAutocomplete';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (purchase: Purchase) => void;
};

const ITEMS_PER_PAGE = 10;

export default function PurchaseReceiptPickerModal({ isOpen, onClose, onSelect }: Props) {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [suppliers, setSuppliers] = useState<Person[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);

    useEffect(() => {
        if (!isOpen) return;
        setSelectedSupplierId('');
        setCurrentPage(1);
        const unsubPurchases = subscribeToPurchases(setPurchases);
        const unsubPeople = subscribeToPeople('suppliers', (data) =>
            setSuppliers(data.filter((p) => !p.deleted && p.type === 'suppliers'))
        );
        return () => {
            unsubPurchases();
            unsubPeople();
        };
    }, [isOpen]);

    const handleSelectSupplier = (id: string) => {
        setSelectedSupplierId(id);
        setCurrentPage(1);
    };

    if (!isOpen) return null;

    const availablePurchases = purchases.filter((purchase) => {
        if (purchase.status === 'cancelled') return false;
        if (!selectedSupplierId) return false;
        return purchase.supplierId === selectedSupplierId;
    });

    const totalPages = Math.max(1, Math.ceil(availablePurchases.length / ITEMS_PER_PAGE));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const paginatedPurchases = availablePurchases.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE);

    return (
        <div className="fixed inset-0 z-[1000001] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <section className="max-h-[90vh] w-full max-w-3xl flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
                <header className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                            <i className="bi bi-cart-check mr-2 text-blue-600" />
                            Com pedido de compra
                        </h3>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                        <i className="bi bi-x-lg" />
                    </button>
                </header>

                <div className="m-5 space-y-4">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                        <i className="bi bi-exclamation-triangle-fill mr-2" />
                        Use o pedido como ponto de partida. Você pode conferir e ajustar a quantidade e valores conforme entregue pela fábrica.
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-955/40">
                        <SupplierAutocomplete
                            suppliers={suppliers}
                            selectedSupplierId={selectedSupplierId}
                            onSelect={handleSelectSupplier}
                            customLabel="Filtrar por Fornecedor"
                            placeholder="Selecione ou pesquise o fornecedor..."
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 pb-5">
                    {!selectedSupplierId ? (
                        <div className="py-12 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
                            <i className="bi bi-building text-3xl mb-2 block text-blue-500 dark:text-blue-400" />
                            Selecione um fornecedor para mostrar os pedidos de compra.
                        </div>
                    ) : availablePurchases.length === 0 ? (
                        <div className="py-12 text-center text-sm font-bold text-slate-400">
                            <i className="bi bi-inbox text-3xl mb-2 block text-slate-300 dark:text-slate-700" />
                            Nenhum pedido de compra encontrado para este fornecedor.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {paginatedPurchases.map((purchase) => (
                                <button
                                    key={purchase.id}
                                    type="button"
                                    onClick={() => {
                                        onSelect(purchase);
                                        onClose();
                                    }}
                                    className="flex w-full items-center justify-between rounded-2xl border border-slate-100 p-4 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/50 dark:border-slate-800 dark:hover:border-blue-900"
                                >
                                    <div>
                                        <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                                            Pedido #{purchase.purchaseNumber || purchase.id?.slice(-4)} · {purchase.supplierName}
                                        </p>
                                        <p className="mt-1 text-xs font-medium text-slate-500">
                                            {purchase.items.length} item(ns) · {new Date(purchase.date).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                    <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                                        {formatCurrency(purchase.totalValue)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {selectedSupplierId && totalPages > 1 && (
                    <footer className="flex items-center justify-between border-t border-slate-100 p-4 dark:border-slate-800 bg-slate-50 dark:bg-slate-955/30">
                        <span className="text-xs font-bold text-slate-500">
                            Página {safeCurrentPage} de {totalPages} ({availablePurchases.length} pedidos)
                        </span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={safeCurrentPage <= 1}
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                Anterior
                            </button>
                            <button
                                type="button"
                                disabled={safeCurrentPage >= totalPages}
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                Próxima
                            </button>
                        </div>
                    </footer>
                )}
            </section>
        </div>
    );
}
