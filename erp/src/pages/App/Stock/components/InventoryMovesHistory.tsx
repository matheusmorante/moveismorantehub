import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import InventoryMove from "../../../types/inventoryMove.type";
import Product, { Variation } from "../../../types/product.type";
import { subscribeToInventoryMoves, deleteInventoryMove } from '@/pages/utils/inventoryService';
import { formatToBRDate } from "../../../utils/formatters";
import ProductAutocomplete from "@/components/ProductAutocomplete";
import { getProductByCode } from "@/pages/utils/productService";
import { toast } from "react-toastify";
import QRScannerModal from "@/components/shared/QRScannerModal";
import InventoryMoveDeleteModal from './InventoryMoveDeleteModal';
import PurchaseEntryLockedModal from './PurchaseEntryLockedModal';
import SalesWithdrawalLockedModal from './SalesWithdrawalLockedModal';

const InventoryMovesHistory = () => {
    const navigate = useNavigate();
    const [moves, setMoves] = useState<InventoryMove[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedVariation, setSelectedVariation] = useState<Variation | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState("");
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [moveToDelete, setMoveToDelete] = useState<InventoryMove | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [lockedPurchaseMove, setLockedPurchaseMove] = useState<InventoryMove | null>(null);
    const [lockedSalesMove, setLockedSalesMove] = useState<InventoryMove | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeToInventoryMoves((data) => {
            setMoves(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const getDisplayName = (prod: Product, variation?: Variation) => {
        const baseName = prod.name || prod.title || prod.description || "Produto";
        if (variation?.name) {
            if (variation.name.toLowerCase().includes(baseName.toLowerCase())) {
                return variation.name;
            }
            return `${baseName} - ${variation.name}`;
        }
        return baseName;
    };

    const handleSelectProduct = (product: Product, variation?: Variation) => {
        setSelectedProduct(product);
        setSelectedVariation(variation);
        const name = getDisplayName(product, variation);
        setSearchQuery(name);
    };

    const handleClearSelection = () => {
        setSelectedProduct(null);
        setSelectedVariation(undefined);
        setSearchQuery("");
    };

    const currentStock = useMemo(() => {
        if (!selectedProduct) return 0;
        if (selectedVariation !== undefined) {
            return Number(selectedVariation.stock || 0);
        }
        return Number(selectedProduct.stock || 0);
    }, [selectedProduct, selectedVariation]);

    const filtered = useMemo(() => {
        return moves.filter(m => {
            // 1. Se um produto/variação foi selecionado
            if (selectedProduct) {
                if (m.productId !== selectedProduct.id) return false;
                if (selectedVariation && m.variationId) {
                    return String(m.variationId) === String(selectedVariation.id);
                }
                return true;
            }

            // 2. Se há texto digitado na busca
            if (searchQuery.trim().length > 0) {
                const q = searchQuery.toLowerCase().trim();
                const name = (m.productName || "").toLowerCase();
                const desc = (m.productDescription || "").toLowerCase();
                const label = (m.label || "").toLowerCase();
                const obs = (m.observation || "").toLowerCase();
                return name.includes(q) || desc.includes(q) || label.includes(q) || obs.includes(q);
            }

            return true;
        });
    }, [moves, selectedProduct, selectedVariation, searchQuery]);

    const isPurchaseEntry = (move: InventoryMove) => move.relatedEntityType === 'purchase_order' || move.label?.startsWith('Entrada a partir do Pedido') === true;

    const handleDelete = (move: InventoryMove) => {
        if (move.relatedEntityType === 'sales_order') {
            toast.warning("Esta movimentação pertence a um Pedido de Venda e não pode ser excluída manualmente.");
            return;
        }
        setMoveToDelete(move);
    };

    const confirmDelete = async () => {
        if (!moveToDelete?.id) return;
        setIsDeleting(true);
        try {
            await deleteInventoryMove(moveToDelete.id);
            toast.success('Movimentação excluída com sucesso!');
            setMoveToDelete(null);
        } catch (error: any) {
            toast.error(error.message || "Erro ao excluir lançamento.");
        } finally { setIsDeleting(false); }
    };

    if (loading) {
        return (
            <div className="p-20 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando Histórico...</p>
            </div>
        );
    }

    const formatMoveLabel = (move: InventoryMove) => {
        if (move.label === 'ESTOQUE INICIAL') return 'Ajuste Inicial';
        if (move.relatedEntityType === 'purchase_order' || move.label?.startsWith('Entrada do Pedido')) {
            if (move.label?.startsWith('Entrada NF-')) return move.label;
            
            let supplierName = '';
            if (move.observation) {
                const match = move.observation.match(/Fornecedor:\s*([^|]+)/i);
                if (match && match[1]) {
                    supplierName = match[1].trim();
                }
            }
            
            const dateStr = formatToBRDate(move.date);
            if (supplierName && supplierName !== 'Desconhecido') {
                return `Entrada do Pedido da ${supplierName} (${dateStr})`;
            }
            if (move.label && !move.label.includes('-') && !move.label.includes('nº')) {
                return move.label.replace(/,\s*\)/g, ')');
            }
            if (move.relatedEntityId) {
                return `Entrada do Pedido #${move.relatedEntityId.slice(-4)} (${dateStr})`;
            }
        }
        return move.label || 'Manual';
    };

    return (
        <div className="flex flex-col">
            {/* Barra Superior: Busca de Produto e Saldo de Estoque */}
            <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-35 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1 max-w-xl flex items-center gap-2">
                    <div className="relative flex-1">
                        <ProductAutocomplete
                            value={searchQuery}
                            onChange={(val) => {
                                setSearchQuery(val);
                                if (!val) {
                                    setSelectedProduct(null);
                                    setSelectedVariation(undefined);
                                }
                            }}
                            onSelect={handleSelectProduct}
                            placeholder="Buscar produto"
                            className="w-full"
                        />
                    </div>
                    {selectedProduct && (
                        <button
                            type="button"
                            onClick={handleClearSelection}
                            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 rounded-xl transition-all"
                            title="Limpar seleção"
                        >
                            <i className="bi bi-x-lg text-xs"></i>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setIsScannerOpen(true)}
                        className="p-2.5 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-900/20 text-slate-500 hover:text-blue-600 rounded-xl transition-all"
                        title="Escanear Código de Barras"
                    >
                        <i className="bi bi-qr-code-scan text-sm"></i>
                    </button>
                </div>

                {/* Nome do Produto e Saldo do Estoque */}
                {selectedProduct && (
                    <div className="flex items-center gap-3 self-start md:self-center flex-wrap">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40 rounded-xl text-xs font-bold">
                            <i className="bi bi-box-seam" />
                            <span>{getDisplayName(selectedProduct, selectedVariation)}</span>
                        </div>

                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold">
                            <i className="bi bi-stack text-emerald-500" />
                            <span>Saldo do Estoque: <strong className="font-black text-sm text-emerald-600 dark:text-emerald-400">{currentStock} un</strong></span>
                        </div>
                    </div>
                )}
            </div>

            {/* Listagem de Movimentações */}
            {filtered.length > 0 ? (
                <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-230px)] custom-scrollbar border border-slate-100 dark:border-slate-800/50 rounded-2xl m-3 mt-3 sm:m-4 sm:mt-4">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-955/50 border-b border-slate-100 dark:border-slate-800/50">
                                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Data</th>
                                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Produto e Detalhes</th>
                                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo</th>
                                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Qtd.</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                            {filtered.map((move) => (
                                <tr key={move.id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors ${
                                    move.status === 'cancelled' ? 'opacity-40 bg-slate-50/40 dark:bg-slate-950/40' : ''
                                }`}>
                                    <td className="px-5 py-3.5 text-xs font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                        {formatToBRDate(move.date)}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="flex flex-col gap-1 max-w-xl">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                                    {move.productName || move.productDescription || 'Produto Desconhecido'}
                                                </span>
                                                {/* Badge de Rótulo / Origem */}
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                                    move.label === 'ESTOQUE INICIAL' 
                                                        ? 'bg-amber-50 text-amber-600 border border-amber-100/55 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30' 
                                                        : move.relatedEntityType === 'sales_order' 
                                                        ? 'bg-blue-50 text-blue-600 border border-blue-100/55 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30' 
                                                        : move.relatedEntityType === 'purchase_order' 
                                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/55 dark:bg-emerald-955/20 dark:text-emerald-400 dark:border-emerald-900/30' 
                                                        : 'bg-slate-100 text-slate-600 border border-slate-200/50 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/55'
                                                }`}>
                                                    {formatMoveLabel(move)}
                                                </span>
                                            {move.relatedEntityId && move.relatedEntityType !== 'purchase_order' && !move.label?.startsWith('Entrada a partir do Pedido') && (
                                                    <span className="text-[9px] font-black bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                                                        #{move.relatedEntityId.slice(-4)}
                                                    </span>
                                                )}
                                            </div>
                                            {move.observation && move.relatedEntityType !== 'purchase_order' && !move.label?.startsWith('Entrada a partir do Pedido') && !move.observation.startsWith('Pedido de Compra #') && (
                                                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                                                    <i className="bi bi-chat-left-text text-[9px] text-slate-400"></i>
                                                    {move.observation}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            move.status === 'cancelled' 
                                                ? 'bg-slate-100 text-slate-400 dark:bg-slate-800/40 dark:text-slate-500' 
                                                : move.type === 'entry' 
                                                ? 'bg-emerald-100/50 text-emerald-600 dark:bg-emerald-955/20 dark:text-emerald-400' 
                                                : move.type === 'withdrawal' 
                                                ? 'bg-rose-100/50 text-rose-600 dark:bg-rose-955/20 dark:text-rose-400' 
                                                : 'bg-blue-100/50 text-blue-600 dark:bg-blue-955/20 dark:text-blue-400'
                                        }`}>
                                            {move.type === 'entry' ? (
                                                <><i className="bi bi-arrow-up-right-circle-fill text-xs"></i> Entrada</>
                                            ) : move.type === 'withdrawal' ? (
                                                <><i className="bi bi-arrow-down-left-circle-fill text-xs"></i> Saída</>
                                            ) : (
                                                <><i className="bi bi-sliders text-xs"></i> Ajuste</>
                                            )}
                                        </span>
                                    </td>
                                    <td className={`px-5 py-3.5 font-black text-xs text-center ${
                                        move.type === 'entry' ? 'text-emerald-600 dark:text-emerald-400' :
                                        move.type === 'withdrawal' ? 'text-rose-600 dark:text-rose-400' :
                                        'text-blue-600 dark:text-blue-400'
                                    }`}>
                                        {move.type === 'withdrawal' ? '-' : move.type === 'entry' ? '+' : ''}{move.quantity}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                         {move.status === 'cancelled' ? (
                                             <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest select-none">Cancelado</span>
                                         ) : isPurchaseEntry(move) ? (
                                             <button onClick={() => setLockedPurchaseMove(move)} className="rounded-xl p-2 text-slate-300 transition-all hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/20" title="Entrada vinculada ao pedido de compra">
                                                 <i className="bi bi-trash"></i>
                                             </button>
                                         ) : move.relatedEntityType === 'sales_order' ? (
                                             <button onClick={() => setLockedSalesMove(move)} className="rounded-xl p-2 text-slate-300 transition-all hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20" title="Saída vinculada ao pedido de venda"><i className="bi bi-trash"></i></button>
                                         ) : (
                                             <button 
                                                 onClick={() => handleDelete(move)}
                                                 className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-955/10 rounded-xl transition-all"
                                                 title="Excluir Lançamento Avulso"
                                             >
                                                 <i className="bi bi-trash"></i>
                                             </button>
                                         )}
                                     </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="p-16 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-300 dark:text-slate-700 mb-4">
                        <i className="bi bi-inboxes-fill text-2xl"></i>
                    </div>
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {selectedProduct ? "Nenhuma movimentação para este produto" : "Nenhuma movimentação encontrada"}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm">
                        {selectedProduct 
                            ? "Não foram localizadas entradas, saídas ou ajustes para este produto."
                            : "Busque um produto acima para visualizar seu histórico de movimentações."}
                    </p>
                </div>
            )}

            {isScannerOpen && (
                <QRScannerModal 
                    isOpen={isScannerOpen} 
                    onClose={() => setIsScannerOpen(false)} 
                    onScan={async (code) => {
                        const result = await getProductByCode(code);
                        if (result) {
                            handleSelectProduct(result.product, result.variation);
                            toast.success(`Produto localizado: ${getDisplayName(result.product, result.variation)}`);
                        } else {
                            toast.error(`Produto com código "${code}" não encontrado.`);
                        }
                        setIsScannerOpen(false);
                    }}
                    title="Escanear Código de Barras"
                />
            )}
            <InventoryMoveDeleteModal move={moveToDelete} isPurchaseEntry={moveToDelete ? isPurchaseEntry(moveToDelete) : false} isDeleting={isDeleting} onClose={() => !isDeleting && setMoveToDelete(null)} onConfirm={confirmDelete} />
            <PurchaseEntryLockedModal move={lockedPurchaseMove} onClose={() => setLockedPurchaseMove(null)} onOpenPurchase={purchaseId => navigate('/stock?tab=purchases', { state: { purchaseIdToOpen: purchaseId } })} />
            <SalesWithdrawalLockedModal move={lockedSalesMove} onClose={() => setLockedSalesMove(null)} onOpenSale={saleId => navigate('/sales-order', { state: { saleOrderIdToOpen: saleId } })} />
        </div>
    );
};

export default InventoryMovesHistory;
