import React, { useState, useEffect } from 'react';
import Product from '../../../../types/product.type';
import { saveProduct } from '@/pages/utils/productService';
import { toast } from 'react-toastify';

export interface ProductErpChecks {
    readonly description?: boolean;
    readonly unitPrice?: boolean;
    readonly categories?: boolean;
    readonly supplier?: boolean;
}

export interface ProductEcomChecks {
    readonly marketplaceTitle?: boolean;
    readonly description?: boolean;
    readonly dimensions?: boolean;
    readonly categories?: boolean;
    readonly images?: boolean;
}

export interface ProductSaveResult {
    readonly erpLegible: boolean;
    readonly ecomLegible: boolean;
    readonly checksErp: ProductErpChecks;
    readonly checksEcom: ProductEcomChecks;
    readonly product: Product;
}

export interface ProductSaveResultModalProps {
    readonly saveResult: ProductSaveResult | null;
    readonly onCloseModal: () => void;
    readonly onSuccess?: (newProduct: Product) => void;
    readonly onCloseForm: () => void;
    readonly setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
}

/**
 * Modal exibido após o salvamento de um produto, detalhando prontidão para ERP e Catálogo Digital.
 */
export const ProductSaveResultModal: React.FC<ProductSaveResultModalProps> = ({
    saveResult,
    onCloseModal,
    onSuccess,
    onCloseForm,
    setFormData,
}) => {
    const [currentProduct, setCurrentProduct] = useState<Product | null>(saveResult?.product ?? null);
    const [updatingErp, setUpdatingErp] = useState(false);
    const [updatingEcom, setUpdatingEcom] = useState(false);

    useEffect(() => {
        if (saveResult?.product) {
            setCurrentProduct(saveResult.product);
        }
    }, [saveResult]);

    useEffect(() => {
        if (!saveResult) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCloseModal();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [saveResult, onCloseModal]);

    if (!saveResult || !currentProduct) return null;

    const isERPActive = currentProduct.active !== false;
    const isCatalogPublished = currentProduct.status === 'published';

    const handleToggleErp = async () => {
        if (updatingErp) return;
        setUpdatingErp(true);
        const newActive = !isERPActive;
        const updatedData: Product = { ...currentProduct, active: newActive };
        try {
            await saveProduct(updatedData);
            setCurrentProduct(updatedData);
            setFormData((prev) => ({ ...prev, active: newActive }));
            toast.success(newActive ? 'Produto ativado no ERP!' : 'Produto desativado no ERP!');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Erro desconhecido';
            toast.error(`Erro ao atualizar ERP: ${message}`);
        } finally {
            setUpdatingErp(false);
        }
    };

    const handleToggleCatalog = async () => {
        if (updatingEcom) return;
        const newStatus = isCatalogPublished ? 'hidden' : 'published';

        if (newStatus === 'published' && !saveResult.ecomLegible) {
            toast.warning('Complete todos os requisitos pendentes antes de publicar no Catálogo.');
            return;
        }

        setUpdatingEcom(true);
        const updatedVariations = (currentProduct.variations || []).map(v => ({
            ...v,
            status: newStatus
        }));
        const updatedData: Product = { ...currentProduct, status: newStatus, variations: updatedVariations };
        try {
            await saveProduct(updatedData);
            setCurrentProduct(updatedData);
            setFormData((prev) => ({
                ...prev,
                status: newStatus,
                variations: (prev.variations || []).map(v => ({
                    ...v,
                    status: newStatus
                }))
            }));
            toast.success(
                newStatus === 'published'
                    ? 'Produto publicado no Catálogo Digital! 🛍️'
                    : 'Produto ocultado do Catálogo Digital!'
            );
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Erro desconhecido';
            toast.error(`Erro ao atualizar Catálogo: ${message}`);
        } finally {
            setUpdatingEcom(false);
        }
    };

    const handleFinish = () => {
        onCloseModal();
        if (onSuccess) onSuccess(currentProduct);
        onCloseForm();
    };

    return (
        <div
            className="fixed inset-0 z-[1000020] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-save-result-modal-title"
        >
            <button
                type="button"
                className="absolute inset-0 bg-transparent cursor-default"
                onClick={onCloseModal}
                aria-label="Fechar modal"
            />
            <div className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-xl animate-in zoom-in-95 duration-200 text-center max-h-[90vh] overflow-y-auto">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i className="bi bi-check-circle-fill text-2xl" aria-hidden="true" />
                </div>

                <h3 id="product-save-result-modal-title" className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Produto Cadastrado com Sucesso!
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1 mb-5">
                    Confira os requisitos de cada canal e ajuste o status de ativação:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-6">
                    {/* Canal ERP */}
                    <div className="p-4 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 flex flex-col justify-between gap-3">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <i className="bi bi-box-seam text-blue-600 dark:text-blue-400 text-base" aria-hidden="true" />
                                    <span className="text-xs font-black text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                                        ERP Interno
                                    </span>
                                </div>
                                <span
                                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                        isERPActive
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                            : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                    }`}
                                >
                                    {isERPActive ? 'Ativo' : 'Inativo'}
                                </span>
                            </div>

                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-2">
                                Requisitos do ERP:
                            </p>
                            <ul className="space-y-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                                <li className="flex items-center gap-2">
                                    <i
                                        className={`bi ${
                                            saveResult.checksErp?.description
                                                ? 'bi-check-circle-fill text-emerald-500'
                                                : 'bi-exclamation-circle-fill text-amber-500'
                                        }`}
                                        aria-hidden="true"
                                    />
                                    <span className="text-[11px]">Nome / Descrição</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <i
                                        className={`bi ${
                                            saveResult.checksErp?.unitPrice
                                                ? 'bi-check-circle-fill text-emerald-500'
                                                : 'bi-exclamation-circle-fill text-amber-500'
                                        }`}
                                        aria-hidden="true"
                                    />
                                    <span className="text-[11px]">Preço de Venda</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <i
                                        className={`bi ${
                                            saveResult.checksErp?.categories
                                                ? 'bi-check-circle-fill text-emerald-500'
                                                : 'bi-exclamation-circle-fill text-amber-500'
                                        }`}
                                        aria-hidden="true"
                                    />
                                    <span className="text-[11px]">Categoria Principal</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <i
                                        className={`bi ${
                                            saveResult.checksErp?.supplier
                                                ? 'bi-check-circle-fill text-emerald-500'
                                                : 'bi-exclamation-circle-fill text-amber-500'
                                        }`}
                                        aria-hidden="true"
                                    />
                                    <span className="text-[11px]">Fornecedor Vinculado</span>
                                </li>
                            </ul>
                        </div>

                        <button
                            type="button"
                            onClick={handleToggleErp}
                            disabled={updatingErp}
                            className={`w-full mt-3 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs ${
                                isERPActive
                                    ? 'bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 dark:bg-slate-800 dark:hover:bg-red-950/40 dark:text-slate-200 dark:hover:text-red-400'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                            }`}
                        >
                            <i className={`bi ${isERPActive ? 'bi-pause-circle-fill' : 'bi-play-circle-fill'}`} aria-hidden="true" />
                            {updatingErp ? 'Atualizando...' : isERPActive ? 'Desativar no ERP' : 'Ativar no ERP'}
                        </button>
                    </div>

                    {/* Canal Catálogo Digital */}
                    <div className="p-4 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 flex flex-col justify-between gap-3">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <i className="bi bi-globe2 text-purple-600 dark:text-purple-400 text-base" aria-hidden="true" />
                                    <span className="text-xs font-black text-purple-800 dark:text-purple-300 uppercase tracking-wider">
                                        Catálogo Digital
                                    </span>
                                </div>
                                <span
                                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                        isCatalogPublished
                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400'
                                            : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                    }`}
                                >
                                    {isCatalogPublished ? 'Publicado' : 'Não Publicado'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                    Requisitos do Catálogo:
                                </span>
                                <span
                                    className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                        saveResult.ecomLegible
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                                    }`}
                                >
                                    {saveResult.ecomLegible ? 'Pronto' : 'Pendências'}
                                </span>
                            </div>

                            <ul className="space-y-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                                <li className="flex items-center gap-2">
                                    <i
                                        className={`bi ${
                                            saveResult.checksEcom?.marketplaceTitle
                                                ? 'bi-check-circle-fill text-emerald-500'
                                                : 'bi-exclamation-circle-fill text-amber-500'
                                        }`}
                                        aria-hidden="true"
                                    />
                                    <span className="text-[11px]">Título do Catálogo</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <i
                                        className={`bi ${
                                            saveResult.checksEcom?.description
                                                ? 'bi-check-circle-fill text-emerald-500'
                                                : 'bi-exclamation-circle-fill text-amber-500'
                                        }`}
                                        aria-hidden="true"
                                    />
                                    <span className="text-[11px]">Descrição Completa</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <i
                                        className={`bi ${
                                            saveResult.checksEcom?.dimensions
                                                ? 'bi-check-circle-fill text-emerald-500'
                                                : 'bi-exclamation-circle-fill text-amber-500'
                                        }`}
                                        aria-hidden="true"
                                    />
                                    <span className="text-[11px]">Dimensões Físicas</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <i
                                        className={`bi ${
                                            saveResult.checksEcom?.categories
                                                ? 'bi-check-circle-fill text-emerald-500'
                                                : 'bi-exclamation-circle-fill text-amber-500'
                                        }`}
                                        aria-hidden="true"
                                    />
                                    <span className="text-[11px]">Categorias do Produto</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <i
                                        className={`bi ${
                                            saveResult.checksEcom?.images
                                                ? 'bi-check-circle-fill text-emerald-500'
                                                : 'bi-exclamation-circle-fill text-amber-500'
                                        }`}
                                        aria-hidden="true"
                                    />
                                    <span className="text-[11px]">Fotos do Produto</span>
                                </li>
                            </ul>
                        </div>

                        <div>
                            {!saveResult.ecomLegible && !isCatalogPublished && (
                                <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400 mb-1 text-center">
                                    💡 Complete os requisitos acima para publicar.
                                </p>
                            )}
                            <button
                                type="button"
                                disabled={updatingEcom || (!saveResult.ecomLegible && !isCatalogPublished)}
                                onClick={handleToggleCatalog}
                                className={`w-full py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${
                                    isCatalogPublished
                                        ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                                        : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20'
                                }`}
                            >
                                <i className={`bi ${isCatalogPublished ? 'bi-eye-slash-fill' : 'bi-globe2'}`} aria-hidden="true" />
                                {updatingEcom ? 'Atualizando...' : isCatalogPublished ? 'Despublicar do Catálogo' : 'Publicar no Catálogo'}
                            </button>
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleFinish}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all"
                >
                    Concluir
                </button>
            </div>
        </div>
    );
};

export default ProductSaveResultModal;
