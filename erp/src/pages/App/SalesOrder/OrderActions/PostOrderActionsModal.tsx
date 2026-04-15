import React from 'react';
import Order from "../../../types/order.type";
import { buttons } from "./orderActionsConfig";

interface PostOrderActionsModalProps {
    order: Order;
    onClose: () => void;
}

const PostOrderActionsModal: React.FC<PostOrderActionsModalProps> = ({ order, onClose }) => {
    // Filter the buttons exactly like OrderHistoryCard does: buttons that match the order type.
    const availableActions = buttons.filter(btn => btn.orderTypes.includes(order.orderType || 'sale') || btn.orderTypes.includes('all'));

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <i className="bi bi-box-seam-fill text-lg"></i>
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-800 dark:text-slate-100">Etapas Pós-Venda</h3>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
                                Pedido #{order.id} • {order.customerData?.fullName || 'Cliente não informado'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-rose-500 transition-colors">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-3">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                        O pedido foi finalizado com sucesso! Selecione abaixo as ações que deseja realizar agora:
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {availableActions.map((btn) => {
                            // Extract color base: text-green-600 hover:bg-green-50
                            const isGreen = btn.color.includes('green');
                            const isPurple = btn.color.includes('purple');
                            const isOrange = btn.color.includes('orange');
                            const isIndigo = btn.color.includes('indigo');

                            let baseColor = 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
                            if (isGreen) baseColor = 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20';
                            if (isPurple) baseColor = 'text-purple-600 bg-purple-50 dark:bg-purple-900/20';
                            if (isOrange) baseColor = 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
                            if (isIndigo) baseColor = 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20';

                            return (
                                <button
                                    key={btn.key}
                                    onClick={() => {
                                        import('./orderActionsConfig').then((module) => {
                                            module.actionsMap[btn.action](order);
                                        });
                                    }}
                                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all hover:-translate-y-1 hover:shadow-lg ${baseColor}`}
                                >
                                    <i className={`bi ${btn.icon} text-2xl mb-2`}></i>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-center">{btn.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all"
                    >
                        Concluir
                    </button>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
                .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}} />
        </div>
    );
};

export default PostOrderActionsModal;
