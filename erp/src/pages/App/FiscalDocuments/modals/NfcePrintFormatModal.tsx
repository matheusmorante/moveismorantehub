import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  nfcePrintFormatSchema,
  type NfcePrintFormatFormData,
  type NfcePrintFormat,
} from '../../../../../../shared-utils/fiscalPrintSchemas';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

export interface NfcePrintFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFormat: (format: NfcePrintFormat) => void | Promise<void>;
  documentNumber?: number | string;
  series?: string;
  isProcessing?: boolean;
  errorMessage?: string | null;
}

export const NfcePrintFormatModal: React.FC<NfcePrintFormatModalProps> = ({
  isOpen,
  onClose,
  onSelectFormat,
  documentNumber,
  series,
  isProcessing = false,
  errorMessage = null,
}) => {
  useBodyScrollLock(isOpen);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [isSubmittingInternal, setIsSubmittingInternal] = useState(false);

  const {
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<NfcePrintFormatFormData>({
    resolver: zodResolver(nfcePrintFormatSchema),
  });

  useEffect(() => {
    if (isOpen) {
      setInternalError(null);
      setIsSubmittingInternal(false);
      clearErrors();
    }
  }, [isOpen, clearErrors]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isProcessing && !isSubmittingInternal) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isProcessing, isSubmittingInternal]);

  if (!isOpen) return null;

  const onSubmit = async (data: NfcePrintFormatFormData) => {
    try {
      setInternalError(null);
      setIsSubmittingInternal(true);
      await onSelectFormat(data.format);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao acionar a impressão do documento.';
      setInternalError(msg);
      setError('format', { message: msg });
    } finally {
      setIsSubmittingInternal(false);
    }
  };

  const handleChooseFormat = (format: NfcePrintFormat) => {
    setValue('format', format, { shouldValidate: true });
    void handleSubmit(onSubmit)();
  };

  const activeError = internalError || errorMessage || errors.format?.message;
  const isBusy = isProcessing || isSubmittingInternal;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nfce-print-format-title"
      className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 overscroll-contain"
    >
      {/* Backdrop com fechamento ao clicar fora */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={() => {
          if (!isBusy) onClose();
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 transition-all">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              <i className="bi bi-printer text-xl" />
            </div>
            <div>
              <h2
                id="nfce-print-format-title"
                className="text-base font-black text-slate-900 dark:text-slate-100"
              >
                Formato de Impressão NFC-e
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {documentNumber
                  ? `NFC-e nº ${documentNumber}${series ? ` · Série ${series}` : ''}`
                  : 'Selecione o formato para impressão'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            title="Fechar"
            aria-label="Fechar seleção de formato"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 disabled:opacity-50"
          >
            <i className="bi bi-x-lg text-sm" />
          </button>
        </div>

        {/* Mensagem de Erro / Alerta */}
        {activeError && (
          <div
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50"
          >
            <i className="bi bi-exclamation-triangle-fill shrink-0 text-sm" />
            <span>{activeError}</span>
          </div>
        )}

        {/* Formulário com Seleção de Formato */}
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Opção 1: Cupom 80 mm */}
            <button
              type="button"
              disabled={isBusy}
              onClick={() => handleChooseFormat('thermal_80mm')}
              className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 text-center transition-all hover:border-blue-600 hover:bg-blue-50/50 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-blue-500 dark:hover:bg-blue-950/20"
            >
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700 transition group-hover:scale-110 dark:bg-blue-900/50 dark:text-blue-300">
                <i className="bi bi-receipt text-2xl" />
              </div>
              <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                Cupom 80 mm
              </span>
              <span className="mt-1 text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                Impressão em bobina térmica de 80 mm
              </span>
              <span className="mt-2 inline-block rounded-full bg-slate-200/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                Térmica / PDV
              </span>
            </button>

            {/* Opção 2: DANFE A4 */}
            <button
              type="button"
              disabled={isBusy}
              onClick={() => handleChooseFormat('a4')}
              className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 text-center transition-all hover:border-emerald-600 hover:bg-emerald-50/50 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/20"
            >
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 transition group-hover:scale-110 dark:bg-emerald-900/50 dark:text-emerald-300">
                <i className="bi bi-file-earmark-text text-2xl" />
              </div>
              <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                DANFE A4
              </span>
              <span className="mt-1 text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                Impressão em folha A4
              </span>
              <span className="mt-2 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                Convencional / Laser
              </span>
            </button>
          </div>

          {/* Feedback de Carregamento */}
          {isBusy && (
            <div className="flex items-center justify-center gap-2 py-2 text-xs font-bold text-blue-600 dark:text-blue-400">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <span>Preparando documento para impressão…</span>
            </div>
          )}

          {/* Rodapé do Modal */}
          <div className="mt-2 flex justify-end border-t border-slate-100 dark:border-slate-800 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
