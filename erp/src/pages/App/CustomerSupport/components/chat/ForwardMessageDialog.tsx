import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  supportForwardConversationSearchSchema,
  supportForwardMessageSchema,
} from '../../../../../../../shared-utils/customerSupportFormSchemas';
import {
  fetchConversations,
  sendCustomerSupportMessage,
  downloadCustomerSupportForwardFile,
  CustomerSupportSendError,
} from '@/pages/utils/customerSupport/customerSupportService';
import { formatPhoneForDisplay } from '@/pages/utils/customerSupport/phoneUtils';
import { supabase } from '@/pages/utils/supabaseConfig';
import type { WhatsAppConversation, WhatsAppMessage } from '../../types';
import {
  recipientBlockReason,
  messagePreview,
  templateForwardContent,
  hasTemplateMedia,
  ForwardConversationItem,
} from './forward';

interface ForwardMessageDialogProps {
  message: WhatsAppMessage;
  canSend: boolean;
  onClose: () => void;
  onSelectConversation: (conversation: WhatsAppConversation) => void;
}

type ConversationSearch = z.infer<typeof supportForwardConversationSearchSchema>;
type ForwardMessageForm = z.infer<typeof supportForwardMessageSchema>;

export const ForwardMessageDialog: React.FC<ForwardMessageDialogProps> = ({
  message,
  canSend,
  onClose,
  onSelectConversation,
}) => {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [searchError, setSearchError] = useState('');
  const [sendError, setSendError] = useState('');
  const [uncertainRecipient, setUncertainRecipient] = useState<WhatsAppConversation | null>(null);
  const [successRecipient, setSuccessRecipient] = useState<WhatsAppConversation | null>(null);

  const {
    register: registerSearch,
    handleSubmit: submitSearch,
    formState: { errors: searchErrors, isSubmitting: isSearching },
  } = useForm<ConversationSearch>({
    resolver: zodResolver(supportForwardConversationSearchSchema),
    defaultValues: { search: '' },
  });

  const {
    handleSubmit: submitForward,
    setValue: setForwardValue,
    setError: setForwardError,
    watch: watchForward,
    formState: { errors: forwardErrors, isSubmitting: isForwarding },
  } = useForm<ForwardMessageForm>({
    resolver: zodResolver(supportForwardMessageSchema),
    defaultValues: { recipientConversationId: '' },
  });

  const selectedConversationId = watchForward('recipientConversationId');
  const selectedConversation = conversations.find((conversation) => conversation.id === selectedConversationId) || null;

  const searchConversations = submitSearch(async ({ search }) => {
    setSearchError('');
    setConversations([]);
    setForwardValue('recipientConversationId', '', { shouldDirty: false, shouldValidate: false });
    try {
      const result = await fetchConversations(supabase, { search, page: 1, pageSize: 20, filter: 'all', canViewCommercialInfo: false });
      setConversations(result.conversations);
      if (!result.conversations.length) setSearchError('Nenhuma conversa encontrada.');
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Não foi possível pesquisar as conversas.');
    }
  });

  const handleForward = submitForward(async ({ recipientConversationId }) => {
    const recipient = conversations.find((conversation) => conversation.id === recipientConversationId);
    if (!recipient) {
      setForwardError('recipientConversationId', { type: 'validate', message: 'Pesquise e selecione uma conversa.' });
      return;
    }
    const blockedReason = recipientBlockReason(recipient);
    if (!canSend || blockedReason) {
      setSendError(blockedReason || 'Seu perfil não tem permissão para encaminhar mensagens.');
      return;
    }

    setSendError('');
    try {
      const isTemplate = message.messageType === 'template';
      const isTextForward =
        ['text', 'interactive', 'location', 'contacts'].includes(message.messageType) ||
        (isTemplate && !hasTemplateMedia(message));
      const forwardedText = isTemplate ? templateForwardContent(message) : message.textContent || '';
      const file = isTextForward
        ? undefined
        : await downloadCustomerSupportForwardFile(supabase, message);
      const result = await sendCustomerSupportMessage(supabase, recipient.id, {
        message:
          isTextForward || isTemplate
            ? forwardedText
            : message.messageType === 'sticker'
              ? ''
              : message.mediaCaption || '',
        ...(file ? { file } : {}),
        forwarded: true,
      });
      if (!result.persisted || result.warning) {
        setUncertainRecipient(recipient);
        setSendError(result.warning || 'A Meta aceitou o encaminhamento. Abra o destino e confira o histórico antes de tentar novamente.');
        return;
      }
      setSuccessRecipient(recipient);
    } catch (error) {
      const outcomeUncertain = error instanceof CustomerSupportSendError && error.outcomeUncertain;
      if (outcomeUncertain) setUncertainRecipient(recipient);
      setSendError(error instanceof Error ? error.message : 'Não foi possível encaminhar a mensagem.');
    }
  });

  const finishForward = () => {
    const destination = successRecipient || uncertainRecipient;
    if (destination) onSelectConversation(destination);
    onClose();
  };

  const isBlocked = Boolean(successRecipient) || Boolean(uncertainRecipient);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="support-forward-title" className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm">
      <section className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
          <div>
            <h2 id="support-forward-title" className="text-sm font-bold">Encaminhar mensagem</h2>
            <p className="mt-1 max-w-sm truncate text-xs text-slate-500">{messagePreview(message)}</p>
            {message.messageType === 'template' && (
              <p className="mt-1 text-[10px] text-slate-400">O template será encaminhado com o conteúdo e a mídia disponíveis; os botões seguem como texto.</p>
            )}
            {['interactive', 'location', 'contacts'].includes(message.messageType) && (
              <p className="mt-1 text-[10px] text-slate-400">Este conteúdo será encaminhado como texto.</p>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar encaminhamento" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <i className="bi bi-x-lg" />
          </button>
        </header>

        <form onSubmit={(event) => { event.preventDefault(); void searchConversations(); }} className="flex gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
          <input {...registerSearch('search')} aria-label="Pesquisar conversa para encaminhar" placeholder="Nome ou telefone (mínimo 3 caracteres)" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800" />
          <button type="submit" disabled={isSearching} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{isSearching ? 'Buscando…' : 'Buscar'}</button>
        </form>
        {searchErrors.search && <p role="alert" className="px-4 pt-2 text-xs text-red-600">{searchErrors.search.message}</p>}

        <form onSubmit={(event) => { event.preventDefault(); void handleForward(); }} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-24 flex-1 space-y-2 overflow-y-auto p-4">
            {searchError && <p role="status" className="py-8 text-center text-xs text-slate-500">{searchError}</p>}
            {conversations.map((conversation) => (
              <ForwardConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={conversation.id === selectedConversationId}
                isDisabled={isForwarding || isBlocked}
                onSelect={(id) => {
                  setForwardValue('recipientConversationId', id, { shouldDirty: true, shouldValidate: true });
                  setSendError('');
                }}
              />
            ))}
          </div>

          {forwardErrors.recipientConversationId && <p role="alert" className="px-4 text-xs text-red-600">{forwardErrors.recipientConversationId.message}</p>}
          {sendError && <p role="alert" className="px-4 text-xs text-amber-700 dark:text-amber-300">{sendError}</p>}
          {successRecipient && (
            <p role="status" className="px-4 text-xs text-emerald-700 dark:text-emerald-300">
              Mensagem encaminhada para {successRecipient.customer?.fullName || successRecipient.contactName || formatPhoneForDisplay(successRecipient.contactPhone)}.
            </p>
          )}

          <footer className="flex items-center justify-between gap-3 border-t border-slate-100 p-4 dark:border-slate-800">
            <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
              Fechar
            </button>
            {successRecipient || uncertainRecipient ? (
              <button type="button" onClick={finishForward} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white">
                Abrir destino
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSend || !selectedConversation || Boolean(selectedConversation && recipientBlockReason(selectedConversation)) || isForwarding}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isForwarding ? 'Encaminhando…' : 'Encaminhar'}
              </button>
            )}
          </footer>
        </form>
      </section>
    </div>
  );
};
