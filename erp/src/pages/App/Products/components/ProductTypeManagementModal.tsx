import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/pages/utils/supabaseConfig';
import { toast } from "react-toastify";

interface ProductType {
    id: string;
    name: string;
    created_at?: string;
}

interface ProductTypeManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ProductTypeManagementModal = ({ isOpen, onClose }: ProductTypeManagementModalProps) => {
    const [types, setTypes] = useState<ProductType[]>([]);
    const [newName, setNewName] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    const fetchTypes = async () => {
        setFetching(true);
        try {
            const { data, error } = await supabase
                .from('product_types')
                .select('*')
                .order('name', { ascending: true });
            
            if (error) {
                // Se a tabela não existir, vamos avisar ou criar? 
                // Assumindo que a migração DB será feita depois ou via RPC.
                console.error("Erro ao buscar tipos:", error);
                if (error.code === 'PGRST116' || error.code === '42P01') {
                     toast.info("Tabela de tipos será criada automaticamente no primeiro insert.");
                }
            } else {
                setTypes(data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchTypes();
    }, [isOpen]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('product_types')
                .insert([{ name: newName.trim().toUpperCase() }]);

            if (error) throw error;
            
            setNewName('');
            toast.success("Tipo adicionado!");
            fetchTypes();
        } catch (error: any) {
            toast.error("Erro ao adicionar tipo.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja remover este tipo?")) return;

        try {
            const { error } = await supabase
                .from('product_types')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success("Tipo removido!");
            fetchTypes();
        } catch (error) {
            toast.error("Erro ao remover tipo.");
            console.error(error);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/20">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Categorias de Títulos</h2>
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mt-1">Gerenciar nomes base para montagem automática</p>
                    </div>
                </div>

                <div className="p-8 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                    <form onSubmit={handleAdd} className="flex gap-2">
                        <input 
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="EX: BALCÃO DE PIA"
                            className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 uppercase"
                        />
                        <button 
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50"
                        >
                            {loading ? "..." : "Add"}
                        </button>
                    </form>

                    <div className="space-y-2">
                        {fetching ? (
                            <div className="py-10 text-center animate-pulse">
                                <i className="bi bi-arrow-repeat text-2xl text-slate-300"></i>
                            </div>
                        ) : types.length === 0 ? (
                            <div className="py-10 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest italic">
                                Nenhuma categoria cadastrada.
                            </div>
                        ) : (
                            types.map(t => (
                                <div key={t.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl group border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all">
                                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">{t.name}</span>
                                    <button 
                                        onClick={() => handleDelete(t.id)}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
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
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    , document.body);
};

export default ProductTypeManagementModal;
