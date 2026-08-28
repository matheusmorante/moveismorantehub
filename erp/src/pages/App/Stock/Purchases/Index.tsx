import React, { useState, useEffect } from "react";
import Purchase from "../../../types/purchase.type";
import { subscribeToPurchases, toggleStockProcessing, cancelPurchase } from "../../../utils/purchaseService";
import PurchaseFormModal from "./PurchaseFormModal";
import { formatCurrency, formatToBRDate } from "../../../utils/formatters";
import { toast } from "react-toastify";

const getPurchaseStatusBadge = (status?: string) => {
    switch (status) {
        case 'fulfilled':
            return {
                label: 'Atendido',
                bg: 'bg-emerald-50 dark:bg-emerald-900/20',
                text: 'text-emerald-700 dark:text-emerald-400',
                border: 'border-emerald-200 dark:border-emerald-900/30',
                dot: 'bg-emerald-500'
            };
        case 'ordered':
            return {
                label: 'Em Ordem',
                bg: 'bg-blue-50 dark:bg-blue-900/20',
                text: 'text-blue-700 dark:text-blue-400',
                border: 'border-blue-200 dark:border-blue-900/30',
                dot: 'bg-blue-500'
            };
        case 'opened':
        case 'draft':
            return {
                label: 'Em Aberto',
                bg: 'bg-slate-100 dark:bg-slate-800/80',
                text: 'text-slate-600 dark:text-slate-300',
                border: 'border-slate-200 dark:border-slate-700',
                dot: 'bg-slate-400'
            };
        case 'cancelled':
        default:
            return {
                label: 'Cancelado',
                bg: 'bg-rose-50 dark:bg-rose-900/20',
                text: 'text-rose-700 dark:text-rose-400',
                border: 'border-rose-200 dark:border-rose-900/30',
                dot: 'bg-rose-500'
            };
    }
};

