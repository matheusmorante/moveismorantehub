import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/pages/utils/supabaseConfig';
import { toast } from "react-toastify";

interface ProductMaterial {
    id: string;
    name: string;
    created_at?: string;
}

interface ProductMaterialManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMaterialChange?: () => void;
}

const ProductMaterialManagementModal = ({ isOpen, onClose, onMaterialChange }: ProductMaterialManagementModalProps) => {
    const [materials, setMaterials] = useState<ProductMaterial[]>([]);
    const [newName, setNewName] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    const fetchMaterials = async () => {
        setFetching(true);
        try {
            const { data, error } = await supabase
                .from('product_materials')
                .select('*')
                .order('name', { ascending: true });
            
            if (error) {
                console.error("Erro ao buscar materiais:", error);
                if (error.code === '42P01') {
                     toast.info("Aguarde a execução do SQL de migração para carregar os materiais.");
                }
            } else {
                setMaterials(data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchMaterials();
    }, [isOpen]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const value = newName.trim().toUpperCase();
        if (!value) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('product_materials')
                .insert([{ name: value }]);

            if (error) {
                if (error.code === '23505') throw new Error("Este material já existe!");
                throw error;
            }
            
            setNewName('');
            toast.success("Material adicionado!");
            fetchMaterials();
            if (onMaterialChange) onMaterialChange();
        } catch (error: any) {
            toast.error(error.message || "Erro ao adicionar material.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (material: ProductMaterial) => {
        if (!confirm(`Tem certeza que deseja remover o material "${material.name}"?`)) return;

        try {
            // Verificar se existem produtos usando este material
            const { count, error: checkError } = await supabase
                .from('products')
                .select('id', { count: 'exact', head: true })
                .eq('material', material.name)
                .is('deleted', false);

            if (checkError) throw checkError;

            if (count && count > 0) {
                toast.error(`Não é possível remover: Existem ${count} produtos vinculados a este material.`);
                return;
            }

            const { error } = await supabase
                .from('product_materials')
                .delete()
                .eq('id', material.id);

            if (error) throw error;
            toast.success("Material removido!");
            fetchMaterials();
            if (onMaterialChange) onMaterialChange();
        } catch (error) {
            toast.error("Erro ao remover material.");
            console.error(error);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/20">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                             <i className="bi bi-hammer text-blue-600"></i> Materiais de Móveis
                        </h2>
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mt-1">Gerenciar lista de materiais</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 transition-all">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="p-8 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                    <form onSubmit={handleAdd} className="flex gap-2">
                        <input 
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="EX: MDP, MADEIRA MACIÇA..."
                            className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 uppercase"
                        />
                        <button 
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50"
                        >
                            {loading ? "..." : "Adicionar"}
                        </button>
                    </form>

                    <div className="space-y-2">
                        {fetching ? (
                            <div className="py-10 text-center animate-pulse">
                                <i className="bi bi-arrow-repeat text-2xl text-slate-300"></i>
                            </div>
                        ) : materials.length === 0 ? (
                            <div className="py-10 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest italic leading-relaxed">
                                Nenhum material cadastrado.<br/>
                                <span className="text-[8px]">Certifique-se de rodar o SQL de migração.</span>
                            </div>
                        ) : (
                            materials.map(mat => (
                                <div key={mat.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl group border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all">
                                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">{mat.name}</span>
                                    <button 
                                        onClick={() => handleDelete(mat)}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                                        title="Remover material"
                                    >
                                        <i className="bi bi-trash"></i>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="p-8 border-t border-slate-50 dark:border-slate-800">
                    <button 
                        onClick={onClose}
                        className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                    >
                        Concluir e Fechar
                    </button>
                </div>
            </div>
        </div>
    , document.body);
};

export default ProductMaterialManagementModal;
