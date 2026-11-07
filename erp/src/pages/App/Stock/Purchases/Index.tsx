import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import Purchase from '../../../types/purchase.type';
import Person from '../../../types/person.type';
import {
  cancelPurchase,
  deleteCancelledPurchase,
  discardPurchaseDraft,
  updatePurchase,
} from '../../../utils/purchaseService';
import { fetchPersons } from '../../../utils/personService';
import { toast } from 'react-toastify';
import { formatPurchaseNumber } from '../../../../../../shared-utils/purchaseNumber';
import PurchaseFormModal from './modals/PurchaseFormModal';
import PurchaseDetailsModal from './modals/PurchaseDetailsModal';
import PurchaseReceiptCheckModal from './modals/PurchaseReceiptCheckModal';
import PurchaseSupplierFilter from './components/PurchaseSupplierFilter';
import PurchaseTable from './components/PurchaseTable';
import { ERPListPagination } from '@/components/shared/ERPListPagination';
import { canPerform } from '@/pages/utils/permissionService';
import { fetchPurchaseById, PURCHASE_LIST_PAGE_SIZE } from '@/pages/utils/purchasePageService';
import { usePurchasesPage } from './hooks/usePurchasesPage';

type PurchaseConfirmation = {
  action: 'cancel' | 'delete' | 'discardDraft';
  purchase: Purchase;
} | null;

/**
 * Página principal do módulo de compras do estoque com filtragem por fornecedor e gerenciamento de status.
 */
