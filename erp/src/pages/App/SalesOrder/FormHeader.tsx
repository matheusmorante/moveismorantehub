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
        <div className="w-full mb-6 pt-2">
            {!isBudget && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 sm:p-3 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
                    {/* Toggle de Modalidade */}
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 hidden sm:inline">
                            Modalidade:
                        </span>
                        <div className="flex bg-slate-200/70 dark:bg-slate-900 p-1 rounded-xl border border-slate-300/50 dark:border-slate-700/50 shadow-inner flex-1 sm:flex-none">
                            <button
                                type="button"
                                onClick={() => setDeliveryMethod('delivery')}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                    deliveryMethod === 'delivery'
                                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                                }`}
                            >
                                <i className="bi bi-truck text-xs" /> Entrega
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeliveryMethod('pickup')}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                    deliveryMethod === 'pickup'
                                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                                }`}
                            >
                                <i className="bi bi-hand-index-thumb-fill text-xs" /> Retirada
                            </button>
                        </div>
                    </div>

                    {/* Preenchimento IA */}
                    {onLoadJSON && (
                        <button
                            type="button"
                            onClick={() => setIsAIModalOpen(true)}
                            className="group flex items-center justify-center gap-2 px-3.5 py-2 bg-gradient-to-r from-violet-600/10 via-indigo-600/10 to-blue-600/10 hover:from-violet-600/20 hover:to-blue-600/20 dark:from-violet-950/40 dark:to-blue-950/40 border border-violet-300/60 dark:border-violet-700/50 rounded-xl text-[10px] font-black uppercase tracking-wider text-violet-700 dark:text-violet-300 transition-all shadow-sm active:scale-95 shrink-0"
                        >
                            <i className="bi bi-stars text-xs text-violet-600 dark:text-violet-400 group-hover:scale-125 transition-transform" />
                            <span>Preenchimento Inteligente IA</span>
                        </button>
                    )}
                </div>
            )}

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
