import React from 'react';
import { SmartAIFillModalProps } from './smart-ai-fill/types';
import { useSmartAIFillForm } from './smart-ai-fill/useSmartAIFillForm';
import { SmartAIFillHeader } from './smart-ai-fill/SmartAIFillHeader';
import { SmartAIFillAiVoiceTab } from './smart-ai-fill/SmartAIFillAiVoiceTab';
import { SmartAIFillManualJsonTab } from './smart-ai-fill/SmartAIFillManualJsonTab';

export const SmartAIFillModal: React.FC<SmartAIFillModalProps> = (props) => {
  const { isOpen } = props;
  const {
    promptText,
    setPromptText,
    liveTranscript,
    isListening,
    isProcessingAI,
    busy,
    submitError,
    applyBlocked,
    lastParsedResult,
    setLastParsedResult,
    activeTab,
    setActiveTab,
    manualJSON,
    setManualJSON,
    toggleListening,
    handleGenerateAI,
    handleConfirmApply,
    handleFileUpload,
    handleProcessManualJSON,
    closeModal,
    clearPrompt,
  } = useSmartAIFillForm(props);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in"
      onClick={closeModal}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[90vh] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <SmartAIFillHeader
          activeTab={activeTab}
          busy={busy}
          onSelectTab={setActiveTab}
          onClose={closeModal}
        />

        {/* Conteúdo Principal */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar flex flex-col gap-5">
          {submitError && (
            <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
              {submitError}
            </p>
          )}
          {applyBlocked && (
            <p role="status" className="text-xs text-amber-700">
              Confira o pedido antes de uma nova aplicação dos dados.
            </p>
          )}
          {busy && (
            <p role="status" className="text-xs text-violet-700 dark:text-violet-300">
              <i className="bi bi-arrow-repeat animate-spin mr-2" />
              {isProcessingAI
                ? 'Analisando os dados do pedido...'
                : 'Processando e aplicando os dados no pedido...'}
            </p>
          )}

          {activeTab === 'ai' ? (
            <SmartAIFillAiVoiceTab
              isListening={isListening}
              liveTranscript={liveTranscript}
              promptText={promptText}
              setPromptText={setPromptText}
              isProcessingAI={isProcessingAI}
              busy={busy}
              applyBlocked={applyBlocked}
              lastParsedResult={lastParsedResult}
              setLastParsedResult={setLastParsedResult}
              toggleListening={toggleListening}
              clearPrompt={clearPrompt}
              handleGenerateAI={handleGenerateAI}
              handleConfirmApply={handleConfirmApply}
            />
          ) : (
            <SmartAIFillManualJsonTab
              manualJSON={manualJSON}
              setManualJSON={setManualJSON}
              busy={busy}
              applyBlocked={applyBlocked}
              onFileUpload={handleFileUpload}
              onProcessManualJSON={handleProcessManualJSON}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartAIFillModal;
