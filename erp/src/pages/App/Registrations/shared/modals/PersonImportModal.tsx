import React from 'react';
import {
  PersonImportModalProps,
  usePersonImportModal,
  PersonImportHeader,
  PersonImportUploadStep,
  PersonImportMappingStep,
  PersonImportPreviewStep,
  PersonImportProgressBar,
  PersonImportFooter,
} from './personImport';

const PersonImportModal: React.FC<PersonImportModalProps> = (props) => {
  const { isOpen, onClose, collectionName, title } = props;
  const {
    importData,
    busy,
    isImporting,
    error,
    setError,
    hasStartedImport,
    isCompleted,
    hasUnconfirmedRows,
    progress,
    encoding,
    setEncoding,
    selectedIndexes,
    defaultMarketingOrigin,
    setDefaultMarketingOrigin,
    step,
    setStep,
    csvHeaders,
    mapping,
    fileInputRef,
    previousImportPending,
    operation,
    handleFileLoad,
    handleMappingChange,
    processMappingToPreview,
    runImport,
    toggleSelection,
    toggleAll,
  } = usePersonImportModal(props);

  if (!isOpen) return null;

  const handleBackToMapping = () => {
    if (!hasStartedImport && operation.current === null) {
      setError(null);
      setStep('mapping');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={!busy ? onClose : undefined}
      />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800">
        <PersonImportHeader
          title={title}
          step={step}
          encoding={encoding}
          setEncoding={setEncoding}
          busy={!!busy}
          onClose={onClose}
        />

        {error && (
          <p role="alert" className="mx-10 mt-4 text-sm text-red-600">
            {error}
          </p>
        )}
        {busy === 'read' && (
          <p role="status" className="mx-10 mt-4 text-sm text-slate-500">
            Lendo CSV...
          </p>
        )}
        {previousImportPending && (
          <p role="status" className="mx-10 mt-4 text-sm text-slate-500">
            Aguardando a importação anterior terminar...
          </p>
        )}
        {isCompleted && (
          <p role="status" className="mx-10 mt-4 text-sm text-emerald-700">
            {hasUnconfirmedRows
              ? 'Registros selecionados importados. Confira os registros sem confirmação antes de fechar.'
              : 'Importação concluída.'}
          </p>
        )}

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {step === 'upload' && (
            <PersonImportUploadStep
              busy={!!busy}
              fileInputRef={fileInputRef}
              onFileLoad={(file) => void handleFileLoad(file)}
            />
          )}

          {step === 'mapping' && (
            <PersonImportMappingStep
              collectionName={collectionName}
              defaultMarketingOrigin={defaultMarketingOrigin}
              setDefaultMarketingOrigin={setDefaultMarketingOrigin}
              mapping={mapping}
              csvHeaders={csvHeaders}
              onMappingChange={handleMappingChange}
              onProcessMapping={() => void processMappingToPreview()}
              busy={!!busy}
            />
          )}

          {step === 'preview' && (
            <PersonImportPreviewStep
              importData={importData}
              selectedIndexes={selectedIndexes}
              busy={!!busy}
              onToggleSelection={toggleSelection}
              onToggleAll={toggleAll}
            />
          )}
        </div>

        {isImporting && <PersonImportProgressBar progress={progress} />}

        {step === 'preview' && !isImporting && !isCompleted && (
          <PersonImportFooter
            busy={!!busy}
            hasStartedImport={hasStartedImport}
            previousImportPending={previousImportPending}
            selectedCount={selectedIndexes.size}
            onBack={handleBackToMapping}
            onRunImport={() => void runImport()}
          />
        )}
      </div>
    </div>
  );
};

export default PersonImportModal;
