import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import StockLaunchModal from "./components/StockLaunchModal";
import InventoryMovesHistory from "./components/InventoryMovesHistory";
import InventoryAudit from "./components/InventoryAudit";
import PurchasesIndex from "./Purchases/Index";
import Product, { Variation } from "../../types/product.type";
import QRScannerModal from "@/components/shared/QRScannerModal";
import { toast } from "react-toastify";
import { getProductByCode } from "@/pages/utils/productService";
import Purchase from '../../types/purchase.type';
import PurchaseStockEntryModal from './components/PurchaseStockEntryModal';

const StockPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedVariation, setSelectedVariation] = useState<Variation | undefined>(undefined);
    const [activeTab, setActiveTab] = useState<'history' | 'audit' | 'purchases'>(
        (searchParams.get('tab') as any) || 'history'
    );
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [purchaseForStockEntry, setPurchaseForStockEntry] = useState<Purchase | null>(null);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && ['history', 'audit', 'purchases'].includes(tab)) {
            setActiveTab(tab as any);
        } else if (!tab || tab === 'balance') {
            setActiveTab('history');
        }
    }, [searchParams]);

    useEffect(() => {
        const purchase = location.state?.purchaseForStockEntry as Purchase | undefined;
        if (!purchase) return;
        setActiveTab('history');
        setPurchaseForStockEntry(purchase);
        navigate(`${location.pathname}?tab=history`, { replace: true, state: null });
    }, [location.pathname, location.state, navigate]);

    const handleLaunch = (product?: Product, variation?: Variation) => {
        setSelectedProduct(product || null);
        setSelectedVariation(variation);
        setIsLaunchModalOpen(true);
    };

    return (
        <div className="animate-fade-in space-y-3">
            {/* Main Content Area */}
            <div className="flex flex-col min-w-0">
                {/* Header com ícone, título e botão + Nova */}
                <div className="flex flex-row justify-between items-center mb-3 gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200/50 dark:shadow-none shrink-0">
                            <i className="bi bi-arrow-left-right text-xl sm:text-2xl"></i>
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl xl:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight transition-colors">
                                Movimentações
                            </h1>
                            <p className="text-slate-400 dark:text-slate-500 font-medium text-xs hidden sm:block">
                                Histórico de entradas, saídas e ajustes de estoque
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => handleLaunch()}
                            className="flex items-center justify-center gap-1.5 sm:gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-black uppercase tracking-wider text-xs shadow-md shadow-emerald-200/50 dark:shadow-none transition-all active:scale-95"
                            title="Lançar Nova Movimentação de Estoque"
                        >
                            <i className="bi bi-plus-lg text-sm" />
                            <span>Nova</span>
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden transition-all">
                    {activeTab === 'history' ? (
                        <InventoryMovesHistory />
                    ) : activeTab === 'audit' ? (
                        <InventoryAudit />
                    ) : (
                        <PurchasesIndex />
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
            <PurchaseStockEntryModal
                purchase={purchaseForStockEntry}
                isOpen={Boolean(purchaseForStockEntry)}
                onClose={() => setPurchaseForStockEntry(null)}
            />
            {isScannerOpen && (
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
            )}
        </div>
    );
};

export default StockPage;
