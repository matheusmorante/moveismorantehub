import React from 'react';
import Product from '../../../../types/product.type';
import { saveProduct } from '@/pages/utils/productService';
import { toast } from 'react-toastify';

interface ProductSaveResultModalProps {
    saveResult: { erpLegible: boolean; ecomLegible: boolean; checksErp: any; checksEcom: any; product: Product } | null;
    onCloseModal: () => void;
    onSuccess?: (newProduct: Product) => void;
    onCloseForm: () => void;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
}

export const ProductSaveResultModal: React.FC<ProductSaveResultModalProps> = ({
    saveResult,
    onCloseModal,
    onSuccess,
    onCloseForm,
    setFormData
}) => {
    if (!saveResult || saveResult.product.status === 'published') return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 text-center">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="bi bi-check-circle-fill text-2xl"></i>
                </div>

                <h3 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Produto Salvo com Sucesso!</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 mb-6">Deseja publicar no catálogo digital?</p>

                {/* Checklist do Catálogo */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 flex flex-col gap-4 text-left mb-6">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-purple-600 uppercase tracking-widest">
                            Catálogo
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${saveResult.ecomLegible ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'}`}>
                            {saveResult.ecomLegible ? 'Pronto para publicar' : 'Pendências'}
                        </span>
                    </div>

                    <ul className="space-y-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                        <li className="flex items-center justify-between p-1.5 rounded-xl">
                            <div className="flex items-center gap-2">
                                <i className={`bi ${saveResult.checksEcom.marketplaceTitle ? 'bi-check-circle-fill text-emerald-500' : 'bi-exclamation-circle-fill text-amber-500'}`}></i>
                                <span className={saveResult.checksEcom.marketplaceTitle ? 'text-slate-700 dark:text-slate-200' : 'text-amber-600 dark:text-amber-400 font-bold'}>Título do Catálogo</span>
                            </div>
                        </li>
                        <li className="flex items-center justify-between p-1.5 rounded-xl">
                            <div className="flex items-center gap-2">
                                <i className={`bi ${saveResult.checksEcom.dimensions ? 'bi-check-circle-fill text-emerald-500' : 'bi-exclamation-circle-fill text-amber-500'}`}></i>
                                <span className={saveResult.checksEcom.dimensions ? 'text-slate-700 dark:text-slate-200' : 'text-amber-600 dark:text-amber-400 font-bold'}>Dimensões Físicas</span>
                            </div>
                        </li>
                        <li className="flex items-center justify-between p-1.5 rounded-xl">
                            <div className="flex items-center gap-2">
                                <i className={`bi ${saveResult.checksEcom.categories ? 'bi-check-circle-fill text-emerald-500' : 'bi-exclamation-circle-fill text-amber-500'}`}></i>
                                <span className={saveResult.checksEcom.categories ? 'text-slate-700 dark:text-slate-200' : 'text-amber-600 dark:text-amber-400 font-bold'}>Categorias do Produto</span>
                            </div>
                        </li>
                        <li className="flex items-center justify-between p-1.5 rounded-xl">
                            <div className="flex items-center gap-2">
                                <i className={`bi ${saveResult.checksEcom.images ? 'bi-check-circle-fill text-emerald-500' : 'bi-exclamation-circle-fill text-amber-500'}`}></i>
                                <span className={saveResult.checksEcom.images ? 'text-slate-700 dark:text-slate-200' : 'text-amber-600 dark:text-amber-400 font-bold'}>Imagens do Produto</span>
                            </div>
                        </li>
                    </ul>
                </div>

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            const prod = saveResult.product;
                            onCloseModal();
                            if (onSuccess) onSuccess(prod);
                            onCloseForm();
                        }}
                        className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                        Concluir
                    </button>
                    <button
                        type="button"
                        disabled={!saveResult.ecomLegible}
                        onClick={async () => {
                            const updatedData = { ...saveResult.product, status: 'published' } as Product;
                            try {
                                await saveProduct(updatedData);
                                setFormData(prev => ({ ...prev, status: 'published' }));
                                toast.success("Produto publicado no Catálogo Digital!");
                            } catch (err: any) {
                                toast.error(`Erro ao publicar: ${err.message}`);
                            }
                            onCloseModal();
                            if (onSuccess) onSuccess(updatedData);
                            onCloseForm();
                        }}
                        className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-purple-500/30 transition-all flex items-center justify-center gap-2"
                    >
                        <i className="bi bi-globe2"></i>
                        Publicar
                    </button>
                </div>
            </div>
        </div>
    );
};
