import React, { useState, useEffect } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';

interface ProductReference {
    id: string;
    master_name: string;
    reference_name: string;
}

interface ProductReferenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableProducts: string[];
}

const ProductReferenceModal: React.FC<ProductReferenceModalProps> = ({ 
    isOpen, onClose, availableProducts 
}) => {
    const [references, setReferences] = useState<ProductReference[]>([]);
    const [loading, setLoading] = useState(false);
    const [newMaster, setNewMaster] = useState('');
    const [newReference, setNewReference] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen) fetchReferences();
    }, [isOpen]);

    const fetchReferences = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('product_references')
            .select('*')
            .order('master_name', { ascending: true });
        
        if (error) {
            console.error('Erro ao buscar referências:', error);
        } else {
            setReferences(data || []);
        }
        setLoading(false);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMaster || !newReference) return;

        setLoading(true);
        const { error } = await supabase
            .from('product_references')
            .insert([{ master_name: newMaster, reference_name: newReference }]);

        if (error) {
            alert('Erro ao adicionar referência: ' + error.message);
        } else {
            setNewReference('');
            fetchReferences();
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja excluir esta referência?')) return;
        
        setLoading(true);
        const { error } = await supabase
            .from('product_references')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Erro ao excluir: ' + error.message);
        } else {
            fetchReferences();
        }
        setLoading(false);
    };

    const filteredReferences = references.filter(r => 
        r.master_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.reference_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
            <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[85vh]">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
                            <i className="bi bi-link-45deg text-indigo-600 text-3xl"></i> Referências de Produtos
                        </h2>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Mapeie vários nomes para um único produto mestre</span>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 hover:text-red-500 transition-all">
                        <i className="bi bi-x-lg text-xl"></i>
                    </button>
                </div>

                <div className="p-8 bg-slate-50/50 dark:bg-slate-955 border-b border-slate-100 dark:border-slate-800">
                    <form onSubmit={handleAdd} className="flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Nome Mestre (Como aparecerá no relatório)</label>
                            <input 
                                type="text" 
                                list="products"
                                value={newMaster}
                                onChange={(e) => setNewMaster(e.target.value)}
                                placeholder="Ex: Guarda-Roupa Sidney"
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Referência (Nome original no sistema)</label>
                            <input 
                                type="text" 
                                list="products"
                                value={newReference}
                                onChange={(e) => setNewReference(e.target.value)}
                                placeholder="Ex: G.Roupa Sidney Branco 3p"
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            />
                        </div>
                        <button 
                            type="submit"
                            disabled={loading || !newMaster || !newReference}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
                        >
                            Vincular
                        </button>
                        
                        <datalist id="products">
                            {availableProducts.map(p => <option key={p} value={p} />)}
                        </datalist>
                    </form>
                </div>

                <div className="px-8 py-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative">
                        <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input 
                            type="text" 
                            placeholder="Pesquisar vínculos..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-955 border border-transparent rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:bg-white dark:focus:bg-slate-900 border-slate-200 dark:border-slate-800 transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    {loading && references.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-40">
                            <i className="bi bi-arrow-clockwise animate-spin text-4xl mb-4"></i>
                            <p className="text-xs font-black uppercase tracking-widest">Carregando referências...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {filteredReferences.map((ref) => (
                                <div key={ref.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-955 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all">
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Original</span>
                                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{ref.reference_name}</span>
                                        </div>
                                        <i className="bi bi-arrow-right text-indigo-400"></i>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-0.5">Mestre</span>
                                            <span className="text-[11px] font-black text-slate-800 dark:text-slate-100">{ref.master_name}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDelete(ref.id)}
                                        className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-slate-300 hover:text-red-500 hover:shadow-md transition-all sm:opacity-0 group-hover:opacity-100"
                                    >
                                        <i className="bi bi-trash3-fill text-sm"></i>
                                    </button>
                                </div>
                            ))}
                            {filteredReferences.length === 0 && (
                                <div className="text-center py-20">
                                    <i className="bi bi-link-45deg text-4xl text-slate-200 dark:text-slate-800 mb-4 block"></i>
                                    <p className="text-xs font-bold text-slate-400">Nenhuma referência encontrada.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-8 border-t border-slate-100 dark:border-slate-800">
                    <button 
                        onClick={onClose}
                        className="w-full py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl"
                    >
                        Concluído
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductReferenceModal;
