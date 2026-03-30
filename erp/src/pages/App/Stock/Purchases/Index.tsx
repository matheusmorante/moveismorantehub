import React, { useState, useEffect } from "react";
import Purchase from "../../../types/purchase.type";
import { subscribeToPurchases } from "../../../utils/purchaseService";
import PurchaseFormModal from "./PurchaseFormModal";
import { formatCurrency, formatToBRDate } from "../../../utils/formatters";
import { toast } from "react-toastify";
import PurchaseReceiptCheckModal from "./components/PurchaseReceiptCheckModal";

const PurchasesPage = () => {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

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
                <div className="flex flex-col xl:flex-row justify-between xl:items-center mb-6 md:mb-10 gap-6">
                    <div className="flex items-start xl:items-center gap-4 xl:gap-6">
                        <div className="w-12 h-12 xl:w-16 xl:h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-200 dark:shadow-none">
                            <i className="bi bi-truck text-2xl xl:text-3xl"></i>
                        </div>
                        <div>
                            <h1 className="text-2xl xl:text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight transition-colors">
                                Pedidos de Compra
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm xl:text-lg hidden sm:block">
                                Gerencie a entrada de mercadorias e custos
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center justify-center gap-2 xl:gap-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 xl:px-8 xl:py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-200 dark:shadow-none transition-all active:scale-95 w-full sm:w-auto"
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
                                    <tr key={purchase.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
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
                                            <div className="flex flex-col items-center gap-2">
                                                <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                    purchase.status === 'completed' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20' : 
                                                    purchase.status === 'pending' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/20' : 
                                                    'bg-slate-100 text-slate-600 dark:bg-slate-800'
                                                }`}>
                                                    {purchase.status === 'completed' ? 'Finalizado' : 'Pendente'}
                                                </span>
                                                {purchase.invoiceNumber && (
                                                    <span className={`text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md border ${
                                                        purchase.invoiceStatus === 'received' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        purchase.invoiceStatus === 'partially_received' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                        'bg-slate-50 text-slate-400 border-slate-200'
                                                    }`}>
                                                        NF: {purchase.invoiceNumber}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right font-black text-slate-700 dark:text-slate-200">
                                            {formatCurrency(purchase.totalValue)}
                                        </td>
                                        <td className="px-8 py-5 text-right flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => {
                                                    setSelectedPurchase(purchase);
                                                    setIsScannerOpen(true);
                                                }}
                                                className="p-2 text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                title="Conferir Recebimento"
                                            >
                                                <i className="bi bi-qr-code-scan"></i>
                                                <span className="text-[10px] font-black uppercase tracking-widest hidden xl:inline">Conferir</span>
                                            </button>
                                            <button className="p-2 text-slate-300 hover:text-blue-600 transition-colors">
                                                <i className="bi bi-eye"></i>
                                            </button>
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

            <PurchaseFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

            <PurchaseReceiptCheckModal 
                isOpen={isScannerOpen} 
                purchase={selectedPurchase}
                onClose={() => {
                    setIsScannerOpen(false);
                    setSelectedPurchase(null);
                }} 
            />
        </div>
    );
};

export default PurchasesPage;
