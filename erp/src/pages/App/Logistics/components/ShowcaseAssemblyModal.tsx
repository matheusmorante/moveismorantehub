import React, { useState, useEffect } from 'react';
import { ShowcaseAssembly, saveShowcaseAssembly } from '@/pages/utils/showcaseAssemblyService';
import { toast } from 'react-toastify';
import { formatToBRDate } from '@/pages/utils/formatters';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    assembly?: ShowcaseAssembly | null;
    onSaveSuccess: () => void;
}

const ShowcaseAssemblyModal = ({ isOpen, onClose, assembly, onSaveSuccess }: Props) => {
    const [formData, setFormData] = useState<ShowcaseAssembly>({
        description: '',
        quantity: 1,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        observation: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (assembly) {
            setFormData({
                ...assembly,
                date: assembly.date ? assembly.date.split('T')[0] : new Date().toISOString().split('T')[0]
            });
        } else {
            setFormData({
                description: '',
                quantity: 1,
                date: new Date().toISOString().split('T')[0],
                status: 'pending',
                observation: ''
            });
        }
    }, [assembly, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.description) {
            toast.error("A descrição é obrigatória.");
            return;
        }

        setIsSaving(true);
        try {
            await saveShowcaseAssembly(formData);
            toast.success(assembly ? "Montagem atualizada! ✨" : "Montagem registrada! 🛠️");
            onSaveSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar montagem.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
            
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800 flex flex-col">
                <div className="p-8 bg-blue-600 text-white flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight uppercase">{assembly ? 'Editar Montagem' : 'Nova Montagem de Mostruário'}</h2>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200 mt-1">Gestão de itens para exposição em loja</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <i className="bi bi-x-lg text-xl"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Descrição do Item</label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Ex: Roupeiro 3 Portas - Branco Neve"
                                className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm font-bold shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Quantidade</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                    className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm font-bold shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Data Prevista</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm font-bold shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-mono"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Status</label>
                            <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status: 'pending' })}
                                    className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${formData.status === 'pending' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                                >
                                    <i className="bi bi-clock-history mr-2"></i> Pendente
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status: 'completed' })}
                                    className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${formData.status === 'completed' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                                >
                                    <i className="bi bi-check-all mr-2"></i> Concluído
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Observações</label>
                            <textarea
                                value={formData.observation}
                                onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
                                placeholder="Observações adicionais..."
                                rows={3}
                                className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm font-bold shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <i className={`bi ${assembly ? 'bi-check-lg' : 'bi-plus-lg'} text-xl`}></i>
                        )}
                        {isSaving ? 'Salvando...' : assembly ? 'Salvar Alterações' : 'Registrar Montagem'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ShowcaseAssemblyModal;
