import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/pages/utils/supabaseConfig';
import { toast } from 'react-toastify';

export interface ProductType {
    readonly id: string;
    readonly name: string;
    readonly created_at?: string;
}

export interface ProductTypeManagementModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
}

/**
 * Modal para gerenciar categorias de títulos e tipos de produtos cadastrados.
 */
export const ProductTypeManagementModal: React.FC<ProductTypeManagementModalProps> = ({
    isOpen,
    onClose,
}) => {
    const [types, setTypes] = useState<ProductType[]>([]);
    const [newName, setNewName] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    const fetchTypes = useCallback(async () => {
        setFetching(true);
        try {
            const { data, error } = await supabase
                .from('product_types')
                .select('*')
                .order('name', { ascending: true });

            if (error) {
                console.error('Erro ao buscar tipos:', error);
                if (error.code === 'PGRST116' || error.code === '42P01') {
                    toast.info('Tabela de tipos será criada automaticamente no primeiro insert.');
                }
            } else {
                setTypes((data as ProductType[]) || []);
            }
        } catch (err: unknown) {
            console.error('Falha ao listar tipos:', err);
        } finally {
            setFetching(false);
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        fetchTypes();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, fetchTypes, onClose]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const value = newName.trim().toUpperCase();
        if (!value) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('product_types')
                .insert([{ name: value }]);

            if (error) throw error;

            setNewName('');
            toast.success('Tipo adicionado!');
            await fetchTypes();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Erro ao adicionar tipo.';
            toast.error(message);
            console.error('Falha ao adicionar tipo:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja remover este tipo?')) return;

        try {
            const { error } = await supabase
                .from('product_types')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Tipo removido!');
            await fetchTypes();
        } catch (error: unknown) {
            toast.error('Erro ao remover tipo.');
            console.error('Falha ao remover tipo:', error);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-type-modal-title"
        >
            <button
                type="button"
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-default"
                onClick={onClose}
                aria-label="Fechar modal"
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/20">
                    <div>
                        <h2 id="product-type-modal-title" className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                            Categorias de Títulos
                        </h2>
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mt-1">
                            Gerenciar nomes base para montagem automática
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                        aria-label="Fechar modal"
                    >
                        <i className="bi bi-x-lg" aria-hidden="true" />
                    </button>
                </div>

                <div className="p-8 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                    <form onSubmit={handleAdd} className="flex gap-2">
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="EX: BALCÃO DE PIA"
                            className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 uppercase dark:text-slate-200"
                        />
                        <button
                            type="submit"
                            disabled={loading || !newName.trim()}
                            className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50"
                        >
                            {loading ? '...' : 'Add'}
                        </button>
                    </form>

                    <div className="space-y-2">
                        {fetching ? (
                            <div className="py-10 text-center animate-pulse">
                                <i className="bi bi-arrow-repeat text-2xl text-slate-300" aria-hidden="true" />
                            </div>
                        ) : types.length === 0 ? (
                            <div className="py-10 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest italic">
                                Nenhuma categoria cadastrada.
                            </div>
                        ) : (
                            types.map((t) => (
                                <div
                                    key={t.id}
                                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl group border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all"
                                >
                                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                                        {t.name}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(t.id)}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                                        title="Remover tipo"
                                        aria-label={`Remover tipo ${t.name}`}
                                    >
                                        <i className="bi bi-trash" aria-hidden="true" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="p-8 border-t border-slate-50 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ProductTypeManagementModal;