export const PurchasesPage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [suppliers, setSuppliers] = useState<readonly Person[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [page, setPage] = useState(1);
  const { purchases, total, loading, error, reload } = usePurchasesPage(
    page, selectedSupplierId, profile?.id || '',
  );
  const [isOpeningPurchase, setIsOpeningPurchase] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [purchaseConfirmation, setPurchaseConfirmation] = useState<PurchaseConfirmation>(null);
  const [isConfirmingPurchaseAction, setIsConfirmingPurchaseAction] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPersons('suppliers').then((data) => setSuppliers(data || []));
  }, []);

  useEffect(() => {
    setSelectedPurchase((current) =>
      current ? purchases.find((purchase) => purchase.id === current.id) || current : null
    );
  }, [purchases]);

  useEffect(() => {
    const purchaseId = location.state?.purchaseIdToOpen as string | undefined;
    if (!purchaseId) return;
    let active = true;
    const controller = new AbortController();
    setIsOpeningPurchase(true);
    void fetchPurchaseById(purchaseId, controller.signal)
      .then((purchase) => {
        if (!active || controller.signal.aborted) return;
        if (purchase) {
          setSelectedPurchase(purchase);
          setIsDetailsModalOpen(true);
        } else {
          toast.error('Este pedido de compra não foi encontrado.');
        }
        setIsOpeningPurchase(false);
        navigate('/estoque/inventarios?tab=purchases', { replace: true, state: null });
      })
      .catch(() => {
        if (!active || controller.signal.aborted) return;
        setIsOpeningPurchase(false);
        toast.error('Não foi possível abrir o pedido de compra. Tente novamente.');
        navigate('/estoque/inventarios?tab=purchases', { replace: true, state: null });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [location.state, navigate]);

  useEffect(() => {
    if (!purchaseConfirmation || isConfirmingPurchaseAction) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPurchaseConfirmation(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [purchaseConfirmation, isConfirmingPurchaseAction]);

  useEffect(() => {
    if (!isHeaderMenuOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!headerMenuRef.current?.contains(event.target as Node)) setIsHeaderMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsHeaderMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isHeaderMenuOpen]);

  const canEditPurchase = (purchase: Purchase) =>
    ['pending', 'ordered'].includes(purchase.status) && !purchase.stockProcessed;

  const handleEditPurchase = (purchase: Purchase) => {
    if (!canEditPurchase(purchase)) return;
    setSelectedPurchase(purchase);
    setIsDetailsModalOpen(false);
    setIsModalOpen(true);
  };

  const handleStatusChange = async (purchase: Purchase, status: Purchase['status']) => {
    if (!purchase.id || status === 'draft' || status === purchase.status) return;
    if (status === 'pending' && purchase.status !== 'ordered') return;
    if (status === 'cancelled') {
      setPurchaseConfirmation({ action: 'cancel', purchase });
      return;
    }
    try {
      await updatePurchase(purchase.id, { status });
      const statusName = status === 'fulfilled'
        ? 'Atendido'
        : status === 'pending'
          ? 'Pendente'
          : 'Em ordem';
      toast.success(`Status alterado para ${statusName}.`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao alterar status.';
      toast.error(message);
    }
  };

  const handleDeletePurchase = async (purchase: Purchase) => {
    if (purchase.status !== 'cancelled' || !canPerform('deleteStockPurchases', profile?.roles || profile?.role)) return;
    setPurchaseConfirmation({ action: 'delete', purchase });
  };

  const handleDiscardDraft = (purchase: Purchase) => {
    if (purchase.status !== 'draft' || !canPerform('deleteStockPurchases', profile?.roles || profile?.role)) return;
    setPurchaseConfirmation({ action: 'discardDraft', purchase });
  };

  const handleConfirmPurchaseAction = async () => {
    if (!purchaseConfirmation || isConfirmingPurchaseAction) return;
    const confirmation = purchaseConfirmation;
    setIsConfirmingPurchaseAction(true);
    try {
      if (confirmation.action === 'discardDraft') {
        await discardPurchaseDraft(confirmation.purchase);
        toast.success('Rascunho descartado.');
      } else if (confirmation.action === 'delete') {
        await deleteCancelledPurchase(confirmation.purchase);
        toast.success('Pedido de compra apagado.');
      } else {
        await cancelPurchase(confirmation.purchase);
        toast.success('Pedido de compra cancelado.');
      }
    } catch (error) {
      const fallbackMessage = confirmation.action === 'discardDraft'
        ? 'Não foi possível descartar o rascunho.'
        : confirmation.action === 'delete'
          ? 'Não foi possível apagar o pedido.'
          : 'Não foi possível cancelar o pedido.';
      toast.error(error instanceof Error ? error.message : fallbackMessage);
    } finally {
      setIsConfirmingPurchaseAction(false);
      setPurchaseConfirmation(null);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="relative z-30 mb-3 flex items-center justify-between gap-2 sm:mb-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md sm:h-10 sm:w-10">
              <i className="bi bi-truck" aria-hidden="true" />
            </div>
            <h1 className="min-w-0 text-lg font-black leading-tight tracking-tight text-slate-800 dark:text-slate-100 sm:text-xl md:text-2xl">
              Pedidos de Compra
            </h1>
          </div>
          <div ref={headerMenuRef} className="relative shrink-0">
            <button
              type="button"
              aria-label="Mais ações de pedidos de compra"
              aria-haspopup="menu"
              aria-expanded={isHeaderMenuOpen}
              aria-controls="purchase-header-actions"
              onClick={() => setIsHeaderMenuOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <i className="bi bi-three-dots-vertical text-lg" aria-hidden="true" />
            </button>
            {isHeaderMenuOpen && (
              <div
                id="purchase-header-actions"
                role="menu"
                aria-label="Ações de pedidos de compra"
                className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-slate-100 bg-white py-1.5 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    setSelectedPurchase(null);
                    setIsModalOpen(true);
                  }}
                  className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <i className="bi bi-plus-lg text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  Novo pedido
                </button>
              </div>
            )}
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:rounded-3xl">
          <div className="flex flex-col gap-3 border-b border-slate-50 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:gap-4 sm:p-4 md:flex-row md:items-center lg:p-6">
            <PurchaseSupplierFilter
              suppliers={suppliers}
              selectedSupplierId={selectedSupplierId}
              onSelect={(supplierId) => {
                setSelectedSupplierId(supplierId);
                setPage(1);
              }}
            />
          </div>

          {isOpeningPurchase && (
            <div role="status" className="px-4 py-3 text-sm text-blue-600">Abrindo pedido de compra...</div>
          )}
          {error && (
            <div role="alert" className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-rose-600">
              <span>{error}{purchases.length > 0 && ' Os resultados exibidos são da última atualização concluída.'}</span>
              <button type="button" onClick={reload} className="shrink-0 font-bold underline">Tentar novamente</button>
            </div>
          )}
          <PurchaseTable
            purchases={purchases}
            onOpen={(purchase) => {
              setSelectedPurchase(purchase);
              setIsDetailsModalOpen(true);
            }}
            onEdit={handleEditPurchase}
            onResumeDraft={(purchase) => {
              setSelectedPurchase(purchase);
              setIsDetailsModalOpen(false);
              setIsModalOpen(true);
            }}
            canDiscardDrafts={canPerform('deleteStockPurchases', profile?.roles || profile?.role)}
            onDiscardDraft={handleDiscardDraft}
            onChangeStatus={handleStatusChange}
            canDeleteCancelled={canPerform('deleteStockPurchases', profile?.roles || profile?.role)}
            onDelete={handleDeletePurchase}
          />

          {loading && (
            <div className="p-8 text-center text-xs font-black uppercase tracking-widest text-slate-400 sm:p-12 lg:p-20">
              Carregando compras...
            </div>
          )}
          {!loading && !error && !purchases.length && (
            <div className="p-8 text-center text-lg font-black text-slate-400 sm:p-12 sm:text-xl lg:p-20">
              {selectedSupplierId
                ? 'Nenhum pedido para este fornecedor'
                : 'Nenhum pedido de compra cadastrado'}
            </div>
          )}
          <ERPListPagination
            ariaLabel="Paginação de pedidos de compra"
            page={page}
            pageSize={PURCHASE_LIST_PAGE_SIZE}
            fixedPageSize={PURCHASE_LIST_PAGE_SIZE}
            totalItems={total}
            onPageChange={setPage}
            itemLabel="pedidos de compra"
            loading={loading}
            className="px-4 py-3"
          />
        </section>
      </div>

      <PurchaseDetailsModal
        isOpen={isDetailsModalOpen}
        purchase={selectedPurchase}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedPurchase(null);
        }}
        onEdit={handleEditPurchase}
        onCheckReceipt={(purchase) => {
          setSelectedPurchase(purchase);
          setIsDetailsModalOpen(false);
          setIsCheckModalOpen(true);
        }}
      />

      <PurchaseReceiptCheckModal
        isOpen={isCheckModalOpen}
        purchase={selectedPurchase}
        onClose={() => {
          setIsCheckModalOpen(false);
          setSelectedPurchase(null);
        }}
      />

      <PurchaseFormModal
        isOpen={isModalOpen}
        purchase={selectedPurchase}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPurchase(null);
        }}
      />

      {purchaseConfirmation && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="purchase-confirmation-title"
          aria-describedby="purchase-confirmation-description"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-slate-950/60 backdrop-blur-sm"
            aria-label="Fechar confirmação"
            disabled={isConfirmingPurchaseAction}
            onClick={() => setPurchaseConfirmation(null)}
          />
          <div className="relative w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${purchaseConfirmation.action !== 'cancel' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'}`}>
              <i className={`bi ${purchaseConfirmation.action !== 'cancel' ? 'bi-trash3' : 'bi-exclamation-triangle'} text-xl`} aria-hidden="true" />
            </div>
            <h2 id="purchase-confirmation-title" className="mt-4 text-lg font-black tracking-tight text-slate-800 dark:text-white">
              {purchaseConfirmation.action === 'discardDraft'
                ? 'Descartar rascunho?'
                : purchaseConfirmation.action === 'delete'
                  ? 'Apagar pedido cancelado?'
                  : 'Cancelar pedido de compra?'}
            </h2>
            <p id="purchase-confirmation-description" className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {purchaseConfirmation.action === 'discardDraft'
                ? `O rascunho #${formatPurchaseNumber(purchaseConfirmation.purchase.purchaseNumber) || purchaseConfirmation.purchase.id?.slice(-4) || '—'} será apagado.`
                : purchaseConfirmation.action === 'delete'
                  ? `O pedido #${formatPurchaseNumber(purchaseConfirmation.purchase.purchaseNumber) || purchaseConfirmation.purchase.id?.slice(-4) || '—'} será apagado. Os recebimentos já registrados serão preservados e deixarão de apontar para este pedido.`
                  : `O pedido #${formatPurchaseNumber(purchaseConfirmation.purchase.purchaseNumber) || purchaseConfirmation.purchase.id?.slice(-4) || '—'} será marcado como cancelado.`}
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPurchaseConfirmation(null)}
                disabled={isConfirmingPurchaseAction}
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmPurchaseAction}
                disabled={isConfirmingPurchaseAction}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black text-white shadow-md transition-colors disabled:cursor-wait disabled:opacity-60 ${purchaseConfirmation.action !== 'cancel' ? 'bg-rose-600 shadow-rose-500/20 hover:bg-rose-700' : 'bg-amber-600 shadow-amber-500/20 hover:bg-amber-700'}`}
              >
                {isConfirmingPurchaseAction ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Processando...
                  </>
                ) : purchaseConfirmation.action === 'discardDraft'
                  ? 'Descartar rascunho'
                  : purchaseConfirmation.action === 'delete'
                    ? 'Apagar pedido'
                    : 'Confirmar cancelamento'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PurchasesPage;
