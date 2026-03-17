import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { fetchGroupsAndCategories, createGroup, updateGroup, deleteGroup } from '@/pages/utils/categoryService';

const Environments = () => {
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [editingGroup, setEditingGroup] = useState<any>(null);
    const [groupName, setGroupName] = useState("");
    const [isAddingGroup, setIsAddingGroup] = useState(false);
    const [editingGroupName, setEditingGroupName] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchGroupsAndCategories();
            setGroups(data.groups);
        } catch (error) {
            toast.error("Erro ao carregar ambientes.");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveGroup = async (e?: React.FormEvent, forceId?: string) => {
        if (e) e.preventDefault();
        const id = forceId || editingGroup?.id;
        const name = id ? editingGroupName : groupName;

        if (!name.trim()) return toast.error("O nome não pode estar vazio.");
        try {
            if (id) {
                await updateGroup(id, name);
                toast.success("Ambiente atualizado!");
            } else {
                await createGroup(name);
                toast.success("Ambiente criado!");
            }
            setEditingGroup(null);
            setGroupName("");
            setEditingGroupName("");
            setIsAddingGroup(false);
            loadData();
        } catch (error) {
            toast.error("Erro ao salvar ambiente.");
        }
    };

    const handleDeleteGroup = async (id: string) => {
        if (!window.confirm("Isso apagará este Ambiente permanentemente. Deseja continuar?")) return;
        try {
            await deleteGroup(id);
            toast.success("Ambiente excluído!");
            loadData();
        } catch (error) {
            toast.error("Erro ao excluir ambiente.");
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 flex flex-col gap-8 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
                    <i className="bi bi-house-door-fill text-blue-600"></i>
                    Gestão de Ambientes
                </h1>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    ORGANIZE ONDE SEUS MÓVEIS SERÃO INSTALADOS (EX: COZINHA, QUARTO, SALA)
                </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 p-8 shadow-premium-lg flex flex-col gap-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">
                            Lista de Ambientes
                        </h2>
                    </div>
                    {!isAddingGroup && (
                        <button 
                            onClick={() => setIsAddingGroup(true)}
                            className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <i className="bi bi-plus-lg"></i>
                            Novo Ambiente
                        </button>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                    {isAddingGroup && (
                        <form onSubmit={handleSaveGroup} className="flex gap-2 animate-in slide-in-from-top-2 duration-300">
                            <input
                                autoFocus
                                type="text"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value.toUpperCase())}
                                placeholder="NOME DO AMBIENTE (EX: COZINHA)..."
                                onBlur={() => !groupName && setIsAddingGroup(false)}
                                className="flex-1 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl px-5 py-4 text-sm font-black focus:outline-none focus:ring-4 focus:ring-blue-500/10 uppercase transition-all"
                            />
                            <button type="submit" className="bg-emerald-500 text-white w-14 h-14 rounded-2xl flex items-center justify-center hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all flex-shrink-0">
                                <i className="bi bi-check-lg text-xl"></i>
                            </button>
                            <button type="button" onClick={() => setIsAddingGroup(false)} className="bg-slate-100 dark:bg-slate-800 text-slate-400 w-14 h-14 rounded-2xl flex items-center justify-center hover:text-red-500 transition-all flex-shrink-0">
                                <i className="bi bi-x-lg text-xl"></i>
                            </button>
                        </form>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                        {groups.map(group => (
                            <div key={group.id} className={`group/item flex items-center justify-between p-1 pl-5 border rounded-3xl transition-all ${editingGroup?.id === group.id ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 ring-4 ring-blue-500/5' : 'bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800 hover:border-blue-100 dark:hover:border-blue-800 hover:bg-slate-50/50 dark:hover:bg-slate-950 shadow-sm'}`}>
                                {editingGroup?.id === group.id ? (
                                    <form onSubmit={handleSaveGroup} className="flex-1 flex gap-2 py-0.5">
                                        <input
                                            autoFocus
                                            type="text"
                                            value={editingGroupName}
                                            onChange={(e) => setEditingGroupName(e.target.value.toUpperCase())}
                                            onKeyDown={(e) => e.key === 'Escape' && setEditingGroup(null)}
                                            className="flex-1 bg-transparent border-none outline-none font-black text-slate-800 dark:text-slate-100 text-sm uppercase px-2"
                                        />
                                        <button type="submit" className="w-12 h-12 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-2xl transition-all">
                                            <i className="bi bi-check-lg text-xl"></i>
                                        </button>
                                        <button type="button" onClick={() => setEditingGroup(null)} className="w-12 h-12 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">
                                            <i className="bi bi-x-lg text-xl"></i>
                                        </button>
                                    </form>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3 flex-1 py-4 cursor-pointer" onClick={() => { setEditingGroup(group); setEditingGroupName(group.name); }}>
                                            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xs">
                                                {group.name.charAt(0)}
                                            </div>
                                            <span className="font-black text-slate-700 dark:text-slate-300 text-sm tracking-tight uppercase">{group.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1 md:opacity-0 group-hover/item:opacity-100 transition-all pr-2">
                                            <button onClick={() => { setEditingGroup(group); setEditingGroupName(group.name); }} className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all">
                                                <i className="bi bi-pencil-fill text-xs"></i>
                                            </button>
                                            <button onClick={() => handleDeleteGroup(group.id)} className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all">
                                                <i className="bi bi-trash-fill text-xs"></i>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    {groups.length === 0 && !isAddingGroup && (
                        <div className="py-20 text-center bg-slate-50/50 dark:bg-slate-950/20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                            <i className="bi bi-house text-4xl text-slate-200 dark:text-slate-800 mb-4 block"></i>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Nenhum ambiente cadastrado.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Environments;
