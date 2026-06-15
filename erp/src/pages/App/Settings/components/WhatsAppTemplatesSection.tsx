import React from 'react';
import { AppSettings } from '@/pages/utils/settingsService';

interface Props {
    settings: AppSettings;
    onChange: (path: string, value: any) => void;
}

const WhatsAppTemplatesSection: React.FC<Props> = ({ settings, onChange }) => {
    const templates = [
        {
            id: 'reviewRequest',
            label: 'Pedido de Avaliação',
            description: 'Enviado após a entrega para solicitar avaliação no Google.',
            variables: ['{{cliente}}', '{{reviewUrl}}'],
            icon: 'bi-star-fill',
            color: 'text-yellow-500',
            bg: 'bg-yellow-50 dark:bg-yellow-900/10'
        },
        {
            id: 'orderConfirmation',
            label: 'Confirmação de Pedido',
            description: 'Enviado ao cliente assim que o pedido é confirmado.',
            variables: ['{{customerName}}', '{{deliveryDate}}', '{{deliveryTime}}', '{{address}}', '{{items}}', '{{totalValue}}', '{{payments}}'],
            icon: 'bi-check-circle-fill',
            color: 'text-green-500',
            bg: 'bg-green-50 dark:bg-green-900/10'
        },
        {
            id: 'deliveryInfo',
            label: 'Informativo de Entrega',
            description: 'Enviado para a equipe de logística ou motorista.',
            variables: ['{{customerName}}', '{{deliveryDate}}', '{{deliveryTime}}', '{{phone}}', '{{address}}', '{{items}}', '{{totalValue}}', '{{routeUrl}}', '{{observation}}'],
            icon: 'bi-truck',
            color: 'text-blue-500',
            bg: 'bg-blue-50 dark:bg-blue-900/10'
        },
        {
            id: 'assistanceConfirmation',
            label: 'Confirmação de Assistência',
            description: 'Enviado ao cliente para confirmar o agendamento da assistência técnica.',
            variables: ['{{customerName}}', '{{assistanceDate}}', '{{assistanceTime}}', '{{assistanceDescription}}', '{{companyPhone}}'],
            icon: 'bi-tools',
            color: 'text-orange-500',
            bg: 'bg-orange-50 dark:bg-orange-900/10'
        },
        {
            id: 'groupInviteMessage',
            label: 'Convite para Grupo de Promoções e Ofertas',
            description: 'Enviado ao cliente para convidar para o grupo de WhatsApp de ofertas e promoções.',
            variables: ['{{customerName}}', '{{groupLink}}'],
            icon: 'bi-people-fill',
            color: 'text-indigo-500',
            bg: 'bg-indigo-50 dark:bg-indigo-900/10'
        }
    ];

    return (
        <div className="flex flex-col gap-8 p-8">
            <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                <i className="bi bi-info-circle-fill text-blue-500 text-xl mt-1" />
                <div>
                    <h5 className="font-black text-blue-900 dark:text-blue-100 text-xs uppercase tracking-widest">Dica de Personalização</h5>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-1 leading-relaxed font-medium">
                        Use as tags mostradas em cada template para que o sistema preencha os dados automaticamente. 
                        Exemplo: Ao usar <strong>{"{{customerName}}"}</strong>, o sistema colocará o nome real do cliente.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-10">
                {templates.map(tpl => (
                    <div key={tpl.id} className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl ${tpl.bg} flex items-center justify-center`}>
                                <i className={`bi ${tpl.icon} ${tpl.color} text-xl`} />
                            </div>
                            <div>
                                <h4 className="font-black text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider">{tpl.label}</h4>
                                <p className="text-[10px] text-slate-500 dark:text-slate-500 font-medium">{tpl.description}</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <textarea
                                rows={6}
                                value={settings.whatsappTemplates?.[tpl.id as keyof typeof settings.whatsappTemplates] || ''}
                                onChange={(e) => onChange(`whatsappTemplates.${tpl.id}`, e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl px-6 py-4 text-sm outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 dark:text-slate-200 transition-all font-medium leading-relaxed resize-none"
                                placeholder="Digite o template da mensagem..."
                            />
                            
                            <div className="flex flex-wrap gap-1.5">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1 mt-1">Tags Disponíveis:</span>
                                {tpl.variables.map(v => (
                                    <button
                                        key={v}
                                        onClick={() => {
                                            const current = settings.whatsappTemplates?.[tpl.id as keyof typeof settings.whatsappTemplates] || '';
                                            onChange(`whatsappTemplates.${tpl.id}`, current + v);
                                        }}
                                        className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all active:scale-95"
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                            
                            {tpl.id === 'groupInviteMessage' && (
                                <div className="mt-2 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                                    <label className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-2">
                                        🔗 Link do Grupo
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.whatsappTemplates?.groupInviteLink || ''}
                                        onChange={(e) => onChange('whatsappTemplates.groupInviteLink', e.target.value)}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 focus:border-indigo-500 dark:text-slate-200 transition-all font-medium"
                                        placeholder="https://chat.whatsapp.com/..."
                                    />
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">Este link substituirá a tag {`{{groupLink}}`} na mensagem acima.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WhatsAppTemplatesSection;
