import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../utils/supabaseConfig';
import type Product from '../../../../types/product.type';
import ProductFormModal from '../ProductFormModal';

const ProductCompositions = () => {
    const [compositions, setCompositions] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingComposition, setEditingComposition] = useState<Product | null>(null);

    useEffect(() => {
        loadCompositions();
    }, []);

    const loadCompositions = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('item_type', 'composition')
                .eq('deleted', false)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setCompositions(data as any[]);
        } catch (error) {
            console.error('Erro ao carregar composições:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNew = () => {
        setEditingComposition(null);
        setIsFormOpen(true);
    };

    const handleEdit = (comp: Product) => {
        setEditingComposition(comp);
        setIsFormOpen(true);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full animate-fade-in pb-24">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
                        <i className="bi bi-diagram-3-fill text-amber-500"></i>
                        Composições de Produtos
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                        Gerencie agrupamentos de produtos e variações sem gerar estoque físico independente.
                    </p>
                </div>
                
                <button
                    onClick={handleNew}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-2xl shadow-premium-sm transition-all active:scale-95"
                >
                    <i className="bi bi-plus-lg text-lg"></i>
                    Nova Composição
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center justify-center min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center text-slate-400">
                        <i className="bi bi-arrow-repeat animate-spin text-4xl mb-4"></i>
                        <p className="font-bold">Carregando composições...</p>
                    </div>
                ) : compositions.length === 0 ? (
                    <div className="text-center max-w-md">
                        <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="bi bi-diagram-3 text-3xl"></i>
                        </div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-2">Nenhuma composição cadastrada</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                            Crie composições para agrupar produtos (ex: "Cozinha Completa") e vendê-los como um único item, mantendo o controle de estoque dos componentes originais.
                        </p>
                    </div>
                ) : (
                    <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {compositions.map((comp) => (
                            <div key={comp.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                                <h3 className="font-bold text-slate-800 dark:text-slate-100">{comp.name || comp.description}</h3>
                                <p className="text-xs text-slate-500">{comp.sku || comp.code || '-'}</p>
                                <button onClick={() => handleEdit(comp)} className="mt-2 text-sm text-blue-600 dark:text-blue-400 font-bold hover:underline self-start">Editar Composição</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isFormOpen && (
                <ProductFormModal 
                    isOpen={isFormOpen} 
                    onClose={() => setIsFormOpen(false)} 
                    product={editingComposition}
                    initialData={!editingComposition ? { itemType: 'composition' } : undefined}
                    onSave={() => loadCompositions()} 
                />
            )}
        </div>
    );
};

export default ProductCompositions;
