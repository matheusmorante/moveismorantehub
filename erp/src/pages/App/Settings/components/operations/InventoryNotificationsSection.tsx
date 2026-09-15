import React from 'react';
import { AppSettings } from '@/pages/utils/settingsService';

interface InventoryNotificationsSectionProps {
    settings: AppSettings;
    onChange: (path: string, value: any) => void;
}

const InventoryNotificationsSection = ({ settings, onChange }: InventoryNotificationsSectionProps) => {
    const selectedConditions = settings.stockNotificationConditions || ['novo'];

    const options = [
        { id: 'novo', label: 'Produtos Novos', desc: 'Gerar alertas para itens em estado de novo.', icon: 'bi-stars', color: 'text-blue-500', bg: 'bg-blue-500' },
        { id: 'usado', label: 'Produtos Usados', desc: 'Gerar alertas para itens de segunda mão.', icon: 'bi-arrow-repeat', color: 'text-amber-500', bg: 'bg-amber-500' },
        { id: 'salvado', label: 'Produtos Salvados', desc: 'Gerar alertas para itens avariados/salvados.', icon: 'bi-exclamation-octagon', color: 'text-rose-500', bg: 'bg-rose-500' },
    ];

    const toggleCondition = (id: string) => {
        const current = [...selectedConditions];
        const index = current.indexOf(id as any);
        
        if (index > -1) {
            // Don't allow empty selection if you want at least one, but here we can allow it
            current.splice(index, 1);
        } else {
            current.push(id as any);
        }
        
        onChange('stockNotificationConditions', current);
    };

    return (
        <div className="flex flex-col">
            <div className="p-8 space-y-8">
                <div className="flex flex-col gap-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Condições Monitoradas</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {options.map((opt) => {
                            const isSelected = selectedConditions.includes(opt.id as any);
                            return (
                                <div 
                                    key={opt.id}
                                    onClick={() => toggleCondition(opt.id)}
                                    className={`relative p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer flex flex-col gap-4 group ${isSelected ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none translate-y-[-4px]' : 'bg-slate-50/50 dark:bg-slate-950 border-transparent opacity-60 grayscale hover:grayscale-0 hover:opacity-100'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isSelected ? opt.bg + ' text-white shadow-lg' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                                            <i className={`bi ${opt.icon} text-xl`}></i>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-700'}`}>
                                            {isSelected && <i className="bi bi-check-lg text-[10px] font-bold"></i>}
                                        </div>
                                    </div>
                                    <div>
                                        <span className={`block font-black uppercase tracking-widest text-[10px] mb-1 ${isSelected ? opt.color : 'text-slate-400'}`}>{opt.label}</span>
                                        <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{opt.desc}</span>
                                    </div>
                                    
                                    {isSelected && (
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent rounded-full" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-4 p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-[2rem] border border-blue-100 dark:border-blue-900/30 flex items-start gap-5">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                        <i className="bi bi-info-circle-fill text-lg"></i>
                    </div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed font-semibold">
                        Agora você tem controle total. Se um item for "Usado" ou "Salvado", ele só gerará alertas se a respectiva caixa estiver marcada acima. Isso evita notificações desnecessárias para itens que não possuem reposição regular.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default InventoryNotificationsSection;
