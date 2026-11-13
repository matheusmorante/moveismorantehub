import { useRef, useState } from 'react';
import type { UseFormSetValue } from 'react-hook-form';
import { requestConfirmation } from '@/components/shared/confirmationService';
import type { SupportChatComposerDraft } from '../../../../../../../shared-utils/customerSupportFormSchemas';
import type {
  CustomerSupportSendInput,
  CustomerSupportSendResult,
} from '@/pages/utils/customerSupport/customerSupportService';
import type { WhatsAppMessage } from '../../types';
import type { ProductCatalogPrepareInput } from '../../../../../../../shared-utils/productCatalogFormSchemas';
import { getChatComposerSendPreflightError } from './chatComposerSendValidation';
import { sendDraftAttachments } from './chatComposerAttachmentSender';
import { toCatalogSendSelection } from './chatComposerCatalogSelection';

interface UseChatComposerSendParams {
  canSend: boolean;
  isChannelConnected: boolean;
  onSendCustomerMessage?: (input: CustomerSupportSendInput) => Promise<CustomerSupportSendResult>;
  onRefreshMessages?: () => Promise<void> | void;
  replyTarget?: WhatsAppMessage | null;
  onClearReplyTarget?: () => void;
  fileByAttachmentIdRef: React.MutableRefObject<Map<string, File>>;
  removeAttachment: (id: string) => void;
  setDraftValue: UseFormSetValue<SupportChatComposerDraft>;
}

