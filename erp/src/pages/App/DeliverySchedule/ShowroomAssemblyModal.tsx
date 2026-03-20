import React, { useState, useEffect } from "react";
import { supabase } from "@/pages/utils/supabaseConfig";
import { formatToBRDate } from "../../utils/formatters";
import { toast } from "react-toastify";

export interface ShowroomAssembly {
    id?: string;
    item: string;
    date: string;
    time: string;
    created_at?: string;
}

interface ShowroomAssemblyModalProps {
    onClose: () => void;
}

const ShowroomAssemblyModal = ({ onClose }: ShowroomAssemblyModalProps) => {
    const [assemblies, setAssemblies] = useState<ShowroomAssembly[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form state
    const [item, setItem] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");

    const TABLE_NAME = "showroom_assemblies";

    const fetchAssemblies = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from(TABLE_NAME)
                .select("*")
                .order("date", { ascending: true });
            
            if (error) {
                if (error.code === "PGRST116" || error.message.includes("does not exist")) {
                   // Table might not exist yet
                   console.warn("Table showroom_assemblies does not exist. Please create it.");
                   setAssemblies([]);
                } else {
                    throw error;
                }
            } else {
                setAssemblies(data || []);
            }
        } catch (err: any) {
            console.error("Erro ao buscar montagens de mostruário:", err);
            toast.error("Erro ao carregar dados do mostruário");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssemblies();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!item || !date || !time) {
            toast.warning("Preencha todos os campos");
            return;
        }

        try {
            if (editingId) {
                const { error } = await supabase
                    .from(TABLE_NAME)
                    .update({ item, date, time })
                    .eq("id", editingId);
                if (error) throw error;
                toast.success("Montagem atualizada!");
            } else {
                const { error } = await supabase
                    .from(TABLE_NAME)
                    .insert([{ item, date, time }]);
                if (error) throw error;
                toast.success("Montagem agendada!");
            }

            // Reset form
            setItem("");
            setDate("");
            setTime("");
            setEditingId(null);
            fetchAssemblies();
        } catch (err: any) {
            console.error("Erro ao salvar montagem:", err);
            toast.error("Erro ao salvar. Verifique se a tabela 'showroom_assemblies' existe.");
        }
    };

    const handleEdit = (as: ShowroomAssembly) => {
        setEditingId(as.id || null);
        setItem(as.item);
        setDate(as.date);
        setTime(as.time);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Deseja excluir este agendamento de mostruário?")) return;
        try {
            const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id);
            if (error) throw error;
            toast.success("Excluído com sucesso");
            fetchAssemblies();
        } catch (err: any) {
            console.error("Erro ao deletar:", err);
            toast.error("Erro ao excluir");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
            
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl">
                            <i className="bi bi-hammer text-red-600 dark:text-red-400 text-xl" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                                Montagem para Mostruário
                            </h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                Gestão de Agendamentos Internos
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <i className="bi bi-x-lg text-lg" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    {/* Form Section */}
                    <form onSubmit={handleSave} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-2 mb-1.5 block">Item a ser montado</label>
                                <input 
                                    type="text" 
                                    value={item}
                                    onChange={(e) => setItem(e.target.value)}
                                    placeholder="Ex: Guarda-roupa casal 6 portas..."
                                    className="w-full bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-red-500 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-2 mb-1.5 block">Data</label>
                                <input 
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-2 mb-1.5 block">Horário / Período</label>
                                <input 
                                    type="text"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    placeholder="Ex: 09:00 ou Manhã"
                                    className="w-full bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex gap-3">
                            <button 
                                type="submit"
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest py-4 px-8 rounded-2xl shadow-xl shadow-red-100 dark:shadow-red-950/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <i className={`bi ${editingId ? 'bi-check-circle' : 'bi-plus-circle'} text-lg`} />
                                {editingId ? "Atualizar Agendamento" : "Agendar Montagem"}
                            </button>
                            {editingId && (
                                <button 
                                    type="button"
                                    onClick={() => { setEditingId(null); setItem(""); setDate(""); setTime(""); }}
                                    className="px-6 py-4 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                                >
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </form>

                    {/* List Section */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-2">
                            <i className="bi bi-list-ul" /> Agendamentos Ativos
                        </p>
                        
                        <div className="space-y-3">
                            {loading ? (
                                <div className="text-center py-10">
                                    <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mr-3"></div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-4">Carregando...</p>
                                </div>
                            ) : assemblies.length === 0 ? (
                                <div className="text-center py-10 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem]">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Nenhum agendamento para o mostruário</p>
                                </div>
                            ) : (
                                assemblies.map(as => (
                                    <div key={as.id} className="group flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-red-200 dark:hover:border-red-900/30 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400 font-black text-xs">
                                                {formatToBRDate(as.date).split('/')[0]}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">{as.item}</h4>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                                                        <i className="bi bi-calendar3 mr-1" /> {formatToBRDate(as.date)}
                                                    </span>
                                                    <span className="text-[10px] text-red-500 font-black uppercase tracking-widest">
                                                        <i className="bi bi-clock mr-1" /> {as.time}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleEdit(as)}
                                                className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                                            >
                                                <i className="bi bi-pencil-fill" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(as.id!)}
                                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                            >
                                                <i className="bi bi-trash3-fill" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShowroomAssemblyModal;
