import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { whatsappGraphService } from '@/pages/utils/whatsappGraphService';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { whatsappManualFormSchema, whatsappMessageFormSchema } from '../../../../shared-utils/messagingFormSchemas';
import { withTimeout } from '../../../../shared-utils/withTimeout';

interface SendWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void | Promise<void>;
  initialPhone?: string;
  initialMessage?: string;
  title?: string;
  recipientName?: string;
  onSuccess?: () => void | Promise<void>;
}

export const SendWhatsAppModal: React.FC<SendWhatsAppModalProps> = ({
  isOpen,
  onClose,
  initialPhone = '',
  initialMessage = '',
  title = 'Enviar via WhatsApp Cloud API',
  recipientName,
  onSuccess,
}) => {
  const [phone, setPhone] = useState(initialPhone);
  const [message, setMessage] = useState(initialMessage);
  const [activeAction, setActiveAction] = useState<'direct' | 'manual' | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [sendCompleted, setSendCompleted] = useState(false);
  const actionInFlight = useRef(false);
  const active = useRef(true);
  const completedRequests = useRef(new Set<string>());
  const context = useRef({ isOpen, initialPhone, initialMessage, generation: 0 });
  if (context.current.isOpen !== isOpen || context.current.initialPhone !== initialPhone || context.current.initialMessage !== initialMessage) {
    context.current = { isOpen, initialPhone, initialMessage, generation: context.current.generation + 1 };
  }
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const directForm = useZodForm(whatsappMessageFormSchema, { phone, message });
  const manualForm = useZodForm(whatsappManualFormSchema, { phone, message });

  useEffect(() => {
    setPhone(initialPhone || '');
    setMessage(initialMessage || '');
    setSubmitError('');
    setSendCompleted(false);
  }, [initialPhone, initialMessage, isOpen]);

  if (!isOpen) return null;

  const handleAction = async (action: 'direct' | 'manual') => {
    if (actionInFlight.current || sendCompleted) return;
    actionInFlight.current = true;
    setActiveAction(action);
    setSubmitError('');
    let sent = false;
    let opened = false;
    const generation = context.current.generation;
    const isCurrent = () => active.current && context.current.isOpen && context.current.generation === generation;
    try {
      const form = action === 'direct' ? directForm : manualForm;
      await form.validateAndRun({ phone, message }, async (values) => {
        if (!isCurrent()) return;
        if (action === 'direct') {
          const requestKey = JSON.stringify(values);
          if (completedRequests.current.has(requestKey)) {
            setSendCompleted(true);
            throw new Error('Este envio já foi realizado ou não pôde ser confirmado. Confira o WhatsApp antes de repetir.');
          }
          const completed = await withTimeout(
            whatsappGraphService.sendTextMessage(values.phone, values.message).then(() => true),
            30_000, false, 'envio WhatsApp',
          );
          // A timeout cannot prove whether Meta accepted the message. Require
          // checking delivery before opening this modal for another attempt.
          completedRequests.current.add(requestKey);
          if (!isCurrent()) return;
          setSendCompleted(true);
          if (!completed) throw new Error('O envio demorou além do esperado. Confira o WhatsApp antes de tentar novamente.');
          sent = true;
          toast.success('Mensagem enviada com sucesso');
          if (onSuccess && !await withTimeout(Promise.resolve(onSuccess()).then(() => true), 15_000, false, 'atualização após envio WhatsApp')) {
            throw new Error('A atualização após o envio demorou além do esperado.');
          }
          if (!isCurrent()) return;
        } else {
          const formattedPhone = values.phone.length >= 10 && values.phone.length <= 11 ? `55${values.phone}` : values.phone;
          const encodedMsg = encodeURIComponent(values.message);
          const url = formattedPhone
            ? `https://wa.me/${formattedPhone}?text=${encodedMsg}`
            : `https://api.whatsapp.com/send?text=${encodedMsg}`;
          const popup = window.open(url, '_blank');
          if (!popup) throw new Error('O navegador bloqueou a abertura do WhatsApp. Permita pop-ups e tente novamente.');
          popup.opener = null;
          opened = true;
        }
        if (!await withTimeout(Promise.resolve(onClose()).then(() => true), 15_000, false, 'fechamento do envio WhatsApp')) {
          throw new Error('Não foi possível concluir o fechamento da janela.');
        }
      }, (errors) => {
        const error = Object.values(flattenFormErrors(errors))[0] || 'Confira os campos informados.';
        setSubmitError(error);
        toast.warning(error);
      });
    } catch (error: unknown) {
      if (!isCurrent()) return;
      const detail = error instanceof Error ? error.message : 'Não foi possível concluir a operação. Tente novamente.';
      const feedback = sent ? `Mensagem enviada, mas a atualização da tela falhou. ${detail}`
        : opened ? `WhatsApp aberto, mas a atualização da tela falhou. ${detail}` : detail;
      setSubmitError(feedback);
      toast.error(feedback);
    } finally {
      actionInFlight.current = false;
      if (active.current) setActiveAction(null);
    }
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
            disabled={activeAction !== null}
            aria-label="Fechar"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
          >
            <i className="bi bi-x-lg text-sm"></i>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {/* Telefone */}
          <div className="space-y-1.5">
            <label htmlFor="send-whatsapp-phone" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Telefone do Cliente (DDD + Número) *
            </label>
            <div className="relative">
              <input
                type="text"
                id="send-whatsapp-phone"
                disabled={activeAction !== null || sendCompleted}
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
            <label htmlFor="send-whatsapp-message" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Conteúdo da Mensagem *
            </label>
            <textarea
              id="send-whatsapp-message"
              disabled={activeAction !== null || sendCompleted}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Digite a mensagem..."
              className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 text-xs font-medium transition-all custom-scrollbar resize-none"
            />
          </div>

          {submitError && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{submitError}</p>}
          {activeAction && <p role="status" className="text-xs text-emerald-700 dark:text-emerald-300"><i className="bi bi-arrow-repeat animate-spin mr-2" />{activeAction === 'direct' ? 'Enviando mensagem e atualizando a tela...' : 'Abrindo WhatsApp...'}</p>}

          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs">
            <i className="bi bi-shield-check text-base shrink-0"></i>
            <span>
              Disparo automático direto via API Oficial do Meta (sem abrir aba do WhatsApp).
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => handleAction('manual')}
            disabled={activeAction !== null || sendCompleted}
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
              disabled={activeAction !== null}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-300 transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleAction('direct')}
              disabled={activeAction !== null || sendCompleted}
              className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {activeAction === 'direct' ? (
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
