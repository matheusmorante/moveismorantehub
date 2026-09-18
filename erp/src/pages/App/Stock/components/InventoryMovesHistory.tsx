import type Product from "@/pages/types/product.type";
import type { Variation } from "@/pages/types/product.type";
import ProductAutocomplete from "@/components/ProductAutocomplete";
import InventoryMoveDeleteModal from "./InventoryMoveDeleteModal";
import InventoryMoveEditModal from "./InventoryMoveEditModal";
import { InventoryMoveCard } from "./InventoryMoveCard";
import { InventoryMovesTable } from "./InventoryMovesTable";
import { ReceiptPeriodSelector } from "../Receipts/components/ReceiptPeriodSelector";
import { ReceiptsPagination } from "../Receipts/components/ReceiptsPagination";
import { useAuth } from "@/context/AuthContext";
import { canPerform } from "@/pages/utils/permissionService";
import { useInventoryMovesHistory } from "../hooks/useInventoryMovesHistory";

interface InventoryMovesHistoryProps {
    readonly selectedProduct?: Product | null;
    readonly selectedVariation?: Variation;
    readonly onSelectProduct?: (product: Product | null, variation?: Variation) => void;
}

export const InventoryMovesHistory = ({
    selectedProduct: externalSelectedProduct,
    selectedVariation: externalSelectedVariation,
    onSelectProduct: externalOnSelectProduct
}: InventoryMovesHistoryProps) => {
    const { profile } = useAuth();
    const canManageStock = canPerform('manualStockMovement', profile?.roles || profile?.role);

    const {
        loading,
        selectedProduct,
        selectedVariation,
        searchQuery,
        currentStock,
        filtered,
        expandedMoveIds,
        moveToDelete,
        editingMove,
        isDeleting,
        setSearchQuery,
        setMoveToDelete,
        setEditingMove,
        getDisplayName,
        handleSelectProduct,
        handleClearSelection,
        toggleExpand,
        getCleanObservation,
        isOrderLinked,
        confirmDelete,
        isPurchaseEntry,
        formatReversalReason,
        period,
        setPeriod,
        customStartDate,
        setCustomStartDate,
        customEndDate,
        setCustomEndDate,
        page,
        setPage,
        totalPages,
        paginatedFiltered,
        ITEMS_PER_PAGE,
        totalItems
    } = useInventoryMovesHistory({
        externalSelectedProduct,
        externalSelectedVariation,
        externalOnSelectProduct
    });

    if (loading) {
        return (
            <div className="p-20 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando Histórico...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full min-w-0">
            {/* Container Independente de Filtro de Produto e Saldo em Estoque */}
            <div className="p-3 sm:p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm mb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1 max-w-xl flex items-center gap-2">
                    {selectedProduct ? (
                        <div className="flex-1 flex items-center justify-between gap-2 px-3 py-1.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/60 dark:border-emerald-500/50 rounded-xl min-h-[42px] transition-all shadow-2xs">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
                                    <i className="bi bi-box-seam text-xs" aria-hidden="true" />
                                </div>
                                <span className="text-xs font-bold text-emerald-950 dark:text-emerald-100 truncate">
                                    {getDisplayName(selectedProduct, selectedVariation)}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={handleClearSelection}
                                className="p-1 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-md transition-all shrink-0 cursor-pointer"
                                title="Desmarcar produto"
                                aria-label="Desmarcar produto"
                            >
                                <i className="bi bi-x-lg text-xs" aria-hidden="true" />
                            </button>
                        </div>
                    ) : (
                        <div className="relative flex-1">
                            <ProductAutocomplete
                                value={searchQuery}
                                onChange={(val) => {
                                    setSearchQuery(val);
                                    if (!val) handleClearSelection();
                                }}
                                onSelect={handleSelectProduct}
                                variationsOnly
                                placeholder="Buscar produto..."
                                className="w-full"
                            />
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 self-start md:self-center flex-wrap shrink-0">
                    <ReceiptPeriodSelector
                        period={period}
                        onPeriodChange={setPeriod}
                        customStartDate={customStartDate}
                        onCustomStartDateChange={setCustomStartDate}
                        customEndDate={customEndDate}
                        onCustomEndDateChange={setCustomEndDate}
                    />

                    {selectedProduct && (
                        <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-200/50 dark:shadow-none">
                            <i className="bi bi-stack text-emerald-200 text-sm" aria-hidden="true" />
                            <span>Saldo em Estoque: <strong className="font-black text-sm text-white">{currentStock} un</strong></span>
                        </div>
                    )}
                </div>
            </div>

            {/* Listagem de Movimentações: Cards em < XL e Tabela em >= XL */}
            {paginatedFiltered.length > 0 ? (
                <div className="w-full min-w-0">
                    {/* Visualização em Cards para Telas menores que XL (< 1280px) */}
                    <div className="block xl:hidden space-y-3 w-full min-w-0">
                        {paginatedFiltered.map((move) => {
                            const isReversed = move.status === 'reversed' || move.status === 'cancelled';
                            const cleanObs = getCleanObservation(move);
                            const isExpanded = Boolean(move.id && expandedMoveIds[move.id]);
                            const reasonFormatted = formatReversalReason(move.reversalReason || (isReversed && typeof move.observation === 'string' && !move.observation.startsWith('{') ? move.observation : ''), move.relatedEntityId);
                            const enhancedMove = { ...move, reversalReason: reasonFormatted };

                            return (
                                <InventoryMoveCard
                                    key={move.id}
                                    move={enhancedMove}
                                    cleanObs={cleanObs}
                                    isReversed={isReversed}
                                    isExpanded={isExpanded}
                                    isOrderLinked={isOrderLinked(move)}
                                    onToggleExpand={() => {
                                        if (move.id) toggleExpand(move.id);
                                    }}
                                />
                            );
                        })}
                    </div>

                    {/* Visualização em Tabela para Desktop XL ou superior (>= 1280px) */}
                    <div className="hidden xl:block w-full">
                        <InventoryMovesTable
                            moves={paginatedFiltered.map((m) => ({ ...m, reversalReason: formatReversalReason(m.reversalReason || '', m.relatedEntityId) }))}
                            expandedMoveIds={expandedMoveIds}
                            toggleExpand={toggleExpand}
                            getCleanObservation={getCleanObservation}
                            isOrderLinked={isOrderLinked}
                        />
                    </div>
                    
                    <ReceiptsPagination
                        currentPage={page}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={setPage}
                        itemName="movimentações"
                    />
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-300 dark:text-slate-600 mb-4">
                        <i className="bi bi-inboxes-fill text-2xl" aria-hidden="true" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Nenhuma movimentação encontrada
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm">
                        Não foram localizadas movimentações para os filtros selecionados.
                    </p>
                </div>
            )}

            <InventoryMoveDeleteModal
                move={moveToDelete}
                isPurchaseEntry={moveToDelete ? isPurchaseEntry(moveToDelete) : false}
                isDeleting={isDeleting}
                onClose={() => !isDeleting && setMoveToDelete(null)}
                onConfirm={confirmDelete}
            />
            <InventoryMoveEditModal
                move={editingMove}
                isOpen={Boolean(editingMove)}
                onClose={() => setEditingMove(null)}
            />
        </div>
    );
};

export default InventoryMovesHistory;
