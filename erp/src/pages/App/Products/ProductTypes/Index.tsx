import React, { useState, useEffect } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { toast } from "react-toastify";

interface ProductType {
    id: string;
    name: string;
    created_at?: string;
}

const ProductTypes = () => {
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
                console.error("Erro ao buscar tipos:", error);
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
        fetchTypes();
    }, []);

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

    return (
        <div className="p-4 md:p-8 flex flex-col gap-8 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
                    <i className="bi bi-tag-fill text-blue-600"></i>
                    Gestão de Tipos de Móveis
                </h1>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    PADRONIZE OS PREFIXOS DOS TÍTULOS DOS SEUS PRODUTOS
                </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 p-8 shadow-premium-lg flex flex-col gap-8">
                <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <i className="bi bi-plus-circle absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input 
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="EX: BALCÃO DE PIA, TORRE QUENTE, ARMÁRIO..."
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-black focus:ring-4 focus:ring-blue-500/10 uppercase tracking-tight transition-all"
                        />
                    </div>
                    <button 
                        type="submit"
                        disabled={loading}
                        className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <i className="bi bi-plus-lg"></i>
                        )}
                        Adicionar Novo Tipo
                    </button>
                </form>

                <div className="space-y-3">
                    <div className="flex items-center justify-between px-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipos Cadastrados</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{types.length} Itens</span>
                    </div>

                    {fetching ? (
                        <div className="py-20 text-center">
                            <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 animate-pulse">Carregando...</p>
                        </div>
                    ) : types.length === 0 ? (
                        <div className="py-20 text-center bg-slate-50/50 dark:bg-slate-950/20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                            <i className="bi bi-inbox text-4xl text-slate-200 dark:text-slate-800 mb-4 block"></i>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Nenhum tipo cadastrado ainda.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {types.map(t => (
                                <div key={t.id} className="flex items-center justify-between p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl group hover:border-blue-200 dark:hover:border-blue-900/50 hover:shadow-premium-sm transition-all animate-in fade-in duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xs">
                                            {t.name.charAt(0)}
                                        </div>
                                        <span className="text-sm font-black text-slate-700 dark:text-slate-200 tracking-tight">{t.name}</span>
                                    </div>
                                    <button 
                                        onClick={() => handleDelete(t.id)}
                                        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 md:opacity-0 group-hover:opacity-100 transition-all"
                                        title="Remover este tipo"
                                    >
                                        <i className="bi bi-trash-fill text-sm"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="p-8 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-[2.5rem] flex items-start gap-4">
                <i className="bi bi-info-circle-fill text-amber-600 mt-1"></i>
                <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-400 mb-1">Dica de Gestão</h4>
                    <p className="text-[11px] text-amber-700/80 dark:text-amber-400/70 font-bold leading-relaxed">
                        Mantenha os nomes curtos e em letras maiúsculas para que os títulos dos produtos fiquem padronizados no catálogo e e-commerce. Ex: use "BALCÃO" em vez de "Balcão para cozinha".
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ProductTypes;
