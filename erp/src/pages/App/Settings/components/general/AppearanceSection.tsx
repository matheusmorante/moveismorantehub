import React from "react";
import { AppSettings } from '@/pages/utils/settingsService';

interface Props {
    settings: AppSettings;
    onChange: (path: string, value: any) => void;
}

export default function AppearanceSection({ settings, onChange }: Props): any {
    return (
        <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 max-w-lg">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Tema Padrão</h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Escolha se o sistema deve iniciar no modo claro ou escuro.</p>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    {([
                        { label: 'Claro', value: 'light', icon: 'bi-sun-fill' },
                        { label: 'Escuro', value: 'dark', icon: 'bi-moon-stars-fill' }
                    ] as const).map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => onChange('defaultTheme', opt.value)}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${settings.defaultTheme === opt.value
                                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xl shadow-blue-500/10'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                        >
                            <i className={`bi ${opt.icon}`} />
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

