import React, { useState, useMemo, useRef, useEffect } from 'react';
import type Product from '@/pages/types/product.type';
import type { Variation } from '@/pages/types/product.type';
import type { AuditItem } from '../types/inventoryAudit.types';
import { InventoryOperationHeader } from './InventoryOperationHeader';
import { InventoryManualMode } from './InventoryManualMode';
import { InventoryStagesView } from './InventoryStagesView';
import { playInventoryCountBeep, prepareInventoryAudio } from './inventoryScanAudio';
import type { InventoryScopeType } from '../types/inventoryScope.types';
import QRScannerModal from '@/components/shared/QRScannerModal';
import ConfirmModal from '@/components/shared/ConfirmModal';
import { matchScannedProductItem } from '@/pages/utils/barcodeScannerUtils';
import { getPhysicalInventoryScanId } from '../services/inventoryScanRules';
import {
  ensureOfflineInventoryCatalogSynced,
  findOfflineInventoryMatch,
} from '../services/offlineInventoryCatalog';
import type { OfflineInventoryMatch } from '../types/offlineInventoryCatalog.types';
import { sumInventoryCountedQuantities } from '../../../../../../../shared-utils/inventorySupplierStages';

const SCAN_ERROR_FEEDBACK_COOLDOWN_MS = 10_000;

interface InventoryOperationScreenProps {
  readonly items: AuditItem[];
  readonly hasStages?: boolean;
  readonly inventoryName: string;
  readonly scopeType?: InventoryScopeType | null;
  readonly onUpdateCount: (id: string, count: number | null) => void;
  readonly onIncrementScannedItem: (id: string, labelId?: string) => Promise<number | null>;
  readonly onStartSupplierStage: (supplierName: string) => Promise<void>;
  readonly onResetSupplierStage?: (supplierName: string) => Promise<void>;
  readonly onDiscardInventory?: () => Promise<boolean>;
  readonly onAddManualItem: () => void;
  readonly onUpdateItemProduct?: (itemId: string, product: Product, variation?: Variation) => void;
  readonly onReview: () => void;
  readonly onClose?: () => void;
}