export function useChatComposerSend({
  canSend,
  isChannelConnected,
  onSendCustomerMessage,
  onRefreshMessages,
  replyTarget,
  onClearReplyTarget,
  fileByAttachmentIdRef,
  removeAttachment,
  setDraftValue,
}: UseChatComposerSendParams) {
  const [sendError, setSendError] = useState('');
  const [sendFeedback, setSendFeedback] = useState('');
  const [isOutcomeUncertain, setIsOutcomeUncertain] = useState(false);
  const [isRefreshingForRetry, setIsRefreshingForRetry] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const isSendingRef = useRef(false);

  const sendAllowed =
    canSend && isChannelConnected && Boolean(onSendCustomerMessage) && !isOutcomeUncertain;
  const sendBlockedReason = !canSend
    ? 'Seu perfil não tem permissão para enviar mensagens pela Central.'
    : !isChannelConnected
      ? 'O canal WhatsApp desta conversa está desconectado.'
      : !onSendCustomerMessage
        ? 'O envio está indisponível para esta conversa.'
        : isOutcomeUncertain
          ? 'Atualize a conversa e confira o último envio antes de enviar novamente.'
          : '';

  const handleRefreshAfterUncertainSend = async () => {
    if (!onRefreshMessages || isRefreshingForRetry) return;
    setIsRefreshingForRetry(true);
    try {
      await onRefreshMessages();
      setIsOutcomeUncertain(false);
      setSendError('Histórico atualizado. Confira se a última mensagem apareceu antes de tentar enviar novamente.');
    } catch {
      setSendError('Não foi possível atualizar o histórico. Tente atualizar novamente antes de reenviar.');
    } finally {
      setIsRefreshingForRetry(false);
    }
  };

  const executeSendDraft = async (draft: SupportChatComposerDraft) => {
    if (isSendingRef.current) return;
    if (!sendAllowed || !onSendCustomerMessage) {
      setSendError(
        !canSend
          ? 'Seu perfil não tem permissão para enviar mensagens pela Central.'
          : !isChannelConnected
            ? 'O canal WhatsApp desta conversa está desconectado.'
            : 'O envio está indisponível para esta conversa.'
      );
      return;
    }

    const startCount = draft.attachments.reduce((total, attachment) => {
      if (attachment.kind === 'catalog') {
        return total + (attachment.selection.bulkScope?.total || attachment.selection.items.length);
      }
      return total + 1;
    }, 0);

    if (
      startCount > 10 &&
      !(await requestConfirmation({
        title: 'Enviar mais de 10 itens?',
        message: `Você está prestes a enviar conteúdo sobre ${startCount} itens. Deseja continuar?`,
        confirmLabel: 'Enviar',
        type: 'warning',
      }))
    ) {
      return;
    }

    const preflightError = getChatComposerSendPreflightError(draft, fileByAttachmentIdRef.current);
    if (preflightError) {
      setSendError(preflightError);
      return;
    }

    isSendingRef.current = true;
    setIsSending(true);
    setSendError('');
    setSendFeedback('');

    try {
      const { hadWarning, warningFeedback, replyWasSent } = await sendDraftAttachments({
        draft,
        fileByAttachmentId: fileByAttachmentIdRef.current,
        replyToWamid: replyTarget?.apiMessageId || undefined,
        onSendMessage: onSendCustomerMessage,
        onClearDraftMessage: () => {
          setDraftValue('message', '', { shouldDirty: true, shouldValidate: false });
        },
        removeAttachment,
      });

      setDraftValue('message', '', { shouldDirty: true, shouldValidate: false });
      if (replyWasSent) onClearReplyTarget?.();
      if (hadWarning) {
        setSendFeedback(warningFeedback || 'A Meta aceitou a mensagem. Atualize o histórico para conferir o registro.');
      } else {
        setSendFeedback('Mensagem enviada.');
      }
    } catch (sendErr: any) {
      if (sendErr?.status === 504 || sendErr?.message?.includes('504')) {
        setIsOutcomeUncertain(true);
        setSendError('O envio demorou mais que o esperado. Não reenvie imediatamente para evitar duplicidade.');
      } else {
        setSendError(sendErr?.message || 'Não foi possível enviar a mensagem no momento.');
      }
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  };

  const executeSendCatalogSelection = async (selection: ProductCatalogPrepareInput): Promise<boolean> => {
    if (isSendingRef.current) return false;
    if (!sendAllowed || !onSendCustomerMessage) {
      const error = !canSend
        ? 'Seu perfil não tem permissão para enviar mensagens pela Central.'
        : !isChannelConnected
          ? 'O canal WhatsApp desta conversa está desconectado.'
          : 'O envio está indisponível para esta conversa.';
      setSendError(error);
      throw new Error(error);
    }

    const itemCount = selection.bulkScope
      ? Math.max(0, selection.bulkScope.total - selection.bulkScope.excludedProductIds.length)
      : selection.items.length;
    if (
      itemCount > 10 &&
      !(await requestConfirmation({
        title: 'Enviar mais de 10 produtos?',
        message: `Você está prestes a enviar conteúdo sobre ${itemCount} produtos. Deseja continuar?`,
        confirmLabel: 'Enviar produtos',
        type: 'warning',
      }))
    ) {
      return false;
    }

    isSendingRef.current = true;
    setIsSending(true);
    setSendError('');
    setSendFeedback('');

    try {
      const selections = [selection];
      let sentCount = 0;
      let persistenceWarning = '';

      for (const itemSelection of selections) {
        try {
          const result = await onSendCustomerMessage({
            message: '',
            catalogSelection: toCatalogSendSelection(itemSelection),
          });
          sentCount += 1;
          if (result.warning) persistenceWarning = result.warning;
        } catch (sendErr: any) {
          if (sentCount > 0 || sendErr?.outcomeUncertain || sendErr?.status === 504 || sendErr?.message?.includes('504')) {
            setIsOutcomeUncertain(true);
            const message = sentCount > 0
              ? `${sentCount} de ${selections.length} envios foram concluídos. O envio foi interrompido; atualize a conversa e confira os produtos antes de tentar novamente.`
              : sendErr?.message || 'O resultado do envio é incerto. Atualize a conversa antes de tentar novamente.';
            setSendError(message);
            throw new Error(message);
          }
          throw sendErr;
        }
      }

      const totalItems = selection.bulkScope
        ? Math.max(0, selection.bulkScope.total - selection.bulkScope.excludedProductIds.length)
        : selection.items.length;
      setSendFeedback(persistenceWarning || (selection.deliveryMode === 'native'
        ? (totalItems === 1 ? 'Card de produto enviado ao cliente.' : `Lista com ${totalItems} produtos enviada ao cliente.`)
        : `${totalItems} produto${totalItems === 1 ? '' : 's'} enviado${totalItems === 1 ? '' : 's'} ao cliente.`));
      return true;
    } catch (sendErr: any) {
      const message = sendErr?.message || 'Não foi possível enviar os produtos ao cliente.';
      setSendError(message);
      throw new Error(message);
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  };

  return {
    sendAllowed,
    sendError,
    setSendError,
    sendFeedback,
    setSendFeedback,
    isOutcomeUncertain,
    isRefreshingForRetry,
    isSending,
    sendBlockedReason,
    handleRefreshAfterUncertainSend,
    executeSendDraft,
    executeSendCatalogSelection,
  };
}
