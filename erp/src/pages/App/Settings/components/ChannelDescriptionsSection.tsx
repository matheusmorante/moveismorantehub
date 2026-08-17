import React, { useState } from "react";
import { AppSettings } from '@/pages/utils/settingsService';

interface Props {
    settings: AppSettings;
    onChange: (path: string, value: any) => void;
}

const ChannelDescriptionsSection: React.FC<Props> = ({ settings, onChange }) => {
    const [activeChannel, setActiveChannel] = useState<'whatsapp' | 'ecommerce'>('whatsapp');

    const base = settings.channelBaseDescriptions || { whatsapp: '', ecommerce: '' };

    const channels = [
        {
            id: 'whatsapp' as const,
            label: 'WhatsApp Marketplace',
            icon: 'bi-whatsapp',
            color: 'green',
            iconBg: 'bg-green-500',
            ring: 'focus:ring-green-400',
            border: 'border-green-100 dark:border-green-900/30',
            bg: 'bg-green-50/40 dark:bg-green-900/5',
            hint: 'Use emojis, *negrito* e quebras de linha. Este texto aparecerá ANTES da descrição de cada produto no catálogo.',
            placeholder: `🏠 *Móveis Morante*\n📍 R. Cascavel, 306 - Colombo - PR\n⌚ Seg-Sex: 8h às 18h | Sáb: 8h às 13h\n📞 (41) 99749-3547\n\n――――――――――――`,
        },
        {
            id: 'ecommerce' as const,
            label: 'Catálogo Digital',
            icon: 'bi-journal-richtext',
            color: 'purple',
            iconBg: 'bg-purple-600',
            ring: 'focus:ring-purple-500',
            border: 'border-purple-100 dark:border-purple-900/30',
            bg: 'bg-purple-50/30 dark:bg-purple-900/5',
            hint: 'Aceita HTML e Markdown. Este texto aparecerá na descrição de cada produto no catálogo digital.',
            placeholder: `A **Móveis Morante** é referência em móveis planejados há mais de 10 anos.\n\n---`,
        },
    ];

    const active = channels.find(c => c.id === activeChannel)!;

    return (
        <div className="flex flex-col gap-6 p-8">
            {/* Info banner */}
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                <i className="bi bi-info-circle-fill text-amber-500 text-lg mt-0.5" />
                <div>
                    <p className="text-xs font-black text-amber-800 dark:text-amber-200 uppercase tracking-widest">Como funciona</p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                        Configure aqui as informações fixas da sua loja (endereço, horário, contato). Elas aparecem <strong>automaticamente antes</strong> da descrição de cada produto, em cada canal.
                    </p>
                </div>
            </div>

            {/* Channel tabs */}
            <div className="flex gap-2">
                {channels.map(ch => (
                    <button
                        key={ch.id}
                        onClick={() => setActiveChannel(ch.id)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border ${activeChannel === ch.id
                            ? ch.id === 'whatsapp'
                                ? 'bg-green-500 text-white border-green-500 shadow-md shadow-green-200/40 dark:shadow-green-900/30'
                                : 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200/40 dark:shadow-blue-900/30'
                            : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                    >
                        <i className={`bi ${ch.icon} text-sm`} />
                        {ch.label}
                    </button>
                ))}
            </div>

            {/* Editor */}
            <div className={`flex flex-col gap-4 p-6 rounded-[2rem] border ${active.border} ${active.bg}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 ${active.iconBg} rounded-xl flex items-center justify-center shadow-md`}>
                        <i className={`bi ${active.icon} text-white text-base`} />
                    </div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">{active.label} — Descrição Base da Loja</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{active.hint}</p>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Descrição Base da Loja (Informações Fixas)</label>
                    <textarea
                        rows={6}
                        value={base[active.id] || ''}
                        onChange={(e) => onChange(`channelBaseDescriptions.${active.id}`, e.target.value)}
                        placeholder={active.placeholder}
                        className={`w-full px-5 py-4 bg-white dark:bg-slate-950 border ${active.border} rounded-[1.5rem] ${active.ring} focus:ring-2 outline-none transition-all text-sm dark:text-slate-300 custom-scrollbar resize-none font-medium leading-relaxed`}
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Template de Geração por IA (Dinamismo)</label>
                        <span className="text-[9px] text-blue-600 font-black uppercase tracking-tighter bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-lg border border-blue-100 dark:border-blue-900/30">
                            <i className="bi bi-robot mr-1"></i>Para novos produtos
                        </span>
                    </div>
                    <textarea
                        rows={6}
                        value={settings.aiPrompts[active.id === 'whatsapp' ? 'whatsappTemplate' : 'ecommerceTemplate'] || ''}
                        onChange={(e) => onChange(`aiPrompts.${active.id === 'whatsapp' ? 'whatsappTemplate' : 'ecommerceTemplate'}`, e.target.value)}
                        className={`w-full px-5 py-4 bg-white dark:bg-slate-950 border ${active.border} rounded-[1.5rem] ${active.ring} focus:ring-2 outline-none transition-all text-sm dark:text-slate-300 custom-scrollbar resize-none font-medium leading-relaxed`}
                        placeholder="Configure como a IA deve montar a descrição..."
                    />
                </div>

                {/* Preview */}
                {base[active.id] && (
                    <div className="flex flex-col gap-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pré-visualização — como ficará antes da descrição do produto:</p>
                        <div className={`p-4 rounded-2xl border ${active.border} bg-white dark:bg-slate-950`}>
                            <pre className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-sans leading-relaxed">
                                {base[active.id]}
                            </pre>
                            <div className="mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400 italic">
                                ↓ Aqui vem a descrição do produto...
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChannelDescriptionsSection;
