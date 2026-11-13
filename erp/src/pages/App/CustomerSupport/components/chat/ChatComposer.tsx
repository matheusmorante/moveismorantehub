import React from 'react';
import { ChatAudioRecordingControls, RecordedAudioPreview } from './ChatAudioRecordingPanels';
import { ChatComposerStatus } from './ChatComposerStatus';
import { ChatInternalCommentsPanel } from './ChatInternalCommentsPanel';
import { ChatComposerAttachmentList } from './ChatComposerAttachmentList';
import { ChatComposerInputBar } from './ChatComposerInputBar';
import { ChatComposerTestModeBanner } from './ChatComposerTestModeBanner';
import { ChatComposerModals } from './ChatComposerModals';
import { useChatComposerController } from './useChatComposerController';
import {
  type ChatComposerProps,
  EMPTY_CONVERSATION,
} from './chatComposerTypes';

export type { ChatComposerProps };

export const ChatComposer: React.FC<ChatComposerProps> = ({
  conversation = EMPTY_CONVERSATION,
  displayName = 'Cliente',
  canSend = false,
  canShareCommercialInfo = false,
  canCreateOrders = false,
  shareOrderRequest = null,
  onShareOrderRequestHandled,
  careWindowOpen,
  isChannelConnected = false,
  onSendCustomerMessage,
  onRefreshMessages,
  replyTarget = null,
  onClearReplyTarget,
  composerMode: composerModeProp = 'whatsapp',
  onComposerModeChange,
  insertedSnippet,
  onAddInternalNote,
  internalComments = [],
  onOpenSnippets,
}) => {
  const {
    composerMode,
    setComposerMode,
    isCatalogOpen,
    setIsCatalogOpen,
    newOrderType,
    setNewOrderType,
    message,
    attachments,
    registerDraft,
    handleSendDraft,
    draftErrors,
    isDraftSubmitting,
    messageInputRef,
    insertEmoji,
    photoInputRef,
    documentInputRef,
    releaseAttachment,
    removeAttachment,
    addFiles,
    addStoreContact,
    sendControl,
    orderPicker,
    audioRecording,
  } = useChatComposerController({
    conversation,
    displayName,
    canSend,
    canShareCommercialInfo,
    canCreateOrders,
    shareOrderRequest,
    onShareOrderRequestHandled,
    isChannelConnected,
    onSendCustomerMessage,
    onRefreshMessages,
    replyTarget,
    onClearReplyTarget,
    composerModeProp,
    onComposerModeChange,
    insertedSnippet,
  });

  return (
    <div className="relative border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 select-text">
      {/* Indicadores de Status e Mensagens de Erro/Incerteza */}
      <ChatComposerStatus
        careWindowOpen={careWindowOpen}
        canSend={canSend}
        isChannelConnected={isChannelConnected}
        sendError={sendControl.sendError}
        sendFeedback={sendControl.sendFeedback}
        recordingError={audioRecording.recordingError}
        draftErrorMessage={draftErrors.message?.message}
        draftErrorAttachments={draftErrors.attachments?.message}
        isOutcomeUncertain={sendControl.isOutcomeUncertain}
        isRefreshingForRetry={sendControl.isRefreshingForRetry}
        onRefreshAfterUncertainSend={sendControl.handleRefreshAfterUncertainSend}
      />

      {/* Faixa indicadora de ambiente de teste */}
      <ChatComposerTestModeBanner canSend={canSend} />

      {/* Painel de Comentários Internos */}
      {composerMode === 'comment' && (
        <ChatInternalCommentsPanel
          internalComments={internalComments}
          onAddInternalNote={onAddInternalNote}
          onClose={() => setComposerMode('whatsapp')}
        />
      )}

      {/* Rascunho de Áudio Gravado */}
      {audioRecording.audioPreview && (
        <RecordedAudioPreview
          audioUrl={audioRecording.audioPreview.url}
          onDiscard={audioRecording.clearAudioPreview}
        />
      )}

      {/* Controles de Gravação de Áudio ao Vivo */}
      {(audioRecording.isRecording || audioRecording.isPreparingAudio) && (
        <ChatAudioRecordingControls
          isRecording={audioRecording.isRecording}
          isRecordingPaused={audioRecording.isRecordingPaused}
          isPreparingAudio={audioRecording.isPreparingAudio}
          durationLabel={audioRecording.recordingDurationLabel}
          onCancel={audioRecording.cancelRecording}
          onTogglePause={audioRecording.toggleRecordingPause}
          onStop={audioRecording.stopRecording}
        />
      )}

      {/* Lista de Anexos Prontos para Envio */}
      {attachments.length > 0 && (
        <ChatComposerAttachmentList
          attachments={attachments}
          onRemove={removeAttachment}
          onRelease={releaseAttachment}
        />
      )}

      {/* Barra de Digitação e Ações Principais */}
      {!audioRecording.isRecording && !audioRecording.isPreparingAudio && composerMode === 'whatsapp'
        && (conversation.channel === 'instagram' || conversation.channel === 'messenger') && (
          <div role="status" className="px-4 py-3 text-center text-xs text-slate-500 dark:text-slate-400">
            O recebimento de mensagens está ativo. O envio por {conversation.channel === 'instagram' ? 'Instagram' : 'Messenger'} ainda não foi configurado.
          </div>
        )}
      {!audioRecording.isRecording && !audioRecording.isPreparingAudio && composerMode === 'whatsapp'
        && conversation.channel !== 'instagram' && conversation.channel !== 'messenger' && (
        <ChatComposerInputBar
          messageInputRef={messageInputRef}
          messageRegister={registerDraft('message')}
          message={message}
          hasAttachments={attachments.length > 0}
          canSend={canSend}
          isSending={sendControl.isSending}
          isDraftSubmitting={isDraftSubmitting}
          canShareCommercialInfo={canShareCommercialInfo}
          replyTarget={replyTarget}
          onClearReplyTarget={onClearReplyTarget}
          onOpenSnippets={onOpenSnippets}
          onSendDraft={() => void handleSendDraft()}
          onStartRecording={audioRecording.startRecording}
          onSelectPhotos={() => photoInputRef.current?.click()}
          onSelectDocument={() => documentInputRef.current?.click()}
          onSelectContact={() => addStoreContact()}
          onSelectCatalog={() => setIsCatalogOpen(true)}
          onSelectOrderDocument={() => orderPicker.setIsOrderPickerOpen(true)}
          onInsertEmoji={insertEmoji}
        />
      )}

      {/* Modais, Seletores e Inputs Ocultos de Arquivos */}
      <ChatComposerModals
        conversation={conversation}
        displayName={displayName}
        photoInputRef={photoInputRef}
        documentInputRef={documentInputRef}
        addFiles={addFiles}
        orderPicker={orderPicker}
        isCatalogOpen={isCatalogOpen}
        setIsCatalogOpen={setIsCatalogOpen}
        sendCatalogSelection={sendControl.executeSendCatalogSelection}
        canSendCatalogSelection={sendControl.sendAllowed}
        catalogSendDisabledReason={sendControl.sendBlockedReason}
        isSendingCatalogSelection={sendControl.isSending}
        newOrderType={newOrderType}
        setNewOrderType={setNewOrderType}
      />
    </div>
  );
};
