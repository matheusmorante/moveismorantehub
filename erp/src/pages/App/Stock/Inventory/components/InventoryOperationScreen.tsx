import React, { useState, useMemo, useRef, useEffect } from 'react';
import type Product from '@/pages/types/product.type';
import type { Variation } from '@/pages/types/product.type';
import type { AuditItem } from '../types/inventoryAudit.types';
import { InventoryOperationHeader } from './InventoryOperationHeader';
import { InventoryManualMode } from './InventoryManualMode';
import { InventoryStagesView } from './InventoryStagesView';
import { useInventoryOperation } from '../hooks/useInventoryOperation';
import type { InventoryScopeType } from '../types/inventoryScope.types';
import QRScannerModal from '@/components/shared/QRScannerModal';
import { matchScannedProductItem } from '@/pages/utils/barcodeScannerUtils';
import { getPhysicalInventoryScanId } from '../services/inventoryScanRules';
import {
  ensureOfflineInventoryCatalogSynced,
  findOfflineInventoryMatch,
} from '../services/offlineInventoryCatalog';
import type { OfflineInventoryMatch } from '../types/offlineInventoryCatalog.types';

type InventoryAudioWindow = Window & { webkitAudioContext?: typeof AudioContext };
let inventoryAudioContext: AudioContext | null = null;
let nextInventoryBeepStart = 0;
const INVENTORY_BEEP_INTERVAL_SECONDS = 0.02;
const INVENTORY_BEEP_DURATION_SECONDS = 0.08;
const SCAN_ERROR_FEEDBACK_COOLDOWN_MS = 10_000;

const prepareInventoryAudio = (): AudioContext | null => {
  try {
    const AudioContextConstructor =
      window.AudioContext || (window as InventoryAudioWindow).webkitAudioContext;
    if (!AudioContextConstructor) return null;

    inventoryAudioContext ||= new AudioContextConstructor();
    const context = inventoryAudioContext;
    if (context.state === 'suspended') void context.resume().catch(() => {});
    return context;
  } catch {
    return null;
  }
};

const playInventoryCountBeep = (): void => {
  try {
    const context = prepareInventoryAudio();
    if (!context) return;

    const startAt = Math.max(context.currentTime, nextInventoryBeepStart);
    const endAt = startAt + INVENTORY_BEEP_DURATION_SECONDS;
    nextInventoryBeepStart = startAt + INVENTORY_BEEP_INTERVAL_SECONDS;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.setValueAtTime(880, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(0.14, startAt + 0.005);
    gain.gain.setValueAtTime(0.14, endAt - 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(startAt);
    oscillator.stop(endAt);
  } catch {
    // O áudio confirma a contagem; falhas de áudio não podem atrasá-la.
  }
};

interface InventoryOperationScreenProps {
  readonly items: AuditItem[];
  readonly hasStages?: boolean;
  readonly inventoryName: string;
  readonly scopeType?: InventoryScopeType | null;
  readonly onUpdateCount: (id: string, count: number | null) => void;
  readonly onIncrementScannedItem: (id: string, labelId?: string) => Promise<number | null>;
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
  onAddManualItem,
  onUpdateItemProduct,
  onReview,
  onClose,
}) => {
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isScanProcessing, setIsScanProcessing] = useState(false);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [lastRead, setLastRead] = useState<{ item: AuditItem; quantity: number } | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{
    type: 'error';
    title: string;
    detail?: string;
  } | null>(null);

  // Filtramos os itens pelo fornecedor ativo, ou usamos todos se não tiver etapas
  const activeItems = useMemo(() => {
    if (!hasStages) return items;
    if (!activeStage) return [];
    return items.filter((item) => (item.assignedSupplier || 'Sem fornecedor') === activeStage);
  }, [items, hasStages, activeStage]);
  const supplierItems = useMemo(
    () => items.filter((item) => (item.assignedSupplier || 'Sem fornecedor') !== 'Sem fornecedor'),
    [items]
  );
  const scannerItems = activeStage ? activeItems : items;

  const { filter, setFilter, search, setSearch, filteredItems } =
    useInventoryOperation(activeItems);

  const isShowingStages = hasStages && !activeStage;
  const progressItems = isShowingStages ? items : scannerItems;
  const countedProgressItems = progressItems.filter((item) => item.physicalCount !== null);
  const progressPercent =
    progressItems.length > 0
      ? Math.round((countedProgressItems.length / progressItems.length) * 100)
      : 0;
  const isCustom = scopeType === 'custom';

  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recentErrorFeedbackAtRef = useRef(new Map<string, number>());
  const activeScansRef = useRef(0);
  const isSupplierScanner = Boolean(hasStages && activeStage);

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
          `Produto: ${otherSupplierItem.name} · Fornecedor: ${otherSupplierItem.assignedSupplier || 'Sem fornecedor'}. Nenhuma quantidade foi alterada. Volte à lista, escolha esse fornecedor ou use o scanner geral.`
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
      <InventoryOperationHeader items={progressItems} />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-5xl mx-auto space-y-6 h-full">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="min-w-0 truncate text-lg font-black text-slate-800 dark:text-slate-100">
              {activeStage ? `${inventoryName} - ${activeStage}` : inventoryName}
            </h3>
            <div className="flex shrink-0 items-center justify-end gap-2">
              {!activeStage && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Voltar
                </button>
              )}
              <button
                type="button"
                onClick={openScanner}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 active:scale-95"
                title={activeStage ? `Escanear produtos de ${activeStage}` : 'Escanear o inventário'}
                aria-label={
                  activeStage ? 'Escanear fornecedor atual' : 'Escanear inventário completo'
                }
              >
                <i className="bi bi-qr-code-scan text-lg" aria-hidden="true" />
                {activeStage ? 'Escanear este fornecedor' : 'Escanear inventário completo'}
              </button>
            </div>
          </div>

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

          {isShowingStages ? (
            <InventoryStagesView
              items={items}
              onSelectStage={(supplierName) => setActiveStage(supplierName)}
            />
          ) : (
            <InventoryManualMode
              filteredItems={filteredItems}
              filter={filter}
              setFilter={setFilter}
              search={search}
              setSearch={setSearch}
              onUpdateCount={onUpdateCount}
              isCustom={scopeType === 'custom'}
              onUpdateItemProduct={onUpdateItemProduct}
            />
          )}
        </div>
      </div>

      {/* Bottom Bar: Revisar ou Voltar */}
      <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-2 shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {activeStage && (
              <button
                onClick={() => setActiveStage(null)}
                className="text-sm font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-2"
              >
                <i className="bi bi-arrow-left"></i>
                Voltar
              </button>
            )}
          </div>

          <button
            onClick={onReview}
            className="bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white px-8 py-2 rounded-xl font-black shadow-sm transition-colors flex items-center gap-2"
          >
            Revisar e Concluir
            <i className="bi bi-arrow-right"></i>
          </button>
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
        title={isSupplierScanner ? `Contagem — ${activeStage}` : 'Contagem geral'}
        subtitle={
          isSupplierScanner
            ? `Somente produtos de ${activeStage}`
            : 'Aceita itens de qualquer fornecedor listado neste inventário'
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
              {countedProgressItems.length} / {progressItems.length} produtos contados · {progressPercent}%
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
    </div>
  );
};

export default InventoryOperationScreen;
