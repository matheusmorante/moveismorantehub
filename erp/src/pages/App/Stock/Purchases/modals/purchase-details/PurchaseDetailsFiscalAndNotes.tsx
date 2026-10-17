import React from 'react';
import Purchase from '../../../../../types/purchase.type';

interface PurchaseDetailsFiscalAndNotesProps {
  purchase: Purchase;
  onCopyFiscalKey: () => void;
}

export const PurchaseDetailsFiscalAndNotes: React.FC<PurchaseDetailsFiscalAndNotesProps> = ({
  purchase,
  onCopyFiscalKey,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Nota Fiscal & Chave */}
      <div className="p-5 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <i className="bi bi-file-earmark-text text-blue-500" aria-hidden="true" />
          Informações Fiscais
        </h4>

        <div className="space-y-2 text-xs">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
              Número da NF
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {purchase.invoiceNumber || 'Não informada'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
              Chave de Acesso (44 dígitos)
            </span>
            {purchase.fiscalKey ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 select-all">
                  {purchase.fiscalKey}
                </span>
                <button
                  type="button"
                  onClick={onCopyFiscalKey}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"
                  title="Copiar Chave"
                  aria-label="Copiar chave de acesso fiscal"
                >
                  <i className="bi bi-clipboard" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <span className="text-slate-400 italic">Nenhuma chave cadastrada</span>
            )}
          </div>
        </div>
      </div>

      {/* Observações & Anexos */}
      <div className="p-5 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <i className="bi bi-chat-left-text text-blue-500" aria-hidden="true" />
          Observações & Anexos
        </h4>

        <div className="space-y-2 text-xs">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
              Observação
            </span>
            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-medium">
              {purchase.observation || 'Nenhuma observação registrada.'}
            </p>
          </div>

          {purchase.attachments && purchase.attachments.length > 0 && (
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                Arquivos Anexados ({purchase.attachments.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {purchase.attachments.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold text-blue-600 hover:text-blue-700 shadow-sm transition-all"
                  >
                    <i className="bi bi-paperclip" aria-hidden="true" />
                    <span>Anexo {i + 1}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
