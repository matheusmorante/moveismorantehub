import React, { useState } from 'react';
import { AppSettings } from '@/pages/utils/settingsService';
import { toast } from 'react-toastify';
import { compressImage } from '@/pages/utils/imageUtils';

interface AIPromptsSectionProps {
    settings: AppSettings;
    onChange: (path: string, value: any) => void;
}

const AIPromptsSection = ({ settings, onChange }: AIPromptsSectionProps) => {
    const [isCompressing, setIsCompressing] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsCompressing(true);
        try {
            const base64 = await compressImage(file, { maxMB: 0.1, maxWidth: 512 });
            onChange('aiPrompts.aiAvatar', base64);
            toast.success("Foto do assistente atualizada!");
        } catch (err) {
            // Error toast handled in utility
        } finally {
            setIsCompressing(false);
        }
    };

    return (
        <div className="flex flex-col">
            <div className="p-8 bg-indigo-50/30 dark:bg-indigo-900/10 border-b border-indigo-100 dark:border-indigo-900/30">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none overflow-hidden relative group">
                        {settings.aiPrompts.aiAvatar ? (
                           <img src={settings.aiPrompts.aiAvatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                           <i className="bi bi-robot text-2xl"></i>
                        )}
                    </div>
                    <div>
                        <h4 className="font-black text-slate-800 dark:text-slate-100 text-lg tracking-tight uppercase">Assistente de IA</h4>
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-widest mt-0.5">Configure como a inteligência artificial interage com você</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col gap-2 shadow-sm p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Nome do Assistente</label>
                    <input
                        type="text"
                        value={settings.aiPrompts.aiName}
                        onChange={(e) => onChange('aiPrompts.aiName', e.target.value)}
                        placeholder="Ex: Lizandro"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold dark:text-slate-200"
                    />
                </div>
                <div className="flex flex-col gap-2 shadow-sm p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 relative">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Avatar do Assistente</label>
                    <div className="flex items-center gap-4 mt-1">
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-700 shadow-sm overflow-hidden flex-shrink-0">
                            {settings.aiPrompts.aiAvatar ? (
                                <img src={settings.aiPrompts.aiAvatar} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <i className="bi bi-person-fill text-xl"></i>
                                </div>
                            )}
                        </div>
                        <label className="flex-1 cursor-pointer">
                            <div className={`px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest ${isCompressing ? 'opacity-50 pointer-events-none' : ''}`}>
                                {isCompressing ? (
                                    <><div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div> Processando...</>
                                ) : (
                                    <><i className="bi bi-camera-fill text-sm"></i> Alterar Foto</>
                                )}
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </label>
                        {settings.aiPrompts.aiAvatar && (
                            <button 
                                onClick={() => onChange('aiPrompts.aiAvatar', '')}
                                className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                                title="Remover Foto"
                            >
                                <i className="bi bi-trash3-fill text-sm"></i>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider flex items-center gap-2">
                            Chave da API Google Gemini
                            <span className="text-[8px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">Ativa</span>
                        </h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                            Chave da API do Google Gemini compartilhada entre o ERP e o Aplicativo Mobile para o Assistente Lizandro e Function Calling.
                        </p>
                    </div>
                    <div className="w-full md:w-96 relative">
                        <i className="bi bi-key-fill absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input
                            type="password"
                            placeholder="AQ.Ab8..."
                            value={settings.geminiApiKey || ''}
                            onChange={(e) => onChange('geminiApiKey', e.target.value)}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-5 py-3.5 text-sm font-mono font-bold focus:border-indigo-500 outline-none transition-all dark:text-slate-200"
                        />
                    </div>
                </div>
            </div>

            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col gap-4">
                    <div className="flex-1">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider flex items-center gap-2">
                             Template: Gerador de Descrições
                             <span className="text-[8px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full">Marketing</span>
                        </h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Instruções usadas para criar textos automáticos de produtos. Use {'{{productName}}'} e {'{{unitPrice}}'} como variáveis.</p>
                    </div>
                    <textarea
                        rows={6}
                        value={settings.aiPrompts.productDescription}
                        onChange={(e) => onChange('aiPrompts.productDescription', e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 focus:border-indigo-500 dark:text-slate-200 transition-all font-mono leading-relaxed"
                    />
                </div>
            </div>

            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col gap-4">
                    <div className="flex-1">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider flex items-center gap-2">
                            Prompt: Chat Geral (Lizandro)
                        </h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Define a personalidade e o escopo do assistente de chat.</p>
                    </div>
                    <textarea
                        rows={4}
                        value={settings.aiPrompts.generalChat}
                        onChange={(e) => onChange('aiPrompts.generalChat', e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 focus:border-indigo-500 dark:text-slate-200 transition-all font-mono leading-relaxed"
                    />
                </div>
            </div>

            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col gap-4">
                    <div className="flex-1">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider flex items-center gap-2">
                            Prompt: Detecção de Tarefas (Intent)
                        </h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Instruções para a IA identificar se o usuário quer criar um pedido, produto ou apenas conversar. <b>Cuidado: altere com cautela.</b></p>
                    </div>
                    <textarea
                        rows={8}
                        value={settings.aiPrompts.taskDetection}
                        onChange={(e) => onChange('aiPrompts.taskDetection', e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-[11px] outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 focus:border-indigo-500 dark:text-slate-200 transition-all font-mono leading-relaxed"
                    />
                </div>
            </div>
        </div>
    );
};

export default AIPromptsSection;
