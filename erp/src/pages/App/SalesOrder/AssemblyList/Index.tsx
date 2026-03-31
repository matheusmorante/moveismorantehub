import React, { useState, useEffect } from "react";
import { supabase } from "@/pages/utils/supabaseConfig";
import { toast } from "react-toastify";
import { getLocalISODate } from "@/pages/utils/formatters";

interface Assembly {
    id: string;
    item: string;
    date: string;
    time: string;
    type: 'delivery' | 'showroom';
    status: 'pending' | 'completed';
    order_id?: number | null;
    created_at: string;
}

interface Props {
    onClose: () => void;
}

const AssemblyList = ({ onClose }: Props) => {
    const [assemblies, setAssemblies] = useState<Assembly[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingAssembly, setEditingAssembly] = useState<Assembly | null>(null);

    // Form states
    const [item, setItem] = useState("");
    const [date, setDate] = useState(getLocalISODate(new Date()));
    const [time, setTime] = useState("08:00");
    const [type, setType] = useState<'delivery' | 'showroom'>('delivery');
    const [status, setStatus] = useState<'pending' | 'completed'>('pending');

    const fetchAssemblies = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('assemblies')
            .select('*')
            .order('date', { ascending: true });
        
        if (error) {
            console.error("Erro ao buscar montagens:", error);
            toast.error("Erro ao carregar lista de montagens");
        } else {
            setAssemblies(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAssemblies();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const payload = {
            item,
            date,
            time,
            type,
            status
        };

        let error;
        if (editingAssembly) {
            const { error: err } = await supabase
                .from('assemblies')
                .update(payload)
                .eq('id', editingAssembly.id);
            error = err;
        } else {
            const { error: err } = await supabase
                .from('assemblies')
                .insert([payload]);
            error = err;
        }

        if (error) {
            toast.error("Erro ao salvar montagem");
        } else {
            toast.success(editingAssembly ? "Montagem atualizada" : "Montagem agendada");
            resetForm();
            fetchAssemblies();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Deseja realmente excluir esta montagem?")) return;
        
        const { error } = await supabase
            .from('assemblies')
            .delete()
            .eq('id', id);

        if (error) {
            toast.error("Erro ao excluir montagem");
        } else {
            toast.success("Montagem excluída");
            fetchAssemblies();
        }
    };

    const toggleStatus = async (assembly: Assembly) => {
        const newStatus = assembly.status === 'pending' ? 'completed' : 'pending';
        const { error } = await supabase
            .from('assemblies')
            .update({ status: newStatus })
            .eq('id', assembly.id);

        if (error) {
            toast.error("Erro ao atualizar status");
        } else {
            fetchAssemblies();
        }
    };

    const resetForm = () => {
        setEditingAssembly(null);
        setItem("");
        setDate(getLocalISODate(new Date()));
        setTime("08:00");
        setType('delivery');
        setStatus('pending');
        setShowForm(false);
    };

    const startEdit = (as: Assembly) => {
        setEditingAssembly(as);
        setItem(as.item);
        setDate(as.date);
        setTime(as.time || "08:00");
        setType(as.type);
        setStatus(as.status);
        setShowForm(true);
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 md:p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-950 w-full h-full md:w-[1000px] md:h-[85vh] rounded-none md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up border-0 md:border border-white/10 dark:border-slate-800/50">
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="bg-indigo-600 p-3 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-indigo-900/20">
                            <i className="bi bi-hammer text-white text-xl" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Lista de Montagens</h2>
                            <p className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest mt-1">
                                Gerencie montagens de pedidos e mostruário.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {!showForm && (
                            <button
                                onClick={() => setShowForm(true)}
                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20 transition-all active:scale-95"
                            >
                                <i className="bi bi-plus-lg text-sm" />
                                Nova Montagem
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-12 h-12 flex items-center justify-center bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 rounded-xl transition-all shadow-sm border border-slate-100 dark:border-slate-800 active:scale-95"
                        >
                            <i className="bi bi-x-lg text-xl" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 dark:bg-slate-950/50 custom-scrollbar">
                    {showForm ? (
                        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 animate-slide-up">
                            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-3">
                                <i className={`bi ${editingAssembly ? 'bi-pencil' : 'bi-plus-circle'} text-indigo-500`} />
                                {editingAssembly ? 'Editar Montagem' : 'Nova Montagem'}
                            </h3>
                            
                            <form onSubmit={handleSave} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Produto / Item <span className="text-red-500">*</span></label>
                                        <input 
                                            required
                                            value={item}
                                            onChange={e => setItem(e.target.value)}
                                            placeholder="Ex: Guarda-roupa 6 portas, Cozinha Modulada..."
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 px-5 py-4 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Data de Prazo <span className="text-red-500">*</span></label>
                                        <input 
                                            required
                                            type="date"
                                            value={date}
                                            onChange={e => setDate(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 px-5 py-4 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Horário (Opcional)</label>
                                        <input 
                                            type="time"
                                            value={time}
                                            onChange={e => setTime(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 px-5 py-4 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Tipo de Local <span className="text-red-500">*</span></label>
                                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                            <button
                                                type="button"
                                                onClick={() => setType('delivery')}
                                                className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${type === 'delivery' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                                            >
                                                Entrega (Casa)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setType('showroom')}
                                                className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${type === 'showroom' ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm' : 'text-slate-400'}`}
                                            >
                                                Mostruário
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Situação Inicial</label>
                                        <select
                                            value={status}
                                            onChange={e => setStatus(e.target.value as any)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 px-5 py-4 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none transition-all appearance-none"
                                        >
                                            <option value="pending">Pendente</option>
                                            <option value="completed">Concluída</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-6 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl transition-all active:scale-95"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-indigo-900/20 transition-all active:scale-95"
                                    >
                                        {editingAssembly ? 'Salvar Alterações' : 'Confirmar Agendamento'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Carregando montagens...</p>
                                </div>
                            ) : assemblies.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800 text-center">
                                    <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-full mb-6">
                                        <i className="bi bi-calendar-check text-5xl text-slate-200 dark:text-slate-700" />
                                    </div>
                                    <h4 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-2">Nenhuma montagem agendada</h4>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
                                        Clique no botão "Nova Montagem" para começar a gerenciar sua equipe.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    {assemblies.map((as) => (
                                        <div key={as.id} className={`group bg-white dark:bg-slate-900 p-6 rounded-[2rem] border transition-all ${as.status === 'completed' ? 'border-emerald-100 bg-emerald-50/20 dark:border-emerald-900/20 dark:bg-emerald-900/5' : 'border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-950 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5'}`}>
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex gap-4">
                                                    <div className={`w-14 h-14 flex items-center justify-center rounded-2xl text-xl transition-transform group-hover:scale-110 ${as.type === 'showroom' ? 'bg-red-50 text-red-500 dark:bg-red-900/20' : 'bg-indigo-50 text-indigo-500 dark:bg-indigo-900/20'}`}>
                                                        <i className={`bi ${as.type === 'showroom' ? 'bi-shop' : 'bi-house'}`} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full ${as.type === 'showroom' ? 'bg-red-100 text-red-600 dark:bg-red-900/40' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40'}`}>
                                                                {as.type === 'showroom' ? 'Mostruário' : 'Entrega'}
                                                            </span>
                                                            <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full ${as.status === 'completed' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/40'}`}>
                                                                {as.status === 'completed' ? 'Concluída' : 'Pendente'}
                                                            </span>
                                                        </div>
                                                        <h4 className={`text-lg font-black leading-tight mb-2 ${as.status === 'completed' ? 'text-slate-400 dark:text-slate-600 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
                                                            {as.item}
                                                        </h4>
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 font-bold text-[11px]">
                                                                <i className="bi bi-calendar3" />
                                                                {new Date(as.date + "T00:00:00").toLocaleDateString('pt-BR')}
                                                            </div>
                                                            {as.time && (
                                                                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 font-bold text-[11px]">
                                                                    <i className="bi bi-clock" />
                                                                    {as.time}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => toggleStatus(as)}
                                                        title={as.status === 'completed' ? "Marcar como pendente" : "Marcar como concluída"}
                                                        className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${as.status === 'completed' ? 'bg-amber-50 text-amber-500 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100'}`}
                                                    >
                                                        <i className={`bi ${as.status === 'completed' ? 'bi-arrow-counterclockwise' : 'bi-check2-all'}`} />
                                                    </button>
                                                    <button
                                                        onClick={() => startEdit(as)}
                                                        className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-500 hover:bg-blue-100 rounded-xl transition-all"
                                                    >
                                                        <i className="bi bi-pencil" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(as.id)}
                                                        className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-all"
                                                    >
                                                        <i className="bi bi-trash" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }
            `}} />
        </div>
    );
};

export default AssemblyList;
