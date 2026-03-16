import React, { useState } from 'react';
import Product, { Variation } from '../../../types/product.type';
import ProductAutocomplete from '../../../../components/ProductAutocomplete';
import { migrateProductReferences } from '../../../utils/productService';
import { toast } from 'react-toastify';

interface ProductMigrationModalProps {
    sourceProduct: Product;
    onClose: () => void;
    onSuccess: () => void;
}

const ProductMigrationModal: React.FC<ProductMigrationModalProps> = ({
    sourceProduct,
    onClose,
    onSuccess
}) => {
    const [targetProduct, setTargetProduct] = useState<Product | null>(null);
    const [targetVariation, setTargetVariation] = useState<Variation | null>(null);
    const [isMigrating, setIsMigrating] = useState(false);

    const handleMigrate = async () => {
        if (!targetProduct) {
            toast.warning("Selecione um produto de destino");
            return;
        }

        if (targetProduct.id === sourceProduct.id) {
            toast.warning("O produto de destino não pode ser o mesmo que o de origem");
            return;
        }

        const confirm = window.confirm(
            `Tem certeza que deseja migrar todas as referências de "${sourceProduct.description}" para "${targetProduct.description}${targetVariation ? ` (${targetVariation.name})` : ''}"?\n\nEsta ação é irreversível e desativará o produto de origem.`
        );

        if (!confirm) return;

        setIsMigrating(true);
        try {
            await migrateProductReferences(sourceProduct.id!, targetProduct.id!);
            toast.success("Migração concluída com sucesso!");
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao realizar migração. Verifique o console.");
        } finally {
            setIsMigrating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Migrar Referências</h2>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Mover histórico entre produtos</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-600 text-slate-400 hover:text-slate-600"
                    >
                        <i className="bi bi-x-lg text-lg"></i>
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {/* Alerta de Integridade */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 p-5 rounded-2xl flex gap-4">
                        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center shrink-0">
                            <i className="bi bi-exclamation-triangle-fill text-amber-600 dark:text-amber-500 text-lg"></i>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-amber-800 dark:text-amber-400">Atenção: Integridade de Dados</p>
                            <p className="text-[11px] font-medium text-amber-700/80 dark:text-amber-500/80 leading-relaxed mt-1">
                                Os preços de venda originais e os custos de entrada registrados nos pedidos de compra permanecerão intactos. Apenas o vínculo do produto será alterado para o novo histórico.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {/* Origem */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Produto de Origem (Histórico)</label>
                            <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl">
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{sourceProduct.description}</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-100 dark:border-slate-700">
                                        ID: {sourceProduct.id} | SKU: {sourceProduct.code || 'S/REF'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Ícone de Fluxo */}
                        <div className="flex justify-center -my-2 relative z-10">
                            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 border-4 border-white dark:border-slate-900">
                                <i className="bi bi-arrow-down-short text-2xl"></i>
                            </div>
                        </div>

                        {/* Destino */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Produto de Destino (Novo Vínculo)</label>
                            <ProductAutocomplete 
                                onSelect={(p, v) => {
                                    setTargetProduct(p);
                                    setTargetVariation(v || null);
                                }}
                                placeholder="Busque o novo produto por nome ou SKU..."
                            />
                            {targetProduct && (
                                <div className="mt-2 px-3 py-2 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl flex items-center gap-2 transition-all animate-in slide-in-from-top-1">
                                    <i className="bi bi-check-circle-fill text-blue-500 text-sm"></i>
                                    <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                                        Destino selecionado: {targetProduct.description} {targetVariation ? `(${targetVariation.name})` : ''}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-6 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-50 dark:border-slate-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        disabled={!targetProduct || isMigrating}
                        onClick={handleMigrate}
                        className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-2 ${
                            !targetProduct || isMigrating 
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-[1.02] active:scale-95 shadow-blue-500/20'
                        }`}
                    >
                        {isMigrating ? (
                            <>
                                <i className="bi bi-arrow-repeat animate-spin"></i>
                                Migrando...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-shuffle"></i>
                                Confirmar Migração
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductMigrationModal;
