import React from "react";
import { AppSettings } from '@/pages/utils/settingsService';

interface Props {
    settings: AppSettings;
    onChange: (path: string, value: any) => void;
}

const LogisticsSection: React.FC<Props> = ({ settings, onChange }) => {
    return (
        <>
            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 max-w-lg">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Valor do Frete por KM (Somente Ida)</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Define um valor automático para o frete com base na distância de ida informada no pedido.</p>
                    </div>
                    <div className="w-full md:w-80 relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                        <input 
                            type="number" 
                            step="0.01"
                            value={settings.freightPerKm} 
                            onChange={(e) => onChange('freightPerKm', parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-5 py-3.5 text-sm font-bold focus:border-blue-500 outline-none transition-all dark:text-slate-200"
                        />
                    </div>
                </div>
            </div>

            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 max-w-lg">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Chave de API do Google Maps</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Usada para buscar endereços com máxima precisão pelo autocompletar ao invés das APIs gratuitas (Nominatim/ArcGIS).</p>
                    </div>
                    <div className="w-full md:w-80 relative">
                        <i className="bi bi-key absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input 
                            type="password" 
                            placeholder="AIzaSy..."
                            value={settings.googleMapsApiKey} 
                            onChange={(e) => onChange('googleMapsApiKey', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-5 py-3.5 text-sm font-bold focus:border-blue-500 outline-none transition-all dark:text-slate-200"
                        />
                    </div>
                </div>
            </div>

            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 max-w-lg">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Rótulos de Aviso no Cronograma</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Exibir as observações (tags) diretamente nos cards e tabela do cronograma.</p>
                    </div>
                    <div className="w-full md:w-80 flex justify-end">
                        <button
                            type="button"
                            onClick={() => onChange('showScheduleNoticeLabels', !settings.showScheduleNoticeLabels)}
                            className={`w-14 h-7 rounded-full transition-all relative ${settings.showScheduleNoticeLabels ? 'bg-blue-600 shadow-inner' : 'bg-slate-300 dark:bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md ${settings.showScheduleNoticeLabels ? 'left-8' : 'left-1'}`} />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LogisticsSection;