const PurchasesPage = () => {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeToPurchases((data: Purchase[]) => {
            setPurchases(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const filtered = purchases.filter(p => 
        p.supplierName.toLowerCase().includes(search.toLowerCase()) || 
        p.id?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col">
            <div className="flex-1 flex flex-col min-w-0 p-4 md:p-8">
                <div className="flex flex-row justify-between items-center mb-6 md:mb-10 gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 xl:gap-6">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 xl:w-16 xl:h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-200 dark:shadow-none shrink-0">
                            <i className="bi bi-truck text-xl sm:text-2xl xl:text-3xl"></i>
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl xl:text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight transition-colors">
                                Pedidos de Compra
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm xl:text-lg hidden sm:block">
                                Gerencie a entrada de mercadorias e custos
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 shrink-0">
                        <button
                            onClick={() => {
                                setEditingPurchase(null);
                                setIsModalOpen(true);
                            }}
                            className="flex items-center justify-center gap-2 xl:gap-3 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2.5 sm:px-4 sm:py-3 xl:px-8 xl:py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-200 dark:shadow-none transition-all active:scale-95 whitespace-nowrap"
                        >
                            <i className="bi bi-plus-lg text-sm xl:text-base" />
                            Nova Compra
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden transition-all">
                    <div className="p-6 border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            <input 
                                type="text" 
                                placeholder="Buscar por fornecedor ou ID..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-slate-200"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-950/20">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800">Cód.</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800">Data</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800">Fornecedor</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800 text-center">NF / Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800 text-right">Total</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {filtered.map((purchase) => (
                                    <tr 
                                        key={purchase.id} 
                                        onClick={() => {
                                            setEditingPurchase(purchase);
                                            setIsModalOpen(true);
                                        }}
                                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer"
                                    >
                                        <td className="px-8 py-5 text-xs font-mono font-bold text-slate-400">
                                            #{purchase.id?.slice(-4)}
                                        </td>
                                        <td className="px-8 py-5 text-xs font-medium text-slate-500 whitespace-nowrap">
                                            {formatToBRDate(purchase.date)}
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="block font-bold text-slate-700 dark:text-slate-200">{purchase.supplierName}</span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{purchase.items.length} itens</span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            {(() => {
                                                const statusInfo = getPurchaseStatusBadge(purchase.status);
                                                return (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                                                            {statusInfo.label}
                                                        </span>
                                                        {purchase.invoiceNumber && (
                                                            <span className={`text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md border ${
                                                                purchase.invoiceStatus === 'received' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800' :
                                                                purchase.invoiceStatus === 'partially_received' ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800' :
                                                                'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                                                            }`}>
                                                                NF: {purchase.invoiceNumber}
                                                            </span>
                                                        )}
                                                        {purchase.stockProcessed && (
                                                            <span className="flex items-center gap-1 text-[8px] font-black uppercase text-emerald-600">
                                                                <i className="bi bi-box-fill"></i> ESTOQUE LANÇADO
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-8 py-5 text-right font-black text-slate-700 dark:text-slate-200">
                                            {formatCurrency(purchase.totalValue)}
                                        </td>
                                        <td 
                                            className="px-8 py-5 text-right flex items-center justify-end gap-2"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {purchase.status !== 'cancelled' ? (
                                                <>
                                                    <button 
                                                        onClick={async () => {
                                                            const confirmMsg = purchase.stockProcessed 
                                                                ? `Deseja realmente estornar a entrada de estoque do pedido #${purchase.id?.slice(-4)}?\n\nOs lançamentos de entrada serão removidos e o saldo de estoque dos produtos será revertido.` 
                                                                : `Deseja lançar a entrada de estoque do pedido #${purchase.id?.slice(-4)} agora?`;
                                                            
                                                            if (window.confirm(confirmMsg)) {
                                                                try {
                                                                    await toggleStockProcessing(purchase);
                                                                    toast.success(purchase.stockProcessed ? "Estorno de entrada realizado com sucesso!" : "Estoque lançado com sucesso!");
                                                                } catch (e: any) {
                                                                    toast.error(e.message || "Erro ao processar estoque.");
                                                                }
                                                            }
                                                        }}
                                                        className={`p-2 transition-colors flex items-center gap-1.5 rounded-lg ${
                                                            purchase.stockProcessed 
                                                                ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100' 
                                                                : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100'
                                                        }`}
                                                        title={purchase.stockProcessed ? "Estornar Entrada de Estoque" : "Lançar Entrada no Estoque"}
                                                    >
                                                        <i className={`bi ${purchase.stockProcessed ? 'bi-arrow-counterclockwise' : 'bi-box-arrow-in-down'}`}></i>
                                                        <span className="text-[10px] font-black uppercase tracking-widest hidden xl:inline">
                                                            {purchase.stockProcessed ? 'Estornar Entrada' : 'Lançar Estoque'}
                                                        </span>
                                                    </button>
                                                    <button 
                                                        onClick={async () => {
                                                            if (purchase.stockProcessed) {
                                                                toast.warning("Não é possível cancelar este pedido pois a entrada de estoque está lançada. Clique em 'Estornar Entrada' primeiro.", {
                                                                    autoClose: 5000
                                                                });
                                                                return;
                                                            }

                                                            const confirmMsg = `Deseja realmente cancelar o Pedido de Compra #${purchase.id?.slice(-4)}?\n\nEsta ação marcará o pedido como Cancelado.`;
                                                            if (window.confirm(confirmMsg)) {
                                                                try {
                                                                    await cancelPurchase(purchase);
                                                                    toast.success("Pedido de compra cancelado com sucesso!");
                                                                } catch (e: any) {
                                                                    toast.error(e.message || "Erro ao cancelar pedido.");
                                                                }
                                                            }
                                                        }}
                                                        className="p-2 text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1.5"
                                                        title="Cancelar Pedido"
                                                    >
                                                        <i className="bi bi-x-circle"></i>
                                                        <span className="text-[10px] font-black uppercase tracking-widest hidden xl:inline">Cancelar</span>
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="text-[10px] font-black uppercase tracking-wider text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                                    <i className="bi bi-x-circle-fill"></i> Pedido Cancelado
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {loading && (
                        <div className="p-20 flex flex-col items-center justify-center">
                            <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando Compras...</p>
                        </div>
                    )}

                    {filtered.length === 0 && !loading && (
                        <div className="p-20 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-[2rem] flex items-center justify-center text-slate-200 dark:text-slate-800 mb-6">
                                <i className="bi bi-truck text-4xl"></i>
                            </div>
                            <h4 className="text-xl font-black text-slate-400">Nenhum pedido de compra</h4>
                        </div>
                    )}
                </div>
            </div>

            <PurchaseFormModal 
                isOpen={isModalOpen} 
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingPurchase(null);
                }} 
                initialPurchase={editingPurchase}
            />
        </div>
    );
};

export default PurchasesPage;
