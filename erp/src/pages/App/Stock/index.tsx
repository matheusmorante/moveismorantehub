import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import StockLaunchModal from "./components/StockLaunchModal";
import InventoryAuditModal from "./components/InventoryAuditModal";
import InventoryMovesHistory from "./components/InventoryMovesHistory";
import InventoryAudit from "./components/InventoryAudit";
import PurchasesIndex from "./Purchases/Index";
import Product, { Variation } from "../../types/product.type";
import Purchase from '../../types/purchase.type';
import PurchaseStockEntryModal from './components/PurchaseStockEntryModal';

const STORAGE_KEY = 'morante_stock_selected_product_filter';

const StockPage = () => {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
    
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed?.product || null;
            }
        } catch (e) {
            console.error("Erro ao carregar produto selecionado do localStorage:", e);
        }
        return null;
    });

    const [selectedVariation, setSelectedVariation] = useState<Variation | undefined>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed?.variation || undefined;
            }
        } catch (e) {
            console.error("Erro ao carregar variação selecionada do localStorage:", e);
        }
        return undefined;
    });

    const [activeTab, setActiveTab] = useState<'history' | 'audit' | 'purchases'>(
        (searchParams.get('tab') as any) || 'history'
    );
    const [purchaseForStockEntry, setPurchaseForStockEntry] = useState<Purchase | null>(null);

    const handleSelectProduct = (prod: Product | null, v?: Variation) => {
        setSelectedProduct(prod);
        setSelectedVariation(v);
        try {
            if (prod) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ product: prod, variation: v }));
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch (e) {
            console.error("Erro ao salvar produto no localStorage:", e);
        }
    };

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

    const handleOpenNewAudit = () => {
        setIsAuditModalOpen(true);
    };

    return (
        <div className="animate-fade-in space-y-2">
            {/* Main Content Area */}
            <div className="flex flex-col min-w-0">
                {/* Header com ícone compacto, título e botão Novo */}
                <div className="flex flex-row justify-between items-center mb-1.5 gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
                            <i className="bi bi-journal-check text-xs sm:text-sm"></i>
                        </div>
                        <h1 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight transition-colors">
                            Inventário
                        </h1>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={handleOpenNewAudit}
                            className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-lg font-black uppercase tracking-wider text-[11px] sm:text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                            title="Abrir novo inventário de estoque"
                        >
                            <i className="bi bi-plus-lg text-xs" />
                            <span>Novo</span>
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden transition-all">
                    {activeTab === 'history' ? (
                        <InventoryMovesHistory 
                            selectedProduct={selectedProduct}
                            selectedVariation={selectedVariation}
                            onSelectProduct={handleSelectProduct}
                        />
                    ) : activeTab === 'audit' ? (
                        <InventoryAudit />
                    ) : (
                        <PurchasesIndex />
                    )}
                </div>
            </div>

            {/* Modal de Novo Inventário */}
            <InventoryAuditModal
                isOpen={isAuditModalOpen}
                onClose={() => setIsAuditModalOpen(false)}
            />

            {/* Launch Modal de Movimentação Individual */}
            <StockLaunchModal
                isOpen={isLaunchModalOpen}
                onClose={() => setIsLaunchModalOpen(false)}
                targetProduct={selectedProduct}
                targetVariation={selectedVariation}
            />

            {/* Modal de Entrada de Compras */}
            <PurchaseStockEntryModal
                purchase={purchaseForStockEntry}
                isOpen={Boolean(purchaseForStockEntry)}
                onClose={() => setPurchaseForStockEntry(null)}
            />
        </div>
    );
};

export default StockPage;
