import React from 'react';
import { AppSettings } from '@/pages/utils/settingsService';

interface ScannerConfigSectionProps {
    settings: AppSettings;
    onChange: (path: string, value: any) => void;
}

const ScannerConfigSection: React.FC<ScannerConfigSectionProps> = ({ settings, onChange }) => {
    return (
        <div className="space-y-1">
            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 max-w-lg">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Intervalo entre Leituras (ms)</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Tempo de espera em milissegundos para evitar contagens duplicadas do mesmo item. (Ex: 1000 = 1 segundo)</p>
                    </div>
                    <div className="w-full md:w-80 flex items-center gap-4">
                        <input
                            type="range"
                            min="100"
                            max="5000"
                            step="100"
                            value={settings.scannerConfig?.delay || 1500}
                            onChange={(e) => onChange('scannerConfig.delay', parseInt(e.target.value))}
                            className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <span className="text-sm font-black text-blue-600 dark:text-blue-400 w-20 text-right">
                            {((settings.scannerConfig?.delay || 1500) / 1000).toFixed(1)}s
                        </span>
                    </div>
                </div>
            </div>

            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 max-w-lg">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Som de Confirmação (Bip)</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Tocar o famoso "pibe" quando um código for identificado com sucesso.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer group">
                        <input 
                            type="checkbox" 
                            checked={settings.scannerConfig?.enableBeep ?? true} 
                            onChange={(e) => onChange('scannerConfig.enableBeep', e.target.checked)}
                            className="sr-only peer" 
                        />
                        <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600 group-active:after:w-8"></div>
                    </label>
                </div>
            </div>

            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 max-w-lg">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Vibrar ao Escanear</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Habilitar feedback tátil (vibração curta) para celulares compatíveis.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer group">
                        <input 
                            type="checkbox" 
                            checked={settings.scannerConfig?.vibrate ?? true} 
                            onChange={(e) => onChange('scannerConfig.vibrate', e.target.checked)}
                            className="sr-only peer" 
                        />
                        <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600 group-active:after:w-8"></div>
                    </label>
                </div>
            </div>
        </div>
    );
};

export default ScannerConfigSection;
