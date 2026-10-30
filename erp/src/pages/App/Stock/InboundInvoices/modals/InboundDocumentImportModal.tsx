import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { inboundAccessKeyFormSchema } from '../../../../../../../shared-utils/lookupFormSchemas';
import { normalizeFiscalIdentifier } from '../../../../../../../shared-utils/fiscalIdentifiers';
import { INBOUND_SUMMARY_XML_HELP } from '../../../../../../../shared-utils/inboundSummaryHelp';
import { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { InboundDuplicateKeyAlertModal } from './InboundDuplicateKeyAlertModal';
import { useInboundDocumentImport } from '../hooks/useInboundDocumentImport';
import QRScannerModal from '@/components/shared/QRScannerModal';

interface InboundDocumentImportModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onImportSuccess: (invoice: InboundInvoice) => void;
  readonly initialFile?: File | null;
  readonly summaryInvoice?: InboundInvoice | null;
}

const ACCEPTED_FILE_TYPES = 'text/xml,application/xml,.xml';

export const InboundDocumentImportModal: React.FC<InboundDocumentImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  initialFile,
  summaryInvoice = null,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [accessKey, setAccessKey] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const form = useZodForm(inboundAccessKeyFormSchema, { accessKey });
  const summaryAccessKey = normalizeFiscalIdentifier(summaryInvoice?.nfeKey);
  const canConsultSummaryPortal = summaryAccessKey.length === 44;
  const summaryPortalUrl = `https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&nfe=${encodeURIComponent(summaryAccessKey)}`;
  const {
    isLoading,
    statusMessage,
    isDraggingFile,
    setIsDraggingFile,
    duplicateAlertOpen,
    setDuplicateAlertOpen,
    duplicateKey,
    duplicateExistingInvoice,
    isImportInFlight,
    handleFile,
  } = useInboundDocumentImport({
    isOpen,
    onClose,
    onImportSuccess,
    initialFile,
    expectedAccessKey: summaryInvoice ? summaryAccessKey : undefined,
  });

  useEffect(() => {
    if (!isOpen) return;
    setAccessKey(summaryAccessKey);
  }, [isOpen, summaryAccessKey]);

  if (!isOpen) return null;

  const busy = isLoading;
  const importFile = async (file?: File) => {
    await handleFile(file);
  };
  const handleScan = async (value: string) => {
    if (isImportInFlight()) return;
    const normalized = normalizeFiscalIdentifier(value);
    const candidate = normalized.length === 44 ? normalized : value.toUpperCase().match(/(?:^|[^A-Z0-9])([0-9]{6}[A-Z0-9]{12}[0-9]{26})(?:[^A-Z0-9]|$)/)?.[1];
    const parsed = await form.validateValues({ accessKey: candidate || '' }, (errors) => toast.warn(Object.values(flattenFormErrors(errors))[0]));
    if (parsed) setAccessKey(parsed.accessKey);
    setIsScannerOpen(false);
  };
  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="inbound-doc-modal-title"
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !busy) onClose();
        }}
        className="fixed inset-0 z-[1000002] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in"
      >
        <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800 animate-in zoom-in-95 duration-150 overflow-hidden">
          {/* Header */}
          <header className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-5 px-6">
            <div>
              <h2
                id="inbound-doc-modal-title"
                className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2"
              >
                <i
                  className="bi bi-file-earmark-arrow-up text-blue-600 text-lg"
                  aria-hidden="true"
                />
                {summaryInvoice ? 'Obter XML da nota fiscal' : 'Importar XML da NF-e'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {summaryInvoice
                  ? 'Esta nota chegou sem os itens. Consulte o Portal e importe o XML completo para atualizá-la.'
                  : 'Importe o arquivo XML da nota fiscal para conferência e entrada no estoque.'}
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              aria-label="Fechar modal"
              className="rounded-xl p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <i className="bi bi-x-lg text-sm" aria-hidden="true" />
            </button>
          </header>

          {/* Conteúdo Principal */}
          <main className="p-6 space-y-4">
            {/* Estado de Carregamento / Progresso */}
            {isLoading && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/40 flex items-center gap-3 animate-pulse">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
                  <i className="bi bi-arrow-repeat animate-spin text-xl" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-blue-900 dark:text-blue-100">
                    {statusMessage || 'Processando nota fiscal...'}
                  </p>
                  <p className="text-[11px] text-blue-700/80 dark:text-blue-300">
                    Aguarde enquanto salvamos as informações.
                  </p>
                </div>
              </div>
            )}

            {summaryInvoice && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-amber-900 dark:text-amber-200">
                    Nota fiscal incompleta
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-100">
                    {INBOUND_SUMMARY_XML_HELP}
                  </p>
                </div>
                <a
                  href={summaryPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!canConsultSummaryPortal}
                  onClick={(event) => {
                    if (!canConsultSummaryPortal) event.preventDefault();
                  }}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-amber-950 ${!canConsultSummaryPortal ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                  Consultar no Portal
                </a>
              </div>
            )}

            {/* Link de consulta e campo de XML, mantidos no fluxo de importação existente. */}
            <div className="space-y-2.5">
              {!summaryInvoice && (
                <div className="mb-4 flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <label
                    htmlFor="accessKey"
                    className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2"
                  >
                    <i className="bi bi-key text-blue-500" /> Consultar Chave de Acesso
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="accessKey"
                      disabled={busy}
                      type="text"
                      placeholder="Digite os 44 caracteres da chave de acesso..."
                      value={accessKey}
                      onChange={(e) => setAccessKey(normalizeFiscalIdentifier(e.target.value))}
                      maxLength={44}
                      className="min-w-0 flex-1 rounded-none border-0 border-b-2 border-slate-300 bg-transparent px-3 py-2 text-xs font-medium text-slate-700 placeholder:text-slate-400 outline-none transition-colors focus:border-blue-600 focus:ring-0 dark:border-slate-700 dark:bg-transparent dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setIsScannerOpen(true)}
                      aria-label="Escanear QR Code ou código de barras da chave NF-e"
                      title="Escanear chave da NF-e"
                      className="inline-flex h-9 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                    >
                      <i className="bi bi-upc-scan" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <a
                      href={`https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&nfe=${accessKey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir o Portal Nacional da NF-e para consulta manual"
                      className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors ${
                        accessKey.length === 44
                          ? 'cursor-pointer'
                          : 'cursor-not-allowed text-slate-400 dark:text-slate-500 border-dashed opacity-50'
                      }`}
                      onClick={(event) => {
                        if (accessKey.length !== 44) event.preventDefault();
                      }}
                    >
                      <i className="bi bi-box-arrow-up-right text-[11px]" aria-hidden="true" />
                      Consultar no Portal
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Arquivo XML da NF-e
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                className="hidden"
                onChange={(event) => void importFile(event.target.files?.[0])}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!busy) setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(false);
                  void handleFile(e.dataTransfer.files?.[0]);
                }}
                className={`flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
                  isDraggingFile
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40'
                    : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-blue-400 hover:bg-blue-50/30 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300'
                } disabled:cursor-wait disabled:opacity-60`}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400 mb-3 shadow-sm">
                  <i className="bi bi-cloud-arrow-up text-3xl" aria-hidden="true" />
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Clique para escolher ou arraste o arquivo aqui
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  Formato aceito: <b>XML</b> oficial da NF-e
                </span>
              </button>

            </div>
          </main>

          {/* Footer */}
          <footer className="flex justify-end border-t border-slate-100 dark:border-slate-800 p-4 px-6 bg-slate-50/50 dark:bg-slate-950/40">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
          </footer>
        </div>
      </div>

      {/* Modal de Alerta de Chave Duplicada */}
      <InboundDuplicateKeyAlertModal
        isOpen={duplicateAlertOpen}
        duplicateKey={duplicateKey}
        existingInvoice={duplicateExistingInvoice}
        onClose={() => setDuplicateAlertOpen(false)}
      />
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(value) => { void handleScan(value); }}
        title="Escanear chave da NF-e"
        accessKeyMode
      />
    </>
  );
};

export default InboundDocumentImportModal;
