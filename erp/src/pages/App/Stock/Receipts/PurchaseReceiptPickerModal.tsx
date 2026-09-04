import { useEffect, useState } from 'react';
import Purchase from '../../../types/purchase.type';
import { subscribeToPurchases } from '../../../utils/purchaseService';
import { formatCurrency } from '../../../utils/formatters';
import { normalizeSearchTerm } from '../../../utils/textUtils';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (purchase: Purchase) => void;
    supplierId?: string;
    supplierName?: string;
};

export default function PurchaseReceiptPickerModal({ isOpen, onClose, onSelect, supplierId, supplierName }: Props) {
    const [purchases, setPurchases] = useState<Purchase[]>([]);

    useEffect(() => (isOpen ? subscribeToPurchases(setPurchases) : undefined), [isOpen]);

    if (!isOpen) return null;

    // Filtra apenas os pedidos do fornecedor selecionado que não estejam cancelados
    const available = purchases.filter((purchase) => {
        if (purchase.status === 'cancelled') return false;
        if (supplierId && purchase.supplierId === supplierId) return true;
        if (supplierName && purchase.supplierName) {
            const sName = normalizeSearchTerm(supplierName);
            const pName = normalizeSearchTerm(purchase.supplierName);
            return pName.includes(sName) || sName.includes(pName);
        }
        return false;
    });

    return (
        <div className="fixed inset-0 z-[1000001] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <section className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
                <header className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                            <i className="bi bi-cart-check mr-2 text-blue-600" />
                            Utilizar pedido de compra
                        </h3>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                            Fornecedor: <span className="text-blue-600 dark:text-blue-400 font-black">{supplierName || 'Fornecedor selecionado'}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                        <i className="bi bi-x-lg" />
                    </button>
                </header>

                <div className="m-5 space-y-3">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                        <i className="bi bi-exclamation-triangle-fill mr-2" />
                        Use o pedido como ponto de partida. Você pode conferir e ajustar a quantidade e valores conforme entregue pela fábrica.
                    </div>
                </div>

                <div className="max-h-[48vh] overflow-y-auto px-5 pb-5">
                    <div className="space-y-2">
                        {available.map((purchase) => (
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
                        {!available.length && (
                            <div className="py-12 text-center text-sm font-bold text-slate-400">
                                <i className="bi bi-inbox text-3xl mb-2 block text-slate-300 dark:text-slate-700" />
                                Nenhum pedido de compra encontrado para {supplierName || 'este fornecedor'}.
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