export const InventoryOperationScreen: React.FC<InventoryOperationScreenProps> = ({
  items,
  hasStages,
  inventoryName,
  scopeType,
  onUpdateCount,
  onIncrementScannedItem,
  onStartSupplierStage,
  onResetSupplierStage,
  onDiscardInventory,
  onAddManualItem,
  onUpdateItemProduct,
  onReview,
  onClose,
}) => {
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isScanProcessing, setIsScanProcessing] = useState(false);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [isStageMenuOpen, setIsStageMenuOpen] = useState(false);
  const [isCancelStageConfirmOpen, setIsCancelStageConfirmOpen] = useState(false);
  const [isCancellingStage, setIsCancellingStage] = useState(false);
  const [isCancelInventoryConfirmOpen, setIsCancelInventoryConfirmOpen] = useState(false);
  const [isCancellingInventory, setIsCancellingInventory] = useState(false);
  const [cancelInventoryError, setCancelInventoryError] = useState('');
  const [stageActionError, setStageActionError] = useState('');
  const [lastRead, setLastRead] = useState<{ item: AuditItem; quantity: number } | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{
    type: 'error';
    title: string;
    detail?: string;
  } | null>(null);

  // Filtramos os itens pelo fornecedor ativo, ou usamos todos se não tiver etapas
  const activeItems = useMemo(() => {
    if (!hasStages && scopeType !== 'general') return items;
    if (!activeStage) return scopeType === 'general' ? items : [];
    return items.filter((item) => (item.assignedSupplier || 'Sem fornecedor') === activeStage);
  }, [items, hasStages, scopeType, activeStage]);
  const supplierItems = useMemo(
    () => items.filter((item) => (item.assignedSupplier || 'Sem fornecedor') !== 'Sem fornecedor'),
    [items]
  );
  const scannerItems = hasStages
    ? activeStage ? activeItems : []
    : scopeType === 'general' && activeStage ? [] : items;

  const isShowingStages = hasStages && !activeStage;
  const isSupplierSpecific = Boolean(hasStages && scopeType === 'supplier');
  const isShowingSupplierSelection = isSupplierSpecific && !activeStage;
  const isShowingSupplierSummary = scopeType === 'general' && !activeStage;
  const countItems = isShowingStages || isShowingSupplierSummary ? items : activeItems;
  const countedQuantityTotal = sumInventoryCountedQuantities(countItems);
  const isCustom = scopeType === 'custom';
  const hasIncompleteItems = items.some((item) => !item.productId?.trim());

  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recentErrorFeedbackAtRef = useRef(new Map<string, number>());
  const activeScansRef = useRef(0);
  const isSupplierScanner = Boolean(hasStages && activeStage);

  useEffect(() => {
    if (!isSupplierSpecific || activeStage) return;
    const startedSuppliers = new Set(
      items
        .filter((item) => item.supplierStageStarted === true || typeof item.physicalCount === 'number')
        .map((item) => item.assignedSupplier || 'Sem fornecedor')
        .filter((supplier) => supplier !== 'Sem fornecedor')
    );
    if (startedSuppliers.size === 1) setActiveStage([...startedSuppliers][0]);
  }, [items, isSupplierSpecific, activeStage]);

  useEffect(
    () => () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    },
    []
  );

  const openScanner = () => {
    setLastRead(null);
    setScanFeedback(null);
    prepareInventoryAudio();
    setIsQrScannerOpen(true);
  };

  const scannerButton = (!isShowingStages || isShowingSupplierSummary) && !(scopeType === 'general' && activeStage) ? (
    <button
      type="button"
      onClick={openScanner}
      className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 active:scale-95"
      title={activeStage ? `Escanear produtos de ${activeStage}` : scopeType === 'general' ? 'Scanner Geral' : 'Escanear itens selecionados'}
      aria-label={
        activeStage ? 'Escanear fornecedor atual' : scopeType === 'general' ? 'Scanner Geral' : 'Escanear itens selecionados'
      }
    >
      <i className="bi bi-qr-code-scan text-lg" aria-hidden="true" />
      {activeStage ? 'Escanear este fornecedor' : scopeType === 'general' ? 'Scanner Geral' : 'Escanear itens selecionados'}
    </button>
  ) : null;

  const cancelActiveStage = async () => {
    if (!activeStage || !onResetSupplierStage || isCancellingStage) return;
    const supplierName = activeStage;
    setIsCancellingStage(true);
    setStageActionError('');
    try {
      await onResetSupplierStage(supplierName);
      setIsQrScannerOpen(false);
      setActiveStage(null);
      setIsStageMenuOpen(false);
    } catch {
      setStageActionError('Não foi possível cancelar a etapa. A contagem foi preservada; tente novamente.');
    } finally {
      setIsCancellingStage(false);
    }
  };

  const requestCancelInventory = () => {
    setCancelInventoryError('');
    setIsCancelInventoryConfirmOpen(true);
  };

  const cancelInventory = async () => {
    if (!onDiscardInventory || isCancellingInventory) return;
    setIsCancellingInventory(true);
    setCancelInventoryError('');
    try {
      const discarded = await onDiscardInventory();
      if (!discarded) throw new Error('discard-not-confirmed');
      setIsCancelInventoryConfirmOpen(false);
    } catch {
      setCancelInventoryError('Não foi possível cancelar o inventário. Os dados foram preservados; tente novamente.');
    } finally {
      setIsCancellingInventory(false);
    }
  };

  const showErrorFeedback = (rawCode: string, title: string, detail?: string) => {
    const feedbackKey = getPhysicalInventoryScanId(rawCode) || rawCode.trim();
    const now = Date.now();
    const lastShownAt = recentErrorFeedbackAtRef.current.get(feedbackKey);
    if (lastShownAt !== undefined && now - lastShownAt < SCAN_ERROR_FEEDBACK_COOLDOWN_MS)
      return;

    for (const [key, shownAt] of recentErrorFeedbackAtRef.current) {
      if (now - shownAt >= SCAN_ERROR_FEEDBACK_COOLDOWN_MS)
        recentErrorFeedbackAtRef.current.delete(key);
    }
    recentErrorFeedbackAtRef.current.set(feedbackKey, now);
    setLastRead(null);
    setScanFeedback({ type: 'error', title, detail });
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setScanFeedback(null), 2200);
  };

  const handleQrScan = async (rawCode: string) => {
    try {
      await ensureOfflineInventoryCatalogSynced();
    } catch (error) {
      console.warn('[Inventory] Índice offline indisponível; usando os itens da sessão:', error);
    }
    let directScopedItem = scannerItems.find((candidate) =>
      matchScannedProductItem(candidate, rawCode)
    );
    let directOtherItem =
      !directScopedItem && isSupplierScanner
        ? supplierItems.find((candidate) => matchScannedProductItem(candidate, rawCode))
        : undefined;
    let catalogItem: OfflineInventoryMatch | null = null;
    if (!directScopedItem && !directOtherItem) {
      try {
        catalogItem = await findOfflineInventoryMatch(rawCode);
      } catch (error) {
        console.warn('[Inventory] Falha ao consultar índice offline:', error);
      }
    }
    if (catalogItem) {
      const matchesCatalog = (candidate: AuditItem) =>
        String(candidate.variationId || '') === catalogItem.variationId ||
        (String(candidate.productId) === catalogItem.productId && !candidate.variationId);
      directScopedItem = scannerItems.find(matchesCatalog);
      if (!directScopedItem && isSupplierScanner)
        directOtherItem = supplierItems.find(matchesCatalog);
    }
    const scopedItem = directScopedItem;

    if (!scopedItem) {
      const otherSupplierItem = directOtherItem;
      if (otherSupplierItem) {
        showErrorFeedback(
          rawCode,
          'Produto de outro fornecedor',
          `Produto: ${otherSupplierItem.name} · Fornecedor: ${otherSupplierItem.assignedSupplier || 'Sem fornecedor'}. Nenhuma quantidade foi alterada. Volte à lista e inicie a etapa desse fornecedor.`
        );
        return;
      }
      showErrorFeedback(
        rawCode,
        hasStages
          ? 'Produto não pertence às etapas deste inventário'
          : 'Produto não pertence a este inventário'
      );
      return;
    }

    try {
      const physicalLabelId = getPhysicalInventoryScanId(rawCode);
      const nextCount = await onIncrementScannedItem(scopedItem.id, physicalLabelId);
      if (nextCount === null) {
        showErrorFeedback(rawCode, 'Unidade física já contabilizada', scopedItem.name);
        return;
      }
      playInventoryCountBeep();
      setLastRead({ item: scopedItem, quantity: nextCount });
      setScanFeedback(null);
      if (navigator.vibrate) navigator.vibrate(80);
    } catch {
      showErrorFeedback(
        rawCode,
        'Falha ao salvar a contagem local',
        'Verifique o armazenamento do navegador antes de continuar.'
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      <InventoryOperationHeader
        items={countItems}
        title={activeStage ? `${inventoryName} - ${activeStage}` : inventoryName}
        showCount={!isShowingSupplierSelection}
        count={countedQuantityTotal}
        countLabel="quantidades contadas"
        onClose={!isSupplierSpecific && !activeStage ? onClose : undefined}
        onRequestCancelInventory={
          scopeType === 'full' && hasStages && activeStage && onResetSupplierStage
            ? undefined
            : requestCancelInventory
        }
      />

      <div className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6">
        <div className="max-w-5xl mx-auto space-y-6 h-full">
          {!isShowingSupplierSummary && <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex shrink-0 items-center justify-end gap-2">
              {scannerButton}
              {scopeType === 'full' && hasStages && activeStage && onResetSupplierStage && (
                <div className="relative">
                  {isStageMenuOpen && (
                    <button
                      type="button"
                      aria-label="Fechar menu de etapa"
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setIsStageMenuOpen(false)}
                    />
                  )}
                  <button
                    type="button"
                    aria-label={`Ações da etapa ${activeStage}`}
                    aria-haspopup="menu"
                    aria-expanded={isStageMenuOpen}
                    onClick={() => setIsStageMenuOpen((open) => !open)}
                    className="relative z-50 flex h-11 w-11 items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  >
                    <i className="bi bi-three-dots-vertical" aria-hidden="true" />
                  </button>
                  {isStageMenuOpen && (
                    <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsStageMenuOpen(false);
                          setStageActionError('');
                          setIsCancelStageConfirmOpen(true);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                      >
                        <i className="bi bi-x-circle" aria-hidden="true" />
                        Cancelar etapa
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsStageMenuOpen(false);
                          requestCancelInventory();
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                      >
                        <i className="bi bi-trash3" aria-hidden="true" />
                        Cancelar inventário
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>}
          {stageActionError && <p role="alert" className="text-sm font-semibold text-rose-600 dark:text-rose-400">{stageActionError}</p>}

          {/* Botão "Adicionar Item" acima da lista — apenas para inventário personalizado */}
          {isCustom && !isShowingStages && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onAddManualItem}
                className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm shadow-sm transition-colors active:scale-95"
              >
                <i className="bi bi-plus-lg" />
                Adicionar Item
              </button>
            </div>
          )}

          {isShowingStages || isShowingSupplierSummary ? (
            <InventoryStagesView
              items={items}
              variant={isShowingSupplierSummary ? 'summary' : isSupplierSpecific ? 'selection' : 'stages'}
              onSelectSupplier={isShowingSupplierSummary ? setActiveStage : undefined}
              summaryAction={isShowingSupplierSummary ? scannerButton : undefined}
              onStartStage={isShowingStages ? async (supplierName) => {
                await onStartSupplierStage(supplierName);
                setActiveStage(supplierName);
              } : undefined}
            />
          ) : (
            <InventoryManualMode
              items={activeItems}
              onUpdateCount={onUpdateCount}
              isCustom={scopeType === 'custom'}
              onUpdateItemProduct={onUpdateItemProduct}
            />
          )}
        </div>
      </div>

      {/* Bottom Bar: Revisar ou Voltar */}
      <div className={`bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-2 shrink-0 ${isSupplierSpecific && !activeStage ? 'hidden sm:block' : ''}`}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!isSupplierSpecific && activeStage && (
              <button
                onClick={() => { setIsStageMenuOpen(false); setActiveStage(null); }}
                className="text-sm font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-2"
              >
                <i className="bi bi-arrow-left"></i>
                Voltar
              </button>
            )}
            <button
              type="button"
              onClick={requestCancelInventory}
              className="hidden sm:flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              <i className="bi bi-x-circle" aria-hidden="true" />
              Cancelar inventário
            </button>
          </div>

          {(!isSupplierSpecific || Boolean(activeStage)) && (
            <button
              type="button"
              onClick={onReview}
              disabled={hasIncompleteItems}
              title={hasIncompleteItems ? 'Selecione um produto para cada item antes de revisar o inventário.' : undefined}
              className="bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white px-8 py-2 rounded-xl font-black shadow-sm transition-colors flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Revisar e Concluir
              <i className="bi bi-arrow-right"></i>
            </button>
          )}
        </div>
      </div>

      <QRScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onScan={(code) => {
          activeScansRef.current += 1;
          setIsScanProcessing(true);
          return handleQrScan(code).finally(() => {
            activeScansRef.current = Math.max(0, activeScansRef.current - 1);
            setIsScanProcessing(activeScansRef.current > 0);
          });
        }}
        title={isSupplierScanner ? 'Etapa iniciada' : scopeType === 'product' ? 'Produto selecionado' : 'Contagem geral'}
        subtitle={
          isSupplierScanner
            ? `Fornecedor: ${activeStage}`
            : scopeType === 'product'
              ? inventoryName
              : 'Aceita qualquer item deste inventário'
        }
        qrCodeOnly
        allowManualInput={false}
        showScannerStatus={false}
        feedbackOnDetection={false}
        closeOnScan={false}
        scanInstruction="Aponte para o QR Code da etiqueta"
        footerContent={
          <div className="space-y-3">
            {scanFeedback ? (
              <div
                role="status"
                className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
              >
                <p className="font-bold">{scanFeedback.title}</p>
                {scanFeedback.detail && <p className="mt-1 text-xs">{scanFeedback.detail}</p>}
              </div>
            ) : lastRead ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Última leitura
                </p>
                <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                  {lastRead.item.name}
                </p>
                {lastRead.item.isActive === false && (
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                    Produto desativado — {lastRead.quantity}{' '}
                    {lastRead.quantity === 1 ? 'unidade encontrada' : 'unidades encontradas'}
                  </p>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  SKU: {lastRead.item.sku || lastRead.item.code || lastRead.item.barcode || '—'}
                </p>
                {!isSupplierScanner && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Fornecedor: {lastRead.item.assignedSupplier || 'Sem fornecedor'}
                  </p>
                )}
                <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Quantidade contada: {lastRead.quantity}
                </p>
              </div>
            ) : null}
            <p className="text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
              {countedQuantityTotal.toLocaleString('pt-BR')} quantidades contadas
            </p>
            <button
              type="button"
              onClick={() => setIsQrScannerOpen(false)}
              disabled={isScanProcessing}
              className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-black uppercase tracking-wider text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Finalizar leitura
            </button>
          </div>
        }
      />

      <ConfirmModal
        isOpen={isCancelStageConfirmOpen}
        onClose={() => setIsCancelStageConfirmOpen(false)}
        onConfirm={() => { void cancelActiveStage(); }}
        title="Cancelar etapa do fornecedor?"
        message={`A contagem de ${activeStage || 'este fornecedor'} será apagada e a etapa voltará para não iniciada. As outras etapas não serão alteradas.`}
        confirmLabel={isCancellingStage ? 'Salvando...' : 'Cancelar etapa'}
        type="danger"
      />

      {isCancelInventoryConfirmOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="cancel-inventory-title">
          <button
            type="button"
            aria-label="Continuar contando"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            disabled={isCancellingInventory}
            onClick={() => setIsCancelInventoryConfirmOpen(false)}
          />
          <div className="relative w-full max-w-md space-y-5 rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
              <i className="bi bi-exclamation-triangle-fill text-2xl" aria-hidden="true" />
            </div>
            <div>
              <h3 id="cancel-inventory-title" className="text-xl font-black text-slate-900 dark:text-slate-100">Cancelar inventário?</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Toda a contagem será descartada e você voltará à lista de tipos de inventário.
              </p>
            </div>
            {cancelInventoryError && <p role="alert" className="text-sm font-semibold text-rose-600 dark:text-rose-400">{cancelInventoryError}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={isCancellingInventory}
                onClick={() => setIsCancelInventoryConfirmOpen(false)}
                className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Continuar contando
              </button>
              <button
                type="button"
                disabled={isCancellingInventory}
                onClick={() => void cancelInventory()}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isCancellingInventory ? 'Cancelando…' : 'Cancelar inventário'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryOperationScreen;
