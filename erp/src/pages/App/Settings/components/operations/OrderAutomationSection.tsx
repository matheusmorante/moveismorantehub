import React from 'react';
import { AppSettings } from '@/pages/utils/settingsService';
import { PatternFormat as PatternFormatBase } from "react-number-format";
const PatternFormat = PatternFormatBase as any;

interface OrderAutomationSectionProps {
    settings: AppSettings;
    onChange: (path: string, value: any) => void;
}

const OrderAutomationSection = ({ settings, onChange }: OrderAutomationSectionProps) => {
    return (
        <div className="flex flex-col p-4 md:p-6 space-y-6">
            {/* Grid de Automações Diretas (Cards mais compactos e cleans) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div 
                    onClick={() => onChange('orderAutomation.autoPrintReceipt', !settings.orderAutomation.autoPrintReceipt)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${settings.orderAutomation.autoPrintReceipt ? 'bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 opacity-70 hover:opacity-100'}`}
                >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${settings.orderAutomation.autoPrintReceipt ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                        <i className="bi bi-receipt"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Impressão</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">Imprimir Recibo</span>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${settings.orderAutomation.autoPrintReceipt ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-700'}`}>
                        {settings.orderAutomation.autoPrintReceipt && <i className="bi bi-check-lg text-[10px]"></i>}
                    </div>
                </div>

                <div 
                    onClick={() => onChange('orderAutomation.autoPrintDeliveryOrder', !settings.orderAutomation.autoPrintDeliveryOrder)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${settings.orderAutomation.autoPrintDeliveryOrder ? 'bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 opacity-70 hover:opacity-100'}`}
                >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${settings.orderAutomation.autoPrintDeliveryOrder ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                        <i className="bi bi-truck"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Logística</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">Pedido de Entrega</span>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${settings.orderAutomation.autoPrintDeliveryOrder ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-700'}`}>
                        {settings.orderAutomation.autoPrintDeliveryOrder && <i className="bi bi-check-lg text-[10px]"></i>}
                    </div>
                </div>

                <div 
                    onClick={() => onChange('orderAutomation.autoSendWhatsAppDelivery', !settings.orderAutomation.autoSendWhatsAppDelivery)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${settings.orderAutomation.autoSendWhatsAppDelivery ? 'bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 opacity-70 hover:opacity-100'}`}
                >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${settings.orderAutomation.autoSendWhatsAppDelivery ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                        <i className="bi bi-whatsapp"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">WhatsApp</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">Enviar para Entrega</span>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${settings.orderAutomation.autoSendWhatsAppDelivery ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-700'}`}>
                        {settings.orderAutomation.autoSendWhatsAppDelivery && <i className="bi bi-check-lg text-[10px]"></i>}
                    </div>
                </div>

                <div 
                    onClick={() => onChange('orderAutomation.autoSendCustomerOrder', !settings.orderAutomation.autoSendCustomerOrder)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${settings.orderAutomation.autoSendCustomerOrder ? 'bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 opacity-70 hover:opacity-100'}`}
                >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${settings.orderAutomation.autoSendCustomerOrder ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                        <i className="bi bi-person-check"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">WhatsApp</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">Enviar para Cliente</span>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${settings.orderAutomation.autoSendCustomerOrder ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-700'}`}>
                        {settings.orderAutomation.autoSendCustomerOrder && <i className="bi bi-check-lg text-[10px]"></i>}
                    </div>
                </div>
            </div>

            {/* Campo do Telefone da Entrega */}
            <div className="flex flex-col gap-1.5 p-4 bg-slate-50/50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Telefone da Equipe de Entrega</label>
                <PatternFormat
                    format="(##) #####-####"
                    mask="_"
                    value={settings.orderAutomation.deliveryPhone}
                    onValueChange={(values: any) => onChange('orderAutomation.deliveryPhone', values.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs outline-none focus:ring-2 focus:ring-emerald-100 font-bold"
                />
            </div>

            {/* Bloco Detalhado: Automação de Lembrete e Confirmação de Entrega (WhatsApp Cloud API) */}
            <div className="mt-4 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                            <i className="bi bi-clock-history text-lg"></i>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="font-black text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wide">
                                    Lembrete e Confirmação de Entrega (WhatsApp Cloud API)
                                </h5>
                                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    Desativado por Padrão
                                </span>
                            </div>
                            
                            {/* Subtítulo explicativo detalhado */}
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-2xl">
                                Dispara lembretes automáticos com botões interativos de resposta rápida diretamente para o WhatsApp do cliente. 
                                O disparo é inteligente: para <strong>entregas futuras</strong>, envia o lembrete com botão de confirmação; para <strong>entregas no mesmo dia da compra</strong>, omite o botão e envia apenas o aviso de liberação de espaço no local para móveis com montagem externa.
                            </p>
                        </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                        <input 
                            type="checkbox" 
                            checked={!!settings.deliveryReminderAutomation?.enabled}
                            onChange={(e) => onChange('deliveryReminderAutomation.enabled', e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
                    </label>
                </div>

                {settings.deliveryReminderAutomation?.enabled && (
                    <div className="p-4 bg-teal-50/30 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30 rounded-2xl space-y-4 animate-in fade-in duration-200">
                        {/* Configurações Adicionais em Grid Compacto */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    Antecedência do Lembrete (Horas)
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min={1}
                                        max={72}
                                        value={settings.deliveryReminderAutomation?.hoursBeforeDelivery ?? 12}
                                        onChange={(e) => onChange('deliveryReminderAutomation.hoursBeforeDelivery', Number(e.target.value))}
                                        className="w-24 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold outline-none"
                                    />
                                    <span className="text-[11px] font-medium text-slate-500">horas antes da data/hora da entrega</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    Texto do Botão de Confirmação
                                </label>
                                <input
                                    type="text"
                                    maxLength={20}
                                    value={settings.deliveryReminderAutomation?.buttonTitle ?? 'Confirmar Entrega'}
                                    onChange={(e) => onChange('deliveryReminderAutomation.buttonTitle', e.target.value)}
                                    placeholder="Ex: Confirmar Entrega"
                                    className="w-full bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold outline-none"
                                />
                            </div>
                        </div>

                        {/* Opções de Automação / Resposta */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-teal-100/60 dark:border-teal-900/30">
                            <label className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.deliveryReminderAutomation?.notifySellerOnConfirmation ?? true}
                                    onChange={(e) => onChange('deliveryReminderAutomation.notifySellerOnConfirmation', e.target.checked)}
                                    className="w-3.5 h-3.5 accent-teal-600 rounded cursor-pointer"
                                />
                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                    Notificar vendedor ao confirmar
                                </span>
                            </label>

                            <label className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.deliveryReminderAutomation?.includeRouteLink ?? true}
                                    onChange={(e) => onChange('deliveryReminderAutomation.includeRouteLink', e.target.checked)}
                                    className="w-3.5 h-3.5 accent-teal-600 rounded cursor-pointer"
                                />
                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                    Incluir link do mapa no envio
                                </span>
                            </label>

                            <label className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.deliveryReminderAutomation?.autoUpdateStatusOnConfirm ?? true}
                                    onChange={(e) => onChange('deliveryReminderAutomation.autoUpdateStatusOnConfirm', e.target.checked)}
                                    className="w-3.5 h-3.5 accent-teal-600 rounded cursor-pointer"
                                />
                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                    Atualizar status para Confirmado
                                </span>
                            </label>
                        </div>

                        {/* Modelos de Mensagem */}
                        <div className="space-y-3 pt-2">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    Modelo: Lembrete Agendado (Entregas Futuras)
                                </label>
                                <textarea
                                    value={settings.deliveryReminderAutomation?.reminderTemplate || ''}
                                    onChange={(e) => onChange('deliveryReminderAutomation.reminderTemplate', e.target.value)}
                                    rows={3}
                                    className="w-full bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-mono outline-none custom-scrollbar"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    Modelo: Entrega no Mesmo Dia (Lembrete de Espaço para Montagem Fora)
                                </label>
                                <textarea
                                    value={settings.deliveryReminderAutomation?.sameDaySpaceReminderTemplate || ''}
                                    onChange={(e) => onChange('deliveryReminderAutomation.sameDaySpaceReminderTemplate', e.target.value)}
                                    rows={2}
                                    className="w-full bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-mono outline-none custom-scrollbar"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderAutomationSection;
