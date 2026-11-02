import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import StockLaunchModal from '../modals/StockLaunchModal';
import InventoryAuditModal from '../Inventory/modals/InventoryAuditModal';
import InventoryMovesHistory from '../Movements/components/InventoryMovesHistory';
import { InventoryAudit } from '../Inventory/InventoryAudit';
import type { InventoryAuditSession } from '../Inventory/types/inventoryAudit.types';
import InventoryAuditDetailsModal from '../Inventory/modals/InventoryAuditDetailsModal';
import PurchasesIndex from '../Purchases/Index';
import Product, { Variation } from '../../../types/product.type';
import Purchase from '../../../types/purchase.type';
import PurchaseStockEntryModal from '../Purchases/modals/PurchaseStockEntryModal';
import { useAuth } from '@/context/AuthContext';
import { canPerform } from '@/pages/utils/permissionService';

const STORAGE_KEY = 'morante_stock_selected_product_filter';

const StockPage = () => {
  const { profile } = useAuth();
  const canManageStock = canPerform('manualStockMovement', profile?.roles || profile?.role);

  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isAuditMenuOpen, setIsAuditMenuOpen] = useState(false);
  const auditMenuRef = useRef<HTMLDivElement>(null);
  const [selectedAudit, setSelectedAudit] = useState<InventoryAuditSession | null>(null);
  const [editingAuditSession, setEditingAuditSession] = useState<InventoryAuditSession | null>(
    null
  );

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed?.product || null;
      }
    } catch (err: unknown) {
      console.warn('Erro ao carregar produto selecionado do localStorage:', err);
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
    } catch (err: unknown) {
      console.warn('Erro ao carregar variação selecionada do localStorage:', err);
    }
    return undefined;
  });

  const [activeTab, setActiveTab] = useState<'history' | 'audit' | 'purchases'>(() => {
    const path = window.location.pathname;
    if (path.includes('/estoque/inventarios')) return 'audit';
    if (path.includes('/estoque/movimentacoes')) return 'history';
    const tabParam = searchParams.get('tab');
    if (tabParam === 'audit' || tabParam === 'purchases') {
      return tabParam;
    }
    return 'history';
  });
  const [purchaseForStockEntry, setPurchaseForStockEntry] = useState<Purchase | null>(null);

  useEffect(() => {
    if (!isAuditMenuOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !auditMenuRef.current?.contains(event.target)) {
        setIsAuditMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAuditMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isAuditMenuOpen]);

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
      console.error('Erro ao salvar produto no localStorage:', e);
    }
  };

  useEffect(() => {
    setIsAuditMenuOpen(false);
    if (location.pathname.includes('/estoque/inventarios')) {
      setActiveTab('audit');
    } else if (location.pathname.includes('/estoque/movimentacoes')) {
      setActiveTab('history');
    } else {
      const tab = searchParams.get('tab');
      if (tab && ['history', 'audit', 'purchases'].includes(tab)) {
        setActiveTab(tab as any);
      } else if (!tab || tab === 'balance') {
        setActiveTab('history');
      }
    }
  }, [location.pathname, searchParams]);

  useEffect(() => {
    const purchase = location.state?.purchaseForStockEntry as Purchase | undefined;
    if (!purchase) return;
    setActiveTab('history');
    setPurchaseForStockEntry(purchase);
    navigate(`${location.pathname}?tab=history`, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const handleOpenNewAudit = () => {
    setEditingAuditSession(null);
    setIsAuditModalOpen(true);
  };

  const handleOpenAuditSession = (session: InventoryAuditSession) => {
    if (session.status === 'in_progress' || session.status === 'pending') {
      setEditingAuditSession(session);
      setIsAuditModalOpen(true);
    } else {
      setSelectedAudit(session);
    }
  };

  return (
    <div className="animate-fade-in space-y-2">
      {/* Main Content Area */}
      <div className="flex flex-col min-w-0">
        {/* Header com ícone compacto, título e botão Novo (oculto em compras pois PurchasesIndex já tem header próprio) */}
        {activeTab !== 'purchases' && (
          <div className="flex flex-row justify-between items-center mb-1.5 gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
                <i
                  className={`bi ${activeTab === 'audit' ? 'bi-journal-check' : 'bi-arrow-left-right'} text-xs sm:text-sm`}
                ></i>
              </div>
              <h1 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight transition-colors">
                {activeTab === 'audit' ? 'Inventários' : 'Movimentações'}
              </h1>
            </div>

            {activeTab === 'audit' && canManageStock && (
              <div className="relative shrink-0" ref={auditMenuRef}>
                <button
                  type="button"
                  aria-label="Mais opções de inventário"
                  aria-haspopup="menu"
                  aria-expanded={isAuditMenuOpen}
                  aria-controls="inventory-header-menu"
                  title="Mais opções"
                  onClick={() => setIsAuditMenuOpen((open) => !open)}
                  className="flex h-9 w-9 items-center justify-center text-slate-600 transition hover:text-slate-900 focus:outline-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-slate-300 dark:hover:text-white"
                >
                  <i aria-hidden="true" className="bi bi-three-dots-vertical text-lg" />
                </button>
                {isAuditMenuOpen && (
                  <div
                    id="inventory-header-menu"
                    role="menu"
                    aria-label="Ações do inventário"
                    className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsAuditMenuOpen(false);
                        handleOpenNewAudit();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <i aria-hidden="true" className="bi bi-clipboard-check text-emerald-600 dark:text-emerald-400" />
                      <span>Novo inventário</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' ? (
          <InventoryMovesHistory
            selectedProduct={selectedProduct}
            selectedVariation={selectedVariation}
            onSelectProduct={handleSelectProduct}
          />
        ) : activeTab === 'audit' ? (
          <InventoryAudit onOpen={handleOpenAuditSession} />
        ) : (
          <PurchasesIndex />
        )}
      </div>

      {/* Modal de Novo Inventário */}
      <InventoryAuditModal
        isOpen={isAuditModalOpen}
        editingSession={editingAuditSession}
        onClose={() => {
          setIsAuditModalOpen(false);
          setEditingAuditSession(null);
        }}
      />

      <InventoryAuditDetailsModal session={selectedAudit} onClose={() => setSelectedAudit(null)} />

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
