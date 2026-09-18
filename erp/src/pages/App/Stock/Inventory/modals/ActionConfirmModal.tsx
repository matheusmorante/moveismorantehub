import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface ActionConfirmModalProps {
    isOpen: boolean;
    actionType: 'reverse' | 'apply' | null;
    inventoryCode: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ActionConfirmModal: React.FC<ActionConfirmModalProps> = ({ isOpen, actionType, inventoryCode, onConfirm, onCancel }) => {
    const [timeLeft, setTimeLeft] = useState(3);
    useEffect(() => {
        if (!isOpen) {
            setTimeLeft(3);
            return;
        }
        if (timeLeft <= 0) return;
        const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
        return () => clearTimeout(timer);
    }, [isOpen, timeLeft]);

    if (!isOpen || !actionType || typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={onCancel} />
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in-95 duration-200">
                <i className={`bi ${actionType === 'reverse' ? 'bi-arrow-counterclockwise text-rose-500' : 'bi-check-all text-emerald-500'} text-4xl mb-4 block`} />
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">
                    {actionType === 'reverse' ? 'Desfazer Inventário' : 'Aplicar Ajuste'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                    {actionType === 'reverse' 
                        ? `Isso irá estornar todas as movimentações geradas pelo inventário #${inventoryCode}. Os saldos retornarão aos valores originais.`
                        : `Isso irá reativar as movimentações geradas pelo inventário #${inventoryCode}. Os saldos voltarão aos valores contados.`}
                </p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors">Cancelar</button>
                    <button 
                        onClick={onConfirm} 
                        disabled={timeLeft > 0}
                        className={`flex-1 px-4 py-2 rounded-xl font-bold text-white transition-all ${timeLeft > 0 ? 'opacity-50 cursor-not-allowed' : ''} ${actionType === 'reverse' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                    >
                        {timeLeft > 0 ? `Aguarde ${timeLeft}s` : 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
