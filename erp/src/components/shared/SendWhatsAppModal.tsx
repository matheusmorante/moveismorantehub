import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { whatsappGraphService } from '@/pages/utils/whatsappGraphService';

interface SendWhatsAppModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialPhone?: string;
    initialMessage?: string;
    title?: string;
    recipientName?: string;
    onSuccess?: () => void;
}

export const SendWhatsAppModal: React.FC<SendWhatsAppModalProps> = ({
    isOpen,
    onClose,
    initialPhone = '',
    initialMessage = '',
    title = 'Enviar via WhatsApp Cloud API',
    recipientName,
    onSuccess
}) => {
    const [phone, setPhone] = useState(initialPhone);
    const [message, setMessage] = useState(initialMessage);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        setPhone(initialPhone || '');
        setMessage(initialMessage || '');
    }, [initialPhone, initialMessage, isOpen]);

    if (!isOpen) return null;

    const handleSendDirect = async () => {
        const cleanPhone = phone.replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length < 10) {
            toast.warning('Por favor, informe um número de telefone com DDD válido.');
            return;
        }

        if (!message.trim()) {
            toast.warning('Por favor, digite uma mensagem para enviar.');
            return;
        }

        setIsSending(true);
        try {
            await whatsappGraphService.sendTextMessage(cleanPhone, message);
            toast.success('Mensagem enviada com sucesso via WhatsApp Cloud API!');
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Erro ao enviar via API Cloud WhatsApp:', error);
            toast.error(error?.message || 'Erro na API do WhatsApp. Tente abrir o link manual.');
        } finally {
            setIsSending(false);
        }
    };

    const handleOpenManual = () => {
        const cleanPhone = phone.replace(/\D/g, '');
        const formattedPhone = cleanPhone.length <= 11 && cleanPhone.length >= 10 ? `55${cleanPhone}` : cleanPhone;
        const encodedMsg = encodeURIComponent(message);
        const url = formattedPhone 
            ? `https://wa.me/${formattedPhone}?text=${encodedMsg}`
            : `https://api.whatsapp.com/send?text=${encodedMsg}`;
        
        window.open(url, '_blank');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center text-white text-lg">
                            <i className="bi bi-whatsapp"></i>
                        </div>
                        <div>
                            <h3 className="font-black text-sm uppercase tracking-wide">{title}</h3>
                            {recipientName && (
                                <p className="text-[11px] text-emerald-100 font-medium truncate">
                                    Destinatário: {recipientName}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
                    >
                        <i className="bi bi-x-lg text-sm"></i>
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-6 space-y-4">
                    {/* Telefone */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Telefone do Cliente (DDD + Número) *
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="(41) 99999-9999"
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 text-sm font-bold transition-all"
                            />
                            <i className="bi bi-telephone absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                        </div>
                    </div>

                    {/* Mensagem */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Conteúdo da Mensagem *
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={6}
                            placeholder="Digite a mensagem..."
                            className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 text-xs font-medium transition-all custom-scrollbar resize-none"
                        />
                    </div>

                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs">
                        <i className="bi bi-shield-check text-base shrink-0"></i>
                        <span>Disparo automático direto via API Oficial do Meta (sem abrir aba do WhatsApp).</span>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={handleOpenManual}
                        className="px-3.5 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5"
                        title="Abrir WhatsApp Web / App manualmente"
                    >
                        <i className="bi bi-box-arrow-up-right"></i>
                        Link Manual
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-300 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSendDirect}
                            disabled={isSending}
                            className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSending ? (
                                <>
                                    <i className="bi bi-arrow-repeat animate-spin"></i>
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-send-fill"></i>
                                    Enviar Agora
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
