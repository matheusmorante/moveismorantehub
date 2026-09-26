import React, { useState, useMemo, useRef } from 'react';
import type { AuditItem } from "../modals/InventoryAuditModal";
import { InventoryOperationHeader } from './InventoryOperationHeader';
import { InventoryManualMode } from './InventoryManualMode';
import { InventoryStagesView } from './InventoryStagesView';
import { useInventoryOperation } from "../../hooks/useInventoryOperation";
import type { InventoryScopeType } from '../modals/InventoryScopeModal';
import QRScannerModal from '@/components/shared/QRScannerModal';
import { matchScannedProductItem, extractLabelIdentity } from '@/pages/utils/barcodeScannerUtils';
import { getPhysicalInventoryScanId } from '../services/inventoryScanRules';
import { ensureOfflineInventoryCatalogSynced, findOfflineInventoryMatch, type OfflineInventoryMatch } from '../services/offlineInventoryCatalog';

interface InventoryOperationScreenProps {
    readonly items: AuditItem[];
    readonly hasStages?: boolean;
    readonly inventoryName: string;
    readonly scopeType?: InventoryScopeType | null;
    readonly onUpdateCount: (id: string, count: number | null) => void;
    readonly onIncrementScannedItem: (id: string, labelId?: string) => Promise<number | null>;
    readonly onAddManualItem: () => void;
    readonly onUpdateItemProduct?: (itemId: string, product: any, variation?: any) => void;
    readonly onReview: () => void;
    readonly onClose?: () => void;
    readonly hasChanges?: boolean;
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
    hasChanges,
}) => {
    const [mode, setMode] = useState<'scanner' | 'manual'>('manual');
    const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
    const [isScanProcessing, setIsScanProcessing] = useState(false);
    const [activeStage, setActiveStage] = useState<string | null>(null);
    const [sessionUnitsRead, setSessionUnitsRead] = useState(0);
    const [scannedProductIds, setScannedProductIds] = useState<Set<string>>(new Set());
    const [lastRead, setLastRead] = useState<{ item: AuditItem; quantity: number } | null>(null);
    const [scanFeedback, setScanFeedback] = useState<{ type: 'error'; title: string; detail?: string } | null>(null);
    
    // Filtramos os itens pelo fornecedor ativo, ou usamos todos se não tiver etapas
    const activeItems = useMemo(() => {
        if (!hasStages) return items;
        if (!activeStage) return [];
        return items.filter(item => (item.assignedSupplier || 'Sem fornecedor') === activeStage);
    }, [items, hasStages, activeStage]);
    const scannerItems = hasStages && activeStage ? activeItems : items;

    const {
        filter,
        setFilter,
        search,
        setSearch,
        filteredItems,
    } = useInventoryOperation(activeItems);

    const isShowingStages = hasStages && !activeStage;
    const isCustom = scopeType === 'custom';

    const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isSupplierScanner = Boolean(hasStages && activeStage);

    const openScanner = () => {
        setSessionUnitsRead(0);
        setScannedProductIds(new Set());
        setLastRead(null);
        setScanFeedback(null);
        setIsScanProcessing(false);
        setIsQrScannerOpen(true);
    };

    const showErrorFeedback = (title: string, detail?: string) => {
        setLastRead(null);
        setScanFeedback({ type: 'error', title, detail });
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = setTimeout(() => setScanFeedback(null), 2200);
    };

    const handleQrScan = async (rawCode: string) => {
        try { await ensureOfflineInventoryCatalogSynced(); }
        catch (error) { console.warn('[Inventory] Índice offline indisponível; usando os itens da sessão:', error); }
        const { labelId } = extractLabelIdentity(rawCode);
        let directScopedItem = scannerItems.find(candidate => matchScannedProductItem(candidate, rawCode));
        let directOtherItem = !directScopedItem && isSupplierScanner
            ? items.find(candidate => matchScannedProductItem(candidate, rawCode)) : undefined;
        let catalogItem: OfflineInventoryMatch | null = null;
        if (!directScopedItem && !directOtherItem) {
            try { catalogItem = await findOfflineInventoryMatch(rawCode); }
            catch (error) { console.warn('[Inventory] Falha ao consultar índice offline:', error); }
        }
        if (catalogItem) {
            const matchesCatalog = (candidate: AuditItem) => String(candidate.variationId || '') === catalogItem.variationId
                || (String(candidate.productId) === catalogItem.productId && !candidate.variationId);
            directScopedItem = scannerItems.find(matchesCatalog);
            if (!directScopedItem && isSupplierScanner) directOtherItem = items.find(matchesCatalog);
        }
        const scopedItem = directScopedItem;

        if (!scopedItem) {
            const otherSupplierItem = directOtherItem;
            if (otherSupplierItem) {
                showErrorFeedback('Produto de outro fornecedor', `Produto: ${otherSupplierItem.name} · Fornecedor: ${otherSupplierItem.assignedSupplier || 'Sem fornecedor'}. Nenhuma quantidade foi alterada.`);
                return;
            }
            showErrorFeedback('Produto não pertence a este inventário');
            return;
        }

        try {
            const physicalLabelId = getPhysicalInventoryScanId(rawCode);
            const nextCount = await onIncrementScannedItem(scopedItem.id, physicalLabelId);
            if (nextCount === null) {
                showErrorFeedback('Unidade física já contabilizada', scopedItem.name);
                return;
            }
            if (typeof Audio !== 'undefined') {
                const countSound = new Audio('/inventory_count.mp3');
                countSound.volume = 1;
                void countSound.play().catch(() => {});
            }
            setSessionUnitsRead(count => count + 1);
            setScannedProductIds(previous => new Set(previous).add(scopedItem.id));
            setLastRead({ item: scopedItem, quantity: nextCount });
            setScanFeedback(null);
            if (navigator.vibrate) navigator.vibrate(80);
        } catch {
            showErrorFeedback('Falha ao salvar a contagem local', 'Verifique o armazenamento do navegador antes de continuar.');
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
            {(
                <InventoryOperationHeader
                    inventoryName={hasStages ? `${inventoryName} - ${activeStage}` : inventoryName}
                    items={scannerItems}
                    mode={mode}
                    setMode={setMode}
                    onOpenQrScanner={openScanner}
                    onClose={onClose}
                />
            )}

            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-5xl mx-auto space-y-6 h-full">
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

                    {isShowingStages && mode === 'manual' ? (
                        <InventoryStagesView
                            items={items}
                            onSelectStage={(supplierName) => setActiveStage(supplierName)}
                            onCancel={onClose}
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
            <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 shrink-0">
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
                        className="bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-black shadow-sm transition-colors flex items-center gap-2"
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
                    setIsScanProcessing(true);
                    return handleQrScan(code).finally(() => setIsScanProcessing(false));
                }}
                title={isSupplierScanner ? `Contagem — ${activeStage}` : 'Contagem geral'}
                subtitle={isSupplierScanner ? 'Somente produtos deste fornecedor' : 'Produtos de todos os fornecedores'}
                qrCodeOnly
                allowManualInput={false}
                showScannerStatus={false}
                feedbackOnDetection={false}
                closeOnScan={false}
                scanInstruction="Aponte para o QR Code da etiqueta"
                footerContent={(
                    <div className="space-y-3">
                        {scanFeedback ? (
                            <div role="status" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                                <p className="font-bold">{scanFeedback.title}</p>
                                {scanFeedback.detail && <p className="mt-1 text-xs">{scanFeedback.detail}</p>}
                            </div>
                        ) : lastRead ? (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                                <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Última leitura</p>
                                <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{lastRead.item.name}</p>
                                {lastRead.item.isActive === false && <p className="text-xs font-bold text-amber-700 dark:text-amber-300">Produto desativado — {lastRead.quantity} {lastRead.quantity === 1 ? 'unidade encontrada' : 'unidades encontradas'}</p>}
                                <p className="text-xs text-slate-500 dark:text-slate-400">SKU: {lastRead.item.sku || lastRead.item.code || lastRead.item.barcode || '—'}</p>
                                {!isSupplierScanner && <p className="text-xs text-slate-500 dark:text-slate-400">Fornecedor: {lastRead.item.assignedSupplier || 'Sem fornecedor'}</p>}
                                <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Quantidade contada: {lastRead.quantity}</p>
                            </div>
                        ) : null}
                        <p className="text-center text-xs font-semibold text-slate-600 dark:text-slate-300">{sessionUnitsRead} {sessionUnitsRead === 1 ? 'unidade lida' : 'unidades lidas'} · {scannedProductIds.size} {scannedProductIds.size === 1 ? 'produto' : 'produtos'}</p>
                        <button type="button" onClick={() => setIsQrScannerOpen(false)} disabled={isScanProcessing} className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-black uppercase tracking-wider text-white hover:bg-blue-700 disabled:opacity-50">Finalizar leitura</button>
                    </div>
                )}
            />
        </div>
    );
};

export default InventoryOperationScreen;
