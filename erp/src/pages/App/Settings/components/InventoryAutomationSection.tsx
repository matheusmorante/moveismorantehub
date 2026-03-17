import React from 'react';
import { AppSettings, OrderStatusConfig } from '@/pages/utils/settingsService';

interface Props {
    settings: AppSettings;
    onChange: (path: string, value: any) => void;
}

const InventoryAutomationSection: React.FC<Props> = ({ settings, onChange }) => {
    const { inventoryAutomation, orderStatuses } = settings;

    const toggleStatus = (path: string, current: string[], statusId: string) => {
        const next = current.includes(statusId) 
            ? current.filter(id => id !== statusId)
            : [...current, statusId];
        onChange(path, next);
    };

    return (
        <div className="flex flex-col gap-10 p-8">
            {/* Sales Order Stock Withdrawal */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-900/10 flex items-center justify-center shadow-sm">
                        <i className="bi bi-box-arrow-up text-rose-500 text-2xl"></i>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Saída Automática (Vendas)</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Selecione quais status de pedido de venda disparam a baixa no estoque.</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    {orderStatuses.map((status: OrderStatusConfig) => (
                        <button
                            key={status.id}
                            type="button"
                            onClick={() => toggleStatus('inventoryAutomation.autoWithdrawalOnStatus', inventoryAutomation.autoWithdrawalOnStatus, status.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all ${
                                inventoryAutomation.autoWithdrawalOnStatus.includes(status.id)
                                    ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-200 dark:shadow-none'
                                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200'
                            }`}
                        >
                            {status.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Purchase Order Stock Entry */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 flex items-center justify-center shadow-sm">
                        <i className="bi bi-box-arrow-in-down text-emerald-500 text-2xl"></i>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Entrada Automática (Compras)</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Selecione quais status de pedido de compra disparam a entrada no estoque.</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    {['pending', 'completed'].map((statusId) => (
                        <button
                            key={statusId}
                            type="button"
                            onClick={() => toggleStatus('inventoryAutomation.autoEntryOnPurchaseStatus', inventoryAutomation.autoEntryOnPurchaseStatus, statusId)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all ${
                                inventoryAutomation.autoEntryOnPurchaseStatus.includes(statusId)
                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-none'
                                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200'
                            }`}
                        >
                            {statusId === 'pending' ? 'Pendente' : 'Finalizado'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Origin Labels Configuration */}
            <div className="flex flex-col gap-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/10 flex items-center justify-center shadow-sm">
                        <i className="bi bi-tags text-indigo-500 text-2xl"></i>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Rótulos de Origem</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Personalize como os nomes das origens aparecem no histórico.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vendas (Pedidos)</label>
                        <input 
                            type="text"
                            value={inventoryAutomation.originLabels.sales}
                            onChange={(e) => onChange('inventoryAutomation.originLabels.sales', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 px-5 py-3 rounded-xl border border-slate-100 dark:border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Compras (Pedidos)</label>
                        <input 
                            type="text"
                            value={inventoryAutomation.originLabels.purchases}
                            onChange={(e) => onChange('inventoryAutomation.originLabels.purchases', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 px-5 py-3 rounded-xl border border-slate-100 dark:border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ajuste Manual</label>
                        <input 
                            type="text"
                            value={inventoryAutomation.originLabels.adjustment}
                            onChange={(e) => onChange('inventoryAutomation.originLabels.adjustment', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 px-5 py-3 rounded-xl border border-slate-100 dark:border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Reversal Logic */}
            <div 
                onClick={() => onChange('inventoryAutomation.autoReverseOnCancel', !inventoryAutomation.autoReverseOnCancel)}
                className={`p-6 rounded-[2rem] border-2 transition-all cursor-pointer flex items-center gap-4 ${inventoryAutomation.autoReverseOnCancel ? 'bg-slate-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60'}`}
            >
                <div className={`w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center shadow-sm`}>
                    <i className={`bi bi-arrow-counterclockwise text-blue-500 text-2xl`}></i>
                </div>
                <div className="flex-1">
                    <span className="block text-xs font-black uppercase tracking-widest text-slate-400">Cancelamento</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-tight block mt-0.5">Estorno Automático</span>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">Devolve os itens ao estoque automaticamente quando um pedido de venda é cancelado.</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${inventoryAutomation.autoReverseOnCancel ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-200'}`}>
                    {inventoryAutomation.autoReverseOnCancel && <i className="bi bi-check-lg text-xs"></i>}
                </div>
            </div>
        </div>
    );
};

export default InventoryAutomationSection;
