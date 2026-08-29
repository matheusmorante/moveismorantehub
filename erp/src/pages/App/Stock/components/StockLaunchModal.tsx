import React, { useState, useEffect } from "react";
import Product, { Variation } from "../../../types/product.type";
import { subscribeToProducts } from '@/pages/utils/productService';
import { saveInventoryMove } from '@/pages/utils/inventoryService';
import { toast } from "react-toastify";
import InventoryMove from "../../../types/inventoryMove.type";
import QRScannerModal from "@/components/shared/QRScannerModal";
import ErrorBoundary from "@/components/shared/ErrorBoundary";

interface StockLaunchModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetProduct: Product | null;
    targetVariation?: Variation;
}

type LaunchType = 'entry' | 'exit' | 'adjustment';

const StockLaunchModal = ({ isOpen, onClose, targetProduct, targetVariation }: StockLaunchModalProps) => {
    const [type, setType] = useState<LaunchType>('entry');
    const [quantity, setQuantity] = useState<number>(0);
    const [reason, setReason] = useState("");
    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [selectedVariationId, setSelectedVariationId] = useState<string>("");
    const [products, setProducts] = useState<Product[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scannerMode, setScannerMode] = useState<'select' | 'count'>('select');

    useEffect(() => {
        if (isOpen) {
            const unsubscribe = subscribeToProducts((data) => {
                setProducts(data.filter(p => p.itemType === 'product' && !p.deleted));
            });
            return () => unsubscribe();
        }
    }, [isOpen]);

    useEffect(() => {
        if (targetProduct) {
            setSelectedProductId(targetProduct.id!);
            setSelectedVariationId(targetVariation?.id || targetProduct.variations?.[0]?.id || '');
        }
    }, [targetProduct]);

    const activeProduct = products.find(p => p.id === selectedProductId) || targetProduct;
    const activeVariation = activeProduct?.variations?.find(v => v.id === selectedVariationId) || targetVariation;

    const handleSave = async () => {
        if (!selectedProductId || !activeVariation || quantity < 0) {
            toast.error("Por favor, preencha todos os campos corretamente.");
            return;
        }

        if (!reason.trim()) {
            toast.error("Por favor, declare o motivo da movimentação.");
            return;
        }

        if (!activeProduct) return;

        setIsSaving(true);
        try {
            const move: InventoryMove = {
                productId: selectedProductId,
                variationId: activeVariation.id,
                productDescription: `${activeProduct.description} (${activeVariation.name})`,
                type: type === 'adjustment' ? 'balance' : (type === 'entry' ? 'entry' : 'withdrawal'),
                quantity: quantity,
                date: new Date().toISOString(),
                label: reason,
                observation: reason
            };

            const currentStock = activeVariation.stock || 0;
            await saveInventoryMove(move, currentStock);
            
            toast.success("Movimentação registrada com sucesso! ✨");
            onClose();
            // Reset fields
            setQuantity(0);
            setReason("");
        } catch (error) {
            toast.error("Erro ao processar a movimentação.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const theme = type === 'entry'
        ? { header: 'bg-emerald-600', confirm: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' }
        : type === 'exit'
            ? { header: 'bg-red-600', confirm: 'bg-red-600 hover:bg-red-700 shadow-red-200' }
            : { header: 'bg-amber-500', confirm: 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' };

    return (
        <div className="fixed inset-x-0 bottom-0 top-14 z-40 flex items-center justify-center p-0 xl:inset-0 xl:z-50 xl:p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
            
            <div className="relative flex h-full w-full flex-col overflow-hidden rounded-none border-0 bg-white shadow-2xl animate-slide-up dark:bg-slate-900 xl:h-auto xl:max-h-[90vh] xl:max-w-lg xl:rounded-[2.5rem] xl:border xl:border-slate-100 xl:dark:border-slate-800">
                <div className={`flex shrink-0 items-center justify-between px-5 py-3 text-white sm:px-6 ${theme.header}`}>
                    <div>
                        <h2 className="text-lg font-black tracking-tight uppercase sm:text-xl">Nova movimentação</h2>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:bg-white/10">
                        <i className="bi bi-x-lg text-lg"></i>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    {/* Movement Type */}
                    <div className="grid grid-cols-3 gap-3">
                        {(['entry', 'exit', 'adjustment'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setType(t)}
                                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                                    type === t
                                        ? t === 'entry'
                                            ? 'bg-emerald-50 border-emerald-500 text-emerald-600 dark:bg-emerald-900/20 shadow-lg shadow-emerald-100 dark:shadow-none'
                                            : t === 'exit'
                                                ? 'bg-red-50 border-red-500 text-red-600 dark:bg-red-900/20 shadow-lg shadow-red-100 dark:shadow-none'
                                                : 'bg-amber-50 border-amber-500 text-amber-600 dark:bg-amber-900/20 shadow-lg shadow-amber-100 dark:shadow-none'
                                        : 'bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800 text-slate-400 hover:border-slate-200'
                                }`}
                            >
                                {t === 'adjustment' ? <span className="text-xl leading-none" aria-hidden="true">⚖</span> : <i className={`bi ${t === 'entry' ? 'bi-plus-circle' : 'bi-dash-circle'} text-xl`}></i>}
                                <span className="text-[9px] font-black uppercase tracking-widest">
                                    {t === 'entry' ? 'Entrada' : t === 'exit' ? 'Saída' : 'Ajuste'}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Product Selection */}
                    {!targetProduct && (
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selecionar Produto</label>
                            <div className="flex gap-2">
                                <select 
                                    value={selectedVariationId}
                                    onChange={(e) => {
                                        const [productId, variationId] = e.target.value.split('|');
                                        setSelectedProductId(productId || '');
                                        setSelectedVariationId(variationId || '');
                                    }}
                                    className="flex-1 bg-slate-50 dark:bg-slate-950 px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-slate-700 dark:text-slate-200"
                                >
                                    <option value="">Selecione uma variação...</option>
                                    {products.flatMap(p => (p.variations || []).map(v => <option key={v.id} value={`${p.id}|${v.id}`}>{p.description} — {v.name} (Saldo: {v.stock})</option>))}
                                </select>
                                <button
                                    onClick={() => {
                                        setScannerMode('select');
                                        setIsScannerOpen(true);
                                    }}
                                    className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
                                    title="Escanear Código de Barras"
                                >
                                    <i className="bi bi-qr-code-scan text-xl"></i>
                                </button>
                            </div>
                        </div>
                    )}

                    {targetProduct && (
                        <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Variação Selecionada
                            </span>
                            <div className="mt-2 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                                    <i className="bi bi-stack text-2xl"></i>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-100">
                                        {targetProduct.description}
                                        {activeVariation && <span className="text-emerald-600 ml-2">({activeVariation.name})</span>}
                                    </h4>
                                    <p className="text-xs text-slate-500 font-medium tracking-tight">
                                        Saldo Atual: <span className="font-black text-slate-700 dark:text-slate-200">
                                            {activeVariation?.stock || 0} {targetProduct.unit}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {type === 'adjustment' ? 'Novo Saldo Total' : 'Quantidade'}
                            </label>
                            <div className="relative group">
                                <input 
                                    type="number" 
                                    value={quantity}
                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                    className="w-full bg-slate-50 dark:bg-slate-950 px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-black text-xl text-slate-800 dark:text-slate-100"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setScannerMode('count');
                                        setIsScannerOpen(true);
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                    title="Iniciar Contagem (QR Code)"
                                >
                                    <i className="bi bi-qr-code-scan"></i>
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Motivo / Observação *</label>
                            <input 
                                type="text" 
                                placeholder="Descreva o motivo..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-950 px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-sm"
                            />
                        </div>
                    </div>

                    <button 
                        onClick={handleSave}
                        disabled={isSaving || !selectedProductId}
                        className={`w-full py-5 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl dark:shadow-none transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 ${theme.confirm}`}
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <i className="bi bi-check-lg text-xl"></i>
                        )}
                        Confirmar Movimentação
                    </button>
                </div>
            </div>

            <ErrorBoundary name="Scanner de Lançamento">
                <QRScannerModal 
                    isOpen={isScannerOpen} 
                    onClose={() => setIsScannerOpen(false)} 
                    closeOnScan={scannerMode === 'select'}
                    onScan={(code) => {
                        let foundProduct: Product | undefined;
                        let foundVariation: Variation | undefined;
    
                        const cleanCode = code.trim().toLowerCase();
    
                        for (const p of products) {
                            const v = p.variations?.find(v => v.sku?.trim().toLowerCase() === cleanCode);
                            if (v) {
                                foundProduct = p;
                                foundVariation = v;
                                break;
                            }
                        }
    
                        if (foundProduct && foundVariation) {
                            if (scannerMode === 'count') {
                                if (foundProduct.id === selectedProductId && foundVariation.id === selectedVariationId) {
                                    setQuantity(q => q + 1);
                                    toast.success(`+1: ${foundProduct.description}`, { autoClose: 500, hideProgressBar: true });
                                } else {
                                    // Optionally switch product and start at 1
                                    setSelectedProductId(foundProduct.id!);
                                    setSelectedVariationId(foundVariation.id);
                                    setQuantity(1);
                                    toast.info(`Contagem iniciada para: ${foundProduct.description}`);
                                }
                            } else {
                                setSelectedProductId(foundProduct.id!);
                                setSelectedVariationId(foundVariation.id);
                                setIsScannerOpen(false);
                                toast.success(`Produto localizado: ${foundProduct.description} ${foundVariation ? `(${foundVariation.name})` : ''}`);
                            }
                        } else {
                            toast.error(`Produto com código/SKU "${code}" não encontrado.`);
                        }
                    }}
                    title={scannerMode === 'count' ? "Contagem em Massa" : "Escanear Produto"}
                />
            </ErrorBoundary>
        </div>
    );
};

export default StockLaunchModal;
