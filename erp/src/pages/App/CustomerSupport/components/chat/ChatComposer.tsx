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
  careWindowOpen = false,
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
    textareaRef,
    insertEmoji,
    photoInputRef,
    documentInputRef,
    releaseAttachment,
    removeAttachment,
    addFiles,
    addStoreContact,
    addCatalogSelection,
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
    careWindowOpen,
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
          audioPreview={audioRecording.audioPreview}
          onRemove={audioRecording.clearAudioPreview}
        />
      )}

      {/* Controles de Gravação de Áudio ao Vivo */}
      {audioRecording.isRecording && (
        <ChatAudioRecordingControls
          recordingSeconds={audioRecording.recordingSeconds}
          isRecordingPaused={audioRecording.isRecordingPaused}
          onCancel={audioRecording.cancelRecording}
          onTogglePause={audioRecording.toggleRecordingPause}
          onFinish={audioRecording.stopRecording}
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
      {!audioRecording.isRecording && composerMode === 'whatsapp' && (
        <ChatComposerInputBar
          textareaRef={textareaRef}
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
          onSwitchToCommentMode={() => setComposerMode('comment')}
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
        addCatalogSelection={addCatalogSelection}
        newOrderType={newOrderType}
        setNewOrderType={setNewOrderType}
      />
    </div>
  );
};
