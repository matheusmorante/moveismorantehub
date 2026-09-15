import React from 'react';
import { AppSettings } from '@/pages/utils/settingsService';

interface Props {
    settings: AppSettings;
    onChange: (path: string, value: any) => void;
}

const BusinessRulesSection: React.FC<Props> = ({ settings, onChange }) => {
    const rules = [
        {
            id: 'allowNegativeStock',
            label: 'Permitir Estoque Negativo',
            description: 'Permite finalizar vendas mesmo que o produto não tenha saldo no estoque.',
            icon: 'bi-dash-circle-dotted',
            color: 'text-rose-500',
            bg: 'bg-rose-50 dark:bg-rose-900/10'
        },
        {
            id: 'autoReserveStock',
            label: 'Reserva Automática (Rascunho)',
            description: 'Reserva os itens no estoque assim que o pedido é salvo como rascunho.',
            icon: 'bi-lock-fill',
            color: 'text-amber-500',
            bg: 'bg-amber-50 dark:bg-amber-900/10'
        },
        {
            id: 'autoCapitalizeCustomerData',
            label: 'Capitalizar Dados (Cliente)',
            description: 'Deixa a primeira letra de cada nome em maiúscula automaticamente ao digitar.',
            icon: 'bi-fonts',
            color: 'text-purple-500',
            bg: 'bg-purple-50 dark:bg-purple-900/10'
        },
        {
            id: 'autoSaveOnlyWhenDirty',
            label: 'Salvar Apenas se Alterado',
            description: 'Otimiza o processo de salvamento automático para economizar processamento.',
            icon: 'bi-save2',
            color: 'text-emerald-500',
            bg: 'bg-emerald-50 dark:bg-emerald-900/10'
        }
    ];

    const getRuleValue = (id: string): boolean => {
        if (id in settings.businessRules) return settings.businessRules[id as keyof typeof settings.businessRules];
        return (settings as any)[id];
    };

    const handleToggle = (id: string) => {
        if (id in settings.businessRules) {
            onChange(`businessRules.${id}`, !settings.businessRules[id as keyof typeof settings.businessRules]);
        } else {
            onChange(id, !(settings as any)[id]);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rules.map(rule => (
                    <div 
                        key={rule.id}
                        onClick={() => handleToggle(rule.id)}
                        className={`p-6 rounded-[2rem] border-2 transition-all cursor-pointer flex items-center gap-4 ${getRuleValue(rule.id) ? 'bg-slate-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60'}`}
                    >
                        <div className={`w-12 h-12 rounded-2xl ${rule.bg} flex items-center justify-center shadow-sm`}>
                            <i className={`bi ${rule.icon} ${rule.color} text-2xl`}></i>
                        </div>
                        <div className="flex-1">
                            <span className="block text-xs font-black uppercase tracking-widest text-slate-400">Regras</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-tight block mt-0.5">{rule.label}</span>
                            <p className="text-[10px] text-slate-500 mt-1 leading-tight">{rule.description}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${getRuleValue(rule.id) ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-200'}`}>
                            {getRuleValue(rule.id) && <i className="bi bi-check-lg text-xs"></i>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BusinessRulesSection;
