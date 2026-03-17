import React, { useState, useEffect } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { toast } from "react-toastify";

interface BaseItem {
    id: string;
    name: string;
    created_at?: string;
}

export default function ProductCatalogConfigSection() {
    const [materials, setMaterials] = useState<BaseItem[]>([]);
    const [productTypes, setProductTypes] = useState<BaseItem[]>([]);
    
    const [newMaterial, setNewMaterial] = useState('');
    const [newType, setNewType] = useState('');
    
    const [loadingMaterial, setLoadingMaterial] = useState(false);
    const [loadingType, setLoadingType] = useState(false);
    
    const [fetching, setFetching] = useState(false);

    const fetchData = async () => {
        setFetching(true);
        try {
            const [materialsRes, typesRes] = await Promise.all([
                supabase.from('product_materials').select('*').order('name'),
                supabase.from('product_types').select('*').order('name')
            ]);
            
            if (materialsRes.data) setMaterials(materialsRes.data);
            if (typesRes.data) setProductTypes(typesRes.data);
            
        } catch (err) {
            console.error(err);
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        const value = newMaterial.trim().toUpperCase();
        if (!value) return;
        setLoadingMaterial(true);
        try {
            const { error } = await supabase.from('product_materials').insert([{ name: value }]);
            if (error) {
                 if (error.code === '23505') throw new Error("Atenção: Este material já existe!");
                 throw error;
            }
            setNewMaterial('');
            toast.success("Material adicionado!");
            fetchData();
        } catch (error: any) {
            toast.error(error.message || "Erro ao adicionar material.");
        } finally {
            setLoadingMaterial(false);
        }
    };

    const handleAddType = async (e: React.FormEvent) => {
        e.preventDefault();
        const value = newType.trim().toUpperCase();
        if (!value) return;
        setLoadingType(true);
        try {
            const { error } = await supabase.from('product_types').insert([{ name: value }]);
            if (error) {
                 if (error.code === '23505') throw new Error("Atenção: Este tipo já existe!");
                 throw error;
            }
            setNewType('');
            toast.success("Tipo de móvel adicionado!");
            fetchData();
        } catch (error: any) {
            toast.error(error.message || "Erro ao adicionar tipo.");
        } finally {
            setLoadingType(false);
        }
    };

    const handleDeleteMaterial = async (item: BaseItem) => {
        if (!confirm(`Remover material "${item.name}"?`)) return;
        try {
            const { count } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('material', item.name).is('deleted', false);
            if (count && count > 0) return toast.error(`Não é possível remover: Uso detectado em ${count} produtos.`);
            await supabase.from('product_materials').delete().eq('id', item.id);
            toast.success("Material removido com sucesso!");
            fetchData();
        } catch (error) { toast.error("Erro ao remover material."); }
    };

    const handleDeleteType = async (item: BaseItem) => {
        if (!confirm(`Remover tipo de móvel "${item.name}"?`)) return;
        try {
            // Verificar se existem produtos usando este tipo
            const { count } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('product_type_id', item.id).is('deleted', false);
            if (count && count > 0) return toast.error(`Não é possível remover: Este tipo está vinculado a ${count} produtos.`);
            
            const { error } = await supabase.from('product_types').delete().eq('id', item.id);
            if (error) throw error;
            toast.success("Tipo removido com sucesso!");
            fetchData();
        } catch (error) { toast.error("Erro ao remover tipo."); }
    };

    return (
        <div className="p-8 flex flex-col gap-12 divide-y divide-slate-100 dark:divide-slate-800">
            {/* Secção Materiais */}
            <div className="flex flex-col gap-8">
                <div id="materiais" className="scroll-mt-40">
                    <h4 className="font-black text-slate-800 dark:text-slate-200 text-sm uppercase tracking-widest flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                            <i className="bi bi-hammer"></i>
                        </div>
                        Materiais de Móveis
                    </h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">Gerencie a lista de materiais disponíveis para os móveis físicos.</p>
                </div>

                <form onSubmit={handleAddMaterial} className="flex gap-3 max-w-xl">
                    <input 
                        value={newMaterial}
                        onChange={(e) => setNewMaterial(e.target.value)}
                        placeholder="EX: MDP, MADEIRA MACIÇA, VIDRO..."
                        className="flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold uppercase focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
                    />
                    <button type="submit" disabled={loadingMaterial} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/20 disabled:opacity-50">
                        {loadingMaterial ? "..." : "Adicionar"}
                    </button>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {materials.length === 0 && !fetching && (
                        <div className="col-span-full py-10 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest italic border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem]">
                            Nenhum material cadastrado.
                        </div>
                    )}
                    {materials.map(mat => (
                        <div key={mat.id} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[2rem] group hover:border-blue-200 dark:hover:border-blue-900/30 transition-all">
                            <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">{mat.name}</span>
                            <button onClick={() => handleDeleteMaterial(mat)} className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all active:scale-90">
                                <i className="bi bi-trash text-lg"></i>
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Secção Tipos de Móveis */}
            <div className="flex flex-col gap-8 pt-12">
                <div id="tipos-moveis" className="scroll-mt-40">
                    <h4 className="font-black text-slate-800 dark:text-slate-200 text-sm uppercase tracking-widest flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
                            <i className="bi bi-ui-checks-grid"></i>
                        </div>
                        Tipos de Móveis (Base do Título)
                    </h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">Gerencie os tipos básicos usados para compor a primeira parte do título automático dos produtos.</p>
                </div>

                <form onSubmit={handleAddType} className="flex gap-3 max-w-xl">
                    <input 
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                        placeholder="EX: BALCÃO DE PIA, GUARDA ROUPAS, COZINHA..."
                        className="flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold uppercase focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-sm"
                    />
                    <button type="submit" disabled={loadingType} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-500/20 disabled:opacity-50">
                        {loadingType ? "..." : "Adicionar"}
                    </button>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {productTypes.length === 0 && !fetching && (
                        <div className="col-span-full py-10 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest italic border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem]">
                            Nenhum tipo cadastrado.
                        </div>
                    )}
                    {productTypes.map(type => (
                        <div key={type.id} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[2rem] group hover:border-emerald-200 dark:hover:border-emerald-900/30 transition-all">
                            <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">{type.name}</span>
                            <button onClick={() => handleDeleteType(type)} className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all active:scale-90">
                                <i className="bi bi-trash text-lg"></i>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
