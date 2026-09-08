import React from "react";
import { AppSettings } from '@/pages/utils/settingsService';

interface Props {
    settings: AppSettings;
    onChange: (path: string, value: any) => void;
}

const AutoScrollSection: React.FC<Props> = ({ settings, onChange }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-50 dark:divide-slate-800/50 border-b border-slate-50 dark:border-slate-800/50">
            <div className="p-8">
                <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-6">Áreas Habilitadas</h5>
                <div className="space-y-6">
                    {[
                        { id: 'orderTable', label: 'Tabela de Pedidos', icon: 'bi-grid-3x3' },
                        { id: 'scheduleCards', label: 'Cards da Agenda', icon: 'bi-card-list' },
                        { id: 'scheduleTable', label: 'Tabela da Agenda', icon: 'bi-calendar3' }
                    ].map(area => (
                        <div key={area.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                                    <i className={`bi ${area.icon}`} />
                                </div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{area.label}</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={settings.autoScroll[area.id as keyof typeof settings.autoScroll] as boolean} 
                                    onChange={(e) => onChange(`autoScroll.${area.id}`, e.target.checked)} 
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
                            </label>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="p-8 space-y-8">
                <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-6">Ajuste de Comportamento</h5>
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                                Velocidade: <span className="text-blue-600">{settings.autoScroll.speed}</span>
                            </label>
                        </div>
                        <input 
                            type="range" 
                            min="5" 
                            max="60" 
                            value={settings.autoScroll.speed} 
                            onChange={(e) => onChange('autoScroll.speed', parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                                Sensibilidade: <span className="text-blue-600">{settings.autoScroll.threshold}px</span>
                            </label>
                        </div>
                        <input 
                            type="range" 
                            min="20" 
                            max="200" 
                            value={settings.autoScroll.threshold} 
                            onChange={(e) => onChange('autoScroll.threshold', parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AutoScrollSection;
