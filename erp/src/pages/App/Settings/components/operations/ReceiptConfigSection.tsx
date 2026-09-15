import React from 'react';
import { AppSettings } from '@/pages/utils/settingsService';

interface Props {
    settings: AppSettings;
    onChange: (path: string, value: any) => void;
}

const ReceiptConfigSection: React.FC<Props> = ({ settings, onChange }) => {
    return (
        <div className="flex flex-col gap-8 p-8">
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Texto de Rodapé do Recibo</label>
                    <textarea
                        rows={3}
                        value={settings.receiptConfig.footerText || ''}
                        onChange={(e) => onChange('receiptConfig.footerText', e.target.value)}
                        placeholder="Ex: Obrigado pela preferência! Guarde este recibo para sua garantia."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 dark:text-slate-200 transition-all font-medium leading-relaxed resize-none"
                    />
                    <p className="text-[10px] text-slate-500 italic font-medium">Este texto aparecerá centralizado no final de todos os recibos impressos.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                        onClick={() => onChange('receiptConfig.showSeller', !settings.receiptConfig.showSeller)}
                        className={`p-5 rounded-[1.5rem] border-2 transition-all cursor-pointer flex items-center gap-4 ${settings.receiptConfig.showSeller ? 'bg-slate-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60'}`}
                    >
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <i className="bi bi-person-badge text-blue-500 text-lg"></i>
                        </div>
                        <div className="flex-1">
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">Exibir Vendedor</span>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${settings.receiptConfig.showSeller ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-200'}`}>
                            {settings.receiptConfig.showSeller && <i className="bi bi-check-lg text-[10px]"></i>}
                        </div>
                    </div>

                    <div 
                        onClick={() => onChange('receiptConfig.compactMode', !settings.receiptConfig.compactMode)}
                        className={`p-5 rounded-[1.5rem] border-2 transition-all cursor-pointer flex items-center gap-4 ${settings.receiptConfig.compactMode ? 'bg-slate-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60'}`}
                    >
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <i className="bi bi-arrows-angle-contract text-blue-500 text-lg"></i>
                        </div>
                        <div className="flex-1">
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">Modo Compacto</span>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${settings.receiptConfig.compactMode ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-200'}`}>
                            {settings.receiptConfig.compactMode && <i className="bi bi-check-lg text-[10px]"></i>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReceiptConfigSection;
