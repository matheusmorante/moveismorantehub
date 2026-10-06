import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import type { Order } from '@/pages/types/order.type';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';
import { parseFiscalXmlDetails } from '../utils/fiscalXmlParser';
import { fetchFiscalDocumentDetails } from '../services/fiscalDocumentsService';
import { FiscalDocumentStatusBadge } from '../components/FiscalDocumentStatusBadge';
import {
  IssuedFiscalDocumentDetailsTabList,
  IssuedFiscalDocumentDetailsTabPanel,
  type DetailTab,
} from '../components/IssuedFiscalDocumentDetailsTabs';
import {
  createDanfeShareFile,
  downloadXml,
  printDanfe,
} from '../services/fiscalDanfeXmlService';
import type {
  FiscalDocumentDetails,
  NfeDocumentRecord,
} from '../types/fiscalDocuments.types';

interface IssuedFiscalDocumentDetailsModalProps {
  emissionResult?: NfeEmissionResult;
  document?: NfeDocumentRecord;
  documentId?: string;
  initialEnvironment?: 1 | 2;
  fullScreen?: boolean;
  order?: Order;
  orderNumber?: number;
  onClose: () => void;
}

function downloadBlob(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const IssuedFiscalDocumentDetailsModal: React.FC<IssuedFiscalDocumentDetailsModalProps> = ({
  emissionResult,
  document,
  documentId: suppliedDocumentId,
  initialEnvironment,
  fullScreen = false,
  order,
  orderNumber: providedOrderNumber,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('general');
  const [details, setDetails] = useState<FiscalDocumentDetails | null>(null);
  const documentId = document?.id || emissionResult?.documentId || suppliedDocumentId;
  const [isLoading, setIsLoading] = useState(Boolean(documentId));
  const [loadError, setLoadError] = useState('');
  const [shareFile, setShareFile] = useState<File | null>(null);
  const [shareFileError, setShareFileError] = useState('');
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let active = true;
    if (!documentId) {
      setIsLoading(false);
      setLoadError('O identificador do documento autorizado não veio na resposta da emissão.');
      return () => {
        active = false;
      };
    }

    setIsLoading(true);
    setDetails(null);
    setLoadError('');
    setShareFile(null);
    setShareFileError('');
    void fetchFiscalDocumentDetails(documentId)
      .then((loaded) => {
        if (!active) return;
        setDetails(loaded);
        setIsLoading(false);
        void createDanfeShareFile(loaded.document)
          .then((file) => {
            if (active) setShareFile(file);
          })
          .catch((error: unknown) => {
            if (active) setShareFileError(error instanceof Error ? error.message : 'Não foi possível preparar o arquivo do DANFE.');
          });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar os detalhes fiscais.');
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [documentId, reloadVersion]);

  const parsed = useMemo(
    () => details?.parsedXml || parseFiscalXmlDetails(emissionResult?.xml || document?.xml_nfe || ''),
    [details?.parsedXml, emissionResult?.xml, document?.xml_nfe]
  );
  const visibleDocument = details?.document || document;
  const model = visibleDocument?.modelo || emissionResult?.model || '55';
  const environment =
    visibleDocument?.ambiente || emissionResult?.environment || initialEnvironment || 1;
  const status = visibleDocument?.status || (environment === 2 ? 'homologada' : 'autorizada');
  const title = model === '65' ? 'NFC-e' : 'NF-e';
  const visibleDocumentNumber = visibleDocument?.numero_nfe ?? emissionResult?.nfeNumber;
  const orderNumber = order?.orderNumber || order?.orderIndex || providedOrderNumber;

  const handleDownloadXml = async () => {
    if (details) {
      try {
        await downloadXml(details.document);
        toast.success('XML baixado com sucesso.');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível baixar o XML.');
      }
      return;
    }
    if (document) {
      try {
        await downloadXml(document);
        toast.success('XML baixado com sucesso.');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível baixar o XML.');
      }
      return;
    }
    if (!emissionResult?.xml) {
      toast.error('O XML ainda não está disponível.');
      return;
    }
    const file = new File([emissionResult.xml], `NFe_${emissionResult.accessKey || emissionResult.nfeNumber || 'documento'}.xml`, {
      type: 'application/xml;charset=utf-8',
    });
    downloadBlob(file);
  };

  const handlePrintDanfe = async () => {
    const printableDocument = details?.document || document;
    if (!printableDocument) {
      toast.error(loadError || 'Carregue os detalhes fiscais antes de imprimir o DANFE.');
      return;
    }
    try {
      await printDanfe(printableDocument);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível abrir o DANFE.');
    }
  };

  const handleShareDanfe = () => {
    if (!shareFile) {
      toast.error(shareFileError || 'O arquivo do DANFE ainda está sendo preparado.');
      return;
    }

    const shareNavigator = navigator as Navigator & {
      canShare?: (data: { files: File[] }) => boolean;
      share?: (data: ShareData) => Promise<void>;
    };
    const files = [shareFile];
    if (shareNavigator.share && shareNavigator.canShare?.({ files })) {
      try {
        void shareNavigator.share({
          files,
          title: `DANFE ${title} ${visibleDocumentNumber || ''}`.trim(),
        }).catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          toast.error(error instanceof Error ? error.message : 'Não foi possível compartilhar o DANFE.');
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível compartilhar o DANFE.');
      }
      return;
    }

    downloadBlob(shareFile);
    toast.info('Este navegador não compartilha arquivos diretamente. O DANFE foi baixado; anexe-o no WhatsApp.');
  };

  return (
    <div className={`fixed inset-0 z-[1000000] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm ${fullScreen ? 'p-0' : 'p-0 md:p-4'}`}>
      <button type="button" aria-label="Fechar detalhes da nota fiscal" className="absolute inset-0 cursor-default" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="issued-fiscal-details-title"
        className={`relative z-10 flex flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-950 ${fullScreen ? 'h-full max-h-full w-full max-w-none rounded-none border-0' : 'h-[100dvh] max-h-[100dvh] w-full max-w-none rounded-none border-0 md:h-[min(92dvh,900px)] md:max-h-[calc(100dvh-2rem)] md:max-w-7xl md:rounded-3xl md:border md:border-slate-200 dark:border-slate-800'}`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="issued-fiscal-details-title" className="text-base font-black text-slate-900 dark:text-slate-100 sm:text-lg">
                Detalhes da nota fiscal
              </h2>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${environment === 2 ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'}`}>
                {environment === 2 ? 'Homologação' : 'Produção'}
              </span>
              <FiscalDocumentStatusBadge status={status} />
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {title} nº {visibleDocumentNumber || '—'} · Série {visibleDocument?.serie || emissionResult?.series || '1'}
              {orderNumber ? ` · Pedido #${orderNumber}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white">
            <i className="bi bi-x-lg" />
          </button>
        </header>

        <IssuedFiscalDocumentDetailsTabList
          activeTab={activeTab}
          eventsCount={details?.events?.length || 0}
          onChange={setActiveTab}
        />

        <main className="min-h-[280px] flex-1 overflow-y-auto bg-slate-50/70 p-4 dark:bg-slate-950/30 sm:p-6">
          {isLoading ? (
            <div role="status" className="flex min-h-[240px] items-center justify-center gap-3 text-sm text-slate-500">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
              Carregando informações do XML armazenado…
            </div>
          ) : loadError && !details && !document ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
              <p role="alert" className="max-w-xl text-sm text-rose-700 dark:text-rose-300">{loadError}</p>
              {documentId && (
                <button type="button" onClick={() => setReloadVersion((version) => version + 1)} className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800">
                  Tentar carregar novamente
                </button>
              )}
            </div>
          ) : (
            <>
              {loadError && <p role="alert" className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">{loadError}</p>}
              <IssuedFiscalDocumentDetailsTabPanel activeTab={activeTab} emissionResult={emissionResult} fallbackDocument={document} details={details} parsed={parsed} />
            </>
          )}
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950 sm:px-6">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void handlePrintDanfe()} disabled={(!details && !document) || isLoading} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4">
              <i className="bi bi-printer-fill" /> Imprimir DANFE
            </button>
            <button type="button" onClick={() => void handleDownloadXml()} disabled={isLoading || (!details && !document && !emissionResult?.xml)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:px-4">
              <i className="bi bi-filetype-xml" /> Baixar XML
            </button>
            <button type="button" onClick={handleShareDanfe} disabled={!shareFile} title={shareFile ? 'Escolha WhatsApp no menu de compartilhamento do dispositivo' : shareFileError || 'Preparando o arquivo do DANFE'} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4">
              <i className="bi bi-share-fill" /> {shareFile ? 'Compartilhar DANFE' : 'Preparando DANFE…'}
            </button>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white">
            Fechar
          </button>
        </footer>
      </section>
    </div>
  );
};

export default IssuedFiscalDocumentDetailsModal;
