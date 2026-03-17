import React, { useState } from "react";
import { Link } from "react-router-dom";
import StockList from "./components/StockList";
import StockLaunchModal from "./components/StockLaunchModal";
import InventoryMovesHistory from "./components/InventoryMovesHistory";
import InventoryAudit from "./components/InventoryAudit";
import Product, { Variation } from "../../types/product.type";
import QRScannerModal from "@/components/shared/QRScannerModal";
import { toast } from "react-toastify";
import { getProductByCode } from "@/pages/utils/productService";

const StockPage = () => {
    const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedVariation, setSelectedVariation] = useState<Variation | undefined>(undefined);
    const [activeTab, setActiveTab] = useState<'balance' | 'history' | 'audit'>('balance');
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    const handleLaunch = (product?: Product, variation?: Variation) => {
        setSelectedProduct(product || null);
        setSelectedVariation(variation);
        setIsLaunchModalOpen(true);
    };

    return (
        <div className="animate-slide-up space-y-8">
            {/* Main Content Area */}
            <div className="flex flex-col min-w-0">
                <div className="flex flex-col xl:flex-row justify-between xl:items-center mb-6 md:mb-10 gap-6">
                    <div className="flex items-start xl:items-center gap-4 xl:gap-6">
                        <div className="w-12 h-12 xl:w-16 xl:h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-xl shadow-emerald-200 dark:shadow-none">
                            <i className="bi bi-box-seam-fill text-2xl xl:text-3xl"></i>
                        </div>
                        <div>
                            <h1 className="text-2xl xl:text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight transition-colors">
                                Gestão de Estoque
                            </h1>
                            <div className="flex items-center gap-4 mt-2">
                                <button
                                    onClick={() => setActiveTab('balance')}
                                    className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all pb-1 border-b-2 ${activeTab === 'balance' ? 'text-emerald-600 border-emerald-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                                >
                                    Saldo Atual
                                </button>
                                <button
                                    onClick={() => setActiveTab('history')}
                                    className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all pb-1 border-b-2 ${activeTab === 'history' ? 'text-emerald-600 border-emerald-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                                >
                                    Movimentações
                                </button>
                                <button
                                    onClick={() => setActiveTab('audit')}
                                    className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all pb-1 border-b-2 ${activeTab === 'audit' ? 'text-emerald-600 border-emerald-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                                >
                                    Inventário
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <Link
                            to="/stock/label-printing"
                            className="flex items-center justify-center gap-2 xl:gap-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-3 xl:px-8 xl:py-4 rounded-xl font-black uppercase tracking-widest text-xs border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 transition-all active:scale-95 w-full sm:w-auto"
                        >
                            <i className="bi bi-printer-fill" />
                            Etiquetas
                        </Link>
                        
                        <button
                            onClick={() => handleLaunch()}
                            className="flex items-center justify-center gap-2 xl:gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 xl:px-8 xl:py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-200 dark:shadow-none transition-all active:scale-95 w-full sm:w-auto"
                        >
                            <i className="bi bi-lightning-charge-fill text-sm xl:text-base" />
                            Nova Movimentação de Estoque
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden transition-all">
                    {activeTab === 'balance' ? (
                        <StockList onLaunch={handleLaunch} />
                    ) : activeTab === 'history' ? (
                        <InventoryMovesHistory />
                    ) : (
                        <InventoryAudit />
                    )}
                </div>
            </div>

            {/* Launch Modal */}
            <StockLaunchModal
                isOpen={isLaunchModalOpen}
                onClose={() => {
                    setIsLaunchModalOpen(false);
                    setSelectedProduct(null);
                    setSelectedVariation(undefined);
                }}
                targetProduct={selectedProduct}
                targetVariation={selectedVariation}
            />
            {/* Scanner Modal */}
            <QRScannerModal 
                isOpen={isScannerOpen} 
                onClose={() => setIsScannerOpen(false)} 
                onScan={async (code) => {
                    const result = await getProductByCode(code);
                    if (result) {
                        toast.success(`Produto localizado: ${result.product.description}`);
                        handleLaunch(result.product, result.variation);
                        setIsScannerOpen(false);
                    } else {
                        toast.error(`Produto com código "${code}" não encontrado.`);
                    }
                }}
                title="Escanear Inventário"
            />
        </div>
    );
};

export default StockPage;
