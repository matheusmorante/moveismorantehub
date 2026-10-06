import React from 'react';
import { validateNfeCce } from '@/pages/utils/nfe/nfeCce';
import type { NfeDocumentRecord } from '../types/fiscalDocuments.types';

interface FiscalCceModalProps {
  isOpen: boolean;
  document: NfeDocumentRecord | null;
  cceText: string;
  onCceTextChange: (text: string) => void;
  isSubmitting: boolean;
  isLoadingInfo: boolean;
  previousCorrection: string;
  nextSequence: number | null;
  isPending: boolean;
  productionConfirmed: boolean;
  onProductionConfirmedChange: (confirmed: boolean) => void;
  onClose: () => void;
  onSubmit: () => void;
  onReconcile: () => void;
}

export const FiscalCceModal: React.FC<FiscalCceModalProps> = ({
  isOpen,
  document,
  cceText,
  onCceTextChange,
  isSubmitting,
  isLoadingInfo,
  previousCorrection,
  nextSequence,
  isPending,
  productionConfirmed,
  onProductionConfirmedChange,
  onClose,
  onSubmit,
  onReconcile,
}) => {
  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-[99999] animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 space-y-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 border-b border-slate-100 dark:border-slate-800 pb-4">
          <i className="bi bi-file-earmark-text-fill text-2xl" />
          <div>
            <h3 className="text-base font-black uppercase tracking-tight">
              Carta de Correção Eletrônica (CC-e)
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              NF-e #{document.numero_nfe} (Modelo 55)
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            <p className="font-bold">
              A nova CC-e substitui as anteriores. Inclua neste texto todas as correções que
              ainda devem valer.
            </p>
            <p className="mt-2">
              Não use para alterar valores da operação, base/alíquota/imposto, quantidade,
              emitente ou destinatário, nem as datas de emissão ou saída. A CC-e só pode
              corrigir informação permitida para NF-e modelo 55.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              {isLoadingInfo
                ? 'Consultando histórico na SEFAZ…'
                : nextSequence
                  ? `Próxima sequência: ${nextSequence} de 20`
                  : 'Não foi possível determinar a próxima sequência.'}
            </span>
            {previousCorrection && !isLoadingInfo && (
              <span className="font-semibold">
                Texto da última CC-e carregado para revisão.
              </span>
            )}
          </div>

          {isPending && (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-xs leading-relaxed text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200">
              Há uma tentativa sem resultado confirmado. Consulte a SEFAZ antes de iniciar outra
              transmissão.
            </div>
          )}

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
              Texto da Correção (15 a 1000 caracteres)
            </label>
            <textarea
              value={cceText}
              onChange={(e) => onCceTextChange(e.target.value)}
              placeholder="Descreva a correção permitida pela SEFAZ."
              rows={5}
              maxLength={1000}
              disabled={isLoadingInfo || isPending || isSubmitting}
              className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold outline-none focus:border-amber-500 transition-all resize-y disabled:opacity-60"
            />
            <div className="mt-2 text-right text-[11px] text-slate-400">
              {cceText.trim().length}/1000
            </div>
          </div>

          {document.ambiente === 1 && (
            <label className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs leading-relaxed text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
              <input
                type="checkbox"
                checked={productionConfirmed}
                onChange={(event) => onProductionConfirmedChange(event.target.checked)}
                disabled={isSubmitting || isPending}
                className="mt-0.5 accent-red-600"
              />
              <span>Confirmo a transmissão desta CC-e no ambiente de produção.</span>
            </label>
          )}

          {nextSequence !== null && nextSequence > 20 && (
            <p className="text-xs font-semibold text-red-600 dark:text-red-400">
              Esta NF-e já atingiu o limite de 20 Cartas de Correção.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
          >
            Fechar
          </button>
          {isPending ? (
            <button
              type="button"
              onClick={onReconcile}
              disabled={isSubmitting || isLoadingInfo}
              className="px-5 py-2.5 rounded-2xl bg-sky-600 text-white hover:bg-sky-700 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <i className="bi bi-arrow-repeat animate-spin" />
              ) : (
                <i className="bi bi-arrow-clockwise" />
              )}
              Consultar resultado na SEFAZ
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              disabled={
                isLoadingInfo ||
                isSubmitting ||
                !nextSequence ||
                nextSequence > 20 ||
                Boolean(validateNfeCce(cceText)) ||
                (document.ambiente === 1 && !productionConfirmed)
              }
              className="px-5 py-2.5 rounded-2xl bg-amber-600 text-white hover:bg-amber-700 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <i className="bi bi-arrow-repeat animate-spin" />
              ) : (
                <i className="bi bi-send-fill" />
              )}
              Transmitir CC-e à SEFAZ
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
