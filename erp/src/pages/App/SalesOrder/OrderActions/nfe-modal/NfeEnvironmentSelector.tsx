import React from "react";
import { NFE_ENVIRONMENTS } from '@/pages/utils/nfe/nfeEnvironment';

interface NfeEnvironmentSelectorProps {
    environment: 1 | 2;
    onSelect: (env: 1 | 2) => void;
}

export const NfeEnvironmentSelector: React.FC<NfeEnvironmentSelectorProps> = ({
    environment,
    onSelect
}) => {
    return (
        <div className="flex flex-col gap-2">
            <fieldset>
                <legend className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Ambiente de emissão</legend>
            <div className="grid grid-cols-2 gap-3">
                {NFE_ENVIRONMENTS.map(option => (
                    <label key={option.value} className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                        environment === option.value
                            ? option.value === 1
                                ? 'border-rose-500 bg-rose-50/70 text-rose-800 ring-2 ring-rose-500/20 dark:bg-rose-950/30 dark:text-rose-200'
                                : 'border-blue-600 bg-blue-50/50 text-blue-700 ring-2 ring-blue-500/20 dark:bg-blue-950/30 dark:text-blue-300'
                            : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400'
                    }`}>
                        <span>
                            <span className="block text-xs font-black uppercase">{option.title}</span>
                            <span className="block text-[10px] opacity-75">{option.detail}</span>
                        </span>
                        <input
                            type="radio"
                            name="nfe-environment"
                            aria-label={option.title}
                            value={option.value}
                            checked={environment === option.value}
                            onChange={() => onSelect(option.value)}
                            className="h-4 w-4 accent-blue-600"
                        />
                    </label>
                ))}
            </div>
            </fieldset>
        </div>
    );
};
