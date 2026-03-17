import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { fetchGroupsAndCategories, createCategory, updateCategory, deleteCategory, updateCategoryChildren, generateSlug } from '@/pages/utils/categoryService';
import { supabase } from '@/pages/utils/supabaseConfig';

const FIXED_ENVIRONMENTS = ["SALA DE JANTAR", "SALA DE ESTAR", "COZINHA", "QUARTO", "LAVANDERIA", "BANHEIRO", "LAVANDEIRA", "ESCRITORIO", "ESCRITÓRIO", "VARANDA", "ÁREA GOURMET", "GARAGEM"];

const Categories = () => {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'ambientes' | 'tipos' | 'tree'>('tipos');
    const navigate = useNavigate();

    const [refreshing, setRefreshing] = useState(false);

    // Category Form State
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [catName, setCatName] = useState("");
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [editingCatName, setEditingCatName] = useState("");
    const [selectedParents, setSelectedParents] = useState<string[]>([]);
    const [selectedChildren, setSelectedChildren] = useState<string[]>([]);

    // SEO States
    const [seoSlug, setSeoSlug] = useState("");
    const [seoMetaTitle, setSeoMetaTitle] = useState("");
    const [seoMetaDescription, setSeoMetaDescription] = useState("");
    const [seoContent, setSeoContent] = useState("");
    
    // Linked Products State
    const [viewingProductsId, setViewingProductsId] = useState<string | null>(null);
    const [linkedProducts, setLinkedProducts] = useState<any[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

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

    const handleSaveCategory = async (e?: React.FormEvent, isEnvironment: boolean = false) => {
        if (e) e.preventDefault();
        const id = editingCategory?.id;
        const rawName = id ? editingCatName : catName;
        const name = rawName.trim().toUpperCase();

        if (!name) return toast.error("O nome não pode estar vazio.");
        
        // Verifica se já existe uma categoria com este nome (exceto a que estamos editando)
        const duplicate = categories.find(c => c.name.trim().toUpperCase() === name && c.id !== id);
        if (duplicate) {
            return toast.error(`Já existe um(a) ${isEnvironment ? 'Ambiente' : 'Tipo de Móvel'} chamado "${name}".`);
        }
        
        const parents = isEnvironment ? [] : selectedParents;
        const seoFields = {
            slug: seoSlug,
            meta_title: seoMetaTitle,
            meta_description: seoMetaDescription,
            seo_description: seoContent
        };

        try {
            if (id) {
                await updateCategory(id, name, parents, seoFields);
                if (isEnvironment) {
                    await updateCategoryChildren(id, selectedChildren);
                }
                toast.success(isEnvironment ? "Ambiente atualizado!" : "Tipo de Móvel atualizado!");
            } else {
                const newCat = await createCategory(name, parents, seoFields);
                if (isEnvironment && selectedChildren.length > 0) {
                    await updateCategoryChildren(newCat.id, selectedChildren);
                }
                toast.success(isEnvironment ? "Ambiente criado!" : "Tipo de Móvel criado!");
            }
            setEditingCategory(null);
            setCatName("");
            setEditingCatName("");
            setIsAddingCategory(false);
            setSelectedParents([]);
            setSeoSlug("");
            setSeoMetaTitle("");
            setSeoMetaDescription("");
            setSeoContent("");
            loadData(true);
        } catch (error) {
            toast.error("Erro ao salvar.");
        }
    };

    const handleDeleteCategory = async (id: string, isEnv: boolean = false) => {
        try {
            if (isEnv) {
                // Verifica se o ambiente possui filhos vínculos na tabela category_relationships
                const { data: relations } = await supabase
                    .from('category_relationships')
                    .select('child_id')
                    .eq('parent_id', id)
                    .limit(1);
                
                if (relations && relations.length > 0) {
                    return toast.error("Este ambiente possui tipos de móveis vinculados e não pode ser excluído.");
                }
            } else {
                // Verifica se o tipo de móvel possui produtos vinculados na tabela product_categories
                const { data: links } = await supabase
                    .from('product_categories')
                    .select('product_id')
                    .eq('category_id', id)
                    .limit(1);

                if (links && links.length > 0) {
                    return toast.error("Este tipo de móvel possui produtos vinculados e não pode ser excluído.");
                }
            }

            const msg = isEnv 
                ? "Deseja excluir este ambiente permanentemente?" 
                : "Deseja excluir este tipo de móvel permanentemente?";
            
            if (!window.confirm(msg)) return;

            await deleteCategory(id);
            toast.success(isEnv ? "Ambiente excluído!" : "Tipo de Móvel excluído!");
            loadData(true);
        } catch (error) {
            console.error("Erro ao excluir:", error);
            toast.error("Erro ao excluir.");
        }
    };

    const toggleParent = (parentId: string) => {
        setSelectedParents(prev =>
            prev.includes(parentId) ? prev.filter(id => id !== parentId) : [...prev, parentId]
        );
    };

    const toggleChild = (childId: string) => {
        setSelectedChildren(prev =>
            prev.includes(childId) ? prev.filter(id => id !== childId) : [...prev, childId]
        );
    };

    const fetchLinkedProducts = async (categoryId: string) => {
        setViewingProductsId(categoryId);
        setLoadingProducts(true);
        setLinkedProducts([]);
        try {
            const { data, error } = await supabase
                .from('product_categories')
                .select('product_id, products(id, code, description)')
                .eq('category_id', categoryId);
            
            if (error) throw error;
            if (data) {
                setLinkedProducts(data.map((item: any) => item.products).filter(Boolean));
            }
        } catch (error) {
            console.error("Erro ao buscar produtos:", error);
            toast.error("Erro ao carregar produtos vinculados.");
        } finally {
            setLoadingProducts(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const tabButtonClass = (tab: string) => 
        `px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`;

    const environments = categories.filter(c => {
        const name = c.name.trim().toUpperCase();
        const isFixed = FIXED_ENVIRONMENTS.includes(name);
        // É ambiente se: está na lista fixa OU (é raiz E possui filhos vinculados)
        const hasChildren = categories.some(other => other.parents?.includes(c.id));
        return isFixed || hasChildren;
    });

    const subCategories = categories.filter(c => !environments.some(e => e.id === c.id));
    

    return (
        <div className="p-4 md:p-8 flex flex-col gap-8 max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
                    <i className="bi bi-tag-fill text-blue-600"></i>
                    Tipos de Móveis
                </h1>
                <div className="flex items-center gap-4">
                     <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        ORGANIZE SEUS PRODUTOS EM HIERARQUIAS DE AMBIENTES E TIPOS DE MÓVEIS
                    </p>
                    {refreshing && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 animate-pulse">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                            <span className="text-[9px] font-black uppercase tracking-widest">Sincronizando</span>
                        </div>
                    )}
                    {activeTab === 'tree' && (
                         <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[9px] font-black rounded-full uppercase tracking-tighter animate-pulse">
                            DICA: ARRASTE OS MÓVEIS PARA DENTRO DOS AMBIENTES
                        </span>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-1 flex items-center justify-between shadow-sm sticky top-4 z-10 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80">
                <div className="flex">
                    <button onClick={() => setActiveTab('ambientes')} className={tabButtonClass('ambientes')}>
                        <i className="bi bi-house-door-fill mr-2 text-sm"></i>
                        Ambientes
                        {activeTab === 'ambientes' && <div className="absolute bottom-0 left-4 right-4 h-1 bg-blue-600 rounded-full animate-in fade-in zoom-in"></div>}
                    </button>
                    <button onClick={() => setActiveTab('tipos')} className={tabButtonClass('tipos')}>
                        <i className="bi bi-tag-fill mr-2 text-sm"></i>
                        Tipos de Móveis
                        {activeTab === 'tipos' && <div className="absolute bottom-0 left-4 right-4 h-1 bg-blue-600 rounded-full animate-in fade-in zoom-in"></div>}
                    </button>
                    <button onClick={() => setActiveTab('tree')} className={tabButtonClass('tree')}>
                        <i className="bi bi-diagram-2 mr-2 text-sm"></i>
                        Hierarquia
                        {activeTab === 'tree' && <div className="absolute bottom-0 left-4 right-4 h-1 bg-blue-600 rounded-full animate-in fade-in zoom-in"></div>}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8 animate-in fade-in duration-500">
                
                {/* Tab: Ambientes */}
                {activeTab === 'ambientes' && (
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 p-8 flex flex-col gap-8 shadow-premium-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                                <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">Gestão de Ambientes</h2>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">CADASTRE OS AMBIENTES PRINCIPAIS (COZINHA, SALA, ETC)</p>
                            </div>
                            {!isAddingCategory && (
                                <button onClick={() => { setIsAddingCategory(true); setSelectedParents([]); setSelectedChildren([]); }} className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2">
                                    <i className="bi bi-plus-lg"></i> Novo Ambiente
                                </button>
                            )}
                        </div>
                        {isAddingCategory && (
                            /* Reuse the same form or similar style */
                            <div className="flex flex-col gap-6 border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10 p-8 rounded-[2.5rem] animate-in slide-in-from-top-2 duration-300">
                                <div className="flex flex-col gap-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Ambiente:</span>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={catName}
                                        onChange={(e) => {
                                            const val = e.target.value.toUpperCase();
                                            setCatName(val);
                                            setSeoSlug(generateSlug(val));
                                            setSeoMetaTitle(val + " | Móveis Morante");
                                        }}
                                        placeholder=" EX: SALA DE JANTAR, VARANDA GOURMET..."
                                        className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-black focus:outline-none focus:ring-4 focus:ring-blue-500/10 uppercase"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={(e) => handleSaveCategory(e, true)} className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95">Salvar Ambiente</button>
                                    <button onClick={() => { setIsAddingCategory(false); setCatName(""); }} className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-red-500 transition-all">Cancelar</button>
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {environments.map(cat => (
                                <div key={cat.id} className="group p-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-blue-300 shadow-sm rounded-2xl transition-all">
                                    <div className="flex items-center justify-between p-4 pl-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center font-black text-[10px]"><i className="bi bi-house-door-fill"></i></div>
                                            <span className="font-black text-slate-700 dark:text-slate-300 text-sm tracking-tight uppercase">{cat.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                             <button 
                                                onClick={(e) => { e.stopPropagation(); fetchLinkedProducts(cat.id); }}
                                                className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                            >
                                                <i className="bi bi-box-seam text-xs"></i>
                                            </button>
                                            {!FIXED_ENVIRONMENTS.includes(cat.name.trim().toUpperCase()) && (
                                                <button onClick={() => handleDeleteCategory(cat.id, true)} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"><i className="bi bi-trash-fill text-xs"></i></button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {activeTab === 'tipos' && (
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 p-8 flex flex-col gap-8 shadow-premium-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                                <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">Gestão de Tipos de Móveis</h2>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">CADASTRE E ORGANIZE AS CATEGORIAS DOS SEUS PRODUTOS</p>
                            </div>
                            {!isAddingCategory && (
                                <button onClick={() => { setIsAddingCategory(true); setSelectedParents([]); setSelectedChildren([]); }} className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2">
                                    <i className="bi bi-plus-lg"></i> Nova Categoria
                                </button>
                            )}
                        </div>

                        {isAddingCategory && (
                            <div className="flex flex-col gap-6 border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10 p-8 rounded-[2.5rem] animate-in slide-in-from-top-2 duration-300">
                                <div className="flex flex-col gap-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Categoria:</span>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={catName}
                                        onChange={(e) => {
                                            const val = e.target.value.toUpperCase();
                                            setCatName(val);
                                            setSeoSlug(generateSlug(val));
                                            setSeoMetaTitle(val + " | Móveis Morante");
                                        }}
                                        placeholder=" EX: SALA DE JANTAR, ARMÁRIO, MESA..."
                                        className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-black focus:outline-none focus:ring-4 focus:ring-blue-500/10 uppercase"
                                    />
                                </div>

                                <div className="flex flex-col gap-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vincular a Categoria Superior (Pai) - Opcional:</span>
                                    <div className="flex flex-wrap gap-2">
                                        {environments.map(env => (
                                            <button 
                                                key={env.id} 
                                                type="button"
                                                onClick={() => toggleParent(env.id)} 
                                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-tighter rounded-xl border transition-all ${selectedParents.includes(env.id) ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-blue-300'}`}
                                            >
                                                {env.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vincular Sub-itens (Opcional):</span>
                                    <div className="flex flex-wrap gap-2">
                                        {categories.filter(c => !environments.some(e => e.id === c.id)).map(mob => (
                                            <button 
                                                key={mob.id} 
                                                type="button" 
                                                onClick={() => toggleChild(mob.id)} 
                                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-tighter rounded-xl border transition-all ${selectedChildren.includes(mob.id) ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-blue-300'}`}
                                            >
                                                {mob.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={(e) => handleSaveCategory(e, selectedParents.length === 0)} className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95">Salvar Categoria</button>
                                    <button onClick={() => { setIsAddingCategory(false); setCatName(""); setSelectedParents([]); setSelectedChildren([]); }} className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-red-500 transition-all">Cancelar</button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {categories.map(cat => {
                                const isEditing = editingCategory?.id === cat.id;
                                const isEnvironment = environments.some(e => e.id === cat.id);
                                return (
                                    <div key={cat.id} className={`group flex flex-col gap-2 p-1 border rounded-2xl transition-all ${isEditing ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 ring-4 ring-blue-500/5 col-span-full' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-blue-300 shadow-sm'}`}>
                                        {isEditing ? (
                                            <div className="flex flex-col gap-6 p-6">
                                                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                                                     <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                                                            <i className="bi bi-tag-fill"></i>
                                                        </div>
                                                        {FIXED_ENVIRONMENTS.includes(cat.name.trim().toUpperCase()) ? (
                                                            <span className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">{cat.name}</span>
                                                        ) : (
                                                            <input
                                                                autoFocus
                                                                type="text"
                                                                value={editingCatName}
                                                                onChange={(e) => setEditingCatName(e.target.value.toUpperCase())}
                                                                className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-black focus:outline-none uppercase"
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={(e) => handleSaveCategory(e, isEnvironment)} className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all"><i className="bi bi-check-lg text-xl"></i></button>
                                                        <button onClick={() => setEditingCategory(null)} className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center active:scale-95 transition-all"><i className="bi bi-x-lg text-xl"></i></button>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-3">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ajustar Categoria Pai:</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {environments.filter(env => env.id !== cat.id).map(env => (
                                                            <button 
                                                                key={env.id} 
                                                                type="button"
                                                                onClick={() => toggleParent(env.id)} 
                                                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-tighter rounded-xl border transition-all ${selectedParents.includes(env.id) ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-blue-300'}`}
                                                            >
                                                                {env.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-3">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ajustar Sub-itens Vinculados (Opcional):</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {categories.filter(c => c.id !== cat.id && !environments.some(e => e.id === c.id)).map(mob => (
                                                            <button 
                                                                key={mob.id} 
                                                                type="button" 
                                                                onClick={() => toggleChild(mob.id)} 
                                                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-tighter rounded-xl border transition-all ${selectedChildren.includes(mob.id) ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-blue-300'}`}
                                                            >
                                                                {mob.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-6">
                                                    <div className="flex items-center gap-2 justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <i className="bi bi-google text-blue-500"></i>
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Otimização (SEO)</span>
                                                        </div>
                                                        {!FIXED_ENVIRONMENTS.includes(cat.name.trim().toUpperCase()) && (
                                                            <button 
                                                                onClick={() => handleDeleteCategory(cat.id, isEnvironment)}
                                                                className="px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-rose-100 dark:border-rose-900/40 hover:bg-rose-600 hover:text-white transition-all"
                                                            >
                                                                Excluir Tipo de Móvel
                                                            </button>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="flex flex-col gap-2">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Slug</span>
                                                            <input 
                                                                value={seoSlug} 
                                                                onChange={(e) => setSeoSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                                                className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-2">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Meta Título</span>
                                                            <input 
                                                                value={seoMetaTitle} 
                                                                onChange={(e) => setSeoMetaTitle(e.target.value)}
                                                                className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold"
                                                            />
                                                        </div>
                                                    </div>

                                                    <textarea 
                                                        value={seoMetaDescription} 
                                                        onChange={(e) => setSeoMetaDescription(e.target.value)}
                                                        className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 text-xs min-h-[80px]"
                                                        placeholder="Meta Descrição (Resumo para Google)..."
                                                    />

                                                    <textarea 
                                                        value={seoContent} 
                                                        onChange={(e) => setSeoContent(e.target.value)}
                                                        className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 text-xs min-h-[120px]"
                                                        placeholder="Descrição Completa SEO (Para o topo da página no site)..."
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-0">
                                                <div className="flex items-center justify-between pl-5">
                                                    <div className="flex items-center gap-3 py-3 flex-1 cursor-pointer" onClick={() => {
                                                        setEditingCategory(cat);
                                                        setEditingCatName(cat.name);
                                                        setSelectedParents(cat.parents || []);
                                                        setSeoSlug(cat.slug || generateSlug(cat.name));
                                                        setSeoMetaTitle(cat.meta_title || "");
                                                        setSeoMetaDescription(cat.meta_description || "");
                                                        setSeoContent(cat.seo_description || "");
                                                    }}>
                                                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center font-black text-[10px]"><i className="bi bi-tag-fill"></i></div>
                                                        <div className="flex flex-col">
                                                            <span className="font-black text-slate-700 dark:text-slate-300 text-sm tracking-tight uppercase">{cat.name}</span>
                                                            {cat.parents && cat.parents.length > 0 && (
                                                                <span className="text-[8px] font-bold text-blue-500 uppercase tracking-widest mt-1">
                                                                        PAI: {cat.parents.map((pid: string) => categories.find(e => e.id === pid)?.name).filter(Boolean).join(', ')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all pr-1">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); fetchLinkedProducts(cat.id); }}
                                                            className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                            title="Ver Produtos Vinculados"
                                                        >
                                                            <i className="bi bi-box-seam text-xs"></i>
                                                        </button>
                                                        {!FIXED_ENVIRONMENTS.includes(cat.name.trim().toUpperCase()) && (
                                                            <>
                                                                <button onClick={() => { 
                                                                    setEditingCategory(cat); 
                                                                    setEditingCatName(cat.name); 
                                                                    setSelectedParents(cat.parents || []); 
                                                                    setSeoSlug(cat.slug || generateSlug(cat.name)); 
                                                                    setSeoMetaTitle(cat.meta_title || ""); 
                                                                    setSeoMetaDescription(cat.meta_description || ""); 
                                                                    setSeoContent(cat.seo_description || "");
                                                                }} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><i className="bi bi-pencil-fill text-xs"></i></button>
                                                                <button onClick={() => handleDeleteCategory(cat.id, isEnvironment)} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"><i className="bi bi-trash-fill text-xs"></i></button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {/* Lista de sub-itens vinculados */}
                                                <div className="flex flex-wrap gap-x-3 gap-y-1 px-5 pb-4 pl-16">
                                                    {categories.filter(c => c.parents?.includes(cat.id)).map(child => (
                                                        <span key={child.id} className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter flex items-center gap-1">
                                                            <div className="w-1 h-1 rounded-full bg-blue-400/30"></div>
                                                            {child.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Tab: Visão em Árvore Simplificada */}
                {activeTab === 'tree' && (
                    <div className="flex flex-col gap-8 min-h-[700px] animate-in fade-in zoom-in-95 duration-500">
                        
                        {/* Main Content: Árvore Hierárquica Estática */}
                        <div className="flex-1 bg-slate-950 border border-slate-800 rounded-[3rem] p-8 md:p-12 flex flex-col gap-10 shadow-premium-2xl overflow-hidden text-slate-200">
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black flex items-center gap-4 text-white uppercase tracking-tighter">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                            <i className="bi bi-diagram-3-fill text-white"></i>
                                        </div>
                                        Estrutura Hierárquica
                                    </h2>
                                </div>
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">Visualize a organização dos seus móveis e ambientes.</p>
                            </div>

                            <div className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-4 pb-20">
                                {environments.map(root => (
                                    <TreeNode 
                                        key={root.id} 
                                        node={root} 
                                        allCategories={categories}
                                        level={0}
                                    />
                                ))}
                                {environments.length === 0 && (
                                    <div className="py-32 text-center opacity-40">
                                        <i className="bi bi-diagram-2 text-6xl mb-6 block"></i>
                                        <p className="text-sm font-black uppercase tracking-widest">Nenhum ambiente raiz encontrado.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Produtos Vinculados */}
            {viewingProductsId && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overflow-hidden">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewingProductsId(null)} />
                    <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[80vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/20">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Produtos Vinculados</h2>
                                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mt-1">
                                    {categories.find(c => c.id === viewingProductsId)?.name}
                                </p>
                            </div>
                            <button onClick={() => setViewingProductsId(null)} className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all shadow-sm">
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                            {loadingProducts ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest animate-pulse">Buscando na base...</span>
                                </div>
                            ) : linkedProducts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                                    <i className="bi bi-box-seam text-5xl text-slate-300"></i>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Nenhum produto vinculado a este tipo.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {linkedProducts.map(prod => (
                                            <div 
                                                key={prod.id} 
                                                onClick={() => navigate(`/registrations/products?edit=${prod.id}`)}
                                                className="group p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-blue-200 dark:hover:border-blue-800/50 hover:bg-white dark:hover:bg-slate-800 transition-all flex items-center justify-between cursor-pointer"
                                            >
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-black text-slate-700 dark:text-slate-200 leading-none uppercase">{prod.description}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">CÓD: {prod.code || 'S/ REF'}</span>
                                                </div>
                                                <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-blue-500 shadow-sm opacity-0 group-hover:opacity-100 transition-all">
                                                    <i className="bi bi-arrow-right-short text-xl"></i>
                                                </div>
                                            </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-8 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 shrink-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">TOTAL DE {linkedProducts.length} {linkedProducts.length === 1 ? 'PRODUTO ENCONTRADO' : 'PRODUTOS ENCONTRADOS'}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Componente Recursivo para cada nó da árvore
const TreeNode = ({ node, allCategories, level }: any) => {
    const children = allCategories.filter((c: any) => c.parents?.includes(node.id));

    return (
        <div className="flex flex-col gap-3">
            <div 
                className={`
                    group relative flex items-center justify-between p-5 rounded-[2rem] border transition-all duration-300
                    ${level === 0 ? 'bg-white/5 border-white/5 shadow-lg' : 'bg-white/5 border-white/5'}
                    hover:bg-white/[0.08] hover:border-white/10
                `}
                style={{ marginLeft: `${level * 24}px` }}
            >
                <div className="flex items-center gap-4">
                    <div className={`
                        w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border transition-all
                        ${level === 0 ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' : 'bg-slate-800 text-slate-500 border-white/5'}
                    `}>
                        <i className={`bi ${level === 0 ? 'bi-house-fill' : 'bi-box-fill'} text-sm`}></i>
                    </div>
                    <div className="flex flex-col">
                        <span className={`font-black tracking-tight uppercase transition-all ${level === 0 ? 'text-sm text-white' : 'text-xs text-slate-300'}`}>
                            {node.name}
                        </span>
                        {level === 0 && <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Ambiente Raiz</span>}
                    </div>
                </div>

                <div className="flex items-center gap-4 pr-2">
                    {children.length > 0 && (
                        <span className="text-[10px] font-black bg-white/5 px-3 py-1.5 rounded-xl text-slate-500 border border-white/5 group-hover:text-blue-400 group-hover:bg-blue-400/10 transition-all">
                            {children.length} {children.length === 1 ? 'FILHO' : 'FILHOS'}
                        </span>
                    )}
                </div>
            </div>

            {/* Renderizar Filhos Recursivamente */}
            {children.length > 0 && (
                <div className="flex flex-col gap-3 relative ml-5 border-l border-white/10 pl-5 my-1">
                    {children.map((child: any) => (
                        <TreeNode 
                            key={child.id} 
                            node={child} 
                            allCategories={allCategories}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Categories;
