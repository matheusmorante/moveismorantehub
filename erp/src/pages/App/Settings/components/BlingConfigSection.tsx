import React from 'react';
import { AppSettings } from '@/pages/utils/settingsService';
import { blingService } from '@/pages/services/blingService';

interface BlingConfigSectionProps {
    settings: AppSettings;
    onChange: (path: string, value: any) => void;
}

const BlingConfigSection: React.FC<BlingConfigSectionProps> = ({ settings, onChange }) => {
    const config = settings.blingConfig || {
        apiKey: '',
        apiToken: '',
        clientId: '',
        clientSecret: '',
        syncEnabled: false
    };

    const updateConfig = (field: string, value: any) => {
        onChange('blingConfig', {
            ...config,
            [field]: value
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 p-6 rounded-3xl flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg">
                    <i className="bi bi-info-circle-fill text-lg"></i>
                </div>
                <div>
                    <h5 className="text-sm font-black uppercase text-blue-900 dark:text-blue-100 mb-1">Integração API v3</h5>
                    <p className="text-xs text-blue-700/70 dark:text-blue-300/70 leading-relaxed font-medium">
                        Configure as credenciais da sua conta Bling para habilitar a sincronização automática de estoque e produtos.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
                {/* Ativar Integração */}
                <div className="col-span-1 md:col-span-2 p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-premium-sm flex items-center justify-between group hover:border-blue-500 transition-all">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${config.syncEnabled ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                            <i className={`bi bi-lightning-fill text-xl ${config.syncEnabled ? 'animate-pulse' : ''}`}></i>
                        </div>
                        <div>
                            <h4 className="font-black text-slate-800 dark:text-slate-200 text-[11px] uppercase tracking-widest">Sincronização Ativa</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Habilitar comunicação com o Bling</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => updateConfig('syncEnabled', !config.syncEnabled)}
                        className={`w-14 h-8 rounded-full transition-all flex items-center p-1 ${config.syncEnabled ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                        <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${config.syncEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                </div>


                {/* API Token */}
                <div className="flex flex-col gap-3 group">
                    <label className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-focus-within:text-blue-500 transition-colors">Client ID (OAuth)</label>
                    <div className="relative">
                        <i className="bi bi-shield-lock absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"></i>
                        <input
                            type="text"
                            value={config.clientId}
                            onChange={(e) => updateConfig('clientId', e.target.value)}
                            placeholder="Client ID da aplicação Bling..."
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-14 pr-6 py-4 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 transition-all font-mono"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-3 group col-span-1 md:col-span-2">
                    <label className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-focus-within:text-blue-500 transition-colors">Client Secret (OAuth)</label>
                    <div className="relative">
                        <i className="bi bi-shield-shaded absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"></i>
                        <input
                            type="password"
                            value={config.clientSecret}
                            onChange={(e) => updateConfig('clientSecret', e.target.value)}
                            placeholder="Client Secret da aplicação Bling..."
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-14 pr-6 py-4 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 transition-all font-mono"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-400 shadow-premium-sm">
                        <i className="bi bi-patch-question-fill text-2xl"></i>
                    </div>
                    <div>
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 mb-1">Como integrar?</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Siga os passos no painel do Bling</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => {
                            const url = blingService.getAuthorizeUrl();
                            window.location.href = url;
                        }}
                        className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-premium-lg flex items-center gap-2"
                    >
                        <i className="bi bi-person-check-fill"></i> Conectar Conta Bling
                    </button>
                    <a 
                        href="https://www.bling.com.br" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-premium-lg flex items-center justify-center"
                    >
                        Abrir Bling
                    </a>
                </div>
            </div>
        </div>
    );
};

export default BlingConfigSection;
