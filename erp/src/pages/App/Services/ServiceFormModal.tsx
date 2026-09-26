import React, { useState, useEffect, useRef } from "react";
import Service from "../../types/service.type";
import { saveService } from "../../utils/serviceService";
import { toast } from "react-toastify";
import CurrencyInput from '../../../components/CurrencyInput';

interface ServiceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    service?: Service | null;
}

const ServiceFormModal = ({ isOpen, onClose, service }: ServiceFormModalProps) => {
    const [loading, setLoading] = useState(false);
    const isInitialMount = useRef(true);
    
    const initialFormData: Partial<Service> = {
        description: "",
        unitPrice: 0,
        costPrice: 0,
        active: true,
    };

    const [formData, setFormData] = useState<Partial<Service>>(initialFormData);

    useEffect(() => {
        if (service) {
            setFormData(service);
        } else {
            setFormData(initialFormData);
        }
        isInitialMount.current = true;
    }, [service, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.description) {
            toast.error("A descrição é obrigatória.");
            return;
        }

        setLoading(true);
        try {
            const dataToSave = { ...formData, isDraft: false } as Service;
            await saveService(dataToSave);
            toast.success(service ? "Serviço atualizado!" : "Serviço criado com sucesso!");
            onClose();
        } catch (error) {
            toast.error("Erro ao salvar o serviço.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800 flex flex-col">
                {/* Header */}
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                            {service ? "Editar Serviço" : "Novo Serviço"}
                        </h2>
                        <p className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest mt-1">
                            {service ? `Editando ID: ${service.id}` : "Configure as informações detalhadas do serviço"}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 transition-colors ml-auto">
                        <i className="bi bi-x-lg text-xl"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="md:col-span-2 flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Descrição do Serviço</label>
                            <input
                                type="text"
                                required
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100"
                                placeholder="Ex: Manutenção Preventiva"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Preço de Venda (R$)</label>
                            <CurrencyInput
                                value={formData.unitPrice || 0}
                                onChangeValue={(val) => setFormData({ ...formData, unitPrice: val })}
                                className="w-full px-4 py-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-900/30 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-lg font-black text-blue-600 dark:text-blue-400"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Preço de Custo (R$)</label>
                            <CurrencyInput
                                value={formData.costPrice || 0}
                                onChangeValue={(val) => setFormData({ ...formData, costPrice: val })}
                                className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-slate-500 outline-none transition-all text-sm font-bold dark:text-slate-100"
                            />
                        </div>
                        <div className="md:col-span-2 flex items-center gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="flex-1">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Status do Serviço</h4>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Serviços inativos não aparecem em novas vendas</p>
                            </div>
                            <div className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-colors ${formData.active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} onClick={() => setFormData({ ...formData, active: !formData.active })}>
                                <div className={`w-6 h-6 bg-white rounded-full transition-transform shadow-sm ${formData.active ? 'translate-x-6' : 'translate-x-0'}`} />
                            </div>
                        </div>
                    </div>
                </form>

                <div className="p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all active:scale-95 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200 dark:shadow-none transition-all active:scale-95 flex items-center gap-2"
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <i className="bi bi-check-lg" />
                        )}
                        {service ? "Salvar Alterações" : "Criar Serviço"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ServiceFormModal;
