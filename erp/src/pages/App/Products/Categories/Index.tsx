import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { fetchGroupsAndCategories, createCategory, updateCategory, deleteCategory, updateCategoryChildren, generateSlug } from '@/pages/utils/categoryService';
import { supabase } from '@/pages/utils/supabaseConfig';

const FIXED_ENVIRONMENTS = ["SALA DE JANTAR", "SALA DE ESTAR", "COZINHA", "QUARTO", "LAVANDERIA", "BANHEIRO", "LAVANDEIRA", "ESCRITORIO", "ESCRITÓRIO", "VARANDA", "ÁREA GOURMET", "GARAGEM"];

const Categories = () => {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Form States
    const [showModal, setShowModal] = useState<"ambiente" | "categoria" | null>(null);
    const [editingNode, setEditingNode] = useState<any>(null);
    const [nameInput, setNameInput] = useState("");
    const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>([]);
    const [selectedChildren, setSelectedChildren] = useState<string[]>([]);

    const [activeViewTab, setActiveViewTab] = useState<'ambientes' | 'categorias'>('ambientes');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async (silent: boolean = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const data = await fetchGroupsAndCategories();
            setCategories(data.categories);
        } catch (error) {
            toast.error("Erro ao carregar dados.");
        } finally {
            if (!silent) setLoading(false);
            else setRefreshing(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = nameInput.trim().toUpperCase();
        if (!name) return toast.error("O nome não pode estar vazio.");

        const isEnv = showModal === "ambiente";
        const duplicate = categories.find(c => c.name.trim().toUpperCase() === name && c.id !== editingNode?.id);
        if (duplicate) {
            return toast.error(`Já existe um ${isEnv ? 'Ambiente' : 'Categoria'} com o nome "${name}".`);
        }

        try {
            if (editingNode?.id) {
                // Update
                await updateCategory(editingNode.id, name, isEnv ? [] : selectedEnvironments, {});
                if (isEnv) {
                    await updateCategoryChildren(editingNode.id, selectedChildren);
                }
                toast.success(isEnv ? "Ambiente atualizado!" : "Categoria atualizada!");
            } else {
                // Create
                const newCat = await createCategory(name, isEnv ? [] : selectedEnvironments, {
                    slug: generateSlug(name),
                    meta_title: name + " | Móveis Morante"
                });
                if (isEnv && selectedChildren.length > 0) {
                    await updateCategoryChildren(newCat.id, selectedChildren);
                }
                toast.success(isEnv ? "Ambiente criado!" : "Categoria criada!");
            }
            closeForm();
            loadData(true);
        } catch (error) {
            toast.error("Erro ao salvar.");
        }
    };

    const handleDelete = async (id: string, isEnv: boolean) => {
        if (isEnv) {
            const { data } = await supabase.from('category_relationships').select('child_id').eq('parent_id', id).limit(1);
            if (data && data.length > 0) {
                return toast.error("Este ambiente possui categorias vinculadas e não pode ser excluído.");
            }
        } else {
            const { data } = await supabase.from('product_categories').select('product_id').eq('category_id', id).limit(1);
            if (data && data.length > 0) {
                return toast.error("Esta categoria possui produtos vinculados e não pode ser excluída.");
            }
        }

        if (!window.confirm(`Deseja excluir este ${isEnv ? 'ambiente' : 'categoria'} permanentemente?`)) return;

        try {
            await deleteCategory(id);
            toast.success(isEnv ? "Ambiente excluído!" : "Categoria excluída!");
            loadData(true);
        } catch (error) {
            toast.error("Erro ao excluir.");
        }
    };

    const closeForm = () => {
        setShowModal(null);
        setEditingNode(null);
        setNameInput("");
        setSelectedEnvironments([]);
        setSelectedChildren([]);
    };

    const openEdit = (node: any, isEnv: boolean) => {
        setEditingNode(node);
        setNameInput(node.name);
        if (isEnv) {
            setShowModal("ambiente");
            const childrenIds = categories.filter(c => c.parents?.includes(node.id)).map(c => c.id);
            setSelectedChildren(childrenIds);
        } else {
            setShowModal("categoria");
            setSelectedEnvironments(node.parents || []);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // Organizar ambientes e subcategorias baseados nas regras anteriores
    const environments = (categories || []).filter(c => {
        const name = c.name?.trim().toUpperCase() || '';
        return FIXED_ENVIRONMENTS.includes(name) || !c.parents || c.parents.length === 0;
    });
    const subCategories = (categories || []).filter(c => !environments.some(e => e.id === c.id));

    return (
        <div className="p-4 md:p-8 flex flex-col gap-6 max-w-5xl mx-auto w-full animate-in fade-in duration-300">
            {/* Header com título e abas de visualização */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
                        <i className="bi bi-tag-fill text-blue-600"></i>
                        Gerenciar
                    </h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Organize seus ambientes e categorias de produtos
                    </p>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveViewTab('ambientes')}
                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeViewTab === 'ambientes' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Ambientes
                    </button>
                    <button
                        onClick={() => setActiveViewTab('categorias')}
                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeViewTab === 'categorias' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Categorias
                    </button>
                </div>
            </div>
            
            {/* Exibição condicional baseada na aba ativa */}
            <div className="w-full">
                
                {/* Painel de Ambientes */}
                {activeViewTab === 'ambientes' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <i className="bi bi-grid-fill text-blue-500"></i> Ambientes
                            </h2>
                            <button
                                onClick={() => { setShowModal("ambiente"); }}
                                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-1.5"
                            >
                                <i className="bi bi-plus-lg"></i> Novo Ambiente
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800">
                                        <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Nome</th>
                                        <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Filhos</th>
                                        <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {environments.map(env => {
                                        const childrenList = subCategories.filter(sub => sub.parents?.includes(env.id));
                                        return (
                                            <tr key={env.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                                <td className="py-3 font-bold text-xs text-slate-850 dark:text-slate-200 uppercase">{env.name}</td>
                                                <td className="py-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {childrenList.map(c => (
                                                            <span key={c.id} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-850 border border-slate-200/50 dark:border-slate-850 rounded-lg text-[9px] font-black text-slate-400 uppercase">
                                                                {c.name}
                                                            </span>
                                                        ))}
                                                        {childrenList.length === 0 && <span className="text-[10px] text-slate-300 italic">Nenhum</span>}
                                                    </div>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button onClick={() => openEdit(env, true)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                                                            <i className="bi bi-pencil"></i>
                                                        </button>
                                                        <button onClick={() => handleDelete(env.id, true)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Painel de Categorias */}
                {activeViewTab === 'categorias' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <i className="bi bi-list-task text-blue-500"></i> Categorias
                            </h2>
                            <button
                                onClick={() => { setShowModal("categoria"); }}
                                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-1.5"
                            >
                                <i className="bi bi-plus-lg"></i> Nova Categoria
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800">
                                        <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Nome</th>
                                        <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Ambientes</th>
                                        <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {subCategories.map(cat => {
                                        const parentNames = (cat.parents || [])
                                            .map((pid: string) => environments.find(e => e.id === pid)?.name)
                                            .filter(Boolean);
                                        return (
                                            <tr key={cat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                                <td className="py-3 font-bold text-xs text-slate-850 dark:text-slate-200 uppercase">{cat.name}</td>
                                                <td className="py-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {parentNames.map((pName, idx) => (
                                                            <span key={idx} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 rounded-lg text-[9px] font-black uppercase">
                                                                {pName}
                                                            </span>
                                                        ))}
                                                        {parentNames.length === 0 && <span className="text-[10px] text-slate-350 italic">Sem Ambiente</span>}
                                                    </div>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button onClick={() => openEdit(cat, false)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                                                            <i className="bi bi-pencil"></i>
                                                        </button>
                                                        <button onClick={() => handleDelete(cat.id, false)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>

            {/* Modal para formulário unificado */}
            {showModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeForm} />
                    <form onSubmit={handleSave} className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-slate-100 dark:border-slate-800 flex flex-col gap-4 animate-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b pb-3">
                            <h3 className="text-base font-bold text-slate-850 dark:text-slate-100">
                                Novo Item
                            </h3>
                            <button type="button" onClick={closeForm} className="text-slate-400 hover:text-slate-650 transition-colors">
                                <i className="bi bi-x-lg text-lg"></i>
                            </button>
                        </div>

                        {/* Tipo Selector */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-500">Tipo</label>
                            <select
                                value={showModal}
                                onChange={(e) => {
                                    const val = e.target.value as "ambiente" | "categoria";
                                    setShowModal(val);
                                    setSelectedChildren([]);
                                    setSelectedEnvironments([]);
                                }}
                                className="w-full max-w-[150px] px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold"
                            >
                                <option value="ambiente">Ambiente</option>
                                <option value="categoria">Categoria</option>
                            </select>
                        </div>

                        {/* Vincular a Categorias/Ambientes */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-500">
                                {showModal === "ambiente" ? "Vincular a Categorias" : "Vincular a Ambientes"}
                            </label>
                            <div className="border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 max-h-48 overflow-y-auto p-3 grid grid-cols-2 gap-2 custom-scrollbar">
                                {showModal === "ambiente" ? (
                                    subCategories.map(cat => {
                                        const isChecked = selectedChildren.includes(cat.id);
                                        return (
                                            <label key={cat.id} className="flex items-center gap-2.5 p-1 rounded hover:bg-white dark:hover:bg-slate-900 transition-colors cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => setSelectedChildren(prev => prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id])}
                                                    className="h-4 w-4 rounded border-slate-350 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate">{cat.name}</span>
                                            </label>
                                        );
                                    })
                                ) : (
                                    environments.map(env => {
                                        const isChecked = selectedEnvironments.includes(env.id);
                                        return (
                                            <label key={env.id} className="flex items-center gap-2.5 p-1 rounded hover:bg-white dark:hover:bg-slate-900 transition-colors cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => setSelectedEnvironments(prev => prev.includes(env.id) ? prev.filter(id => id !== env.id) : [...prev, env.id])}
                                                    className="h-4 w-4 rounded border-slate-350 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate">{env.name}</span>
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Nome */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-500">Nome</label>
                            <input
                                autoFocus
                                required
                                type="text"
                                value={nameInput}
                                onChange={e => {
                                    const val = e.target.value.toUpperCase();
                                    setNameInput(val);
                                }}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold uppercase"
                                placeholder={`Ex: ${showModal === "ambiente" ? "COZINHA, BANHEIRO" : "MESA, ARMÁRIO"}`}
                            />
                        </div>



                        {/* Footer Buttons */}
                        <div className="flex gap-3 justify-end pt-3 border-t border-slate-50 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={closeForm}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-black uppercase tracking-widest"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg"
                            >
                                Salvar
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Categories;
