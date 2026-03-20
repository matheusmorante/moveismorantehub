import React from "react";
import Order from "../../types/order.type";
import { subscribeToPeople } from "../../utils/personService";
import PersonFormModal from "../Registrations/shared/PersonFormModal";
import Person from "../../types/person.type";

interface FormHeaderProps {
    currentOrder?: Order | null;
    onClearForm: () => void;
    currentOrderId?: string | null;
    orderDate: string;
    setOrderDate: (date: string) => void;
    seller: string;
    setSeller: (seller: string) => void;
    isSavingDraft: boolean;
    errors: Record<string, string>;
    deliveryMethod: 'delivery' | 'pickup';
    setDeliveryMethod: (method: 'delivery' | 'pickup') => void;
    onMainAction?: (e?: React.MouseEvent) => void;
    isSaving?: boolean;
    status: string;
}

const FormHeader = ({ 
    currentOrder, 
    onClearForm, 
    orderDate, 
    setOrderDate, 
    seller, 
    setSeller, 
    isSavingDraft,
    errors,
    currentOrderId,
    deliveryMethod,
    setDeliveryMethod,
    onMainAction,
    isSaving,
    status
}: FormHeaderProps) => {
    const [employeeNames, setEmployeeNames] = React.useState<string[]>([]);
    const [isEmployeeModalOpen, setIsEmployeeModalOpen] = React.useState(false);

    React.useEffect(() => {
        const unsubscribe = subscribeToPeople('employees', (people) => {
            const names = people
                .map(p => p.fullName)
                .filter(name => name && name.trim() !== "");
            setEmployeeNames(names);
        });
        return unsubscribe;
    }, []);

    const handleEmployeeSuccess = (person: Person) => {
        if (person.fullName) {
            setSeller(person.fullName);
        }
        setIsEmployeeModalOpen(false);
    };

    return (
        <div className="flex flex-col gap-6 pb-6 border-b border-slate-100 dark:border-slate-800 mb-8 pt-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                    {currentOrderId && (
                        <div className="flex items-center gap-3">
                            <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-800 shadow-sm">
                                #{currentOrderId.slice(-6).toUpperCase()}
                            </div>
                        </div>
                    )}

                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-inner">
                        <button
                            type="button"
                            onClick={() => setDeliveryMethod('delivery')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${deliveryMethod === 'delivery'
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 scale-105'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                        >
                            <i className="bi bi-truck text-xs" /> Entrega
                        </button>
                        <button
                            type="button"
                            onClick={() => setDeliveryMethod('pickup')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${deliveryMethod === 'pickup'
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20 scale-105'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                        >
                            <i className="bi bi-hand-index-thumb-fill text-xs" /> Retirada
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                    {/* Botão de Ação Principal (Novo Local) */}
                    {onMainAction && (
                         <button
                            type="button"
                            onClick={onMainAction}
                            disabled={isSaving}
                            className={`flex items-center gap-2 px-5 py-2 rounded-2xl font-black uppercase tracking-widest text-[9px] shadow-xl transition-all active:scale-95 disabled:opacity-50 ${status === 'draft' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'} text-white`}
                        >
                            {isSaving ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <i className="bi bi-cloud-arrow-up text-xs" />}
                            {status === 'draft' ? 'Cadastrar Venda' : 'Salvar Edição'}
                        </button>
                    )}

                    {/* Status do Rascunho */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className={`w-1.5 h-1.5 rounded-full ${isSavingDraft ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest leading-none">
                            {isSavingDraft ? 'Sincronizando...' : 'Alterações Salvas'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Inputs: Vendedor e Data */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                {/* Vendedor */}
                <div className="flex flex-col gap-1.5 relative group">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1 flex items-center justify-between">
                        Vendedor Responsável <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <i className="bi bi-person-check text-base" />
                            </div>
                            <select
                                value={seller}
                                onChange={(e) => setSeller(e.target.value)}
                                className={`w-full bg-white dark:bg-slate-900 border ${errors['seller'] ? 'border-red-500 ring-4 ring-red-500/10' : 'border-slate-200 dark:border-slate-800'} pl-10 pr-8 py-2.5 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none uppercase`}
                            >
                                <option value="">Selecione o Vendedor</option>
                                {employeeNames.map((name, idx) => (
                                    <option key={idx} value={name}>{name}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <i className="bi bi-chevron-down text-xs" />
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsEmployeeModalOpen(true)}
                            title="Novo Vendedor"
                            className="w-11 h-11 flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-100 dark:border-blue-800 hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-90 shrink-0"
                        >
                            <i className="bi bi-plus-lg text-lg" />
                        </button>
                    </div>
                    {errors['seller'] && (
                        <div className="absolute -top-6 right-0 bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded shadow-lg animate-fade-in uppercase">
                            Obrigatório
                        </div>
                    )}
                </div>

                {/* Data do Pedido */}
                <div className="flex flex-col gap-1.5 relative group">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">
                        Data e Hora do Pedido
                    </label>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <i className="bi bi-calendar-event text-base" />
                        </div>
                        <input
                            type="datetime-local"
                            value={orderDate}
                            onChange={(e) => setOrderDate(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 pl-10 pr-4 py-2.5 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                        />
                    </div>
                </div>
            </div>

            <PersonFormModal 
                isOpen={isEmployeeModalOpen}
                onClose={() => setIsEmployeeModalOpen(false)}
                onSuccess={handleEmployeeSuccess}
                collectionName="employees"
                title="Vendedor"
            />
        </div>
    );
};

export default FormHeader;
