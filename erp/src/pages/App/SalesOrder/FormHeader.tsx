import React, { useState, useEffect } from "react";
import Order from "../../types/order.type";
import { subscribeToPeople } from "../../utils/personService";
import SmartAIFillModal from "./components/SmartAIFillModal";

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
    isBudget?: boolean;
    onLoadJSON?: (data: any) => void;
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
    status,
    isBudget,
    onLoadJSON
}: FormHeaderProps) => {
    const [employeeNames, setEmployeeNames] = useState<string[]>([]);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeToPeople('employees', (people) => {
            const names = people
                .map(p => p.fullName)
                .filter(name => name && name.trim() !== "");
            setEmployeeNames(names);
        });
        return unsubscribe;
    }, []);

    return (
        <div className="flex flex-col gap-4 pb-5 border-b border-slate-100 dark:border-slate-800 mb-6 pt-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                {!isBudget && (
                    <div className="flex items-center flex-wrap gap-3 w-full">
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-inner">
                            <button
                                type="button"
                                onClick={() => setDeliveryMethod('delivery')}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${deliveryMethod === 'delivery'
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                    }`}
                            >
                                <i className="bi bi-truck text-xs" /> Entrega
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeliveryMethod('pickup')}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${deliveryMethod === 'pickup'
                                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                    }`}
                            >
                                <i className="bi bi-hand-index-thumb-fill text-xs" /> Retirada
                            </button>
                        </div>

                        {onLoadJSON && (
                            <button
                                type="button"
                                onClick={() => setIsAIModalOpen(true)}
                                className="group flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-violet-600/10 via-indigo-600/10 to-blue-600/10 hover:from-violet-600/20 hover:to-blue-600/20 dark:from-violet-950/40 dark:to-blue-950/40 border border-violet-300/60 dark:border-violet-700/50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-violet-700 dark:text-violet-300 transition-all shadow-sm hover:scale-105"
                            >
                                <i className="bi bi-stars text-xs text-violet-600 dark:text-violet-400 group-hover:scale-125 transition-transform" /> 
                                Preenchimento Inteligente IA
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Modal de IA por Digitação e Áudio Direct */}
            <SmartAIFillModal
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                onApplyData={(data) => {
                    if (onLoadJSON) {
                        onLoadJSON(data);
                    }
                }}
                sellerList={employeeNames}
            />
        </div>
    );
};

export default FormHeader;
